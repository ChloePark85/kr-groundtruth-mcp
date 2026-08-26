-- Metrics: weekly active keys, activation funnel, time-to-first-call, tool usage, revenue.
-- Test accounts (@example.com) are excluded by default.

create or replace function metrics_report(p_days int default 7, p_exclude_test boolean default true)
returns jsonb language sql stable as $$
with acct as (
  select id, email, created_at
  from accounts
  where not p_exclude_test or email not like '%@example.com'
),
ev as (
  select e.* from usage_events e join acct a on a.id = e.account_id
),
paid as (  -- calls that actually consumed a tool (free tools excluded)
  select * from ev where credits > 0 or status = 'insufficient_credits'
),
first_call as (
  select account_id, min(created_at) as first_at from ev where status = 'ok' and credits > 0 group by account_id
),
day2 as (  -- called again on a later calendar day than the first call
  select f.account_id
  from first_call f join ev e on e.account_id = f.account_id and e.status = 'ok' and e.credits > 0
  where e.created_at::date > f.first_at::date
  group by f.account_id
),
topup as (
  select t.account_id, min(t.confirmed_at) as first_topup_at, sum(t.amount_krw) as krw, sum(t.credits) as credits
  from topup_orders t join acct a on a.id = t.account_id
  where t.status = 'confirmed' group by t.account_id
),
window_acct as (select * from acct where created_at >= now() - (p_days || ' days')::interval),
ttfc as (
  select extract(epoch from (f.first_at - a.created_at)) as sec
  from first_call f join acct a on a.id = f.account_id
  where a.created_at >= now() - (p_days || ' days')::interval
)
select jsonb_build_object(
  'generated_at', now(),
  'window_days', p_days,
  'exclude_test_accounts', p_exclude_test,

  'north_star', jsonb_build_object(
    'weekly_active_api_keys', (select count(distinct api_key_id) from ev where status = 'ok' and credits > 0 and created_at >= now() - interval '7 days'),
    'active_keys_in_window', (select count(distinct api_key_id) from ev where status = 'ok' and credits > 0 and created_at >= now() - (p_days || ' days')::interval),
    'wak_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'active_keys', n) order by wk), '[]'::jsonb)
      from (select date_trunc('week', created_at)::date as wk, count(distinct api_key_id) as n
            from ev where status = 'ok' and credits > 0 and created_at >= now() - interval '8 weeks' group by 1) w)
  ),

  'funnel_window', jsonb_build_object(
    'accounts_created', (select count(*) from window_acct),
    'first_tool_call', (select count(*) from window_acct a join first_call f on f.account_id = a.id),
    'second_day_call', (select count(*) from window_acct a join day2 d on d.account_id = a.id),
    'first_topup', (select count(*) from window_acct a join topup t on t.account_id = a.id),
    'hit_402', (select count(distinct account_id) from paid where status = 'insufficient_credits' and account_id in (select id from window_acct))
  ),
  'funnel_all_time', jsonb_build_object(
    'accounts_created', (select count(*) from acct),
    'first_tool_call', (select count(*) from first_call),
    'second_day_call', (select count(*) from day2),
    'first_topup', (select count(*) from topup),
    'hit_402', (select count(distinct account_id) from paid where status = 'insufficient_credits')
  ),

  'time_to_first_call_sec', jsonb_build_object(
    'n', (select count(*) from ttfc),
    'median', (select percentile_cont(0.5) within group (order by sec) from ttfc),
    'p90', (select percentile_cont(0.9) within group (order by sec) from ttfc),
    'under_2min', (select count(*) from ttfc where sec <= 120)
  ),

  'calls_window', jsonb_build_object(
    'total', (select count(*) from paid where created_at >= now() - (p_days || ' days')::interval),
    'ok', (select count(*) from paid where status = 'ok' and created_at >= now() - (p_days || ' days')::interval),
    'upstream_error', (select count(*) from paid where status = 'upstream_error' and created_at >= now() - (p_days || ' days')::interval),
    'insufficient_credits', (select count(*) from paid where status = 'insufficient_credits' and created_at >= now() - (p_days || ' days')::interval),
    'cache_hit_rate', (select round(avg(case when cache_hit then 1 else 0 end)::numeric, 3) from paid where status = 'ok' and created_at >= now() - (p_days || ' days')::interval),
    'credits_consumed', (select coalesce(sum(credits), 0) from paid where status = 'ok' and created_at >= now() - (p_days || ' days')::interval),
    'by_tool', (
      select coalesce(jsonb_object_agg(tool_name, jsonb_build_object('calls', n, 'accounts', a, 'errors', e)), '{}'::jsonb)
      from (select tool_name, count(*) n, count(distinct account_id) a, count(*) filter (where status = 'upstream_error') e
            from paid where created_at >= now() - (p_days || ' days')::interval group by tool_name) t)
  ),

  'revenue', jsonb_build_object(
    'window_krw', (select coalesce(sum(t.amount_krw), 0) from topup_orders t join acct a on a.id = t.account_id
                   where t.status = 'confirmed' and t.confirmed_at >= now() - (p_days || ' days')::interval),
    'all_time_krw', (select coalesce(sum(krw), 0) from topup),
    'paying_accounts', (select count(*) from topup),
    'pending_orders_window', (select count(*) from topup_orders t join acct a on a.id = t.account_id
                              where t.status = 'pending' and t.created_at >= now() - (p_days || ' days')::interval)
  ),

  'recent_signups', (
    select coalesce(jsonb_agg(jsonb_build_object('email', a.email, 'created_at', a.created_at,
             'first_call_at', f.first_at, 'calls', (select count(*) from ev where account_id = a.id and status = 'ok' and credits > 0),
             'balance', (select balance from account_balances where account_id = a.id)) order by a.created_at desc), '[]'::jsonb)
    from (select * from acct order by created_at desc limit 20) a left join first_call f on f.account_id = a.id)
)
$$;
