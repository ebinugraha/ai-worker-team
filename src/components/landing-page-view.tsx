import Link from "next/link";
import Image from "next/image";
import {
  ArrowRightIcon,
  FileTextIcon,
  MonitorIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { SeedAvatar } from "@/components/seed-avatar";

const HIGHLIGHTS = [
  {
    icon: SparklesIcon,
    title: "Buat asisten sesuai kebutuhan",
    description:
      "Beri nama, pilih karakter wajah, dan tentukan tugasnya—mulai dari penulis, perangkum dokumen, hingga asisten harian.",
  },
  {
    icon: UsersIcon,
    title: "Kerja bersama dalam satu grup",
    description:
      "Gabungkan beberapa asisten di satu ruang obrolan agar mereka saling bekerja sama menyelesaikan pekerjaan Anda.",
  },
  {
    icon: MonitorIcon,
    title: "Punya ruang kerja sendiri",
    description:
      "Asisten tidak sekadar membalas pesan, tetapi juga bisa mencari informasi, mengolah dokumen, dan menyiapkan file untuk Anda.",
  },
];

export function LandingPageView() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/Logo.svg"
              alt="Genichiro"
              width={24}
              height={22}
              className="size-6 object-contain"
            />
            <span className="font-semibold text-base tracking-tight text-foreground">
              Genichiro
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Mulai Gratis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Minimal Hero Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground leading-[1.15]">
            Tim asisten AI pribadi untuk membantu pekerjaan Anda.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed font-normal">
            Buat asisten sesuai kebutuhan, ajak mengobrol secara pribadi atau
            bekerja bersama di dalam grup, dan biarkan mereka menyelesaikan
            tugas harian Anda dengan mudah.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Mulai Sekarang
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center h-11 px-5 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              Sudah punya akun
            </Link>
          </div>
        </section>

        {/* Simple, Human-Friendly Conversation Preview */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Preview Header */}
            <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <SeedAvatar
                    seed="Rina-Riset"
                    size={28}
                    className="rounded-none ring-2 ring-card bg-secondary"
                  />
                  <SeedAvatar
                    seed="Budi-Penulis"
                    size={28}
                    className="rounded-none ring-2 ring-card bg-secondary"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Tim Konten & Riset
                  </p>
                  <p className="text-xs text-muted-foreground">
                    2 asisten di dalam grup
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Contoh ruang obrolan
              </span>
            </div>

            {/* Preview Messages */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* User message */}
              <div className="flex justify-end">
                <div className="max-w-md rounded-2xl rounded-tr-sm bg-secondary px-4 py-3 text-sm text-foreground leading-relaxed">
                  Tolong carikan ide topik artikel tentang gaya hidup sehat
                  untuk minggu ini, lalu buatkan draf singkatnya.
                </div>
              </div>

              {/* Bot 1 response */}
              <div className="flex items-start gap-3">
                <SeedAvatar
                  seed="Rina-Riset"
                  size={34}
                  className="rounded-none shrink-0 mt-0.5"
                />
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Rina
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Asisten Riset
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Saya sudah mengumpulkan 3 topik yang paling relevan minggu
                    ini beserta poin utamanya. Selanjutnya{" "}
                    <span className="text-foreground font-medium">@Budi</span>{" "}
                    akan menyusun draf tulisannya untuk Anda.
                  </p>
                </div>
              </div>

              {/* Bot 2 response */}
              <div className="flex items-start gap-3">
                <SeedAvatar
                  seed="Budi-Penulis"
                  size={34}
                  className="rounded-none shrink-0 mt-0.5"
                />
                <div className="space-y-2.5 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Budi
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Penulis Konten
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Draf artikel sudah selesai saya tulis dan rapikan. Anda bisa
                    langsung membaca atau mengunduh dokumennya di bawah ini.
                  </p>
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-border bg-background text-xs font-medium text-foreground">
                    <FileTextIcon className="size-4 text-muted-foreground shrink-0" />
                    <span>Draf Artikel Mingguan.docx</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three Simple Pillars */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3"
                >
                  <div className="size-9 rounded-lg bg-secondary flex items-center justify-center text-foreground">
                    <Icon className="size-4" />
                  </div>
                  <h2 className="text-base font-semibold text-foreground">
                    {item.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border/60 py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Image
              src="/Logo.svg"
              alt="Genichiro"
              width={18}
              height={16}
              className="size-4 object-contain opacity-80"
            />
            <span>© 2026 Genichiro</span>
          </div>

          <div className="flex items-center gap-5">
            <Link
              href="/sign-in"
              className="hover:text-foreground transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/sign-up"
              className="hover:text-foreground transition-colors"
            >
              Daftar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
