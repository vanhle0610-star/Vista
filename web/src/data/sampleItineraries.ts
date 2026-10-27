// Comprehensive, authentic multi-destination sample itineraries for VISTA Trips Hub

export interface ActivityItem {
  id: string;
  timeSlot?: string;
  timeRange?: string;
  title: string;
  description?: string;
  location?: string;
  costVnd?: number;
  costLabel?: string;
  category?: string;
  image?: string;
  tips?: string;
}

export interface DayPlanItem {
  dayNumber: number;
  dateStr?: string;
  title: string;
  activities: ActivityItem[];
}

export const POPULAR_DESTINATIONS = [
  'Thừa Thiên Huế',
  'TP. Đà Nẵng',
  'Hà Nội',
  'Quảng Nam (Hội An)',
  'Lâm Đồng (Đà Lạt)',
  'Khánh Hòa (Nha Trang)',
  'Kiên Giang (Phú Quốc)',
  'Bình Định (Quy Nhơn)',
  'Ninh Bình',
  'Lào Cai (Sa Pa)',
  'TP. Hồ Chí Minh',
  'Quảng Ninh (Hạ Long)',
];

export const SAMPLE_HUE_DAYS: DayPlanItem[] = [
  {
    dayNumber: 1,
    title: 'Tinh hoa Cố Đô: Đại Nội Hoàng Cung & Hoàng hôn Sông Hương',
    dateStr: 'Ngày 1',
    activities: [
      {
        id: 'hue-1-1',
        timeSlot: 'MORNING',
        timeRange: '07:30 – 09:00',
        title: 'Thưởng thức Bún bò Huế Mụ Rơi & Cà phê Muối xứ Huế',
        description: 'Khởi đầu ngày mới với tô bún bò Huế chuẩn vị cay nồng đậm đà và ly cà phê muối béo ngậy trứ danh.',
        location: 'Nguyễn Du, TP. Huế',
        costVnd: 55000,
        costLabel: '55.000đ / người',
        category: 'Ẩm thực & Cà phê',
        image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80',
        tips: 'Nên ghé sớm trước 8h30 để tận hưởng không gian thoáng mát và cà phê muối thơm ngon nhất! ☕',
      },
      {
        id: 'hue-1-2',
        timeSlot: 'MORNING',
        timeRange: '09:30 – 12:00',
        title: 'Đại Nội Huế – Ngọ Môn, Điện Thái Hòa & Tử Cấm Thành',
        description: 'Chiêm ngưỡng quần thể di tích hoàng gia triều Nguyễn được UNESCO công nhận là Di sản Văn hóa Thế giới.',
        location: 'Hoàng thành Huế, Thuận Thành',
        costVnd: 200000,
        costLabel: '200.000đ / vé',
        category: 'Di tích & Văn hóa',
        image: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=800&q=80',
        tips: 'Khuôn viên Đại Nội rất rộng, nên thuê xe điện hoặc mang ô che nắng và quạt cầm tay nhé. 🏛️',
      },
      {
        id: 'hue-1-3',
        timeSlot: 'AFTERNOON',
        timeRange: '14:30 – 17:30',
        title: 'Chùa Thiên Mụ & Thưởng ngoạn hoàng hôn trên Sông Hương',
        description: 'Viếng ngôi cổ tự hơn 400 năm tuổi soi bóng bên dòng Hương Giang thơ mộng, đón hoàng hôn cố đô.',
        location: 'Đồi Hà Khê, Kim Long, TP. Huế',
        costVnd: 0,
        costLabel: 'Miễn phí tham quan',
        category: 'Tâm linh & Cảnh quan',
        image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
        tips: 'Hoàng hôn từ tháp Phước Duyên nhìn xuống dòng sông Hương là một trong những góc ảnh kinh điển của Huế. 📸',
      },
      {
        id: 'hue-1-4',
        timeSlot: 'EVENING',
        timeRange: '18:30 – 21:00',
        title: 'Ẩm thực Cố Đô: Bánh bèo, nậm, lọc & Nghe Ca Huế trên Sông Hương',
        description: 'Thưởng thức mâm bánh cung đình truyền thống và trải nghiệm thả hoa đăng, thưởng thức nhã nhạc ca Huế trên thuyền rồng.',
        location: 'Bến thuyền Tòa Khâm, TP. Huế',
        costVnd: 150000,
        costLabel: '150.000đ / người',
        category: 'Nghệ thuật & Ẩm thực',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        tips: 'Nên đặt vé thuyền rồng ca Huế suất 19h hoặc 20h để có vị trí ngắm cầu Trường Tiền đổi màu lung linh nhất. 🎶',
      },
    ],
  },
  {
    dayNumber: 2,
    title: 'Dấu ấn Lăng tẩm Hoàng gia & Làng nghề Thủy Xuân',
    dateStr: 'Ngày 2',
    activities: [
      {
        id: 'hue-2-1',
        timeSlot: 'MORNING',
        timeRange: '08:00 – 11:00',
        title: 'Lăng Khải Định (Ứng Lăng) – Tuyệt tác khảm sành sứ Á - Âu',
        description: 'Khám phá lăng tẩm có kiến trúc tinh xảo bậc nhất kết hợp giữa văn hóa phương Đông và kiến trúc Pháp cổ điển.',
        location: 'Xã Thủy Bằng, Hương Thủy, Thừa Thiên Huế',
        costVnd: 150000,
        costLabel: '150.000đ / vé',
        category: 'Kiến trúc & Di tích',
        image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
        tips: 'Bức bích họa Cửu Long Ẩn Vân trên trần cung Thiên Định là kiệt tác nghệ thuật hội họa không thể bỏ lỡ! 🎨',
      },
      {
        id: 'hue-2-2',
        timeSlot: 'AFTERNOON',
        timeRange: '13:30 – 15:30',
        title: 'Check-in Làng hương Trầm Thủy Xuân & Thuê cổ phục',
        description: 'Trải nghiệm không gian rực rỡ sắc màu của các bó hương trầm xòe quạt và chụp ảnh kỷ niệm với áo Nhật Bình, Ngũ Thân.',
        location: 'Đường Huyền Trân Công Chúa, TP. Huế',
        costVnd: 100000,
        costLabel: '100.000đ / thuê cổ phục',
        category: 'Làng nghề truyền thống',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        tips: 'Các cô chú làng hương rất nhiệt tình hỗ trợ tạo dáng và cho mượn quạt, nón bài thơ chụp ảnh miễn phí. 🌸',
      },
      {
        id: 'hue-2-3',
        timeSlot: 'AFTERNOON',
        timeRange: '16:00 – 18:00',
        title: 'Ngắm toàn cảnh Cố đô từ Đồi Vọng Cảnh',
        description: 'Đứng trên đồi cao ngắm khúc quanh êm đềm nhất của sông Hương giữa rừng thông bạt ngàn mát rượi.',
        location: 'Đồi Vọng Cảnh, Thủy Biều, TP. Huế',
        costVnd: 0,
        costLabel: 'Miễn phí tham quan',
        category: 'Thiên nhiên & Sinh thái',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
        tips: 'Gió chiều đồi thông rất mát, bạn có thể mua thêm ly trà sữa hoặc chè mâm chân đồi để nhâm nhi ngắm cảnh. 🌲',
      },
      {
        id: 'hue-2-4',
        timeSlot: 'EVENING',
        timeRange: '19:00 – 21:30',
        title: 'Dạo Chợ đêm Đông Ba & Cầu Trường Tiền phố đi bộ',
        description: 'Khám phá thiên đường quà vặt: Chè bột lọc heo quay, bánh ép Huế, nem lụi và mua mè xửng làm quà.',
        location: 'Trần Hưng Đạo, Phú Hòa, TP. Huế',
        costVnd: 120000,
        costLabel: '120.000đ / người',
        category: 'Chợ đêm & Mua sắm',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        tips: 'Món chè bột lọc bọc heo quay mặn ngọt béo ngậy độc nhất vô nhị chỉ có tại xứ Huế, nhất định phải thử một lần! 🥣',
      },
    ],
  },
  {
    dayNumber: 3,
    title: 'Lăng Tự Đức Khiêm Lăng & Di sản Văn hóa Cố Đô',
    dateStr: 'Ngày 3',
    activities: [
      {
        id: 'hue-3-1',
        timeSlot: 'MORNING',
        timeRange: '08:30 – 11:30',
        title: 'Lăng Tự Đức (Khiêm Lăng) – Non nước hữu tình',
        description: 'Tham quan một trong những công trình lăng tẩm thơ mộng nhất của triều Nguyễn với hồ Lưu Khiêm và nhà hát cổ Minh Khiêm Đường.',
        location: 'Thôn Thượng Ba, Thủy Xuân, TP. Huế',
        costVnd: 150000,
        costLabel: '150.000đ / vé',
        category: 'Di tích & Thơ ca',
        image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
        tips: 'Hồ sen Lưu Khiêm vào sáng sớm nở rất thơm, ngồi ở Xung Khiêm Tạ ngắm cá bơi lội cực kỳ thanh tịnh. 🪷',
      },
      {
        id: 'hue-3-2',
        timeSlot: 'AFTERNOON',
        timeRange: '13:30 – 16:30',
        title: 'Bảo tàng Cổ vật Cung đình Huế & Mua đặc sản mè xửng Thiên Hương',
        description: 'Chiêm ngưỡng bảo vật hoàng kim triều Nguyễn và mua quà lưu niệm kẹo cau, mè xửng, nón bài thơ gửi tặng người thân.',
        location: 'Số 3 Lê Trực, Thuận Thành, TP. Huế',
        costVnd: 50000,
        costLabel: '50.000đ / vé',
        category: 'Bảo tàng & Quà tặng',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        tips: 'Nên mua mè xửng giòn hoặc mè dẻo của hiệu Thiên Hương uy tín để đảm bảo hương vị truyền thống chuẩn xác. 🎁',
      },
    ],
  },
];

