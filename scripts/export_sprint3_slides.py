import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
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

def create_slides_doc():
    doc = Document()

    # Configure 16:9 Landscape Dimensions (13.333 x 7.5 inches)
    for section in doc.sections:
        section.orientation = WD_ORIENT.LANDSCAPE
        section.page_width = Inches(13.333)
        section.page_height = Inches(7.5)
        section.top_margin = Inches(0.6)
        section.bottom_margin = Inches(0.6)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    NAVY = RGBColor(18, 38, 58)        # #12263A Primary text
    BLUE = RGBColor(37, 99, 235)       # #2563EB Accent Blue
    MUTED = RGBColor(100, 116, 139)    # #64748B Slate Muted
    GREEN = RGBColor(16, 185, 129)     # #10B981 Completed
    AMBER = RGBColor(217, 119, 6)      # #D97706 In progress
    RED = RGBColor(239, 68, 68)        # #EF4444 Blocked

    def add_slide_header(slide_num, title, subtitle=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(2)
        
        r_num = p.add_run(f"SLIDE {slide_num} · ")
        r_num.font.name = "Arial"
        r_num.font.size = Pt(11)
        r_num.font.bold = True
        r_num.font.color.rgb = BLUE
        
        r_title = p.add_run(title)
        r_title.font.name = "Arial"
        r_title.font.size = Pt(22)
        r_title.font.bold = True
        r_title.font.color.rgb = NAVY

        if subtitle:
            p_sub = doc.add_paragraph()
            p_sub.paragraph_format.space_before = Pt(0)
            p_sub.paragraph_format.space_after = Pt(8)
            r_sub = p_sub.add_run(subtitle)
            r_sub.font.name = "Arial"
            r_sub.font.size = Pt(11)
            r_sub.font.italic = True
            r_sub.font.color.rgb = MUTED

    def add_speaker_notes(notes):
        p_note = doc.add_paragraph()
        p_note.paragraph_format.space_before = Pt(10)
        p_note.paragraph_format.space_after = Pt(4)
        r_tag = p_note.add_run("🎙️ LỜI THUYẾT TRÌNH (SPEAKER NOTES):\n")
        r_tag.font.name = "Arial"
        r_tag.font.size = Pt(9.5)
        r_tag.font.bold = True
        r_tag.font.color.rgb = BLUE
        r_body = p_note.add_run(notes)
        r_body.font.name = "Arial"
        r_body.font.size = Pt(9.5)
        r_body.font.italic = True
        r_body.font.color.rgb = MUTED

    # ==========================================
    # SLIDE 1: BÌA SPRINT 3 REVIEW
    # ==========================================
    p_s1_space = doc.add_paragraph()
    p_s1_space.paragraph_format.space_before = Pt(40)
    
    p_s1 = doc.add_paragraph()
    p_s1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s1_tag = p_s1.add_run("VISTA SMART TRAVEL PLATFORM · SPRINT REVIEW\n")
    r_s1_tag.font.name = "Arial"
    r_s1_tag.font.size = Pt(13)
    r_s1_tag.font.bold = True
    r_s1_tag.font.color.rgb = BLUE

    r_s1_main = p_s1.add_run("SPRINT 3 REVIEW & BÀN GIAO SẢN PHẨM\n")
    r_s1_main.font.name = "Arial"
    r_s1_main.font.size = Pt(30)
    r_s1_main.font.bold = True
    r_s1_main.font.color.rgb = NAVY

    r_s1_desc = p_s1.add_run("Bứt phá Bộ não AI v3.0 · Smart Cockpit · Thổ Địa Sành Sỏi · Trạm Chỉ Đường GPS\n\n")
    r_s1_desc.font.name = "Arial"
    r_s1_desc.font.size = Pt(13)
    r_s1_desc.font.color.rgb = MUTED

    # Metadata table
    t_meta = doc.add_table(rows=1, cols=4)
    t_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("DỰ ÁN", "VISTA Du Lịch Thông Minh"),
        ("NHÓM THỰC HIỆN", "VISTA Core Engineering"),
        ("THỜI GIAN SPRINT", "30/10/2026 – 13/11/2026"),
        ("NGÀY BÁO CÁO", "13/11/2026")
    ]
    for c_idx, (k, v) in enumerate(meta_data):
        cell = t_meta.cell(0, c_idx)
        set_cell_background(cell, "F4F7FA")
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p.add_run(k + "\n")
        r1.font.name = "Arial"
        r1.font.size = Pt(9)
        r1.font.bold = True
        r1.font.color.rgb = BLUE
        r2 = p.add_run(v)
        r2.font.name = "Arial"
        r2.font.size = Pt(10)
        r2.font.bold = True
        r2.font.color.rgb = NAVY

    add_speaker_notes(
        "Kính chào Hội đồng và các bên liên quan. Hôm nay nhóm VISTA báo cáo kết quả Sprint 3 kéo dài 2 tuần vừa qua. "
        "Trong Sprint này, nhóm đã hoàn thành toàn diện 7 hạng mục cam kết lớn, giải quyết triệt để các bài toán khó về thuật toán AI, "
        "tối ưu hóa giao diện Smart Cockpit và nâng tầm AI Co-Pilot thành một Thổ Địa du lịch thực thụ."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 2: MỤC TIÊU VÀ KẾT QUẢ SPRINT
    # ==========================================
    add_slide_header("2", "MỤC TIÊU VÀ KẾT QUẢ THỰC TẾ SPRINT 3", "Đối chiếu giữa Sprint Goal đã cam kết đầu Sprint và kết quả bàn giao thực tế")
    
    t_s2 = doc.add_table(rows=1, cols=2)
    t_s2.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    cell_g = t_s2.cell(0, 0)
    set_cell_background(cell_g, "F8FAFC")
    set_cell_margins(cell_g, top=140, bottom=140, left=180, right=180)
    p_g = cell_g.paragraphs[0]
    r_gh = p_g.add_run("🎯 MỤC TIÊU CAM KẾT (SPRINT GOAL)\n\n")
    r_gh.font.name = "Arial"
    r_gh.font.size = Pt(13)
    r_gh.font.bold = True
    r_gh.font.color.rgb = BLUE
    r_gb = p_g.add_run(
        "1. Nâng cấp AI Engine v3.0: Giải quyết bài toán dồn cụm điểm đinh (Anchor-first), khử lộ trình zigzag và tích hợp dự báo kẹt xe OSRM.\n\n"
        "2. Tối ưu trải nghiệm Khởi hành: Thiết kế lại Smart Departure Cockpit tối giản, hiện đại, hỗ trợ kịch bản đi đêm (Night-shift).\n\n"
        "3. Tùy chỉnh Ngân sách thời gian thực: Cho phép người dùng sửa giá phòng, giá ăn thực tế; sửa triệt để lỗi số 0 thừa.\n\n"
        "4. Bàn giao AI Co-Pilot & Bản đồ GPS: Hỗ trợ lệnh nói tự nhiên, ngủ nướng, mách mẹo địa phương và dẫn đường trực tiếp."
    )
    r_gb.font.name = "Arial"
    r_gb.font.size = Pt(10.5)
    r_gb.font.color.rgb = NAVY

    cell_r = t_s2.cell(0, 1)
    set_cell_background(cell_r, "F0FDF4")
    set_cell_margins(cell_r, top=140, bottom=140, left=180, right=180)
    p_r = cell_r.paragraphs[0]
    r_rh = p_r.add_run("✅ KẾT QUẢ BÀN GIAO THỰC TẾ (100% HOÀN THÀNH)\n\n")
    r_rh.font.name = "Arial"
    r_rh.font.size = Pt(13)
    r_rh.font.bold = True
    r_rh.font.color.rgb = GREEN
    r_rb = p_r.add_run(
        "1. Đạt 100% Core Engine: Unit test 5/5 pass (1.061s). Lịch trình phân bổ đều điểm đinh, thời gian phản hồi OSRM giảm 60%.\n\n"
        "2. Cockpit Apple-Style hoàn thiện: Calendar Stamp T5/12, thanh trượt Segmented Capsule Bar, thẻ Midnight Slate #0F172A sang trọng.\n\n"
        "3. Ngân sách chuẩn xác: Tùy biến 5 biến số linh hoạt, auto-select xóa số 0 thừa, đồng bộ tức thì sang Ví Thủ Quỹ (/treasury).\n\n"
        "4. Ra mắt Thổ Địa Sành Sỏi & Map GPS: Xử lý lệnh ngủ nướng trôi dạt timeline mượt mà, bộ chọn Ô tô/Xe máy/Đi bộ, TSP tối ưu chặng và mở Google Maps."
    )
    r_rb.font.name = "Arial"
    r_rb.font.size = Pt(10.5)
    r_rb.font.color.rgb = NAVY

    add_speaker_notes(
        "Nhìn vào bảng đối chiếu, toàn bộ 4 trọng tâm của Sprint Goal đều được nhóm chuyển hóa thành kết quả kiểm chứng cụ thể. "
        "Không có hạng mục nào bị cắt giảm phạm vi. Điểm nổi bật nhất là hiệu năng của AI Engine tăng gấp đôi "
        "đồng thời giao diện người dùng đạt tiêu chuẩn thiết kế tối giản, công nghệ cao."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 3: TIẾN ĐỘ BÀN GIAO BACKLOG
    # ==========================================
    add_slide_header("3", "TIẾN ĐỘ BÀN GIAO CÁC HẠNG MỤC SPRINT 3", "Danh sách chi tiết các User Stories, trạng thái nghiệm thu và kết quả đạt được")
    
    backlog_items = [
        ("Hạng mục Backlog", "Trạng thái", "Kết quả bàn giao & Đánh giá nghiệm thu"),
        ("US-01: AI Planning Engine v3.0 (Core Engine)", "HOÀN THÀNH", "Anchor-first balancing, OSRM Matrix 1xN, Anti-zigzag, Gemini 2.5 re-ranker. 5/5 Unit test PASS."),
        ("US-02: Bộ tùy chỉnh Ngân sách (Custom Rates)", "HOÀN THÀNH", "Tùy biến 5 biến số inline; Fix triệt để lỗi số 0 thừa (0500000 -> 500000); Đồng bộ Ví thủ quỹ."),
        ("US-03: Khoang điều khiển Smart Departure Cockpit", "HOÀN THÀNH", "Calendar stamp T5/12, Segmented capsule, click mở native picker, Night-shift mode #0F172A."),
        ("US-04: Thiết kế lại AI Thinking Modal (UX Elevation)", "HOÀN THÀNH", "Tâm điểm Hero AI Orb chuyển động đa chiều, Gradient shimmer bar 0-100%, 4 chặng phân tích."),
        ("US-05: Ổn định hệ thống & Merge Git Conflict", "HOÀN THÀNH", "Resolve 14 file conflict nhánh dev (6aaa336); Nâng cấp server đa luồng ThreadingHTTPServer."),
        ("US-06: Trợ lý AI Co-Pilot 'Thổ Địa Sành Sỏi'", "HOÀN THÀNH", "Few-shot persona, Hộp '💡 Thổ địa mách nước', Cascading sleep-in timeline, gợi ý thẻ 1-click."),
        ("US-07: Bản đồ Tuyến đường Thực tế & Trạm Chỉ đường GPS", "HOÀN THÀNH", "OSRM Polyline OpenFreeMap/Satellite; Chuyển đổi Ô tô/Xe máy/Đi bộ; TSP Optimizer; Google Maps Multi-stop.")
    ]

    t_s3 = doc.add_table(rows=len(backlog_items), cols=3)
    t_s3.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(backlog_items):
        for c_idx, val in enumerate(row):
            cell = t_s3.cell(r_idx, c_idx)
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(9.5)

            if r_idx == 0:
                set_cell_background(cell, "12263A")
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
            else:
                if r_idx % 2 == 1:
                    set_cell_background(cell, "F8FAFC")
                if c_idx == 1:
                    set_cell_background(cell, "DCFCE7")
                    run.font.bold = True
                    run.font.color.rgb = GREEN
                elif c_idx == 0:
                    run.font.bold = True
                    run.font.color.rgb = NAVY
                else:
                    run.font.color.rgb = NAVY

    add_speaker_notes(
        "Bảng tiến độ thể hiện rõ 7 hạng mục trọng điểm đều mang trạng thái HOÀN THÀNH màu xanh lá. "
        "Đặc biệt hai tính năng US-06 và US-07 là phần nâng cấp bứt phá vượt kỳ vọng ban đầu, "
        "giúp khách hàng không chỉ có một lịch trình tĩnh mà còn có một trợ lý thực thụ dẫn đường trên suốt chuyến đi."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 4: DEMO TÍNH NĂNG NỔI BẬT
    # ==========================================
    add_slide_header("4", "DEMO TÍNH NĂNG: AI CO-PILOT THỔ ĐỊA & TRẠM BẢN ĐỒ GPS", "Giải quyết trọn vẹn nhu cầu điều chỉnh lịch trình linh hoạt và chỉ đường thực tế")

    t_s4 = doc.add_table(rows=1, cols=2)
    t_s4.alignment = WD_TABLE_ALIGNMENT.CENTER

    cell_d1 = t_s4.cell(0, 0)
    set_cell_background(cell_d1, "F8FAFC")
    set_cell_margins(cell_d1, top=120, bottom=120, left=150, right=150)
    p_d1 = cell_d1.paragraphs[0]
    r_d1h = p_d1.add_run("🤖 1. AI CO-PILOT 'THỔ ĐỊA SÀNH SỎI'\n\n")
    r_d1h.font.name = "Arial"
    r_d1h.font.size = Pt(12)
    r_d1h.font.bold = True
    r_d1h.font.color.rgb = BLUE
    r_d1b = p_d1.add_run(
        "• Nhu cầu thực tế:\n"
        "  Khách đi du lịch muốn ngủ nướng xả stress Ngày 2 mà không phải tính lại từng mốc giờ thủ công; muốn biết ăn ở đâu ngon, chuẩn giá, né bẫy du lịch chặt chém.\n\n"
        "• Thao tác nhanh:\n"
        "  Bấm chip '😴 Ngủ nướng Ngày 2' hoặc gõ lệnh: 'Ở Hà Tĩnh có món gì ngon và quán nào chất lượng?'.\n\n"
        "• Kết quả nhận được tức thì:\n"
        "  [1] Lịch khởi hành dời sang 09:30, bữa trưa 12:00, buổi chiều 14:30 tuần tự mượt mà.\n"
        "  [2] Hộp '💡 Thổ Địa Mách Nước' hiện mẹo chọn Mực nhảy Vũng Áng bơi tại bể, giờ vàng đi Chùa Hương Tích 08:30 sáng.\n"
        "  [3] Thẻ gợi ý món ăn/điểm đến kèm nút '+ Thêm vào Ngày 2' đưa vào lịch bằng 1 click."
    )
    r_d1b.font.name = "Arial"
    r_d1b.font.size = Pt(9.5)
    r_d1b.font.color.rgb = NAVY

    cell_d2 = t_s4.cell(0, 1)
    set_cell_background(cell_d2, "F0F9FF")
    set_cell_margins(cell_d2, top=120, bottom=120, left=150, right=150)
    p_d2 = cell_d2.paragraphs[0]
    r_d2h = p_d2.add_run("🗺️ 2. BẢN ĐỒ TUYẾN ĐƯỜNG & CHỈ ĐƯỜNG GPS\n\n")
    r_d2h.font.name = "Arial"
    r_d2h.font.size = Pt(12)
    r_d2h.font.bold = True
    r_d2h.font.color.rgb = BLUE
    r_d2b = p_d2.add_run(
        "• Nhu cầu thực tế:\n"
        "  Du khách cần biết chính xác cự ly km, thời gian chạy xe máy/ô tô giữa các điểm và muốn có GPS chỉ đường trực tiếp trên xe.\n\n"
        "• Thao tác nhanh:\n"
        "  Chuyển tab 'Bản đồ di chuyển' -> Chọn phương tiện '🛵 Xe máy' -> Bấm 'Chỉ đường Google Maps'.\n\n"
        "• Kết quả nhận được tức thì:\n"
        "  [1] Vẽ tuyến đường OSRM uốn lượn theo mặt đường thật, hiển thị dải chặng: 1 Bãi biển Thiên Cầm ➔ 2.4km·5p ➔ 2 Ngã ba Đồng Lộc ➔ 3.6km·7p...\n"
        "  [2] Nút '⚡ Tối ưu cung đường': Thuật toán TSP tự động xếp lại thứ tự điểm ngắn nhất, triệt tiêu quay đầu xe zig-zag.\n"
        "  [3] Mở Google Maps điện thoại với đầy đủ lộ trình multi-stop để bắt đầu lái xe GPS ngay."
    )
    r_d2b.font.name = "Arial"
    r_d2b.font.size = Pt(9.5)
    r_d2b.font.color.rgb = NAVY

    add_speaker_notes(
        "Ở slide demo này, chúng ta chứng kiến sự kết hợp hoàn hảo giữa giao diện và trí tuệ nhân tạo. "
        "Du khách chỉ cần nói mong muốn của mình, AI Co-Pilot tự động xử lý lịch trình và chỉ cần một nút bấm duy nhất, "
        "toàn bộ chặng dừng được chuyển tiếp sang Google Maps để dẫn đường GPS thực tế trên đường đi."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 5: LUỒNG HOẠT ĐỘNG
    # ==========================================
    add_slide_header("5", "LUỒNG HOẠT ĐỘNG HỆ THỐNG (USER & SYSTEM FLOW)", "Sơ đồ kiến trúc xử lý từ khi người dùng nhập yêu cầu đến khi hiển thị kết quả đồng bộ")

    steps = [
        ("BƯỚC 1: KHỞI TẠO", "Người dùng nhập lệnh hoặc chọn Chip", "Ví dụ: 'Cho mình ngủ nướng Ngày 2' hoặc chọn '🛵 Xe máy' trên Bản đồ."),
        ("BƯỚC 2: PHÂN TÍCH", "AI Re-planner & Gemini Engine", "Phân tích Intent: SLEEP_IN, tính toán độ dời thời gian shift_minutes = 90 phút."),
        ("BƯỚC 3: DÒNG CHẢY", "Cascading Timeline Simulator", "Dời giờ xuất phát 09:30, ăn trưa 12:00, kiểm tra khung giờ mở cửa không xung đột."),
        ("BƯỚC 4: TỐI ƯU CUNG ĐƯỜNG", "Thuật toán TSP & OSRM Matrix", "Sắp xếp lại thứ tự chặng ngắn nhất, tính cự ly km và thời gian lái xe theo phương tiện."),
        ("BƯỚC 5: ĐỒNG BỘ TOÀN DIỆN", "Giao diện WebGL & Deeplink GPS", "Hiển thị hộp 'Thổ địa mách nước', thẻ gợi ý 1-click và link Google Maps Multi-stop.")
    ]

    t_flow = doc.add_table(rows=1, cols=len(steps))
    t_flow.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, (title, sub, desc) in enumerate(steps):
        cell = t_flow.cell(0, idx)
        bg = "E0F2FE" if idx % 2 == 0 else "F0FDF4"
        set_cell_background(cell, bg)
        set_cell_margins(cell, top=140, bottom=140, left=100, right=100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        r1 = p.add_run(title + "\n")
        r1.font.name = "Arial"
        r1.font.size = Pt(9)
        r1.font.bold = True
        r1.font.color.rgb = BLUE

        r2 = p.add_run(sub + "\n\n")
        r2.font.name = "Arial"
        r2.font.size = Pt(10)
        r2.font.bold = True
        r2.font.color.rgb = NAVY

        r3 = p.add_run(desc)
        r3.font.name = "Arial"
        r3.font.size = Pt(8.5)
        r3.font.color.rgb = MUTED

    add_speaker_notes(
        "Luồng hoạt động 5 bước này giải thích rõ cơ chế phối hợp giữa người dùng và hệ thống. "
        "Mọi yêu cầu phức tạp từ người dùng đều được bóc tách khoa học: từ phân tích ngữ nghĩa, "
        "mô phỏng dòng chảy thời gian, đến tính toán tuyến đường OSRM và đồng bộ ra giao diện chỉ trong chưa đầy 1 giây."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 6: KIỂM THỬ VÀ CHẤT LƯỢNG
    # ==========================================
    add_slide_header("6", "KIỂM THỬ VÀ BẢO ĐẢM CHẤT LƯỢNG (TESTING & QA)", "Thống kê phạm vi kiểm thử tự động, kết quả Pass/Fail và mức độ ổn định hệ thống")

    test_metrics = [
        ("Phân hệ kiểm thử", "Công cụ / Phương thức", "Phạm vi kiểm thử", "Kết quả đạt được"),
        ("AI Planning Engine v3.0", "Python Unittest (`test_ai_engine_v3.py`)", "Clustering, Anchor balancing, Anti-zigzag, Budget ceiling, OSRM", "PASS 5/5 tests (1.061s) · 100%"),
        ("Mã nguồn Frontend Web", "TypeScript Compiler (`tsc --noEmit`)", "Kiểm tra kiểu dữ liệu tĩnh toàn bộ app Next.js 16 Turbo", "0 Lỗi (Zero TypeScript Errors)"),
        ("Xung đột Git Branch", "Git Merge Strategy (`origin/dev`)", "14 file xung đột phức tạp trải dài backend & frontend", "Đã giải quyết 100%, bảo toàn tính năng"),
        ("Hiệu năng Re-planner", "Gemini API Timeout Guard & Key Pool", "Phản hồi câu lệnh Co-Pilot tự nhiên & fallback", "Thời gian phản hồi trung bình < 1.2s"),
        ("Bản đồ & Điều hướng GPS", "MapLibre GL & OpenFreeMap / OSRM", "Kiểm thử tải vector tile, vẽ polyline, chuyển xe máy/ô tô", "Hiển thị mượt mà 60fps, 0 lỗi console"),
        ("Lỗi còn mở (Open Bugs)", "Issue Tracking Sprint 3", "Không có lỗi nghiêm trọng (Zero Critical Bugs)", "Chuyển tiếp tối ưu Redis Cache sang Sprint 4")
    ]

    t_test = doc.add_table(rows=len(test_metrics), cols=4)
    t_test.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(test_metrics):
        for c_idx, val in enumerate(row):
            cell = t_test.cell(r_idx, c_idx)
            set_cell_margins(cell, top=60, bottom=60, left=90, right=90)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(9.5)

            if r_idx == 0:
                set_cell_background(cell, "12263A")
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
            else:
                if r_idx % 2 == 1:
                    set_cell_background(cell, "F8FAFC")
                if c_idx == 3 and "PASS" in val or "0 Lỗi" in val or "100%" in val:
                    run.font.bold = True
                    run.font.color.rgb = GREEN
                elif c_idx == 0:
                    run.font.bold = True
                    run.font.color.rgb = NAVY
                else:
                    run.font.color.rgb = NAVY

    add_speaker_notes(
        "Về chất lượng sản phẩm, Sprint 3 ghi nhận sự ổn định tuyệt đối: 100% unit test của AI engine vượt qua thành công, "
        "bộ mã nguồn TypeScript đạt chuẩn 0 lỗi và không tồn đọng bất kỳ lỗi nghiêm trọng nào gây chặn người dùng. "
        "Đây là tiền đề kỹ thuật vững chắc để bước sang giai đoạn mở rộng tính năng nhóm ở Sprint 4."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 7: VƯỚNG MẮC VÀ CÁCH XỬ LÝ
    # ==========================================
    add_slide_header("7", "VƯỚNG MẮC PHÁT SINH VÀ GIẢI PHÁP XỬ LÝ", "Các thách thức kỹ thuật lớn trong Sprint, biện pháp khắc phục và bài học kinh nghiệm")

    impediments = [
        ("Vướng mắc phát sinh", "Ảnh hưởng đến tiến độ/chất lượng", "Hành động xử lý dứt điểm của Nhóm"),
        ("1. Xung đột Git Merge 14 files từ nhánh origin/dev", "Nguy cơ đè mất tính năng ví thủ quỹ và routing của thành viên khác.", "Sử dụng chiến lược --ours kết hợp tinh chỉnh thủ công từng interface TypeScript (RouteLeg) và bảo toàn 100% logic."),
        ("2. Server Python bị treo khi gọi đồng thời Gemini + OSRM", "Người dùng bấm liên tục gây nghẽn kết nối, socket bị khóa.", "Nâng cấp từ HTTPServer đơn luồng lên ThreadingHTTPServer đa luồng, hỗ trợ xử lý song song không nghẽn."),
        ("3. Lỗi số 0 đứng trước khi nhập ngân sách (0500000)", "Dự toán chi phí bị hiển thị sai định dạng gây khó chịu cho người dùng.", "Triển khai cơ chế auto-select bôi đen toàn bộ số khi click và regex làm sạch số 0 thừa tự động."),
        ("4. Lỗi Next.js Hydration Mismatch trên trang Planner", "Cảnh báo đỏ trên console do sai lệch giờ giữa máy chủ SSR và Client.", "Bổ sung cờ isHydrated để trì hoãn render phần tử phụ thuộc thời gian thực cho đến khi gắn kết trình duyệt.")
    ]

    t_imp = doc.add_table(rows=len(impediments), cols=3)
    t_imp.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(impediments):
        for c_idx, val in enumerate(row):
            cell = t_imp.cell(r_idx, c_idx)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(3)
            run = p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(9.5)

            if r_idx == 0:
                set_cell_background(cell, "12263A")
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
            else:
                if r_idx % 2 == 1:
                    set_cell_background(cell, "F8FAFC")
                if c_idx == 0:
                    run.font.bold = True
                    run.font.color.rgb = NAVY
                elif c_idx == 2:
                    run.font.color.rgb = BLUE
                else:
                    run.font.color.rgb = NAVY

    add_speaker_notes(
        "Trong quá trình triển khai, nhóm đã đối mặt với 4 vướng mắc kỹ thuật phức tạp, đặc biệt là việc xung đột mã nguồn khi merge nhánh. "
        "Bằng việc phân tích kỹ lưỡng và giải quyết dứt điểm tận gốc nguyên nhân, hệ thống không những không bị trễ hạn "
        "mà còn trở nên vững chắc và chịu tải tốt hơn trước rất nhiều."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 8: KẾ HOẠCH VÀ ƯU TIÊN SPRINT 4
    # ==========================================
    add_slide_header("8", "KẾ HOẠCH VÀ CÁC ƯU TIÊN TRỌNG TÂM SPRINT 4", "Mục tiêu tiếp theo, phân định rõ nội dung đã thống nhất và các đề xuất cần biểu quyết")

    t_s8 = doc.add_table(rows=1, cols=2)
    t_s8.alignment = WD_TABLE_ALIGNMENT.CENTER

    cell_p1 = t_s8.cell(0, 0)
    set_cell_background(cell_p1, "F0FDF4")
    set_cell_margins(cell_p1, top=140, bottom=140, left=180, right=180)
    p_p1 = cell_p1.paragraphs[0]
    r_p1h = p_p1.add_run("📌 CÁC HẠNG MỤC ĐÃ THỐNG NHẤT (AGREED)\n\n")
    r_p1h.font.name = "Arial"
    r_p1h.font.size = Pt(12.5)
    r_p1h.font.bold = True
    r_p1h.font.color.rgb = GREEN
    r_p1b = p_p1.add_run(
        "1. Chia sẻ Lịch trình & QR Code Cộng tác Nhóm:\n"
        "   Cho phép gửi link cho bạn bè cùng chỉnh sửa lịch trình thời gian thực và quét mã QR xem nhanh trên điện thoại.\n\n"
        "2. Tích hợp Voice AI Co-Pilot (Điều khiển Giọng nói):\n"
        "   Bổ sung nút Micro nhận diện giọng nói tiếng Việt tự nhiên và phát âm thanh phản hồi của Thổ Địa AI khi đang lái xe.\n\n"
        "3. Tối ưu hóa Thuật toán Chia tiền Ví Thủ Quỹ (/treasury):\n"
        "   Tự động tính toán tối giản số lần chuyển khoản giữa các thành viên (Debt Simplification) kèm mã VietQR từng khoản."
    )
    r_p1b.font.name = "Arial"
    r_p1b.font.size = Pt(10)
    r_p1b.font.color.rgb = NAVY

    cell_p2 = t_s8.cell(0, 1)
    set_cell_background(cell_p2, "FFFBEB")
    set_cell_margins(cell_p2, top=140, bottom=140, left=180, right=180)
    p_p2 = cell_p2.paragraphs[0]
    r_p2h = p_p2.add_run("💡 ĐỀ XUẤT CẦN Ý KIẾN HỘI ĐỒNG (PROPOSED)\n\n")
    r_p2h.font.name = "Arial"
    r_p2h.font.size = Pt(12.5)
    r_p2h.font.bold = True
    r_p2h.font.color.rgb = AMBER
    r_p2b = p_p2.add_run(
        "1. Xuất Cẩm nang Du lịch Infographic & PDF:\n"
        "   Xuất toàn bộ lịch trình, ảnh check-in và dự toán chi phí ra 1 file PDF/ảnh dài như tạp chí du lịch để in ấn hoặc đăng story.\n\n"
        "2. Bộ nhớ đệm phân tán Redis cho Ma trận OSRM:\n"
        "   Đề xuất triển khai Redis Cache để lưu kết quả định tuyến giữa các địa danh quen thuộc, giúp giảm 80% tải mạng ra server ngoài.\n\n"
        "3. Đóng gói Docker & Pipeline CI/CD tự động:\n"
        "   Đóng gói toàn bộ backend Spring Boot + AI Python + Web Next.js vào cụm Docker Compose phục vụ triển khai Cloud."
    )
    r_p2b.font.name = "Arial"
    r_p2b.font.size = Pt(10)
    r_p2b.font.color.rgb = NAVY

    add_speaker_notes(
        "Bước sang Sprint 4, nhóm đã thống nhất 3 ưu tiên lớn tập trung vào tính tương tác nhóm và giọng nói. "
        "Đồng thời, nhóm xin ý kiến Hội đồng về 3 đề xuất mở rộng: đặc biệt là tính năng xuất cẩm nang PDF và hạ tầng Redis cache. "
        "Rất mong nhận được đóng góp quý báu từ quý thầy cô và các bên liên quan. Xin chân thành cảm ơn!"
    )

    workspace_dir = os.path.abspath(".")
    docx_path = os.path.join(workspace_dir, "SLIDE_SPRINT_3_REVIEW_VISTA.docx")
    doc.save(docx_path)
    print(f"Generated Landscape Slides DOCX successfully: {docx_path}")

if __name__ == "__main__":
    create_slides_doc()

