"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, db, hasFirebaseConfig } from "@/lib/firebase/firebase";
import type { AppUser, RoleInfo, UserRoleType } from "@/types/auth";

interface AuthContextValue {
  currentUser: AppUser | null;
  userRole: RoleInfo | null;
  loading: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_STORAGE_KEY = "magang_bbpjb_demo_auth";

const VALID_ROLES = new Set<UserRoleType>([
  "sadmin",
  "admin",
  "user",
  "intern",
  "mentor",
]);

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

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value: unknown, fallbackRole: UserRoleType): UserRoleType {
  const normalized = String(value || "").trim().toLowerCase() as UserRoleType;
  if (VALID_ROLES.has(normalized)) {
    return normalized;
  }
  return fallbackRole;
}

async function checkUserRole(email: string): Promise<RoleInfo | null> {
  if (!db || !email) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  console.log("[AuthContext] Checking role for email:", normalizedEmail);

  for (const roleCollection of ROLE_COLLECTIONS) {
    const roleRef = ref(db, `accounts/${roleCollection.key}`);
    const snapshot = await get(roleRef);

    if (!snapshot.exists()) {
      console.log(`[AuthContext] No data in accounts/${roleCollection.key}`);
      continue;
    }

    const roleData = snapshot.val() as Record<string, Record<string, unknown>>;
    console.log(`[AuthContext] Found data in accounts/${roleCollection.key}:`, Object.keys(roleData));

    const matched = Object.values(roleData).find((candidate) => {
      const candidateEmail = normalizeEmail(candidate.email);
      console.log(`[AuthContext] Comparing ${candidateEmail} === ${normalizedEmail}`);
      return candidateEmail === normalizedEmail;
    });

    if (matched) {
      const resolvedRole = normalizeRole(matched.role, roleCollection.role);
      console.log("[AuthContext] Found match! Resolved role:", resolvedRole, "Raw matched data:", matched);
      return {
        role: resolvedRole,
        roleData: matched,
      };
    }
  }

  console.log("[AuthContext] No role match found for email:", normalizedEmail);
  return null;
}

function inferDemoRole(email: string): RoleInfo {
  const normalized = email.toLowerCase();
  if (normalized.includes("sadmin")) {
    return { role: "sadmin", roleData: { email, name: "Demo Super Admin", role: "sadmin" } };
  }
  if (normalized.includes("admin")) {
    return { role: "admin", roleData: { email, name: "Demo Admin", role: "admin" } };
  }
  return { role: "user", roleData: { email, name: "Demo User", role: "user" } };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<RoleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      const demoSessionRaw = typeof window !== "undefined" ? localStorage.getItem(DEMO_STORAGE_KEY) : null;
      if (demoSessionRaw) {
        try {
          const parsed = JSON.parse(demoSessionRaw) as { uid: string; email: string; displayName?: string; role: RoleInfo };
          setCurrentUser({ uid: parsed.uid, email: parsed.email, displayName: parsed.displayName });
          setUserRole(parsed.role);
        } catch {
          localStorage.removeItem(DEMO_STORAGE_KEY);
        }
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) {
        setCurrentUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const roleInfo = await checkUserRole(user.email);
        setCurrentUser({ uid: user.uid, email: user.email, displayName: user.displayName || undefined });
        setUserRole(roleInfo);
      } catch (error) {
        console.error("Role resolution failed:", error);
        setCurrentUser({ uid: user.uid, email: user.email, displayName: user.displayName || undefined });
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (hasFirebaseConfig && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return { ok: true };
      } catch (error) {
        console.error("Login failed:", error);
        return { ok: false, message: "Email atau password tidak valid." };
      }
    }

    const role = inferDemoRole(email);
    const demoUser: AppUser = {
      uid: `demo-${Date.now()}`,
      email,
      displayName: String(role.roleData.name || "Demo User"),
    };

    setCurrentUser(demoUser);
    setUserRole(role);
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({
        ...demoUser,
        role,
        passwordHint: password.length,
      }),
    );

    return { ok: true, message: "Mode demo aktif karena Firebase belum dikonfigurasi." };
  }, []);

  const logout = useCallback(async () => {
    if (hasFirebaseConfig && auth) {
      await signOut(auth);
      return;
    }

    localStorage.removeItem(DEMO_STORAGE_KEY);
    setCurrentUser(null);
    setUserRole(null);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      userRole,
      loading,
      isDemoMode: !hasFirebaseConfig,
      login,
      logout,
    }),
    [currentUser, userRole, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{!loading ? children : null}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
