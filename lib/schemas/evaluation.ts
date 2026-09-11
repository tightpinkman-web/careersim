import { z } from "zod";

// Note: the "exactly 4 competency dimensions" rule is enforced in the evaluate route via a
// plain post-response check rather than a `.refine()` here, since `.refine()` predicates have
// no JSON Schema equivalent and would get dropped (or block conversion) when this schema is
// turned into Gemini's `responseJsonSchema` via `z.toJSONSchema`.
export const EvaluationSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  competencies: z.record(z.string(), z.number().min(0).max(100)),
  keyStrengths: z.array(z.string()).length(3),
  growthAreas: z.array(z.string()).length(2),
  careerFitSummary: z.string(),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;
