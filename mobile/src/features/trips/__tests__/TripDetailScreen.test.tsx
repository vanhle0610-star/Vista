import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TripDetailScreen } from '../screens/TripDetailScreen';
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

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: any) => <View {...props} testID="mock-expo-image" />,
  };
});

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
    deleteTrip: jest.fn(),
  },
}));

describe('TripDetailScreen (Bước 1 - TV3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trip detail correctly for OWNER including Danger Zone', async () => {
    (authStorage.getUser as jest.Mock).mockResolvedValue({ id: 'user-owner' });
    (tripFeatureApi.fetchTrip as jest.Mock).mockResolvedValue({
      id: 'trip-101',
      ownerId: 'user-owner',
      title: 'Đà Nẵng: Biển xanh & Núi non',
      startDate: '2026-06-12',
      endDate: '2026-06-15',
      destinationSummary: 'Đà Nẵng, Việt Nam',
      budgetTotal: 10000000,
      budgetSpent: 7500000,
      currency: 'VND',
      status: 'ACTIVE',
      role: 'OWNER',
      members: [
        { userId: 'user-owner', displayName: 'Nguyễn Vân Anh', role: 'OWNER' },
        { userId: 'user-2', displayName: 'Trần Minh Đức', role: 'MEMBER' },
      ],
    });
    (tripFeatureApi.fetchTripMembers as jest.Mock).mockResolvedValue([
      { userId: 'user-owner', displayName: 'Nguyễn Vân Anh', role: 'OWNER' },
      { userId: 'user-2', displayName: 'Trần Minh Đức', role: 'MEMBER' },
    ]);

    const { findByText, getByText } = await render(<TripDetailScreen tripId="trip-101" />);

    expect(await findByText('Đà Nẵng: Biển xanh & Núi non')).toBeTruthy();
    expect(getByText('Đang diễn ra')).toBeTruthy();
    expect(getByText('Lịch trình')).toBeTruthy();
    expect(getByText('Thành viên')).toBeTruthy();
    expect(getByText('Ngân sách')).toBeTruthy();
    expect(getByText('👑 Bạn là Trưởng nhóm')).toBeTruthy();
    // Danger zone visible for owner
    expect(getByText('Hủy & Xóa chuyến đi này')).toBeTruthy();
  });

  it('renders trip detail for MEMBER and HIDES Danger Zone', async () => {
    (authStorage.getUser as jest.Mock).mockResolvedValue({ id: 'user-member-2' });
    (tripFeatureApi.fetchTrip as jest.Mock).mockResolvedValue({
      id: 'trip-101',
      ownerId: 'user-owner',
      title: 'Đà Nẵng: Biển xanh & Núi non',
      startDate: '2026-06-12',
      endDate: '2026-06-15',
      destinationSummary: 'Đà Nẵng, Việt Nam',
      budgetTotal: 10000000,
      currency: 'VND',
      status: 'ACTIVE',
      role: 'MEMBER',
      members: [],
    });
    (tripFeatureApi.fetchTripMembers as jest.Mock).mockResolvedValue([]);

    const { findByText, getByText, queryByText } = await render(<TripDetailScreen tripId="trip-101" />);

    expect(await findByText('Đà Nẵng: Biển xanh & Núi non')).toBeTruthy();
    expect(getByText('👤 Thành viên chuyến đi')).toBeTruthy();
    // Danger zone must be hidden for regular member
    expect(queryByText('Hủy & Xóa chuyến đi này')).toBeNull();
  });

  it('renders 403 Forbidden screen when user is not a member', async () => {
    (authStorage.getUser as jest.Mock).mockResolvedValue({ id: 'outsider-user' });
    const error403 = new Error('Forbidden') as any;
    error403.response = { status: 403 };
    (tripFeatureApi.fetchTrip as jest.Mock).mockRejectedValue(error403);

    const { findByText, getByText } = await render(<TripDetailScreen tripId="trip-secret" />);

    expect(await findByText('Bạn không có quyền xem chuyến đi này')).toBeTruthy();
    expect(getByText('Quay lại trang chủ')).toBeTruthy();
  });

  it('handles 409 Conflict when deleting a trip with unsettled debts', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    (authStorage.getUser as jest.Mock).mockResolvedValue({ id: 'user-owner' });
    (tripFeatureApi.fetchTrip as jest.Mock).mockResolvedValue({
      id: 'trip-101',
      ownerId: 'user-owner',
      title: 'Đà Nẵng: Biển xanh & Núi non',
      startDate: '2026-06-12',
      endDate: '2026-06-15',
      destinationSummary: 'Đà Nẵng, Việt Nam',
      budgetTotal: 10000000,
      currency: 'VND',
      status: 'ACTIVE',
      role: 'OWNER',
      members: [],
    });
    (tripFeatureApi.fetchTripMembers as jest.Mock).mockResolvedValue([]);

    const error409 = new Error('Conflict') as any;
    error409.response = {
      status: 409,
      data: {
        code: 'TRIP_HAS_UNSETTLED_DEBTS',
        detail: 'Chuyến đi còn khoản chi tiêu hoặc công nợ chưa quyết toán. Vui lòng vào mục Thủ quỹ để quyết toán toàn bộ trước khi xóa.',
      },
    };
    (tripFeatureApi.deleteTrip as jest.Mock).mockRejectedValueOnce(error409);

    const { findByText } = await render(<TripDetailScreen tripId="trip-101" />);

    const deleteBtn = await findByText('Hủy & Xóa chuyến đi này');
    await act(async () => {
      fireEvent.press(deleteBtn);
    });

    const confirmBtn = await findByText('Tôi hiểu, Xóa vĩnh viễn');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });

    expect(tripFeatureApi.deleteTrip).toHaveBeenCalledWith('trip-101');
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Không thể xóa chuyến đi',
        expect.stringContaining('chưa quyết toán'),
        expect.any(Array)
      );
    });
  });
});
