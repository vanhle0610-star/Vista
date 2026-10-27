import React from 'react';
import { render, fireEvent, waitFor, cleanup, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { api } from '../../../services/api/client';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('../../../services/api/client', () => ({
  api: {
    get: jest.fn(),
  },
  apiErrorMessage: jest.fn().mockReturnValue('Không thể kết nối đến máy chủ'),
}));

jest.mock('../../favorites', () => ({
  useFavorites: () => ({
    isFavorite: jest.fn().mockReturnValue(false),
    toggleFavorite: jest.fn(),
  }),
}));

const mockItems = [
  {
    id: 'dest-1',
    name: 'Cầu Rồng Đà Nẵng',
    province: 'Đà Nẵng',
    category: 'Văn hóa',
    imageUrl: 'https://example.com/cau-rong.jpg',
    priceMin: 0,
    priceMax: 0,
    latitude: 16.0611,
    longitude: 108.2272,
    status: 'PUBLISHED',
  },
  {
    id: 'dest-2',
    name: 'Bà Nà Hills',
    province: 'Đà Nẵng',
    category: 'Nghỉ dưỡng',
    imageUrl: 'https://example.com/bana.jpg',
    priceMin: 900000,
    priceMax: 1250000,
    latitude: 15.9958,
    longitude: 107.9965,
    status: 'PUBLISHED',
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

describe('DiscoverScreen Discovery & Filters Tests (TV1 W5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(api.get).mockResolvedValue({
      data: {
        items: mockItems,
        page: 0,
        size: 50,
        total: 2,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders destination list with category badges and price information', async () => {
    const queryClient = createTestQueryClient();
    const { findByText, getByText, getAllByText } = await render(
      <QueryClientProvider client={queryClient}>
        <DiscoverScreen />
      </QueryClientProvider>
    );

    expect(await findByText('Cầu Rồng Đà Nẵng', {}, { timeout: 3000 })).toBeTruthy();
    expect(getByText('Bà Nà Hills')).toBeTruthy();
    expect(getByText('Miễn phí vé vào cổng')).toBeTruthy();
    expect(getByText('900.000 đ – 1.250.000 đ')).toBeTruthy();
    expect(getAllByText('Văn hóa').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Nghỉ dưỡng').length).toBeGreaterThanOrEqual(1);
  });

  it('filters by category chip and passes category param to API', async () => {
    const queryClient = createTestQueryClient();
    const { findByText, getAllByText } = await render(
      <QueryClientProvider client={queryClient}>
        <DiscoverScreen />
      </QueryClientProvider>
    );

    await findByText('Cầu Rồng Đà Nẵng', {}, { timeout: 3000 });

    const catChip = getAllByText('Văn hóa')[0];
    await act(async () => {
      fireEvent.press(catChip);
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/destinations',
        expect.objectContaining({
          params: expect.objectContaining({
            category: 'Văn hóa',
          }),
        })
      );
    });
  });

  it('filters by max ticket price chip and passes priceMax param to API', async () => {
    const queryClient = createTestQueryClient();
    const { findByText, getByText } = await render(
      <QueryClientProvider client={queryClient}>
        <DiscoverScreen />
      </QueryClientProvider>
    );

    await findByText('Cầu Rồng Đà Nẵng', {}, { timeout: 3000 });

    const priceChip = getByText('Miễn phí (0đ)');
    await act(async () => {
      fireEvent.press(priceChip);
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/destinations',
        expect.objectContaining({
          params: expect.objectContaining({
            priceMax: 0,
          }),
        })
      );
    });
  });

  it('filters by higher budget tier (<= 500k)', async () => {
    const queryClient = createTestQueryClient();
    const { findByText, getByText } = await render(
      <QueryClientProvider client={queryClient}>
        <DiscoverScreen />
      </QueryClientProvider>
    );

    await findByText('Cầu Rồng Đà Nẵng', {}, { timeout: 3000 });

    const priceChip500k = getByText('≤ 500k');
    await act(async () => {
      fireEvent.press(priceChip500k);
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/destinations',
        expect.objectContaining({
          params: expect.objectContaining({
            priceMax: 500000,
          }),
        })
      );
    });
  });

  it('combines multiple filters (province, category, and priceMax)', async () => {
    const queryClient = createTestQueryClient();
    const { findByText, getAllByText, getByText } = await render(
      <QueryClientProvider client={queryClient}>
        <DiscoverScreen />
      </QueryClientProvider>
    );

    await findByText('Cầu Rồng Đà Nẵng', {}, { timeout: 3000 });

    await act(async () => {
      fireEvent.press(getAllByText('Đà Nẵng')[0]);
    });

    await act(async () => {
      fireEvent.press(getAllByText('Nghỉ dưỡng')[0]);
    });

    await act(async () => {
      fireEvent.press(getByText('≤ 1 triệu'));
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/destinations',
        expect.objectContaining({
          params: expect.objectContaining({
            province: 'Đà Nẵng',
            category: 'Nghỉ dưỡng',
            priceMax: 1000000,
          }),
        })
      );
    });
  });

  it('displays active filter bar and resets all filters when tapped', async () => {
    const queryClient = createTestQueryClient();
    const { findByText, getByText, queryByText, getAllByText } = await render(
      <QueryClientProvider client={queryClient}>
        <DiscoverScreen />
      </QueryClientProvider>
    );

    await findByText('Cầu Rồng Đà Nẵng', {}, { timeout: 3000 });

    const catChip = getAllByText('Văn hóa')[0];
    await act(async () => {
      fireEvent.press(catChip);
    });

    expect(await findByText('Đang áp dụng bộ lọc tùy chỉnh', {}, { timeout: 3000 })).toBeTruthy();
    const resetBtn = getByText('✕ Đặt lại tất cả');
    expect(resetBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(resetBtn);
    });

    await waitFor(() => {
      expect(queryByText('Đang áp dụng bộ lọc tùy chỉnh')).toBeNull();
    });

    expect(api.get).toHaveBeenLastCalledWith(
      '/destinations',
      expect.objectContaining({
        params: { size: 50 },
      })
    );
  });

  it('renders empty state when query returns no destinations', async () => {
    jest.mocked(api.get).mockResolvedValue({
      data: {
        items: [],
        page: 0,
        size: 50,
        total: 0,
      },
    });

    const queryClient = createTestQueryClient();
    const { findByText } = await render(
      <QueryClientProvider client={queryClient}>
        <DiscoverScreen />
      </QueryClientProvider>
    );

    expect(
      await findByText(
        'Không tìm thấy điểm đến nào phù hợp với bộ lọc hiện tại.',
        {},
        { timeout: 3000 }
      )
    ).toBeTruthy();
  });
});
