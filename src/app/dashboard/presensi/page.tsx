"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  SimpleModal,
} from "@/components/ui";
import { useAuth } from "@/lib/contexts/AuthContext";
import useAttendanceRecords from "@/hooks/useAttendanceRecords";
import {
  deleteAttendanceRecord,
  formatTimestampWIB,
  updateAttendanceRecord,
} from "@/lib/firebase/attendance";
import { exportAttendancePdf } from "@/lib/exportAttendancePdf";
import { toast } from "sonner";
import type { AttendanceViewRecord } from "@/hooks/useAttendanceRecords";

type SortBy = "date" | "name" | "email" | "masuk" | "keluar" | "status";
type SortOrder = "asc" | "desc";

function toDateTimeLocalInput(iso?: string) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toIsoOrNull(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function compareStrings(left: string, right: string, sortOrder: SortOrder) {
  return sortOrder === "asc"
    ? left.localeCompare(right)
    : right.localeCompare(left);
}

export default function PresensiPage() {
  const { currentUser, userRole } = useAuth();
  const { records, loadingAttendance, privileged } = useAttendanceRecords(
    currentUser,
    userRole?.role,
  );

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [exporting, setExporting] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceViewRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    masuk: "",
    keluar: "",
    keteranganMasuk: "",
    keteranganKeluar: "",
  });

  const filteredRecords = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      if (dateStart && record.date < dateStart) {
        return false;
      }
      if (dateEnd && record.date > dateEnd) {
        return false;
      }

      if (keyword) {
        const searchableText = [
          record.date,
          record.name,
          record.email,
          record.keteranganMasuk,
          record.keteranganKeluar,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(keyword)) {
          return false;
        }
      }

      return true;
    });
  }, [records, dateEnd, dateStart, searchTerm]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((left, right) => {
      if (sortBy === "date") {
        return compareStrings(left.date, right.date, sortOrder);
      }

      if (sortBy === "name") {
        return compareStrings(left.name || "", right.name || "", sortOrder);
      }

      if (sortBy === "email") {
        return compareStrings(left.email || "", right.email || "", sortOrder);
      }

      if (sortBy === "status") {
        const leftStatus = left.keluar ? "lengkap" : "pending";
        const rightStatus = right.keluar ? "lengkap" : "pending";
        return compareStrings(leftStatus, rightStatus, sortOrder);
      }

      if (sortBy === "masuk") {
        return compareStrings(left.masuk || "", right.masuk || "", sortOrder);
      }

      return compareStrings(left.keluar || "", right.keluar || "", sortOrder);
    });
  }, [filteredRecords, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + itemsPerPage);

  const completeCount = useMemo(
    () => filteredRecords.filter((record) => Boolean(record.masuk && record.keluar)).length,
    [filteredRecords],
  );

  const pendingCount = filteredRecords.length - completeCount;

  const handleSortToggle = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortOrder("asc");
  };

  const handleOpenView = (record: AttendanceViewRecord) => {
    setSelectedRecord(record);
    setViewOpen(true);
  };

  const handleOpenEdit = (record: AttendanceViewRecord) => {
    setSelectedRecord(record);
    setEditForm({
      name: record.name || "",
      email: record.email || "",
      masuk: toDateTimeLocalInput(record.masuk),
      keluar: toDateTimeLocalInput(record.keluar),
      keteranganMasuk: record.keteranganMasuk || "",
      keteranganKeluar: record.keteranganKeluar || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRecord) {
      return;
    }

    const masukIso = toIsoOrNull(editForm.masuk);
    const keluarIso = toIsoOrNull(editForm.keluar);

    if (editForm.masuk && !masukIso) {
      toast.error("Format jam masuk tidak valid.");
      return;
    }

    if (editForm.keluar && !keluarIso) {
      toast.error("Format jam keluar tidak valid.");
      return;
    }

    if (masukIso && keluarIso && new Date(keluarIso).getTime() < new Date(masukIso).getTime()) {
      toast.error("Jam keluar tidak boleh lebih awal dari jam masuk.");
      return;
    }

    setSavingEdit(true);
    try {
      const result = await updateAttendanceRecord(selectedRecord.userId, selectedRecord.date, {
        name: editForm.name,
        email: editForm.email,
        masuk: masukIso,
        keluar: keluarIso,
        keteranganMasuk: editForm.keteranganMasuk || null,
        keteranganKeluar: editForm.keteranganKeluar || null,
      });

      if (!result.success) {
        throw new Error(result.reason || "Gagal memperbarui data.");
      }

      toast.success("Data presensi berhasil diperbarui.");
      setEditOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui data.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) {
      return;
    }

    setDeletingRecord(true);
    try {
      const result = await deleteAttendanceRecord(selectedRecord.userId, selectedRecord.date);
      if (!result.success) {
        throw new Error(result.reason || "Gagal menghapus data.");
      }

      toast.success("Data presensi berhasil dihapus.");
      setDeleteOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus data.");
    } finally {
      setDeletingRecord(false);
    }
  };

  const handleShareRecord = async (record: AttendanceViewRecord) => {
    const detailText = [
      `Nama: ${record.name || "-"}`,
      `Email: ${record.email || "-"}`,
      `Tanggal: ${record.date}`,
      `Masuk: ${record.masuk ? `${formatTimestampWIB(record.masuk)} WIB` : "-"}`,
      `Keluar: ${record.keluar ? `${formatTimestampWIB(record.keluar)} WIB` : "-"}`,
      `Keterangan Masuk: ${record.keteranganMasuk || "-"}`,
      `Keterangan Keluar: ${record.keteranganKeluar || "-"}`,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Detail Presensi",
          text: detailText,
        });
        return;
      }

      await navigator.clipboard.writeText(detailText);
      toast.success("Detail presensi disalin ke clipboard.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membagikan detail presensi.");
    }
  };

  const handleExportPdf = async () => {
    if (sortedRecords.length === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }

    setExporting(true);
    try {
      await exportAttendancePdf(sortedRecords, {
        includeIdentity: privileged,
        dateStart,
        dateEnd,
        exportedBy: userRole?.roleData?.name
          ? String(userRole.roleData.name)
          : currentUser?.displayName || currentUser?.email,
      });
      toast.success("Export PDF berhasil diproses.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengekspor PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Presensi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total Record</p>
            <p className="text-xl font-semibold text-slate-800">{filteredRecords.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-600">Lengkap</p>
            <p className="text-xl font-semibold text-emerald-700">{completeCount}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-600">Menunggu Keluar</p>
            <p className="text-xl font-semibold text-amber-700">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-600">Akses</p>
            <p className="text-xl font-semibold text-blue-700">
              {privileged ? "Semua User" : "Akun Sendiri"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filter, Pencarian, dan Export</CardTitle>
          <CardDescription>
            Gunakan pencarian nama/email/keterangan, filter tanggal, dan export PDF sesuai data aktif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <Input
              label="Pencarian"
              placeholder="Cari nama, email, atau keterangan"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
            />
            <Input
              label="Tanggal Mulai"
              type="date"
              value={dateStart}
              onChange={(event) => {
                setDateStart(event.target.value);
                setCurrentPage(1);
              }}
            />
            <Input
              label="Tanggal Akhir"
              type="date"
              value={dateEnd}
              onChange={(event) => {
                setDateEnd(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Items per halaman</label>
              <select
                value={itemsPerPage}
                onChange={(event) => {
                  setItemsPerPage(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00509D]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {privileged ? (
                <Link href="/dashboard/export-pdf">
                  <Button variant="outline">Multi-User Export</Button>
                </Link>
              ) : null}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setDateStart("");
                  setDateEnd("");
                  setCurrentPage(1);
                }}
              >
                Reset Filter
              </Button>
              <Button onClick={handleExportPdf} isLoading={exporting}>
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent>
          {loadingAttendance ? (
            <p className="py-6 text-sm text-slate-500">Memuat data presensi...</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {paginatedRecords.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Tidak ada data presensi pada filter saat ini.
                  </div>
                ) : (
                  paginatedRecords.map((record, index) => (
                    <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-slate-500">#{startIndex + index + 1}</p>
                          <p className="text-sm font-semibold text-slate-900">{record.date}</p>
                          {privileged ? (
                            <>
                              <p className="mt-1 text-sm font-medium text-slate-800">{record.name || "-"}</p>
                              <p className="text-xs text-slate-500">{record.email || "-"}</p>
                            </>
                          ) : null}
                        </div>
                        {record.keluar ? (
                          <Badge variant="success">Lengkap</Badge>
                        ) : (
                          <Badge variant="warning">Menunggu Keluar</Badge>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-700">
                        <p><strong>Masuk:</strong> {record.masuk ? `${formatTimestampWIB(record.masuk)} WIB` : "-"}</p>
                        <p><strong>Ket. Masuk:</strong> {record.keteranganMasuk || "-"}</p>
                        <p><strong>Keluar:</strong> {record.keluar ? `${formatTimestampWIB(record.keluar)} WIB` : "-"}</p>
                        <p><strong>Ket. Keluar:</strong> {record.keteranganKeluar || "-"}</p>
                      </div>

                      {privileged ? (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleOpenView(record)}>
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(record)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleShareRecord(record)}>
                            Share
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRecord(record);
                              setDeleteOpen(true);
                            }}
                          >
                            Hapus
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="cursor-pointer px-3 py-2" onClick={() => handleSortToggle("date")}>No / Tanggal {sortBy === "date" ? (sortOrder === "asc" ? "↑" : "↓") : ""}</th>
                      {privileged ? <th className="cursor-pointer px-3 py-2" onClick={() => handleSortToggle("name")}>Nama {sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}</th> : null}
                      {privileged ? <th className="cursor-pointer px-3 py-2" onClick={() => handleSortToggle("email")}>Email {sortBy === "email" ? (sortOrder === "asc" ? "↑" : "↓") : ""}</th> : null}
                      <th className="cursor-pointer px-3 py-2" onClick={() => handleSortToggle("masuk")}>Masuk {sortBy === "masuk" ? (sortOrder === "asc" ? "↑" : "↓") : ""}</th>
                      <th className="px-3 py-2">Ket. Masuk</th>
                      <th className="cursor-pointer px-3 py-2" onClick={() => handleSortToggle("keluar")}>Keluar {sortBy === "keluar" ? (sortOrder === "asc" ? "↑" : "↓") : ""}</th>
                      <th className="px-3 py-2">Ket. Keluar</th>
                      <th className="cursor-pointer px-3 py-2" onClick={() => handleSortToggle("status")}>Status {sortBy === "status" ? (sortOrder === "asc" ? "↑" : "↓") : ""}</th>
                      {privileged ? <th className="px-3 py-2">Aksi</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={privileged ? 10 : 7} className="px-3 py-6 text-center text-slate-500">
                          Tidak ada data presensi pada filter saat ini.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((record, index) => (
                        <tr key={record.id} className="border-b border-slate-100">
                          <td className="px-3 py-3 text-slate-700">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-500">#{startIndex + index + 1}</span>
                              <span className="font-medium text-slate-800">{record.date}</span>
                            </div>
                          </td>
                          {privileged ? (
                            <td className="px-3 py-3 text-slate-700">{record.name || "-"}</td>
                          ) : null}
                          {privileged ? (
                            <td className="px-3 py-3 text-slate-700">{record.email || "-"}</td>
                          ) : null}
                          <td className="px-3 py-3 text-slate-700">
                            {record.masuk ? `${formatTimestampWIB(record.masuk)} WIB` : "-"}
                          </td>
                          <td className="px-3 py-3 text-slate-700">{record.keteranganMasuk || "-"}</td>
                          <td className="px-3 py-3 text-slate-700">
                            {record.keluar ? `${formatTimestampWIB(record.keluar)} WIB` : "-"}
                          </td>
                          <td className="px-3 py-3 text-slate-700">{record.keteranganKeluar || "-"}</td>
                          <td className="px-3 py-3">
                            {record.keluar ? (
                              <Badge variant="success">Lengkap</Badge>
                            ) : (
                              <Badge variant="warning">Menunggu Keluar</Badge>
                            )}
                          </td>
                          {privileged ? (
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleOpenView(record)}>
                                  View
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleOpenEdit(record)}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleShareRecord(record)}>
                                  Share
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedRecord(record);
                                    setDeleteOpen(true);
                                  }}
                                >
                                  Hapus
                                </Button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Menampilkan {paginatedRecords.length} dari {sortedRecords.length} data.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </Button>
                  <span className="px-2 text-sm text-slate-600">
                    Page {safeCurrentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SimpleModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setSelectedRecord(null);
        }}
        title="Detail Presensi"
      >
        {selectedRecord ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p><strong>Tanggal:</strong> {selectedRecord.date}</p>
            <p><strong>Nama:</strong> {selectedRecord.name || "-"}</p>
            <p><strong>Email:</strong> {selectedRecord.email || "-"}</p>
            <p><strong>Masuk:</strong> {selectedRecord.masuk ? `${formatTimestampWIB(selectedRecord.masuk)} WIB` : "-"}</p>
            <p><strong>Keluar:</strong> {selectedRecord.keluar ? `${formatTimestampWIB(selectedRecord.keluar)} WIB` : "-"}</p>
            <p><strong>Ket. Masuk:</strong> {selectedRecord.keteranganMasuk || "-"}</p>
            <p><strong>Ket. Keluar:</strong> {selectedRecord.keteranganKeluar || "-"}</p>
          </div>
        ) : null}
      </SimpleModal>

      <SimpleModal
        open={editOpen}
        onClose={() => {
          if (!savingEdit) {
            setEditOpen(false);
            setSelectedRecord(null);
          }
        }}
        title="Edit Presensi"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (!savingEdit) {
                  setEditOpen(false);
                  setSelectedRecord(null);
                }
              }}
            >
              Batal
            </Button>
            <Button onClick={handleSaveEdit} isLoading={savingEdit}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nama" value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} />
          <Input label="Email" value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} />
          <Input label="Jam Masuk" type="datetime-local" value={editForm.masuk} onChange={(event) => setEditForm((prev) => ({ ...prev, masuk: event.target.value }))} />
          <Input label="Jam Keluar" type="datetime-local" value={editForm.keluar} onChange={(event) => setEditForm((prev) => ({ ...prev, keluar: event.target.value }))} />
          <Input label="Keterangan Masuk" value={editForm.keteranganMasuk} onChange={(event) => setEditForm((prev) => ({ ...prev, keteranganMasuk: event.target.value }))} />
          <Input label="Keterangan Keluar" value={editForm.keteranganKeluar} onChange={(event) => setEditForm((prev) => ({ ...prev, keteranganKeluar: event.target.value }))} />
        </div>
      </SimpleModal>

      <SimpleModal
        open={deleteOpen}
        onClose={() => {
          if (!deletingRecord) {
            setDeleteOpen(false);
            setSelectedRecord(null);
          }
        }}
        title="Hapus Data Presensi"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (!deletingRecord) {
                  setDeleteOpen(false);
                  setSelectedRecord(null);
                }
              }}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteRecord} isLoading={deletingRecord}>
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Anda yakin ingin menghapus data presensi untuk
          <strong className="ml-1">{selectedRecord?.name || selectedRecord?.email || "-"}</strong>
          <span className="ml-1">pada tanggal {selectedRecord?.date || "-"}?</span>
        </p>
      </SimpleModal>
    </div>
  );
}
