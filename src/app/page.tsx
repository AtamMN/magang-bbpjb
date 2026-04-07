import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8">
      <section className="hero-grid mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm md:p-12">
        <div className="space-y-5">
          <span className="inline-flex rounded-full bg-[#00509D]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#00509D]">
            Magang BBPJB
          </span>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
            Selamat datang di Presensi Magang Balai Bahasa Provinsi Jawa Barat.
          </h1>
          <p className="max-w-3xl text-base text-slate-600 md:text-lg">
            Sistem ini digunakan untuk pencatatan presensi masuk dan keluar peserta magang,
            pemantauan data kehadiran harian, serta pengelolaan rekap presensi oleh admin.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-[#00509D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#003d7a]"
            >
              Masuk ke Sistem
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
