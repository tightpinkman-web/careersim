-- CreateTable
CREATE TABLE "catalog_votes" (
    "id" TEXT NOT NULL,
    "catalog_id" TEXT NOT NULL,
    "vote_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_votes_catalog_id_key" ON "catalog_votes"("catalog_id");
