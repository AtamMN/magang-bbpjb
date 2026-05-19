import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as RegisterPOST } from '@/app/api/register/route';
import * as requireRoleModule from '@/lib/server/requireAuthorizedRole';
import { adminAuth, adminDb } from '@/lib/firebase/firebaseAdmin';

vi.mock('@/lib/server/requireAuthorizedRole', () => ({
  requireAuthorizedRole: vi.fn(),
}));

vi.mock('@/lib/firebase/firebaseAdmin', () => ({
  adminAuth: {
    createUser: vi.fn(() => Promise.resolve({ uid: 'new-user-uid' })),
  },
  adminDb: {
    ref: vi.fn(() => ({
      set: vi.fn(),
    })),
  },
}));

describe('Register API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call requireAuthorizedRole with ["sadmin", "admin"]', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'password', role: 'user' }),
    });

    vi.spyOn(requireRoleModule, 'requireAuthorizedRole').mockResolvedValue({ ok: true } as any);

    await RegisterPOST(req);

    expect(requireRoleModule.requireAuthorizedRole).toHaveBeenCalledWith(req, ['sadmin', 'admin']);
  });
});
