const env = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
};

export const config = {
  publicUrl: () => env("PUBLIC_URL", "http://localhost:3000"),
  supabaseUrl: () => env("SUPABASE_URL"),
  supabaseServiceRoleKey: () => env("SUPABASE_SERVICE_ROLE_KEY"),
  /** KRW per credit */
  creditKrw: Number(process.env.CREDIT_KRW ?? "10"),
  signupBonusCredits: Number(process.env.SIGNUP_BONUS_CREDITS ?? "50"),
  minTopupCredits: Number(process.env.MIN_TOPUP_CREDITS ?? "100"),
  signupsPerIpPerDay: Number(process.env.SIGNUPS_PER_IP_PER_DAY ?? "3"),
  upstream: {
    dataGoKrKey: () => env("DATA_GO_KR_KEY"),
    jusoKey: () => env("JUSO_KEY"),
    dartKey: () => env("DART_KEY"),
    lawOc: () => env("LAW_OC"),
  },
  toss: {
    clientKey: () => env("TOSS_CLIENT_KEY"),
    secretKey: () => env("TOSS_SECRET_KEY"),
  },
  serverName: "kr-groundtruth-mcp",
  serverVersion: "0.1.0",
};
