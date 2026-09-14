-- AlterTable
ALTER TABLE "students" ADD COLUMN "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "students_username_key" ON "students"("username");
