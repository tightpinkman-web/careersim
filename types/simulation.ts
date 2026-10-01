// Central type definitions for the AI career simulation platform's dynamic UI state machine.

export type CareerType =
  | "VENTURE_CAPITAL"
  | "CYBERSECURITY"
  | "PRODUCT_MANAGEMENT"
  | "CORPORATE_LAW"
  | "QUANT_TRADING";

export type UiMode =
  | "VENTURE_CAPITAL"
  | "CYBERSECURITY"
  | "PRODUCT_MANAGEMENT"
  | "CORPORATE_LAW"
  | "QUANT_TRADING";

/** Child/Aptitude Focus (simplified, jargon-free) vs Professional/Full Tech (full complexity). */
export type SimulationMode = "child" | "professional";

/** Derived 1:1 from SimulationMode - "child" -> "10-12th", "professional" -> "college_pro". */
export type AgeTier = "10-12th" | "college_pro";

export function ageTierForMode(mode: SimulationMode): AgeTier {
  return mode === "child" ? "10-12th" : "college_pro";
}

export interface AllowedAction {
  id: string;
  label: string;
  description?: string;
  kind?: "primary" | "secondary" | "danger";
}

export interface HudMetrics {
  /** Free-form label/value pairs rendered in the shell HUD, e.g. Funds Left, Server Health, Conversion Rate, Time */
  [key: string]: string | number | undefined;
  fundsLeft?: string | number;
  serverHealth?: string | number;
  conversionRate?: string | number;
  timeRemaining?: string;
}

// ---------- Venture Capital ----------

export interface VCEmail {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  read?: boolean;
  attachments?: string[];
}

export interface VCDeckSlide {
  id: string;
  title: string;
  imageUrl?: string;
  bullets: string[];
}

export interface VCFinancialMetric {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
}

export interface VCPayload {
  emails: VCEmail[];
  memoDraft: string;
  deckSlides: VCDeckSlide[];
  financialMetrics: VCFinancialMetric[];
  startupName: string;
}

// ---------- Cybersecurity ----------

export interface TerminalLine {
  id: string;
  type: "input" | "output" | "error";
  text: string;
  timestamp: string;
}

export interface ThreatAlert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  message: string;
  timestamp: string;
  resolved?: boolean;
}

export interface CyberPayload {
  systemHealth: number;
  activeIncidents: number;
  terminalLines: TerminalLine[];
  alerts: ThreatAlert[];
  currentDirectory: string;
}

// ---------- Product Management ----------

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  points?: number;
}

export type KanbanColumnId = "TODO" | "IN_PROGRESS" | "SELECTED";

export interface KanbanBoard {
  columns: Record<KanbanColumnId, KanbanCard[]>;
}

export interface FunnelDataPoint {
  stage: string;
  users: number;
}

export interface PrioritizationItem {
  id: string;
  name: string;
  impact: number;
  effort: number;
}

export interface ProductPayload {
  board: KanbanBoard;
  funnelData: FunnelDataPoint[];
  prioritizationMatrix: PrioritizationItem[];
  conversionRate: number;
}

// ---------- Corporate Law ----------

export interface ContractClause {
  id: string;
  heading: string;
  text: string;
  flagged?: boolean;
  redline?: {
    original: string;
    proposed: string;
    rationale?: string;
  };
}

export interface NegotiationMessage {
  id: string;
  sender: "student" | "opposing_counsel";
  text: string;
  timestamp: string;
}

export interface LawPayload {
  documentTitle: string;
  clauses: ContractClause[];
  negotiationThread: NegotiationMessage[];
}

// ---------- Quant Trading ----------

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface NewsHeadline {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  sentiment?: "positive" | "negative" | "neutral";
}

export interface QuantParameters {
  stopLoss: number;
  volatilityThreshold: number;
  positionSize?: number;
}

export interface QuantPayload {
  ticker: string;
  candles: Candle[];
  orderBook: OrderBook;
  news: NewsHeadline[];
  parameters: QuantParameters;
  pnl: number;
}

// ---------- Master discriminated union ----------

export type SimulationPayload =
  | VCPayload
  | CyberPayload
  | ProductPayload
  | LawPayload
  | QuantPayload;

interface BaseSimulationState {
  currentStep: number;
  careerType: CareerType;
  narrativePrompt: string;
  allowedActions: AllowedAction[];
  hudMetrics: HudMetrics;
  /** Set true by the Game Master when the scenario has reached a natural conclusion. */
  isComplete?: boolean;
  /** Present when isComplete is true; mirrors SimulationSession.overallScore (0-100). */
  overallScore?: number;
  /** Present when isComplete is true; mirrors SimulationSession.feedbackSummary. */
  feedbackSummary?: string;
  /** Game Master's 0-100 self-assessment of the student's previous decision; omitted on turn 1.
   *  Drives dynamic difficulty calibration - see app/api/simulations/action/route.ts. */
  turnScore?: number;
}

export interface VCSimulationState extends BaseSimulationState {
  careerType: "VENTURE_CAPITAL";
  ui_mode: "VENTURE_CAPITAL";
  payload: VCPayload;
}

export interface CyberSimulationState extends BaseSimulationState {
  careerType: "CYBERSECURITY";
  ui_mode: "CYBERSECURITY";
  payload: CyberPayload;
}

export interface ProductSimulationState extends BaseSimulationState {
  careerType: "PRODUCT_MANAGEMENT";
  ui_mode: "PRODUCT_MANAGEMENT";
  payload: ProductPayload;
}

export interface LawSimulationState extends BaseSimulationState {
  careerType: "CORPORATE_LAW";
  ui_mode: "CORPORATE_LAW";
  payload: LawPayload;
}

export interface QuantSimulationState extends BaseSimulationState {
  careerType: "QUANT_TRADING";
  ui_mode: "QUANT_TRADING";
  payload: QuantPayload;
}

/**
 * Master discriminated union describing the entire renderable state of a simulation
 * session. Narrow on `ui_mode` (or `careerType`, they are always equal) to get the
 * correctly typed `payload` for the active career track.
 */
export type SimulationState =
  | VCSimulationState
  | CyberSimulationState
  | ProductSimulationState
  | LawSimulationState
  | QuantSimulationState;
