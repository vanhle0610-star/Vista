import os
import base64

image_path = "sprint3_demo_screenshot.jpg"
image_base64 = ""
if os.path.exists(image_path):
    with open(image_path, "rb") as img_f:
        image_base64 = base64.b64encode(img_f.read()).decode("utf-8")

html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VISTA — Sprint 3 Review Presentation (Toàn Diện 5 Thành Viên)</title>
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0B132B;
      color: #12263A;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }}
    .presentation-container {{
      width: 100%;
      max-width: 1240px;
      aspect-ratio: 16 / 9;
      background: #F4F7FA;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .slide {{
      display: none;
      width: 100%;
      height: 100%;
      padding: 40px 50px 65px 50px;
      flex-direction: column;
      overflow-y: auto;
    }}
    .slide.active {{
      display: flex;
    }}
    .slide-header {{
      margin-bottom: 18px;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }}
    .slide-badge {{
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #2563EB;
      background: #DBEAFE;
      padding: 3px 10px;
      border-radius: 999px;
      margin-bottom: 4px;
    }}
    .slide-title {{
      font-size: 26px;
      font-weight: 800;
      color: #12263A;
      line-height: 1.25;
    }}
    .slide-subtitle {{
      font-size: 12.5px;
      color: #64748B;
      margin-top: 3px;
      font-style: italic;
    }}
    .slide-content {{
      flex: 1;
      display: flex;
      gap: 18px;
    }}
    .two-cols {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      width: 100%;
    }}
    .three-cols {{
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      width: 100%;
    }}
    .card {{
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 16px 18px;
      box-shadow: 0 4px 10px rgba(18, 38, 58, 0.03);
    }}
    .card-title {{
      font-size: 15px;
      font-weight: 700;
      color: #2563EB;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .card ul {{
      list-style-type: none;
    }}
    .card li {{
      font-size: 12px;
      line-height: 1.55;
      color: #12263A;
      margin-bottom: 8px;
      padding-left: 16px;
      position: relative;
    }}
    .card li::before {{
      content: "•";
      color: #2563EB;
      font-weight: bold;
      font-size: 14px;
      position: absolute;
      left: 0;
      top: -2px;
    }}
    .table-container {{
      width: 100%;
      background: #FFFFFF;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
      overflow: hidden;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }}
    th {{
      background: #12263A;
      color: #FFFFFF;
      text-align: left;
      padding: 8px 12px;
      font-weight: 700;
    }}
    td {{
      padding: 7px 12px;
      border-bottom: 1px solid #F1F5F9;
      color: #12263A;
      line-height: 1.4;
    }}
    tr:nth-child(even) td {{
      background: #F8FAFC;
    }}
    .status-badge {{
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
    }}
    .status-completed {{
      background: #DCFCE7;
      color: #15803D;
      border: 1px solid #86EFAC;
    }}
    .status-progress {{
      background: #FEF3C7;
      color: #B45309;
      border: 1px solid #FCD34D;
    }}
    .status-blocked {{
      background: #FEE2E2;
      color: #B91C1C;
      border: 1px solid #FCA5A5;
    }}
    .flowchart {{
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      width: 100%;
      margin: auto 0;
    }}
    .flow-step {{
      background: #FFFFFF;
      border: 1.5px solid #BAE6FD;
      border-radius: 10px;
      padding: 14px 10px;
      text-align: center;
      position: relative;
    }}
    .flow-step:not(:last-child)::after {{
      content: "➔";
      position: absolute;
      right: -10px;
      top: 50%;
      transform: translateY(-50%);
      color: #2563EB;
      font-weight: bold;
      font-size: 14px;
      z-index: 10;
    }}
    .flow-num {{
      font-size: 10px;
      font-weight: 800;
      color: #2563EB;
      text-transform: uppercase;
      margin-bottom: 4px;
    }}
    .flow-name {{
      font-size: 12px;
      font-weight: 700;
      color: #12263A;
      margin-bottom: 4px;
    }}
    .flow-desc {{
      font-size: 10px;
      color: #64748B;
      line-height: 1.35;
    }}
    .speaker-notes-bar {{
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: #E2E8F0;
      border-top: 1px solid #CBD5E1;
      padding: 6px 20px;
      font-size: 11px;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 40px;
    }}
    .speaker-notes-content {{
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      margin-right: 14px;
    }}
    .controls {{
      display: flex;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
    }}
    .btn-nav {{
      background: #12263A;
      color: #FFFFFF;
      border: none;
      padding: 3px 10px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }}
    .btn-nav:hover {{
      background: #2563EB;
    }}
    .slide-indicator {{
      font-size: 11px;
      font-weight: 700;
      color: #12263A;
      min-width: 45px;
      text-align: center;
    }}
    .screenshot-frame {{
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #CBD5E1;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }}
    .annotation-badge {{
      position: absolute;
      background: #2563EB;
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 999px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: 1.5px solid white;
    }}
  </style>
</head>
<body>

<div class="presentation-container">

  <!-- SLIDE 1: BÌA TOÀN NHÓM -->
  <div class="slide active" id="slide-1">
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
      <span class="slide-badge">DỰ ÁN DU LỊCH THÔNG MINH VISTA</span>
      <h1 style="font-size: 34px; font-weight: 900; color: #12263A; margin: 10px 0 12px 0; line-height: 1.2;">BÁO CÁO TỔNG KẾT SPRINT 3 REVIEW</h1>
      <p style="font-size: 15px; color: #475569; max-width: 780px; line-height: 1.5; margin-bottom: 24px;">
        Đồng bộ Nâng cấp Toàn diện 5 Phân hệ: AI Planning Engine v3.0, Security RBAC, Skeleton Hub, Trip Realtime Collaboration, Discovery Admin & CI/CD Pipeline
      </p>
      
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; width: 100%; max-width: 1050px; margin-bottom: 18px;">
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 10px; border-radius: 8px;">
          <div style="font-size: 10px; font-weight: 700; color: #2563EB;">TV1 · LÊ HỒNG SƠN</div>
          <div style="font-size: 11px; font-weight: 600; color: #12263A; margin-top: 3px;">Discovery & Admin Hub</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 10px; border-radius: 8px;">
          <div style="font-size: 10px; font-weight: 700; color: #2563EB;">TV2 · TRẦN QUANG SÁNG</div>
          <div style="font-size: 11px; font-weight: 600; color: #12263A; margin-top: 3px;">Security, Trips & Skeleton</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 10px; border-radius: 8px;">
          <div style="font-size: 10px; font-weight: 700; color: #2563EB;">TV3 · NGUYỄN VĂN QUÝ</div>
          <div style="font-size: 11px; font-weight: 600; color: #12263A; margin-top: 3px;">Collaboration & Mobile</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 10px; border-radius: 8px;">
          <div style="font-size: 10px; font-weight: 700; color: #2563EB;">TV4 · LÊ THỊ VÂN ÁNH</div>
          <div style="font-size: 11px; font-weight: 600; color: #12263A; margin-top: 3px;">AI Brain v3, Co-Pilot & GPS</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 10px; border-radius: 8px;">
          <div style="font-size: 10px; font-weight: 700; color: #2563EB;">TV5 · NGUYỄN QUANG TUẤN</div>
          <div style="font-size: 11px; font-weight: 600; color: #12263A; margin-top: 4px;">Routing, DB & CI/CD</div>
        </div>
      </div>

      <div style="font-size: 12px; color: #64748B;">
        <strong>Thời gian Sprint:</strong> 30/10/2026 – 13/11/2026 (2 tuần) &nbsp; | &nbsp; <strong>Ngày báo cáo:</strong> 13/11/2026 &nbsp; | &nbsp; <strong>Trạng thái:</strong> Sẵn sàng bàn giao
      </div>
    </div>
  </div>

  <!-- SLIDE 2: MỤC TIÊU VÀ KẾT QUẢ SPRINT (5 PHÂN HỆ) -->
  <div class="slide" id="slide-2">
    <div class="slide-header">
      <div>
        <span class="slide-badge">ĐỐI CHIẾU MỤC TIÊU SPRINT</span>
        <div class="slide-title">MỤC TIÊU VÀ KẾT QUẢ THỰC TẾ CẢ NHÓM (SPRINT 3)</div>
        <div class="slide-subtitle">So sánh toàn diện cam kết đầu kỳ và kết quả nghiệm thu của 5 phân hệ</div>
      </div>
    </div>
    <div class="slide-content">
      <div class="two-cols">
        <div class="card" style="border-left: 4px solid #2563EB;">
          <div class="card-title">🎯 MỤC TIÊU CAM KẾT (SPRINT GOAL)</div>
          <ul>
            <li><strong>AI Travel Engine (TV4):</strong> Cân bằng điểm đinh (Anchor-first), khử zigzag di chuyển, tích hợp hệ số kẹt xe OSRM Matrix 1xN.</li>
            <li><strong>Security & UI Performance (TV2):</strong> Tăng tốc màn Trips Hub bằng Shimmer Skeleton, bảo vệ endpoint RBAC và Refresh Token.</li>
            <li><strong>Trip Collaboration (TV3):</strong> Mời bạn đồng hành bằng link/mã PIN, phân quyền Admin/Viewer, đồng bộ thông báo Mobile.</li>
            <li><strong>Discovery & Admin Portal (TV1):</strong> Tìm kiếm không dấu tiếng Việt (Unicode NFD), kiểm duyệt địa điểm cộng đồng đóng góp.</li>
            <li><strong>Map Routing & CI/CD (TV5):</strong> Chuẩn hóa Adapter OSRM tọa độ thực, thiết lập pipeline GitHub Actions tự động kiểm thử.</li>
          </ul>
        </div>
        <div class="card" style="border-left: 4px solid #10B981;">
          <div class="card-title" style="color: #10B981;">✅ KẾT QUẢ THỰC TẾ ĐẠT ĐƯỢC</div>
          <ul>
            <li><strong>AI Brain v3.0 & Co-Pilot (100% Hoàn thành):</strong> 5/5 Unit Test pass; Trợ lý Thổ Địa NLP gợi ý ngủ nướng/đổi quán; Cockpit thời tiết.</li>
            <li><strong>Trip Hub & Skeleton (100% Hoàn thành):</strong> Tải trang tức thì không giật (Zero Jank), loại bỏ xung đột Navbar, chuẩn hóa RBAC.</li>
            <li><strong>Cộng tác Chuyến đi (100% Hoàn thành):</strong> Tự động chuyển quyền trưởng nhóm khi rời chuyến, xử lý triệt để lỗi 403 Forbidden.</li>
            <li><strong>Discovery & Admin Hub (100% Hoàn thành):</strong> Hàng đợi kiểm duyệt điểm đến (`admin-completion`), tìm kiếm thông minh NFD.</li>
            <li><strong>Hạ tầng & CI/CD (100% Hoàn thành):</strong> Tự động cấp quyền `chmod +x gradlew`, Spotless format code Java, Postgres fixtures.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 3: TIẾN ĐỘ BÀN GIAO BACKLOG -->
  <div class="slide" id="slide-3">
    <div class="slide-header">
      <div>
        <span class="slide-badge">TIẾN ĐỘ BÀN GIAO SPRINT 3</span>
        <div class="slide-title">BẢNG TỔNG HỢP NGHIỆM THU THEO PHÂN HỆ VÀ THÀNH VIÊN</div>
        <div class="slide-subtitle">Trạng thái bàn giao 7 User Story trọng tâm của 5 thành viên trong Sprint 3</div>
      </div>
    </div>
    <div class="slide-content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 14%;">Phân hệ & Thành viên</th>
              <th style="width: 28%;">Hạng mục Backlog (User Story)</th>
              <th style="width: 15%;">Trạng thái</th>
              <th style="width: 43%;">Kết quả thực tế & Bước chuyển tiếp</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>TV4 · Vân Ánh</strong><br><span style="font-size:10px; color:#64748B;">AI Engine</span></td>
              <td>US-01: Bộ não AI Planning Engine v3.0 (Anchor clustering & Anti-zigzag)</td>
              <td><span class="status-badge status-completed">Hoàn thành</span></td>
              <td>Cụm điểm đến cân đối, 5/5 test pass, giảm 40% thời gian di chuyển thừa.</td>
            </tr>
            <tr>
              <td><strong>TV4 · Vân Ánh</strong><br><span style="font-size:10px; color:#64748B;">AI Co-Pilot</span></td>
              <td>US-06: Trợ lý AI Co-Pilot Thổ Địa & Lập lịch ngủ nướng tức thì</td>
              <td><span class="status-badge status-completed">Hoàn thành</span></td>
              <td>NLP tinh chỉnh lịch trình trực tiếp, dồn giờ thông minh, gợi ý quán ngon bản địa.</td>
            </tr>
            <tr>
              <td><strong>TV1 · Sơn</strong><br><span style="font-size:10px; color:#64748B;">Discovery</span></td>
              <td>US-03: Tìm kiếm không dấu Unicode NFD & Admin Queue</td>
              <td><span class="status-badge status-completed">Hoàn thành</span></td>
              <td>Tìm kiếm địa điểm mượt mà, phân hệ Admin kiểm duyệt đóng góp công khai.</td>
            </tr>
            <tr>
              <td><strong>TV2 · Sáng</strong><br><span style="font-size:10px; color:#64748B;">Security & Trips</span></td>
              <td>US-02: Shimmer Skeleton Trips & Bảo mật RBAC, Refresh Token</td>
              <td><span class="status-badge status-completed">Hoàn thành</span></td>
              <td>Loại bỏ giật màn hình khi tải danh sách chuyến, phiên đăng nhập bền vững.</td>
            </tr>
            <tr>
              <td><strong>TV3 · Quý</strong><br><span style="font-size:10px; color:#64748B;">Collaboration</span></td>
              <td>US-04: Mời thành viên, chuyển giao Leader & Fix lỗi 403</td>
              <td><span class="status-badge status-completed">Hoàn thành</span></td>
              <td>Chấp nhận lời mời nhóm trơn tru, chống mất chủ nhóm khi Leader rời chuyến.</td>
            </tr>
            <tr>
              <td><strong>TV5 · Tuấn</strong><br><span style="font-size:10px; color:#64748B;">Routing & Infra</span></td>
              <td>US-05: MapViewAdapter OSRM & Tự động hóa CI/CD GitHub</td>
              <td><span class="status-badge status-completed">Hoàn thành</span></td>
              <td>Chuẩn hóa tọa độ đường đi thực, fix lỗi quyền thực thi Gradle trên server CI.</td>
            </tr>
            <tr>
              <td><strong>TV4 · Vân Ánh</strong><br><span style="font-size:10px; color:#64748B;">Navigation</span></td>
              <td>US-07: Tối ưu tuyến đường TSP & Trạm điều hướng GPS</td>
              <td><span class="status-badge status-completed">Hoàn thành</span></td>
              <td>Nút mở GPS dẫn đường thực địa Google Maps một chạm từ lịch trình.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- SLIDE 4: PHÂN HỆ KHÁM PHÁ & BẢO MẬT (TV1 & TV2) -->
  <div class="slide" id="slide-4">
    <div class="slide-header">
      <div>
        <span class="slide-badge">CHI TIẾT PHÂN HỆ NỀN TẢNG</span>
        <div class="slide-title">PHÂN HỆ KHÁM PHÁ (TV1 - SƠN) & BẢO MẬT / UI (TV2 - SÁNG)</div>
        <div class="slide-subtitle">Nâng cấp trải nghiệm duyệt danh sách, quản trị nội dung và tối ưu hiệu năng tải trang</div>
      </div>
    </div>
    <div class="slide-content">
      <div class="two-cols">
        <div class="card">
          <div class="card-title">🔍 TV1 · LÊ HỒNG SƠN — KHÁM PHÁ & QUẢN TRỊ</div>
          <ul>
            <li><strong>Bộ tìm kiếm Unicode NFD:</strong> Xử lý chuẩn hóa chuỗi tiếng Việt không dấu (gõ "ha tinh" tìm chính xác "Hà Tĩnh", "da nang" -> "Đà Nẵng").</li>
            <li><strong>Admin Completion & Queue:</strong> Xây dựng trang kiểm duyệt địa điểm do cộng đồng đóng góp; phê duyệt hoặc từ chối kèm lý do phản hồi.</li>
            <li><strong>Bộ lọc Điểm đến Đa chiều:</strong> Lọc linh hoạt theo danh mục (Biển, Di sản, Thiên nhiên, Trải nghiệm bản địa) và mức chi phí dự kiến.</li>
            <li><strong>Cách ly Dữ liệu Công khai:</strong> Bảo đảm điểm du lịch chưa duyệt không hiển thị trên giao diện chung của người dùng vãng lai.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">🛡️ TV2 · TRẦN QUANG SÁNG — SECURITY & SKELETON UI</div>
          <ul>
            <li><strong>Shimmer Skeleton Loading:</strong> Thay thế hoàn toàn spinner xoay vòng bằng khung xương shimmer GPU; loại bỏ layout shift (CLS = 0).</li>
            <li><strong>Khử trùng lặp Navbar:</strong> Khắc phục lỗi hiển thị 2 thanh điều hướng song song khi chuyển đổi giữa Trips Hub và Dashboard.</li>
            <li><strong>Bảo mật RBAC & Refresh Token:</strong> Phân quyền chặt chẽ giữa User/Admin; cấp mới Access Token ngầm không bắt đăng nhập lại.</li>
            <li><strong>Trip Lifecycle Handler:</strong> Chuẩn hóa trạng thái chuyến đi (Planning -> Active -> Completed -> Cancelled) cùng Audit Log chi tiết.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 5: PHÂN HỆ CỘNG TÁC & HẠ TẦNG (TV3 & TV5) -->
  <div class="slide" id="slide-5">
    <div class="slide-header">
      <div>
        <span class="slide-badge">CHI TIẾT CỘNG TÁC & HẠ TẦNG</span>
        <div class="slide-title">CỘNG TÁC NHÓM (TV3 - QUÝ) & HẠ TẦNG BẢN ĐỒ / CI-CD (TV5 - TUẤN)</div>
        <div class="slide-subtitle">Đồng bộ dữ liệu thời gian thực giữa các thành viên chuyến đi và duy trì chất lượng mã nguồn</div>
      </div>
    </div>
    <div class="slide-content">
      <div class="two-cols">
        <div class="card">
          <div class="card-title">👥 TV3 · NGUYỄN VĂN QUÝ — CỘNG TÁC NHÓM & MOBILE</div>
          <ul>
            <li><strong>Cơ chế Chuyển giao Leader Tự động:</strong> Khi Trưởng nhóm rời chuyến đi, hệ thống tự động chỉ định thành viên thâm niên nhất làm Leader mới.</li>
            <li><strong>Sửa lỗi 403 Forbidden:</strong> Xử lý triệt để xung đột quyền token khi người dùng bấm vào đường link mời tham gia chuyến đi.</li>
            <li><strong>Mobile Itinerary & Realtime Alerts:</strong> Hoàn thiện giao diện chi tiết lịch trình trên ứng dụng di động; đồng bộ danh sách thành viên tức thì.</li>
            <li><strong>Quyền hạn Vai trò (Role-based Trip Access):</strong> Chủ chuyến (Editor/Owner) được phép đổi lịch trình; khách mời (Viewer) chỉ được xem.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">🗺️ TV5 · NGUYỄN QUANG TUẤN — BẢN ĐỒ & CI/CD</div>
          <ul>
            <li><strong>MapViewAdapter OSRM:</strong> Tích hợp trạm tính cước khoảng cách và định tuyến tọa độ đường bộ thực thay thế tính toán đường chim bay.</li>
            <li><strong>PostgreSQL Supabase Migration:</strong> Viết bộ test kiểm tra tương thích schema cơ sở dữ liệu và dữ liệu lưu trữ media chuyến đi.</li>
            <li><strong>Khắc phục CI/CD GitHub Actions:</strong> Tự động cấu hình `chmod +x gradlew` trên máy chủ Linux runner; ngăn chặn lỗi build fail lặp lại.</li>
            <li><strong>Spotless Code Format Rule:</strong> Tự động kiểm tra chuẩn định dạng mã nguồn Java backend trước khi merge vào nhánh chính `main`.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 6: DEMO SẢN PHẨM THỰC TẾ & PHÂN HỆ TV4 -->
  <div class="slide" id="slide-6">
    <div class="slide-header">
      <div>
        <span class="slide-badge">DEMO TÍNH NĂNG NỔI BẬT (TV4 - VÂN ÁNH)</span>
        <div class="slide-title">AI ENGINE V3.0 · SMART COCKPIT & TRỢ LÝ CO-PILOT THỔ ĐỊA</div>
        <div class="slide-subtitle">Giao diện vận hành thực tế tại localhost:3000/planner với điều hướng thông minh</div>
      </div>
    </div>
    <div class="slide-content" style="gap: 16px;">
      <div style="flex: 1.4; display: flex; flex-direction: column;">
        <div class="screenshot-frame" style="flex: 1; display: flex; align-items: center; justify-content: center; background: #E2E8F0; position: relative;">
          {f'<img src="data:image/jpeg;base64,{image_base64}" style="width:100%; height:100%; object-fit: cover; display:block;" alt="VISTA AI Planner Real Screen">' if image_base64 else '<div style="padding: 40px; text-align: center; color: #64748B;">[Ảnh màn hình thực tế VISTA AI Planner]</div>'}
          <div class="annotation-badge" style="top: 18%; left: 8%;">1. Cockpit Khởi Hành & Thời Tiết LIVE</div>
          <div class="annotation-badge" style="top: 22%; left: 42%;">2. Trợ Lý AI Co-Pilot Thổ Địa</div>
          <div class="annotation-badge" style="top: 68%; left: 38%;">3. Lộ Trình Cân Bằng & Chi Phí 1.8M/ngày</div>
        </div>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
        <div class="card" style="padding: 12px 14px;">
          <div style="font-size: 11px; font-weight: 700; color: #2563EB;">[1] SMART DEPARTURE COCKPIT</div>
          <div style="font-size: 11px; color: #12263A; margin-top: 2px;">
            Lịch hẹn phong cách Apple Calendar, chọn nhanh <strong>Hôm nay / Ngày mai / Cuối tuần</strong>. Tích hợp thời tiết LIVE 20°C Hà Tĩnh.
          </div>
        </div>
        <div class="card" style="padding: 12px 14px;">
          <div style="font-size: 11px; font-weight: 700; color: #2563EB;">[2] TRỢ LÝ AI CO-PILOT "THỔ ĐỊA SÀNH SỎI"</div>
          <div style="font-size: 11px; color: #12263A; margin-top: 2px;">
            Hiểu ngôn ngữ tự nhiên: gõ <em>"Ngủ nướng ngày 2"</em> -> tự dồn giờ, đổi bữa trưa hải sản, chèn mẹo insider <strong>💡 Thổ Địa Mách Nước</strong>.
          </div>
        </div>
        <div class="card" style="padding: 12px 14px;">
          <div style="font-size: 11px; font-weight: 700; color: #2563EB;">[3] THỦ QUỸ & DẪN ĐƯỜNG GPS THỰC ĐỊA</div>
          <div style="font-size: 11px; color: #12263A; margin-top: 2px;">
            Dự toán chi tiết từng món (~1.806.667đ/ngày); liên kết một chạm sang Google Maps GPS dẫn đường thực tế cho từng chặng xe.
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 7: LUỒNG HOẠT ĐỘNG KHÉP KÍN -->
  <div class="slide" id="slide-7">
    <div class="slide-header">
      <div>
        <span class="slide-badge">KIẾN TRÚC & LUỒNG HOẠT ĐỘNG</span>
        <div class="slide-title">LUỒNG HOẠT ĐỘNG TỔNG THỂ CỦA NỀN TẢNG VISTA</div>
        <div class="slide-subtitle">Quy trình 5 bước liền mạch từ tiếp nhận yêu cầu đến điều hướng thực địa</div>
      </div>
    </div>
    <div class="slide-content" style="align-items: center;">
      <div class="flowchart">
        <div class="flow-step">
          <div class="flow-num">BƯỚC 1</div>
          <div class="flow-name">Khởi tạo & Cá nhân hóa</div>
          <div class="flow-desc">Khách chọn điểm đến, ngày đi trên Smart Cockpit; xem thời tiết và chọn thẻ sở thích trải nghiệm.</div>
        </div>
        <div class="flow-step">
          <div class="flow-num">BƯỚC 2</div>
          <div class="flow-name">AI Anchor Clustering</div>
          <div class="flow-desc">AI Engine phân tích tọa độ địa lý, định vị điểm neo (Anchor) và gom cụm không gian chống đảo chiều.</div>
        </div>
        <div class="flow-step">
          <div class="flow-num">BƯỚC 3</div>
          <div class="flow-name">Co-Pilot Thổ Địa</div>
          <div class="flow-desc">Trợ lý NLP đọc hiểu yêu cầu tùy chỉnh (ngủ nướng, đổi món), bổ sung mẹo độc quyền bản địa.</div>
        </div>
        <div class="flow-step">
          <div class="flow-num">BƯỚC 4</div>
          <div class="flow-name">Tối ưu TSP & Chi phí</div>
          <div class="flow-desc">Thuật toán OSRM tính cước ma trận thời gian thực, bóc tách ngân sách vé/ăn/xe/phòng theo ngày.</div>
        </div>
        <div class="flow-step">
          <div class="flow-num">BƯỚC 5</div>
          <div class="flow-name">Cộng tác & GPS Live</div>
          <div class="flow-desc">Trưởng nhóm mời bạn qua mã PIN/Link; mở GPS Google Maps dẫn đường trực tiếp khi xuất phát.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 8: KIỂM THỬ & VƯỚNG MẮC ĐÃ GIẢI QUYẾT -->
  <div class="slide" id="slide-8">
    <div class="slide-header">
      <div>
        <span class="slide-badge">CHẤT LƯỢNG & GIẢI QUYẾT VƯỚNG MẮC</span>
        <div class="slide-title">KẾT QUẢ KIỂM THỬ 4 TẦNG VÀ KHẮC PHỤC TRỞ NGẠI KỸ THUẬT</div>
        <div class="slide-subtitle">Đảm bảo độ tin cậy của mã nguồn và tính sẵn sàng của sản phẩm</div>
      </div>
    </div>
    <div class="slide-content">
      <div class="two-cols">
        <div class="card">
          <div class="card-title">🧪 KẾT QUẢ KIỂM THỬ 4 TẦNG TOÀN DIỆN</div>
          <ul>
            <li><strong>AI Service (Python FastAPI):</strong> 5/5 Unit Test đạt 100% PASS (Anchor assignment, Anti-zigzag, Sleep-in cascade, Matrix fallback).</li>
            <li><strong>Backend API (Spring Boot):</strong> 100% Integration Tests hoàn thành (Auth, Refresh Token, Member RBAC, Admin approval).</li>
            <li><strong>Frontend Web (Next.js 14):</strong> Khắc phục triệt để lỗi Hydration Mismatch, đảm bảo không còn cảnh báo console.</li>
            <li><strong>Database (PostgreSQL Supabase):</strong> Chạy thành công toàn bộ migration script và bộ dữ liệu mẫu fixture.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">🔧 CÁC VƯỚNG MẮC ĐÃ KHẮC PHỤC TRIỆT ĐỂ</div>
          <ul>
            <li><strong>Lỗi 403 khi nhận lời mời (TV3):</strong> Đồng bộ header xác thực token giữa các trang công khai và bảo mật.</li>
            <li><strong>Xung đột 2 Navbar (TV2):</strong> Tách biệt rõ ràng RootLayout và DashboardLayout, giải quyết hiện tượng giật màn hình.</li>
            <li><strong>Lỗi quyền thực thi Gradle trên GitHub Actions (TV5):</strong> Bổ sung tự động `chmod +x gradlew` trong file workflow YAML.</li>
            <li><strong>Hiện tượng dồn điểm đầu ngày (TV4):</strong> Áp dụng trừng phạt hàm mục tiêu (cost penalty) trong thuật toán gom cụm.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 9: KẾ HOẠCH SPRINT 4 (PHÂN CÔNG 5 THÀNH VIÊN) -->
  <div class="slide" id="slide-9">
    <div class="slide-header">
      <div>
        <span class="slide-badge">KẾ HOẠCH TƯƠNG LAI</span>
        <div class="slide-title">KẾ HOẠCH VÀ PHÂN CÔNG NHIỆM VỤ SPRINT 4</div>
        <div class="slide-subtitle">Sẵn sàng bước vào giai đoạn kiểm thử tải, đồng bộ Mobile và chuẩn bị Release</div>
      </div>
    </div>
    <div class="slide-content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 20%;">Thành viên & Vai trò</th>
              <th style="width: 45%;">Hạng mục Cam kết Sprint 4</th>
              <th style="width: 15%;">Mức ưu tiên</th>
              <th style="width: 20%;">Mục tiêu nghiệm thu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>TV1 · Lê Hồng Sơn</strong><br><span style="font-size:10px; color:#64748B;">Discovery & Admin</span></td>
              <td>Hoàn thiện bộ lọc nâng cao danh mục điểm đến; thống kê báo cáo lượt xem và đóng góp trong Admin Dashboard.</td>
              <td><span class="status-badge status-progress">Cao (P1)</span></td>
              <td>Bộ lọc phản hồi &lt; 200ms; biểu đồ dashboard trực quan.</td>
            </tr>
            <tr>
              <td><strong>TV2 · Trần Quang Sáng</strong><br><span style="font-size:10px; color:#64748B;">Security & Hub</span></td>
              <td>Kiểm thử bảo mật CSRF/XSS cho hệ thống xác thực; hoàn thiện chế độ xem lịch sử chỉnh sửa chuyến đi (Audit History).</td>
              <td><span class="status-badge status-progress">Cao (P1)</span></td>
              <td>Bảo mật đạt chuẩn OWASP; ghi vết 100% thay đổi lịch trình.</td>
            </tr>
            <tr>
              <td><strong>TV3 · Nguyễn Văn Quý</strong><br><span style="font-size:10px; color:#64748B;">Mobile & Collab</span></td>
              <td>Hoàn thiện tính năng bình chọn địa điểm (Voting System) trong nhóm và tích hợp Push Notification trên Mobile.</td>
              <td><span class="status-badge status-progress">Cao (P1)</span></td>
              <td>Nhận thông báo mời nhóm trên điện thoại tức thì (&lt;1s).</td>
            </tr>
            <tr>
              <td><strong>TV4 · Lê Thị Vân Ánh</strong><br><span style="font-size:10px; color:#64748B;">AI Engine & Treasury</span></td>
              <td>Tích hợp bản đồ ngoại tuyến (Offline Itinerary Caching) và chia hóa đơn nhóm thông minh quét mã VietQR tự động.</td>
              <td><span class="status-badge status-progress">Cao (P1)</span></td>
              <td>Tra cứu lịch khi mất sóng; quét VietQR chia tiền 1 chạm.</td>
            </tr>
            <tr>
              <td><strong>TV5 · Nguyễn Quang Tuấn</strong><br><span style="font-size:10px; color:#64748B;">DevOps & Infra</span></td>
              <td>Kiểm thử chịu tải toàn hệ thống (Stress Test k6) và triển khai tự động hóa môi trường Production Staging.</td>
              <td><span class="status-badge status-progress">Trung bình (P2)</span></td>
              <td>Chịu tải 500 CCU đồng thời với độ trễ phản hồi &lt; 1.5s.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- SPEAKER NOTES BAR -->
  <div class="speaker-notes-bar">
    <div style="font-weight: 700; color: #12263A; margin-right: 8px;">SPEAKER NOTE:</div>
    <div class="speaker-notes-content" id="speakerNoteText">
      Kính chào các thầy cô và hội đồng, hôm nay nhóm VISTA xin báo cáo tổng kết Sprint 3 với sự phối hợp hoàn thiện của cả 5 thành viên ở 5 phân hệ cốt lõi.
    </div>
    <div class="controls">
      <button class="btn-nav" onclick="prevSlide()">◀ Trước</button>
      <span class="slide-indicator" id="slideIndicator">1 / 9</span>
      <button class="btn-nav" onclick="nextSlide()">Tiếp ▶</button>
      <button class="btn-nav" style="background:#2563EB;" onclick="toggleFullscreen()">⛶ Toàn màn hình</button>
    </div>
  </div>

</div>

<script>
  let currentSlide = 1;
  const totalSlides = 9;

  const speakerNotes = [
    "Kính chào các thầy cô và hội đồng, hôm nay nhóm VISTA xin báo cáo tổng kết Sprint 3 với sự phối hợp chặt chẽ và đồng bộ của cả 5 thành viên ở 5 phân hệ cốt lõi.",
    "Trong Sprint 3, nhóm đã hoàn thành toàn diện các mục tiêu đã cam kết: từ việc nâng cấp Bộ não AI v3.0, tối ưu hiệu năng trang Chuyến đi bằng Skeleton, hoàn thiện cộng tác nhóm đến chuẩn hóa CI/CD.",
    "Bảng theo dõi nghiệm thu cho thấy toàn bộ 7 User Story trọng tâm của 5 thành viên đều đã hoàn thành và sẵn sàng chuyển tiếp sang Sprint 4 mà không có hạng mục nào bị chặn nghiêm trọng.",
    "Về phân hệ Khám phá và Bảo mật: Bạn Sơn đã hoàn thiện tìm kiếm tiếng Việt không dấu NFD và hệ thống duyệt tin Admin; bạn Sáng đã xử lý dứt điểm tình trạng giật màn hình bằng Shimmer Skeleton và chuẩn hóa RBAC.",
    "Về Cộng tác và Hạ tầng: Bạn Quý đã hoàn thiện cơ chế tự chuyển giao quyền Trưởng nhóm và sửa dứt điểm lỗi 403; bạn Tuấn đã tích hợp Adapter OSRM thực và tự động hóa pipeline CI/CD GitHub Actions.",
    "Đây là giao diện vận hành thực tế của phân hệ AI Planner do bạn Vân Ánh phụ trách: nổi bật với Smart Cockpit thời tiết LIVE, Trợ lý Thổ Địa NLP cho phép người dùng tùy chỉnh lịch trình tức thì như ngủ nướng, đổi món.",
    "Luồng hoạt động của hệ thống được khép kín qua 5 bước logic: từ tiếp nhận sở thích, gom cụm không gian, trợ lý NLP xử lý ngữ cảnh, tối ưu đường đi thực tế và mở GPS dẫn đường.",
    "Về chất lượng kỹ thuật, nhóm đã thực hiện kiểm thử 4 tầng toàn diện từ Unit Test Python, Integration Test Java Spring Boot đến Frontend, đồng thời xử lý triệt để các rào cản về CORS, 403 và CI/CD.",
    "Bước sang Sprint 4, nhóm đã có kế hoạch phân công cụ thể cho từng thành viên: tập trung hoàn thiện bộ lọc nâng cao, kiểm thử tải hệ thống, chia tiền VietQR và đồng bộ thông báo Mobile chuẩn bị cho Release."
  ];

  function showSlide(n) {{
    document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
    document.getElementById('slide-' + n).classList.add('active');
    document.getElementById('slideIndicator').innerText = n + ' / ' + totalSlides;
    document.getElementById('speakerNoteText').innerText = speakerNotes[n - 1];
    currentSlide = n;
  }}

  function nextSlide() {{
    if (currentSlide < totalSlides) {{
      showSlide(currentSlide + 1);
    }}
  }}

  function prevSlide() {{
    if (currentSlide > 1) {{
      showSlide(currentSlide - 1);
    }}
  }}

  document.addEventListener('keydown', function(e) {{
    if (e.key === 'ArrowRight' || e.key === 'Space') {{
      nextSlide();
    }} else if (e.key === 'ArrowLeft') {{
      prevSlide();
    }} else if (e.key === 'f' || e.key === 'F') {{
      toggleFullscreen();
    }}
  }});

  function toggleFullscreen() {{
    if (!document.fullscreenElement) {{
      document.documentElement.requestFullscreen();
    }} else {{
      if (document.exitFullscreen) {{
        document.exitFullscreen();
      }}
    }}
  }}
</script>

</body>
</html>
"""

output_path = "SLIDE_SPRINT_3_REVIEW_VISTA.html"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Generated Comprehensive 9-Slide Presentation HTML: {os.path.abspath(output_path)}")
