import type { z } from "zod";
import type { AuthContext } from "../auth";

export interface ToolContext {
  auth: AuthContext;
}

export interface ToolDef<S extends z.ZodObject = z.ZodObject> {
  name: string;
  title: string;
  /** Human/agent-facing description, without the cost line (pipeline prepends it). */
  description: string;
  input: S;
  /** Credits per call; 0 = free. Must match tool_prices seed. */
  credits: number;
  cacheHitCredits: number;
  /** Response cache TTL in seconds; 0 = no cache. */
  cacheTtlSec: number;
  source: string;
  run: (args: z.infer<S>, ctx: ToolContext) => Promise<unknown>;
}

export const defineTool = <S extends z.ZodObject>(t: ToolDef<S>) => t;
