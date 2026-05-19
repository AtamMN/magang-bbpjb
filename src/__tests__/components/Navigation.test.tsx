import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import * as AuthContext from '@/lib/contexts/AuthContext';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe('Sidebar', () => {
    it('hides Scan QR for admin', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        userRole: { role: 'admin' },
      } as any);

      render(<Sidebar />);
      
      expect(screen.queryByText('Scan QR')).toBeNull();
    });

    it('shows Scan QR for sadmin', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        userRole: { role: 'sadmin' },
      } as any);

      render(<Sidebar />);
      
      expect(screen.getByText('Scan QR')).toBeTruthy();
    });
  });

  describe('MobileBottomNav', () => {
    it('hides Scan QR for admin', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        userRole: { role: 'admin' },
      } as any);

      render(<MobileBottomNav />);
      
      expect(screen.queryByText('Scan')).toBeNull();
    });

    it('shows Scan QR for sadmin', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
        userRole: { role: 'sadmin' },
      } as any);

      render(<MobileBottomNav />);
      
      expect(screen.getByText('Scan')).toBeTruthy();
    });
  });
});
