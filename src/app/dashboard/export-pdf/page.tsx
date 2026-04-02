"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import useAttendanceRecords from "@/hooks/useAttendanceRecords";
import { useAuth } from "@/lib/contexts/AuthContext";
import { exportAttendancePdf } from "@/lib/exportAttendancePdf";
import { toast } from "sonner";

export default function ExportPdfPage() {
  const { currentUser, userRole } = useAuth();
  const { records, loadingAttendance } = useAttendanceRecords(currentUser, userRole?.role);

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchName, setSearchName] = useState("");
  const [exporting, setExporting] = useState(false);

  const uniqueUsers = useMemo(() => {
    const deduped = new Map<string, { userId: string; name: string; email: string }>();

    for (const record of records) {
      if (!record.userId) {
        continue;
      }

      if (!deduped.has(record.userId)) {
        deduped.set(record.userId, {
          userId: record.userId,
          name: record.name || "-",
          email: record.email || "-",
        });
      }
    }

    return Array.from(deduped.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [records]);

  const filteredUsers = useMemo(() => {
    const keyword = searchName.trim().toLowerCase();
    if (!keyword) {
      return uniqueUsers;
    }

    return uniqueUsers.filter((user) =>
      [user.name, user.email].join(" ").toLowerCase().includes(keyword),
    );
  }, [searchName, uniqueUsers]);

  const exportRecords = useMemo(() => {
    return records.filter((record) => {
      if (selectedUsers.length > 0 && !selectedUsers.includes(record.userId)) {
        return false;
      }
      if (dateStart && record.date < dateStart) {
        return false;
      }
      if (dateEnd && record.date > dateEnd) {
        return false;
      }
      return true;
    });
  }, [records, selectedUsers, dateStart, dateEnd]);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleExport = async () => {
    if (exportRecords.length === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }

    setExporting(true);
    try {
      await exportAttendancePdf(exportRecords, {
        includeIdentity: true,
        dateStart,
        dateEnd,
        exportedBy: userRole?.roleData?.name
          ? String(userRole.roleData.name)
          : currentUser?.displayName || currentUser?.email,
      });
      toast.success("Export PDF multi-user berhasil diproses.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengekspor PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <RoleProtectedRoute allowedRoles={["sadmin", "admin"]}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Export PDF Multi-User</CardTitle>
            <CardDescription>
              Pilih user dan periode, lalu ekspor rekap presensi dalam satu file PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">User Tersedia</p>
              <p className="text-xl font-semibold text-slate-800">{uniqueUsers.length}</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-600">User Terpilih</p>
              <p className="text-xl font-semibold text-blue-700">
                {selectedUsers.length || uniqueUsers.length}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-600">Record Terekspor</p>
              <p className="text-xl font-semibold text-emerald-700">{exportRecords.length}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-600">Status</p>
              <p className="text-xl font-semibold text-amber-700">
                {loadingAttendance ? "Loading" : "Ready"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter Periode</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Tanggal Mulai"
              type="date"
              value={dateStart}
              onChange={(event) => setDateStart(event.target.value)}
            />
            <Input
              label="Tanggal Akhir"
              type="date"
              value={dateEnd}
              onChange={(event) => setDateEnd(event.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pilih User</CardTitle>
            <CardDescription>
              Jika tidak memilih user, semua user akan otomatis ikut diekspor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Cari User"
              placeholder="Cari nama atau email"
              value={searchName}
              onChange={(event) => setSearchName(event.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedUsers(uniqueUsers.map((user) => user.userId))}
              >
                Pilih Semua
              </Button>
              <Button variant="outline" onClick={() => setSelectedUsers([])}>
                Clear
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => {
                const checked = selectedUsers.includes(user.userId);
                return (
                  <label
                    key={user.userId}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleUser(user.userId)}
                      className="mt-1"
                    />
                    <span className="text-sm text-slate-700">
                      <span className="block font-medium">{user.name}</span>
                      <span className="block text-xs text-slate-500">{user.email}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2">
                <Badge variant="info">{exportRecords.length} record siap export</Badge>
              </div>
              <Button onClick={handleExport} isLoading={exporting}>
                Export PDF Multi-User
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleProtectedRoute>
  );
}
