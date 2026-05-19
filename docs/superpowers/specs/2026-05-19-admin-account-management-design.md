# Admin Account Management Implementation Plan

**Goal:** Allow Admin to manage (create, edit, soft-delete) users without permanent deletion capability, while Sadmin retains hard-delete and restore capabilities. Remove "intern" and "mentor" from role dropdowns, and hide the Scan QR tab for Admin.

**Architecture:** 
- The `/api/admin/delete-account` route will support three actions: `soft_delete`, `permanent_delete`, and `restore`. `admin` will be strictly locked to `soft_delete`.
- Realtime Database will store an `isDeleted: true` flag on soft-deleted accounts.
- Firebase Auth will disable (`disabled: true`) soft-deleted accounts.
- The UI (`AccountsTable`) will filter out flagged accounts for `admin`, but display them with "Restore" controls for `sadmin`.
- Navigational components (`Sidebar`, `MobileBottomNav`) will conditionally render the Scan QR menu to exclude `admin`.

**Tech Stack:** Next.js API Routes, Firebase Admin (Auth & RTDB), React (Hooks & State).

---

### Scope
- **API Security:** Update endpoints (`/api/register`, `/api/admin/update-email`, `/api/admin/update-password`, `/api/admin/delete-account`) to authorize both `sadmin` and `admin`, while enforcing action-level restrictions on `delete-account`.
- **Hooks & Types:** Extend `AccountRecord` in `types/auth.ts` and `RawAccountData` in `useUserInfo.ts` to include `isDeleted`.
- **UI Accounts Table:** Hide `isDeleted` users from Admin. Give Sadmin a "Restore" button and a "Hard Delete" button for soft-deleted accounts.
- **UI Dropdowns:** Remove `intern` and `mentor` from the role dropdown.
- **Navigation:** Hide the Scan QR navigation link from `admin` in `Sidebar` and `MobileBottomNav`.
