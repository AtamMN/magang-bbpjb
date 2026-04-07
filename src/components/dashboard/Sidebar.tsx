"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { UserRoleType } from "@/types/auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  visibleForRoles?: UserRoleType[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/presensi",
    label: "Data Presensi",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    href: "/scanQR",
    label: "Scan QR",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 7V4h3m10 0h3v3m0 10v3h-3M7 20H4v-3m4-8h8m-8 4h8"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/akun",
    label: "Akun",
    visibleForRoles: ["sadmin", "admin"],
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5.121 17.804A10.967 10.967 0 0112 15c2.38 0 4.584.757 6.379 2.04M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/export-pdf",
    label: "Export PDF",
    visibleForRoles: ["sadmin", "admin"],
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m-9 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, userRole, logout } = useAuth();
  const activeRole = userRole?.role;

  const visibleNavItems = navItems.filter((item) => {
    if (!item.visibleForRoles) {
      return true;
    }
    return activeRole ? item.visibleForRoles.includes(activeRole) : false;
  });

  return (
    <aside className="hidden w-72 h-screen flex-col bg-[#00509D] text-white overflow-hidden lg:flex">
      <div className="border-b border-white/10 p-6 flex-shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FDC500] text-lg font-bold text-[#00509D]">
            M
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Magang BBPJB</h1>
            <p className="text-xs text-white/70">Presensi & Dashboard</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
                isActive
                  ? "bg-white text-[#00509D]"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 flex-shrink-0">
        <div className="mb-3 rounded-lg bg-white/10 p-3">
          <p className="truncate text-sm font-semibold">{currentUser?.displayName || "Pengguna"}</p>
          <p className="truncate text-xs text-white/70">{currentUser?.email || "-"}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-[#FDC500]">{userRole?.role || "guest"}</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className="flex w-full items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
        >
          Keluar
        </button>
      </div>
    </aside>
  );
}
