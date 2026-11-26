import { autoGenerateTripItinerary } from '../utils/autoGenerateTripItinerary';
import { expenseApi } from '@/services/api/expenseApi';
import { tripApi } from '@/services/api/tripApi';

jest.mock('@/services/api/expenseApi', () => ({
  expenseApi: {
    fetchAiItinerarySuggestions: jest.fn(),
    fetchAiQuickPlan: jest.fn(),
  },
}));

jest.mock('@/services/api/tripApi', () => ({
  tripApi: {
    createItineraryDay: jest.fn(),
    createItineraryItem: jest.fn(),
  },
}));

describe('autoGenerateTripItinerary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates days and stops from AI suggestions when destination is provided', async () => {
    (expenseApi.fetchAiItinerarySuggestions as jest.Mock).mockResolvedValueOnce({
      destinationProvince: 'Đà Lạt',
      totalDays: 2,
      budgetLevel: 'MEDIUM',
      estimatedTotalCost: 3500000,
      isMockData: false,
      days: [
        {
          dayNumber: 1,
          dateLabel: 'Ngày 1',
          activities: [
            {
              destinationId: 'dest-1',
              timeSlot: 'MORNING',
              destinationName: 'Hồ Xuân Hương',
              category: 'Thắng cảnh',
              note: 'Dạo bộ sáng',
              estimatedCost: 50000,
            },
          ],
        },
        {
          dayNumber: 2,
          dateLabel: 'Ngày 2',
          activities: [
            {
              timeSlot: 'AFTERNOON',
              destinationName: 'Dinh Bảo Đại',
              category: 'Di tích',
              note: 'Tham quan di tích',
              estimatedCost: 80000,
            },
          ],
        },
      ],
    });
    (tripApi.createItineraryDay as jest.Mock)
      .mockResolvedValueOnce({ id: 'day-1' })
      .mockResolvedValueOnce({ id: 'day-2' });
    (tripApi.createItineraryItem as jest.Mock).mockResolvedValue({ id: 'item-ok' });

    const res = await autoGenerateTripItinerary({
      tripId: 'trip-new',
      destinationSummary: 'Đà Lạt',
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      budgetTotal: 6000000,
    });

    expect(res).toEqual({ generatedDays: 2, generatedStops: 2 });
    expect(tripApi.createItineraryDay).toHaveBeenNthCalledWith(1, 'trip-new', 1, '2026-12-01');
    expect(tripApi.createItineraryDay).toHaveBeenNthCalledWith(2, 'trip-new', 2, '2026-12-02');
    expect(tripApi.createItineraryItem).toHaveBeenCalledWith('day-1', {
      destinationId: 'dest-1',
      customStopName: 'Hồ Xuân Hương',
      startTime: '08:30',
      endTime: '11:00',
      sortOrder: 0,
      costVnd: 50000,
      note: 'Dạo bộ sáng',
    });
  });

  it('skips AI generation gracefully when destinationSummary is empty', async () => {
    const res = await autoGenerateTripItinerary({
      tripId: 'trip-empty',
      destinationSummary: '',
      startDate: '2026-12-01',
      endDate: '2026-12-02',
    });

    expect(res).toEqual({ generatedDays: 0, generatedStops: 0 });
    expect(expenseApi.fetchAiItinerarySuggestions).not.toHaveBeenCalled();
  });

  it('normalizes Phú Quốc to Kiên Giang and creates empty day tabs if AI fails', async () => {
    (expenseApi.fetchAiItinerarySuggestions as jest.Mock).mockRejectedValueOnce(new Error('400'));
    (expenseApi.fetchAiQuickPlan as jest.Mock).mockRejectedValueOnce(new Error('400'));
    (tripApi.createItineraryDay as jest.Mock)
      .mockResolvedValueOnce({ id: 'd1' })
      .mockResolvedValueOnce({ id: 'd2' });

    const res = await autoGenerateTripItinerary({
      tripId: 'trip-pq',
      destinationSummary: 'Phú Quốc',
      startDate: '2026-12-01',
      endDate: '2026-12-02',
    });

    expect(expenseApi.fetchAiItinerarySuggestions).toHaveBeenCalledWith(
      'trip-pq',
      expect.objectContaining({ destinationProvince: 'Kiên Giang' })
    );
    expect(res).toEqual({ generatedDays: 2, generatedStops: 0 });
  });
});
