import type { Metadata } from "next";
import { LandingPageView } from "@/components/landing-page-view";

export const metadata: Metadata = {
  title: "Genichiro - Autonomous AI Workers",
  description:
    "Autonomous AI Workers for everything you build and execute. Reasoning, terminal execution, live visual desktop, and multi-agent squads powered by Daytona Linux sandboxes.",
};

export default function LandingPage() {
  return <LandingPageView />;
}
