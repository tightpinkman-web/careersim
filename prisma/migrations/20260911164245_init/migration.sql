-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CareerType" AS ENUM ('VENTURE_CAPITAL', 'CYBERSECURITY', 'PRODUCT_MANAGEMENT', 'CORPORATE_LAW', 'QUANT_TRADING');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "supabase_auth_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_sessions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "career_type" "CareerType" NOT NULL,
    "status" "SimulationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "overall_score" INTEGER,
    "feedback_summary" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "simulation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "step_sequence" INTEGER NOT NULL,
    "student_input" TEXT NOT NULL,
    "returned_state" JSONB NOT NULL,
    "decision_tag" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_supabase_auth_id_key" ON "students"("supabase_auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "simulation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
