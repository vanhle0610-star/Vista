import { Component, lazy, Suspense, type ReactNode } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ActivityIndicator, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { MapViewAdapterProps } from './types';
export type { MapViewAdapterProps, MapMarker } from './types';
const NativeMap = lazy(() => import('./NativeMap'));
class NativeMapBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <AppText>
        Không mở được bản đồ. Hãy kiểm tra kết nối hoặc cài lại bản VISTA hỗ trợ bản đồ.
      </AppText>
    ) : (
      this.props.children
    );
  }
}
export function MapViewAdapter(props: MapViewAdapterProps) {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return (
      <View style={props.style}>
        <AppText>
          Bản ứng dụng hiện tại chưa hỗ trợ bản đồ. Hãy dùng bản VISTA Android/iOS theo hướng dẫn bàn giao.
        </AppText>
      </View>
    );
  }
  return (
    <NativeMapBoundary>
      <Suspense
        fallback={
          <ActivityIndicator accessibilityLabel="Đang mở bản đồ" />
        }
      >
        <NativeMap {...props} />
      </Suspense>
    </NativeMapBoundary>
  );
}
