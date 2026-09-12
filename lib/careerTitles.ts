import type { CareerType } from "@/types/simulation";

/** Human-readable display title per career - the single source of truth for this mapping,
 *  used anywhere a CareerType needs to become "Venture Capital Associate" rather than
 *  "VENTURE_CAPITAL". */
export const CAREER_TITLES: Record<CareerType, string> = {
  VENTURE_CAPITAL: "Venture Capital Associate",
  CYBERSECURITY: "SOC Incident Responder",
  PRODUCT_MANAGEMENT: "Product Manager",
  CORPORATE_LAW: "Corporate Associate",
  QUANT_TRADING: "Quant Trading Analyst",
};
