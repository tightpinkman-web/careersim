-- AlterTable
ALTER TABLE "simulation_sessions" ADD COLUMN "competencies" JSONB;
ALTER TABLE "simulation_sessions" ADD COLUMN "key_strengths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "simulation_sessions" ADD COLUMN "growth_areas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "simulation_sessions" ADD COLUMN "career_fit_summary" TEXT;
