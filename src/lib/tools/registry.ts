import type { ToolDef } from "./types";
import { verifyBusinessRegistration } from "./business";
import { searchAddress } from "./address";
import { lookupCorporation, searchCorporation } from "./corporation";
import { apartmentTradePrices } from "./apt";
import { searchLaw } from "./law";
import { getBalanceTool, getPricingTool } from "./account";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOLS: ToolDef<any>[] = [
  verifyBusinessRegistration,
  searchAddress,
  searchCorporation,
  lookupCorporation,
  apartmentTradePrices,
  searchLaw,
  getBalanceTool,
  getPricingTool,
];

export const getTool = (name: string) => TOOLS.find((t) => t.name === name);

export const costLine = (t: ToolDef) =>
  t.credits === 0 ? "Cost: free." : `Cost: ${t.credits} credit${t.credits > 1 ? "s" : ""}/call (cache hit: ${t.cacheHitCredits}).`;

export const fullDescription = (t: ToolDef) => `${costLine(t)} ${t.description}`;
