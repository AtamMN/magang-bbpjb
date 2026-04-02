"use client";

import { useMemo, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, SimpleModal } from "@/components/ui";
import { useAuth } from "@/lib/contexts/AuthContext";
import useUserInfo from "@/hooks/useUserInfo";
import type { AccountRecord, UserRoleType } from "@/types/auth";
import { toast } from "sonner";

const ROLE_OPTIONS: UserRoleType[] = ["admin", "user", "intern", "mentor"];

function formatCreatedAt(createdAt?: number) {
  if (!createdAt) {
    return "-";
  }
  return new Date(createdAt).toLocaleString("id-ID");
}

interface AccountFormState {
  name: string;
  email: string;
  password: string;
  role: UserRoleType;
}

const EMPTY_REGISTER_FORM: AccountFormState = {
  name: "",
  email: "",
  password: "",
  role: "user",
};

export default function AccountsTable() {
  const { currentUser, userRole } = useAuth();
  const { allAccounts, loadingUser, updateRole, updateAccount, deleteAccount } = useUserInfo(currentUser);

  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState<AccountFormState>(EMPTY_REGISTER_FORM);
  const [registering, setRegistering] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<AccountFormState>(EMPTY_REGISTER_FORM);
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<AccountRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    account: AccountRecord;
    nextRole: UserRoleType;
  } | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  const canManage = userRole?.role === "sadmin";
  const isTrialUser = (currentUser?.email || "").toLowerCase() === "trial@trial.com";

  const filteredAccounts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return allAccounts;
    }

    return allAccounts.filter((account) => {
      const searchable = [account.name, account.email, account.role]
        .join(" ")
        .toLowerCase();
      return searchable.includes(keyword);
    });
  }, [allAccounts, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + itemsPerPage);

  const resetRegisterForm = () => setRegisterForm(EMPTY_REGISTER_FORM);

  const handleOpenEdit = (account: AccountRecord) => {
    setEditingAccount(account);
    setEditForm({
      name: account.name,
      email: account.email,
      password: "",
      role: account.role,
    });
    setEditOpen(true);
  };

  const handleRegister = async () => {
    if (!canManage) {
      toast.error("Hanya sadmin yang boleh membuat akun.");
      return;
    }

    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      toast.error("Nama, email, dan password wajib diisi.");
      return;
    }

    setRegistering(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
          role: registerForm.role,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Gagal mendaftarkan akun.");
      }

      toast.success("Akun baru berhasil dibuat.");
      setRegisterOpen(false);
      resetRegisterForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mendaftarkan akun.");
    } finally {
      setRegistering(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!canManage || !editingAccount) {
      return;
    }

    if (!editForm.name || !editForm.email) {
      toast.error("Nama dan email wajib diisi.");
      return;
    }

    setSavingEdit(true);
    try {
      if (editForm.email !== editingAccount.email) {
        const response = await fetch("/api/admin/update-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: editingAccount.id, newEmail: editForm.email }),
        });

        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Gagal mengubah email akun.");
        }
      }

      if (editForm.password.trim()) {
        const response = await fetch("/api/admin/update-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: editingAccount.id, newPassword: editForm.password.trim() }),
        });

        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Gagal mengubah password akun.");
        }
      }

      await updateAccount(editingAccount.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
      });

      toast.success("Data akun berhasil diperbarui.");
      setEditOpen(false);
      setEditingAccount(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui akun.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) {
      return;
    }

    setChangingRole(true);
    try {
      await updateRole(pendingRoleChange.account.id, pendingRoleChange.nextRole);
      toast.success("Role akun berhasil diperbarui.");
      setRoleConfirmOpen(false);
      setPendingRoleChange(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui role.");
    } finally {
      setChangingRole(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) {
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount(deletingAccount.id);
      toast.success("Akun berhasil dihapus.");
      setDeleteOpen(false);
      setDeletingAccount(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus akun.");
    } finally {
      setDeleting(false);
    }
  };

  if (loadingUser) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-600">Memuat data akun...</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Manajemen Akun</CardTitle>
            <CardDescription>
              Kelola akun pengguna, role, dan kredensial akses dashboard.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              label="Pencarian"
              placeholder="Cari nama, email, atau role"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Per halaman</label>
              <select
                value={itemsPerPage}
                onChange={(event) => {
                  setItemsPerPage(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00509D]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {canManage && !isTrialUser ? (
              <Button onClick={() => setRegisterOpen(true)}>Tambah Akun</Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Dibuat</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Tidak ada akun ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginatedAccounts.map((account) => {
                    const isSadminAccount = account.role === "sadmin";
                    const isCurrentUser = (currentUser?.email || "").toLowerCase() === account.email.toLowerCase();

                    return (
                      <tr key={account.id} className="border-b border-slate-100">
                        <td className="px-3 py-3 text-slate-800">
                          <span className="font-medium">{account.name}</span>
                          {isCurrentUser ? (
                            <span className="ml-2 text-xs text-slate-500">(Anda)</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {isTrialUser ? "***@***" : account.email}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          <select
                            value={account.role}
                            disabled={!canManage || isSadminAccount || isTrialUser}
                            onChange={(event) => {
                              const nextRole = event.target.value as UserRoleType;
                              if (nextRole === account.role) {
                                return;
                              }
                              setPendingRoleChange({ account, nextRole });
                              setRoleConfirmOpen(true);
                            }}
                            className="h-9 rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00509D] disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            {[account.role, ...ROLE_OPTIONS.filter((role) => role !== account.role)].map((role) => (
                              <option key={`${account.id}-${role}`} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{formatCreatedAt(account.createdAt)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {canManage && !isSadminAccount ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEdit(account)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setDeletingAccount(account);
                                    setDeleteOpen(true);
                                  }}
                                >
                                  Hapus
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500">Read-only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Menampilkan {paginatedAccounts.length} dari {filteredAccounts.length} akun.
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
        </CardContent>
      </Card>

      <SimpleModal
        open={registerOpen}
        onClose={() => {
          if (!registering) {
            setRegisterOpen(false);
            resetRegisterForm();
          }
        }}
        title="Daftarkan Akun Baru"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (!registering) {
                  setRegisterOpen(false);
                  resetRegisterForm();
                }
              }}
            >
              Batal
            </Button>
            <Button onClick={handleRegister} isLoading={registering}>
              Daftarkan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nama"
            value={registerForm.name}
            onChange={(event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={registerForm.email}
            onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            label="Password"
            type="password"
            value={registerForm.password}
            onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select
              value={registerForm.role}
              onChange={(event) =>
                setRegisterForm((prev) => ({ ...prev, role: event.target.value as UserRoleType }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00509D]"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={editOpen}
        onClose={() => {
          if (!savingEdit) {
            setEditOpen(false);
            setEditingAccount(null);
          }
        }}
        title="Edit Akun"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (!savingEdit) {
                  setEditOpen(false);
                  setEditingAccount(null);
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
          <Input
            label="Nama"
            value={editForm.name}
            onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            label="Password Baru"
            type="password"
            placeholder="Kosongkan jika tidak diganti"
            value={editForm.password}
            onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select
              value={editForm.role}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, role: event.target.value as UserRoleType }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00509D]"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeletingAccount(null);
          }
        }}
        title="Hapus Akun"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (!deleting) {
                  setDeleteOpen(false);
                  setDeletingAccount(null);
                }
              }}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} isLoading={deleting}>
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Anda yakin ingin menghapus akun <strong>{deletingAccount?.name || "-"}</strong>?
        </p>
      </SimpleModal>

      <SimpleModal
        open={roleConfirmOpen}
        onClose={() => {
          if (!changingRole) {
            setRoleConfirmOpen(false);
            setPendingRoleChange(null);
          }
        }}
        title="Konfirmasi Perubahan Role"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (!changingRole) {
                  setRoleConfirmOpen(false);
                  setPendingRoleChange(null);
                }
              }}
            >
              Batal
            </Button>
            <Button onClick={handleConfirmRoleChange} isLoading={changingRole}>
              Konfirmasi
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Ubah role akun <strong>{pendingRoleChange?.account.name || "-"}</strong> menjadi
          <strong className="ml-1">{pendingRoleChange?.nextRole || "-"}</strong>?
        </p>
      </SimpleModal>
    </>
  );
}