export const SAMPLE_DANANG_DAYS: DayPlanItem[] = [
  {
    dayNumber: 1,
    title: 'Bán đảo Sơn Trà, Chùa Linh Ứng & Biển Mỹ Khê',
    dateStr: 'Ngày 1',
    activities: [
      {
        id: 'dn-1-1',
        timeSlot: 'MORNING',
        timeRange: '08:00 – 11:00',
        title: 'Bán đảo Sơn Trà & Chiêm bái Chùa Linh Ứng Bãi Bụt',
        description: 'Ngắm tượng Phật Bà Quan Âm cao 67m hướng ra biển Đông và ngắm toàn cảnh vịnh Đà Nẵng tuyệt đẹp.',
        location: 'Bán đảo Sơn Trà, TP. Đà Nẵng',
        costVnd: 0,
        costLabel: 'Miễn phí tham quan',
        category: 'Tâm linh & Cảnh quan',
        image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
        tips: 'Đường lên chùa rất đẹp, có thể bắt gặp voọc chà vá chân nâu quý hiếm trên các rặng cây ven đường. 🐒',
      },
      {
        id: 'dn-1-2',
        timeSlot: 'AFTERNOON',
        timeRange: '15:00 – 18:00',
        title: 'Tắm biển Mỹ Khê & Thưởng thức dừa xiêm bãi biển',
        description: 'Thư giãn tại một trong sáu bãi biển quyến rũ nhất hành tinh do tạp chí Forbes bình chọn.',
        location: 'Đường Võ Nguyên Giáp, Sơn Trà',
        costVnd: 40000,
        costLabel: '40.000đ / trái dừa',
        category: 'Biển & Nghỉ dưỡng',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        tips: 'Bãi tắm sạch cát mịn và sóng thoai thoải, khu vực đối diện công viên Biển Đông chụp ảnh đàn bồ câu rất đẹp. 🕊️',
      },
      {
        id: 'dn-1-3',
        timeSlot: 'EVENING',
        timeRange: '19:00 – 21:30',
        title: 'Cầu Rồng phun lửa, phun nước & Ẩm thực Chợ đêm Sơn Trà',
        description: 'Chiêm ngưỡng biểu tượng rồng vàng phun lửa lúc 21h cuối tuần và ăn hải sản Bé Mặn tươi sống.',
        location: 'Đường Trần Hưng Đạo, An Hải Tây',
        costVnd: 200000,
        costLabel: '200.000đ / người',
        category: 'Ẩm thực & Giải trí',
        image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80',
        tips: 'Nên đứng ở bờ đông cầu Rồng hướng nhìn về phía đầu rồng để chụp ảnh góc đẹp mà không bị dính nước phun. 🐉',
      },
    ],
  },
  {
    dayNumber: 2,
    title: 'Thiên đường giải trí Sun World Bà Nà Hills & Cầu Vàng',
    dateStr: 'Ngày 2',
    activities: [
      {
        id: 'dn-2-1',
        timeSlot: 'MORNING',
        timeRange: '08:30 – 12:30',
        title: 'Cáp treo Bà Nà Hills & Check-in Cầu Vàng Bàn Tay Khổng Lồ',
        description: 'Tận hưởng khí hậu 4 mùa trong 1 ngày, bước trên dải lụa Cầu Vàng vắt ngang qua mây trời.',
        location: 'Xã Hòa Phú, Huyện Hòa Vang, Đà Nẵng',
        costVnd: 900000,
        costLabel: '900.000đ / vé cáp treo',
        category: 'Kỳ quan & Giải trí',
        image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
        tips: 'Lên cáp treo sớm chuyến 8h sáng để chụp ảnh Cầu Vàng lúc ít khách nhất đón ánh nắng ban mai rực rỡ. ☀️',
      },
      {
        id: 'dn-2-2',
        timeSlot: 'AFTERNOON',
        timeRange: '13:00 – 16:30',
        title: 'Làng Pháp cổ kính & Công viên giải trí Fantasy Park',
        description: 'Lạc bước giữa những lâu đài kiến trúc Gothic châu Âu lãng mạn và trải nghiệm tàu lượn siêu tốc.',
        location: 'Đỉnh Bà Nà Hills',
        costVnd: 0,
        costLabel: 'Đã bao gồm trong vé cáp',
        category: 'Vui chơi & Check-in',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
        tips: 'Quảng trường Du Dôme thường có các show biểu diễn carnival nghệ thuật châu Âu lúc 14h rất sôi động. 🏰',
      },
    ],
  },
  {
    dayNumber: 3,
    title: 'Khám phá Ngũ Hành Sơn & Ẩm thực Mì Quảng Đà Nẵng',
    dateStr: 'Ngày 3',
    activities: [
      {
        id: 'dn-3-1',
        timeSlot: 'MORNING',
        timeRange: '08:30 – 11:30',
        title: 'Danh thắng Ngũ Hành Sơn & Động Huyền Không huyền ảo',
        description: 'Khám phá 5 ngọn núi Kim, Mộc, Thủy, Hỏa, Thổ với hang động kỳ bí và chùa Tam Thai cổ kính.',
        location: 'Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
        costVnd: 40000,
        costLabel: '40.000đ / vé',
        category: 'Di tích & Thám hiểm',
        image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
        tips: 'Động Huyền Không có luồng ánh sáng trời rọi thẳng xuống từ vòm hang cực kỳ linh thiêng và tráng lệ. 🌄',
      },
      {
        id: 'dn-3-2',
        timeSlot: 'AFTERNOON',
        timeRange: '12:00 – 15:00',
        title: 'Thưởng thức Mì Quảng Ếch Bếp Trang & Chợ Cồn Đà Nẵng',
        description: 'Thưởng thức tô Mì Quảng chuẩn vị miền Trung và mua đặc sản chả bò, tré, mực một nắng làm quà.',
        location: 'Hùng Vương, Hải Châu, Đà Nẵng',
        costVnd: 150000,
        costLabel: '150.000đ / người',
        category: 'Ẩm thực & Chợ truyền thống',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        tips: 'Khu ẩm thực Chợ Cồn có ốc hút, bánh tráng kẹp và chè sầu Liên nức tiếng giá cực kỳ sinh viên. 🍲',
      },
    ],
  },
];

