import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AiPlannerScreen } from '../screens/AiPlannerScreen';
import { expenseApi } from '../../../services/api/expenseApi';

jest.mock('../../../services/api/expenseApi', () => ({
  expenseApi: {
    fetchAiQuickPlan: jest.fn(),
    fetchAiItinerarySuggestions: jest.fn(),
  },
}));

describe('AiPlannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial form with inputs, chips and action button', async () => {
    await render(<AiPlannerScreen />);

    expect(screen.getByText('AI CONCIERGE · TRAVEL OPTIMIZER')).toBeTruthy();
    expect(screen.getByText('Gợi Ý Lịch Trình & Chi Phí Thông Minh')).toBeTruthy();
    expect(screen.getByText('ĐIỂM ĐẾN DU LỊCH')).toBeTruthy();
    expect(screen.getByText('SỐ NGÀY DỰ KIẾN (TỐI ĐA 7 NGÀY)')).toBeTruthy();
    expect(screen.getByText('MỨC NGÂN SÁCH CHI TIÊU')).toBeTruthy();
    expect(screen.getByText('✨ LẬP LỊCH TRÌNH TỐI ƯU')).toBeTruthy();
    expect(screen.getByText('Hạ Long')).toBeTruthy();
    expect(screen.getByText('Phú Quốc')).toBeTruthy();
  });

  it('selects destination chip when tapped', async () => {
    await render(<AiPlannerScreen />);

    const haLongChip = screen.getByText('Hạ Long');
    fireEvent.press(haLongChip);

    // Verify button remains interactable
    expect(screen.getByText('✨ LẬP LỊCH TRÌNH TỐI ƯU')).toBeTruthy();
  });

  it('generates and displays live Gemini AI verified itinerary with group treasury', async () => {
    (expenseApi.fetchAiQuickPlan as jest.Mock).mockResolvedValueOnce({
      destinationProvince: 'Đà Nẵng',
      totalDays: 2,
      budgetLevel: 'MEDIUM',
      estimatedTotalCost: 3200000,
      isMockData: false,
      days: [
        {
          dayNumber: 1,
          dateLabel: 'Ngày 1: Biển Mỹ Khê & Bán đảo Sơn Trà',
          activities: [
            {
              timeSlot: 'MORNING',
              destinationName: 'Bán đảo Sơn Trà & Chùa Linh Ứng',
              estimatedCost: 100000,
              category: 'Cảnh quan',
              note: 'Ngắm tượng Phật Bà Quan Âm 67m',
            },
          ],
        },
      ],
    });

    await render(<AiPlannerScreen />);

    const generateBtn = screen.getByText('✨ LẬP LỊCH TRÌNH TỐI ƯU');
    fireEvent.press(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('✨ Gemini 2.5 Flash Live AI')).toBeTruthy();
      expect(screen.getByText(/3.200.000/)).toBeTruthy();
      expect(screen.getByText(/THỦ QUỸ & CHIA TIỀN NHÓM/)).toBeTruthy();
      expect(screen.getByText('Ngày 1: Biển Mỹ Khê & Bán đảo Sơn Trà')).toBeTruthy();
      expect(screen.getByText('Bán đảo Sơn Trà & Chùa Linh Ứng')).toBeTruthy();
    });
  });

  it('gracefully degrades to offline curated fallback if API call fails', async () => {
    (expenseApi.fetchAiQuickPlan as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    (expenseApi.fetchAiItinerarySuggestions as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await render(<AiPlannerScreen />);

    const generateBtn = screen.getByText('✨ LẬP LỊCH TRÌNH TỐI ƯU');
    fireEvent.press(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('⚡ Lộ trình chuẩn hóa')).toBeTruthy();
      expect(screen.getByText(/Ngày 1:/)).toBeTruthy();
    });
  });
});
