'use client';

import { useState, useCallback, useMemo } from 'react';
import { Navbar } from '@/components/common/Navbar';
import { MapViewAdapter } from '@/features/map-location/adapter/MapViewAdapter';
import {
  DestinationList,
  filterDestinations,
} from '@/features/map-location/components/DestinationList';
import { GPSPermissionBar } from '@/features/map-location/components/GPSPermissionBar';
import { SAMPLE_DESTINATIONS } from '@/features/map-location/data/destinations';
import { useGeolocation } from '@/features/map-location/hooks/useGeolocation';
import type {
  DestinationMarker,
  MapViewMode,
} from '@/features/map-location/types';
import styles from './map-page.module.css';

export default function VistaMapWeek2Page() {
  const [selected, setSelected] = useState<DestinationMarker | null>(
    SAMPLE_DESTINATIONS[0],
  );
  const [mapMode, setMapMode] = useState<MapViewMode>('3d');
  const [gpsDismissed, setGpsDismissed] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [featured, setFeatured] = useState(true);
  const { coords, status, errorMessage, requestCurrentPosition } =
    useGeolocation();
  const destinations = useMemo(
    () => filterDestinations(SAMPLE_DESTINATIONS, search, category, featured),
    [search, category, featured],
  );
  const handleSelect = useCallback(
    (destination: DestinationMarker | null) => setSelected(destination),
    [],
  );
  return (
    <div className={styles.page}>
      <Navbar activeModule="map" />
      <main className={styles.content}>
        <div className={styles.intro}>
          <h1>
            Khám phá Việt Nam <span>trên bản đồ</span>
          </h1>
          <p>Chọn điểm đến, khám phá từng góc nhìn.</p>
        </div>
        <div className={styles.layout}>
          <section className={styles.sidebar} aria-label="Danh sách điểm đến">
            <DestinationList
              destinations={SAMPLE_DESTINATIONS}
              filtered={destinations}
              selectedId={selected?.id}
              onSelect={handleSelect}
              search={search}
              category={category}
              featured={featured}
              onSearch={setSearch}
              onCategory={setCategory}
              onFeatured={setFeatured}
            />
          </section>
          <section className={styles.map} aria-label="Bản đồ khám phá">
            <MapViewAdapter
              destinations={destinations}
              selectedDestinationId={selected?.id}
              onSelectDestination={handleSelect}
              userCoords={coords}
              onRequestUserLocation={requestCurrentPosition}
              mode={mapMode}
              onModeChange={setMapMode}
              showSelectedCard
            />
          </section>
        </div>
        {!gpsDismissed && (
          <GPSPermissionBar
            status={status}
            hasPosition={!!coords}
            errorMessage={errorMessage}
            onRequestPermission={requestCurrentPosition}
            onDismiss={() => setGpsDismissed(true)}
          />
        )}
        <footer className={styles.footer}>
          Điểm đến mẫu · Bản đồ © OpenStreetMap · Mô hình Cầu Rồng đơn giản hóa
          <details>
            <summary>Nguồn ảnh & giấy phép</summary>
            <p>
              Cầu Rồng: Thangphan,{' '}
              <a
                href="https://commons.wikimedia.org/wiki/File:Da_nang_dragon_bridge.jpg"
                target="_blank"
                rel="noreferrer"
              >
                CC0
              </a>
              . Mỹ Khê và Chợ Hàn: Christophe95,{' '}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 4.0
              </a>
              , Wikimedia Commons. Ảnh được thu nhỏ, cắt theo khung; các bản
              điều chỉnh giữ cùng giấy phép.
            </p>
            <a
              href="https://commons.wikimedia.org/wiki/File:My_Khe_Beach_1.jpg"
              target="_blank"
              rel="noreferrer"
            >
              Ảnh Mỹ Khê
            </a>{' '}
            ·{' '}
            <a
              href="https://commons.wikimedia.org/wiki/File:Han_Market_1.jpg"
              target="_blank"
              rel="noreferrer"
            >
              Ảnh Chợ Hàn
            </a>
          </details>
        </footer>
      </main>
    </div>
  );
}