export const SAMPLE_DALAT_DAYS: DayPlanItem[] = [
  {
    dayNumber: 1,
    title: 'Thành phố ngàn hoa: Hồ Xuân Hương & Quảng trường Lâm Viên',
    dateStr: 'Ngày 1',
    activities: [
      {
        id: 'dl-1-1',
        timeSlot: 'MORNING',
        timeRange: '07:30 – 09:30',
        title: 'Bánh mì xíu mại Hoàng Diệu & Cà phê vợt sương sớm',
        description: 'Húp chén xíu mại nóng hổi béo ngậy giữa cái se lạnh đặc trưng của phố núi Đà Lạt ban sớm.',
        location: '26 Hoàng Diệu, Phường 5, TP. Đà Lạt',
        costVnd: 45000,
        costLabel: '45.000đ / phần',
        category: 'Ẩm thực & Sáng sớm',
        image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80',
        tips: 'Quán rất đông khách sau 8h, bạn nên ghé sớm để thưởng thức bánh mì giòn rụm và sữa đậu nành nóng. ☕',
      },
      {
        id: 'dl-1-2',
        timeSlot: 'MORNING',
        timeRange: '10:00 – 12:00',
        title: 'Quảng trường Lâm Viên – Nụ hoa Atiso & Bông hoa dã quỳ',
        description: 'Biểu tượng kiến trúc kính màu hiện đại bên bờ hồ Xuân Hương thơ mộng.',
        location: 'Trần Quốc Toản, Phường 1, TP. Đà Lạt',
        costVnd: 0,
        costLabel: 'Miễn phí tham quan',
        category: 'Check-in & Cảnh quan',
        image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
        tips: 'Góc chụp từ bậc thang nhìn lên nụ hoa Atiso khổng lồ lấy trọn vẹn nền trời xanh trong vắt. 📸',
      },
      {
        id: 'dl-1-3',
        timeSlot: 'EVENING',
        timeRange: '18:00 – 21:30',
        title: 'Chợ đêm Đà Lạt – Bánh tráng nướng & Sữa đậu nành nóng',
        description: 'Lạc bước vào thiên đường ẩm thực đường phố, thưởng thức "pizza Đà Lạt", dâu lắc và khoai lang nướng.',
        location: 'Khu Hòa Bình, Phường 1, TP. Đà Lạt',
        costVnd: 100000,
        costLabel: '100.000đ / người',
        category: 'Chợ đêm & Ẩm thực',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        tips: 'Khí trời về đêm xuống 16°C - 18°C, nhớ mang theo áo khoác ấm và khăn quàng cổ nhé! 🧣',
      },
    ],
  },
  {
    dayNumber: 2,
    title: 'Hùng vĩ Cao nguyên: Thác Datanla & Đồi chè Cầu Đất săn mây',
    dateStr: 'Ngày 2',
    activities: [
      {
        id: 'dl-2-1',
        timeSlot: 'MORNING',
        timeRange: '08:30 – 11:30',
        title: 'Thác Datanla & Trải nghiệm Máng trượt băng rừng dài nhất Đông Nam Á',
        description: 'Thử thách cảm giác mạnh lướt qua những tán thông bạt ngàn và chiêm ngưỡng dòng thác cuồn cuộn.',
        location: 'Đèo Prenn, Quốc lộ 20, Đà Lạt',
        costVnd: 200000,
        costLabel: '200.000đ / vé máng trượt',
        category: 'Mạo hiểm & Thiên nhiên',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
        tips: 'Máng trượt có phanh tay tự điều tốc, bạn có thể tự tin làm chủ tốc độ lướt vi vu giữa rừng thông. 🌲',
      },
      {
        id: 'dl-2-2',
        timeSlot: 'AFTERNOON',
        timeRange: '14:00 – 17:30',
        title: 'Đồi chè Cầu Đất – Tuabin gió khổng lồ & Hoàng hôn đồi chè',
        description: 'Chiêm ngưỡng biển chè xanh ngát trải dài tít tắp và check-in cánh đồng điện gió đẹp như trời Âu.',
        location: 'Xã Xuân Trường, TP. Đà Lạt',
        costVnd: 0,
        costLabel: 'Miễn phí tham quan',
        category: 'Thiên nhiên & Sinh thái',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        tips: 'Hoàng hôn buông xuống đồi chè lúc 16h30 mang sắc vàng cam tuyệt mỹ, nhớ thử món trà oolong thơm lừng tại quán Cầu Đất Farm. 🍵',
      },
    ],
  },
  {
    dayNumber: 3,
    title: 'Vườn hoa Thành Phố & Tiệm cà phê ngắm thung lũng thông',
    dateStr: 'Ngày 3',
    activities: [
      {
        id: 'dl-3-1',
        timeSlot: 'MORNING',
        timeRange: '09:00 – 12:00',
        title: 'Ga xe lửa cổ Đà Lạt – Kiến trúc răng cưa độc đáo',
        description: 'Nhà ga xe lửa cổ nhất Đông Dương mang phong cách Art Deco kết hợp nhà rông Tây Nguyên.',
        location: '1 Quang Trung, Phường 9, TP. Đà Lạt',
        costVnd: 30000,
        costLabel: '30.000đ / vé',
        category: 'Di tích & Kiến trúc',
        image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
        tips: 'Toa tàu cổ bằng gỗ màu nâu đỏ và đầu máy hơi nước chạy than là background check-in mang phong vị hoài cổ sâu lắng. 🚂',
      },
      {
        id: 'dl-3-2',
        timeSlot: 'AFTERNOON',
        timeRange: '14:00 – 16:30',
        title: 'Cà phê thung lũng đồi thông & Mua mứt atiso, hồng treo gió làm quà',
        description: 'Ngắm thung lũng mây trôi lững lờ bên tách trà ấm và ghé chợ Lăng Biang mua đặc sản dâu tây giống Nhật.',
        location: 'Đường Hùng Vương, TP. Đà Lạt',
        costVnd: 120000,
        costLabel: '120.000đ / người',
        category: 'Cà phê & Quà tặng',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        tips: 'Hồng treo gió công nghệ Nhật Bản mềm dẻo tươm mật tự nhiên là món quà biếu quý giá và chất lượng nhất. 🎁',
      },
    ],
  },
];

