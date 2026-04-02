"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, SimpleModal } from "@/components/ui";

interface TrialRecord {
  id: string;
  name: string;
  phone: string;
  activity: string;
  timestamp: string;
  isShared: boolean;
}

const INITIAL_RECORDS: TrialRecord[] = [
  {
    id: "trial-1",
    name: "Alice Trial",
    phone: "0812-0000-1234",
    activity: "Simulasi Presensi Hari Pertama",
    timestamp: new Date().toISOString(),
    isShared: false,
  },
  {
    id: "trial-2",
    name: "Bob Trial",
    phone: "0812-0000-5678",
    activity: "Uji Coba Export PDF",
    timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
    isShared: true,
  },
];

export default function TrialAttendanceTable() {
  const [records, setRecords] = useState<TrialRecord[]>(INITIAL_RECORDS);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<TrialRecord | null>(null);
  const [formState, setFormState] = useState({ name: "", phone: "", activity: "" });

  const filteredRecords = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return records;
    }

    return records.filter((record) =>
      [record.name, record.phone, record.activity].join(" ").toLowerCase().includes(keyword),
    );
  }, [records, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  const handleAddRecord = () => {
    if (!formState.name || !formState.phone || !formState.activity) {
      return;
    }

    const nextRecord: TrialRecord = {
      id: `trial-${Date.now()}`,
      name: formState.name,
      phone: formState.phone,
      activity: formState.activity,
      timestamp: new Date().toISOString(),
      isShared: false,
    };

    setRecords((prev) => [nextRecord, ...prev]);
    setFormState({ name: "", phone: "", activity: "" });
    setAddOpen(false);
  };

  const handleOpenEdit = (record: TrialRecord) => {
    setSelectedRecord(record);
    setFormState({ name: record.name, phone: record.phone, activity: record.activity });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedRecord) {
      return;
    }

    setRecords((prev) =>
      prev.map((record) =>
        record.id === selectedRecord.id
          ? {
              ...record,
              name: formState.name,
              phone: formState.phone,
              activity: formState.activity,
            }
          : record,
      ),
    );
    setEditOpen(false);
    setSelectedRecord(null);
  };

  const handleDelete = () => {
    if (!selectedRecord) {
      return;
    }

    setRecords((prev) => prev.filter((record) => record.id !== selectedRecord.id));
    setDeleteOpen(false);
    setSelectedRecord(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trial Dashboard</CardTitle>
          <CardDescription>
            Mode trial memakai data lokal untuk simulasi alur presensi tanpa menyentuh RTDB.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            label="Pencarian"
            placeholder="Cari nama, nomor, aktivitas"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={itemsPerPage}
              onChange={(event) => {
                setItemsPerPage(Number(event.target.value));
                setCurrentPage(1);
              }}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <Button onClick={() => setAddOpen(true)}>Tambah Data Trial</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-3 py-2">No</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">No. HP</th>
                  <th className="px-3 py-2">Aktivitas</th>
                  <th className="px-3 py-2">Waktu</th>
                  <th className="px-3 py-2">Share</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                      Tidak ada data trial.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record, index) => (
                    <tr key={record.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 text-slate-700">{startIndex + index + 1}</td>
                      <td className="px-3 py-3 font-medium text-slate-800">{record.name}</td>
                      <td className="px-3 py-3 text-slate-700">{record.phone}</td>
                      <td className="px-3 py-3 text-slate-700">{record.activity}</td>
                      <td className="px-3 py-3 text-slate-700">{new Date(record.timestamp).toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3">
                        {record.isShared ? <Badge variant="success">Shared</Badge> : <Badge variant="warning">Private</Badge>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedRecord(record); setViewOpen(true); }}>
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(record)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRecords((prev) =>
                                prev.map((item) =>
                                  item.id === record.id ? { ...item, isShared: !item.isShared } : item,
                                ),
                              );
                            }}
                          >
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">Page {safeCurrentPage} / {totalPages}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </Button>
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
        </CardContent>
      </Card>

      <SimpleModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Data Trial"
        actions={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button onClick={handleAddRecord}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nama" value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} />
          <Input label="No. HP" value={formState.phone} onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))} />
          <Input label="Aktivitas" value={formState.activity} onChange={(event) => setFormState((prev) => ({ ...prev, activity: event.target.value }))} />
        </div>
      </SimpleModal>

      <SimpleModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedRecord(null);
        }}
        title="Edit Data Trial"
        actions={
          <>
            <Button variant="outline" onClick={() => { setEditOpen(false); setSelectedRecord(null); }}>Batal</Button>
            <Button onClick={handleSaveEdit}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nama" value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} />
          <Input label="No. HP" value={formState.phone} onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))} />
          <Input label="Aktivitas" value={formState.activity} onChange={(event) => setFormState((prev) => ({ ...prev, activity: event.target.value }))} />
        </div>
      </SimpleModal>

      <SimpleModal
        open={viewOpen}
        onClose={() => { setViewOpen(false); setSelectedRecord(null); }}
        title="Detail Data Trial"
      >
        {selectedRecord ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p><strong>Nama:</strong> {selectedRecord.name}</p>
            <p><strong>No. HP:</strong> {selectedRecord.phone}</p>
            <p><strong>Aktivitas:</strong> {selectedRecord.activity}</p>
            <p><strong>Waktu:</strong> {new Date(selectedRecord.timestamp).toLocaleString("id-ID")}</p>
            <p><strong>Status Share:</strong> {selectedRecord.isShared ? "Shared" : "Private"}</p>
          </div>
        ) : null}
      </SimpleModal>

      <SimpleModal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setSelectedRecord(null); }}
        title="Hapus Data Trial"
        actions={
          <>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setSelectedRecord(null); }}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Yakin ingin menghapus data <strong>{selectedRecord?.name || "-"}</strong>?
        </p>
      </SimpleModal>
    </div>
  );
}
