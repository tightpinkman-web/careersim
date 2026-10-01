import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { CatalogVoteMap } from "@/lib/catalogData";
import CatalogPageClient from "./CatalogPageClient";

const TITLE = "Career Catalog | AI Career Simulator";
const DESCRIPTION =
  "Search live and upcoming AI career simulations by industry and skill, then vote to prioritize the careers your students want tested next.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    title: TITLE,
    description: DESCRIPTION,
  },
};

// The catalog's entry metadata (lib/catalogData.ts) is fully static, so the only server data
// worth caching here is a vote-count snapshot - revalidate hourly rather than hitting Prisma on
// every single visit. CatalogPageClient still live-updates on an actual vote.
export const revalidate = 3600;

export default async function CatalogPage() {
  const votes = await prisma.catalogVote.findMany();
  const initialVotes: CatalogVoteMap = Object.fromEntries(votes.map((v) => [v.catalogId, v.voteCount]));

  return <CatalogPageClient initialVotes={initialVotes} />;
}
