import { DashboardHeader, MobileBottomNav, Sidebar } from "@/components/dashboard";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleProtectedRoute allowedRoles={["sadmin", "admin", "user", "intern", "mentor"]}>
      <div className="flex min-h-screen bg-[#eef3f8]">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <DashboardHeader />
          <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
        </div>
        <MobileBottomNav />
      </div>
    </RoleProtectedRoute>
  );
}
