import { render, screen, fireEvent } from '@testing-library/react-native';
import NativeMap from '../NativeMap';
jest.mock('@maplibre/maplibre-react-native', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    TransformRequestManager: { addHeader: jest.fn() },
    Map: (props: object) => <MockView testID="sdk-map" {...props} />,
    Camera: (props: object) => <MockView testID="sdk-camera" {...props} />,
    ViewAnnotation: (props: { id: string }) => (
      <MockView testID={`marker-${props.id}`} {...props} />
    ),
    GeoJSONSource: MockView,
    Layer: MockView,
  };
});
const marker = {
  id: 'bridge',
  title: 'Cầu Rồng',
  latitude: 16.061,
  longitude: 108.228,
};
it('renders native SDK markers, preserves lng/lat order and reports the selected destination', async () => {
  const selected = jest.fn();
  await render(
    <NativeMap
      center={marker}
      markers={[marker]}
      onMarkerPress={selected}
      selectedDestinationId="bridge"
    />,
  );
  expect(screen.getByTestId('sdk-camera').props.center).toEqual([
    108.228, 16.061,
  ]);
  expect(screen.getByTestId('marker-bridge').props.selected).toBe(true);
  await fireEvent.press(screen.getByTestId('marker-bridge'));
  expect(selected).toHaveBeenCalledWith(marker);
  await fireEvent(screen.getByTestId('sdk-map'), 'onDidFinishLoadingMap');
});
it('shows map failure with an explicit retry action', async () => {
  await render(<NativeMap center={marker} />);
  await fireEvent(screen.getByTestId('sdk-map'), 'onDidFailLoadingMap');
  expect(screen.getByText(/Không tải được bản đồ/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Tải lại bản đồ'));
  expect(screen.getByText('Đang tải bản đồ…')).toBeTruthy();
  await fireEvent(screen.getByTestId('sdk-map'), 'onDidFinishLoadingMap');
  expect(screen.getByText('Chưa có địa điểm có tọa độ hợp lệ.')).toBeTruthy();
});
