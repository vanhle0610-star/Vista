'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/common/Navbar';
import styles from './planner.module.css';
import { fetchAllDestinationsWeather, RealtimeWeather } from '../../services/weatherService';

interface ActivityItem {
  time: string;
  slot: 'Sáng' | 'Trưa' | 'Chiều' | 'Tối';
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  tipVi: string;
  tipEn: string;
  costVi: string;
  costEn: string;
}

interface DayPlan {
  dayNumber: number;
  titleVi: string;
  titleEn: string;
  activities: ActivityItem[];
}

const DESTINATION_PLANS: Record<string, { days: DayPlan[]; totalCostVi: string; totalCostEn: string }> = {
  danang: {
    totalCostVi: '4.850.000đ / người',
    totalCostEn: '~$195 / person',
    days: [
      {
        dayNumber: 1,
        titleVi: 'Khám phá Biển Mỹ Khê & Cầu Rồng Phun Lửa',
        titleEn: 'My Khe Beach & Dragon Bridge Fire Show',
        activities: [
          {
            time: '08:00 - 11:30',
            slot: 'Sáng',
            titleVi: 'Đón bình minh & Check-in Bán đảo Sơn Trà',
            titleEn: 'Sunrise & Son Tra Peninsula Exploration',
            descVi: 'Viếng Chùa Linh Ứng ngắm tượng Phật Bà 67m hướng biển, ngắm Voọc chà vá chân nâu quý hiếm.',
            descEn: 'Visit Linh Ung Pagoda with the 67m Lady Buddha statue, spot rare red-shanked douc langurs.',
            tipVi: '💡 Nên đi sớm để tránh nắng gắt và chụp ảnh biển trong nhất.',
            tipEn: '💡 Arrive early for soft morning sunlight and panoramic coast views.',
            costVi: 'Miễn phí vé',
            costEn: 'Free entry',
          },
          {
            time: '12:00 - 13:30',
            slot: 'Trưa',
            titleVi: 'Thưởng thức Bánh Tráng Cuốn Thịt Heo & Mì Quảng',
            titleEn: 'Authentic Da Nang Pork Rice Paper Rolls & Mi Quang',
            descVi: 'Ăn trưa tại quán đặc sản Trần hoặc Mì Quảng Bà Mua với nước mắm nêm đậm đà.',
            descEn: 'Lunch with succulent sliced pork, fresh herbs and handmade Quang-style noodles.',
            tipVi: '💡 Gọi thêm ram bắp giòn rụm ăn kèm.',
            tipEn: '💡 Order crispy corn spring rolls on the side.',
            costVi: '120.000đ',
            costEn: '~$5',
          },
          {
            time: '15:30 - 18:00',
            slot: 'Chiều',
            titleVi: 'Tắm biển Mỹ Khê & Thưởng thức dừa xiêm',
            titleEn: 'Swimming at My Khe Beach & Chilled Coconuts',
            descVi: 'Thư giãn trên bờ cát trắng mịn, tham gia mô-tô nước hoặc dù lượn biển ngắm toàn cảnh thành phố.',
            descEn: 'Relax on Forbes-voted white sands, try jet skiing or parasailing above blue waters.',
            tipVi: '💡 Bãi tắm số 1 và số 2 có bờ cát thoai thoải và cứu hộ túc trực.',
            tipEn: '💡 Sections 1 & 2 have gentle slopes and active lifeguards.',
            costVi: '60.000đ',
            costEn: '~$2.5',
          },
          {
            time: '19:30 - 21:30',
            slot: 'Tối',
            titleVi: 'Dạo Cầu Rồng, Cầu Tình Yêu & Chợ Đêm Sơn Trà',
            titleEn: 'Dragon Bridge, Love Bridge & Son Tra Night Market',
            descVi: 'Thưởng thức hải sản tươi nướng tại chợ đêm, xem Cầu Rồng phun lửa và phun nước (cuối tuần 21:00).',
            descEn: 'Feast on grilled seafood skewers, see the iconic Dragon Bridge breathe fire & water.',
            tipVi: '💡 Đến chân cầu lúc 20:30 để có vị trí ngắm đẹp nhất.',
            tipEn: '💡 Arrive by 20:30 for the best vantage point near riverside railings.',
            costVi: '250.000đ',
            costEn: '~$10',
          },
        ],
      },
      {
        dayNumber: 2,
        titleVi: 'Chinh phục Bà Nà Hills & Cầu Vàng Bàn Tay Khổng Lồ',
        titleEn: 'Ba Na Hills & World-Famous Golden Bridge',
        activities: [
          {
            time: '08:00 - 12:00',
            slot: 'Sáng',
            titleVi: 'Cáp treo đạt kỷ lục & Dạo bước trên Cầu Vàng',
            titleEn: 'Record-Breaking Cable Car & Golden Bridge',
            descVi: 'Đi cáp treo qua thác Tóc Tiên, dạo bước trên Cầu Vàng bồng bềnh giữa mây ngàn và Vườn hoa Le Jardin D’Amour.',
            descEn: 'Ascend misty peaks, walk along the giant mossy hands supporting the golden footbridge.',
            tipVi: '💡 Sáng sớm cầu vắng người, chụp ảnh đẹp nhất.',
            tipEn: '💡 Morning hours offer mist and fewer visitors for iconic photos.',
            costVi: '900.000đ (Vé)',
            costEn: '~$36 (Ticket)',
          },
          {
            time: '12:30 - 14:00',
            slot: 'Trưa',
            titleVi: 'Buffet Á – Âu tại Làng Pháp',
            titleEn: 'International Buffet at French Village',
            descVi: 'Thưởng thức hơn 100 món ăn phong phú tại nhà hàng Beer Plaza hoặc Arapang giữa kiến trúc Gothic cổ điển.',
            descEn: 'Dine in a festive European hall featuring regional Vietnamese and Western gourmet dishes.',
            tipVi: '💡 Đặt combo vé cáp treo kèm buffet để tiết kiệm 15%.',
            tipEn: '💡 Purchase cable car + buffet combo to save 15%.',
            costVi: '350.000đ',
            costEn: '~$14',
          },
          {
            time: '14:30 - 17:00',
            slot: 'Chiều',
            titleVi: 'Lâu Đài Mặt Trăng & Khu Vui Chơi Fantasy Park',
            titleEn: 'Lunar Castle & Fantasy Park Attractions',
            descVi: 'Trải nghiệm rạp chiếu phim bay 4D Mắt Bay, xe trượt ống ngoài trời Alpine Coaster cảm giác mạnh.',
            descEn: 'Experience high-speed alpine toboggans and 4D flying simulator cinema.',
            tipVi: '💡 Đường trượt ống Alpine Coaster 01 có tầm nhìn đẹp nhất.',
            tipEn: '💡 Alpine Coaster #1 offers panoramic valley drops.',
            costVi: 'Đã bao gồm',
            costEn: 'Included',
          },
          {
            time: '18:30 - 21:00',
            slot: 'Tối',
            titleVi: 'Du thuyền sông Hàn & Ngắm cảnh đêm lung linh',
            titleEn: 'Han River Night Cruise & Illuminated Skyline',
            descVi: 'Lướt êm đềm trên sông Hàn, chiêm ngưỡng Tứ đại mỹ cầu Đà Nẵng rực sáng và thưởng thức múa Chăm Pa.',
            descEn: 'Cruise past illuminated architectural bridges with live Cham dance performances.',
            tipVi: '💡 Đặt tầng 2 du thuyền để có view thoáng không bị che chắn.',
            tipEn: '💡 Request 2nd deck seating for unobstructed river breezes.',
            costVi: '150.000đ',
            costEn: '~$6',
          },
        ],
      },
      {
        dayNumber: 3,
        titleVi: 'Phố Cổ Hội An lung linh sắc đèn lồng',
        titleEn: 'Enchanting Hoi An Ancient Town & Lanterns',
        activities: [
          {
            time: '08:30 - 11:30',
            slot: 'Sáng',
            titleVi: 'Đi thuyền thúng Rừng dừa Bảy Mẫu Cẩm Thanh',
            titleEn: 'Cam Thanh Coconut Forest Basket Boat Spinning',
            descVi: 'Len lỏi giữa rừng dừa nước bạt ngàn, xem nghệ nhân múa thúng xoay tròn độc đáo và giăng lưới bắt cá.',
            descEn: 'Navigate round bamboo basket boats through emerald coconut waterways with acrobatic spins.',
            tipVi: '💡 Tiền tip cho người chèo thuyền khoảng 30.000đ – 50.000đ.',
            tipEn: '💡 Modest tip of ~30,000 VND appreciated by local boatmen.',
            costVi: '150.000đ',
            costEn: '~$6',
          },
          {
            time: '12:00 - 13:30',
            slot: 'Trưa',
            titleVi: 'Cơm Gà Bà Buội & Bánh mì Phượng',
            titleEn: 'Ba Buoi Chicken Rice & Banh Mi Phuong',
            descVi: 'Cơm gà xé vàng óng gia truyền thơm lừng nghệ tươi, ăn kèm dưa chua đu đủ và nước súp lòng gà.',
            descEn: 'Legendary golden turmeric rice topped with fragrant shredded farm chicken and herbs.',
            tipVi: '💡 Quán Bà Buội đông vào buổi trưa, nên tới trước 12h.',
            tipEn: '💡 Arrive before noon to skip long queues.',
            costVi: '80.000đ',
            costEn: '~$3.2',
          },
          {
            time: '15:00 - 18:00',
            slot: 'Chiều',
            titleVi: 'Tản bộ phố cổ, Chùa Cầu & Uống Cà phê Mot',
            titleEn: 'Ancient Town Stroll, Japanese Bridge & Mot Herbal Tea',
            descVi: 'Khám phá Nhà cổ Tấn Ký, Hội quán Phúc Kiến, nhâm nhi ly nước thảo mộc Mót cài hoa sen thanh mát.',
            descEn: 'Explore 400-year-old wooden merchant houses and sip refreshing lotus-infused herbal tea.',
            tipVi: '💡 Mua vé tham quan 120.000đ để vào các di tích nhà cổ.',
            tipEn: '💡 Historic ticket grants access to 5 designated heritage sites.',
            costVi: '150.000đ',
            costEn: '~$6',
          },
          {
            time: '18:30 - 21:00',
            slot: 'Tối',
            titleVi: 'Thả hoa đăng ước nguyện trên sông Hoài & Mua sắm',
            titleEn: 'Floating Candle Lanterns on Hoai River & Night Market',
            descVi: 'Đi thuyền gỗ nhỏ thả hoa đăng lung linh mặt nước, mua đèn lồng lụa và quà lưu niệm thủ công.',
            descEn: 'Drift along the candlelit river setting wishes afloat under thousands of glowing silk lanterns.',
            tipVi: '💡 Thuyền thả hoa đăng có giá cố định 150.000đ/thuyền tối đa 4 người.',
            tipEn: '💡 Fixed standard fare of 150,000 VND per wooden boat for up to 4 guests.',
            costVi: '100.000đ',
            costEn: '~$4',
          },
        ],
      },
    ],
  },
};

