"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Textarea } from "@/components/ui";
import { useAuth } from "@/lib/contexts/AuthContext";
import {
  checkTodayAttendance,
  formatTimestampWIB,
  saveAttendance,
} from "@/lib/firebase/attendance";

const QrScanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((module) => module.Scanner),
  { ssr: false },
);

interface ScannerMessage {
  type: "success" | "error" | "info";
  text: string;
}

function extractScanText(result: unknown): string {
  if (Array.isArray(result) && result[0] && typeof result[0] === "object") {
    const candidate = result[0] as { rawValue?: string };
    return candidate.rawValue || "";
  }

  if (typeof result === "string") {
    return result;
  }

  if (result && typeof result === "object") {
    const candidate = result as { data?: string; text?: string };
    return candidate.data || candidate.text || "";
  }

  return "";
}

export default function ScanQrPage() {
  const router = useRouter();
  const { currentUser, userRole, loading } = useAuth();

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const [showDinasLuarForm, setShowDinasLuarForm] = useState(false);
  const [dinasLuarType, setDinasLuarType] = useState<"masuk" | "keluar">("masuk");
  const [keterangan, setKeterangan] = useState("");
  const [message, setMessage] = useState<ScannerMessage>({
    type: "info",
    text: "Siapkan QR resmi PRESENSI_2025 atau KELUAR_2025.",
  });

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/login");
    }
  }, [loading, currentUser, router]);

  useEffect(() => {
    if (!scanning) {
      return;
    }

    async function getVideoDevices() {
      if (!navigator?.mediaDevices?.enumerateDevices) {
        setMessage({
          type: "error",
          text: "Browser tidak mendukung akses kamera.",
        });
        return;
      }

      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices.filter((device) => device.kind === "videoinput");
        setDevices(videoDevices);
        if (videoDevices.length && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Failed to enumerate camera devices", error);
        setMessage({ type: "error", text: "Tidak bisa membaca daftar kamera." });
      }
    }

    getVideoDevices();
  }, [scanning, selectedDeviceId]);

  const messageStyle = useMemo(() => {
    if (message.type === "success") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (message.type === "error") {
      return "border-red-200 bg-red-50 text-red-700";
    }
    return "border-blue-200 bg-blue-50 text-blue-700";
  }, [message.type]);

  const processAttendance = async (
    qrType: "PRESENSI_2025" | "KELUAR_2025",
    note = "",
  ) => {
    if (!currentUser || !userRole) {
      setMessage({ type: "error", text: "Anda harus login terlebih dahulu." });
      return;
    }

    const checkResult = await checkTodayAttendance(currentUser.uid);
    const userName =
      String(userRole.roleData?.name || currentUser.displayName || currentUser.email);

    if (qrType === "PRESENSI_2025") {
      if (checkResult.exists && checkResult.data?.masuk) {
        setMessage({
          type: "error",
          text: `Anda sudah presensi masuk hari ini pada ${formatTimestampWIB(checkResult.data.masuk)} WIB.`,
        });
        return;
      }

      const saveResult = await saveAttendance(
        currentUser.uid,
        userName,
        currentUser.email,
        "masuk",
        note,
      );

      if (!saveResult.success || !saveResult.timestamp) {
        setMessage({ type: "error", text: saveResult.reason || "Gagal menyimpan presensi masuk." });
        return;
      }

      setMessage({
        type: "success",
        text: `Presensi MASUK berhasil pada ${formatTimestampWIB(saveResult.timestamp)} WIB.`,
      });
      setScanning(false);
      return;
    }

    if (!checkResult.exists || !checkResult.data?.masuk) {
      setMessage({ type: "error", text: "Anda belum presensi masuk hari ini." });
      return;
    }

    if (checkResult.data?.keluar) {
      setMessage({
        type: "error",
        text: `Anda sudah presensi keluar pada ${formatTimestampWIB(checkResult.data.keluar)} WIB.`,
      });
      return;
    }

    const saveResult = await saveAttendance(
      currentUser.uid,
      userName,
      currentUser.email,
      "keluar",
      note,
    );

    if (!saveResult.success || !saveResult.timestamp) {
      setMessage({ type: "error", text: saveResult.reason || "Gagal menyimpan presensi keluar." });
      return;
    }

    setMessage({
      type: "success",
      text: `Presensi KELUAR berhasil pada ${formatTimestampWIB(saveResult.timestamp)} WIB.`,
    });
    setScanning(false);
  };

  const handleScan = async (result: unknown) => {
    if (processing) {
      return;
    }

    const text = extractScanText(result);
    if (!text) {
      return;
    }

    if (text === lastScanned) {
      return;
    }

    if (text !== "PRESENSI_2025" && text !== "KELUAR_2025") {
      setMessage({ type: "error", text: "QR tidak valid. Gunakan QR resmi Presensi." });
      setScanning(false);
      return;
    }

    setProcessing(true);
    setLastScanned(text);

    await processAttendance(text as "PRESENSI_2025" | "KELUAR_2025");

    window.setTimeout(() => {
      setLastScanned("");
      setProcessing(false);
    }, 1800);
  };

  const handleSubmitDinasLuar = async () => {
    if (!keterangan.trim()) {
      setMessage({ type: "error", text: "Keterangan dinas luar wajib diisi." });
      return;
    }

    setProcessing(true);
    const qrType = dinasLuarType === "masuk" ? "PRESENSI_2025" : "KELUAR_2025";
    await processAttendance(qrType, `[Dinas Luar] ${keterangan.trim()}`);
    setKeterangan("");
    setShowDinasLuarForm(false);
    setProcessing(false);
  };

  if (!currentUser) {
    return null;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Scan QR Presensi</CardTitle>
              <CardDescription>
                Login sebagai <strong>{currentUser.email}</strong> ({userRole?.role || "guest"}).
              </CardDescription>
            </div>
            <Badge variant="info">WIB</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`rounded-lg border px-4 py-3 text-sm ${messageStyle}`}>{message.text}</div>
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Kontrol Presensi</CardTitle>
          <CardDescription>
            Gunakan scan QR untuk presensi normal atau form dinas luar bila tanpa QR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setMessage({ type: "info", text: "Mode scan aktif. Arahkan kamera ke QR." });
                setScanning(true);
              }}
              disabled={processing}
            >
              Mulai Scan Presensi
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDinasLuarForm((prev) => !prev)}
              disabled={processing}
            >
              {showDinasLuarForm ? "Tutup Form Dinas Luar" : "Presensi Dinas Luar"}
            </Button>
          </div>

          {showDinasLuarForm ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Form Dinas Luar</p>
              <div className="flex gap-4 text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={dinasLuarType === "masuk"}
                    onChange={() => setDinasLuarType("masuk")}
                  />
                  Masuk
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={dinasLuarType === "keluar"}
                    onChange={() => setDinasLuarType("keluar")}
                  />
                  Keluar
                </label>
              </div>
              <Textarea
                label="Keterangan"
                placeholder="Contoh: Kegiatan monitoring di kantor mitra."
                value={keterangan}
                onChange={(event) => setKeterangan(event.target.value)}
              />
              <Button onClick={handleSubmitDinasLuar} disabled={processing}>
                Submit Dinas Luar
              </Button>
            </div>
          ) : null}

          {scanning ? (
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Pilih Kamera</label>
                <select
                  value={selectedDeviceId}
                  onChange={(event) => setSelectedDeviceId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00509D] md:max-w-md"
                >
                  {devices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Kamera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative mx-auto h-[360px] w-full max-w-md overflow-hidden rounded-xl border border-slate-200">
                <QrScanner
                  onScan={handleScan}
                  onError={(error: unknown) => console.error("Scan error:", error)}
                  constraints={
                    selectedDeviceId
                      ? { deviceId: { exact: selectedDeviceId } }
                      : { facingMode: "environment" }
                  }
                  styles={{ container: { width: "100%", height: "100%" } }}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="destructive" onClick={() => setScanning(false)} disabled={processing}>
                  Berhenti Scan
                </Button>
                <Button variant="ghost" onClick={() => router.push("/dashboard")}>Kembali Dashboard</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