export const SAMPLE_HANOI_DAYS: DayPlanItem[] = [
  {
    dayNumber: 1,
    title: 'Tinh hoa Cố Đô: Hồ Gươm, Phố Cổ & Văn Miếu',
    dateStr: 'Ngày 1',
    activities: [
      {
        id: 'hn-1-1',
        timeSlot: 'MORNING',
        timeRange: '07:30 – 10:00',
        title: 'Hồ Hoàn Kiếm, Tháp Rùa & Đền Ngọc Sơn',
        description: 'Dạo quanh hồ Gươm buổi sớm mai thanh bình, ngắm cầu Thê Húc đỏ son và viếng đền Ngọc Sơn cổ kính.',
        location: 'Hoàn Kiếm, Hà Nội',
        costVnd: 30000,
        costLabel: '30.000đ / người',
        category: 'Di tích & Văn hóa',
        image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
        tips: 'Sáng sớm bờ hồ rất vắng và mát mẻ, chụp cầu Thê Húc góc nghiêng đón nắng sớm sẽ cực kỳ rực rỡ! 📸',
      },
      {
        id: 'hn-1-2',
        timeSlot: 'MORNING',
        timeRange: '10:30 – 12:00',
        title: 'Thưởng thức Cà phê Trứng Giảng 39 Nguyễn Hữu Huân',
        description: 'Thưởng thức hương vị cà phê trứng béo ngậy nức tiếng Hà Thành từ năm 1946 tại góc phố cổ.',
        location: '39 Nguyễn Hữu Huân, Hoàn Kiếm',
        costVnd: 45000,
        costLabel: '45.000đ / ly',
        category: 'Ẩm thực & Cà phê',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
        tips: 'Nên uống khi còn nóng hổi trong bát nước ấm để cảm nhận trọn vẹn lớp kem trứng mịn màng! ☕',
      },
      {
        id: 'hn-1-3',
        timeSlot: 'AFTERNOON',
        timeRange: '13:30 – 16:30',
        title: 'Văn Miếu – Quốc Tử Giám & Khuê Văn Các',
        description: 'Khám phá trường đại học đầu tiên của Việt Nam, ngắm bia tiến sĩ nghìn năm văn hiến và kiến trúc thời Lê.',
        location: '58 Quốc Tử Giám, Đống Đa',
        costVnd: 70000,
        costLabel: '70.000đ / vé',
        category: 'Di tích lịch sử',
        image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
        tips: 'Mang theo thẻ sinh viên/học sinh nếu có để giảm 50% giá vé, nên mặc áo dài hoặc đồ lịch sự trang nhã. 🏛️',
      },
      {
        id: 'hn-1-4',
        timeSlot: 'EVENING',
        timeRange: '18:30 – 21:30',
        title: 'Ẩm thực Tạ Hiện & Chợ đêm Phố Cổ Hà Nội',
        description: 'Khám phá ngõ bia sầm uất Tạ Hiện, thưởng thức nem chua rán, bún chả que tre và dạo chợ đêm Đồng Xuân.',
        location: 'Phố Cổ, Hoàn Kiếm, Hà Nội',
        costVnd: 200000,
        costLabel: '200.000đ / người',
        category: 'Ẩm thực đường phố',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        tips: 'Ngõ Tạ Hiện sôi động nhất từ 19h30, nhớ thử món nem chua rán giòn rụm và chim cút nướng mật ong nhé! 🍢',
      },
    ],
  },
  {
    dayNumber: 2,
    title: 'Dấu ấn Lịch sử & Hoàng hôn Hồ Tây lãng mạn',
    dateStr: 'Ngày 2',
    activities: [
      {
        id: 'hn-2-1',
        timeSlot: 'MORNING',
        timeRange: '08:00 – 11:30',
        title: 'Quảng trường Ba Đình, Lăng Bác & Chùa Một Cột',
        description: 'Viếng lăng Chủ tịch Hồ Chí Minh, tham quan nhà sàn ao cá Bác Hồ và ngôi chùa Một Cột hình đài sen ngàn năm tuổi.',
        location: 'Quảng trường Ba Đình, Hà Nội',
        costVnd: 0,
        costLabel: 'Miễn phí cho người Việt Nam',
        category: 'Di tích Lịch sử',
        image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
        tips: 'Trang phục chỉnh tề lịch sự, giữ trật tự và không mang máy ảnh/điện thoại vào trong phòng viếng Lăng. 🚩',
      },
      {
        id: 'hn-2-2',
        timeSlot: 'AFTERNOON',
        timeRange: '15:30 – 18:00',
        title: 'Đạp vịt ngắm hoàng hôn Hồ Tây & Chùa Trấn Quốc',
        description: 'Ngắm chùa Trấn Quốc cổ kính nhất Thăng Long và đón gió mát hoàng hôn lãng mạn trên mặt hồ Tây.',
        location: 'Đường Thanh Niên, Tây Hồ, Hà Nội',
        costVnd: 80000,
        costLabel: '80.000đ / thuyền',
        category: 'Cảnh quan & Thư giãn',
        image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80',
        tips: 'Đoạn đường Thanh Niên ngăn cách giữa hồ Tây và hồ Trúc Bạch là điểm ngắm hoàng hôn đỏ ối đẹp nhất Hà Nội. 🌅',
      },
    ],
  },
  {
    dayNumber: 3,
    title: 'Bảo tàng Dân tộc học & Làng gốm Bát Tràng',
    dateStr: 'Ngày 3',
    activities: [
      {
        id: 'hn-3-1',
        timeSlot: 'MORNING',
        timeRange: '08:30 – 11:30',
        title: 'Bảo tàng Dân tộc học Việt Nam',
        description: 'Tìm hiểu nét văn hóa đa dạng của 54 dân tộc anh em qua nhà rông Tây Nguyên, nhà sàn Mường và múa rối nước.',
        location: 'Đường Nguyễn Văn Huyên, Cầu Giấy',
        costVnd: 40000,
        costLabel: '40.000đ / vé',
        category: 'Bảo tàng & Văn hóa',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        tips: 'Khu vườn ngoài trời có nhà rông Ba Na cao vút và nhà mồ Gia Rai rất độc đáo, có biểu diễn múa rối nước lúc 10h. 🎪',
      },
      {
        id: 'hn-3-2',
        timeSlot: 'AFTERNOON',
        timeRange: '13:00 – 16:30',
        title: 'Làng gốm sứ Bát Tràng & Tự vuốt gốm thủ công',
        description: 'Khám phá bảo tàng gốm Bát Tràng 7 tầng xoắn ốc độc đáo và trải nghiệm tự tay nặn gốm kỉ niệm.',
        location: 'Gia Lâm, Hà Nội',
        costVnd: 80000,
        costLabel: '80.000đ / trải nghiệm',
        category: 'Làng nghề truyền thống',
        image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
        tips: 'Chỉ từ 40k - 60k bạn được tự tay nặn ly/chén gốm và thợ sẽ sấy khô vẽ màu đóng gói mang về làm kỉ niệm xinh xắn! 🏺',
      },
    ],
  },
];

