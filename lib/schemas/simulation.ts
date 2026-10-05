import { z } from "zod";

/**
 * Zod mirror of types/simulation.ts, used both to generate the structured-output JSON schema
 * (Gemini's responseJsonSchema) and to validate the Game Master's response (Gemini or Groq - see
 * lib/llm/provider.ts), so the JSON response is guaranteed to match the SimulationState shape the
 * frontend renders.
 *
 * Every optional field below uses `.nullish()` rather than plain `.optional()`: Gemini omits a
 * field it has nothing to say for, but Groq's openai/gpt-oss-20b instead emits it as an explicit
 * JSON null - confirmed in production, where `.optional()` rejected `turnScore: null` and caused
 * every Groq response to fail validation and silently fall back to Gemini. `.nullish()` accepts
 * both shapes so neither provider's convention breaks validation.
 */

export const AllowedActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullish(),
  kind: z.enum(["primary", "secondary", "danger"]).nullish(),
});

export const HudMetricsSchema = z.record(z.string(), z.union([z.string(), z.number()]));

const baseFields = {
  currentStep: z.number().int(),
  narrativePrompt: z.string(),
  allowedActions: z.array(AllowedActionSchema).min(1).max(5),
  hudMetrics: HudMetricsSchema,
  isComplete: z.boolean().nullish(),
  overallScore: z.number().min(0).max(100).nullish(),
  feedbackSummary: z.string().nullish(),
  // Game Master's own 0-100 assessment of how well-reasoned the student's PREVIOUS decision was
  // (the one that produced this turn) - omitted on turn 1, since there's no prior decision yet.
  // Drives dynamic difficulty calibration in app/api/simulations/action/route.ts.
  turnScore: z.number().min(0).max(100).nullish(),
};

// ---------- Venture Capital ----------

const VCEmailSchema = z.object({
  id: z.string(),
  from: z.string(),
  subject: z.string(),
  preview: z.string(),
  body: z.string(),
  receivedAt: z.string(),
  read: z.boolean().nullish(),
  attachments: z.array(z.string()).nullish(),
});

const VCDeckSlideSchema = z.object({
  id: z.string(),
  title: z.string(),
  imageUrl: z.string().nullish(),
  bullets: z.array(z.string()),
});

const VCFinancialMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.enum(["up", "down", "flat"]).nullish(),
});

export const VCPayloadSchema = z.object({
  emails: z.array(VCEmailSchema),
  memoDraft: z.string(),
  deckSlides: z.array(VCDeckSlideSchema),
  financialMetrics: z.array(VCFinancialMetricSchema),
  startupName: z.string(),
});

export const VCSimulationStateSchema = z.object({
  ...baseFields,
  careerType: z.literal("VENTURE_CAPITAL"),
  ui_mode: z.literal("VENTURE_CAPITAL"),
  payload: VCPayloadSchema,
});

// ---------- Cybersecurity ----------

const TerminalLineSchema = z.object({
  id: z.string(),
  type: z.enum(["input", "output", "error"]),
  text: z.string(),
  timestamp: z.string(),
});

const ThreatAlertSchema = z.object({
  id: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  source: z.string(),
  message: z.string(),
  timestamp: z.string(),
  resolved: z.boolean().nullish(),
});

export const CyberPayloadSchema = z.object({
  systemHealth: z.number().min(0).max(100),
  activeIncidents: z.number().int().min(0),
  terminalLines: z.array(TerminalLineSchema),
  alerts: z.array(ThreatAlertSchema),
  currentDirectory: z.string(),
});

export const CyberSimulationStateSchema = z.object({
  ...baseFields,
  careerType: z.literal("CYBERSECURITY"),
  ui_mode: z.literal("CYBERSECURITY"),
  payload: CyberPayloadSchema,
});

// ---------- Product Management ----------

const KanbanCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  priority: z.enum(["low", "medium", "high"]).nullish(),
  points: z.number().int().nullish(),
});

const KanbanBoardSchema = z.object({
  columns: z.object({
    TODO: z.array(KanbanCardSchema),
    IN_PROGRESS: z.array(KanbanCardSchema),
    SELECTED: z.array(KanbanCardSchema),
  }),
});

const FunnelDataPointSchema = z.object({
  stage: z.string(),
  users: z.number().int().min(0),
});

const PrioritizationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  impact: z.number(),
  effort: z.number(),
});

export const ProductPayloadSchema = z.object({
  board: KanbanBoardSchema,
  funnelData: z.array(FunnelDataPointSchema),
  prioritizationMatrix: z.array(PrioritizationItemSchema),
  conversionRate: z.number(),
});

export const ProductSimulationStateSchema = z.object({
  ...baseFields,
  careerType: z.literal("PRODUCT_MANAGEMENT"),
  ui_mode: z.literal("PRODUCT_MANAGEMENT"),
  payload: ProductPayloadSchema,
});

// ---------- Corporate Law ----------

const ContractClauseSchema = z.object({
  id: z.string(),
  heading: z.string(),
  text: z.string(),
  flagged: z.boolean().nullish(),
  redline: z
    .object({
      original: z.string(),
      proposed: z.string(),
      rationale: z.string().nullish(),
    })
    .nullish(),
});

const NegotiationMessageSchema = z.object({
  id: z.string(),
  sender: z.enum(["student", "opposing_counsel"]),
  text: z.string(),
  timestamp: z.string(),
});

export const LawPayloadSchema = z.object({
  documentTitle: z.string(),
  clauses: z.array(ContractClauseSchema),
  negotiationThread: z.array(NegotiationMessageSchema),
});

export const LawSimulationStateSchema = z.object({
  ...baseFields,
  careerType: z.literal("CORPORATE_LAW"),
  ui_mode: z.literal("CORPORATE_LAW"),
  payload: LawPayloadSchema,
});

// ---------- Quant Trading ----------

const CandleSchema = z.object({
  time: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().nullish(),
});

const OrderBookLevelSchema = z.object({
  price: z.number(),
  size: z.number(),
});

const OrderBookSchema = z.object({
  bids: z.array(OrderBookLevelSchema),
  asks: z.array(OrderBookLevelSchema),
});

const NewsHeadlineSchema = z.object({
  id: z.string(),
  headline: z.string(),
  source: z.string(),
  timestamp: z.string(),
  sentiment: z.enum(["positive", "negative", "neutral"]).nullish(),
});

const QuantParametersSchema = z.object({
  stopLoss: z.number(),
  volatilityThreshold: z.number(),
  positionSize: z.number().nullish(),
});

export const QuantPayloadSchema = z.object({
  ticker: z.string(),
  candles: z.array(CandleSchema),
  orderBook: OrderBookSchema,
  news: z.array(NewsHeadlineSchema),
  parameters: QuantParametersSchema,
  pnl: z.number(),
});

export const QuantSimulationStateSchema = z.object({
  ...baseFields,
  careerType: z.literal("QUANT_TRADING"),
  ui_mode: z.literal("QUANT_TRADING"),
  payload: QuantPayloadSchema,
});

// ---------- Registry ----------

export const CAREER_STATE_SCHEMAS = {
  VENTURE_CAPITAL: VCSimulationStateSchema,
  CYBERSECURITY: CyberSimulationStateSchema,
  PRODUCT_MANAGEMENT: ProductSimulationStateSchema,
  CORPORATE_LAW: LawSimulationStateSchema,
  QUANT_TRADING: QuantSimulationStateSchema,
} as const;

export type CareerTypeKey = keyof typeof CAREER_STATE_SCHEMAS;
