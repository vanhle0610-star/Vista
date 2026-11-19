import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def create_report():
    doc = Document()

    # Set page margins (1 inch all sides)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)

    # Palette
    PRIMARY = RGBColor(2, 132, 199)     # #0284C7 Sky Blue
    DARK_TEXT = RGBColor(15, 23, 42)    # #0F172A Slate Dark
    MUTED_TEXT = RGBColor(100, 116, 139)# #64748B Slate Muted
    SUCCESS = RGBColor(16, 185, 129)    # #10B981 Emerald Green

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("BÁO CÁO TỔNG KẾT SPRINT 3\n")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = PRIMARY

    r_sub = p_title.add_run("DỰ ÁN: NỀN TẢNG DU LỊCH THÔNG MINH VISTA (SMART TRAVEL PLATFORM)")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(13)
    r_sub.font.bold = True
    r_sub.font.color.rgb = DARK_TEXT

    # Metadata Callout Box (Table 1x1)
    callout = doc.add_table(rows=1, cols=1)
    callout.alignment = WD_TABLE_ALIGNMENT.CENTER
    callout_cell = callout.cell(0, 0)
    set_cell_background(callout_cell, "F0F9FF")
    set_cell_margins(callout_cell, top=140, bottom=140, left=200, right=200)

    p_meta = callout_cell.paragraphs[0]
    p_meta.paragraph_format.space_before = Pt(4)
    p_meta.paragraph_format.space_after = Pt(4)
    p_meta.paragraph_format.line_spacing = 1.3

    runs_meta = [
        ("Thời gian thực hiện: ", True, PRIMARY),
        ("28/10/2026 – 12/11/2026 (Chu kỳ 2 tuần)\n", False, DARK_TEXT),
        ("Mô hình phát triển: ", True, PRIMARY),
        ("Agile - Scrum Framework (Sprint Cycle 2-week)\n", False, DARK_TEXT),
        ("Phiên bản phát hành: ", True, PRIMARY),
        ("VISTA Core v3.2.0-PROD\n", False, DARK_TEXT),
        ("Mục tiêu Sprint (Sprint Goal): ", True, PRIMARY),
        ("Hoàn thiện AI Engine v3.0 (Anchor-First, OSRM Traffic, Gemini Re-ranker), nâng cấp toàn diện UX/UI thông minh cho Planner (Smart Departure Cockpit, Custom Budget Rates, AI Thinking Modal) và đồng bộ trơn tru với Chuyến đi (/trips) & Thủ quỹ (/treasury).", False, DARK_TEXT)
    ]
    for text, bold, color in runs_meta:
        r = p_meta.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(10)
        r.font.bold = bold
        r.font.color.rgb = color

    doc.add_paragraph() # Spacing

    # Helper for headings
    def add_h1(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
        r = h.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(15)
        r.font.bold = True
        r.font.color.rgb = PRIMARY
        return h

    def add_h2(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(4)
        r = h.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = DARK_TEXT
        return h

    # Section I
    add_h1("I. TỔNG QUAN SCRUM SPRINT 3")
    
    add_h2("1. Thành viên Nhóm & Phân bổ 5 Phân hệ Cốt lõi (TV1 – TV5)")
    team_items = [
        ("TV1 · Lê Hồng Sơn (Discovery & Admin Squad): ", "Chịu trách nhiệm phân hệ Khám phá điểm đến, thuật toán tìm kiếm không dấu Unicode NFD, bộ lọc đa danh mục và phân hệ Quản trị Admin kiểm duyệt đóng góp công khai."),
        ("TV2 · Trần Quang Sáng (Security & Trips Hub Squad): ", "Chịu trách nhiệm bảo mật Spring Security RBAC, phiên đăng nhập Refresh Token, tối ưu hiệu năng trang Chuyến đi bằng hệ thống Shimmer Skeleton chống giật (Zero Jank)."),
        ("TV3 · Nguyễn Văn Quý (Collaboration & Mobile Squad): ", "Chịu trách nhiệm phân hệ Cộng tác chuyến đi, cơ chế mời bạn bằng liên kết/mã PIN, xử lý triệt để lỗi 403 Forbidden, chuyển giao quyền Leader tự động và giao diện Mobile."),
        ("TV4 · Lê Thị Vân Ánh (AI Engine & Navigation Lead): ", "Chịu trách nhiệm Bộ não AI Planning Engine v3.0 (Anchor-first, Anti-zigzag), Trợ lý AI Co-Pilot Thổ Địa NLP (tùy chỉnh lịch trình/ngủ nướng), Smart Departure Cockpit và Điều hướng GPS."),
        ("TV5 · Nguyễn Quang Tuấn (Routing & Infrastructure Squad): ", "Chịu trách nhiệm Adapter bản đồ OSRM đường bộ thực tế, cơ sở dữ liệu PostgreSQL Supabase migration, và tự động hóa quy trình CI/CD GitHub Actions.")
    ]
    for role, desc in team_items:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r1 = p.add_run(role)
        r1.font.bold = True
        r1.font.name = "Arial"
        r1.font.color.rgb = DARK_TEXT
        r2 = p.add_run(desc)
        r2.font.name = "Arial"
        r2.font.color.rgb = DARK_TEXT

    add_h2("2. Chỉ số Sprint Velocity & Hiệu suất thực thi")
    
    # Table Metrics
    metrics_data = [
        ["Chỉ số (Metrics)", "Kế hoạch (Committed)", "Thực tế (Completed)", "Tỷ lệ hoàn thành"],
        ["Story Points (SP)", "45 SP", "45 SP", "100% (Velocity Max)"],
        ["User Stories bàn giao", "5 Stories", "5 Stories", "100%"],
        ["Bug / Hotfix xử lý", "6 Issues", "6 Issues", "100% (Clean Fix)"],
        ["Merge Conflicts xử lý", "14 Files (dev)", "14 Files", "100% (Clean Tree)"],
        ["Test Case AI Unit Test", "5 Test Suites", "5/5 Suites Passed", "100% (1.061s)"],
        ["TypeScript Typecheck", "0 Type Errors", "0 Type Errors", "Exit Code 0"]
    ]

    t_metrics = doc.add_table(rows=len(metrics_data), cols=4)
    t_metrics.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(metrics_data):
        for c_idx, val in enumerate(row):
            cell = t_metrics.cell(r_idx, c_idx)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            cell_p = cell.paragraphs[0]
            cell_p.paragraph_format.space_before = Pt(2)
            cell_p.paragraph_format.space_after = Pt(2)
            run = cell_p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(9.5)
            if r_idx == 0:
                set_cell_background(cell, "0284C7")
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
            else:
                if r_idx % 2 == 1:
                    set_cell_background(cell, "F8FAFC")
                run.font.color.rgb = DARK_TEXT
                if c_idx == 0:
                    run.font.bold = True

    doc.add_paragraph()

    # Section II: Architecture
    add_h1("II. SƠ ĐỒ KIẾN TRÚC TOÀN HỆ THỐNG (SYSTEM ARCHITECTURE)")
    p_arch = doc.add_paragraph()
    p_arch.paragraph_format.space_after = Pt(6)
    r_arch = p_arch.add_run(
        "Hệ thống VISTA hoạt động theo mô hình 4 tầng phân tán tối ưu cao:\n"
        "1. Lớp Client App (Next.js 16 App Router): Cung cấp bộ điều khiển Smart Departure Cockpit, Modal suy nghĩ AI động và Bảng chỉnh sửa chi phí tức thời.\n"
        "2. Lớp Gateway & Backend (Java Spring Boot 3): Quản lý phiên làm việc, phân quyền JWT Spring Security, điều phối nghiệp vụ lưu trữ chuyến đi và giao dịch ví thủ quỹ.\n"
        "3. Lớp Trí tuệ Nhân tạo (Python AI Engine v3): Chạy kiến trúc ThreadingHTTPServer độc lập trên port 8000, phụ trách phân cụm Anchor-First, tính toán ma trận OSRM, chấm điểm động theo thời tiết và xếp hạng ngữ nghĩa bằng Google Gemini 2.5.\n"
        "4. Lớp Cơ sở Dữ liệu & Lưu trữ (PostgreSQL / Supabase): Lưu trữ bền vững dữ liệu điểm đến, lịch trình và nhật ký ngân sách."
    )
    r_arch.font.name = "Arial"
    r_arch.font.size = Pt(10)
    r_arch.font.color.rgb = DARK_TEXT

    # Section III: User Stories Detail
    add_h1("III. CHI TIẾT CÁC USER STORIES HOÀN THÀNH")

    stories = [
        ("US-01: Nâng cấp AI Planning Engine v3.0 (Core Engine)",
         "Cốt lõi trí tuệ nhân tạo VISTA",
         [
             "Anchor-First Multi-day Balancing: Thuật toán nhận diện các điểm đinh (anchor points như Fansipan, Bà Nà Hills...) và tự động chia đều sang các ngày khác nhau, sau đó kết nạp các điểm vệ tinh xung quanh theo bán kính di chuyển tối ưu.",
             "Traffic-Aware Congestion Multiplier: Tự động phát hiện các khung giờ cao điểm (07:30–08:30 và 17:00–18:30) để nhân hệ số tắc đường 1.25x – 1.4x, tránh gây trễ lịch.",
             "Pre-warming OSRM Table: Gom toàn bộ tọa độ điểm đến trong ngày vào một truy vấn ma trận OSRM 1xN duy nhất, giảm 80% độ trễ mạng so với gọi tuần tự.",
             "Anti-Zigzag & Anti-Double-Lunch: Thêm hàm phạt điểm nếu lộ trình bị quay đầu đảo chiều không tự nhiên và ngăn chặn việc trùng lặp 2 bữa ăn chính cùng một buổi.",
             "Gemini Semantic Re-ranker: Tích hợp mô hình Gemini 2.5 để phân tích các mong muốn đặc thù trong văn bản tự do của du khách, xếp hạng lại các điểm trải nghiệm phù hợp nhất."
         ]),
        ("US-02: Bộ Tùy chỉnh Ngân sách Linh hoạt (Custom Budget Rates)",
         "Hệ thống dự toán ngân sách thông minh",
         [
             "Tùy biến linh hoạt 5 biến số ngân sách: Cho phép người dùng chỉnh sửa Giá phòng/đêm, Số lượng phòng, Mức ăn/người/ngày, Giá thuê xe/ngày, và Chi phí vé hoạt động.",
             "Tính toán thời gian thực (Real-time Dynamic Breakdown): Hook useMemo tự động cập nhật ngay lập tức Tổng chi phí cơ sở, Mức bình quân mỗi người, Biên độ dao động ngày thường/cuối tuần và Quỹ dự phòng.",
             "Giao diện Inline chuyên nghiệp: Tích hợp icon Lucide SVG Pencil, Check, RotateCcw và các chip gợi ý nhanh (350k, 500k, 850k, 0đ xe cá nhân).",
             "Fix triệt để lỗi số 0 đứng trước (0500000 -> 500000): Cơ chế onFocus={(e) => e.target.select()} bôi đen toàn bộ số khi click và regex tự động lọc sạch số 0 thừa.",
             "Đồng bộ toàn diện hệ thống: Số liệu ngân sách sau khi tùy chỉnh tự động phản ánh lên Hero Banner, Tab Chi phí và chuyển tiếp chính xác vào Ví Thủ Quỹ (/treasury) & Chuyến đi (/trips)."
         ]),
        ("US-03: Khoang điều khiển Khởi hành Tối giản (Smart Departure Cockpit)",
         "Giao diện tương tác ngày & thời tiết",
         [
             "Con dấu Ngày Thông Minh (Calendar Stamp): Hiển thị Thứ viết tắt (T5, T6...) và Số ngày lớn (12, 11...) chuẩn phong cách Apple/Linear.",
             "Nhãn ngày tiếng Việt tự nhiên: Định dạng 'Thứ Năm, 12 tháng 11, 2026' kèm badge đếm ngược thông minh ('Hôm nay', 'Ngày mai', 'Sau X ngày').",
             "Segmented Capsule Bar: Gom 3 nút chọn nhanh vào thanh trượt đồng nhất màu xám nhạt, tiết kiệm diện tích tối đa.",
             "Tích hợp mở lịch tức thì: Click vào bất kỳ vị trí nào trên thẻ hoặc icon lịch đều kích hoạt showPicker() của trình duyệt ngay lập tức.",
             "Thẻ 'Lộ trình Đêm' (Night-Shift Card): Xóa bỏ hộp cảnh báo vàng thô và icon emoji 🌙. Thay bằng thẻ Midnight Slate (#0F172A) công nghệ cao, tóm tắt 3 bước: 1. Nhận phòng -> 2. Ăn tối muộn -> 3. Dạo đêm."
         ]),
        ("US-04: Thiết kế lại AI Thinking Modal (UX Elevation)",
         "Trải nghiệm trực quan khi AI khởi tạo lịch trình",
         [
             "Tâm điểm Hero AI Orb: Quả cầu phát sáng với vòng quay động đa chiều @keyframes aiOrbSpin.",
             "Thanh tiến trình Gradient Shimmer: Tải tiến trình mượt mà từ 0% đến 100%.",
             "4 chặng phân tích cô đọng: Phân tích sở thích -> Cân bằng điểm đinh -> Tối ưu lộ trình -> Tổng hợp ngân sách."
         ]),
        ("US-05: Ổn định Hệ thống & Xử lý Xung đột Mã nguồn",
         "Kỹ thuật nền tảng & CI/CD",
         [
             "Giải quyết 14 file xung đột phức tạp từ nhánh origin/dev (6aaa336) mà không làm mất tính năng của các thành viên khác.",
             "Nâng cấp server Python lên ThreadingHTTPServer, ngăn chặn hiện tượng treo kết nối khi xử lý đồng thời.",
             "Khắc phục lỗi React Hydration Error trên Next.js SSR bằng state isHydrated.",
             "Chuẩn hóa nút btnMoreMenu trên trang Chuyến đi, loại bỏ ảnh hưởng từ CSS button toàn cục."
         ]),
        ("US-06: Trợ Lý AI Co-Pilot 'Thổ Địa Sành Sỏi' & Cascading Sleep-In Timeline",
         "Đàm thoại tự nhiên, Mẹo bản xứ độc quyền & Tinh chỉnh lịch trình",
         [
             "Huấn luyện Persona Thổ Địa Sành Sỏi (Few-Shot Prompt Training): Cấu trúc Prompt phản hồi sắc bén ('bén'), hóm hỉnh, am hiểu sâu sắc văn hóa ẩm thực và tiếng lóng du lịch Việt Nam ('ngủ nướng xả stress', 'ăn sập chợ', 'quán chill ngắm hoàng hôn').",
             "Hộp '💡 THỔ ĐỊA MÁCH NƯỚC' (Local Insider Tips): Tự động phát hiện tỉnh thành và cung cấp mẹo thực chiến độc quyền chỉ dân bản địa mới biết (cách chọn mực nhảy Vũng Áng bơi tại bể, giờ vàng đi cáp treo Chùa Hương Tích 08:30 sáng tránh nắng, giờ hoàng hôn Biển Thiên Cầm 17:15).",
             "Thuật toán Dòng chảy Thời gian (Cascading Timeline): Khi khách yêu cầu ngủ nướng, AI tự động lùi giờ bắt đầu sang 09:30, bữa trưa sang 12:00, buổi chiều sang 14:30 mà không gây chồng chéo khung giờ.",
             "Đề xuất tương tác 1-Click: Gợi ý các điểm đến/món ăn phù hợp kèm nút '+ Thêm vào Ngày X' để người dùng đưa ngay vào lịch trình tức thì.",
             "Điều khiển & Hướng dẫn Hệ thống (System Navigator): Tự động mở modal sửa ngân sách, chuyển tab bản đồ hoặc danh sách chuẩn bị khi người dùng yêu cầu bằng lời nói tự nhiên."
         ]),
        ("US-07: Bản Đồ Di Chuyển Tuyến Đường Thực Tế & Trạm Chỉ Đường GPS (Option 5)",
         "Bản đồ số MapLibre, Định vị GPS đa phương tiện & Tối ưu hóa TSP",
         [
             "Vẽ tuyến đường thực tế (OSRM Real Polyline): Kết nối các điểm tham quan theo đúng mạng lưới đường bộ OpenStreetMap với đường nét dày dặn và mũi tên chỉ hướng di chuyển trực quan.",
             "Bộ chuyển đổi Phương tiện Đa dạng (Travel Mode Switcher): Hỗ trợ chuyển đổi giữa Ô tô (Driving), Xe máy (Motorbike) và Đi bộ (Walking). Tự động tính toán lại cự ly và thời gian di chuyển từng chặng theo phương tiện đã chọn.",
             "Thuật toán Tối ưu hóa Cung đường TSP (Nearest Neighbor Optimizer): Nút '⚡ Tối ưu cung đường ngắn nhất' tự động sắp xếp lại thứ tự các điểm dừng trong ngày để tổng quãng đường km là ngắn nhất, triệt tiêu chạy xe zig-zag ngược xuôi.",
             "Trạm Điều Hướng Deeplink Google Maps (Turn-by-Turn GPS Navigation): Nút 'Chỉ đường Google Maps' tự động gom toàn bộ các điểm dừng trong ngày thành một lộ trình hoàn chỉnh, mở ứng dụng dẫn đường GPS bằng giọng nói trên điện thoại chỉ bằng 1 cú click chuột."
         ])
    ]

    for title, subtitle, bullets in stories:
        add_h2(title)
        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.space_after = Pt(3)
        r_sub = p_sub.add_run(subtitle)
        r_sub.font.name = "Arial"
        r_sub.font.size = Pt(10)
        r_sub.font.italic = True
        r_sub.font.color.rgb = MUTED_TEXT

        for b in bullets:
            p_b = doc.add_paragraph(style='List Bullet')
            p_b.paragraph_format.space_after = Pt(2)
            parts = b.split(':', 1)
            if len(parts) == 2:
                r_head = p_b.add_run(parts[0] + ": ")
                r_head.font.name = "Arial"
                r_head.font.size = Pt(9.5)
                r_head.font.bold = True
                r_head.font.color.rgb = DARK_TEXT
                r_body = p_b.add_run(parts[1])
                r_body.font.name = "Arial"
                r_body.font.size = Pt(9.5)
                r_body.font.color.rgb = DARK_TEXT
            else:
                r_b = p_b.add_run(b)
                r_b.font.name = "Arial"
                r_b.font.size = Pt(9.5)
                r_b.font.color.rgb = DARK_TEXT

    # Section IV: Sequence Diagram
    add_h1("IV. SƠ ĐỒ QUY TRÌNH NGƯỜI DÙNG (USER JOURNEY)")
    journey_steps = [
        "1. Người dùng chọn ngày khởi hành trên Smart Departure Cockpit (hoặc chọn nhanh Hôm nay/Mai/Cuối tuần).",
        "2. Nếu khởi hành sau 20:00, hệ thống tự động kích hoạt chế độ Lộ trình Đêm (Night-Shift Mode).",
        "3. Người dùng bấm 'Lập kế hoạch với AI' -> Giao diện kích hoạt AI Thinking Modal với Hero Orb và thanh shimmer.",
        "4. AI Engine v3 phân cụm Anchor-First, tính toán OSRM và Gemini re-ranker để tạo lịch trình chi tiết từng ngày.",
        "5. Người dùng mở bảng 'Dự toán chi phí & Phân tích dao động', tùy chỉnh tiền phòng (ví dụ: 500k/đêm) hoặc chi phí xe/ăn uống.",
        "6. Hệ thống tự động tính lại toàn bộ tổng chi phí đoàn và bình quân mỗi người theo thời gian thực.",
        "7. Người dùng bấm 'Tạo chuyến đi' -> Dữ liệu lịch trình cùng toàn bộ ngân sách tùy biến được đồng bộ tức thì sang /trips và Ví Thủ Quỹ (/treasury)."
    ]
    for step in journey_steps:
        p_step = doc.add_paragraph(style='List Bullet')
        p_step.paragraph_format.space_after = Pt(2)
        r_st = p_step.add_run(step)
        r_st.font.name = "Arial"
        r_st.font.size = Pt(9.5)
        r_st.font.color.rgb = DARK_TEXT

    # Section V: Retrospective
    add_h1("V. SPRINT RETROSPECTIVE (ĐÁNH GIÁ & RÚT KINH NGHIỆM)")
    
    add_h2("1. Điểm làm tốt (What Went Well)")
    good_items = [
        "Hoàn thành 100% mục tiêu Sprint đúng hạn, đạt vận tốc 45/45 Story Points.",
        "Cải tiến đột phá về trải nghiệm giao diện: Giảm 40% chiều cao khu vực ngày đi, loại bỏ icon thừa, thiết kế công nghệ cao.",
        "Thuật toán AI Engine v3 giải quyết trọn vẹn các bài toán thực tế của du khách (cân bằng ngày, chống zigzag, giờ cao điểm, đi muộn).",
        "Hệ thống Custom Budget giải phóng người dùng khỏi các con số dự toán cứng nhắc, đồng bộ chuẩn xác sang Ví Thủ Quỹ."
    ]
    for g in good_items:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(g)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.color.rgb = DARK_TEXT

    add_h2("2. Điểm cần cải thiện (What Can Be Improved)")
    improve_items = [
        "Cần bổ sung caching tầng Redis cho các ma trận khoảng cách OSRM giữa các tọa độ phổ biến để giảm tải CPU.",
        "Cần mở rộng bộ kịch bản kiểm thử tự động E2E (End-to-End) trên Cypress / Playwright cho toàn bộ luồng tạo chuyến đi."
    ]
    for imp in improve_items:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(imp)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.color.rgb = DARK_TEXT

    add_h2("3. Kế hoạch hành động Sprint 4 (Next Action Items)")
    action_items = [
        "Action Item 1: Tích hợp tính năng Chia sẻ Lịch trình qua mã QR và Liên kết cộng tác thời gian thực cho nhóm.",
        "Action Item 2: Kết nối cổng thanh toán đặt cọc phòng khách sạn và vé tham quan trực tiếp từ bảng Custom Budget.",
        "Action Item 3: Tối ưu hiệu năng bản đồ MapLibre GL khi tải đồng thời hơn 50 điểm ghim du lịch."
    ]
    for act in action_items:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(act)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.color.rgb = DARK_TEXT

    # Output paths
    workspace_dir = os.path.abspath(".")
    docx_path = os.path.join(workspace_dir, "BAO_CAO_SPRINT_3_VISTA.docx")
    doc.save(docx_path)
    print(f"Generated DOCX successfully: {docx_path}")

if __name__ == "__main__":
    create_report()

