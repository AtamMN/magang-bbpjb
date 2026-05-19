import { describe, it, expect } from 'vitest';
import { flattenAccounts } from '@/hooks/useUserInfo';

describe('flattenAccounts', () => {
  it('should map isDeleted property correctly', () => {
    const rawData = {
      users: {
        user1: { name: 'A', email: 'a@a.com', role: 'user', isDeleted: true },
        user2: { name: 'B', email: 'b@b.com', role: 'user' }
      }
    };

    const result = flattenAccounts(rawData);
    
    const user1 = result.find(u => u.id === 'user1');
    const user2 = result.find(u => u.id === 'user2');

    expect(user1?.isDeleted).toBe(true);
    expect(user2?.isDeleted).toBe(false);
  });
});
