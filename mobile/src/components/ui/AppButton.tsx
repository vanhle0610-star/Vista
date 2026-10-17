import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { tokens } from '@/theme/tokens';

export function AppButton({ label, onPress, variant = 'primary', disabled = false }: { label: string; onPress?: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.base, variant === 'secondary' && styles.secondary, (pressed || disabled) && styles.dimmed]}><AppText style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</AppText></Pressable>;
}
const styles = StyleSheet.create({ base: { backgroundColor: tokens.colors.primary, borderRadius: tokens.radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: tokens.spacing.lg }, secondary: { backgroundColor: tokens.colors.surface, borderWidth: 1, borderColor: tokens.colors.primary }, label: { color: '#fff', fontWeight: '700' }, secondaryLabel: { color: tokens.colors.primary }, dimmed: { opacity: 0.55 } });
