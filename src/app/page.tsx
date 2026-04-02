import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

const highlights = [
  {
    title: "Dashboard Presensi",
    description: "Ringkasan kehadiran harian, status validasi, dan rekap mingguan.",
  },
  {
    title: "Scan QR Cepat",
    description: "Alur scan masuk/keluar dengan fallback mode dinas luar.",
  },
  {
    title: "Integrasi Firebase",
    description: "Siap wiring ke RTDB memakai kontrak Presensi yang sudah disiapkan.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <section className="hero-grid mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm md:p-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex rounded-full bg-[#00509D]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#00509D]">
              Magang BBPJB
            </span>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              Presensi Magang yang modern, rapi, dan siap terintegrasi penuh.
            </h1>
            <p className="max-w-xl text-base text-slate-600 md:text-lg">
              Fondasi UI mengikuti bahasa visual Sedasa, dengan kerangka logika Presensi untuk auth, dashboard role routing, dan scan QR.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-[#00509D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#003d7a]"
              >
                Masuk ke Sistem
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border-2 border-[#00509D] px-5 py-3 text-sm font-semibold text-[#00509D] transition-colors hover:bg-[#00509D] hover:text-white"
              >
                Lihat Dashboard
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {highlights.map((item) => (
              <Card key={item.title} variant="elevated" className="animate-fade-in-up">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-500">
                  Siap dipakai sebagai baseline implementasi tahap berikutnya.
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
