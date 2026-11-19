import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ItineraryScreen } from '../screens/ItineraryScreen';
import { itineraryApi } from '../api';
import { tripFeatureApi } from '@/features/trips/api';

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

jest.mock('@/features/trips/api', () => ({
  tripFeatureApi: {
    fetchTrip: jest.fn(),
  },
}));

jest.mock('../api', () => ({
  itineraryApi: {
    fetchDays: jest.fn(),
    createDay: jest.fn(),
    createItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
    reorderItems: jest.fn(),
    validateItinerary: jest.fn(),
  },
}));

describe('ItineraryScreen (Bước 2 - TV3)', () => {
  const mockDays = [
    {
      id: 'day-1',
      tripId: 'trip-101',
      dayNumber: 1,
      tripDate: '2026-06-12',
      items: [
        {
          id: 'item-1',
          dayId: 'day-1',
          customStopName: 'Bà Nà Hills & Cầu Vàng',
          startTime: '08:30:00',
          endTime: '11:30:00',
          sortOrder: 0,
          note: 'Tập trung cổng trước 15 phút',
          version: 1,
        },
        {
          id: 'item-2',
          dayId: 'day-1',
          customStopName: 'Bãi biển Mỹ Khê',
          startTime: '14:00:00',
          endTime: '17:00:00',
          sortOrder: 1,
          note: 'Tắm biển và ngắm hoàng hôn',
          version: 1,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (tripFeatureApi.fetchTrip as jest.Mock).mockResolvedValue({
      id: 'trip-101',
      title: 'Đà Nẵng hè 2026',
    });
    (itineraryApi.fetchDays as jest.Mock).mockResolvedValue(mockDays);
    (itineraryApi.validateItinerary as jest.Mock).mockResolvedValue([]);
  });

  it('renders days selector, stops list and timeline correctly', async () => {
    const { findByText, getByText, getAllByText } = await render(<ItineraryScreen tripId="trip-101" />);

    expect(await findByText('Lịch trình chuyến đi')).toBeTruthy();
    expect(getAllByText('Ngày 1').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Bà Nà Hills & Cầu Vàng')).toBeTruthy();
    expect(getByText('Bãi biển Mỹ Khê')).toBeTruthy();
    expect(getByText('08:30 - 11:30')).toBeTruthy();
    expect(getByText('14:00 - 17:00')).toBeTruthy();
    expect(getByText('Thêm điểm dừng')).toBeTruthy();
  });

  it('displays validation warning when there is a schedule conflict', async () => {
    (itineraryApi.validateItinerary as jest.Mock).mockResolvedValue([
      {
        code: 'TIME_OVERLAP',
        dayId: 'day-1',
        itemId: 'item-1',
        message: 'Trùng giờ giữa các điểm dừng',
      },
    ]);

    const { findByText } = await render(<ItineraryScreen tripId="trip-101" />);

    expect(await findByText('Trùng giờ giữa các điểm dừng')).toBeTruthy();
  });

  it('renders 403 screen when access is denied', async () => {
    const error403 = new Error('Forbidden') as any;
    error403.response = { status: 403 };
    (itineraryApi.fetchDays as jest.Mock).mockRejectedValue(error403);

    const { findByText } = await render(<ItineraryScreen tripId="trip-101" />);

    expect(await findByText('Bạn không có quyền xem lịch trình này')).toBeTruthy();
  });
});

