import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';

export interface AvatarMember {
  name: string;
  avatar?: string;
  color?: string;
}

export interface AvatarGroupProps {
  members: AvatarMember[];
  max?: number;
  size?: number;
}

function getInitials(name = ''): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'VI';
}

export function AvatarGroup({ members = [], max = 3, size = 30 }: AvatarGroupProps) {
  const visible = members.slice(0, max);
  const remaining = members.length - max;

  return (
    <View style={styles.container}>
      {visible.map((m, idx) => {
        const isPhoto = m.avatar && (m.avatar.startsWith('http') || m.avatar.startsWith('data:'));
        const bg = m.color || tokens.colors.primary;

        return (
          <View
            key={`${m.name}-${idx}`}
            style={[
              styles.avatarWrapper,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: idx === 0 ? 0 : -8,
                backgroundColor: bg,
                zIndex: max - idx,
              },
            ]}
          >
            {isPhoto ? (
              <Image
                source={{ uri: m.avatar }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
              />
            ) : (
              <Text style={[styles.initials, { fontSize: Math.max(10, Math.round(size * 0.38)) }]}>
                {getInitials(m.name)}
              </Text>
            )}
          </View>
        );
      })}

      {remaining > 0 ? (
        <View
          style={[
            styles.avatarWrapper,
            styles.badgeMore,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -8,
              zIndex: 0,
            },
          ]}
        >
          <Text style={[styles.moreText, { fontSize: Math.max(9, Math.round(size * 0.35)) }]}>
            +{remaining}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  badgeMore: {
    backgroundColor: '#E2E8F0',
  },
  moreText: {
    color: '#334155',
    fontWeight: '700',
  },
});

