import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CommunityScreen } from '../CommunityScreen';
import { api } from '@/services/api/client';
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-router', () => ({ useIsFocused: () => true, router: { push: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'qa-request-id' }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@/services/auth/authStorage', () => ({
  authStorage: {
    getUser: jest.fn().mockResolvedValue({ id: 'qa-user' }),
    getAccessToken: jest.fn().mockResolvedValue('qa-test-token'),
  },
}));
jest.mock('@/services/api/client', () => ({
  api: {
    get: jest.fn(), post: jest.fn(), delete: jest.fn().mockResolvedValue({}),
    defaults: { baseURL: 'http://localhost/api/v1' },
  },
  apiErrorMessage: () => 'Không kết nối được máy chủ.',
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.get).mockResolvedValue({ data: { items: [], total: 0, page: 0, size: 10 } });
});

it('retains a draft on an ambiguous send error and retries the same request ID', async () => {
  jest.mocked(api.post)
    .mockRejectedValueOnce(new Error('network failed after send'))
    .mockResolvedValueOnce({ data: { id: 'saved' } });
  await render(<CommunityScreen />);
  const input = await screen.findByLabelText('Nội dung bài đăng');
  await fireEvent.changeText(input, 'Bản nháp cần giữ');
  await fireEvent.press(screen.getByText('Đăng bài'));
  await screen.findByText('Thử gửi lại');
  expect(screen.getByLabelText('Nội dung bài đăng').props.value).toBe('Bản nháp cần giữ');
  await fireEvent.press(screen.getByText('Thử gửi lại'));
  await waitFor(() => expect(screen.getByLabelText('Nội dung bài đăng').props.value).toBe(''));
  const calls = jest.mocked(api.post).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[0][1]).toEqual(calls[1][1]);
  expect(calls[0][1]).toMatchObject({ body: 'Bản nháp cần giữ', clientRequestId: 'qa-request-id' });
}, 30000);

it('retains text and image preview after an upload failure and never submits the post', async () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///qa.png', width: 2, height: 2, mimeType: 'image/png', fileSize: 100 }],
  });
  jest.mocked(api.post).mockRejectedValueOnce(new Error('storage unavailable'));
  await render(<CommunityScreen />);
  await fireEvent.changeText(await screen.findByLabelText('Nội dung bài đăng'), 'Bài có ảnh');
  await fireEvent.press(screen.getByText('Chọn ảnh'));
  await screen.findByText('Bỏ ảnh 1');
  await fireEvent.press(screen.getByText('Đăng bài'));
  await screen.findByText('Không kết nối được máy chủ.');
  expect(screen.getByLabelText('Nội dung bài đăng').props.value).toBe('Bài có ảnh');
  expect(screen.getByText('Bỏ ảnh 1')).toBeTruthy();
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(jest.mocked(api.post).mock.calls[0][0]).toBe('/post-uploads');
}, 15000);
