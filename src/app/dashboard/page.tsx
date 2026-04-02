"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useAuth } from "@/lib/contexts/AuthContext";
import useUserInfo from "@/hooks/useUserInfo";
import useAttendanceRecords from "@/hooks/useAttendanceRecords";
import { formatTimestampWIB } from "@/lib/firebase/attendance";
import { toWIBDateKey } from "@/lib/utils";
import TrialAttendanceTable from "@/components/dashboard/TrialAttendanceTable";

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, loading, userRole, isDemoMode } = useAuth();
  const { userInfo, loadingUser } = useUserInfo(currentUser);
  const { records, loadingAttendance, privileged } = useAttendanceRecords(
    currentUser,
    userRole?.role,
  );

  const attendanceSummary = useMemo(() => {
    const todayKey = toWIBDateKey();
    const todayRecords = records.filter((record) => record.date === todayKey);

    const uniqueUsers = new Set(records.map((record) => record.userId)).size;
    const masukToday = todayRecords.filter((record) => Boolean(record.masuk)).length;
    const keluarToday = todayRecords.filter((record) => Boolean(record.keluar)).length;
    const pendingCheckout = todayRecords.filter(
      (record) => Boolean(record.masuk) && !record.keluar,
    ).length;
    const dinasLuarToday = todayRecords.filter((record) => {
      const masukNote = record.keteranganMasuk || "";
      const keluarNote = record.keteranganKeluar || "";
      return masukNote.includes("Dinas Luar") || keluarNote.includes("Dinas Luar");
    }).length;

    return {
      uniqueUsers,
      masukToday,
      keluarToday,
      pendingCheckout,
      dinasLuarToday,
    };
  }, [records]);

  const stats = useMemo(
    () => [
      {
        label: privileged ? "Peserta Tercatat" : "Total Presensi",
        value: String(privileged ? attendanceSummary.uniqueUsers : records.length),
        hint: privileged
          ? `${records.length} record keseluruhan`
          : "Rekap akun Anda",
      },
      {
        label: "Masuk Hari Ini",
        value: String(attendanceSummary.masukToday),
        hint: `Tanggal ${toWIBDateKey()}`,
      },
      {
        label: "Keluar Hari Ini",
        value: String(attendanceSummary.keluarToday),
        hint:
          attendanceSummary.pendingCheckout > 0
            ? `${attendanceSummary.pendingCheckout} masih aktif`
            : "Semua lengkap",
      },
      {
        label: "Dinas Luar",
        value: String(attendanceSummary.dinasLuarToday),
        hint: "Tercatat hari ini",
      },
    ],
    [attendanceSummary, privileged, records.length],
  );

  const recentRecords = useMemo(() => records.slice(0, 6), [records]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/login");
    }
  }, [loading, currentUser, router]);

  if (!currentUser || loading || loadingUser || loadingAttendance) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Memuat dashboard...</div>;
  }

  if (currentUser.email.toLowerCase() === "trial@trial.com") {
    return <TrialAttendanceTable />;
  }

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Selamat datang, {userInfo.name}</h1>
            <p className="text-sm text-slate-600">
              Anda login sebagai <span className="font-semibold uppercase">{userRole?.role || userInfo.role}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDemoMode ? <Badge variant="warning">Mode Demo</Badge> : <Badge variant="success">Mode Firebase</Badge>}
            <Badge variant="info">WIB</Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">{item.hint}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>Gunakan menu ini untuk akses fitur utama presensi.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/scanQR">
              <Button>Mulai Scan QR</Button>
            </Link>
            <Link href="/dashboard/presensi">
              <Button variant="outline">Lihat Rekap Presensi</Button>
            </Link>
            {privileged ? (
              <Link href="/dashboard/akun">
                <Button variant="outline">Kelola Akun</Button>
              </Link>
            ) : null}
            {privileged ? (
              <Link href="/dashboard/export-pdf">
                <Button variant="outline">Export PDF Multi-User</Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Hari Ini</CardTitle>
            <CardDescription>Data diambil langsung dari RTDB attendance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              Presensi masuk: <span className="font-semibold text-slate-800">{attendanceSummary.masukToday}</span>
            </p>
            <p>
              Presensi keluar: <span className="font-semibold text-slate-800">{attendanceSummary.keluarToday}</span>
            </p>
            <p>
              Dinas luar: <span className="font-semibold text-slate-800">{attendanceSummary.dinasLuarToday}</span>
            </p>
            <p>
              Menunggu checkout: <span className="font-semibold text-slate-800">{attendanceSummary.pendingCheckout}</span>
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Presensi Terbaru</CardTitle>
            <CardDescription>
              {privileged
                ? "Menampilkan data seluruh pengguna berdasarkan waktu terbaru."
                : "Menampilkan data presensi akun Anda terbaru."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada data presensi.</p>
            ) : (
              <div className="space-y-3">
                {recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {record.name || record.email}
                      </p>
                      <div className="flex items-center gap-2">
                        {record.keluar ? (
                          <Badge variant="success">Lengkap</Badge>
                        ) : (
                          <Badge variant="warning">Menunggu Keluar</Badge>
                        )}
                        <span className="text-xs text-slate-500">{record.date}</span>
                      </div>
                    </div>
                    {privileged ? (
                      <p className="mt-1 text-xs text-slate-500">{record.email}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>Masuk: {record.masuk ? `${formatTimestampWIB(record.masuk)} WIB` : "-"}</span>
                      <span>Keluar: {record.keluar ? `${formatTimestampWIB(record.keluar)} WIB` : "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
