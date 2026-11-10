-- Removes the "Mindler" partner branding from the schema and from existing data: changes the
-- school_organizations.partnerRef column default for future rows, and renames the one existing
-- seeded partner row's partnerRef/accessKey off "mindler"/"MNDL-" prefixes. This rotates the real
-- access key a pilot partner may already hold (MNDL-DPS2026 -> ENT-DPS2026) - a deliberate,
-- explicitly-confirmed exception to "migrations never touch existing data" for this one row,
-- since the whole point of this migration is to remove the brand string from the live database,
-- not just from the schema definition.

-- AlterTable
ALTER TABLE "school_organizations" ALTER COLUMN "partnerRef" SET DEFAULT 'enterprise';

-- DataMigration: rename the live partner record off "mindler"/"MNDL-" prefixes
UPDATE "school_organizations"
SET "partnerRef" = 'enterprise'
WHERE "partnerRef" = 'mindler';

UPDATE "school_organizations"
SET "accessKey" = 'ENT-' || substring("accessKey" FROM 6)
WHERE "accessKey" LIKE 'MNDL-%';
