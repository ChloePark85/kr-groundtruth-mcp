import { requireAuth } from "@/lib/auth";
import { executeTool } from "@/lib/pipeline";
import { handle, json, readJson } from "@/lib/http";
import { fullDescription, getTool, TOOLS } from "@/lib/tools/registry";
import { ApiError } from "@/lib/errors";
import { z } from "zod";

export const POST = handle(async (req, { params }) => {
  const { tool } = await params;
  const auth = await requireAuth(req);
  const env = await executeTool(tool, await readJson(req), auth);
  return json(env);
});

export const GET = handle(async (_req, { params }) => {
  const { tool } = await params;
  const t = getTool(tool);
  if (!t) throw new ApiError(404, "UNKNOWN_TOOL", `Unknown tool. Available: ${TOOLS.map((x) => x.name).join(", ")}`);
  return json({ ok: true, name: t.name, title: t.title, description: fullDescription(t), credits: t.credits, input_schema: z.toJSONSchema(t.input, { io: "input" }) });
});
