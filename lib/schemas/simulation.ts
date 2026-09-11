import { z } from "zod";

/**
 * Zod mirror of types/simulation.ts, used both to generate the Gemini structured-output
 * JSON schema (responseJsonSchema) and to validate Gemini's response, so the JSON
 * response is guaranteed to match the SimulationState shape the frontend renders.
 */

export const AllowedActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  kind: z.enum(["primary", "secondary", "danger"]).optional(),
});

export const HudMetricsSchema = z.record(z.string(), z.union([z.string(), z.number()]));

const baseFields = {
  currentStep: z.number().int(),
  narrativePrompt: z.string(),
  allowedActions: z.array(AllowedActionSchema).min(1).max(5),
  hudMetrics: HudMetricsSchema,
  isComplete: z.boolean().optional(),
  overallScore: z.number().min(0).max(100).optional(),
  feedbackSummary: z.string().optional(),
};

// ---------- Venture Capital ----------

const VCEmailSchema = z.object({
  id: z.string(),
  from: z.string(),
  subject: z.string(),
  preview: z.string(),
  body: z.string(),
  receivedAt: z.string(),
  read: z.boolean().optional(),
  attachments: z.array(z.string()).optional(),
});

const VCDeckSlideSchema = z.object({
  id: z.string(),
  title: z.string(),
  imageUrl: z.string().optional(),
  bullets: z.array(z.string()),
});

const VCFinancialMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.enum(["up", "down", "flat"]).optional(),
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
  resolved: z.boolean().optional(),
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
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  points: z.number().int().optional(),
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
  flagged: z.boolean().optional(),
  redline: z
    .object({
      original: z.string(),
      proposed: z.string(),
      rationale: z.string().optional(),
    })
    .optional(),
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
  volume: z.number().optional(),
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
  sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
});

const QuantParametersSchema = z.object({
  stopLoss: z.number(),
  volatilityThreshold: z.number(),
  positionSize: z.number().optional(),
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