export const SAMPLE_GENERIC_DAYS = (dest: string): DayPlanItem[] => [
  {
    dayNumber: 1,
    title: `Khám phá Danh thắng trung tâm & Văn hóa ẩm thực ${dest}`,
    dateStr: 'Ngày 1',
    activities: [
      {
        id: `${dest}-1-1`,
        timeSlot: 'MORNING',
        timeRange: '08:00 – 11:00',
        title: `Quần thể danh thắng di tích trung tâm ${dest}`,
        description: `Tham quan các biểu tượng kiến trúc, di tích văn hóa lịch sử và check-in các điểm đến đặc sắc tại ${dest}.`,
        location: `Trung tâm ${dest}`,
        costVnd: 80000,
        costLabel: '80.000đ / vé',
        category: 'Di tích & Văn hóa',
        image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
        tips: `Nên khởi hành sớm để tránh nắng gắt và tận hưởng không gian trong lành nhất của ${dest}. 📸`,
      },
      {
        id: `${dest}-1-2`,
        timeSlot: 'AFTERNOON',
        timeRange: '14:30 – 17:30',
        title: `Trải nghiệm thiên nhiên & Cảnh quan sinh thái ${dest}`,
        description: `Khám phá các thắng cảnh tự nhiên, hồ sinh thái và hòa mình vào nhịp sống hiền hòa của người dân địa phương.`,
        location: `Khu sinh thái ${dest}`,
        costVnd: 60000,
        costLabel: '60.000đ / vé',
        category: 'Thiên nhiên & Sinh thái',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        tips: `Trời chiều hoàng hôn rất đẹp, nhớ sạc đầy pin điện thoại để lưu lại những khoảnh khắc tuyệt mỹ! 🌄`,
      },
      {
        id: `${dest}-1-3`,
        timeSlot: 'EVENING',
        timeRange: '18:30 – 21:00',
        title: `Thiên đường ẩm thực đặc sản & Chợ đêm ${dest}`,
        description: `Thưởng thức các món ngon truyền thống trứ danh của vùng đất ${dest} và dạo phố đi bộ về đêm.`,
        location: `Khu phố ẩm thực ${dest}`,
        costVnd: 120000,
        costLabel: '120.000đ / người',
        category: 'Ẩm thực bản địa',
        image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80',
        tips: `Đừng quên hỏi người dân địa phương những quán ăn lâu đời để nếm chuẩn vị nhất nhé! 🍲`,
      },
    ],
  },
  {
    dayNumber: 2,
    title: `Trải nghiệm làng nghề truyền thống & Mua quà lưu niệm ${dest}`,
    dateStr: 'Ngày 2',
    activities: [
      {
        id: `${dest}-2-1`,
        timeSlot: 'MORNING',
        timeRange: '08:30 – 11:30',
        title: `Làng nghề thủ công & Trải nghiệm tự tay làm sản phẩm ${dest}`,
        description: `Tìm hiểu quy trình chế tác thủ công tinh xảo của các nghệ nhân bản địa và tự làm món quà lưu niệm ý nghĩa.`,
        location: `Làng nghề ${dest}`,
        costVnd: 100000,
        costLabel: '100.000đ / trải nghiệm',
        category: 'Làng nghề truyền thống',
        image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
        tips: `Các nghệ nhân rất nhiệt tình hướng dẫn, bạn có thể mang sản phẩm hoàn thiện về làm kỷ niệm. 🏺`,
      },
      {
        id: `${dest}-2-2`,
        timeSlot: 'AFTERNOON',
        timeRange: '14:00 – 17:00',
        title: `Cà phê view đẹp & Mua sắm đặc sản ${dest} làm quà`,
        description: `Thư giãn bên ly cà phê thơm nồng ngắm phong cảnh và chọn mua những món quà quê đặc sản cho gia đình.`,
        location: `Khu quà tặng ${dest}`,
        costVnd: 150000,
        costLabel: '150.000đ / phần quà',
        category: 'Cà phê & Quà tặng',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        tips: `Nên chọn các sản phẩm OCOP có tem mác chứng nhận nguồn gốc xuất xứ rõ ràng. 🎁`,
      },
    ],
  },
];

