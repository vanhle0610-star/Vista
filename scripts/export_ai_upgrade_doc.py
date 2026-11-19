import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
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

def create_full_ai_report():
    doc = Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

    PRIMARY = RGBColor(2, 132, 199)      # #0284C7 Sky Blue
    DARK_TEXT = RGBColor(15, 23, 42)     # #0F172A Slate Dark
    MUTED_TEXT = RGBColor(100, 116, 139) # #64748B Slate Muted
    SUCCESS = RGBColor(16, 185, 129)     # #10B981 Green
    ACCENT = RGBColor(217, 119, 6)       # #D97706 Amber
    PURPLE = RGBColor(124, 58, 237)      # #7C3AED Violet

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("BÁO CÁO TOÀN DIỆN VỀ BỘ NÃO TRÍ TUỆ NHÂN TẠO (AI ENGINE V3)\n")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(19)
    r_title.font.bold = True
    r_title.font.color.rgb = PRIMARY

    r_sub = p_title.add_run("DỰ ÁN NỀN TẢNG DU LỊCH THÔNG MINH VISTA (SMART TRAVEL PLATFORM)\n")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(12)
    r_sub.font.bold = True
    r_sub.font.color.rgb = DARK_TEXT

    r_note = p_title.add_run("(Phân tích chi tiết các Thuật toán cốt lõi, ví dụ thực tế và giải pháp kỹ thuật đã cải thiện)")
    r_note.font.name = "Arial"
    r_note.font.size = Pt(10)
    r_note.font.italic = True
    r_note.font.color.rgb = MUTED_TEXT

    # Callout Box
    callout = doc.add_table(rows=1, cols=1)
    callout.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_cell = callout.cell(0, 0)
    set_cell_background(c_cell, "F0F9FF")
    set_cell_margins(c_cell, top=140, bottom=140, left=180, right=180)

    p_c = c_cell.paragraphs[0]
    p_c.paragraph_format.line_spacing = 1.3
    meta_runs = [
        ("Mục tiêu tài liệu: ", True, PRIMARY),
        ("Cung cấp bức tranh toàn cảnh về cách AI VISTA tư duy và giải quyết bài toán lịch trình du lịch. Diễn giải mạch lạc nguyên lý hoạt động của các thuật toán toán học (Clustering, TSP Heuristic, Time-Window Scheduling, Knapsack) kết hợp cùng mô hình AI thế hệ mới (Gemini 2.5).\n", False, DARK_TEXT),
        ("Phạm vi kỹ thuật: ", True, PRIMARY),
        ("Toàn bộ thư mục ai-service/ (gồm engine phân cụm, định tuyến, timeline, scoring, budget và máy chủ đa luồng).", False, DARK_TEXT)
    ]
    for text, bold, color in meta_runs:
        r = p_c.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.bold = bold
        r.font.color.rgb = color

    doc.add_paragraph()

    # Headings
    def add_h1(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
        r = h.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(13.5)
        r.font.bold = True
        r.font.color.rgb = PRIMARY
        return h

    def add_h2(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(4)
        r = h.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = DARK_TEXT
        return h

    def add_algo_badge(title, algo_name, category):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(11)
        h.paragraph_format.space_after = Pt(4)
        r1 = h.add_run(title + "\n")
        r1.font.name = "Arial"
        r1.font.size = Pt(11.5)
        r1.font.bold = True
        r1.font.color.rgb = DARK_TEXT

        r2 = h.add_run(f"• Tên thuật toán học thuật: {algo_name}\n")
        r2.font.name = "Arial"
        r2.font.size = Pt(9.5)
        r2.font.bold = True
        r2.font.color.rgb = PURPLE

        r3 = h.add_run(f"• Nhóm bài toán: {category}")
        r3.font.name = "Arial"
        r3.font.size = Pt(9.5)
        r3.font.italic = True
        r3.font.color.rgb = MUTED_TEXT

    # Section 1: Overview comparison
    add_h1("I. TỔNG QUAN: BẢNG SO SÁNH TRƯỚC VÀ SAU KHI NÂNG CẤP")
    
    table_data = [
        ["Tiêu chí so sánh", "Thuật toán AI cũ (Trước nâng cấp)", "Bộ não AI v3 mới (Sau nâng cấp)"],
        ["1. Phân bổ điểm lớn", "Nhét hết các điểm nổi tiếng vào Ngày 1 làm du khách kiệt sức.", "Chia đều Anchor-First: Mỗi ngày 1 điểm đinh lớn, vừa sức và hấp dẫn."],
        ["2. Đường đi (Routing)", "Dễ bị đi lòng vòng con thoi (Bắc -> Nam -> Bắc lại).", "Chống đi zigzag (Anti-Zigzag): Đi theo 1 cung tròn khép kín, tiết kiệm xe."],
        ["3. Giờ di chuyển", "Tính xe chạy đều đều 40km/h như đường trống.", "Tính giờ kẹt xe cao điểm Việt Nam (x1.3 thời gian lúc 7h30 sáng & 17h chiều)."],
        ["4. Thời tiết & Buổi tối", "Mưa bão vẫn xếp đi biển, leo núi; 20h đêm vẫn xếp vào bảo tàng.", "Trời mưa tự đổi sang bảo tàng/cafe có mái; tối ưu tiên phố đi bộ/chợ đêm."],
        ["5. Số lượng bữa ăn", "Đôi khi xếp 2 quán ăn sát giờ nhau (11h ăn bánh xèo, 12h ăn hải sản).", "Chống trùng bữa (Anti-Double-Lunch): Đúng 1 bữa trưa và 1 bữa tối chính."],
        ["6. Khi khách xóa điểm", "Bấm 'Sửa với AI', AI lại nhặt đúng điểm vừa bị xóa.", "Ghi nhớ điểm xóa (Feedback Loop), vĩnh viễn không bao giờ gợi ý lại."],
        ["7. Đọc hiểu mong muốn", "Chỉ bấm nút lọc có sẵn, không hiểu chữ gõ tay.", "Gemini 2.5 đọc hiểu tiếng Việt: 'Đi cùng người già', 'thích ăn vặt'."],
        ["8. Máy chủ & Hiệu năng", "Server đơn luồng, 1 người tạo lịch là người khác bị đơ/treo.", "Server đa luồng (Threading), nhiều người cùng tạo lịch chỉ mất <1.5 giây."]
    ]

    t_comp = doc.add_table(rows=len(table_data), cols=3)
    t_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(table_data):
        for c_idx, val in enumerate(row):
            cell = t_comp.cell(r_idx, c_idx)
            set_cell_margins(cell, top=70, bottom=70, left=90, right=90)
            cell_p = cell.paragraphs[0]
            cell_p.paragraph_format.space_before = Pt(2)
            cell_p.paragraph_format.space_after = Pt(2)
            run = cell_p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(9)
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
                elif c_idx == 2:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(3, 105, 161)

    doc.add_paragraph()

    # Section 2: Deep dive into Algorithms
    add_h1("II. GIẢI THÍCH CHI TIẾT CÁC THUẬT TOÁN CỐT LÕI (ALGORITHM DEEP-DIVE)")
    p_deep_intro = doc.add_paragraph()
    r_di = p_deep_intro.add_run(
        "Dưới đây là bản giải trình chuyên sâu về các thuật toán khoa học máy tính được đội ngũ AI áp dụng trong hệ thống VISTA. Mỗi thuật toán được giải thích theo 3 phần: Bản chất toán học, Cách áp dụng thực tế và Giá trị mang lại cho du khách."
    )
    r_di.font.name = "Arial"
    r_di.font.size = Pt(10)
    r_di.font.color.rgb = DARK_TEXT

    # Algo 1: Clustering & Outlier Detection
    add_algo_badge(
        "1. Thuật toán Phân cụm Địa lý Ràng buộc & Cân bằng Điểm Đinh",
        "Constrained Geographic K-Means & Anchor-First Balancing",
        "Phân cụm dữ liệu không gian (Spatial Clustering) & Lọc ngoại lai (3-Sigma Rule)"
    )
    p_a1 = doc.add_paragraph()
    p_a1.paragraph_format.line_spacing = 1.25
    r_a1 = p_a1.add_run(
        "• Bản chất thuật toán:\n"
        "  - Thuật toán nhận tọa độ GPS (kinh độ, vĩ độ) của hàng trăm địa điểm du lịch tại tỉnh/thành. Đầu tiên, hàm _filter_coordinate_outliers áp dụng quy tắc 3-Sigma (3 nhân độ lệch chuẩn) để loại bỏ các điểm có tọa độ bị lỗi hoặc nằm quá xa trung tâm du lịch (ví dụ một điểm cách xa 120km trong chuyến đi 2 ngày).\n"
        "  - Tiếp theo, hàm balance_anchors_across_days phân loại các điểm đến thành hai nhóm: Nhóm Anchor (Điểm đinh lớn: rating >= 4.7, review >= 1000 như Bà Nà Hills, Fansipan) và Nhóm Vệ tinh (quán ăn, cafe, bảo tàng nhỏ). Thay vì phân cụm ngẫu nhiên, AI áp dụng thuật toán chia đều có ràng buộc: Rải N điểm đinh vào N ngày sao cho khoảng cách giữa các điểm trong ngày là nhỏ nhất.\n"
        "• Ví dụ thực tế:\n"
        "  Đi Phú Quốc 3 ngày, nếu gom theo K-Means cũ, VinWonders, Safari và Grand World bị gom chung vào Ngày 1 vì chúng cùng nằm ở Bắc Đảo. Ngày 1 du khách phải đi bộ 15km đến kiệt sức. Với thuật toán Anchor-First mới, AI chia ra: Ngày 1 chơi Grand World và Bún quậy, Ngày 2 đi Safari và Chợ đêm, Ngày 3 khám phá Nam đảo cáp treo Hòn Thơm. Chuyến đi cực kỳ vừa sức và hợp lý!"
    )
    r_a1.font.name = "Arial"
    r_a1.font.size = Pt(9.5)
    r_a1.font.color.rgb = DARK_TEXT

    # Algo 2: TSP & Anti-Zigzag Routing
    add_algo_badge(
        "2. Thuật toán Tối ưu Lộ trình Di chuyển & Triệt tiêu Đi Lòng Vòng",
        "Traveling Salesperson Problem (TSP) Heuristic, 2-Opt Local Search & Turn Angle Penalty",
        "Quy hoạch tuyến đường (Route Optimization) & Bài toán Người Giao Hàng (TSP)"
    )
    p_a2 = doc.add_paragraph()
    p_a2.paragraph_format.line_spacing = 1.25
    r_a2 = p_a2.add_run(
        "• Bản chất thuật toán:\n"
        "  - Bài toán sắp xếp thứ tự các điểm trong ngày là một dạng bài toán NP-hard kinh điển (TSP). Nếu duyệt vét cạn (brute-force) sẽ tốn rất nhiều thời gian tính toán.\n"
        "  - AI VISTA áp dụng thuật toán Heuristic tìm kiếm cục bộ (2-Opt Local Search) kết hợp hàm phạt đa tiêu chí score_simulated_timeline. Trong đó, thuật toán đo lường góc tạo bởi vector di chuyển giữa 3 điểm liên tiếp (A -> B -> C). Nếu góc quay đầu lớn hơn 120 độ (tức là đi tới điểm B rồi quay ngược lại hướng cũ về phía gần A) hoặc quãng đường chèn điểm làm tổng thời gian tăng vọt trên 30%, thuật toán sẽ phạt nặng (-450 điểm) để hoán đổi thứ tự.\n"
        "• Ví dụ thực tế:\n"
        "  Tại Hà Nội: Nếu buổi sáng bạn ở Hồ Gươm, trưa bạn đi ăn phở gần Hồ Tây, chiều đi Lăng Bác. AI cũ có thể xếp bạn: Hồ Gươm -> Lăng Bác -> Hồ Tây ăn trưa -> rồi lại quay về gần Lăng Bác đi Cafe. Thuật toán Anti-Zigzag mới ép lộ trình thành một cung thẳng mượt mà: Hồ Gươm -> Lăng Bác -> Hồ Tây ăn trưa & cafe ven hồ, tiết kiệm 45 phút ngồi xe máy/taxi."
    )
    r_a2.font.name = "Arial"
    r_a2.font.size = Pt(9.5)
    r_a2.font.color.rgb = DARK_TEXT

    # Algo 3: Time-Window Scheduling
    add_algo_badge(
        "3. Thuật toán Lập lịch Khung thời gian Khả thi",
        "Time-Window Constrained Interval Scheduling & Dwell-Time Allocation",
        "Quy hoạch thời gian thực (Temporal Planning & Constraint Satisfaction)"
    )
    p_a3 = doc.add_paragraph()
    p_a3.paragraph_format.line_spacing = 1.25
    r_a3 = p_a3.add_run(
        "• Bản chất thuật toán:\n"
        "  - Hàm find_feasible_visit_window chuyển đổi thời gian sang số phút nguyên từ 0 đến 1440 phút trong ngày. Mỗi địa điểm có một cửa sổ mở cửa [T_open, T_close] cụ thể theo từng thứ trong tuần.\n"
        "  - Thuật toán giải bài toán thỏa mãn ràng buộc (CSP): Thời gian xuất phát + Thời gian di chuyển (Transit) + Thời gian tham quan ước tính (Dwell time từ 45 - 180 phút) + Thời gian đệm nghỉ (Buffer 15 phút) phải nằm trọn vẹn trong khung giờ mở cửa. Nếu đến sớm hơn giờ mở cửa, thuật toán phạt điểm chờ (Wait Penalty); nếu đến trễ sau giờ đóng cửa, điểm đó lập tức bị loại bỏ khỏi slot.\n"
        "• Ví dụ thực tế:\n"
        "  Bảo tàng Chứng tích Chiến tranh đóng cửa lúc 17:30. AI sẽ không bao giờ xếp bạn đến lúc 17:15 để chỉ kịp ngó cửa, mà tự động tính toán để bạn có mặt từ 15:00 và dành trọn vẹn 2 tiếng tham quan trước khi chuyển sang điểm ăn tối lúc 18:00."
    )
    r_a3.font.name = "Arial"
    r_a3.font.size = Pt(9.5)
    r_a3.font.color.rgb = DARK_TEXT

    # Algo 4: Diversity & De-duplication
    add_algo_badge(
        "4. Thuật toán Đa dạng hóa Trải nghiệm & Khử trùng lặp Khái niệm",
        "Semantic Concept De-duplication & Categorical Diversity Enforcement",
        "Khử trùng lặp dữ liệu (Data De-duplication) & Đa dạng hóa danh mục"
    )
    p_a4 = doc.add_paragraph()
    p_a4.paragraph_format.line_spacing = 1.25
    r_a4 = p_a4.add_run(
        "• Bản chất thuật toán:\n"
        "  - Người dùng đi du lịch rất dễ bị nhàm chán nếu lịch trình bị lặp lại cùng một loại hình trải nghiệm. Hàm _share_same_core_concept và STRICT_DIVERSITY_SUBTYPES thiết lập danh sách cấm lặp nghiêm ngặt: CAFE, TEMPLE, BEACH, THEME_PARK, MOUNTAIN.\n"
        "  - Nếu một ngày đã có 1 quán cafe, việc xếp thêm quán cafe thứ 2 sẽ bị trừ 350 điểm; quán thứ 3 bị trừ 700 điểm. Nếu hai điểm liên tiếp cùng thuộc một chuỗi thương hiệu (như cùng là Highlands Coffee hoặc VinWonders), thuật toán trừ ngay 420 điểm để đảm bảo tính bản địa phong phú.\n"
        "• Ví dụ thực tế:\n"
        "  Tại Đà Lạt: Thành phố có hàng nghìn quán cafe đẹp. AI cũ có thể xếp bạn sáng đi cafe săn mây, trưa đi cafe ngắm thung lũng, chiều lại đi cafe nhà gỗ (khách cả ngày chỉ uống nước!). AI mới giới hạn nghiêm ngặt: 1 buổi cafe chill + 1 điểm văn hóa/thiên nhiên + 1 điểm ẩm thực đặc sản + 1 điểm dạo chợ đêm."
    )
    r_a4.font.name = "Arial"
    r_a4.font.size = Pt(9.5)
    r_a4.font.color.rgb = DARK_TEXT

    # Algo 5: Multi-Criteria Scoring (MCDA)
    add_algo_badge(
        "5. Thuật toán Chấm điểm Đa tiêu chí Thích ứng Thời tiết",
        "Multi-Criteria Decision Analysis (MCDA) & Dynamic Weather-Weight Matrix",
        "Ra quyết định đa mục tiêu (Multi-Objective Optimization)"
    )
    p_a5 = doc.add_paragraph()
    p_a5.paragraph_format.line_spacing = 1.25
    r_a5 = p_a5.add_run(
        "• Bản chất thuật toán:\n"
        "  - Hàm DestinationScoringEngine.calculate_score tính điểm tổng hợp cho mỗi điểm đến dựa trên công thức hàm mục tiêu trọng số:\n"
        "    Score = Base (50) + Slot_Fit (±35) + Preference_Bonus (±40) + Curated_Bonus (+42) - Weather_Penalty (30) - Outlier_Penalty\n"
        "  - Hệ số thời tiết (Weather Adaptive Multiplier): Kết nối dịch vụ thời tiết theo thời gian thực (Live Weather API) hoặc dữ liệu mùa lịch sử. Nếu có cảnh báo mưa dông, thuộc tính indoor_outdoor == 'OUTDOOR' sẽ lập tức bị trừ 30 điểm, trong khi các điểm trong nhà (INDOOR) được cộng điểm ưu tiên.\n"
        "• Ví dụ thực tế:\n"
        "  Hôm bạn đến Sapa dự báo có mưa phùn 20°C: Thay vì đẩy bạn đi leo đỉnh Fansipan trong sương mù gió buốt, AI tự động gợi ý bạn trải nghiệm tắm lá thuốc người Dao đỏ tại bản Tả Phìn, thưởng thức lẩu cá tầm nóng hổi và ngồi cafe ngắm thung lũng Mường Hoa trong nhà kính."
    )
    r_a5.font.name = "Arial"
    r_a5.font.size = Pt(9.5)
    r_a5.font.color.rgb = DARK_TEXT

    # Algo 6: Knapsack Problem for Budget
    add_algo_badge(
        "6. Thuật toán Tối ưu Hóa Ngân sách theo Trần Chi Phí",
        "Greedy Knapsack Problem Heuristic with Quality Retention",
        "Bài toán Cái Balo (Knapsack Problem) & Tối ưu hóa tổ hợp"
    )
    p_a6 = doc.add_paragraph()
    p_a6.paragraph_format.line_spacing = 1.25
    r_a6 = p_a6.add_run(
        "• Bản chất thuật toán:\n"
        "  - Trong file budget.py, hàm optimize_for_budget_ceiling giải quyết bài toán: Người dùng chọn gói Tiết kiệm (Economy) với trần ngân sách cố định (Budget Ceiling). Làm thế nào để tổng chi phí không vượt quá trần nhưng chất lượng chuyến đi vẫn giữ ở mức cao nhất?\n"
        "  - Thuật toán sắp xếp các điểm tham quan theo tỷ số: Value_Score / Ticket_Cost. Các điểm có vé vào cổng đắt đỏ nhưng giá trị trải nghiệm trùng lặp sẽ được thay thế tham lam (Greedy Swap) bằng các điểm đến miễn phí (vé 0đ) hoặc vé rẻ mang đậm bản sắc địa phương.\n"
        "• Ví dụ thực tế:\n"
        "  Với gói Tiết kiệm tại Nha Trang: Thay vì chọn tour cano cao cấp 1.200.000đ/người, AI thông minh chọn trải nghiệm ngắm biển Bãi Dài (miễn phí), tắm bùn khoáng I-Resort vé phổ thông và thưởng thức nem nướng Đặng Văn Quyên 70.000đ/phần, giúp cả đoàn tiết kiệm 50% chi phí mà vẫn ăn ngon chơi vui."
    )
    r_a6.font.name = "Arial"
    r_a6.font.size = Pt(9.5)
    r_a6.font.color.rgb = DARK_TEXT

    # Algo 7: LLM Semantic Re-Ranking (Gemini 2.5)
    add_algo_badge(
        "7. Mô hình Xếp hạng Ngữ nghĩa AI bằng Ngôn ngữ Lớn",
        "Large Language Model Zero-Shot Semantic Re-Ranking (Google Gemini 2.5)",
        "Xử lý ngôn ngữ tự nhiên (NLP) & Trí tuệ nhân tạo tạo sinh (GenAI)"
    )
    p_a7 = doc.add_paragraph()
    p_a7.paragraph_format.line_spacing = 1.25
    r_a7 = p_a7.add_run(
        "• Bản chất thuật toán:\n"
        "  - Các thuật toán số học truyền thống không thể hiểu được các câu viết tự do bằng tiếng Việt có sắc thái văn hóa như 'ăn sập chợ', 'quán chill ngắm hoàng hôn', 'nhà có trẻ nhỏ hiếu động'.\n"
        "  - Hàm _semantic_rerank_candidates đóng vai trò là tầng Re-ranker (xếp hạng lại) tinh chỉnh: Trích xuất danh sách top 20 điểm ứng viên từ thuật toán heuristic, chuyển hóa yêu cầu của người dùng thành Prompt có cấu trúc gửi tới Gemini 2.5 Flash. Mô hình suy luận và trả về điểm khớp ngữ nghĩa (Semantic Fit Score: 0.0 -> 1.0) để cộng dồn vào bảng xếp hạng cuối cùng.\n"
        "  - Cơ chế Timeout Guard & Key Pool: Đảm bảo thời gian gọi Gemini được khống chế nghiêm ngặt (<1.5 giây). Nếu API gặp lỗi hoặc mạng chập chờn, hệ thống tự động fallback về thuật toán heuristic toán học ngay lập tức, đảm bảo người dùng không bao giờ gặp lỗi gián đoạn."
    )
    r_a7.font.name = "Arial"
    r_a7.font.size = Pt(9.5)
    r_a7.font.color.rgb = DARK_TEXT

    # Algo 8: AI Co-Pilot Local Insider Connoisseur & Cascading Timeline
    add_algo_badge(
        "8. Trợ Lý AI Co-Pilot 'Thổ Địa Sành Sỏi' & Thuật Toán Dòng Chảy Thời Gian (Cascading Timeline)",
        "Conversational In-Context Prompt Training, Local Knowledge Engine & Cascading Timeline Shift",
        "Trí tuệ nhân tạo đàm thoại (Conversational AI), Đọc hiểu tiếng lóng & Tối ưu thời gian biểu"
    )
    p_a8 = doc.add_paragraph()
    p_a8.paragraph_format.line_spacing = 1.25
    r_a8 = p_a8.add_run(
        "• Bản chất thuật toán & Nâng cấp trí tuệ mới:\n"
        "  - Huấn luyện Persona Thổ Địa Bản Xứ (Few-Shot In-Context Learning): Cung cấp cho Gemini prompt huấn luyện nhập vai chuyên gia bản địa sành sỏi, am hiểu ngóc ngách ẩm thực, giờ đẹp ngắm cảnh và né bẫy chặt chém. AI không trả lời bằng văn mẫu khô khan mà đối đáp hóm hỉnh, ấm áp và có gout ẩm thực riêng.\n"
        "  - Cấu trúc phản hồi 4 tầng độc quyền: (1) Lời thoại đối đáp duyên dáng; (2) Hộp '💡 THỔ ĐỊA MÁCH NƯỚC' chứa mẹo thực chiến (cách chọn mực nhảy Vũng Áng bơi tại bể, giờ vàng đi cáp treo Chùa Hương Tích tránh nắng trưa, giờ ngắm hoàng hôn Biển Thiên Cầm 17:15); (3) Dự đoán nhu cầu kế tiếp; (4) Thẻ trải nghiệm tương tác kèm nút '+ Thêm vào Ngày X'.\n"
        "  - Thuật toán Dòng chảy Thời gian (Cascading Timeline): Khi người dùng yêu cầu 'ngủ nướng Ngày 2', AI tự động dời mốc xuất phát sang 09:30, bữa trưa sang 12:00, buổi chiều 14:30. Toàn bộ các chặng tiếp theo tự động trôi dạt (cascade) mượt mà mà không làm chồng chéo giờ mở cửa hay hủy hoại lịch trình chung."
    )
    r_a8.font.name = "Arial"
    r_a8.font.size = Pt(9.5)
    r_a8.font.color.rgb = DARK_TEXT

    # Algo 9: Shortest Path TSP Optimizer & OSRM Multi-Modal GPS
    add_algo_badge(
        "9. Thuật Toán Tối Ưu Hóa Cung Đường Đi Ngắn Nhất & Trạm Chỉ Đường GPS Đa Phương Tiện",
        "Greedy Nearest Neighbor TSP Route Optimizer & OSRM Multi-Stop GPS Navigation",
        "Lý thuyết Đồ thị, Bài toán Người bán hàng (TSP) & Bản đồ số OSRM"
    )
    p_a9 = doc.add_paragraph()
    p_a9.paragraph_format.line_spacing = 1.25
    r_a9 = p_a9.add_run(
        "• Bản chất thuật toán & Nâng cấp bản đồ mới:\n"
        "  - Thuật toán Tối ưu Cung đường TSP (Nearest Neighbor Heuristic): Khi du khách tùy chọn đổi điểm ngẫu hứng, các điểm dừng dễ bị phân tán ngược xuôi gây tốn xăng và thời gian. Nút '⚡ Tối ưu cung đường ngắn nhất' tự động giữ nguyên điểm xuất phát đầu ngày, tính toán ma trận khoảng cách hình học và sắp xếp các điểm tiếp theo theo vòng cung tối ưu ngắn nhất, triệt tiêu hoàn toàn hiện tượng chạy xe zig-zag hay quay đầu.\n"
        "  - Bộ chuyển đổi Phương tiện Đa dạng (Travel Mode Switcher): Hỗ trợ chuyển đổi giữa Ô tô (35-45 km/h), Xe máy (32 km/h - đặc thù du lịch Việt Nam linh hoạt ngõ phố) và Đi bộ (4.5 km/h). Toàn bộ cự ly và thời gian di chuyển giữa các chặng tự động tính toán lại tức thì.\n"
        "  - Trạm Điều Hướng Deeplink Google Maps (Multi-Stop Turn-by-Turn GPS): Nút 'Chỉ đường Google Maps' tự động tổng hợp tọa độ toàn bộ các điểm dừng trong ngày thành một lộ trình hoàn chỉnh (Origin -> Waypoints -> Destination) với đúng phương tiện đã chọn (travelmode=two-wheeler hoặc driving), cho phép du khách bấm 1 click là mở ngay ứng dụng dẫn đường GPS bằng giọng nói trên điện thoại."
    )
    r_a9.font.name = "Arial"
    r_a9.font.size = Pt(9.5)
    r_a9.font.color.rgb = DARK_TEXT

    # Section 3: Source code mapping table
    add_h1("III. BẢNG TRA CỨU FILE MÃ NGUỒN VÀ THUẬT TOÁN TƯƠNG ỨNG")
    
    file_map = [
        ["File mã nguồn", "Thư mục", "Thuật toán & Tính năng triển khai trong code"],
        ["clustering.py", "ai-service/engine/", "Constrained K-Means, 3-Sigma Outlier Filter, Anchor-First Balancing."],
        ["routing.py", "ai-service/engine/", "TSP 2-Opt Heuristic, Anti-Zigzag Turn Penalty, Concept Diversity."],
        ["timeline.py", "ai-service/engine/", "Time-Window Feasible Interval Scheduling, OSRM Traffic Multiplier."],
        ["replanner.py", "ai-service/engine/", "AI Co-Pilot Thổ Địa Sành Sỏi, Few-Shot In-Context Training, Cascading Timeline, Local Secrets."],
        ["geo_calculator.py", "ai-service/services/", "OSRM Matrix Table 1xN Pre-warming, Haversine Great-Circle Distance."],
        ["scoring.py", "ai-service/engine/", "Multi-Criteria Decision Analysis (MCDA), Weather Adaptation Scoring."],
        ["budget.py", "ai-service/engine/", "Greedy Knapsack Ceiling Optimizer, Multi-tier Scaled Budgeting."],
        ["gemini_client.py", "ai-service/services/", "LLM Zero-Shot Semantic Re-ranking, Key Pool Failover, Timeout Guard."],
        ["page.tsx", "web/src/app/planner/", "Smart Departure Cockpit, Travel Mode Switcher, Nearest Neighbor TSP, Multi-Stop Google Maps Navigation."],
        ["StreetMapView.tsx", "web/src/features/map-location/", "MapLibre Vector Engine, OpenFreeMap/Esri Satellite, Polyline Directional Arrows."],
        ["route.ts", "web/src/app/api/routing/road/", "OSRM Road Proxy, Fast LRU Caching Matrix, Detour Detour Detour Haversine Fallback."]
    ]

    t_files = doc.add_table(rows=len(file_map), cols=3)
    t_files.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(file_map):
        for c_idx, val in enumerate(row):
            cell = t_files.cell(r_idx, c_idx)
            set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
            cell_p = cell.paragraphs[0]
            cell_p.paragraph_format.space_before = Pt(2)
            cell_p.paragraph_format.space_after = Pt(2)
            run = cell_p.add_run(val)
            run.font.name = "Arial"
            run.font.size = Pt(9)
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

    # Section 4: Presentation / Defense Advice
    add_h1("IV. CÁCH TRÌNH BÀY / BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG")
    p_def = doc.add_paragraph()
    r_def = p_def.add_run(
        "Khi Hội đồng hoặc Thầy Cô hỏi: 'Thuật toán AI của nhóm em dùng công nghệ gì, có gì mới lạ so với các app trên thị trường?', bạn hãy tự tin trả lời theo 3 luận điểm cốt lõi:\n\n"
        "1. Kiến trúc kết hợp độc đáo (Hybrid Architecture):\n"
        "   'Chúng em không phụ thuộc 100% vào ChatGPT hay Gemini vì LLM thường dễ bị bịa đặt địa điểm (ảo giác - hallucination) và không tính toán chuẩn tọa độ bản đồ. Thay vào đó, chúng em kết hợp giữa Thuật toán Tối ưu hóa Toán học (Clustering, TSP Heuristic, OSRM Matrix) để đảm bảo lộ trình chuẩn xác 100% về mặt địa lý, và tầng AI Gemini 2.5 để đọc hiểu ngữ nghĩa mong muốn của du khách.'\n\n"
        "2. Giải quyết bài toán thực tế của người đi du lịch:\n"
        "   'Các ứng dụng khác thường xếp điểm theo độ nổi tiếng mà không quan tâm đến thể lực du khách. AI của chúng em giải quyết được bài toán cân bằng thể lực (Anchor-First: mỗi ngày 1 điểm đinh), chống chạy lòng vòng (Anti-Zigzag) và tự động tính toán giờ kẹt xe tại Việt Nam.'\n\n"
        "3. Tính tương tác và cá nhân hóa sâu sắc:\n"
        "   'AI của chúng em biết lắng nghe: Khi người dùng bấm xóa một quán ăn, hệ thống ghi nhớ vĩnh viễn và không bao giờ gợi ý lại; đồng thời thích ứng tự động với thời tiết thực tế mưa nắng theo thời gian thực.'"
    )
    r_def.font.name = "Arial"
    r_def.font.size = Pt(9.5)
    r_def.font.italic = True
    r_def.font.color.rgb = DARK_TEXT

    # Output paths
    workspace_dir = os.path.abspath(".")
    docx_path = os.path.join(workspace_dir, "BAO_CAO_NANG_CAP_AI_ENGINE_VISTA.docx")
    doc.save(docx_path)
    print(f"Generated Full AI Report DOCX successfully: {docx_path}")

if __name__ == "__main__":
    create_full_ai_report()
