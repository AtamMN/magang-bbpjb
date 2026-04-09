"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, SimpleModal, Textarea } from "@/components/ui";
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

function findRearCameraDevice(devices: MediaDeviceInfo[]): MediaDeviceInfo | undefined {
  const rearCameraPattern = /back|rear|environment|belakang|world|ultra|wide/i;
  return devices.find((device) => rearCameraPattern.test(device.label || ""));
}

export default function ScanQrPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, userRole, loading } = useAuth();
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);
  const cameraCardRef = useRef<HTMLDivElement | null>(null);
  const scanLockRef = useRef(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showDinasLuarForm, setShowDinasLuarForm] = useState(false);
  const [dinasLuarType, setDinasLuarType] = useState<"masuk" | "keluar">("masuk");
  const [keterangan, setKeterangan] = useState("");
  const [debugScanPayload, setDebugScanPayload] = useState("");
  const [debugScannedAt, setDebugScannedAt] = useState("");
  const [message, setMessage] = useState<ScannerMessage>({
    type: "info",
    text: "Tekan Mulai Scan Presensi untuk memulai pemindaian.",
  });

  const debugMode = useMemo(() => {
    const value = searchParams.get("debug");
    return value === "1" || value === "true";
  }, [searchParams]);

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

        // Keep facingMode fallback as default unless a rear camera can be identified.
        if (videoDevices.length && !selectedDeviceId) {
          const rearCamera = findRearCameraDevice(videoDevices);
          if (rearCamera?.deviceId) {
            setSelectedDeviceId(rearCamera.deviceId);
          }
        }
      } catch (error) {
        console.error("Failed to enumerate camera devices", error);
        setMessage({ type: "error", text: "Tidak bisa membaca daftar kamera." });
      }
    }

    getVideoDevices();
  }, [scanning, selectedDeviceId]);

  useEffect(() => {
    if (scanning && cameraCardRef.current) {
      cameraCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [scanning]);

  const messageStyle = useMemo(() => {
    if (message.type === "success") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (message.type === "error") {
      return "border-red-200 bg-red-50 text-red-700";
    }
    return "border-blue-200 bg-blue-50 text-blue-700";
  }, [message.type]);

  const stopCameraStream = useCallback(() => {
    const container = scannerContainerRef.current;
    if (!container) {
      return;
    }

    const videos = container.querySelectorAll("video");
    videos.forEach((video) => {
      const stream = video.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      video.srcObject = null;
    });
  }, []);

  const stopScanningSession = useCallback(() => {
    stopCameraStream();
    setProcessing(false);
    setScanning(false);
    setSelectedDeviceId("");
    setDevices([]);
  }, [stopCameraStream]);

  const handleStopScanning = useCallback(() => {
    scanLockRef.current = false;
    stopScanningSession();
  }, [stopScanningSession]);

  useEffect(() => {
    return () => {
      scanLockRef.current = false;
      stopCameraStream();
    };
  }, [stopCameraStream]);

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
  };

  const handleScan = async (result: unknown) => {
    if (processing || scanLockRef.current) {
      return;
    }

    const text = extractScanText(result);
    if (!text) {
      return;
    }

    if (debugMode) {
      setDebugScanPayload(text);
      setDebugScannedAt(new Date().toISOString());
    }

    scanLockRef.current = true;
    setProcessing(true);

    try {
      if (text !== "PRESENSI_2025" && text !== "KELUAR_2025") {
        setMessage({ type: "error", text: "QR tidak valid. Gunakan QR resmi Presensi." });
        return;
      }

      await processAttendance(text as "PRESENSI_2025" | "KELUAR_2025");
    } catch (error) {
      console.error("Failed to process scan", error);
      setMessage({ type: "error", text: "Terjadi kesalahan saat memproses scan." });
    } finally {
      scanLockRef.current = false;
      stopScanningSession();
    }
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
    setDinasLuarType("masuk");
    setShowDinasLuarForm(false);
    setProcessing(false);
  };

  if (!currentUser) {
    return null;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6">
      <Card variant="elevated">
        <CardHeader>
          <div className="mb-4 flex items-start justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-1.5 border-slate-200 text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            <Badge variant="info">WIB</Badge>
          </div>
          <div>
            <CardTitle>Scan QR Presensi</CardTitle>
            <CardDescription>
              Login sebagai <strong>{currentUser.email}</strong> ({userRole?.role || "guest"}).
            </CardDescription>
          </div>
          <CardDescription className="mt-2">
            Gunakan scan QR untuk presensi normal atau form dinas luar bila tanpa QR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-lg border px-4 py-3 text-sm ${messageStyle}`}>{message.text}</div>

          {debugMode ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Mode Debug Aktif</p>
              <p className="mt-1 text-xs text-amber-800">
                Isi QR terakhir: {debugScanPayload || "Belum ada hasil scan."}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Waktu scan: {debugScannedAt ? new Date(debugScannedAt).toLocaleString("id-ID") : "-"}
              </p>
            </div>
          ) : null}

          {scanning ? (
            <div ref={cameraCardRef} className="space-y-4 rounded-xl border border-slate-200 p-4">
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

              <div ref={scannerContainerRef} className="relative mx-auto h-[360px] w-full max-w-md overflow-hidden rounded-xl border border-slate-200">
                <QrScanner
                  key={`${scanning}-${selectedDeviceId}`}
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
                <Button variant="destructive" onClick={handleStopScanning} disabled={processing}>
                  Berhenti Scan
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleStopScanning();
                    router.push("/dashboard");
                  }}
                >
                  Kembali Dashboard
                </Button>
              </div>
            </div>
          ) : null}

          {!scanning ? (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  scanLockRef.current = false;
                  setProcessing(false);
                  setMessage({ type: "info", text: "Mode scan aktif. Arahkan kamera ke QR." });
                  setScanning(true);
                }}
                disabled={processing}
              >
                Mulai Scan Presensi
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDinasLuarForm(true)}
                disabled={processing}
              >
                Presensi Dinas Luar
              </Button>
            </div>
          ) : null}

          <SimpleModal
            open={showDinasLuarForm}
            title="Form Presensi Dinas Luar"
            onClose={() => {
              setShowDinasLuarForm(false);
              setKeterangan("");
              setDinasLuarType("masuk");
            }}
            actions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDinasLuarForm(false);
                    setKeterangan("");
                    setDinasLuarType("masuk");
                  }}
                  disabled={processing}
                >
                  Batal
                </Button>
                <Button onClick={handleSubmitDinasLuar} disabled={processing}>
                  Submit Dinas Luar
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
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
            </div>
          </SimpleModal>
        </CardContent>
      </Card>
    </main>
  );
}
