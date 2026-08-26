-- Korea Ground-Truth MCP — core schema
-- All access from the app uses the service-role key. RLS is enabled with no
-- policies so anon/authenticated roles cannot touch these tables directly.

create extension if not exists pgcrypto;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  auth_user_id uuid,
  signup_ip text,
  created_at timestamptz not null default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null default 'default',
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{tools:call}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_key_hash_idx on api_keys (key_hash);
create index if not exists api_keys_account_idx on api_keys (account_id);

create table if not exists tool_prices (
  tool_name text primary key,
  credits int not null check (credits >= 0),
  cache_hit_credits int not null check (cache_hit_credits >= 0),
  description text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists account_balances (
  account_id uuid primary key references accounts(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists credit_ledger (
  id bigserial primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('signup_bonus','topup','usage','refund','adjust')),
  ref_id text not null,
  balance_after int not null,
  created_at timestamptz not null default now(),
  unique (reason, ref_id)
);
create index if not exists credit_ledger_account_idx on credit_ledger (account_id, created_at desc);

create table if not exists usage_events (
  id uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  api_key_id uuid references api_keys(id) on delete set null,
  tool_name text not null,
  credits int not null default 0,
  cache_hit boolean not null default false,
  upstream_ms int,
  status text not null default 'ok',
  request_hash text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_account_idx on usage_events (account_id, created_at desc);

create table if not exists topup_orders (
  order_id text primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  amount_krw int not null check (amount_krw > 0),
  credits int not null check (credits > 0),
  status text not null default 'pending' check (status in ('pending','confirmed','failed')),
  payment_key text,
  raw jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists response_cache (
  hash text primary key,
  tool_name text not null,
  body jsonb not null,
  expires_at timestamptz not null
);
create index if not exists response_cache_expires_idx on response_cache (expires_at);

create table if not exists dart_corp_codes (
  corp_code text primary key,
  corp_name text not null,
  stock_code text,
  modify_date text
);
create index if not exists dart_corp_codes_name_idx on dart_corp_codes (corp_name);

-- credit_ledger is append-only
create or replace function forbid_ledger_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'credit_ledger is append-only';
end $$;
drop trigger if exists credit_ledger_immutable on credit_ledger;
create trigger credit_ledger_immutable
  before update or delete on credit_ledger
  for each row execute function forbid_ledger_mutation();

-- Atomic debit: row lock on account_balances removes races between concurrent calls.
create or replace function debit_credits(p_account uuid, p_tool text, p_event uuid, p_cache_hit boolean default false)
returns table(balance int, cost int) language plpgsql as $$
declare
  v_cost int;
  v_bal int;
begin
  select case when p_cache_hit then cache_hit_credits else credits end
    into v_cost from tool_prices where tool_name = p_tool and active;
  if v_cost is null then
    raise exception 'UNKNOWN_TOOL' using detail = p_tool;
  end if;

  insert into account_balances(account_id, balance) values (p_account, 0)
    on conflict (account_id) do nothing;
  select ab.balance into v_bal from account_balances ab where ab.account_id = p_account for update;

  if v_cost = 0 then
    return query select v_bal, 0;
    return;
  end if;
  if v_bal < v_cost then
    raise exception 'INSUFFICIENT_CREDITS' using detail = v_bal::text, hint = v_cost::text;
  end if;

  update account_balances set balance = account_balances.balance - v_cost, updated_at = now()
    where account_id = p_account;
  insert into credit_ledger(account_id, delta, reason, ref_id, balance_after)
    values (p_account, -v_cost, 'usage', p_event::text, v_bal - v_cost);
  return query select v_bal - v_cost, v_cost;
end $$;

-- Idempotent credit: unique(reason, ref_id) makes repeated confirms/webhooks no-ops.
create or replace function credit_credits(p_account uuid, p_delta int, p_reason text, p_ref text)
returns table(balance int, applied boolean) language plpgsql as $$
declare
  v_bal int;
begin
  if p_delta <= 0 then
    raise exception 'INVALID_DELTA';
  end if;
  insert into account_balances(account_id, balance) values (p_account, 0)
    on conflict (account_id) do nothing;
  select ab.balance into v_bal from account_balances ab where ab.account_id = p_account for update;

  if exists (select 1 from credit_ledger where reason = p_reason and ref_id = p_ref) then
    return query select v_bal, false;
    return;
  end if;

  update account_balances set balance = account_balances.balance + p_delta, updated_at = now()
    where account_id = p_account;
  insert into credit_ledger(account_id, delta, reason, ref_id, balance_after)
    values (p_account, p_delta, p_reason, p_ref, v_bal + p_delta);
  return query select v_bal + p_delta, true;
end $$;

-- RLS on, no policies: only service role can read/write.
alter table accounts enable row level security;
alter table api_keys enable row level security;
alter table tool_prices enable row level security;
alter table account_balances enable row level security;
alter table credit_ledger enable row level security;
alter table usage_events enable row level security;
alter table topup_orders enable row level security;
alter table response_cache enable row level security;
alter table dart_corp_codes enable row level security;

-- Seed prices (kept in sync with src/lib/tools/registry.ts)
insert into tool_prices (tool_name, credits, cache_hit_credits, description) values
  ('verify_business_registration', 2, 1, '국세청 사업자등록 상태조회 및 진위확인'),
  ('search_address', 1, 1, '도로명주소 검색/정규화, 우편번호, 법정동코드'),
  ('search_corporation', 1, 1, 'DART 등록 법인명으로 고유번호 검색'),
  ('lookup_corporation', 2, 1, 'DART 기업개황'),
  ('apartment_trade_prices', 3, 1, '국토교통부 아파트 매매 실거래가'),
  ('search_law', 2, 1, '법제처 현행법령 검색'),
  ('get_balance', 0, 0, '잔액 조회'),
  ('get_pricing', 0, 0, '가격표 조회')
on conflict (tool_name) do update set
  credits = excluded.credits,
  cache_hit_credits = excluded.cache_hit_credits,
  description = excluded.description,
  updated_at = now();
