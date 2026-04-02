"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { UserRoleType } from "@/types/auth";

interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  visibleForRoles?: UserRoleType[];
}

const mobileNavItems: MobileNavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
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
    label: "Presensi",
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
    label: "Scan",
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
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { userRole } = useAuth();

  const visibleItems = mobileNavItems.filter((item) => {
    if (!item.visibleForRoles) {
      return true;
    }

    return userRole?.role ? item.visibleForRoles.includes(userRole.role) : false;
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-2 py-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[70px] flex-col items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-[#E6F0FA] text-[#00509D]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
