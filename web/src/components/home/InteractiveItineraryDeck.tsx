'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight,
  MapPin,
  Clock,
  Compass
} from 'lucide-react';
import styles from './interactive-itinerary-deck.module.css';

interface StopItem {
  time: string;
  name: string;
  category: string;
  note: string;
  distNext?: string;
}

interface DayPlan {
  dayNum: string;
  dayTitle: string;
  image: string;
  fieldNote: string;
  quoteAuthor: string;
  stops: StopItem[];
}

interface RouteStory {
  id: string;
  tabLabel: string;
  title: string;
  duration: string;
  dest: string;
  budgetEst: string;
  atmosphere: string;
  days: DayPlan[];
}

const ROUTE_STORIES: RouteStory[] = [
  {
    id: 'hue',
    tabLabel: '01. Cố Đô Thơ Mộng • Huế',
    title: 'Dấu Ấn Cố Đô & Trầm Tích Sông Hương',
    duration: '3 Ngày 2 Đêm',
    dest: 'Thừa Thiên Huế',
    budgetEst: '~1.850.000đ / người',
    atmosphere: 'Thanh tịnh & Hoài niệm',
    days: [
      {
        dayNum: 'Ngày 1',
        dayTitle: 'Trái Tim Kinh Thành & Hương Vị Sớm',
        image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_citadel.jpg',
        fieldNote: 'Hãy bước vào Đại Nội từ đầu giờ sáng khi nắng vàng rọi xiên qua Ngọ Môn, tiếng lá thông reo khẽ và không gian tĩnh mịch chưa bị xáo động bởi dòng người.',
        quoteAuthor: 'Ghi chép từ lữ khách bản địa',
        stops: [
          {
            time: '08:30',
            name: 'Bún bò Mụ Rơi & Đón bình minh Cố Đô',
            category: 'Ẩm thực gia truyền',
            note: 'Tô bún bò cay nồng thơm mùi sả ruốc, miếng chả cua quết tay ngọt lịm đánh thức trọn vẹn vị giác.',
            distNext: '3.5 km • 10 phút thong dong',
          },
          {
            time: '10:00',
            name: 'Đại Nội Hoàng Thành Triều Nguyễn',
            category: 'Di sản thế giới',
            note: 'Dạo bước qua Điện Thái Hòa, Thế Miếu và Tử Cấm Thành — nơi lắng đọng vàng son một thuở phong kiến.',
            distNext: '8.2 km • 18 phút qua đồi thông',
          },
          {
            time: '14:30',
            name: 'Lăng Khải Định kiến trúc Đông Tây',
            category: 'Tuyệt tác kiến trúc',
            note: 'Đỉnh cao nghệ thuật ghép sành sứ và thủy tinh tinh xảo bậc nhất trong hệ thống lăng tẩm hoàng gia.',
            distNext: '5.0 km • 12 phút về bến thuyền',
          },
          {
            time: '17:30',
            name: 'Thuyền rồng ngắm hoàng hôn Sông Hương',
            category: 'Trải nghiệm văn hóa',
            note: 'Thả trôi theo dòng Hương Giang tím biếc rực rỡ buổi chiều tà, lắng nghe từng làn điệu Ca Huế mộc mạc.',
          },
        ],
      },
      {
        dayNum: 'Ngày 2',
        dayTitle: 'Sắc Màu Làng Hương & Tiếng Chuông Cổ Tự',
        image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_real.jpg',
        fieldNote: 'Làng Thủy Xuân đẹp nhất lúc 9h sáng khi những bó hương ngũ sắc vừa được hong nắng, tỏa mùi trầm dịu nhẹ khắp con đường ven đồi Vọng Cảnh.',
        quoteAuthor: 'Nhật ký hành trình VISTA',
        stops: [
          {
            time: '08:30',
            name: 'Làng hương Thủy Xuân & Đồi Vọng Cảnh',
            category: 'Không gian văn hóa',
            note: 'Chụp lại những khung hình rực rỡ bên thềm hương hoa và ngắm khúc uốn ngoạn mục nhất của dòng Hương.',
            distNext: '4.5 km • 12 phút di chuyển',
          },
          {
            time: '11:00',
            name: 'Thưởng thức Bánh Bèo, Nậm, Lọc Bà Đỏ',
            category: 'Món ngon Cố Đô',
            note: 'Mâm bánh đúc đất sét nung ấm nóng, bột lọc tôm thịt trong veo chấm mắm ớt cay xé lưỡi.',
            distNext: '3.8 km • 10 phút',
          },
          {
            time: '15:00',
            name: 'Chùa Thiên Mụ & Tháp Phước Duyên',
            category: 'Thắng cảnh tâm linh',
            note: 'Cổ tự hơn 400 năm tuổi soi bóng thâm trầm, lắng nghe tiếng chuông chiều ngân vang giữa thinh không.',
            distNext: '3.0 km • 8 phút',
          },
          {
            time: '19:00',
            name: 'Cầu Tràng Tiền lên đèn & Chè hẻm 20 món',
            category: 'Đêm Cố Đô',
            note: 'Tản bộ ngắm cầu Tràng Tiền đổi sắc lung linh và tự thưởng ly chè bột lọc heo quay trứ danh.',
          },
        ],
      },
      {
        dayNum: 'Ngày 3',
        dayTitle: 'Hương Vị Phố Cổ & Quà Tặng Xứ Huế',
        image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg',
        fieldNote: 'Hãy ngồi lại một góc quán nhỏ ven đường Đặng Thái Thân, nhấp ngụm cà phê muối đậm đà và gom trọn dư vị êm đềm trước giờ tạm biệt.',
        quoteAuthor: 'Ghi chép từ lữ khách bản địa',
        stops: [
          {
            time: '07:30',
            name: 'Cà phê Muối xứ Huế đường Đặng Thái Thân',
            category: 'Thư giãn buổi sớm',
            note: 'Vị mằn mặn béo ngậy của lớp kem sữa hòa quyện với vị đắng thanh của hạt cà phê rang mộc.',
            distNext: '2.0 km • 6 phút',
          },
          {
            time: '09:30',
            name: 'Chợ Đông Ba gom quà đặc sản',
            category: 'Phong vị địa phương',
            note: 'Chọn mua kẹo mè xửng giòn, tôm chua Dì Cẩn và nón bài thơ mang về làm quà gửi người thân.',
            distNext: '14 km • 25 phút ra sân bay',
          },
          {
            time: '12:30',
            name: 'Sân bay Phú Bài — Kết thúc hành trình',
            category: 'Tạm biệt Cố Đô',
            note: 'Lưu giữ những tấm hình kỷ niệm đẹp và hoàn tất nhật ký hành trình trọn vẹn.',
          },
        ],
      },
    ],
  },
  {
    id: 'danang',
    tabLabel: '02. Biển Ngọc & Phố Cổ • Đà Nẵng - Hội An',
    title: 'Vệt Nắng Biển Ngọc & Đèn Lồng Sông Hoài',
    duration: '4 Ngày 3 Đêm',
    dest: 'Đà Nẵng',
    budgetEst: '~2.650.000đ / người',
    atmosphere: 'Trẻ trung & Thơ mộng',
    days: [
      {
        dayNum: 'Ngày 1',
        dayTitle: 'Sóng Biển Mỹ Khê & Cầu Rồng Rực Lửa',
        image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_real.jpg',
        fieldNote: 'Đà Nẵng chiều lòng người bằng làn gió biển Mỹ Khê mát rượi và nhịp sống văn minh, hiền hòa của thành phố đáng sống nhất Việt Nam.',
        quoteAuthor: 'Gợi ý từ VISTA Curators',
        stops: [
          {
            time: '09:00',
            name: 'Đón sân bay & Bánh tráng cuốn thịt heo Đại Lộc',
            category: 'Ẩm thực miền Trung',
            note: 'Đĩa thịt heo hai đầu da luộc mềm cuộn rau rừng chấm mắm nêm nguyên chất cay nồng.',
            distNext: '4.5 km • 10 phút ra biển',
          },
          {
            time: '15:30',
            name: 'Thả mình trên bãi biển Mỹ Khê cát trắng',
            category: 'Nghỉ dưỡng biển',
            note: 'Top bãi biển quyến rũ nhất hành tinh với bờ cát thoai thoải và làn nước xanh như ngọc bích.',
            distNext: '6.0 km • 15 phút về trung tâm',
          },
          {
            time: '21:00',
            name: 'Cầu Rồng phun lửa & phun nước',
            category: 'Kỳ quan đô thị',
            note: 'Màn trình diễn ánh sáng rực rỡ trên dòng sông Hàn vào mỗi tối cuối tuần.',
          },
        ],
      },
      {
        dayNum: 'Ngày 2',
        dayTitle: 'Cầu Vàng Giữa Biển Mây & Làng Pháp Cổ',
        image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_golden_bridge.jpg',
        fieldNote: 'Đứng trên Cầu Vàng lúc sáng sớm, bạn sẽ thấy đôi bàn tay khổng lồ như đang nâng niu dải lụa vàng giữa biển mây ngút ngàn.',
        quoteAuthor: 'Nhật ký hành trình VISTA',
        stops: [
          {
            time: '08:00',
            name: 'Tuyến cáp treo Bà Nà Hills kỷ lục thế giới',
            category: 'Kỳ quan thiên nhiên',
            note: 'Lướt trên những cánh rừng nguyên sinh bạt ngàn để chạm tới đỉnh núi Chúa mát lạnh.',
            distNext: '1.2 km • 5 phút dạo bộ',
          },
          {
            time: '09:30',
            name: 'Check-in Cầu Vàng vắt ngang vách núi',
            category: 'Biểu tượng thế giới',
            note: 'Khoảnh khắc mặt trời vừa ló rạng xua tan sương mù là thời điểm chụp ảnh ấn tượng nhất.',
            distNext: '2.5 km • 10 phút',
          },
          {
            time: '14:00',
            name: 'Làng Pháp cổ kính & Vườn hoa Le Jardin',
            category: 'Kiến trúc châu Âu',
            note: 'Thưởng thức kem tươi và hòa mình vào vũ điệu lễ hội sôi động giữa trời mây miền Trung.',
          },
        ],
      },
      {
        dayNum: 'Ngày 3',
        dayTitle: 'Rừng Dừa Bảy Mẫu & Đêm Đèn Lồng Hội An',
        image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hoian_ancient_town.jpg',
        fieldNote: 'Khi hoàng hôn buông xuống, dòng sông Hoài bừng sáng bởi hàng ngàn chiếc đèn hoa đăng lung linh, đưa Hội An trở về nét cổ tích trăm năm trước.',
        quoteAuthor: 'Ghi chép từ lữ khách bản địa',
        stops: [
          {
            time: '09:00',
            name: 'Chèo thuyền thúng Rừng dừa Bảy Mẫu',
            category: 'Sông nước miền Trung',
            note: 'Xem các bác lái đò biểu diễn xoay thúng ngoạn mục và giăng lưới bắt cá trên lạch nước.',
            distNext: '5.8 km • 12 phút về phố cổ',
          },
          {
            time: '15:30',
            name: 'Dạo bước Chùa Cầu & Nhà cổ Tấn Ký',
            category: 'Di sản thế giới',
            note: 'Chiêm ngưỡng những vách gỗ chạm trổ tinh vi mang dấu ấn giao thoa văn hóa Việt - Nhật - Hoa.',
            distNext: '1.0 km • 5 phút thong thả',
          },
          {
            time: '18:30',
            name: 'Thả hoa đăng sông Hoài & Cao lầu phố Hội',
            category: 'Đêm hoa đăng',
            note: 'Thưởng thức tô cao lầu sợi vàng dẻo dai ăn kèm tóp mỡ giòn rụm và ngắm phố rực rỡ sắc màu.',
          },
        ],
      },
    ],
  },
  {
    id: 'hagiang',
    tabLabel: '03. Giấc Mơ Mây Ngàn • Sa Pa - Hà Giang',
    title: 'Chinh Phục Mã Pí Lèng & Cột Cờ Lũng Cú',
    duration: '3 Ngày 2 Đêm',
    dest: 'Hà Giang',
    budgetEst: '~2.200.000đ / người',
    atmosphere: 'Hùng vĩ & Tự do',
    days: [
      {
        dayNum: 'Ngày 1',
        dayTitle: 'Cổng Trời Quản Bạ & Dốc Thẩm Mã Uốn Lượn',
        image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
        fieldNote: 'Vượt qua những con đèo dốc uốn lượn như dải lụa, cao nguyên đá Hà Giang hiện ra sừng sững, tráng lệ khiến con người cảm thấy nhỏ bé và tự do.',
        quoteAuthor: 'Hành trình đất Bắc',
        stops: [
          {
            time: '08:00',
            name: 'Cổng trời Quản Bạ & Núi Đôi Cô Tiên',
            category: 'Cửa ngõ cao nguyên',
            note: 'Chiêm ngưỡng bức tranh thung lũng Tam Sơn bồng bềnh trong biển sương sớm.',
            distNext: '45 km • 60 phút qua đèo',
          },
          {
            time: '13:30',
            name: 'Check-in Dốc Thẩm Mã chín tầng ngoạn mục',
            category: 'Cung đèo huyền thoại',
            note: 'Khúc cua 9 tầng uốn lượn quanh vách núi đá vôi xám ngắt — biểu tượng của lòng dũng cảm.',
            distNext: '22 km • 35 phút',
          },
          {
            time: '17:00',
            name: 'Phố cổ Đồng Văn lên đèn & Thắng dền nóng',
            category: 'Văn hóa vùng cao',
            note: 'Bát thắng dền ngọt cay vị gừng sưởi ấm đêm se lạnh giữa lòng thung lũng đá tai mèo.',
          },
        ],
      },
      {
        dayNum: 'Ngày 2',
        dayTitle: 'Cột Cờ Tổ Quốc & Đi Thuyền Hẻm Tu Sản',
        image: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/vietnam_lungcu_hero.jpg',
        fieldNote: 'Đứng dưới chân cột cờ Lũng Cú ngắm lá cờ Tổ quốc 54m² tung bay kiêu hãnh trên đỉnh núi Rồng, lòng dâng tràn niềm tự hào về dải non sông gấm vóc.',
        quoteAuthor: 'Ghi chép từ địa đầu Tổ quốc',
        stops: [
          {
            time: '08:30',
            name: 'Cột cờ Quốc gia Lũng Cú — Điểm cực Bắc',
            category: 'Thiêng liêng địa đầu',
            note: 'Chạm tay vào mốc chủ quyền thiêng liêng và phóng tầm mắt ngắm trọn làng mạc biên cương.',
            distNext: '32 km • 50 phút',
          },
          {
            time: '13:00',
            name: 'Chinh phục Đệ nhất hùng đèo Mã Pí Lèng',
            category: 'Kỳ quan thiên nhiên',
            note: 'Cung đường đèo cheo leo trên sườn núi đá, phía dưới là hẻm vực sâu thăm thẳm hùng vĩ.',
            distNext: '12 km • 25 phút xuống bến',
          },
          {
            time: '15:30',
            name: 'Đi thuyền trên dòng sông Nho Quế ngọc bích',
            category: 'Trải nghiệm đỉnh cao',
            note: 'Lướt giữa hai vách đá vôi cao ngút ngàn của Hẻm Tu Sản — hẻm vực sâu nhất Đông Nam Á.',
          },
        ],
      },
    ],
  },
];

