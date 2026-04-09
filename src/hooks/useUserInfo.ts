"use client";

import { useEffect, useState } from "react";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { auth, db } from "@/lib/firebase/firebase";
import type { AccountRecord, AppUser, UserRoleType } from "@/types/auth";

interface UserInfo {
  name: string;
  role: string;
  email: string;
}

const ROLE_COLLECTIONS: Array<{ key: string; role: UserRoleType }> = [
  { key: "sadmins", role: "sadmin" },
  { key: "admins", role: "admin" },
  { key: "users", role: "user" },
  { key: "interns", role: "intern" },
  { key: "mentors", role: "mentor" },
  { key: "sadmin", role: "sadmin" },
  { key: "admin", role: "admin" },
  { key: "user", role: "user" },
  { key: "intern", role: "intern" },
  { key: "mentor", role: "mentor" },
];

const ROLE_TO_BUCKET: Record<UserRoleType, string> = {
  sadmin: "sadmins",
  admin: "admins",
  user: "users",
  intern: "interns",
  mentor: "mentors",
};

/**
 * Role hierarchy (higher = more authority):
 * sadmin > admin > user > intern/mentor
 */
const ROLE_HIERARCHY: Record<UserRoleType, number> = {
  sadmin: 4,
  admin: 3,
  user: 2,
  intern: 1,
  mentor: 1,
};

function canChangeRoleTo(currentUserRole: UserRoleType, targetRole: UserRoleType): boolean {
  const currentHierarchy = ROLE_HIERARCHY[currentUserRole];
  const targetHierarchy = ROLE_HIERARCHY[targetRole];

  // Sadmin can change to any role
  if (currentUserRole === "sadmin") {
    return true;
  }

  // Admin can only change to roles at their level or below
  if (currentUserRole === "admin") {
    return targetHierarchy <= currentHierarchy;
  }

  // Other roles cannot change anyone's role
  return false;
}

interface RawAccountData {
  name?: string;
  email?: string;
  role?: string;
  createdAt?: number;
}

function normalizeRole(role: string | undefined, fallbackRole: UserRoleType): UserRoleType {
  if (!role) {
    return fallbackRole;
  }

  const lowered = role.trim().toLowerCase() as UserRoleType;
  if (Object.prototype.hasOwnProperty.call(ROLE_TO_BUCKET, lowered)) {
    return lowered;
  }

  return fallbackRole;
}

function flattenAccounts(
  accountsData: Record<string, Record<string, RawAccountData>>,
): AccountRecord[] {
  const accountMap = new Map<string, AccountRecord>();

  for (const roleCollection of ROLE_COLLECTIONS) {
    const roleGroup = accountsData[roleCollection.key] || {};

    for (const [id, account] of Object.entries(roleGroup)) {
      const normalizedEmail = String(account.email || "-").trim().toLowerCase();
      const dedupeKey = `${id}:${normalizedEmail}`;

      if (accountMap.has(dedupeKey)) {
        continue;
      }

      accountMap.set(dedupeKey, {
        id,
        bucket: roleCollection.key,
        name: String(account.name || "-"),
        email: String(account.email || "-"),
        role: normalizeRole(account.role, roleCollection.role),
        createdAt: account.createdAt,
      });
    }
  }

  return Array.from(accountMap.values()).sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
}

