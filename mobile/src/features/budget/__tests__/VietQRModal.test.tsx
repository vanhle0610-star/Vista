import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VietQRModal } from '../components/VietQRModal';

describe('VietQRModal Component', () => {
  it('renders VietQR modal with bank details, beneficiary and transfer amount', async () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    await render(
      <VietQRModal
        visible={true}
        onClose={handleClose}
        onConfirmPaid={handleConfirm}
        receiverName="TRẦN VÂN ÁNH"
        accountNumber="0984838888"
        bankName="MB Bank"
        bankCode="MB"
        amount={750000}
        memo="VISTA Quyet toan chi phi"
      />
    );

    expect(screen.getByText('Thanh toán VietQR')).toBeTruthy();
    expect(screen.getByText('Quét mã chuyển khoản tức thì qua Napas 247')).toBeTruthy();
    expect(screen.getByText('TRẦN VÂN ÁNH')).toBeTruthy();
    expect(screen.getByText('0984838888')).toBeTruthy();
    expect(screen.getByText('MB Bank')).toBeTruthy();
    expect(screen.getByText(/750.000 đ/)).toBeTruthy();
    expect(screen.getByText('VISTA Quyet toan chi phi')).toBeTruthy();
    expect(screen.getByText('✓ Đã chuyển khoản xong')).toBeTruthy();
  });

  it('triggers onConfirmPaid when confirm button is pressed', async () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    await render(
      <VietQRModal
        visible={true}
        onClose={handleClose}
        onConfirmPaid={handleConfirm}
        receiverName="TRẦN VÂN ÁNH"
        accountNumber="0984838888"
        bankCode="MB"
        amount={500000}
      />
    );

    const confirmBtn = screen.getByText('✓ Đã chuyển khoản xong');
    fireEvent.press(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('displays warning when receiver has not configured payout account', async () => {
    const handleClose = jest.fn();

    await render(
      <VietQRModal
        visible={true}
        onClose={handleClose}
        amount={500000}
      />
    );

    expect(screen.getByText('Người nhận chưa thiết lập tài khoản nhận tiền')).toBeTruthy();
    expect(screen.queryByText('✓ Đã chuyển khoản xong')).toBeNull();
  });
});