export function getSampleItineraryForDestination(destination = '', startDateStr = ''): DayPlanItem[] {
  const destLower = (destination || '').toLowerCase();
  let baseDays: DayPlanItem[];

  if (destLower.includes('huế') || destLower.includes('hue')) {
    baseDays = SAMPLE_HUE_DAYS;
  } else if (destLower.includes('đà nẵng') || destLower.includes('da nang')) {
    baseDays = SAMPLE_DANANG_DAYS;
  } else if (destLower.includes('đà lạt') || destLower.includes('da lat') || destLower.includes('lâm đồng')) {
    baseDays = SAMPLE_DALAT_DAYS;
  } else if (destLower.includes('hà nội') || destLower.includes('ha noi')) {
    baseDays = SAMPLE_HANOI_DAYS;
  } else {
    // Generates a tailored, authentic plan for this specific destination!
    const cleanDest = destination.trim() || 'Việt Nam';
    baseDays = SAMPLE_GENERIC_DAYS(cleanDest);
  }

  if (startDateStr && startDateStr.includes('/')) {
    return baseDays.map((day, idx) => ({
      ...day,
      dateStr: `Ngày ${idx + 1} (${startDateStr})`,
    }));
  }

  return baseDays;
}

export function getDestinationHeroImage(destination = ''): string {
  const destLower = (destination || '').toLowerCase();
  if (destLower.includes('huế') || destLower.includes('hue')) {
    return 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=1200&q=80';
  }
  if (destLower.includes('đà nẵng') || destLower.includes('da nang')) {
    return 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80';
  }
  if (destLower.includes('đà lạt') || destLower.includes('da lat') || destLower.includes('lâm đồng')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
  }
  if (destLower.includes('hà nội') || destLower.includes('ha noi')) {
    return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80';
  }
  return 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80';
}

