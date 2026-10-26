import { render, screen } from '@testing-library/react-native';
import { LocationPermissionCard } from '../LocationPermissionCard';

it('keeps a saved defer choice quiet even when the OS permission is blocked', async () => {
  await render(<LocationPermissionCard
    status="blocked" position={null} approximate={false}
    choiceKnown automaticEnabled={false} onRequest={jest.fn()} onStop={jest.fn()}
  />);
  expect(screen.queryByText('Mở cài đặt ứng dụng')).toBeNull();
  expect(screen.queryByText('Để sau')).toBeNull();
});

it('shows the settings action after the user explicitly opts in again', async () => {
  await render(<LocationPermissionCard
    status="blocked" position={null} approximate={false}
    choiceKnown automaticEnabled onRequest={jest.fn()} onStop={jest.fn()}
  />);
  expect(screen.getByText('Mở cài đặt ứng dụng')).toBeTruthy();
  expect(screen.getByText('Tắt tự định vị')).toBeTruthy();
});
