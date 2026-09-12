-- AlterTable
ALTER TABLE "simulation_sessions" ADD COLUMN     "age_tier" TEXT NOT NULL DEFAULT 'college_pro',
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'professional';
