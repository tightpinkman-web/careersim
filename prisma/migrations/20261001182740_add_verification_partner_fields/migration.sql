-- AlterTable
ALTER TABLE "simulation_sessions" ADD COLUMN     "partner_ref" TEXT,
ADD COLUMN     "verification_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "simulation_sessions_verification_hash_key" ON "simulation_sessions"("verification_hash");

