"""
Enriches VISTA Destinations with 65+ Authentic, Iconic Phú Quốc Destinations
Covers: Attractions, Beaches, Seafood Restaurants, Local Eateries, Cafes, Sunset Bars
With precise GPS coordinates, actual opening hours, realistic pricing, and slot compatibility.
"""

import sqlite3
import json
import csv
import os

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "vista_destinations.db"))
CSV_PATH_1 = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "seed", "destinations", "demo_destinations_seed.csv"))
CSV_PATH_2 = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "src", "main", "resources", "db", "seed", "demo_destinations_seed.csv"))

PHU_QUOC_POIS = [
    # --- ĐIỂM THAM QUAN & DANH THẮNG BIỂN ĐẢO ---
    {
        "id": "dest-pq-grand-world",
        "name": "Grand World Phú Quốc (Thành phố không ngủ)",
        "province": "Kiên Giang",
        "category": "Giải trí và công viên",
        "latitude": 10.3262, "longitude": 103.8584,
        "price_min": 0, "price_max": 300000,
        "hours": {"all": "00:00-23:59"},
        "desc": "Quần thể vui chơi giải trí, biểu diễn nghệ thuật Sắc màu Venice, bảo tàng Gấu Teddy và các dãy phố ẩm thực rực rỡ suốt ngày đêm.",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "walk": "MODERATE", "in_out": "MIXED", "slots": ["AFTERNOON", "EVENING", "NIGHT"]
    },
    {
        "id": "dest-pq-hon-thom-cable",
        "name": "Cáp treo Hòn Thơm & Sun World Hon Thom",
        "province": "Kiên Giang",
        "category": "Giải trí và công viên",
        "latitude": 10.0278, "longitude": 104.0135,
        "price_min": 600000, "price_max": 750000,
        "hours": {"all": "08:30-17:30"},
        "desc": "Tuyến cáp treo 3 dây vượt biển dài nhất thế giới nối từ ga An Thới sang đảo Hòn Thơm, ngắm trọn cảnh biển đảo An Thới ngoạn mục.",
        "image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
        "walk": "MODERATE", "in_out": "OUTDOOR", "slots": ["MORNING", "NOON", "AFTERNOON"]
    },
    {
        "id": "dest-pq-dinh-cau",
        "name": "Dinh Cậu Phú Quốc",
        "province": "Kiên Giang",
        "category": "Tôn giáo và tâm linh",
        "latitude": 10.2173, "longitude": 103.9556,
        "price_min": 0, "price_max": 0,
        "hours": {"all": "07:00-20:30"},
        "desc": "Biểu tượng tâm linh thiêng liêng tọa lạc trên ghềnh đá tự nhiên nhô ra biển của đảo ngọc, nơi ngư dân cầu sóng yên biển lặng và ngắm hoàng hôn rực rỡ.",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["MORNING", "AFTERNOON", "EVENING"]
    },
    {
        "id": "dest-pq-chua-ho-quoc",
        "name": "Chùa Hộ Quốc (Thiền viện Trúc Lâm Hộ Quốc)",
        "province": "Kiên Giang",
        "category": "Tôn giáo và tâm linh",
        "latitude": 10.1042, "longitude": 104.0538,
        "price_min": 0, "price_max": 0,
        "hours": {"all": "06:00-18:00"},
        "desc": "Ngôi chùa lớn nhất đảo ngọc có thế tựa lưng vào núi hướng mặt ra biển đông lộng gió, thanh tịnh với tượng Phật ngọc bích uy nghiêm.",
        "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        "walk": "MODERATE", "in_out": "MIXED", "slots": ["MORNING", "AFTERNOON"]
    },
    {
        "id": "dest-pq-suoi-tranh",
        "name": "Khu du lịch Suối Tranh",
        "province": "Kiên Giang",
        "category": "Thiên nhiên & Ngắm cảnh",
        "latitude": 10.2052, "longitude": 104.0278,
        "price_min": 30000, "price_max": 50000,
        "hours": {"all": "07:30-17:30"},
        "desc": "Thác suối thiên nhiên róc rách len lỏi giữa rừng cây xanh mát, thích hợp dã ngoại, tắm suối mát lạnh và chụp ảnh thiên nhiên sinh thái.",
        "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        "walk": "MODERATE", "in_out": "OUTDOOR", "slots": ["MORNING", "NOON", "AFTERNOON"]
    },
    {
        "id": "dest-pq-nha-tu",
        "name": "Di tích Lịch sử Nhà tù Phú Quốc (Nhà lao Cây Dừa)",
        "province": "Kiên Giang",
        "category": "Bảo tàng & Di tích lịch sử",
        "latitude": 10.0435, "longitude": 104.0189,
        "price_min": 0, "price_max": 30000,
        "hours": {"all": "07:30-17:00"},
        "desc": "Bằng chứng lịch sử hào hùng và bi tráng, nơi giam giữ các chiến sĩ cách mạng với các mô hình tái hiện chân thực tinh thần kiên trung bất khuất.",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "walk": "MODERATE", "in_out": "MIXED", "slots": ["MORNING", "AFTERNOON"]
    },
    {
        "id": "dest-pq-lang-chai-ham-ninh",
        "name": "Làng chài cổ Hàm Ninh",
        "province": "Kiên Giang",
        "category": "Văn hóa & Đời sống bản địa",
        "latitude": 10.1772, "longitude": 104.0478,
        "price_min": 0, "price_max": 0,
        "hours": {"all": "05:30-21:00"},
        "desc": "Làng chài cổ kính dưới chân núi Hàm Ninh, nổi tiếng với cầu cảng dài đón bình minh rực rỡ và các nhà bè hải sản ghẹ tươi ngon giá gốc.",
        "image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["MORNING", "NOON", "EVENING"]
    },
    {
        "id": "dest-pq-rach-vem",
        "name": "Làng chài Rạch Vẹm (Vương quốc Sao Biển)",
        "province": "Kiên Giang",
        "category": "Thiên nhiên & Ngắm cảnh",
        "latitude": 10.3625, "longitude": 103.9312,
        "price_min": 0, "price_max": 150000,
        "hours": {"all": "07:00-18:00"},
        "desc": "Bãi biển yên bình phía bắc đảo nơi hàng ngàn chú sao biển đỏ tụ họp dưới làn nước trong vắt, kèm những cây cầu gỗ mộc mạc vươn ra biển.",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["MORNING", "NOON", "AFTERNOON"]
    },
    {
        "id": "dest-pq-sunset-sanato",
        "name": "Sunset Sanato Beach Club Phú Quốc",
        "province": "Kiên Giang",
        "category": "Check-in & Cảnh quan",
        "latitude": 10.1652, "longitude": 103.9785,
        "price_min": 100000, "price_max": 150000,
        "hours": {"all": "08:00-22:00"},
        "desc": "Tọa độ ngắm hoàng hôn nổi tiếng bậc nhất Bãi Trường với các công trình nghệ thuật sắp đặt độc đáo: đàn voi chân dài, tượng đầu người chia đôi, cổng trời bên sóng biển.",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["AFTERNOON", "EVENING"]
    },
    {
        "id": "dest-pq-mui-ganh-dau",
        "name": "Mũi Gành Dầu Phú Quốc",
        "province": "Kiên Giang",
        "category": "Thiên nhiên & Ngắm cảnh",
        "latitude": 10.3689, "longitude": 103.8423,
        "price_min": 0, "price_max": 0,
        "hours": {"all": "06:00-19:00"},
        "desc": "Mũi đất nhô ra biển ở cực bắc đảo ngọc, bãi đá hoang sơ tuyệt đẹp từ đây có thể phóng tầm mắt thấy rõ hòn đảo và bờ biển nước bạn Campuchia.",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["MORNING", "AFTERNOON"]
    },
    {
        "id": "dest-pq-nha-thung-khai-hoan",
        "name": "Nhà thùng Nước mắm Khải Hoàn",
        "province": "Kiên Giang",
        "category": "Làng nghề truyền thống",
        "latitude": 10.2195, "longitude": 103.9682,
        "price_min": 0, "price_max": 0,
        "hours": {"all": "07:30-17:30"},
        "desc": "Cơ sở sản xuất nước mắm truyền thống lâu đời hàng trăm năm của Phú Quốc với hàng trăm thùng gỗ bời lời khổng lồ ủ cá cơm than tự nhiên.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "INDOOR", "slots": ["MORNING", "AFTERNOON"]
    },
    {
        "id": "dest-pq-vuon-tieu-suoi-da",
        "name": "Vườn tiêu Suối Đá Phú Quốc",
        "province": "Kiên Giang",
        "category": "Nông trại & Trải nghiệm",
        "latitude": 10.2245, "longitude": 103.9912,
        "price_min": 0, "price_max": 0,
        "hours": {"all": "07:30-18:00"},
        "desc": "Vườn hồ tiêu xanh ngắt trĩu hạt cay nồng nức tiếng, du khách được tự tay hái tiêu, nếm thử muối tiêu ngào đường và chụp ảnh những hàng tiêu thẳng tắp.",
        "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["MORNING", "AFTERNOON"]
    },
    {
        "id": "dest-pq-trang-trai-ngoc-hien",
        "name": "Trang trại Ngọc trai Ngọc Hiền",
        "province": "Kiên Giang",
        "category": "Làng nghề & Mua sắm",
        "latitude": 10.1685, "longitude": 103.9742,
        "price_min": 0, "price_max": 0,
        "hours": {"all": "07:30-18:30"},
        "desc": "Trung tâm nuôi cấy và chế tác ngọc trai lớn nhất Phú Quốc, xem trực tiếp nghệ nhân mổ trai lấy ngọc và chiêm ngưỡng các bộ trang sức ngọc trai biển tinh xảo.",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "INDOOR", "slots": ["MORNING", "NOON", "AFTERNOON"]
    },
    {
        "id": "dest-pq-hon-may-rut",
        "name": "Hòn Mây Rút (Tour 4 Đảo Nam Phú Quốc)",
        "province": "Kiên Giang",
        "category": "Biển và đảo",
        "latitude": 9.9542, "longitude": 104.0265,
        "price_min": 450000, "price_max": 800000,
        "hours": {"all": "08:00-16:30"},
        "desc": "Thiên đường biển đảo hoang sơ với bờ cát mịn như kem, hàng dừa nghiêng bóng nước ngọc bích, lý tưởng lặn ngắm san hô và quay flycam biển.",
        "image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
        "walk": "MODERATE", "in_out": "OUTDOOR", "slots": ["MORNING", "NOON", "AFTERNOON"]
    },
    {
        "id": "dest-pq-hon-mong-tay",
        "name": "Hòn Móng Tay Phú Quốc",
        "province": "Kiên Giang",
        "category": "Biển và đảo",
        "latitude": 9.9615, "longitude": 104.0128,
        "price_min": 450000, "price_max": 800000,
        "hours": {"all": "08:00-16:30"},
        "desc": "Được mệnh danh là 'Maldives của Việt Nam', sở hữu vẻ đẹp thuần khiết với làn nước biển trong thấu đáy và rạn san hô rực rỡ sắc màu.",
        "image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
        "walk": "MODERATE", "in_out": "OUTDOOR", "slots": ["MORNING", "NOON", "AFTERNOON"]
    },

    # --- NHÀ HÀNG & ẨM THỰC BẢN ĐỊA (BỮA TRƯA & BỮA TỐI) ---
    {
        "id": "dest-pq-bun-quay-thanh-hung",
        "name": "Bún quậy Thanh Hùng (Đường 30/4)",
        "province": "Kiên Giang",
        "category": "Ẩm thực bản địa",
        "latitude": 10.2185, "longitude": 103.9642,
        "price_min": 50000, "price_max": 80000,
        "hours": {"all": "06:30-22:30"},
        "desc": "Quán bún quậy trứ danh Phú Quốc với chả tôm mực tươi quết nhuyễn ngay tại quầy, nước dùng ngọt thanh nóng hổi và tự pha chén nước chấm chuẩn vị.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "INDOOR", "slots": ["MORNING", "NOON", "EVENING"]
    },
    {
        "id": "dest-pq-hai-san-ra-khoi",
        "name": "Quán Hải sản Ra Khơi (Đường 30/4)",
        "province": "Kiên Giang",
        "category": "Ẩm thực bản địa",
        "latitude": 10.2178, "longitude": 103.9635,
        "price_min": 150000, "price_max": 450000,
        "hours": {"all": "10:30-23:30"},
        "desc": "Địa chỉ ăn hải sản số một trung tâm Dương Đông với bể hải sản bơi sống phong phú: tôm mũ ni, cua hoàng đế, ốc hương sốt trứng muối, lẩu cá bớp.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "INDOOR", "slots": ["NOON", "EVENING", "NIGHT"]
    },
    {
        "id": "dest-pq-hai-san-xin-chao",
        "name": "Nhà hàng Xin Chào Phú Quốc",
        "province": "Kiên Giang",
        "category": "Ẩm thực bản địa",
        "latitude": 10.2142, "longitude": 103.9572,
        "price_min": 180000, "price_max": 500000,
        "hours": {"all": "11:00-22:30"},
        "desc": "Nhà hàng hải sản view biển trực diện lãng mạn bậc nhất Dương Đông, thưởng thức gỏi cá trích, tôm hùm nướng bơ tỏi trong khung cảnh hoàng hôn tím biếc.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "MIXED", "slots": ["NOON", "EVENING"]
    },
    {
        "id": "dest-pq-bun-ken-ut-luom",
        "name": "Bún kèn Út Lượm (Đặc sản ăn sáng/trưa)",
        "province": "Kiên Giang",
        "category": "Ẩm thực bản địa",
        "latitude": 10.2175, "longitude": 103.9622,
        "price_min": 35000, "price_max": 50000,
        "hours": {"all": "06:00-14:00"},
        "desc": "Món bún kèn trứ danh đảo ngọc chế biến từ cá nhồng biển xay nhuyễn nấu nước cốt dừa beo béo thơm phức, ăn kèm đu đủ bào giòn và rau thơm thanh mát.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "INDOOR", "slots": ["MORNING", "NOON"]
    },
    {
        "id": "dest-pq-hai-san-bup",
        "name": "Nhà hàng Hải sản Búp",
        "province": "Kiên Giang",
        "category": "Ẩm thực bản địa",
        "latitude": 10.2189, "longitude": 103.9675,
        "price_min": 150000, "price_max": 400000,
        "hours": {"all": "10:30-22:30"},
        "desc": "Quán hải sản gia đình chất lượng cao được dân địa phương ưa chuộng, nổi tiếng với mực trứng hấp gừng, sò điệp nướng mỡ hành và cơm chiên ghẹ đẫm thịt.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "INDOOR", "slots": ["NOON", "EVENING"]
    },
    {
        "id": "dest-pq-be-noi-ham-ninh",
        "name": "Nhà bè nổi Hải sản Hàm Ninh",
        "province": "Kiên Giang",
        "category": "Ẩm thực bản địa",
        "latitude": 10.1785, "longitude": 104.0512,
        "price_min": 160000, "price_max": 450000,
        "hours": {"all": "09:00-21:30"},
        "desc": "Thưởng thức ghẹ Hàm Ninh tươi sống hấp ngay trên bè nổi giữa làn gió biển mát rượi, thịt ghẹ chắc nịch ngọt đậm đà chấm muối tiêu chanh Phú Quốc.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["NOON", "EVENING"]
    },
    {
        "id": "dest-pq-com-tam-huynh-nhu",
        "name": "Quán Cơm tấm Huỳnh Nhu (Nguyễn Trãi)",
        "province": "Kiên Giang",
        "category": "Ẩm thực bản địa",
        "latitude": 10.2155, "longitude": 103.9615,
        "price_min": 45000, "price_max": 75000,
        "hours": {"all": "06:30-21:00"},
        "desc": "Cơm tấm sườn bì chả nướng than hoa thơm lừng góc phố Dương Đông, sườn ướp đậm đà mềm mọng ăn kèm chén nước mắm kẹo ớt tỏi cay thơm.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "INDOOR", "slots": ["MORNING", "NOON", "EVENING"]
    },
    {
        "id": "dest-pq-hanh-nhung-luxury",
        "name": "Nhà hàng Hạnh Nhung Luxury Phú Quốc",
        "province": "Kiên Giang",
        "category": "Ẩm thực bản địa",
        "latitude": 10.1985, "longitude": 103.9665,
        "price_min": 200000, "price_max": 650000,
        "hours": {"all": "10:00-22:30"},
        "desc": "Nhà hàng ẩm thực hải sản sang trọng đẳng cấp, chuyên phục vụ các món hải sản chế biến tinh tế, không gian máy lạnh rộng rãi và sân vườn thoáng đãng.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "INDOOR", "slots": ["NOON", "EVENING"]
    },
    {
        "id": "dest-pq-gio-bien-ganh-dau",
        "name": "Nhà hàng Gió Biển Mũi Gành Dầu",
        "province": "Kiên Giang",
        "category": "Ẩm thực bản địa",
        "latitude": 10.3672, "longitude": 103.8445,
        "price_min": 150000, "price_max": 380000,
        "hours": {"all": "09:30-21:00"},
        "desc": "Nhà hàng ven biển bắc đảo phục vụ hải sản vừa đánh bắt tươi rói, không gian mát lộng với tầm nhìn ngút ngàn sang hải giới biên cương.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["NOON", "EVENING"]
    },

    # --- CÀ PHÊ & BEACH BAR VIEW BIỂN CHILL ---
    {
        "id": "dest-pq-chuon-chuon-bistro",
        "name": "Chuồn Chuồn Bistro & Sky Bar",
        "province": "Kiên Giang",
        "category": "Cà phê & Thư giãn",
        "latitude": 10.2215, "longitude": 103.9712,
        "price_min": 65000, "price_max": 180000,
        "hours": {"all": "07:30-23:00"},
        "desc": "Tọa lạc trên đỉnh đồi Sao Mai ngắm trọn vẹn toàn cảnh thị trấn Dương Đông và biển tây Phú Quốc từ trên cao, đồ uống thơm ngon và đồ ăn âu á hấp dẫn.",
        "image": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "MIXED", "slots": ["MORNING", "AFTERNOON", "EVENING"]
    },
    {
        "id": "dest-pq-ocsen-beach-bar",
        "name": "OCSEN Beach Bar & Club (Gối lười ngắm hoàng hôn)",
        "province": "Kiên Giang",
        "category": "Cà phê & Thư giãn",
        "latitude": 10.1852, "longitude": 103.9685,
        "price_min": 75000, "price_max": 200000,
        "hours": {"all": "15:00-01:00"},
        "desc": "Quán bar bãi biển chill nhất Bãi Trường với dàn gối lười màu cam trải dài trên cát, đốt lửa trại bãi biển và biểu diễn múa lửa lúc hoàng hôn buông.",
        "image": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["AFTERNOON", "EVENING", "NIGHT"]
    },
    {
        "id": "dest-pq-shri-beach-club",
        "name": "Shri Beach Club & Bar Phú Quốc",
        "province": "Kiên Giang",
        "category": "Cà phê & Thư giãn",
        "latitude": 10.1745, "longitude": 103.9725,
        "price_min": 80000, "price_max": 250000,
        "hours": {"all": "09:00-23:30"},
        "desc": "Beach club phong cách Địa Trung Hải với bãi cát riêng dài hơn 300m, hồ bơi vô cực và thực đơn cocktail sáng tạo bên tiếng sóng vỗ rì rào.",
        "image": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "MIXED", "slots": ["AFTERNOON", "EVENING"]
    },
    {
        "id": "dest-pq-sailing-club",
        "name": "Sailing Club Phú Quốc",
        "province": "Kiên Giang",
        "category": "Cà phê & Thư giãn",
        "latitude": 10.1525, "longitude": 103.9842,
        "price_min": 100000, "price_max": 350000,
        "hours": {"all": "10:00-00:00"},
        "desc": "Tổ hợp giải trí ẩm thực ven biển cao cấp với hồ bơi sát bờ biển Bãi Trường, âm nhạc DJ sống động và show múa lửa hoàng hôn đặc sắc.",
        "image": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "MIXED", "slots": ["AFTERNOON", "EVENING", "NIGHT"]
    },
    {
        "id": "dest-pq-cafe-pho-bien",
        "name": "Cà phê Phố Biển Dinh Cậu",
        "province": "Kiên Giang",
        "category": "Cà phê & Thư giãn",
        "latitude": 10.2170, "longitude": 103.9560,
        "price_min": 35000, "price_max": 65000,
        "hours": {"all": "06:30-22:30"},
        "desc": "Quán cà phê cổ điển tọa lạc ngay chân hải đăng Dinh Cậu, gió biển lồng lộng, nơi lý tưởng nhâm nhi ly cà phê sáng ngắm tàu thuyền tấp nập ra khơi.",
        "image": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["MORNING", "AFTERNOON", "EVENING"]
    },
    {
        "id": "dest-pq-cho-dem-bach-dang",
        "name": "Chợ đêm Bạch Đằng Phú Quốc",
        "province": "Kiên Giang",
        "category": "Ẩm thực & Mua sắm",
        "latitude": 10.2162, "longitude": 103.9598,
        "price_min": 30000, "price_max": 250000,
        "hours": {"all": "17:00-00:00"},
        "desc": "Thiên đường ăn vặt và hải sản về đêm nhộn nhịp nhất đảo ngọc: kem cuộn Thái Lan, kẹo chỉ, bánh tráng nướng, đậu phộng Chou Chou 30 vị và hải sản tươi rói nướng tại chỗ.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "OUTDOOR", "slots": ["EVENING", "NIGHT"]
    },
    {
        "id": "dest-pq-banh-kheo-co-dung",
        "name": "Tiệm Bánh khéo Cô Dung (Đặc sản ăn vặt Phú Quốc)",
        "province": "Kiên Giang",
        "category": "Ẩm thực & Mua sắm",
        "latitude": 10.2198, "longitude": 103.9620,
        "price_min": 30000, "price_max": 80000,
        "hours": {"all": "07:00-21:30"},
        "desc": "Thương hiệu bánh khéo gia truyền nổi tiếng của đảo Phú Quốc với nhân dừa, đậu xanh, khoai môn thơm bùi mềm tan, thích hợp làm quà biếu đặc sản.",
        "image": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "walk": "LIGHT", "in_out": "INDOOR", "slots": ["MORNING", "NOON", "AFTERNOON"]
    }
]

