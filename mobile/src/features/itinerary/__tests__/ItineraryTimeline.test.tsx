import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ItineraryTimeline } from '../components/ItineraryTimeline';
import { ItineraryDayDto } from '../../../services/api/collaborationApi';

describe('ItineraryTimeline Component', () => {
  const mockDays: ItineraryDayDto[] = [
    {
      id: 'day-1',
      tripId: 'trip-1',
      dayNumber: 1,
      tripDate: '2026-11-10',
      items: [
        {
          id: 'item-1',
          dayId: 'day-1',
          customStopName: 'Cầu Rồng Đà Nẵng',
          startTime: '08:30:00',
          endTime: '10:30:00',
          sortOrder: 0,
          note: 'Ngắm cầu rồng phun lửa & check-in',
        },
        {
          id: 'item-2',
          dayId: 'day-1',
          customStopName: 'Bãi biển Mỹ Khê',
          startTime: '15:00:00',
          endTime: '18:00:00',
          sortOrder: 1,
          note: 'Tắm biển và chơi thể thao nước',
        },
      ],
    },
    {
      id: 'day-2',
      tripId: 'trip-1',
      dayNumber: 2,
      tripDate: '2026-11-11',
      items: [],
    },
  ];

  it('renders days tabs and itinerary stops for selected day', async () => {
    const handleRefresh = jest.fn();

    const { getByText } = await render(
      <ItineraryTimeline
        tripId="trip-1"
        days={mockDays}
        onRefresh={handleRefresh}
      />
    );

    // Verify Day chips
    expect(getByText('Ngày 1')).toBeTruthy();
    expect(getByText('Ngày 2')).toBeTruthy();

    // Verify stops on Day 1
    expect(getByText('Cầu Rồng Đà Nẵng')).toBeTruthy();
    expect(getByText('Ngắm cầu rồng phun lửa & check-in')).toBeTruthy();
    expect(getByText('Bãi biển Mỹ Khê')).toBeTruthy();
  });

  it('switches to Day 2 and shows empty state', async () => {
    const handleRefresh = jest.fn();

    const { getByText, getByTestId } = await render(
      <ItineraryTimeline
        tripId="trip-1"
        days={mockDays}
        onRefresh={handleRefresh}
      />
    );

    const day2Chip = getByTestId('day-chip-2');
    fireEvent.press(day2Chip);

    await waitFor(() => {
      expect(getByText('Lịch trình Ngày 2')).toBeTruthy();
      expect(getByText('Chưa có điểm dừng nào')).toBeTruthy();
    });
  });
});

