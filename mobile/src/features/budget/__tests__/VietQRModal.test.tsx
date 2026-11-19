import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VietQRModal } from '../components/VietQRModal';

describe('VietQRModal Component', () => {
  // Case 1: Mã ngân hàng hợp lệ và số tài khoản hợp lệ
  it('Case 1: renders VietQR modal with bank details when bankCode and accountNumber are valid', async () => {
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

  // Case 2: Chỉ có tên ngân hàng, không có mã ngân hàng
  it('Case 2: blocks QR creation when bankName is present but bankCode is missing', async () => {
    const handleClose = jest.fn();

    await render(
      <VietQRModal
        visible={true}
        onClose={handleClose}
        receiverName="NGUYỄN VĂN B"
        accountNumber="1903678999"
        bankName="Ngân hàng Ngoại thương Việt Nam"
        bankCode=""
        amount={300000}
      />
    );

    expect(screen.getByText('Người nhận chưa thiết lập tài khoản nhận tiền')).toBeTruthy();
    expect(screen.getByText(/Chưa xác định được mã ngân hàng hợp lệ/)).toBeTruthy();
    expect(screen.queryByText('✓ Đã chuyển khoản xong')).toBeNull();
  });

  // Case 3: Có số tài khoản nhưng thiếu ngân hàng
  it('Case 3: blocks QR creation when account number exists but bank info is missing', async () => {
    const handleClose = jest.fn();

    await render(
      <VietQRModal
        visible={true}
        onClose={handleClose}
        receiverName="NGUYỄN VĂN C"
        accountNumber="0123456789"
        bankCode=""
        bankName=""
        amount={450000}
      />
    );

    expect(screen.getByText('Người nhận chưa thiết lập tài khoản nhận tiền')).toBeTruthy();
    expect(screen.getByText(/Chưa xác định được mã ngân hàng hợp lệ/)).toBeTruthy();
    expect(screen.queryByText('✓ Đã chuyển khoản xong')).toBeNull();
  });

  // Case 4: Thiếu cả số tài khoản và ngân hàng
  it('Case 4: blocks QR creation when both account number and bank info are missing', async () => {
    const handleClose = jest.fn();

    await render(
      <VietQRModal
        visible={true}
        onClose={handleClose}
        receiverName="NGUYỄN VĂN D"
        accountNumber=""
        bankCode=""
        bankName=""
        amount={500000}
      />
    );

    expect(screen.getByText('Người nhận chưa thiết lập tài khoản nhận tiền')).toBeTruthy();
    expect(
      screen.getByText(
        'Thành viên này chưa liên kết tài khoản ngân hàng và mã ngân hàng thụ hưởng trong hệ thống VISTA.'
      )
    ).toBeTruthy();
    expect(screen.queryByText('✓ Đã chuyển khoản xong')).toBeNull();
  });

  // Case 5: Ngân hàng khác MB Bank (Techcombank / TCB)
  it('Case 5: renders correctly with another bank (Techcombank TCB) without defaulting to MB', async () => {
    const handleClose = jest.fn();

    await render(
      <VietQRModal
        visible={true}
        onClose={handleClose}
        receiverName="LÊ HOÀNG NAM"
        accountNumber="1903678999"
        bankCode="TCB"
        bankName="Techcombank"
        amount={1200000}
      />
    );

    expect(screen.getByText('Techcombank')).toBeTruthy();
    expect(screen.getByText('1903678999')).toBeTruthy();
    expect(screen.getByText('LÊ HOÀNG NAM')).toBeTruthy();
    expect(screen.getByText(/1.200.000 đ/)).toBeTruthy();
    expect(screen.queryByText('MB Bank')).toBeNull();
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

  it('updates beneficiary and amount when switching recipient props', async () => {
    const handleClose = jest.fn();
    const { rerender } = await render(
      <VietQRModal
        visible={true}
        onClose={handleClose}
        receiverName="NGUYỄN VĂN A"
        accountNumber="1111222233"
        bankCode="VCB"
        bankName="Vietcombank"
        amount={300000}
      />
    );

    expect(screen.getByText('NGUYỄN VĂN A')).toBeTruthy();
    expect(screen.getByText('1111222233')).toBeTruthy();
    expect(screen.getByText(/300.000 đ/)).toBeTruthy();

    await rerender(
      <VietQRModal
        visible={true}
        onClose={handleClose}
        receiverName="TRẦN THỊ B"
        accountNumber="9999888877"
        bankCode="BIDV"
        bankName="BIDV"
        amount={850000}
      />
    );

    expect(screen.getByText('TRẦN THỊ B')).toBeTruthy();
    expect(screen.getByText('9999888877')).toBeTruthy();
    expect(screen.getByText(/850.000 đ/)).toBeTruthy();
    expect(screen.queryByText('NGUYỄN VĂN A')).toBeNull();
  });
});