export function InteractiveItineraryDeck() {
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const currentRoute = ROUTE_STORIES[activeRouteIndex];
  const validDayIndex = Math.min(activeDayIndex, currentRoute.days.length - 1);
  const currentDay = currentRoute.days[validDayIndex] || currentRoute.days[0];

  const handleSelectRoute = (idx: number) => {
    setActiveRouteIndex(idx);
    setActiveDayIndex(0);
  };

  return (
    <section className={styles.itinerarySection} id="sample-itineraries" aria-label="Ký Họa Những Cung Đường">
      <div className={styles.container}>
        {/* Editorial Section Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>
            <span>HÀNH TRÌNH CHỌN LỌC</span>
          </div>
          <h2 className={styles.sectionMainTitle}>
            Ký Họa Những Cung Đường Đẹp Nhất Việt Nam
          </h2>
          <p className={styles.sectionDesc}>
            Mỗi lộ trình là một câu chuyện được chắt lọc từ trải nghiệm thực địa — cân đối nhịp bước thong dong, trọn vẹn cảnh sắc và phong vị bản địa.
          </p>
        </div>

        {/* Minimalist Editorial Route Tabs */}
        <div className={styles.routeTabsRow}>
          {ROUTE_STORIES.map((r, idx) => (
            <button
              key={r.id}
              type="button"
              className={`${styles.routeTabBtn} ${activeRouteIndex === idx ? styles.routeTabBtnActive : ''}`}
              onClick={() => handleSelectRoute(idx)}
            >
              <span>{r.tabLabel}</span>
            </button>
          ))}
        </div>

        {/* Editorial Journal Canvas */}
        <div className={styles.journalCanvas}>
          {/* Left Column: Atmospheric Postcard & Field Note */}
          <div className={styles.postcardCol}>
            <div className={styles.postcardImageWrap}>
              <img 
                src={currentDay.image} 
                alt={currentDay.dayTitle} 
                className={styles.postcardImage} 
              />
              <div className={styles.postcardOverlay} />

              {/* Destination Tag */}
              <div className={styles.postcardTopTag}>
                <MapPin size={12} />
                <span>{currentRoute.dest} • {currentRoute.duration}</span>
              </div>

              {/* Day Chapters Bar embedded on Photo */}
              <div className={styles.dayChaptersRow}>
                {currentRoute.days.map((d, dIdx) => (
                  <button
                    key={dIdx}
                    type="button"
                    className={`${styles.dayChapterBtn} ${validDayIndex === dIdx ? styles.dayChapterBtnActive : ''}`}
                    onClick={() => setActiveDayIndex(dIdx)}
                  >
                    <span>{d.dayNum}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Authentic Traveler Field Note */}
            <div className={styles.fieldNoteBox}>
              <div className={styles.fieldNoteQuote}>
                &ldquo;{currentDay.fieldNote}&rdquo;
              </div>
              <div className={styles.fieldNoteAuthorRow}>
                <span className={styles.fieldNoteAuthor}>{currentDay.quoteAuthor}</span>
                <span className={styles.fieldNoteMeta}>{currentRoute.budgetEst}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Curated Stop-by-Stop Itinerary */}
          <div className={styles.timelineCol}>
            {/* Header: Day Title & Atmosphere */}
            <div className={styles.timelineHeader}>
              <div>
                <span className={styles.timelineDayTag}>{currentDay.dayNum}</span>
                <h3 className={styles.timelineDayHeading}>{currentDay.dayTitle}</h3>
              </div>
              <span className={styles.timelineAtmosphereBadge}>{currentRoute.atmosphere}</span>
            </div>

            {/* List of Stops */}
            <div className={styles.stopsList}>
              {currentDay.stops.map((stop, sIdx) => (
                <div key={sIdx} className={styles.stopEntry}>
                  <div className={styles.stopTimeCol}>
                    <span className={styles.stopTimeText}>{stop.time}</span>
                    <div className={styles.stopNodeDot} />
                    {sIdx < currentDay.stops.length - 1 && <div className={styles.stopConnectorLine} />}
                  </div>

                  <div className={styles.stopContentBox}>
                    <div className={styles.stopHeaderRow}>
                      <h4 className={styles.stopTitle}>{stop.name}</h4>
                      <span className={styles.stopCategory}>{stop.category}</span>
                    </div>
                    <p className={styles.stopNote}>{stop.note}</p>

                    {stop.distNext && (
                      <div className={styles.stopDistHint}>
                        <span>{stop.distNext}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Action */}
            <div className={styles.timelineFooter}>
              <Link 
                href={`/planner?destination=${encodeURIComponent(currentRoute.dest)}&days=3`}
                className={styles.btnCustomizeRoute}
              >
                <span>Tùy biến hành trình này trong AI Planner</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
