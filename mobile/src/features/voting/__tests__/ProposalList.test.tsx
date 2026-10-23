import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProposalList } from '../components/ProposalList';
import { ProposalDto } from '../../../services/api/collaborationApi';

describe('ProposalList Component', () => {
  const mockProposals: ProposalDto[] = [
    {
      id: 'prop-1',
      tripId: 'trip-1',
      proposedBy: 'user-1',
      title: 'Cà phê ngắm hoàng hôn Bán đảo Sơn Trà',
      status: 'OPEN',
      createdAt: '2026-11-09T10:00:00Z',
      votes: [],
      upVotes: 4,
      downVotes: 1,
    },
    {
      id: 'prop-2',
      tripId: 'trip-1',
      proposedBy: 'user-2',
      title: 'Trải nghiệm du thuyền sông Hàn về đêm',
      status: 'ACCEPTED',
      createdAt: '2026-11-09T11:00:00Z',
      votes: [],
      upVotes: 5,
      downVotes: 0,
    },
  ];

  it('renders proposal list with title and vote counts', async () => {
    const handleRefresh = jest.fn();

    const { getByText } = await render(
      <ProposalList
        tripId="trip-1"
        proposals={mockProposals}
        onRefresh={handleRefresh}
      />
    );

    expect(getByText('Đề xuất & Biểu quyết')).toBeTruthy();
    expect(getByText('Cà phê ngắm hoàng hôn Bán đảo Sơn Trà')).toBeTruthy();
    expect(getByText('Trải nghiệm du thuyền sông Hàn về đêm')).toBeTruthy();
    expect(getByText('Đang biểu quyết')).toBeTruthy();
    expect(getByText('Đã duyệt vào lịch trình')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('renders empty state when no proposals exist', async () => {
    const handleRefresh = jest.fn();

    const { getByText } = await render(
      <ProposalList
        tripId="trip-1"
        proposals={[]}
        onRefresh={handleRefresh}
      />
    );

    expect(getByText('Chưa có đề xuất nào')).toBeTruthy();
    expect(getByText('+ Đề xuất địa điểm mới')).toBeTruthy();
  });
});
