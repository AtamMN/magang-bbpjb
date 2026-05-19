import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as UpdateEmailPOST } from '@/app/api/admin/update-email/route';
import { POST as UpdatePasswordPOST } from '@/app/api/admin/update-password/route';
import * as requireRoleModule from '@/lib/server/requireAuthorizedRole';
import { adminAuth, adminDb } from '@/lib/firebase/firebaseAdmin';

vi.mock('@/lib/server/requireAuthorizedRole', () => ({
  requireAuthorizedRole: vi.fn(),
}));

vi.mock('@/lib/firebase/firebaseAdmin', () => ({
  adminAuth: {
    updateUser: vi.fn(),
  },
  adminDb: {
    ref: vi.fn(() => ({
      set: vi.fn(),
    })),
  },
}));

describe('Update Credentials API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('update-email', () => {
    it('should call requireAuthorizedRole with ["sadmin", "admin"]', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ uid: 'user1', newEmail: 'test@example.com' }),
      });

      vi.spyOn(requireRoleModule, 'requireAuthorizedRole').mockResolvedValue({ ok: true } as any);

      await UpdateEmailPOST(req);

      expect(requireRoleModule.requireAuthorizedRole).toHaveBeenCalledWith(req, ['sadmin', 'admin']);
    });
  });

  describe('update-password', () => {
    it('should call requireAuthorizedRole with ["sadmin", "admin"]', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ uid: 'user1', newPassword: 'newpassword123' }),
      });

      vi.spyOn(requireRoleModule, 'requireAuthorizedRole').mockResolvedValue({ ok: true } as any);

      await UpdatePasswordPOST(req);

      expect(requireRoleModule.requireAuthorizedRole).toHaveBeenCalledWith(req, ['sadmin', 'admin']);
    });
  });
});
