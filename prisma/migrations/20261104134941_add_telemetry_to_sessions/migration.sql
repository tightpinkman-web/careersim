-- AlterTable
ALTER TABLE "simulation_sessions" ADD COLUMN "telemetry" JSONB;
ALTER TABLE "simulation_sessions" ADD COLUMN "counselor_debrief_url" TEXT;
