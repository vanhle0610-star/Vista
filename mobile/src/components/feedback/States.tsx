import { ActivityIndicator, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
export function LoadingState({ label = 'Đang tải…' }: { label?: string }) { return <View style={{ alignItems: 'center', gap: 8 }}><ActivityIndicator color={tokens.colors.primary} /><AppText>{label}</AppText></View>; }
export function EmptyState({ message }: { message: string }) { return <AppText style={{ color: tokens.colors.muted }}>{message}</AppText>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <View style={{ gap: 12 }}><AppText style={{ color: tokens.colors.danger }}>{message}</AppText>{onRetry ? <AppButton label="Thử lại" onPress={onRetry} variant="secondary" /> : null}</View>; }
