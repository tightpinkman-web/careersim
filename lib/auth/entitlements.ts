import { prisma } from "@/lib/prisma";
import type { SchoolOrganization } from "@prisma/client";

export type EntitlementTier = "ENTERPRISE_STUDENT" | "PUBLIC_DEMO";

export interface Entitlement {
  tier: EntitlementTier;
  organization: SchoolOrganization | null;
}

/** Hard cap on free-tier scenario depth - see app/api/simulations/action/route.ts, which blocks
 *  further decisions once a PUBLIC_DEMO session has this many logged turns. */
export const DEMO_STEP_CAP = 3;

/**
 * Resolves what tier a student is entitled to: ENTERPRISE_STUDENT if their email domain matches a
 * partner SchoolOrganization, or if the supplied cohort access key matches one. Everyone else
 * (including domain/key mismatches) gets the capped PUBLIC_DEMO tier.
 */
export async function resolveUserEntitlement(email: string, inputAccessKey?: string): Promise<Entitlement> {
  const domain = email.split("@")[1]?.toLowerCase();
  const trimmedKey = inputAccessKey?.trim();

  if (!domain && !trimmedKey) {
    return { tier: "PUBLIC_DEMO", organization: null };
  }

  const organization = await prisma.schoolOrganization.findFirst({
    where: {
      OR: [
        ...(domain ? [{ domains: { has: domain } }] : []),
        ...(trimmedKey ? [{ accessKey: trimmedKey }] : []),
      ],
    },
  });

  if (organization) {
    return { tier: "ENTERPRISE_STUDENT", organization };
  }
  return { tier: "PUBLIC_DEMO", organization: null };
}
