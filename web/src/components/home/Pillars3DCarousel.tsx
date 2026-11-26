'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import styles from './pillars-3d-carousel.module.css';

interface PillarCardData {
  id: string;
  num: string;
  category: string;
  title: string;
  story: string;
  detail: string;
  cta: string;
  href: string;
  image: string;
}

const PILLARS_DATA: PillarCardData[] = [
  {
    id: 'planner',
    num: '01',
    category: 'LẬP TRÌNH THÔNG MINH',
    title: 'Hành Trình Theo Cảm Xúc',
    story: 'Không còn những danh sách vô hồn.',
    detail: 'Chỉ cần kể về kỳ nghỉ bạn mơ ước, hệ thống sẽ tự động ghép nối các điểm đến liền mạch, cân đối thời gian di chuyển và dự trù chi phí chi tiết.',
    cta: 'Khám phá AI Planner',
    href: '/planner',
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'map',
    num: '02',
    category: 'TỌA ĐỘ & KHÍ HẬU',
    title: 'Bản Đồ Sống & Radar Vi Khí Hậu',
    story: '2.290 tọa độ thực địa trên khắp Việt Nam.',
    detail: 'Theo dõi trực tiếp độ phủ mây Tà Xùa, sóng biển Phú Quốc và thời tiết đỉnh Fansipan để luôn chạm đến cảnh sắc ở thời khắc rực rỡ nhất.',
    cta: 'Mở Bản Đồ Sống',
    href: '/map',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'treasury',
    num: '03',
    category: 'TÀI CHÍNH ĐỒNG HÀNH',
    title: 'Thủ Quỹ Nhóm & Minh Bạch Chi Phí',
    story: 'Đi đông người, trọn vẹn niềm vui.',
    detail: 'Một người chi trả trước, hệ thống tự động phân bổ sòng phẳng và tạo mã VietQR tức thì cho từng thành viên, tạm biệt mọi bối rối tính toán.',
    cta: 'Trải nghiệm Thủ Quỹ',
    href: '/trips',
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'community',
    num: '04',
    category: 'GÓC NHÌN BẢN ĐỊA',
    title: 'Kho Tàng Di Sản & Mẹo Thực Địa',
    story: 'Kinh nghiệm thật từ những bước chân đi trước.',
    detail: 'Mách bạn khung giờ vắng khách tại Tràng An, quán ăn gia truyền chuẩn vị Huế hay cung đường ngắm hoàng hôn không bị che khuất.',
    cta: 'Xem mẹo bản địa',
    href: '/community',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
  },
];

export function Pillars3DCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayRotation, setDisplayRotation] = useState(0);

  // Smooth lerp state
  const targetRotationRef = useRef(0);
  const currentRotationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartRotRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // Compact 3D radius for harmonious proportions
  const RADIUS = 285;

  // 60FPS Lerp Animation Loop (Smooth Inertia Rotation)
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const diff = targetRotationRef.current - currentRotationRef.current;
      if (Math.abs(diff) > 0.04) {
        currentRotationRef.current += diff * 0.085;
        setDisplayRotation(Number(currentRotationRef.current.toFixed(2)));
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Update target rotation whenever activeIndex changes
  useEffect(() => {
    targetRotationRef.current = -activeIndex * 90;
  }, [activeIndex]);

  // Smooth Mouse Move Parallax (gentle +/- 25 degrees)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) return;
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const normalizedX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to +0.5
    targetRotationRef.current = -activeIndex * 90 + normalizedX * 45;
  }, [activeIndex]);

  const handleMouseLeave = useCallback(() => {
    if (!isDraggingRef.current) {
      targetRotationRef.current = -activeIndex * 90;
    }
  }, [activeIndex]);

  // Pointer Drag Support for interactive swiping
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartRotRef.current = targetRotationRef.current;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    targetRotationRef.current = dragStartRotRef.current + (deltaX * 0.35);
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    // Snap to nearest 90-degree card
    const rawIndex = Math.round(-targetRotationRef.current / 90);
    const normalizedIndex = ((rawIndex % 4) + 4) % 4;
    setActiveIndex(normalizedIndex);
    targetRotationRef.current = -rawIndex * 90;
  };

  const nextCard = () => {
    setActiveIndex((prev) => (prev + 1) % PILLARS_DATA.length);
  };

  const prevCard = () => {
    setActiveIndex((prev) => (prev - 1 + PILLARS_DATA.length) % PILLARS_DATA.length);
  };

  return (
    <section className={styles.carouselSection} id="core-pillars" aria-label="Bốn Trụ Cột VISTA">
      {/* 3D Iridescent Ambient Caustic Light Orbs */}
      <div className={styles.iridescentAuraOrbLeft} />
      <div className={styles.iridescentAuraOrbRight} />
      <div className={styles.iridescentAuraOrbCenter} />

      <div className={styles.carouselContainer}>
        {/* Editorial Section Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>
            <span>GIÁ TRỊ CỐT LÕI</span>
          </div>
          <h2 className={styles.sectionMainTitle}>
            Bốn Trải Nghiệm Khác Biệt Cho Chuyến Đi Của Bạn
          </h2>
          <p className={styles.sectionDesc}>
            Không rườm rà hay công nghệ phô trương. Mỗi tính năng được kiến tạo để trả lại cho bạn trọn vẹn sự tự do và cảm xúc trên từng nẻo đường.
          </p>
        </div>

        {/* 3D Stage & Carousel */}
        <div 
          ref={stageRef}
          className={styles.stageWrapper}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Luminous Pearlescent 3D Caustic Floor */}
          <div className={styles.pearlFloorCaustic} />
          {/* Subtle Ambient Floor Shadow */}
          <div className={styles.stageAmbientShadow} />

          {/* Rotating 3D Cylinder Container */}
          <div 
            className={styles.carousel3D}
            style={{
              transform: `rotateY(${displayRotation}deg)`,
            }}
          >
            {PILLARS_DATA.map((pillar, idx) => {
              const cardBaseAngle = idx * 90;
              const isFront = activeIndex === idx;

              return (
                <div
                  key={pillar.id}
                  className={`${styles.card3D} ${isFront ? styles.card3DActive : styles.card3DDimmed}`}
                  style={{
                    transform: `rotateY(${cardBaseAngle}deg) translateZ(${RADIUS}px)`,
                  }}
                  onClick={() => setActiveIndex(idx)}
                >
                  <div className={styles.cardMediaBox}>
                    <img 
                      src={pillar.image} 
                      alt={pillar.title} 
                      className={styles.cardImage} 
                    />
                    <div className={styles.cardImageOverlay} />
                    <span className={styles.cardOrderNum}>{pillar.num}</span>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardCategory}>{pillar.category}</div>
                    <h3 className={styles.cardTitle}>{pillar.title}</h3>
                    <div className={styles.cardStory}>{pillar.story}</div>
                    <p className={styles.cardDetail}>{pillar.detail}</p>

                    <Link href={pillar.href} className={styles.cardActionLink}>
                      <span>{pillar.cta}</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Minimalist Controls */}
        <div className={styles.controlsRow}>
          <button 
            type="button" 
            className={styles.arrowBtn} 
            onClick={prevCard}
            aria-label="Thẻ trước"
          >
            <ChevronLeft size={16} />
          </button>

          <div className={styles.dotsList}>
            {PILLARS_DATA.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.dotBtn} ${activeIndex === idx ? styles.dotBtnActive : ''}`}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Chuyển đến ${p.title}`}
              />
            ))}
          </div>

          <button 
            type="button" 
            className={styles.arrowBtn} 
            onClick={nextCard}
            aria-label="Thẻ tiếp theo"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