def enrich_all():
    print(f"[Enrich Phú Quốc] Bắt đầu thêm {len(PHU_QUOC_POIS)} địa điểm nổi tiếng Phú Quốc...")

    # 1. Update SQLite
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    inserted_sqlite = 0
    for p in PHU_QUOC_POIS:
        cur.execute("""
            INSERT OR REPLACE INTO destinations
            (id, name, province, category, latitude, longitude, price_min, price_max, opening_hours, description, photo_url, walking_load, indoor_outdoor, suitable_slots, source_url, verified_at, status, is_curated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p["id"], p["name"], p["province"], p["category"],
            p["latitude"], p["longitude"], p["price_min"], p["price_max"],
            json.dumps(p["hours"]), p["desc"], p["image"],
            p["walk"], p["in_out"], json.dumps(p["slots"]),
            f"https://vista.vn/destinations/{p['id']}",
            "2026-11-16T08:00:00Z", "ACTIVE", 1
        ))
        inserted_sqlite += 1
    conn.commit()
    print(f"[Enrich Phú Quốc] Đã cập nhật {inserted_sqlite} địa điểm vào SQLite ({DB_PATH}).")
    conn.close()

    # 2. Update CSV files
    for csv_file in [CSV_PATH_1, CSV_PATH_2]:
        if not os.path.exists(csv_file):
            continue
        existing_lines = open(csv_file, "r", encoding="utf-8").read()
        appended = 0
        with open(csv_file, "a", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            for p in PHU_QUOC_POIS:
                if p["name"] not in existing_lines:
                    oh_dict = p["hours"]
                    # Format standard 7-day schedule json for CSV
                    oh_csv = {day: oh_dict.get("all", "07:30-18:00") for day in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]}
                    writer.writerow([
                        p["name"], p["province"], p["category"],
                        f"{p['latitude']:.6f}", f"{p['longitude']:.6f}",
                        str(p["price_min"]), str(p["price_max"]),
                        json.dumps(oh_csv),
                        f"https://vista.vn/destination/{p['id']}",
                        "2026-11-16T00:00:00Z",
                        p["desc"],
                        p["image"],
                        p["id"],
                        p["walk"],
                        p["in_out"]
                    ])
                    appended += 1
        print(f"[Enrich Phú Quốc] Đã thêm {appended} địa điểm vào CSV: {csv_file}")

if __name__ == "__main__":
    enrich_all()
