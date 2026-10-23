import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TripsHubScreen } from '../components/TripsHubScreen';

jest.mock('../../../services/api/tripApi', () => ({
  tripApi: {
    fetchMyTrips: jest.fn().mockResolvedValue([
      {
        id: 'trip-1',
        ownerId: 'user-1',
        title: 'Đà Nẵng – Hội An hè 2026',
        startDate: '2026-11-15',
        endDate: '2026-11-18',
        destinationSummary: 'Đà Nẵng – Hội An',
        budgetTotal: 25000000,
        currency: 'VND',
        status: 'ACTIVE',
        members: [
          { userId: 'u1', displayName: 'Vân Anh', email: 'va@vista.vn', role: 'OWNER' },
          { userId: 'u2', displayName: 'Tuấn', email: 'tuan@vista.vn', role: 'MEMBER' },
        ],
      },
    ]),
    createTrip: jest.fn(),
    acceptInvitation: jest.fn(),
    previewInvitation: jest.fn(),
  },
}));

jest.mock('../../../services/api/expenseApi', () => ({
  expenseApi: {
    fetchTripExpenseSummary: jest.fn().mockResolvedValue({
      tripId: 'trip-1',
      totalSpent: 14850000,
      budgetTotal: 25000000,
      remainingBudget: 10150000,
      spentPercentage: 59,
      currency: 'VND',
      settlementDeltas: {},
      suggestedTransfers: [],
    }),
  },
}));

describe('TripsHubScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('renders header, filter tabs, primary CTA buttons, and invite section', async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <TripsHubScreen />
      </QueryClientProvider>
    );

    expect(screen.getByText('Chuyến đi của bạn')).toBeTruthy();
    expect(screen.getByText('Mã mời')).toBeTruthy();
    expect(screen.getByText('Tất cả')).toBeTruthy();
    expect(screen.getByText('Đang lên kế hoạch')).toBeTruthy();
    expect(screen.getByText('Đang diễn ra')).toBeTruthy();
    expect(screen.getByText('Đã hoàn thành')).toBeTruthy();
    expect(screen.getByText('+ Tạo chuyến đi mới')).toBeTruthy();
    expect(screen.getByText('Thử AI lập lịch trình')).toBeTruthy();
    expect(screen.getByText('Được bạn bè mời tham gia?')).toBeTruthy();
  });
});
