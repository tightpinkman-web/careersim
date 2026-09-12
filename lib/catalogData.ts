export type CatalogIndustry = "Tech" | "Finance" | "Legal" | "Engineering" | "Healthcare";
export type CatalogStatus = "live" | "in_development";
export type CatalogModeSupport = "child_and_pro" | "pro_only";

export interface CatalogEntry {
  id: string;
  title: string;
  industry: CatalogIndustry;
  description: string;
  keySkills: string[];
  status: CatalogStatus;
  modeSupport: CatalogModeSupport;
}

/** CatalogEntry.id -> vote count, as returned by GET /api/catalog/vote. Entries with no votes
 *  yet simply have no key - look up with `?? 0`. */
export type CatalogVoteMap = Record<string, number>;

export const CATALOG: CatalogEntry[] = [
  // ---------- Live demo sims (5) ----------
  {
    id: "venture-capital-associate",
    title: "Venture Capital Associate",
    industry: "Finance",
    description: "Diligence a pre-Series A pitch and decide where the real risk is hiding.",
    keySkills: ["Financial Analysis", "Risk Identification", "Critical Thinking", "Persuasive Writing"],
    status: "live",
    modeSupport: "child_and_pro",
  },
  {
    id: "soc-incident-responder",
    title: "SOC Incident Responder",
    industry: "Tech",
    description: "Contain an active ransomware breach before it takes down critical systems.",
    keySkills: ["Threat Triage", "Technical Command", "Decision Speed", "Incident Response"],
    status: "live",
    modeSupport: "child_and_pro",
  },
  {
    id: "product-manager",
    title: "Product Manager",
    industry: "Tech",
    description: "Diagnose a checkout conversion drop and ship a sprint plan under a hard point budget.",
    keySkills: ["Data-Driven Reasoning", "Prioritization", "Root Cause Analysis", "Stakeholder Communication"],
    status: "live",
    modeSupport: "child_and_pro",
  },
  {
    id: "corporate-associate",
    title: "Corporate Associate",
    industry: "Legal",
    description: "Negotiate a D2C acquisition and catch the predatory clause buried in the fine print.",
    keySkills: ["Contract Risk Detection", "Negotiation Strategy", "Precision Drafting", "Client Advocacy"],
    status: "live",
    modeSupport: "child_and_pro",
  },
  {
    id: "quant-trading-analyst",
    title: "Quant Trading Analyst",
    industry: "Finance",
    description: "Manage risk on a live position through a volatile central bank rate announcement.",
    keySkills: ["Risk Management", "Volatility Reasoning", "Pattern Recognition", "Decisive Execution"],
    status: "live",
    modeSupport: "child_and_pro",
  },

  // ---------- Planned / in development (12) ----------
  {
    id: "aerospace-engineer",
    title: "Aerospace Engineer",
    industry: "Engineering",
    description: "Diagnose a failed wind-tunnel test and redesign a component before the next launch window.",
    keySkills: ["Systems Thinking", "Physics Reasoning", "Failure Analysis", "Technical Documentation"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "clinical-psychologist",
    title: "Clinical Psychologist",
    industry: "Healthcare",
    description: "Conduct an intake session and build a treatment plan for a new client in crisis.",
    keySkills: ["Active Listening", "Diagnostic Reasoning", "Empathy", "Ethical Judgment"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "renewable-energy-specialist",
    title: "Renewable Energy Specialist",
    industry: "Engineering",
    description: "Model a solar farm proposal and defend its ROI against a skeptical utility board.",
    keySkills: ["Quantitative Modeling", "Sustainability Analysis", "Stakeholder Persuasion", "Systems Thinking"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    industry: "Tech",
    description: "Investigate a suspicious spike in a key metric and decide whether it's signal or noise.",
    keySkills: ["Statistical Reasoning", "Hypothesis Testing", "Data Storytelling", "Critical Thinking"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "registered-nurse",
    title: "Registered Nurse",
    industry: "Healthcare",
    description: "Triage a busy ER shift and prioritize patients under real time pressure.",
    keySkills: ["Triage Judgment", "Multitasking", "Patient Communication", "Composure Under Pressure"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "investment-banking-analyst",
    title: "Investment Banking Analyst",
    industry: "Finance",
    description: "Build a pitch book overnight for a live M&A deal ahead of a morning client meeting.",
    keySkills: ["Financial Modeling", "Attention to Detail", "Time Management", "Client-Ready Communication"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "public-defender",
    title: "Public Defender",
    industry: "Legal",
    description: "Build a defense strategy for a client with a packed docket and limited case-prep time.",
    keySkills: ["Case Strategy", "Cross-Examination", "Time Management", "Advocacy"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "civil-engineer",
    title: "Civil Engineer",
    industry: "Engineering",
    description: "Review a bridge inspection report and decide what gets repaired before the safety deadline.",
    keySkills: ["Structural Reasoning", "Risk Prioritization", "Regulatory Compliance", "Technical Reporting"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "ux-product-designer",
    title: "UX / Product Designer",
    industry: "Tech",
    description: "Redesign a checkout flow after user testing reveals a confusing drop-off point.",
    keySkills: ["User Research", "Visual Communication", "Iterative Design", "Stakeholder Feedback"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "physical-therapist",
    title: "Physical Therapist",
    industry: "Healthcare",
    description: "Design a recovery plan for a patient whose progress has stalled mid-treatment.",
    keySkills: ["Anatomical Reasoning", "Patient Motivation", "Progress Tracking", "Adaptive Planning"],
    status: "in_development",
    modeSupport: "child_and_pro",
  },
  {
    id: "patent-attorney",
    title: "Patent Attorney",
    industry: "Legal",
    description: "Draft and defend a patent claim against a competitor's prior-art challenge.",
    keySkills: ["Technical Reading", "Precision Drafting", "Legal Argumentation", "Prior-Art Research"],
    status: "in_development",
    modeSupport: "pro_only",
  },
  {
    id: "actuary",
    title: "Actuary",
    industry: "Finance",
    description: "Price a new insurance product against a portfolio of real, messy risk data.",
    keySkills: ["Statistical Modeling", "Risk Quantification", "Regulatory Awareness", "Precision"],
    status: "in_development",
    modeSupport: "pro_only",
  },
];
