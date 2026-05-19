import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as DeleteAccountPOST } from '@/app/api/admin/delete-account/route';
import * as requireRoleModule from '@/lib/server/requireAuthorizedRole';

vi.mock('@/lib/server/requireAuthorizedRole', () => ({
  requireAuthorizedRole: vi.fn(),
}));

const mockUpdateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockDbRemove = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock('@/lib/firebase/firebaseAdmin', () => ({
  adminAuth: {
    updateUser: (...args: any[]) => mockUpdateUser(...args),
    deleteUser: (...args: any[]) => mockDeleteUser(...args),
  },
  adminDb: {
    ref: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ exists: () => true })),
      remove: mockDbRemove,
      update: mockDbUpdate,
    })),
  },
}));

describe('Delete Account API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('admin should only be able to soft delete, even if requesting permanent', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ uid: 'user1', action: 'permanent_delete' }),
    });

    vi.spyOn(requireRoleModule, 'requireAuthorizedRole').mockResolvedValue({ 
      ok: true, 
      role: 'admin' 
    } as any);

    const res = await DeleteAccountPOST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith('user1', { disabled: true });
    expect(mockDbUpdate).toHaveBeenCalledWith({ isDeleted: true });
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('sadmin should be able to restore account', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ uid: 'user2', action: 'restore' }),
    });

    vi.spyOn(requireRoleModule, 'requireAuthorizedRole').mockResolvedValue({ 
      ok: true, 
      role: 'sadmin' 
    } as any);

    const res = await DeleteAccountPOST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith('user2', { disabled: false });
    expect(mockDbRemove).toHaveBeenCalled();
  });

  it('sadmin should be able to permanently delete account', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ uid: 'user3', action: 'permanent_delete' }),
    });

    vi.spyOn(requireRoleModule, 'requireAuthorizedRole').mockResolvedValue({ 
      ok: true, 
      role: 'sadmin' 
    } as any);

    const res = await DeleteAccountPOST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(mockDeleteUser).toHaveBeenCalledWith('user3');
    expect(mockDbRemove).toHaveBeenCalled();
  });
});
