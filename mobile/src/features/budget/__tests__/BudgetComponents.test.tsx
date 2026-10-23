import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BudgetSummaryCard } from '../components/BudgetSummaryCard';
import { ExpenseItem } from '../components/ExpenseItem';
import { SettlementDeltaRow } from '../components/SettlementDeltaRow';

describe('Budget UI Components', () => {
  describe('BudgetSummaryCard', () => {
    it('renders total expenditure and avail budget accurately', async () => {
      await render(
        <BudgetSummaryCard totalSpent={3450000} budgetTotal={5000000} currency="VND" />
      );

      expect(screen.getByText('NGÂN QUỸ KHẢ DỤNG')).toBeTruthy();
      expect(screen.getByText('MỨC CHI AN TOÀN')).toBeTruthy();
      expect(screen.getByText('Tổng dự toán')).toBeTruthy();
      expect(screen.getByText('Đã chi')).toBeTruthy();
      expect(screen.getByText(/1.550.000/)).toBeTruthy();
      expect(screen.getByText(/3.450.000/)).toBeTruthy();
    });

    it('renders over budget badge when spending exceeds target', async () => {
      await render(
        <BudgetSummaryCard totalSpent={5500000} budgetTotal={5000000} currency="VND" />
      );

      expect(screen.getByText('VƯỢT HẠN MỨC')).toBeTruthy();
      expect(screen.getByText(/5.500.000/)).toBeTruthy();
    });
  });

  describe('ExpenseItem', () => {
    it('renders title, amount and typographic category pill', async () => {
      await render(
        <ExpenseItem
          title="Nam Danh Seafood Table"
          amount={900000}
          currency="VND"
          paidByName="Van Anh"
          category="FOOD"
        />
      );

      expect(screen.getByText('Nam Danh Seafood Table')).toBeTruthy();
      expect(screen.getByText('ẨM THỰC')).toBeTruthy();
      expect(screen.getByText(/Van Anh đã trả • Chia đều/)).toBeTruthy();
      expect(screen.getByText(/900.000/)).toBeTruthy();
      expect(screen.getByText(/Phần bạn:/)).toBeTruthy();
    });
  });

  describe('SettlementDeltaRow', () => {
    it('renders financial position and transfer actions', async () => {
      await render(<SettlementDeltaRow myBalance={1250000} />);

      expect(screen.getByText('VỊ THẾ TÀI CHÍNH CỦA BẠN')).toBeTruthy();
      expect(screen.getByText('Bạn sẽ nhận lại')).toBeTruthy();
      expect(screen.getByText(/\+1.250.000 ₫/)).toBeTruthy();
      expect(screen.getAllByText('SAO CHÉP STK').length).toBeGreaterThan(0);
    });
  });

  describe('AddExpenseModal', () => {
    it('renders modal with quick chips and split calculation insight', async () => {
      const mockMembers = [
        { id: '1', initials: 'VA', name: 'Van Anh' },
        { id: '2', initials: 'TU', name: 'Tuan' },
        { id: '3', initials: 'NM', name: 'Nam' },
      ];

      await render(
        <React.Fragment>
          {React.createElement(
            require('../components/AddExpenseModal').AddExpenseModal,
            {
              visible: true,
              onClose: jest.fn(),
              onSubmit: jest.fn(),
              members: mockMembers,
              currency: 'VND',
            }
          )}
        </React.Fragment>
      );

      expect(screen.getByText('RECORD NEW EXPENSE')).toBeTruthy();
      expect(screen.getByText('+100k')).toBeTruthy();
      expect(screen.getByText('+500k')).toBeTruthy();
      expect(screen.getByText('SMART SPLIT CALCULATION')).toBeTruthy();
      expect(screen.getByText('CONFIRM TRANSACTION →')).toBeTruthy();
    }, 15000);
  });
});
