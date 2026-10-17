import { SafeAreaView, ScrollView, StyleSheet, type ViewProps } from 'react-native';
import { tokens } from '@/theme/tokens';
export function ScreenContainer({ children }: ViewProps) { return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>{children}</ScrollView></SafeAreaView>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: tokens.colors.canvas }, content: { flexGrow: 1, padding: tokens.spacing.lg, gap: tokens.spacing.md } });
