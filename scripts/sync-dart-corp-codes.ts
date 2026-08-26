/**
 * Downloads DART corpCode.xml (zip) and upserts into dart_corp_codes.
 * Run: npx tsx scripts/sync-dart-corp-codes.ts   (needs DART_KEY, SUPABASE_* env)
 * Re-run monthly; the list changes slowly.
 */
import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";

const main = async () => {
  const key = process.env.DART_KEY!;
  const res = await fetch(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${key}`);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const zip = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const xmlName = Object.keys(zip).find((n) => n.toLowerCase().endsWith(".xml"));
  if (!xmlName) throw new Error("no xml in zip");
  const xml = new TextDecoder("utf-8").decode(zip[xmlName]);
  const parsed = new XMLParser({ parseTagValue: false, trimValues: true }).parse(xml) as {
    result: { list: Array<{ corp_code: string; corp_name: string; stock_code?: string; modify_date?: string }> };
  };
  const rows = parsed.result.list.map((r) => ({
    corp_code: r.corp_code,
    corp_name: r.corp_name,
    stock_code: r.stock_code?.trim() || null,
    modify_date: r.modify_date ?? null,
  }));
  console.log(`parsed ${rows.length} corporations`);

  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const BATCH = 2000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await sb.from("dart_corp_codes").upsert(rows.slice(i, i + BATCH));
    if (error) throw new Error(error.message);
    process.stdout.write(`\r${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log("\ndone");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
