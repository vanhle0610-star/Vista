import { tripApi } from '../services/tripApi';
import { api } from '@/services/api/client';

jest.mock('@/services/api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('tripApi W4 methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('leaveTrip', () => {
    it('calls POST /trips/{tripId}/leave', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: undefined });

      await tripApi.leaveTrip('trip-123');

      expect(api.post).toHaveBeenCalledWith('/trips/trip-123/leave');
    });

    it('propagates error when leaveTrip fails', async () => {
      (api.post as jest.Mock).mockRejectedValueOnce(new Error('Cannot leave trip'));

      await expect(tripApi.leaveTrip('trip-123')).rejects.toThrow('Cannot leave trip');
    });
  });

  describe('removeMember', () => {
    it('calls DELETE /trips/{tripId}/members/{userId}', async () => {
      (api.delete as jest.Mock).mockResolvedValueOnce({ data: undefined });

      await tripApi.removeMember('trip-123', 'user-456');

      expect(api.delete).toHaveBeenCalledWith('/trips/trip-123/members/user-456');
    });

    it('propagates error when removeMember fails', async () => {
      (api.delete as jest.Mock).mockRejectedValueOnce(new Error('Cannot remove member'));

      await expect(tripApi.removeMember('trip-123', 'user-456')).rejects.toThrow('Cannot remove member');
    });
  });

  describe('transferOwner', () => {
    it('calls POST /trips/{tripId}/transfer-owner with newOwnerId payload', async () => {
      const mockUpdatedTrip = {
        id: 'trip-123',
        ownerId: 'user-456',
        title: 'Trip to Dalat',
        role: 'MEMBER',
      };
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockUpdatedTrip });

      const result = await tripApi.transferOwner('trip-123', 'user-456');

      expect(api.post).toHaveBeenCalledWith('/trips/trip-123/transfer-owner', {
        newOwnerId: 'user-456',
      });
      expect(result).toEqual(mockUpdatedTrip);
    });

    it('propagates error when transferOwner fails', async () => {
      (api.post as jest.Mock).mockRejectedValueOnce(new Error('Transfer failed'));

      await expect(tripApi.transferOwner('trip-123', 'user-456')).rejects.toThrow('Transfer failed');
    });
  });

  describe('getTripMembers', () => {
    it('calls GET /trips/{tripId}/members and returns members list', async () => {
      const mockMembers = [
        { userId: 'u1', displayName: 'User 1', role: 'OWNER', status: 'ACTIVE' },
        { userId: 'u2', displayName: 'User 2', role: 'MEMBER', status: 'ACTIVE' },
      ];
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockMembers });

      const result = await tripApi.getTripMembers('trip-123');

      expect(api.get).toHaveBeenCalledWith('/trips/trip-123/members');
      expect(result).toEqual(mockMembers);
    });
  });
});