export default function useUserInfo(currentUser: AppUser | null) {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "Guest",
    role: "user",
    email: "-",
  });
  const [allAccounts, setAllAccounts] = useState<AccountRecord[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string>("");

  const expectedKey = currentUser?.email && db ? currentUser.email.toLowerCase() : "";

  const buildAuthorizedHeaders = async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  useEffect(() => {
    if (!currentUser?.email || !db) {
      return;
    }

    const accountsRef = ref(db, "accounts");

    const unsubscribe = onValue(
      accountsRef,
      (snapshot) => {
        const accountsData =
          (snapshot.val() as Record<string, Record<string, RawAccountData>> | null) || {};

        const flattened = flattenAccounts(accountsData);
        setAllAccounts(flattened);

        const foundUser = flattened.find(
          (account) => account.email.toLowerCase() === currentUser.email.toLowerCase(),
        );

        setUserInfo({
          name: String(foundUser?.name || currentUser.displayName || "Guest"),
          role: String(foundUser?.role || "user").toLowerCase(),
          email: String(foundUser?.email || currentUser.email),
        });
        setHydratedKey(expectedKey);
      },
      () => {
        setUserInfo({
          name: String(currentUser.displayName || "Guest"),
          role: "user",
          email: currentUser.email,
        });
        setHydratedKey(expectedKey);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.email, currentUser?.displayName, expectedKey]);

  async function resolveAccountById(accountId: string): Promise<AccountRecord | null> {
    const inMemory = allAccounts.find((account) => account.id === accountId);
    if (inMemory) {
      return inMemory;
    }

    if (!db) {
      return null;
    }

    for (const roleCollection of ROLE_COLLECTIONS) {
      const snapshot = await get(ref(db, `accounts/${roleCollection.key}/${accountId}`));
      if (!snapshot.exists()) {
        continue;
      }

      const account = snapshot.val() as RawAccountData;
      return {
        id: accountId,
        bucket: roleCollection.key,
        name: String(account.name || "-"),
        email: String(account.email || "-"),
        role: normalizeRole(account.role, roleCollection.role),
        createdAt: account.createdAt,
      };
    }

    return null;
  }

  async function updateRole(accountId: string, newRole: UserRoleType, currentUserRole?: UserRoleType) {
    if (!db) {
      throw new Error("Database belum dikonfigurasi.");
    }

    // Validate permission if currentUserRole is provided
    if (currentUserRole && !canChangeRoleTo(currentUserRole, newRole)) {
      throw new Error(
        currentUserRole === "admin"
          ? `Admin tidak dapat mengubah role ke ${newRole}. Hanya dapat mengubah ke admin, user, intern, atau mentor.`
          : "Anda tidak memiliki izin untuk mengubah role pengguna.",
      );
    }

    const account = await resolveAccountById(accountId);
    if (!account) {
      throw new Error("Akun tidak ditemukan.");
    }

    const targetBucket = ROLE_TO_BUCKET[newRole];
    const payload = {
      name: account.name,
      email: account.email,
      role: newRole,
      createdAt: account.createdAt || Date.now(),
    };

    await set(ref(db, `accounts/${targetBucket}/${accountId}`), payload);

    if (targetBucket !== account.bucket) {
      await remove(ref(db, `accounts/${account.bucket}/${accountId}`));
    }
  }

  async function updateAccount(
    accountId: string,
    updatedData: Partial<{ name: string; email: string; role: UserRoleType; createdAt: number }>,
  ) {
    if (!db) {
      throw new Error("Database belum dikonfigurasi.");
    }

    const account = await resolveAccountById(accountId);
    if (!account) {
      throw new Error("Akun tidak ditemukan.");
    }

    const nextRole = updatedData.role || account.role;
    if (nextRole !== account.role) {
      await updateRole(accountId, nextRole);
    }

    const targetBucket = ROLE_TO_BUCKET[nextRole];
    const payload: Record<string, unknown> = {
      ...updatedData,
      role: nextRole,
    };

    await update(ref(db, `accounts/${targetBucket}/${accountId}`), payload);
  }

  async function deleteAccount(accountId: string) {
    if (!db) {
      throw new Error("Database belum dikonfigurasi.");
    }

    try {
      const response = await fetch("/api/admin/delete-account", {
        method: "POST",
        headers: await buildAuthorizedHeaders(),
        body: JSON.stringify({ uid: accountId }),
      });

      if (response.ok) {
        return;
      }
    } catch (error) {
      console.warn("Delete account API unavailable, fallback to DB remove.", error);
    }

    const account = await resolveAccountById(accountId);
    if (!account) {
      return;
    }

    await remove(ref(db, `accounts/${account.bucket}/${accountId}`));
  }

  const loadingUser = Boolean(
    currentUser?.email &&
      db &&
      hydratedKey !== expectedKey,
  );

  const resolvedUserInfo: UserInfo = currentUser?.email
    ? userInfo
    : {
        name: "Guest",
        role: "user",
        email: "-",
      };

  return {
    userInfo: resolvedUserInfo,
    loadingUser,
    allAccounts,
    updateRole,
    updateAccount,
    deleteAccount,
  };
}
