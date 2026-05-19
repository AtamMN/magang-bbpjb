import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as UpdateAccountPOST } from '@/app/api/admin/update-account/route';
import * as requireRoleModule from '@/lib/server/requireAuthorizedRole';

vi.mock('@/lib/server/requireAuthorizedRole', () => ({
  requireAuthorizedRole: vi.fn(),
}));

const mockDbUpdate = vi.fn();
const mockDbRemove = vi.fn();
const mockDbSet = vi.fn();
const mockDbGet = vi.fn();

vi.mock('@/lib/firebase/firebaseAdmin', () => ({
  adminDb: {
    ref: vi.fn((path) => ({
      get: () => mockDbGet(path),
      update: mockDbUpdate,
      remove: mockDbRemove,
      set: mockDbSet,
    })),
  },
}));

describe('Update Account API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates account fields correctly without changing role', async () => {
    mockDbGet.mockResolvedValue({ exists: () => true, val: () => ({ name: 'Old', role: 'user' }) });

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ uid: 'user1', data: { name: 'New Name' } }),
    });

    vi.spyOn(requireRoleModule, 'requireAuthorizedRole').mockResolvedValue({ 
      ok: true, 
      role: 'admin' 
    } as any);

    const res = await UpdateAccountPOST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(mockDbUpdate).toHaveBeenCalledWith({ name: 'New Name' });
  });

  it('updates account role and moves it to a new bucket', async () => {
    mockDbGet.mockResolvedValue({ exists: () => true, val: () => ({ name: 'Old', role: 'user', email: 'a@a.com', createdAt: 123 }) });

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ uid: 'user1', data: { role: 'admin' } }),
    });

    vi.spyOn(requireRoleModule, 'requireAuthorizedRole').mockResolvedValue({ 
      ok: true, 
      role: 'sadmin' 
    } as any);

    const res = await UpdateAccountPOST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(mockDbSet).toHaveBeenCalledWith(expect.objectContaining({
      role: 'admin',
      name: 'Old',
      email: 'a@a.com'
    }));
    expect(mockDbRemove).toHaveBeenCalled();
  });
});
