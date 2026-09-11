import { z } from "zod";

export const EvaluationSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  competencies: z
    .record(z.string(), z.number().min(0).max(100))
    .refine((obj) => Object.keys(obj).length === 4, {
      message: "competencies must map exactly 4 career dimensions to scores",
    }),
  keyStrengths: z.array(z.string()).length(3),
  growthAreas: z.array(z.string()).length(2),
  careerFitSummary: z.string(),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;
