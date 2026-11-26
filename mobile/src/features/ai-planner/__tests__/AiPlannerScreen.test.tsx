import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { AiPlannerScreen } from '../screens/AiPlannerScreen';
import { expenseApi } from '../../../services/api/expenseApi';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

// Ensure React 18 act environment is enabled
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../services/api/expenseApi', () => ({
  expenseApi: {
    fetchAiQuickPlan: jest.fn(),
    fetchAiItinerarySuggestions: jest.fn(),
  },
}));

describe('AiPlannerScreen', () => {
  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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

    const { getByText, findByText } = await render(<AiPlannerScreen />);

    const generateBtn = getByText('✨ LẬP LỊCH TRÌNH TỐI ƯU');
    await act(async () => {
      fireEvent.press(generateBtn);
    });

    await findByText('✨ Gemini 2.5 Flash Live AI');
    expect(getByText(/3.200.000/)).toBeTruthy();
    expect(getByText(/THỦ QUỸ & CHIA TIỀN NHÓM/)).toBeTruthy();
    expect(getByText('Ngày 1: Biển Mỹ Khê & Bán đảo Sơn Trà')).toBeTruthy();
    expect(getByText('Bán đảo Sơn Trà & Chùa Linh Ứng')).toBeTruthy();
  });

  it('shows error state with retry button and does not inject mock data when API call fails', async () => {
    (expenseApi.fetchAiQuickPlan as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    (expenseApi.fetchAiItinerarySuggestions as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { getByText, findByText, queryByText } = await render(<AiPlannerScreen />);

    const generateBtn = getByText('✨ LẬP LỊCH TRÌNH TỐI ƯU');
    await act(async () => {
      fireEvent.press(generateBtn);
    });

    await findByText(/Không thể kết nối hoặc khởi tạo lịch trình AI lúc này/);
    expect(getByText('🔄 Thử lại')).toBeTruthy();
    // Ensure no mock data leaked
    expect(queryByText('⚡ Lộ trình chuẩn hóa')).toBeNull();
  });
});
