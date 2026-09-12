import type { Metadata } from "next";
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

export default function CatalogPage() {
  return <CatalogPageClient />;
}
