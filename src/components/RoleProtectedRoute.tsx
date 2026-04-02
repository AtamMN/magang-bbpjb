"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { UserRoleType } from "@/types/auth";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRoleType[];
}

export default function RoleProtectedRoute({
  children,
  allowedRoles,
}: RoleProtectedRouteProps) {
  const router = useRouter();
  const { currentUser, userRole, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (!userRole) {
      router.push("/unauthorized");
      return;
    }

    if (!allowedRoles.includes(userRole.role)) {
      router.push("/unauthorized");
    }
  }, [loading, currentUser, userRole, allowedRoles, router]);

  if (loading || !currentUser || !userRole) {
    return null;
  }

  if (!allowedRoles.includes(userRole.role)) {
    return null;
  }

  return <>{children}</>;
}
