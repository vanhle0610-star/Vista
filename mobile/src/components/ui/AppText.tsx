import { Text, type TextProps } from 'react-native';
import { tokens } from '@/theme/tokens';

export function AppText({ style, ...props }: TextProps) {
  return <Text style={[{ color: tokens.colors.ink, fontSize: tokens.font.body, lineHeight: 24 }, style]} {...props} />;
}
