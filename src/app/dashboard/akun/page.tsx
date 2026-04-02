"use client";

import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import AccountsTable from "@/components/dashboard/AccountsTable";

export default function AccountPage() {
  return (
    <RoleProtectedRoute allowedRoles={["sadmin", "admin"]}>
      <AccountsTable />
    </RoleProtectedRoute>
  );
}
