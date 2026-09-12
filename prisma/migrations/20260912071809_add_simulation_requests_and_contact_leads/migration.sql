-- CreateEnum
CREATE TYPE "RequesterRole" AS ENUM ('COUNSELOR', 'STUDENT');

-- CreateTable
CREATE TABLE "simulation_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "RequesterRole" NOT NULL,
    "organization" TEXT,
    "requested_career_title" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "key_skills" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_leads_pkey" PRIMARY KEY ("id")
);
