import { ImageResponse } from "next/og";
import { OgImageContent } from "@/lib/ogImageContent";

export const alt = "AI Career Simulator - Interactive Career Trials for Counselors & Schools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<OgImageContent />, size);
}
