import React from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { AppText } from './AppText';
import { tokens } from '@/theme/tokens';

export interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ai' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  labelStyle,
}: AppButtonProps) {
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!isInteractive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant] as ViewStyle,
        fullWidth ? styles.fullWidth : null,
        pressed ? (styles[`${variant}Pressed` as keyof typeof styles] as ViewStyle) : null,
        !isInteractive ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'outline' ? tokens.colors.primary : '#FFFFFF'}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
          <AppText
            style={[
              styles.label,
              styles[`${variant}Label` as keyof typeof styles] as TextStyle,
              labelStyle,
            ]}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg,
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },

  // 1. Primary Sky Blue
  primary: {
    backgroundColor: tokens.colors.primary,
    ...tokens.shadows.buttonPrimary,
  },
  primaryPressed: {
    backgroundColor: tokens.colors.primaryDark,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: tokens.font.body,
  },

  // 2. Secondary (Soft tint)
  secondary: {
    backgroundColor: tokens.colors.primarySoft,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
  },
  secondaryPressed: {
    backgroundColor: '#E0F2FE',
  },
  secondaryLabel: {
    color: tokens.colors.primary,
    fontWeight: '700',
    fontSize: tokens.font.body,
  },

  // 3. Outline (Clean White Card style)
  outline: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1.5,
    borderColor: tokens.colors.border,
  },
  outlinePressed: {
    backgroundColor: tokens.colors.surfaceSubtle,
    borderColor: tokens.colors.primary,
  },
  outlineLabel: {
    color: tokens.colors.ink,
    fontWeight: '600',
    fontSize: tokens.font.body,
  },

  // 4. AI Deep Teal
  ai: {
    backgroundColor: tokens.colors.aiTeal,
    ...tokens.shadows.buttonAi,
  },
  aiPressed: {
    backgroundColor: tokens.colors.aiTealPressed,
  },
  aiLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: tokens.font.body,
  },

  // 5. Danger
  danger: {
    backgroundColor: tokens.colors.danger,
  },
  dangerPressed: {
    backgroundColor: '#DC2626',
  },
  dangerLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: tokens.font.body,
  },

  label: {
    fontWeight: '700',
    fontSize: tokens.font.body,
  },
});
