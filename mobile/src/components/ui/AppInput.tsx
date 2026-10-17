import { TextInput, type TextInputProps, StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';
export function AppInput(props: TextInputProps) { return <TextInput placeholderTextColor={tokens.colors.muted} style={styles.input} {...props} />; }
const styles = StyleSheet.create({ input: { minHeight: 50, borderWidth: 1, borderColor: tokens.colors.border, borderRadius: tokens.radius.md, backgroundColor: '#fff', paddingHorizontal: tokens.spacing.md, fontSize: tokens.font.body, color: tokens.colors.ink } });
