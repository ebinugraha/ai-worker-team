import type { Metadata } from "next";
import { LandingPageView } from "@/components/landing-page-view";

export const metadata: Metadata = {
  title: "Genichiro - Tim Asisten AI Pribadi Anda",
  description:
    "Buat asisten AI sesuai kebutuhan Anda, ajak berdiskusi atau bekerja bersama dalam satu grup untuk menyelesaikan pekerjaan harian dengan mudah.",
};

export default function LandingPage() {
  return <LandingPageView />;
}
