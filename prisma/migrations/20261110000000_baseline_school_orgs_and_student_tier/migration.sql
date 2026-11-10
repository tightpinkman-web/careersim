-- Baseline migration: reconciles migration history with objects that were already present on the
-- live database (applied via `prisma db push` at some point, outside the migration history) before
-- this migration was ever written. This file is recorded via `prisma migrate resolve --applied`,
-- never executed against the live database - it exists purely so a fresh database built from
-- migration history alone ends up with the same shape as the live one.

-- CreateEnum
CREATE TYPE "StudentTier" AS ENUM ('ENTERPRISE_STUDENT', 'PUBLIC_DEMO');

-- CreateTable
CREATE TABLE "school_organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domains" TEXT[],
    "accessKey" TEXT,
    "partnerRef" TEXT NOT NULL DEFAULT 'mindler',
    "maxStudents" INTEGER NOT NULL DEFAULT 500,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_organizations_accessKey_key" ON "school_organizations"("accessKey");

-- AlterTable
ALTER TABLE "students" ADD COLUMN "tier" "StudentTier" NOT NULL DEFAULT 'PUBLIC_DEMO';
ALTER TABLE "students" ADD COLUMN "school_id" TEXT;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
