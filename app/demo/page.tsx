import type { Metadata } from "next";
import DemoPageClient from "./DemoPageClient";

const TITLE = "Try Our Career Simulations | AI Career Simulator Demo";
const DESCRIPTION =
  "Counselor preview environment - test drive 5 flagship AI-driven career simulations, from Venture Capital to Cybersecurity, in Child or Professional mode.";

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

export default function DemoPage() {
  return <DemoPageClient />;
}