export function getSampleProposals(destination = '') {
  const destLower = (destination || '').toLowerCase();
  if (destLower.includes('huế') || destLower.includes('hue')) {
    return [
      {
        id: 'prop-1',
        title: 'Thưởng thức ẩm thực Cung đình Huế tại Không Gian Xưa',
        category: 'Ẩm thực',
        votes: 1,
        voted: true,
      },
      {
        id: 'prop-2',
        title: 'Du thuyền rồng nghe Ca Huế và thả hoa đăng Sông Hương',
        category: 'Nghệ thuật & Di sản',
        votes: 1,
        voted: true,
      },
      {
        id: 'prop-3',
        title: 'Thuê cổ phục Nhật Bình chụp ảnh tại Làng hương Thủy Xuân',
        category: 'Trải nghiệm & Check-in',
        votes: 0,
        voted: false,
      },
    ];
  }
  if (destLower.includes('đà nẵng') || destLower.includes('da nang')) {
    return [
      {
        id: 'prop-1',
        title: 'Buffet hải sản tươi sống đêm biển Mỹ Khê',
        category: 'Ẩm thực',
        votes: 1,
        voted: true,
      },
      {
        id: 'prop-2',
        title: 'Trải nghiệm dù lượn ngắm toàn cảnh Bán đảo Sơn Trà',
        category: 'Trải nghiệm mạo hiểm',
        votes: 1,
        voted: true,
      },
      {
        id: 'prop-3',
        title: 'Xem Cầu Rồng phun lửa lúc 21h cuối tuần',
        category: 'Nghệ thuật & Di sản',
        votes: 0,
        voted: false,
      },
    ];
  }
  if (destLower.includes('đà lạt') || destLower.includes('da lat') || destLower.includes('lâm đồng')) {
    return [
      {
        id: 'prop-1',
        title: 'Lẩu gà lá é Tao Ngộ đêm se lạnh',
        category: 'Ẩm thực',
        votes: 1,
        voted: true,
      },
      {
        id: 'prop-2',
        title: 'Săn mây bình minh tại đồi chè Cầu Đất lúc 05:30',
        category: 'Trải nghiệm thiên nhiên',
        votes: 1,
        voted: true,
      },
      {
        id: 'prop-3',
        title: 'Trải nghiệm máng trượt băng rừng tại Thác Datanla',
        category: 'Mạo hiểm & Vui chơi',
        votes: 0,
        voted: false,
      },
    ];
  }
  if (destLower.includes('hà nội') || destLower.includes('ha noi')) {
    return [
      {
        id: 'prop-1',
        title: 'Thưởng thức Cà phê Trứng Giảng 39 Nguyễn Hữu Huân',
        category: 'Ẩm thực',
        votes: 1,
        voted: true,
      },
      {
        id: 'prop-2',
        title: 'Trải nghiệm tự nặn gốm thủ công tại Làng gốm Bát Tràng',
        category: 'Văn hóa & Làng nghề',
        votes: 1,
        voted: true,
      },
      {
        id: 'prop-3',
        title: 'Dạo chợ đêm Phố Cổ và ngõ ẩm thực Tạ Hiện',
        category: 'Trải nghiệm về đêm',
        votes: 0,
        voted: false,
      },
    ];
  }
  return [
    {
      id: 'prop-1',
      title: `Thưởng thức ẩm thực đặc sản truyền thống tại ${destination || 'địa phương'}`,
      category: 'Ẩm thực bản địa',
      votes: 1,
      voted: true,
    },
    {
      id: 'prop-2',
      title: `Trải nghiệm danh lam thắng cảnh và văn hóa tại ${destination || 'địa phương'}`,
      category: 'Văn hóa & Khám phá',
      votes: 1,
      voted: true,
    },
    {
      id: 'prop-3',
      title: `Ghé chợ truyền thống mua sắm quà lưu niệm tại ${destination || 'địa phương'}`,
      category: 'Mua sắm & Trải nghiệm',
      votes: 0,
      voted: false,
    },
  ];
}

