import verify_business_registration from "./verify_business_registration.json";
import search_address from "./search_address.json";
import search_corporation from "./search_corporation.json";
import lookup_corporation from "./lookup_corporation.json";
import apartment_trade_prices from "./apartment_trade_prices.json";
import search_law from "./search_law.json";
import get_balance from "./get_balance.json";
import get_pricing from "./get_pricing.json";

/** Real responses captured from production on 2026-08-26 (results truncated to 2). */
export const EXAMPLES: Record<string, unknown> = {
  verify_business_registration,
  search_address,
  search_corporation,
  lookup_corporation,
  apartment_trade_prices,
  search_law,
  get_balance,
  get_pricing,
};
