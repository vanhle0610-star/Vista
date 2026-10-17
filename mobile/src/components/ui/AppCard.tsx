import { View, type ViewProps, StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';
export function AppCard({ style, ...props }: ViewProps) { return <View style={[styles.card, style]} {...props} />; }
const styles = StyleSheet.create({ card: { backgroundColor: tokens.colors.surface, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: tokens.colors.border, padding: tokens.spacing.lg, gap: tokens.spacing.sm } });
