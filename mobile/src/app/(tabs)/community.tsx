import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppText } from '../../components/ui/AppText';
import { EmptyState } from '../../components/feedback/States';
import { tokens } from '../../theme/tokens';

export default function CommunityRoute() {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText style={styles.title}>Cộng đồng du lịch</AppText>
        <AppText style={styles.subtitle}>
          Không gian chia sẻ kinh nghiệm, bài viết và check-in của cộng đồng du lịch VISTA.
        </AppText>
      </View>

      <View style={styles.content}>
        <EmptyState message="Chưa có bài viết mới. Tính năng bài đăng và kiểm duyệt thuộc BF-06 (W3/W4)." />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: tokens.colors.ink,
  },
  subtitle: {
    fontSize: 13.5,
    color: tokens.colors.muted,
    lineHeight: 19,
  },
  content: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
