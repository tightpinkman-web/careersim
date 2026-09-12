import type { Metadata } from "next";
import RequestPageClient from "./RequestPageClient";

const TITLE = "Request a Career Simulation | AI Career Simulator";
const DESCRIPTION =
  "Counselors and students: tell us the career you want simulated next - we prioritize builds based on demand and fit for our AI Game Master format.";

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

export default function RequestPage() {
  return <RequestPageClient />;
}
