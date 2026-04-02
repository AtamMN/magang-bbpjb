import { get, ref, remove, update } from "firebase/database";
import { db } from "@/lib/firebase/firebase";
import { formatTime, toWIBDateKey } from "@/lib/utils";

export interface AttendanceRecord {
  userId: string;
  name: string;
  email: string;
  masuk?: string;
  keluar?: string;
  keteranganMasuk?: string;
  keteranganKeluar?: string;
}

export interface AttendanceUpdatePayload {
  name?: string;
  email?: string;
  masuk?: string | null;
  keluar?: string | null;
  keteranganMasuk?: string | null;
  keteranganKeluar?: string | null;
}

function getTimestampWIB() {
  const now = new Date();
  const wibOffset = 7 * 60;
  const localOffset = now.getTimezoneOffset();
  const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60000);
  return wibTime.toISOString();
}

export function formatTimestampWIB(timestamp: string) {
  return formatTime(new Date(timestamp));
}

export async function checkTodayAttendance(userId: string): Promise<{
  exists: boolean;
  data: AttendanceRecord | null;
  reason?: string;
}> {
  if (!db) {
    return { exists: false, data: null, reason: "Database belum dikonfigurasi." };
  }

  try {
    const today = toWIBDateKey();
    const attendanceRef = ref(db, `attendance/${userId}/${today}`);
    const snapshot = await get(attendanceRef);

    if (snapshot.exists()) {
      return {
        exists: true,
        data: snapshot.val() as AttendanceRecord,
      };
    }

    return { exists: false, data: null };
  } catch (error) {
    console.error("Error checking attendance:", error);
    return { exists: false, data: null, reason: "Gagal membaca data presensi." };
  }
}

export async function saveAttendance(
  userId: string,
  userName: string,
  userEmail: string,
  type: "masuk" | "keluar",
  keterangan = "",
): Promise<{ success: boolean; timestamp?: string; reason?: string }> {
  if (!db) {
    return { success: false, reason: "Database belum dikonfigurasi." };
  }

  try {
    const timestamp = getTimestampWIB();
    const today = toWIBDateKey();
    const attendancePath = `attendance/${userId}/${today}`;

    const updates: Record<string, string> = {
      [`${attendancePath}/userId`]: userId,
      [`${attendancePath}/name`]: userName,
      [`${attendancePath}/email`]: userEmail,
    };

    if (type === "masuk") {
      updates[`${attendancePath}/masuk`] = timestamp;
      if (keterangan) {
        updates[`${attendancePath}/keteranganMasuk`] = keterangan;
      }
    } else {
      updates[`${attendancePath}/keluar`] = timestamp;
      if (keterangan) {
        updates[`${attendancePath}/keteranganKeluar`] = keterangan;
      }
    }

    await update(ref(db), updates);

    return {
      success: true,
      timestamp,
    };
  } catch (error) {
    console.error("Error saving attendance:", error);
    return {
      success: false,
      reason: "Gagal menyimpan presensi.",
    };
  }
}

export async function updateAttendanceRecord(
  userId: string,
  date: string,
  payload: AttendanceUpdatePayload,
): Promise<{ success: boolean; reason?: string }> {
  if (!db) {
    return { success: false, reason: "Database belum dikonfigurasi." };
  }

  try {
    const attendanceRef = ref(db, `attendance/${userId}/${date}`);
    await update(attendanceRef, payload);
    return { success: true };
  } catch (error) {
    console.error("Error updating attendance:", error);
    return { success: false, reason: "Gagal memperbarui data presensi." };
  }
}

export async function deleteAttendanceRecord(
  userId: string,
  date: string,
): Promise<{ success: boolean; reason?: string }> {
  if (!db) {
    return { success: false, reason: "Database belum dikonfigurasi." };
  }

  try {
    await remove(ref(db, `attendance/${userId}/${date}`));
    return { success: true };
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return { success: false, reason: "Gagal menghapus data presensi." };
  }
}