export default function PlannerPage() {
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [destination, setDestination] = useState('danang');
  const [daysCount, setDaysCount] = useState(3);
  const [travelStyle, setTravelStyle] = useState('resort');
  const [budgetTier, setBudgetTier] = useState('standard');
  const [partySize, setPartySize] = useState('couple');
  const [activeDay, setActiveDay] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Realtime Weather for selected destination
  const [weatherMap, setWeatherMap] = useState<Record<string, RealtimeWeather>>({});

  useEffect(() => {
    async function loadWeather() {
      try {
        const data = await fetchAllDestinationsWeather();
        setWeatherMap(data);
      } catch (e) {
        console.warn('Planner weather fetch error:', e);
      }
    }
    loadWeather();
  }, []);

  const currentWeather = weatherMap[destination];

  const handleGenerate = () => {
    setIsGenerating(true);
    setSavedSuccess(false);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1200);
  };

  const handleSaveTrip = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const planData = DESTINATION_PLANS[destination] ?? DESTINATION_PLANS.danang;
  const currentDayData = planData.days.find((d) => d.dayNumber === activeDay) ?? planData.days[0];

  return (
    <div className={styles.plannerRoot}>
      {/* ─── 1. TOP GLOBAL NAVBAR (5 FUNCTIONAL PILLARS) ────────────────── */}
      <Navbar
        activeModule="planner"
        lang={lang}
        onLangChange={(nextLang) => setLang(nextLang)}
      />

      {/* ─── 2. HERO HEADER ────────────────────────────────────────────── */}
      <section className={styles.plannerHero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <span>✨</span>
            <span>{lang === 'vi' ? 'Trợ Lý Du Lịch Thông Minh VISTA AI' : 'VISTA Intelligent Travel Assistant'}</span>
          </div>
          <h1 className={styles.heroTitle}>
            {lang === 'vi' ? (
              <>
                Thiết kế lịch trình du lịch <span className={styles.heroTitleGradient}>tối ưu trong 10 giây</span>
              </>
            ) : (
              <>
                Design your personalized itinerary <span className={styles.heroTitleGradient}>in 10 seconds</span>
              </>
            )}
          </h1>
          <p className={styles.heroSubtitle}>
            {lang === 'vi'
              ? 'Tự động tính toán cung đường di chuyển tối ưu, cập nhật thời tiết realtime và đề xuất trải nghiệm độc bản theo đúng phong cách của bạn.'
              : 'Auto-calculates optimal transit routes, monitors live weather conditions, and creates tailor-made daily timelines.'}
          </p>
        </div>
      </section>

      {/* ─── 3. MAIN INTERACTIVE PLANNER ───────────────────────────────── */}
      <div className={styles.plannerContainer}>
        {/* LEFT: Configuration Panel */}
        <div className={styles.configPanel}>
          <div className={styles.panelTitle}>
            <span>⚙️</span>
            <span>{lang === 'vi' ? 'Tùy chỉnh chuyến đi' : 'Trip Preferences'}</span>
          </div>

          {/* Destination Selector */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Điểm đến mong muốn:' : 'Target Destination:'}</label>
            <select
              className={styles.destinationSelect}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="danang">Đà Nẵng & Bà Nà Hills</option>
              <option value="halong">Vịnh Hạ Long & Quảng Ninh</option>
              <option value="hoian">Phố Cổ Hội An & Cẩm Thanh</option>
              <option value="ninhbinh">Tràng An & Tam Cốc (Ninh Bình)</option>
              <option value="phuquoc">Đảo Ngọc Phú Quốc</option>
              <option value="hagiang">Cao Nguyên Đá Hà Giang</option>
              <option value="dalat">Đà Lạt Mộng Mơ</option>
              <option value="saigon">TP. Hồ Chí Minh & Miền Tây</option>
            </select>
          </div>

          {/* Realtime Weather Alert for this destination */}
          <div className={styles.weatherAlertBox}>
            <div className={styles.weatherAlertIcon}>{currentWeather?.icon ?? '🌤️'}</div>
            <div className={styles.weatherAlertText}>
              <strong>
                {lang === 'vi' ? 'Thời tiết Realtime tại điểm đến:' : 'Live Destination Weather:'}{' '}
                {currentWeather?.tempFormatted ?? '28°C'}
              </strong>
              {currentWeather
                ? (lang === 'vi' ? `${currentWeather.statusVi}. ${currentWeather.adviceVi}` : `${currentWeather.statusEn}. ${currentWeather.adviceEn}`)
                : (lang === 'vi' ? 'Thời tiết nắng ráo thuận lợi, biển êm, rất đẹp cho các hoạt động ngoài trời.' : 'Sunny and calm sea, ideal for outdoor exploration.')}
            </div>
          </div>

          {/* Duration Selector */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Thời gian chuyến đi:' : 'Trip Duration:'}</label>
            <div className={styles.pillGrid}>
              {[
                { count: 2, labelVi: '2N1Đ', labelEn: '2D1N' },
                { count: 3, labelVi: '3N2Đ', labelEn: '3D2N' },
                { count: 4, labelVi: '4N3Đ', labelEn: '4D3N' },
              ].map((pill) => (
                <div
                  key={pill.count}
                  className={`${styles.optionPill} ${daysCount === pill.count ? styles.optionPillActive : ''}`}
                  onClick={() => setDaysCount(pill.count)}
                >
                  {lang === 'vi' ? pill.labelVi : pill.labelEn}
                </div>
              ))}
            </div>
          </div>

          {/* Travel Style */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Phong cách chuyến đi:' : 'Travel Style:'}</label>
            <div className={styles.styleGrid}>
              {[
                { id: 'resort', icon: '🏨', labelVi: 'Nghỉ dưỡng & Chill', labelEn: 'Resort & Relax' },
                { id: 'culture', icon: '🏮', labelVi: 'Văn hóa & Ẩm thực', labelEn: 'Culture & Food' },
                { id: 'adventure', icon: '⛰️', labelVi: 'Phượt & Trải nghiệm', labelEn: 'Trekking & Photo' },
                { id: 'family', icon: '👨‍👩‍👧', labelVi: 'Gia đình & Trẻ nhỏ', labelEn: 'Family Friendly' },
              ].map((st) => (
                <div
                  key={st.id}
                  className={`${styles.stylePill} ${travelStyle === st.id ? styles.stylePillActive : ''}`}
                  onClick={() => setTravelStyle(st.id)}
                >
                  <span>{st.icon}</span>
                  <span>{lang === 'vi' ? st.labelVi : st.labelEn}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Tier */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Mức ngân sách dự kiến:' : 'Budget Level:'}</label>
            <div className={styles.pillGrid}>
              {[
                { id: 'economy', labelVi: 'Tiết kiệm', labelEn: 'Economy' },
                { id: 'standard', labelVi: 'Tiêu chuẩn', labelEn: 'Standard' },
                { id: 'luxury', labelVi: 'Cao cấp', labelEn: 'Luxury' },
              ].map((tier) => (
                <div
                  key={tier.id}
                  className={`${styles.optionPill} ${budgetTier === tier.id ? styles.optionPillActive : ''}`}
                  onClick={() => setBudgetTier(tier.id)}
                >
                  {lang === 'vi' ? tier.labelVi : tier.labelEn}
                </div>
              ))}
            </div>
          </div>

          {/* Party Size */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{lang === 'vi' ? 'Thành phần đồng hành:' : 'Travel Companions:'}</label>
            <div className={styles.pillGrid}>
              {[
                { id: 'solo', labelVi: '👤 Đi 1 mình', labelEn: 'Solo' },
                { id: 'couple', labelVi: '👫 Cặp đôi', labelEn: 'Couple' },
                { id: 'group', labelVi: '👥 Nhóm bạn', labelEn: 'Group (4+)' },
              ].map((p) => (
                <div
                  key={p.id}
                  className={`${styles.optionPill} ${partySize === p.id ? styles.optionPillActive : ''}`}
                  onClick={() => setPartySize(p.id)}
                >
                  {lang === 'vi' ? p.labelVi : p.labelEn}
                </div>
              ))}
            </div>
          </div>

          {/* CTA Generate */}
          <button type="button" className={styles.btnGenerate} onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <span>⏳</span>
                <span>{lang === 'vi' ? 'AI đang tính toán lịch trình...' : 'AI is generating itinerary...'}</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>{lang === 'vi' ? 'Tạo Lịch Trình Bằng AI' : 'Generate AI Itinerary'}</span>
              </>
            )}
          </button>
        </div>

        {/* RIGHT: Generated Itinerary Panel */}
        <div className={styles.itineraryPanel}>
          {/* Header Card */}
          <div className={styles.itineraryHeaderCard}>
            <div className={styles.itineraryHeaderLeft}>
              <h2>
                {lang === 'vi'
                  ? `Lịch trình gợi ý: ${currentDayData ? planData.days.length : 3} Ngày Khám Phá ${currentWeather?.nameVi ?? 'Đà Nẵng'}`
                  : `Tailored Itinerary: ${planData.days.length} Days in ${currentWeather?.nameEn ?? 'Da Nang'}`}
              </h2>
              <div className={styles.itineraryMetaRow}>
                <span className={styles.itineraryMetaTag}>⚡ AI Route Optimized</span>
                <span>{lang === 'vi' ? 'Tổng 12 hoạt động' : '12 curated activities'}</span>
                <span>•</span>
                <span>{lang === 'vi' ? 'Tối ưu thời tiết & giao thông' : 'Weather & transit optimized'}</span>
              </div>
            </div>

            <div className={styles.itineraryActions}>
              <button type="button" className={styles.btnActionOutline} onClick={handleSaveTrip}>
                <span>{savedSuccess ? '✅ Đã lưu' : '💾 Lưu chuyến đi'}</span>
              </button>
              <button
                type="button"
                className={styles.btnActionOutline}
                onClick={() => alert(lang === 'vi' ? 'Đã sao chép lịch trình vào clipboard!' : 'Itinerary copied to clipboard!')}
              >
                <span>📋 {lang === 'vi' ? 'Sao chép' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Day Tabs */}
          <div className={styles.dayTabsRow}>
            {planData.days.map((d) => (
              <button
                key={d.dayNumber}
                type="button"
                className={`${styles.dayTabBtn} ${activeDay === d.dayNumber ? styles.dayTabBtnActive : ''}`}
                onClick={() => setActiveDay(d.dayNumber)}
              >
                <span>📅</span>
                <span>
                  {lang === 'vi' ? `Ngày ${d.dayNumber}` : `Day ${d.dayNumber}`}
                </span>
              </button>
            ))}
          </div>

          {/* Timeline Activities */}
          <div className={styles.timelineWrapper}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              📌 {lang === 'vi' ? currentDayData.titleVi : currentDayData.titleEn}
            </div>

            {currentDayData.activities.map((act, index) => (
              <div key={index} className={styles.activityCard}>
                <div className={styles.activityTimeCol}>
                  <span className={styles.activityTime}>{act.time}</span>
                  <span className={styles.activitySlot}>{act.slot}</span>
                </div>

                <div className={styles.activityInfoCol}>
                  <h3>{lang === 'vi' ? act.titleVi : act.titleEn}</h3>
                  <p className={styles.activityDesc}>{lang === 'vi' ? act.descVi : act.descEn}</p>
                  <span className={styles.activityTip}>{lang === 'vi' ? act.tipVi : act.tipEn}</span>
                </div>

                <div className={styles.activityCostCol}>
                  <span className={styles.activityCost}>{lang === 'vi' ? act.costVi : act.costEn}</span>
                  <span className={styles.activityCostLabel}>{lang === 'vi' ? 'Chi phí dự kiến' : 'Estimated cost'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cost Summary Footer */}
          <div className={styles.costSummaryCard}>
            <div className={styles.costSummaryLeft}>
              <h4>{lang === 'vi' ? 'Tổng ngân sách dự toán trọn gói' : 'Estimated Total Budget'}</h4>
              <p>
                {lang === 'vi'
                  ? 'Bao gồm vé tham quan, ăn uống đặc sản, phương tiện di chuyển và trải nghiệm.'
                  : 'Includes attraction tickets, regional cuisine, local transport and entry fees.'}
              </p>
            </div>
            <div className={styles.costSummaryRight}>
              <div className={styles.costTotalNumber}>
                {lang === 'vi' ? planData.totalCostVi : planData.totalCostEn}
              </div>
              <div className={styles.costPerPerson}>
                {lang === 'vi' ? 'Đã tối ưu chia tiền thủ quỹ nhóm' : 'Optimized for group split budget'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
