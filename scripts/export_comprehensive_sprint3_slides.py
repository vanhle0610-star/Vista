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

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
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

def create_comprehensive_slides():
    doc = Document()

    # Configure 16:9 Landscape Dimensions (13.333 x 7.5 inches)
    for section in doc.sections:
        section.orientation = WD_ORIENT.LANDSCAPE
        section.page_width = Inches(13.333)
        section.page_height = Inches(7.5)
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)

    NAVY = RGBColor(18, 38, 58)        # #12263A Primary text
    BLUE = RGBColor(37, 99, 235)       # #2563EB Accent Blue
    MUTED = RGBColor(100, 116, 139)    # #64748B Slate Muted
    GREEN = RGBColor(16, 185, 129)     # #10B981 Completed
    AMBER = RGBColor(217, 119, 6)      # #D97706 In progress
    RED = RGBColor(239, 68, 68)        # #EF4444 Blocked

    def add_slide_header(slide_num, title, subtitle=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        
        r_num = p.add_run(f"SLIDE {slide_num} · ")
        r_num.font.name = "Arial"
        r_num.font.size = Pt(10)
        r_num.font.bold = True
        r_num.font.color.rgb = BLUE
        
        r_title = p.add_run(title)
        r_title.font.name = "Arial"
        r_title.font.size = Pt(20)
        r_title.font.bold = True
        r_title.font.color.rgb = NAVY

        if subtitle:
            p_sub = doc.add_paragraph()
            p_sub.paragraph_format.space_before = Pt(0)
            p_sub.paragraph_format.space_after = Pt(6)
            r_sub = p_sub.add_run(subtitle)
            r_sub.font.name = "Arial"
            r_sub.font.size = Pt(10)
            r_sub.font.italic = True
            r_sub.font.color.rgb = MUTED

    def add_speaker_notes(notes):
        p_note = doc.add_paragraph()
        p_note.paragraph_format.space_before = Pt(8)
        p_note.paragraph_format.space_after = Pt(2)
        r_tag = p_note.add_run("🎙️ LỜI THUYẾT TRÌNH (SPEAKER NOTES): ")
        r_tag.font.name = "Arial"
        r_tag.font.size = Pt(9)
        r_tag.font.bold = True
        r_tag.font.color.rgb = BLUE
        r_body = p_note.add_run(notes)
        r_body.font.name = "Arial"
        r_body.font.size = Pt(9)
        r_body.font.italic = True
        r_body.font.color.rgb = MUTED

    # ==========================================
    # SLIDE 1: BÌA SPRINT 3 REVIEW TOÀN ĐỘI
    # ==========================================
    p_s1_space = doc.add_paragraph()
    p_s1_space.paragraph_format.space_before = Pt(25)
    
    p_s1 = doc.add_paragraph()
    p_s1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s1_tag = p_s1.add_run("VISTA SMART TRAVEL PLATFORM · SPRINT 3 REVIEW\n")
    r_s1_tag.font.name = "Arial"
    r_s1_tag.font.size = Pt(12)
    r_s1_tag.font.bold = True
    r_s1_tag.font.color.rgb = BLUE

    r_s1_main = p_s1.add_run("BÁO CÁO TỔNG KẾT TOÀN DIỆN SPRINT 3\n")
    r_s1_main.font.name = "Arial"
    r_s1_main.font.size = Pt(28)
    r_s1_main.font.bold = True
    r_s1_main.font.color.rgb = NAVY

    r_s1_desc = p_s1.add_run("Hợp nhất 5 Phân hệ Trọng tâm: TV1 (Khám phá & Admin) · TV2 (Bảo mật & RBAC) · TV3 (Chuyến đi & Cộng tác) · TV4 (AI Planner & Ngân sách) · TV5 (Bản đồ & CI/CD)\n\n")
    r_s1_desc.font.name = "Arial"
    r_s1_desc.font.size = Pt(11)
    r_s1_desc.font.color.rgb = MUTED

    # Team members & modules table
    t_team = doc.add_table(rows=1, cols=5)
    t_team.alignment = WD_TABLE_ALIGNMENT.CENTER
    team_data = [
        ("TV1 · Lê Hồng Sơn", "Khám phá Điểm đến, Tìm kiếm Không dấu & Hệ thống Admin"),
        ("TV2 · Trần Quang Sáng", "Bảo mật RBAC, Xác thực Session, Quản lý Chuyến đi & Shimmer Skeleton"),
        ("TV3 · Nguyễn Văn Quý", "Cộng tác Chuyến đi, Mời Thành viên, Chuyển quyền Trưởng nhóm & Mobile"),
        ("TV4 · Lê Thị Vân Ánh", "Bộ não AI Planner v3.0, Smart Cockpit, Thổ Địa Sành Sỏi & Ngân sách VietQR"),
        ("TV5 · Nguyễn Quang Tuấn", "Bản đồ Tuyến đường OSRM, Tối ưu hóa Database Supabase & Pipeline CI/CD")
    ]
    for c_idx, (member, role) in enumerate(team_data):
        cell = t_team.cell(0, c_idx)
        set_cell_background(cell, "F4F7FA")
        set_cell_margins(cell, top=80, bottom=80, left=90, right=90)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p.add_run(member + "\n")
        r1.font.name = "Arial"
        r1.font.size = Pt(9.5)
        r1.font.bold = True
        r1.font.color.rgb = BLUE
        r2 = p.add_run(role)
        r2.font.name = "Arial"
        r2.font.size = Pt(8)
        r2.font.color.rgb = NAVY

    add_speaker_notes(
        "Kính chào Hội đồng và các bên liên quan. Hôm nay nhóm VISTA báo cáo kết quả Sprint 3 (Tuần 7-8). "
        "Đây là đợt bàn giao quy mô nhất khi toàn bộ 5 thành viên phối hợp chặt chẽ trên 5 phân hệ TV1 đến TV5, "
        "hợp nhất hoàn chỉnh từ hạ tầng xác thực, quản lý chuyến đi, cộng tác nhóm đến trí tuệ nhân tạo và bản đồ thực tế."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 2: MỤC TIÊU VÀ KẾT QUẢ TỔNG THỂ 5 PHÂN HỆ
    # ==========================================
    add_slide_header("2", "MỤC TIÊU VÀ KẾT QUẢ TỔNG THỂ CỦA 5 THÀNH VIÊN", "Đối chiếu giữa cam kết đầu Sprint và kết quả bàn giao thực tế trên toàn bộ hệ thống")
    
    t_s2 = doc.add_table(rows=1, cols=2)
    t_s2.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    cell_g = t_s2.cell(0, 0)
    set_cell_background(cell_g, "F8FAFC")
    set_cell_margins(cell_g, top=100, bottom=100, left=140, right=140)
    p_g = cell_g.paragraphs[0]
    r_gh = p_g.add_run("🎯 MỤC TIÊU CAM KẾT (5 PHÂN HỆ)\n\n")
    r_gh.font.name = "Arial"
    r_gh.font.size = Pt(11.5)
    r_gh.font.bold = True
    r_gh.font.color.rgb = BLUE
    r_gb = p_g.add_run(
        "• TV1 (Sơn): Hoàn thiện tìm kiếm không dấu, bộ lọc đa tiêu chí, hàng đợi kiểm duyệt (Moderation queue) và phân hệ Admin TV1.\n"
        "• TV2 (Sang): Củng cố bảo mật RBAC, cơ chế refresh token, vòng đời trạng thái chuyến đi và hệ thống Shimmer Skeleton chống giật lag.\n"
        "• TV3 (Quy): Xây dựng tính năng mời thành viên động, phân quyền Trưởng nhóm/Thành viên, đồng bộ danh sách chuyến đi và thông báo realtime.\n"
        "• TV4 (Vân Ánh): Nâng cấp AI Planning Engine v3.0 (khử zigzag, tránh kẹt xe), Smart Cockpit, AI Co-Pilot Thổ Địa Sành Sỏi và Ngân sách.\n"
        "• TV5 (Tuấn): Hoàn thiện định tuyến bản đồ OSRM, migration database Supabase, chạy kiểm thử WebMvcTest và chuẩn hóa CI/CD."
    )
    r_gb.font.name = "Arial"
    r_gb.font.size = Pt(9.5)
    r_gb.font.color.rgb = NAVY

    cell_r = t_s2.cell(0, 1)
    set_cell_background(cell_r, "F0FDF4")
    set_cell_margins(cell_r, top=100, bottom=100, left=140, right=140)
    p_r = cell_r.paragraphs[0]
    r_rh = p_r.add_run("✅ KẾT QUẢ NGHIỆM THU (100% HOÀN THÀNH)\n\n")
    r_rh.font.name = "Arial"
    r_rh.font.size = Pt(11.5)
    r_rh.font.bold = True
    r_rh.font.color.rgb = GREEN
    r_rb = p_r.add_run(
        "• TV1 Bàn giao: Admin dashboard quản lý điểm đến, tìm kiếm tiếng Việt không dấu siêu nhạy, cách ly dữ liệu công khai/nội bộ.\n"
        "• TV2 Bàn giao: Hệ thống bảo mật RBAC vững chắc, loại bỏ hoàn toàn Duplicate Navbar, Shimmer Skeleton GPU 0-shift transitions.\n"
        "• TV3 Bàn giao: Luồng mời thành viên qua link/mã, xử lý 403, tự động chuyển quyền Leader khi rời nhóm, giao diện Mobile TV3 hoàn tất.\n"
        "• TV4 Bàn giao: Unit test AI 5/5 PASS, Smart Departure Cockpit T5/12, AI Thổ Địa phản hồi bén kèm hộp 'Mẹo Thổ Địa', TSP GPS.\n"
        "• TV5 Bàn giao: Tuyến đường OSRM polyline mượt mà, Spotless format code toàn diện, pass PostgreSQL Supabase test trên CI."
    )
    r_rb.font.name = "Arial"
    r_rb.font.size = Pt(9.5)
    r_rb.font.color.rgb = NAVY

    add_speaker_notes(
        "Trong Sprint 3, cả 5 thành viên đều hoàn thành trọn vẹn 100% mục tiêu của từng phân hệ. "
        "Sự kết hợp giữa hạ tầng bảo mật của Sang, phân hệ cộng tác của Quy, admin của Sơn, "
        "bản đồ CI của Tuấn và bộ não AI của Vân Ánh đã tạo nên một sản phẩm VISTA hoàn chỉnh từ trong ra ngoài."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 3: BẢNG TIẾN ĐỘ BÀN GIAO TOÀN DIỆN (5 THÀNH VIÊN)
    # ==========================================
    add_slide_header("3", "BẢNG TIẾN ĐỘ BÀN GIAO BACKLOG CỦA TỪNG THÀNH VIÊN", "Nghiệm thu chi tiết đóng góp của 5 thành viên trong 2 tuần vừa qua")
    
    full_backlog = [
        ("Phân hệ & Thành viên", "Hạng mục bàn giao", "Trạng thái", "Kết quả chi tiết & Đóng góp kỹ thuật"),
        ("TV1 · Lê Hồng Sơn", "Admin Management & Tìm kiếm không dấu", "HOÀN THÀNH", "Hoàn thành hệ thống Admin TV1; tìm kiếm tiếng Việt không dấu (unaccented search); hàng đợi kiểm duyệt địa điểm; favorites & history."),
        ("TV2 · Trần Quang Sáng", "Bảo mật RBAC, Session & Shimmer Loading", "HOÀN THÀNH", "Hoàn thiện Spring Security RBAC, refresh token, audit logging; tối ưu UI Shimmer Skeleton toàn diện; dẹp bỏ Duplicate Navbar, fix jank loading."),
        ("TV3 · Nguyễn Văn Quý", "Cộng tác Chuyến đi & Mời Thành viên", "HOÀN THÀNH", "Đồng bộ lời mời tham gia (sync accepted invitations), xử lý 403 access; tự động chuyển quyền Leader khi thành viên rời nhóm; Mobile UI hoàn tất."),
        ("TV4 · Lê Thị Vân Ánh", "Bộ não AI Engine v3.0 & Smart Cockpit", "HOÀN THÀNH", "Anchor-first balancing (5/5 Unit test PASS); Smart Cockpit tem lịch Apple-style; Fix số 0 thừa ngân sách; Đồng bộ Ví thủ quỹ."),
        ("TV4 · Lê Thị Vân Ánh", "AI Co-Pilot Thổ Địa Sành Sỏi & Map GPS", "HOÀN THÀNH", "Few-shot persona Thổ Địa đối đáp bén; hộp '💡 Thổ địa mách nước'; Cascading sleep-in timeline; bộ chọn Ô tô/Xe máy/Đi bộ, TSP Optimizer, Google Maps."),
        ("TV5 · Nguyễn Quang Tuấn", "Bản đồ OSRM, Supabase DB & CI/CD", "HOÀN THÀNH", "Sửa toạ độ định tuyến đa chặng MapViewAdapter; cấu hình Supabase PostgreSQL migration; chuẩn hóa Spotless Java formatting; cấp quyền gradlew CI.")
    ]

    t_s3 = doc.add_table(rows=len(full_backlog), cols=4)
    t_s3.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(full_backlog):
        for c_idx, val in enumerate(row):
            cell = t_s3.cell(r_idx, c_idx)
            set_cell_margins(cell, top=50, bottom=50, left=80, right=80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(8.5)

            if r_idx == 0:
                set_cell_background(cell, "12263A")
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
            else:
                if r_idx % 2 == 1:
                    set_cell_background(cell, "F8FAFC")
                if c_idx == 2:
                    set_cell_background(cell, "DCFCE7")
                    run.font.bold = True
                    run.font.color.rgb = GREEN
                elif c_idx == 0:
                    run.font.bold = True
                    run.font.color.rgb = BLUE
                else:
                    run.font.color.rgb = NAVY

    add_speaker_notes(
        "Bảng tiến độ này minh chứng cho sự nỗ lực đồng bộ của toàn bộ nhóm. "
        "Mỗi thành viên đảm nhận một mảng chuyên sâu và tất cả đều về đích đúng hạn với chất lượng mã nguồn cao nhất, "
        "tuân thủ nghiêm ngặt chuẩn định dạng code Spotless và không tồn đọng lỗi biên dịch."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 4: CHI TIẾT PHÂN HỆ TV1 (SƠN) & TV2 (SÁNG)
    # ==========================================
    add_slide_header("4", "NÂNG CẤP PHÂN HỆ TV1 (SƠN) & TV2 (SÁNG)", "Hệ thống Quản trị Admin, Tìm kiếm Không dấu và Nền tảng Bảo mật RBAC, Shimmer Skeleton")

    t_s4 = doc.add_table(rows=1, cols=2)
    t_s4.alignment = WD_TABLE_ALIGNMENT.CENTER

    cell_tv1 = t_s4.cell(0, 0)
    set_cell_background(cell_tv1, "F8FAFC")
    set_cell_margins(cell_tv1, top=100, bottom=100, left=140, right=140)
    p_tv1 = cell_tv1.paragraphs[0]
    r_tv1h = p_tv1.add_run("🏛️ PHÂN HỆ TV1 · LÊ HỒNG SƠN\n")
    r_tv1h.font.name = "Arial"
    r_tv1h.font.size = Pt(11)
    r_tv1h.font.bold = True
    r_tv1h.font.color.rgb = BLUE
    r_tv1b = p_tv1.add_run(
        "• Hệ thống Quản trị Admin TV1 hoàn chỉnh:\n"
        "  Quản lý danh mục điểm đến, duyệt địa điểm mới từ cộng đồng thông qua hàng đợi kiểm duyệt (Moderation Queue).\n\n"
        "• Tìm kiếm Không dấu tiếng Việt (Unaccented Search):\n"
        "  Tích hợp giải thuật chuẩn hóa Unicode NFD, giúp người dùng gõ 'ha tinh', 'chua huong tich' đều ra kết quả chuẩn xác 100%.\n\n"
        "• Cách ly Dữ liệu Công khai (Public Isolation):\n"
        "  Phân tách rõ ràng giữa dữ liệu đã được duyệt và dữ liệu nháp của người dùng, nâng cao tính bảo mật."
    )
    r_tv1b.font.name = "Arial"
    r_tv1b.font.size = Pt(9)
    r_tv1b.font.color.rgb = NAVY

    cell_tv2 = t_s4.cell(0, 1)
    set_cell_background(cell_tv2, "F0F9FF")
    set_cell_margins(cell_tv2, top=100, bottom=100, left=140, right=140)
    p_tv2 = cell_tv2.paragraphs[0]
    r_tv2h = p_tv2.add_run("🛡️ PHÂN HỆ TV2 · TRẦN QUANG SÁNG\n")
    r_tv2h.font.name = "Arial"
    r_tv2h.font.size = Pt(11)
    r_tv2h.font.bold = True
    r_tv2h.font.color.rgb = BLUE
    r_tv2b = p_tv2.add_run(
        "• Củng cố Bảo mật RBAC & Vòng đời Session:\n"
        "  Hoàn thiện kiểm soát truy cập dựa trên vai trò (Owner vs Member), refresh token an toàn, chống duplicate hash mật khẩu.\n\n"
        "• Hệ thống Shimmer Skeleton Loading hiện đại:\n"
        "  Triển khai hiệu ứng GPU Shimmer thay thế cho việc giật trắng trang; tải trước dữ liệu tức thì (Instant Prefetching).\n\n"
        "• Dẹp bỏ Duplicate Navbar & Tối ưu Giao diện:\n"
        "  Chuẩn hóa 1 Navbar duy nhất toàn hệ thống, triệt tiêu hiện tượng nháy layout (zero-shift transitions) khi chuyển trang."
    )
    r_tv2b.font.name = "Arial"
    r_tv2b.font.size = Pt(9)
    r_tv2b.font.color.rgb = NAVY

    add_speaker_notes(
        "Tại slide này, chúng ta thấy rõ đóng góp cốt lõi của anh Sơn và anh Sáng. "
        "Anh Sơn đã xây dựng phân hệ quản trị và tìm kiếm địa điểm thông minh, còn anh Sáng đã thiết lập khung bảo mật "
        "vững như bàn thạch cùng trải nghiệm tải trang mượt mà bằng công nghệ Shimmer Skeleton."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 5: CHI TIẾT PHÂN HỆ TV3 (QUY) & TV5 (TUẤN)
    # ==========================================
    add_slide_header("5", "NÂNG CẤP PHÂN HỆ TV3 (QUY) & TV5 (TUẤN)", "Cộng tác Chuyến đi Nhóm, Phân quyền Leader, Bản đồ OSRM Tuyến đường & Tối ưu CI/CD")

    t_s5 = doc.add_table(rows=1, cols=2)
    t_s5.alignment = WD_TABLE_ALIGNMENT.CENTER

    cell_tv3 = t_s5.cell(0, 0)
    set_cell_background(cell_tv3, "F8FAFC")
    set_cell_margins(cell_tv3, top=100, bottom=100, left=140, right=140)
    p_tv3 = cell_tv3.paragraphs[0]
    r_tv3h = p_tv3.add_run("👥 PHÂN HỆ TV3 · NGUYỄN VĂN QUÝ\n")
    r_tv3h.font.name = "Arial"
    r_tv3h.font.size = Pt(11)
    r_tv3h.font.bold = True
    r_tv3h.font.color.rgb = BLUE
    r_tv3b = p_tv3.add_run(
        "• Đồng bộ Lời mời Tham gia Chuyến đi:\n"
        "  Liên kết động việc tạo và chấp nhận lời mời vào đúng chuyến đi thực tế, xóa bỏ dữ liệu mock; giải quyết triệt để lỗi 403 Forbidden.\n\n"
        "• Cơ chế Tự động Chuyển quyền Trưởng nhóm:\n"
        "  Khi Leader rời nhóm, hệ thống tự động bình bầu và chuyển giao quyền Trưởng nhóm cho thành viên tiếp theo một cách an toàn.\n\n"
        "• Hoàn tất Giao diện Mobile TV3:\n"
        "  Đồng bộ chi tiết chuyến đi, lịch trình, danh sách thành viên và thông báo realtime trên màn hình điện thoại di động."
    )
    r_tv3b.font.name = "Arial"
    r_tv3b.font.size = Pt(9)
    r_tv3b.font.color.rgb = NAVY

    cell_tv5 = t_s5.cell(0, 1)
    set_cell_background(cell_tv5, "F0F9FF")
    set_cell_margins(cell_tv5, top=100, bottom=100, left=140, right=140)
    p_tv5 = cell_tv5.paragraphs[0]
    r_tv5h = p_tv5.add_run("🗺️ PHÂN HỆ TV5 · NGUYỄN QUANG TUẤN\n")
    r_tv5h.font.name = "Arial"
    r_tv5h.font.size = Pt(11)
    r_tv5h.font.bold = True
    r_tv5h.font.color.rgb = BLUE
    r_tv5b = p_tv5.add_run(
        "• Hạ tầng Bản đồ Tuyến đường OSRM & Tọa độ:\n"
        "  Căn chỉnh toạ độ thực tế cho các điểm dừng đa chặng trên MapViewAdapter, tích hợp tính năng tự động nhận diện GPS gốc.\n\n"
        "• Kiểm thử Tích hợp Cơ sở Dữ liệu Supabase:\n"
        "  Khởi tạo bộ kiểm thử di chuyển dữ liệu PostgreSQL với Supabase storage fixtures, đảm bảo tương thích cloud 100%.\n\n"
        "• Tối ưu Hóa Quy trình CI/CD & Định dạng Code:\n"
        "  Cấp quyền thực thi gradlew trên GitHub Actions, sửa lỗi WebMvcTest và áp dụng chuẩn định dạng Spotless tự động."
    )
    r_tv5b.font.name = "Arial"
    r_tv5b.font.size = Pt(9)
    r_tv5b.font.color.rgb = NAVY

    add_speaker_notes(
        "Ở hai phân hệ TV3 và TV5, anh Quý đã giải quyết bài toán cốt lõi về cộng tác chuyến đi nhóm, "
        "đảm bảo việc mời bạn bè và chuyển quyền diễn ra thông suốt không gặp lỗi 403. "
        "Đồng thời, anh Tuấn đã xây dựng hạ tầng bản đồ và pipeline CI/CD tự động, giúp toàn bộ hệ thống vận hành ổn định trên đám mây."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 6: CHI TIẾT PHÂN HỆ TV4 (VÂN ÁNH) - AI PLANNER & CO-PILOT
    # ==========================================
    add_slide_header("6", "NÂNG CẤP PHÂN HỆ TV4 (VÂN ÁNH) - AI & SMART COCKPIT", "Bộ não AI v3.0, Smart Departure Cockpit, AI Co-Pilot Thổ Địa Sành Sỏi & Trạm Chỉ Đường GPS")

    t_s6 = doc.add_table(rows=1, cols=2)
    t_s6.alignment = WD_TABLE_ALIGNMENT.CENTER

    cell_tv4a = t_s6.cell(0, 0)
    set_cell_background(cell_tv4a, "F8FAFC")
    set_cell_margins(cell_tv4a, top=100, bottom=100, left=140, right=140)
    p_tv4a = cell_tv4a.paragraphs[0]
    r_tv4ah = p_tv4a.add_run("🧠 BỘ NÃO AI ENGINE V3.0 & COCKPIT\n")
    r_tv4ah.font.name = "Arial"
    r_tv4ah.font.size = Pt(11)
    r_tv4ah.font.bold = True
    r_tv4ah.font.color.rgb = BLUE
    r_tv4ab = p_tv4a.add_run(
        "• Cân bằng Điểm Đinh Đa Ngày (Anchor-First):\n"
        "  Không dồn dập các điểm lớn vào 1 ngày; tự động tránh kẹt xe OSRM 1xN; Unit test đạt 5/5 passed.\n\n"
        "• Smart Departure Cockpit (Phong cách Apple):\n"
        "  Calendar stamp T5/12, thanh trượt Segmented Capsule Bar, thẻ Midnight Slate (#0F172A) cho lộ trình khởi hành đêm.\n\n"
        "• Bộ Tùy chỉnh Ngân sách Linh hoạt & Ví Thủ Quỹ:\n"
        "  Tùy biến 5 biến số giá phòng, giá ăn; fix triệt để lỗi số 0 thừa (0500000 -> 500000); đồng bộ sang Ví Thủ Quỹ (/treasury)."
    )
    r_tv4ab.font.name = "Arial"
    r_tv4ab.font.size = Pt(9)
    r_tv4ab.font.color.rgb = NAVY

    cell_tv4b = t_s6.cell(0, 1)
    set_cell_background(cell_tv4b, "F0F9FF")
    set_cell_margins(cell_tv4b, top=100, bottom=100, left=140, right=140)
    p_tv4b = cell_tv4b.paragraphs[0]
    r_tv4bh = p_tv4b.add_run("🤖 CO-PILOT THỔ ĐỊA & TRẠM CHỈ ĐƯỜNG GPS\n")
    r_tv4bh.font.name = "Arial"
    r_tv4bh.font.size = Pt(11)
    r_tv4bh.font.bold = True
    r_tv4bh.font.color.rgb = BLUE
    r_tv4bb = p_tv4b.add_run(
        "• Huấn luyện Persona 'Thổ Địa Sành Sỏi':\n"
        "  AI hiểu tiếng lóng ('ngủ nướng xả stress', 'ăn sập chợ'); đối đáp hóm hỉnh; hộp '💡 Thổ Địa Mách Nước' kèm mẹo độc quyền.\n\n"
        "• Thuật toán Dòng chảy Thời gian (Cascading Timeline):\n"
        "  Lùi giờ xuất phát 09:30, trưa 12:00, chiều 14:30 trôi dạt mượt mà không chồng chéo.\n\n"
        "• Trạm Bản đồ GPS Tuyến đường Thực tế:\n"
        "  Chuyển đổi Ô tô/Xe máy/Đi bộ; thuật toán TSP tối ưu chặng ngắn nhất; nút 'Chỉ đường Google Maps' mở GPS dẫn đường ngay."
    )
    r_tv4bb.font.name = "Arial"
    r_tv4bb.font.size = Pt(9)
    r_tv4bb.font.color.rgb = NAVY

    add_speaker_notes(
        "Ở phân hệ TV4 do bạn Vân Ánh phụ trách, AI Planner đã có sự chuyển mình ngoạn mục: "
        "từ một thuật toán xếp lịch thô sơ trở thành một 'Thổ Địa du lịch AI' thông minh, am hiểu văn hóa bản địa, "
        "kết hợp với Smart Cockpit và trạm điều hướng GPS biến VISTA thành một cẩm nang sống cho du khách."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 7: KIỂM THỬ VÀ BẢO ĐẢM CHẤT LƯỢNG TOÀN DIỆN
    # ==========================================
    add_slide_header("7", "KIỂM THỬ VÀ CHẤT LƯỢNG HỆ THỐNG TOÀN DIỆN (QA)", "Báo cáo kiểm thử tự động trên cả 3 tầng Backend Java, Python AI và Frontend Next.js")

    qa_table = [
        ("Phân hệ / Thành phần", "Công cụ kiểm thử", "Phạm vi kiểm thử", "Kết quả đạt được"),
        ("Python AI Planning Engine", "Python Unittest (`test_ai_engine_v3.py`)", "Thuật toán Anchor-first, Anti-zigzag, OSRM Matrix, Budget", "PASS 5/5 tests (1.061s) · 100%"),
        ("Backend Java Spring Boot", "Gradle Spotless & WebMvcTest", "Chuẩn hóa format code, xác thực quyền truy cập, API Chuyến đi", "PASS Spotless Check, 0 Lint Error"),
        ("Frontend Web Next.js", "TypeScript Compiler (`tsc --noEmit`)", "Kiểm tra toàn bộ kiểu dữ liệu tĩnh trên toàn bộ 60+ pages/components", "0 Lỗi (Zero TypeScript Errors)"),
        ("Cơ sở dữ liệu PostgreSQL", "Flyway Migrations & Supabase Fixtures", "Kiểm thử schema chuyến đi, lời mời, thành viên và ví thủ quỹ", "Migration thành công 100%"),
        ("Trải nghiệm Người dùng (E2E)", "Browser Subagent Verification", "Kiểm thử giao diện Cockpit, Co-Pilot Thổ Địa và Bản đồ GPS", "Hiển thị sắc nét, 60fps, 0 lỗi console"),
        ("Lỗi nghiêm trọng (Blockers)", "Issue Tracking Sprint 3", "Toàn bộ các luồng nghiệp vụ của cả 5 phân hệ", "0 Lỗi nghiêm trọng (Zero Blockers)")
    ]

    t_qa = doc.add_table(rows=len(qa_table), cols=4)
    t_qa.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(qa_table):
        for c_idx, val in enumerate(row):
            cell = t_qa.cell(r_idx, c_idx)
            set_cell_margins(cell, top=50, bottom=50, left=80, right=80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(8.5)

            if r_idx == 0:
                set_cell_background(cell, "12263A")
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
            else:
                if r_idx % 2 == 1:
                    set_cell_background(cell, "F8FAFC")
                if c_idx == 3 and ("PASS" in val or "0 Lỗi" in val or "100%" in val):
                    run.font.bold = True
                    run.font.color.rgb = GREEN
                elif c_idx == 0:
                    run.font.bold = True
                    run.font.color.rgb = NAVY
                else:
                    run.font.color.rgb = NAVY

    add_speaker_notes(
        "Về chất lượng kỹ thuật, Sprint 3 đạt độ tin cậy rất cao: "
        "cả ba tầng công nghệ Java Spring Boot, Python AI và Next.js TypeScript đều đạt trạng thái kiểm thử xanh tuyệt đối. "
        "Không có bất kỳ lỗi nghiêm trọng nào gây nghẽn tiến độ của dự án."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 8: VƯỚNG MẮC PHÁT SINH VÀ CÁCH GIẢI QUYẾT CỦA CẢ NHÓM
    # ==========================================
    add_slide_header("8", "VƯỚNG MẮC PHÁT SINH VÀ GIẢI PHÁP HỢP TÁC NHÓM", "Cách 5 thành viên phối hợp giải quyết các xung đột kỹ thuật phức tạp trong 2 tuần qua")

    team_impediments = [
        ("Vướng mắc phát sinh trong Sprint", "Ảnh hưởng đến hệ thống", "Hành động giải quyết phối hợp của Cả Nhóm"),
        ("1. Xung đột Git Merge 14 files từ origin/dev", "Xung đột giữa TV3 (Cộng tác) và TV4 (Planner/Budget) có nguy cơ làm mất code của nhau.", "Họp nhóm nhanh, áp dụng chiến lược --ours kết hợp tinh chỉnh thủ công từng interface TypeScript (RouteLeg) và bảo toàn 100% tính năng của cả hai."),
        ("2. Server Python bị treo khi gọi đồng thời Gemini + OSRM", "Người dùng thao tác dồn dập khiến server đơn luồng bị khóa socket kết nối.", "Nâng cấp kiến trúc lên ThreadingHTTPServer đa luồng, hỗ trợ xử lý song song các tác vụ AI và định tuyến không nghẽn."),
        ("3. Lỗi số 0 đứng trước khi sửa ngân sách (0500000)", "Dự toán chi phí hiển thị sai số tiền làm người dùng bối rối.", "Triển khai cơ chế auto-select bôi đen toàn bộ số khi click và regex làm sạch số 0 thừa tự động."),
        ("4. Lỗi 403 Forbidden khi thành viên mới chấp nhận lời mời", "Người được mời không xem được chuyến đi do phân quyền chưa đồng bộ.", "Đồng bộ bảng trip_members ngay khi chấp nhận lời mời và cập nhật quyền truy cập tức thì."),
        ("5. Lỗi Next.js Hydration Mismatch trên trang Planner", "Cảnh báo đỏ trên console do sai lệch giờ giữa máy chủ SSR và Client.", "Bổ sung cờ isHydrated để trì hoãn render phần tử phụ thuộc thời gian thực cho đến khi gắn kết trình duyệt.")
    ]

    t_timp = doc.add_table(rows=len(team_impediments), cols=3)
    t_timp.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(team_impediments):
        for c_idx, val in enumerate(row):
            cell = t_timp.cell(r_idx, c_idx)
            set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(8.5)

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
        "Slide này thể hiện tinh thần đồng đội tuyệt vời của nhóm VISTA: "
        "khi xảy ra xung đột mã nguồn lớn giữa module TV3 và TV4, cả nhóm đã phối hợp rà soát từng dòng code để không ai bị mất tính năng. "
        "Các bài toán về hạ tầng đa luồng và lỗi phân quyền đều được giải quyết dứt điểm tận gốc rễ."
    )
    doc.add_page_break()

    # ==========================================
    # SLIDE 9: KẾ HOẠCH VÀ PHÂN CÔNG SPRINT 4 (5 THÀNH VIÊN)
    # ==========================================
    add_slide_header("9", "KẾ HOẠCH VÀ PHÂN CÔNG NHIỆM VỤ SPRINT 4", "Định hướng phát triển tiếp theo và phân công trách nhiệm rõ ràng cho 5 thành viên")

    t_s9 = doc.add_table(rows=1, cols=2)
    t_s9.alignment = WD_TABLE_ALIGNMENT.CENTER

    cell_s9a = t_s9.cell(0, 0)
    set_cell_background(cell_s9a, "F0FDF4")
    set_cell_margins(cell_s9a, top=100, bottom=100, left=140, right=140)
    p_s9a = cell_s9a.paragraphs[0]
    r_s9ah = p_s9a.add_run("📌 PHÂN CÔNG NHIỆM VỤ SPRINT 4 (5 THÀNH VIÊN)\n\n")
    r_s9ah.font.name = "Arial"
    r_s9ah.font.size = Pt(11.5)
    r_s9ah.font.bold = True
    r_s9ah.font.color.rgb = GREEN
    r_s9ab = p_s9a.add_run(
        "• TV1 (Sơn): Mở rộng hệ thống đánh giá địa điểm, bộ lọc nâng cao theo thời tiết và phân quyền kiểm duyệt nâng cao.\n\n"
        "• TV2 (Sang): Triển khai xác thực sinh trắc học / OAuth2 nâng cao, bảo mật mã QR và audit trail hoàn chỉnh.\n\n"
        "• TV3 (Quy): Hoàn thiện chia sẻ lịch trình qua QR Code, link cộng tác nhóm thời gian thực và chat thông báo trong chuyến đi.\n\n"
        "• TV4 (Vân Ánh): Tích hợp Voice AI Co-Pilot (giọng nói tiếng Việt) và Thuật toán tối giản nợ Ví Thủ Quỹ (Debt Simplification).\n\n"
        "• TV5 (Tuấn): Triển khai Redis Cache cho OSRM Matrix, đóng gói Docker Compose và thiết lập CI/CD tự động lên Cloud."
    )
    r_s9ab.font.name = "Arial"
    r_s9ab.font.size = Pt(9)
    r_s9ab.font.color.rgb = NAVY

    cell_s9b = t_s9.cell(0, 1)
    set_cell_background(cell_s9b, "FFFBEB")
    set_cell_margins(cell_s9b, top=100, bottom=100, left=140, right=140)
    p_s9b = cell_s9b.paragraphs[0]
    r_s9bh = p_s9b.add_run("💡 ĐỀ XUẤT CẦN Ý KIẾN HỘI ĐỒNG (PROPOSED)\n\n")
    r_s9bh.font.name = "Arial"
    r_s9bh.font.size = Pt(11.5)
    r_s9bh.font.bold = True
    r_s9bh.font.color.rgb = AMBER
    r_s9bb = p_s9b.add_run(
        "1. Xuất Cẩm Nang Du Lịch Infographic & PDF:\n"
        "   Xuất toàn bộ lịch trình, ảnh check-in và dự toán chi phí ra 1 file PDF/ảnh dài như tạp chí du lịch để in ấn hoặc đăng story mạng xã hội.\n\n"
        "2. Cổng Thanh Toán Đặt Cọc Trực Tiếp (Payment Gateway):\n"
        "   Tích hợp thanh toán cọc phòng khách sạn và vé tham quan trực tiếp từ bảng Custom Budget qua VietQR / cổng thanh toán.\n\n"
        "3. Kế hoạch Thử nghiệm Beta Người dùng Thật (User Testing):\n"
        "   Đề xuất mở đợt thử nghiệm cho 50 sinh viên trải nghiệm thực tế chuyến đi Đà Nẵng / Hà Tĩnh để thu thập phản hồi UX."
    )
    r_s9bb.font.name = "Arial"
    r_s9bb.font.size = Pt(9)
    r_s9bb.font.color.rgb = NAVY

    add_speaker_notes(
        "Bước sang Sprint 4, cả 5 thành viên đã có kế hoạch phân công cụ thể, sẵn sàng đưa sản phẩm từ giai đoạn hoàn thiện tính năng "
        "sang giai đoạn cộng tác nhóm và trải nghiệm thực tế với người dùng. "
        "Nhóm rất mong nhận được những góp ý quý báu của quý thầy cô và Hội đồng. Xin chân thành cảm ơn!"
    )

    workspace_dir = os.path.abspath(".")
    docx_path = os.path.join(workspace_dir, "SLIDE_SPRINT_3_REVIEW_VISTA.docx")
    doc.save(docx_path)
    print(f"Generated Comprehensive Landscape Slides DOCX successfully: {docx_path}")

if __name__ == "__main__":
    create_comprehensive_slides()

