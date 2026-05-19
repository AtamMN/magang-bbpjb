import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AccountsTable from '@/components/dashboard/AccountsTable';
import * as AuthContext from '@/lib/contexts/AuthContext';
import * as useUserInfoHook from '@/hooks/useUserInfo';

vi.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useUserInfo', () => ({
  default: vi.fn(),
}));

describe('AccountsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('hides deleted users from admin', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: { email: 'admin@a.com' },
      userRole: { role: 'admin' },
    } as any);

    vi.spyOn(useUserInfoHook, 'default').mockReturnValue({
      allAccounts: [
        { id: '1', name: 'User 1', email: '1@a.com', role: 'user', isDeleted: false },
        { id: '2', name: 'User 2', email: '2@a.com', role: 'user', isDeleted: true },
      ],
      loadingUser: false,
    } as any);

    render(<AccountsTable />);
    
    expect(screen.getByText('User 1')).toBeTruthy();
    expect(screen.queryByText('User 2')).toBeNull();
  });

  it('shows deleted users to sadmin with Restore button', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      currentUser: { email: 'sadmin@a.com' },
      userRole: { role: 'sadmin' },
    } as any);

    vi.spyOn(useUserInfoHook, 'default').mockReturnValue({
      allAccounts: [
        { id: '2', name: 'User 2', email: '2@a.com', role: 'user', isDeleted: true },
      ],
      loadingUser: false,
    } as any);

    render(<AccountsTable />);
    
    expect(screen.getByText('User 2')).toBeTruthy();
    expect(screen.getByText('Restore')).toBeTruthy();
  });
});
