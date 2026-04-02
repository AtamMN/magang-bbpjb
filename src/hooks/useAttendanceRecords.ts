"use client";

import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase/firebase";
import type { AttendanceRecord } from "@/lib/firebase/attendance";
import { toWIBDateKey } from "@/lib/utils";
import type { AppUser, UserRoleType } from "@/types/auth";

export interface AttendanceViewRecord extends AttendanceRecord {
  id: string;
  date: string;
}

type AttendanceByDate = Record<string, AttendanceRecord>;
type AttendanceByUser = Record<string, AttendanceByDate>;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function sortAttendance(records: AttendanceViewRecord[]) {
  return records.sort((left, right) => {
    const dateDelta = right.date.localeCompare(left.date);
    if (dateDelta !== 0) {
      return dateDelta;
    }

    const rightTime = right.masuk || right.keluar || "";
    const leftTime = left.masuk || left.keluar || "";
    return rightTime.localeCompare(leftTime);
  });
}

function normalizeRecord(
  userId: string,
  date: string,
  rawRecord: AttendanceRecord | null | undefined,
): AttendanceViewRecord {
  const record = rawRecord || ({} as AttendanceRecord);
  return {
    id: `${record.userId || userId}-${date}`,
    date,
    userId: record.userId || userId,
    name: record.name || "-",
    email: record.email || "-",
    masuk: record.masuk,
    keluar: record.keluar,
    keteranganMasuk: record.keteranganMasuk,
    keteranganKeluar: record.keteranganKeluar,
  };
}

function normalizeAllAttendance(rawData: AttendanceByUser | null | undefined): AttendanceViewRecord[] {
  const mappedRecords: AttendanceViewRecord[] = [];

  for (const [userId, attendanceByDate] of Object.entries(rawData || {})) {
    for (const [date, rawRecord] of Object.entries(attendanceByDate || {})) {
      mappedRecords.push(normalizeRecord(userId, date, rawRecord));
    }
  }

  return sortAttendance(mappedRecords);
}

function normalizeSingleUserAttendance(
  userId: string,
  rawData: AttendanceByDate | null | undefined,
): AttendanceViewRecord[] {
  const mappedRecords: AttendanceViewRecord[] = [];

  for (const [date, rawRecord] of Object.entries(rawData || {})) {
    mappedRecords.push(normalizeRecord(userId, date, rawRecord));
  }

  return sortAttendance(mappedRecords);
}

function isPrivilegedRole(role: UserRoleType | null | undefined) {
  return role === "sadmin" || role === "admin";
}

function buildDemoRecords(currentUser: AppUser): AttendanceViewRecord[] {
  const now = new Date();
  const today = toWIBDateKey(now);
  const yesterday = toWIBDateKey(new Date(now.getTime() - ONE_DAY_MS));

  return sortAttendance([
    {
      id: `${currentUser.uid}-${today}`,
      date: today,
      userId: currentUser.uid,
      name: currentUser.displayName || "Demo User",
      email: currentUser.email,
      masuk: `${today}T08:02:10.000Z`,
      keluar: `${today}T16:03:45.000Z`,
      keteranganMasuk: "Presensi demo",
      keteranganKeluar: "Selesai kegiatan demo",
    },
    {
      id: `${currentUser.uid}-${yesterday}`,
      date: yesterday,
      userId: currentUser.uid,
      name: currentUser.displayName || "Demo User",
      email: currentUser.email,
      masuk: `${yesterday}T08:17:22.000Z`,
      keluar: `${yesterday}T16:11:03.000Z`,
      keteranganMasuk: "[Dinas Luar] Monitoring mitra",
      keteranganKeluar: "[Dinas Luar] Kembali ke kantor",
    },
  ]);
}

export default function useAttendanceRecords(
  currentUser: AppUser | null,
  role: UserRoleType | null | undefined,
) {
  const [liveRecords, setLiveRecords] = useState<AttendanceViewRecord[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string>("");

  const privileged = isPrivilegedRole(role);
  const expectedKey = currentUser?.uid
    ? `${currentUser.uid}:${privileged ? "all" : "self"}`
    : "";

  useEffect(() => {
    if (!currentUser?.uid || !db) {
      return;
    }

    const attendanceRef = ref(
      db,
      privileged ? "attendance" : `attendance/${currentUser.uid}`,
    );

    const unsubscribe = onValue(
      attendanceRef,
      (snapshot) => {
        const snapshotValue = snapshot.val();
        const nextRecords = privileged
          ? normalizeAllAttendance(snapshotValue as AttendanceByUser | null)
          : normalizeSingleUserAttendance(
              currentUser.uid,
              snapshotValue as AttendanceByDate | null,
            );

        setLiveRecords(nextRecords);
        setHydratedKey(expectedKey);
      },
      () => {
        setLiveRecords([]);
        setHydratedKey(expectedKey);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, expectedKey, privileged]);

  const demoRecords = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    return buildDemoRecords(currentUser);
  }, [currentUser]);

  const loadingAttendance = Boolean(db && expectedKey && hydratedKey !== expectedKey);
  const records = db ? liveRecords : demoRecords;

  return {
    records,
    loadingAttendance,
    privileged,
  };
}
