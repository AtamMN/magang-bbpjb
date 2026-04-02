export type UserRoleType = "sadmin" | "admin" | "user" | "intern" | "mentor";

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
}

export interface RoleData {
  name?: string;
  email?: string;
  role?: UserRoleType;
  [key: string]: unknown;
}

export interface RoleInfo {
  role: UserRoleType;
  roleData: RoleData;
}

export interface AccountRecord {
  id: string;
  bucket: string;
  name: string;
  email: string;
  role: UserRoleType;
  createdAt?: number;
}
