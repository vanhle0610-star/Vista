import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TripMembersScreen } from '../screens/TripMembersScreen';
import { tripFeatureApi } from '../api';
import { authStorage } from '@/services/auth/authStorage';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    },
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/services/auth/authStorage', () => ({
  authStorage: {
    getUser: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  },
}));

jest.mock('../api', () => ({
  tripFeatureApi: {
    fetchTrip: jest.fn(),
    fetchTripMembers: jest.fn(),
    fetchInvitations: jest.fn().mockResolvedValue([]),
    leaveTrip: jest.fn(),
    transferOwnership: jest.fn(),
    createInvitation: jest.fn(),
    revokeInvitation: jest.fn(),
    deleteTrip: jest.fn(),
  },
}));

describe('TripMembersScreen (Bước 3 - TV3)', () => {
  const mockTrip = {
    id: 'trip-101',
    ownerId: 'owner-1',
    title: 'Đà Nẵng: Biển xanh & Núi non',
    startDate: '2026-06-12',
    endDate: '2026-06-15',
    role: 'OWNER',
  };

  const mockMembers = [
    {
      userId: 'owner-1',
      displayName: 'Nguyễn Vân Anh',
      email: 'vananh@vista.travel',
      role: 'OWNER',
    },
    {
      userId: 'member-2',
      displayName: 'Hoàng Hà Mai',
      email: 'mai@vista.travel',
      role: 'MEMBER',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (tripFeatureApi.fetchTrip as jest.Mock).mockResolvedValue(mockTrip);
    (tripFeatureApi.fetchTripMembers as jest.Mock).mockResolvedValue(mockMembers);
    (tripFeatureApi.fetchInvitations as jest.Mock).mockResolvedValue([]);
  });

  it('renders members screen correctly for OWNER with transfer button', async () => {
    (authStorage.getUser as jest.Mock).mockResolvedValue({ id: 'owner-1' });

    const { findByText, getByText } = await render(<TripMembersScreen tripId="trip-101" />);

    expect(await findByText('Thành Viên Chuyến Đi')).toBeTruthy();
    expect(getByText('Nguyễn Vân Anh')).toBeTruthy();
    expect(getByText('Hoàng Hà Mai')).toBeTruthy();
    expect(getByText('CHỦ CHUYẾN ĐI')).toBeTruthy();
    // Owner sees transfer button and remove button
    expect(getByText('👑 Chuyển quyền Trưởng nhóm')).toBeTruthy();
    expect(getByText('Xóa')).toBeTruthy();
  });

  it('renders members screen for MEMBER with Leave Trip button', async () => {
    (authStorage.getUser as jest.Mock).mockResolvedValue({ id: 'member-2' });
    (tripFeatureApi.fetchTrip as jest.Mock).mockResolvedValue({
      ...mockTrip,
      role: 'MEMBER',
    });

    const { findByText, getByText, queryByText } = await render(<TripMembersScreen tripId="trip-101" />);

    expect(await findByText('Thành Viên Chuyến Đi')).toBeTruthy();
    expect(getByText('🚪 Rời khỏi chuyến đi')).toBeTruthy();
    // Member does not see transfer button or remove button
    expect(queryByText('👑 Chuyển quyền Trưởng nhóm')).toBeNull();
    expect(queryByText('Xóa')).toBeNull();
  });

  it('renders 403 Forbidden screen when access is denied', async () => {
    const error403 = new Error('Forbidden') as any;
    error403.response = { status: 403 };
    (tripFeatureApi.fetchTrip as jest.Mock).mockRejectedValue(error403);

    const { findByText } = await render(<TripMembersScreen tripId="trip-101" />);

    expect(await findByText('Bạn không có quyền xem nhóm này')).toBeTruthy();
  });
});

