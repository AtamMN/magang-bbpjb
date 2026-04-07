"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { formatDate } from "@/lib/utils";

export function DashboardHeader() {
  const router = useRouter();
  const { currentUser, userRole, logout } = useAuth();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = currentUser?.displayName || userRole?.roleData?.name || "Pengguna";
  const displayEmail = currentUser?.email || "-";
  const roleLabel = userRole?.role || "guest";
  const profileInitial = String(displayName || "P").trim().charAt(0).toUpperCase() || "P";

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
      setIsProfileOpen(false);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="sm:hidden">
          <p className="text-sm font-semibold text-slate-900">Dashboard Presensi</p>
          <p className="text-xs text-slate-500">Zona waktu WIB</p>
        </div>

        <div className="relative hidden max-w-xl flex-1 sm:block">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Cari peserta, tanggal, atau catatan..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00509D]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationOpen((prev) => !prev);
                setIsProfileOpen(false);
              }}
              className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {isNotificationOpen ? (
              <div className="absolute right-0 top-12 z-20 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 p-4">
                  <h3 className="font-semibold text-slate-900">Notifikasi</h3>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <div className="border-b border-slate-100 p-4 hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">Presensi masuk berhasil diproses</p>
                    <p className="mt-1 text-xs text-slate-500">Baru saja</p>
                  </div>
                  <div className="border-b border-slate-100 p-4 hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">2 catatan dinas luar menunggu verifikasi</p>
                    <p className="mt-1 text-xs text-slate-500">45 menit lalu</p>
                  </div>
                  <div className="p-4 hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">Pengingat rekap mingguan tersedia</p>
                    <p className="mt-1 text-xs text-slate-500">Kemarin</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative lg:hidden">
            <button
              onClick={() => {
                setIsProfileOpen((prev) => !prev);
                setIsNotificationOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Buka menu profil"
            >
              {profileInitial}
            </button>

            {isProfileOpen ? (
              <div className="absolute right-0 top-12 z-20 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{displayEmail}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-[#00509D]">{roleLabel}</p>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="mt-3 flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? "Keluar..." : "Keluar"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">{formatDate(new Date())}</p>
            <p className="text-xs text-slate-500">Zona waktu WIB</p>
          </div>
        </div>
      </div>
    </header>
  );
}
