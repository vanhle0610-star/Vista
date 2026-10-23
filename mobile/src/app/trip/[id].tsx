import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Clipboard,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { tripApi, TripDto } from '../../services/api/tripApi';
import { collaborationApi } from '../../services/api/collaborationApi';
import { ItineraryTimeline } from '../../features/itinerary/components/ItineraryTimeline';
import { ProposalList } from '../../features/voting/components/ProposalList';
import { CalendarIcon, WalletIcon } from '../../components/icons/StitchIcons';

type TabKey = 'ITINERARY' | 'VOTING' | 'MEMBERS';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('ITINERARY');

  // 1. Fetch Trip details
  const {
    data: trip,
    isLoading: isTripLoading,
    refetch: refetchTrip,
  } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripApi.fetchTrip(id as string),
    enabled: !!id,
  });

  // 2. Fetch Itinerary days
  const {
    data: itineraryDays = [],
    isLoading: isItineraryLoading,
    refetch: refetchItinerary,
  } = useQuery({
    queryKey: ['itineraryDays', id],
    queryFn: () => collaborationApi.fetchItineraryDays(id as string),
    enabled: !!id,
  });

  // 3. Fetch Proposals
  const {
    data: proposals = [],
    isLoading: isProposalsLoading,
    refetch: refetchProposals,
  } = useQuery({
    queryKey: ['proposals', id],
    queryFn: () => collaborationApi.fetchProposals(id as string),
    enabled: !!id,
  });

  const handleCopyInviteLink = () => {
    const inviteCode = id ? id.slice(0, 6).toUpperCase() : 'VISTA6';
    const link = `https://vista.app/trips/join?code=${inviteCode}`;
    Clipboard.setString(link);
    Alert.alert('Đã sao chép liên kết mời', `Liên kết: ${link}\nMã mời: ${inviteCode}`);
  };

  if (isTripLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#005ea5" />
          <Text style={styles.loadingText}>Đang tải chi tiết chuyến đi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backBtnText}>‹ Quay lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/treasury')}
          style={styles.treasuryShortcutBtn}
          activeOpacity={0.8}
        >
          <WalletIcon size={16} color="#005ea5" style={{ marginRight: 6 }} />
          <Text style={styles.treasuryShortcutText}>Thủ quỹ</Text>
        </TouchableOpacity>
      </View>

      {/* Trip Summary Card */}
      <View style={styles.tripCard}>
        <View style={styles.tripMetaRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{trip?.status || 'PLANNING'}</Text>
          </View>
          <Text style={styles.tripDateRange}>
            {trip?.startDate} – {trip?.endDate}
          </Text>
        </View>

        <Text style={styles.tripTitle}>{trip?.title || 'Chuyến đi nhóm'}</Text>
        {trip?.destinationSummary ? (
          <Text style={styles.tripDestination}>📍 {trip.destinationSummary}</Text>
        ) : null}

        {/* Member Avatar Stack & Invite Button */}
        <View style={styles.membersRow}>
          <View style={styles.avatarStack}>
            {(trip?.members || [{ displayName: 'Bạn' }]).slice(0, 4).map((m, idx) => (
              <View key={idx} style={[styles.avatarCircle, { marginLeft: idx > 0 ? -8 : 0 }]}>
                <Text style={styles.avatarInitial}>
                  {(m.displayName || 'U').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            ))}
            {(trip?.members?.length || 1) > 4 ? (
              <View style={[styles.avatarCircle, styles.avatarMore]}>
                <Text style={styles.avatarMoreText}>+{(trip?.members?.length || 1) - 4}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.inviteShareBtn}
            onPress={handleCopyInviteLink}
            activeOpacity={0.8}
          >
            <Text style={styles.inviteShareBtnText}>🔗 Mời bạn bè</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ITINERARY' && styles.tabItemActive]}
          onPress={() => setActiveTab('ITINERARY')}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'ITINERARY' && styles.tabItemTextActive,
            ]}
          >
            Lịch trình ({itineraryDays.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'VOTING' && styles.tabItemActive]}
          onPress={() => setActiveTab('VOTING')}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'VOTING' && styles.tabItemTextActive,
            ]}
          >
            Biểu quyết ({proposals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'MEMBERS' && styles.tabItemActive]}
          onPress={() => setActiveTab('MEMBERS')}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'MEMBERS' && styles.tabItemTextActive,
            ]}
          >
            Thành viên ({trip?.members?.length || 1})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.contentBody}>
        {activeTab === 'ITINERARY' ? (
          <ItineraryTimeline
            tripId={id as string}
            days={itineraryDays}
            isLoading={isItineraryLoading}
            onRefresh={() => {
              refetchItinerary();
              refetchTrip();
            }}
          />
        ) : activeTab === 'VOTING' ? (
          <ProposalList
            tripId={id as string}
            proposals={proposals}
            isLoading={isProposalsLoading}
            onRefresh={() => {
              refetchProposals();
              refetchTrip();
            }}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.membersContainer}>
            <Text style={styles.membersHeader}>Danh sách thành viên chuyến đi</Text>
            {(trip?.members || [{ displayName: 'Bạn', role: 'OWNER' }]).map((m, idx) => (
              <View key={idx} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarInitial}>
                    {(m.displayName || 'U').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.displayName || 'Thành viên'}</Text>
                  <Text style={styles.memberRole}>
                    {m.role === 'OWNER' ? '👑 Chủ chuyến đi' : 'Thành viên nhóm'}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.inviteBox}>
              <Text style={styles.inviteBoxTitle}>Mã mời tham gia chuyến đi</Text>
              <Text style={styles.inviteBoxCode}>
                {id ? id.slice(0, 6).toUpperCase() : 'VISTA6'}
              </Text>
              <Text style={styles.inviteBoxSub}>
                Chia sẻ mã này hoặc liên kết để bạn bè cùng cộng tác lịch trình và biểu quyết điểm đến.
              </Text>
              <TouchableOpacity
                style={styles.copyInviteBtn}
                onPress={handleCopyInviteLink}
              >
                <Text style={styles.copyInviteBtnText}>Sao chép liên kết mời</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#005ea5',
  },
  treasuryShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  treasuryShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#005ea5',
  },
  tripCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tripMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005ea5',
  },
  tripDateRange: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  tripTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
  },
  membersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#005ea5',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarMore: {
    backgroundColor: '#e2e8f0',
  },
  avatarMoreText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  inviteShareBtn: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  inviteShareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#005ea5',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabItemTextActive: {
    color: '#005ea5',
    fontWeight: '800',
  },
  contentBody: {
    flex: 1,
  },
  membersContainer: {
    padding: 16,
  },
  membersHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#005ea5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarInitial: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  memberRole: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  inviteBox: {
    marginTop: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  inviteBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inviteBoxCode: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#005ea5',
    marginVertical: 6,
  },
  inviteBoxSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
  },
  copyInviteBtn: {
    backgroundColor: '#005ea5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  copyInviteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
