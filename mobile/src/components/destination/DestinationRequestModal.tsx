import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { authStorage } from '@/services/auth/authStorage';
import { apiErrorMessage } from '@/services/api/client';
import {
  DestinationRequestItem,
  submitDestinationRequest,
  updateMyDestinationRequest,
} from '@/services/api/destinationRequestApi';

export interface InitialDestinationForRequest {
  id: string;
  name: string;
  province?: string;
  category?: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
}

interface DestinationRequestModalProps {
  visible: boolean;
  mode: 'CREATE' | 'UPDATE' | 'EDIT';
  initialDestination?: InitialDestinationForRequest | null;
  existingRequest?: DestinationRequestItem | null;
  mapCenter?: { latitude: number; longitude: number } | null;
  gpsLocation?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function DestinationRequestModal({
  visible,
  mode,
  initialDestination,
  existingRequest,
  mapCenter,
  gpsLocation,
  onClose,
  onSubmitted,
}: DestinationRequestModalProps) {
  const [name, setName] = useState('');
  const [provinceName, setProvinceName] = useState('Đà Nẵng');
  const [categoryName, setCategoryName] = useState('Cảnh quan');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    queueMicrotask(() => {
      if (mode === 'EDIT' && existingRequest) {
        setName(existingRequest.name ?? '');
        setProvinceName(existingRequest.provinceName ?? 'Đà Nẵng');
        setCategoryName(existingRequest.categoryName ?? 'Cảnh quan');
        setAddress(existingRequest.address ?? '');
        setLatitude(existingRequest.latitude != null ? String(existingRequest.latitude) : '');
        setLongitude(existingRequest.longitude != null ? String(existingRequest.longitude) : '');
        setPriceMin(existingRequest.priceMin != null ? String(existingRequest.priceMin) : '');
        setPriceMax(existingRequest.priceMax != null ? String(existingRequest.priceMax) : '');
        setDescription(existingRequest.description ?? '');
        setImageUrl(existingRequest.imageUrls?.[0] ?? '');
        setSourceUrl(existingRequest.sourceUrl ?? '');
        setNote(existingRequest.note ?? '');
      } else if (mode === 'UPDATE' && initialDestination) {
        setName(initialDestination.name ?? '');
        setProvinceName(initialDestination.province ?? 'Đà Nẵng');
        setCategoryName(initialDestination.category ?? 'Cảnh quan');
        setAddress('');
        setLatitude(
          initialDestination.latitude != null ? String(initialDestination.latitude) : '',
        );
        setLongitude(
          initialDestination.longitude != null ? String(initialDestination.longitude) : '',
        );
        setPriceMin(
          initialDestination.priceMin != null ? String(initialDestination.priceMin) : '',
        );
        setPriceMax(
          initialDestination.priceMax != null ? String(initialDestination.priceMax) : '',
        );
        setDescription(initialDestination.description ?? '');
        setImageUrl(initialDestination.imageUrl ?? '');
        setSourceUrl(initialDestination.sourceUrl ?? '');
        setNote('');
      } else {
        const coords = gpsLocation ?? mapCenter ?? { latitude: 16.0544, longitude: 108.2022 };
        setName('');
        setProvinceName('Đà Nẵng');
        setCategoryName('Cảnh quan');
        setAddress('');
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
        setPriceMin('');
        setPriceMax('');
        setDescription('');
        setImageUrl('');
        setSourceUrl('');
        setNote('');
      }
    });
  }, [visible, mode, initialDestination, existingRequest, mapCenter, gpsLocation]);

  const handleUseCoord = (coords?: { latitude: number; longitude: number } | null) => {
    if (!coords) {
      Alert.alert('Chưa có tọa độ', 'Vui lòng bật định vị hoặc di chuyển bản đồ.');
      return;
    }
    setLatitude(coords.latitude.toFixed(6));
    setLongitude(coords.longitude.toFixed(6));
  };

  const handleSubmit = async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Bạn cần đăng nhập để gửi đề xuất địa điểm cho quản trị viên.',
        [
          { text: 'Để sau', style: 'cancel' },
          {
            text: 'Đăng nhập',
            onPress: () => {
              onClose();
              router.push('/(auth)/login');
            },
          },
        ],
      );
      return;
    }

    const requestType =
      mode === 'EDIT' && existingRequest ? existingRequest.requestType : mode === 'UPDATE' ? 'UPDATE' : 'CREATE';
    const latNum = latitude.trim() ? Number(latitude) : null;
    const lngNum = longitude.trim() ? Number(longitude) : null;
    const minNum = priceMin.trim() ? Number(priceMin) : null;
    const maxNum = priceMax.trim() ? Number(priceMax) : null;

    if (requestType === 'CREATE') {
      if (!name.trim() || !provinceName.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên địa điểm và tỉnh/thành.');
        return;
      }
      if (latNum == null || Number.isNaN(latNum) || lngNum == null || Number.isNaN(lngNum)) {
        Alert.alert('Tọa độ không hợp lệ', 'Vui lòng chọn hoặc nhập tọa độ GPS hợp lệ.');
        return;
      }
    }

    const payload = {
      requestType: requestType as 'CREATE' | 'UPDATE',
      targetDestinationId:
        mode === 'EDIT'
          ? existingRequest?.targetDestinationId ?? null
          : mode === 'UPDATE'
            ? initialDestination?.id ?? null
            : null,
      name: name.trim() || null,
      provinceName: provinceName.trim() || null,
      categoryName: categoryName.trim() || null,
      description: description.trim() || null,
      address: address.trim() || null,
      latitude: latNum,
      longitude: lngNum,
      priceMin: minNum,
      priceMax: maxNum,
      imageUrls: imageUrl.trim() ? [imageUrl.trim()] : null,
      sourceUrl: sourceUrl.trim() || null,
      note: note.trim() || null,
    };

    try {
      setSubmitting(true);
      if (mode === 'EDIT' && existingRequest) {
        await updateMyDestinationRequest(existingRequest.id, payload);
        Alert.alert('Thành công', 'Đã cập nhật và gửi lại yêu cầu để Admin kiểm duyệt.');
      } else {
        await submitDestinationRequest(payload);
        Alert.alert(
          'Đã gửi đề xuất',
          requestType === 'CREATE'
            ? 'Cảm ơn bạn! Đề xuất thêm địa điểm đã được gửi tới Admin kiểm duyệt.'
            : 'Yêu cầu cập nhật thông tin đã được gửi tới Admin kiểm duyệt.',
        );
      }
      onSubmitted?.();
      onClose();
    } catch (err) {
      Alert.alert('Không thể gửi', apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <AppText style={styles.title}>
              {mode === 'EDIT'
                ? 'Chỉnh sửa & gửi lại đề xuất'
                : mode === 'UPDATE'
                  ? 'Đề xuất cập nhật thông tin'
                  : 'Đề xuất địa điểm còn thiếu'}
            </AppText>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <AppText style={styles.closeText}>Đóng</AppText>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.label}>Tên địa điểm</AppText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="VD: Bãi Rạn Nam Ô"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <AppText style={styles.label}>Tỉnh / Thành</AppText>
                <TextInput
                  style={styles.input}
                  value={provinceName}
                  onChangeText={setProvinceName}
                  placeholder="Đà Nẵng"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.col}>
                <AppText style={styles.label}>Danh mục</AppText>
                <TextInput
                  style={styles.input}
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="Cảnh quan"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.coordHeader}>
              <AppText style={styles.label}>Tọa độ GPS (Vĩ độ / Kinh độ)</AppText>
              <View style={styles.coordButtons}>
                {mapCenter && (
                  <TouchableOpacity
                    style={styles.chipBtn}
                    onPress={() => handleUseCoord(mapCenter)}
                  >
                    <AppText style={styles.chipBtnText}>Tâm bản đồ</AppText>
                  </TouchableOpacity>
                )}
                {gpsLocation && (
                  <TouchableOpacity
                    style={styles.chipBtn}
                    onPress={() => handleUseCoord(gpsLocation)}
                  >
                    <AppText style={styles.chipBtnText}>GPS hiện tại</AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <TextInput
                  style={styles.input}
                  value={latitude}
                  onChangeText={setLatitude}
                  keyboardType="numeric"
                  placeholder="16.0544"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.col}>
                <TextInput
                  style={styles.input}
                  value={longitude}
                  onChangeText={setLongitude}
                  keyboardType="numeric"
                  placeholder="108.2022"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <AppText style={styles.label}>Giá tối thiểu (VNĐ)</AppText>
                <TextInput
                  style={styles.input}
                  value={priceMin}
                  onChangeText={setPriceMin}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.col}>
                <AppText style={styles.label}>Giá tối đa (VNĐ)</AppText>
                <TextInput
                  style={styles.input}
                  value={priceMax}
                  onChangeText={setPriceMax}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <AppText style={styles.label}>Địa chỉ</AppText>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Đường, quận/huyện..."
              placeholderTextColor="#94a3b8"
            />

            <AppText style={styles.label}>Mô tả chi tiết</AppText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Mô tả nổi bật về địa điểm..."
              placeholderTextColor="#94a3b8"
            />

            <AppText style={styles.label}>Link ảnh minh họa</AppText>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
              placeholderTextColor="#94a3b8"
            />

            <AppText style={styles.label}>Ghi chú / Lý do đề xuất</AppText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Ví dụ: Giá vé mới cập nhật / Địa điểm mới chưa có trên bản đồ..."
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.footerBtn}>
              <AppButton
                label={submitting ? 'Đang gửi...' : mode === 'EDIT' ? 'Cập nhật & Gửi lại' : 'Gửi đề xuất'}
                onPress={handleSubmit}
                disabled={submitting}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  formContent: {
    padding: 20,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  coordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  coordButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  chipBtn: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369a1',
  },
  footerBtn: {
    marginTop: 12,
  },
});
