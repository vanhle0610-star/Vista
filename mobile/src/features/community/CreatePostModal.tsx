import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type * as ImagePicker from 'expo-image-picker';
import { AppText } from '@/components/ui/AppText';
import { tokens } from '@/theme/tokens';
import {
  ArrowLeftIcon,
  GlobeIcon,
  CloseIcon,
  PhotoIcon,
  PinIcon,
  SmileIcon,
} from '@/components/icons/StitchIcons';
import { PlacePicker, FeelingPicker } from './CommunityTools';
import { FEELINGS, type FeelingCode, type Place } from './model';

export interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  viewer: { displayName?: string; avatarUrl?: string | null } | null;
  body: string;
  setBody: (text: string) => void;
  photos: Array<{ asset: ImagePicker.ImagePickerAsset; uploadId?: string }>;
  onPickPhoto: () => Promise<void>;
  onRemovePhoto: (index: number) => void;
  place: Place | null;
  setPlace: (place: Place | null) => void;
  feeling: FeelingCode | null;
  setFeeling: (feeling: FeelingCode | null) => void;
  onPublish: () => Promise<void>;
  submitting: boolean;
  pendingPayload: boolean;
  error?: string;
}

export function CreatePostModal({
  visible,
  onClose,
  viewer,
  body,
  setBody,
  photos,
  onPickPhoto,
  onRemovePhoto,
  place,
  setPlace,
  feeling,
  setFeeling,
  onPublish,
  submitting,
  pendingPayload,
  error,
}: CreatePostModalProps) {
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);

  const selectedFeelingObj = feeling
    ? FEELINGS.find((f) => f.code === feeling)
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header: Back, Title, Publish button */}
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={onClose}
              style={styles.headerIconBtn}
            >
              <ArrowLeftIcon size={22} color={tokens.colors.ink} />
            </TouchableOpacity>

            <AppText style={styles.headerTitle}>Tạo bài viết</AppText>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={pendingPayload ? 'Thử gửi lại' : 'Đăng bài'}
              activeOpacity={0.8}
              style={[
                styles.publishBtn,
                (!body.trim() || submitting) && styles.publishBtnDisabled,
              ]}
              disabled={!body.trim() || submitting}
              onPress={async () => {
                await onPublish();
                if (!error) {
                  onClose();
                }
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <AppText style={styles.publishBtnText}>
                  {pendingPayload ? 'Thử lại' : 'Đăng'}
                </AppText>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Author Profile Row */}
            <View style={styles.authorRow}>
              <Image
                source={{
                  uri:
                    viewer?.avatarUrl ||
                    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&q=80',
                }}
                style={styles.avatar}
              />
              <View style={styles.authorCol}>
                <AppText style={styles.authorName}>
                  {viewer?.displayName || 'Người dùng VISTA'}
                </AppText>
                <View style={styles.privacyBadge}>
                  <GlobeIcon size={12} color="#64748B" />
                  <AppText style={styles.privacyText}>Công khai</AppText>
                </View>
              </View>
            </View>

            {/* Post text input */}
            <TextInput
              style={styles.bodyInput}
              multiline
              placeholder="Bạn muốn chia sẻ điều gì?"
              placeholderTextColor={tokens.colors.textMuted}
              value={body}
              onChangeText={setBody}
              maxLength={4000}
              accessibilityLabel="Nội dung bài đăng"
              autoFocus
            />

            {/* Tags row: Attached Place & Feeling */}
            {(place || selectedFeelingObj) && (
              <View style={styles.tagPillContainer}>
                {place && (
                  <View style={styles.tagPill}>
                    <AppText style={styles.tagPillText}>📍 {place.name}</AppText>
                    <TouchableOpacity
                      onPress={() => setPlace(null)}
                      style={styles.tagPillClose}
                    >
                      <CloseIcon size={12} color="#0369A1" />
                    </TouchableOpacity>
                  </View>
                )}

                {selectedFeelingObj && (
                  <View style={styles.tagPill}>
                    <AppText style={styles.tagPillText}>
                      {selectedFeelingObj.icon} {selectedFeelingObj.label}
                    </AppText>
                    <TouchableOpacity
                      onPress={() => setFeeling(null)}
                      style={styles.tagPillClose}
                    >
                      <CloseIcon size={12} color="#0369A1" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Photo Previews */}
            {photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosScroll}
              >
                {photos.map((photo, index) => (
                  <View key={photo.asset.uri} style={styles.photoBox}>
                    <Image
                      source={{ uri: photo.asset.uri }}
                      style={styles.photoThumb}
                    />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      accessibilityLabel={`Bỏ ảnh ${index + 1}`}
                      onPress={() => onRemovePhoto(index)}
                    >
                      <CloseIcon size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Error banner if network/server failed */}
            {error ? (
              <View style={styles.errorBox}>
                <AppText style={styles.errorText} accessibilityLiveRegion="polite">
                  {error}
                </AppText>
              </View>
            ) : null}
          </ScrollView>

          {/* Bottom Toolbar: Add photo, Tag location, Add feeling */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.bottomToolBtn}
              onPress={onPickPhoto}
              accessibilityRole="button"
              accessibilityLabel="Chọn ảnh"
            >
              <PhotoIcon size={20} color={tokens.colors.primary} />
              <AppText style={styles.bottomToolText}>Thêm ảnh</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.bottomToolBtn}
              onPress={() => setShowPlacePicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Gắn vị trí"
            >
              <PinIcon size={20} color={tokens.colors.primary} />
              <AppText style={styles.bottomToolText}>Gắn vị trí</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.bottomToolBtn}
              onPress={() => setShowFeelingPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Cảm xúc"
            >
              <SmileIcon size={20} color={tokens.colors.primary} />
              <AppText style={styles.bottomToolText}>Cảm xúc</AppText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Place Picker Modal */}
        {showPlacePicker && (
          <PlacePicker
            value={place?.id}
            onSelect={(selected) => {
              setPlace(selected);
              setShowPlacePicker(false);
            }}
            onClose={() => setShowPlacePicker(false)}
          />
        )}

        {/* Feeling Picker Modal */}
        {showFeelingPicker && (
          <FeelingPicker
            value={feeling}
            onChange={(selected) => {
              setFeeling(selected);
              setShowFeelingPicker(false);
            }}
            onClose={() => setShowFeelingPicker(false)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  publishBtn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnDisabled: {
    opacity: 0.45,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  authorCol: {
    gap: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  privacyText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  bodyInput: {
    fontSize: 16,
    color: '#0F172A',
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  tagPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  tagPillText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
  },
  tagPillClose: {
    padding: 2,
  },
  photosScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  photoBox: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  bottomToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  bottomToolText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
});
