import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TripsHubScreen } from '../components/TripsHubScreen';
import { authStorage } from '@/services/auth/authStorage';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useFocusEffect: (callback: () => void) => {
    callback();
  },
}));

jest.mock('@/services/auth/authStorage', () => ({
  authStorage: {
    getAccessToken: jest.fn().mockResolvedValue('mock-access-token-123'),
    getUser: jest.fn().mockResolvedValue({ id: 'user-1', email: 'va@vista.vn' }),
  },
}));

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
    jest.clearAllMocks();
    (authStorage.getAccessToken as jest.Mock).mockResolvedValue('mock-access-token-123');
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('renders header, filter tabs, primary CTA buttons, and invite section when authenticated', async () => {
    await render(
      <QueryClientProvider client={queryClient}>
        <TripsHubScreen />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Chuyến đi của bạn')).toBeTruthy();
      expect(screen.getByText('Mã mời')).toBeTruthy();
      expect(screen.getByText('Tất cả')).toBeTruthy();
      expect(screen.getByText('Đang lên kế hoạch')).toBeTruthy();
      expect(screen.getAllByText('Đang diễn ra').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Đã hoàn thành')).toBeTruthy();
      expect(screen.getByText('+ Tạo chuyến đi mới')).toBeTruthy();
      expect(screen.getByText('Thử AI lập lịch trình')).toBeTruthy();
      expect(screen.getByText('Được bạn bè mời tham gia?')).toBeTruthy();
    });
  });

  it('renders AuthGatekeeperCard when user is guest (not authenticated)', async () => {
    (authStorage.getAccessToken as jest.Mock).mockResolvedValue(null);

    await render(
      <QueryClientProvider client={queryClient}>
        <TripsHubScreen />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Chuyến đi của bạn')).toBeTruthy();
      expect(screen.getByText('Lên kế hoạch cho hành trình của bạn')).toBeTruthy();
      expect(screen.getByText('Đăng nhập / Đăng ký')).toBeTruthy();
    });
  });
});
