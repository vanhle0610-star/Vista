import os
import subprocess

html_content = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>VISTA - Ma Trận Kịch Bản Kiểm Thử Toàn Diện 5 Thành Viên</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 10mm 12mm 10mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #1e293b;
    line-height: 1.45;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }
  .header-box {
    border-bottom: 2.5px solid #0284c7;
    padding-bottom: 10px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .brand-title {
    font-size: 20pt;
    font-weight: 800;
    color: #0284c7;
    letter-spacing: -0.5px;
    margin: 0;
  }
  .brand-sub {
    font-size: 10.5pt;
    font-weight: 600;
    color: #64748b;
    margin: 2px 0 0 0;
  }
  .doc-tag {
    background: #e0f2fe;
    color: #0369a1;
    font-size: 9pt;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #bae6fd;
    text-transform: uppercase;
  }
  .intro-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #0284c7;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 9.5pt;
    color: #334155;
  }
  .member-section {
    margin-bottom: 18px;
    page-break-inside: avoid;
  }
  .member-header {
    background: linear-gradient(135deg, #0284c7, #0369a1);
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .member-header h2 {
    margin: 0;
    font-size: 11.5pt;
    font-weight: 700;
  }
  .member-role {
    font-size: 8.5pt;
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-top: none;
    margin-bottom: 8px;
  }
  th, td {
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
    border: 1px solid #e2e8f0;
  }
  th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    font-size: 9pt;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
    white-space: nowrap;
    margin-bottom: 2px;
  }
  .badge-happy { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .badge-role { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
  .badge-edge { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
  .badge-conflict { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }

  .col-cat { width: 17%; }
  .col-scenario { width: 23%; font-weight: 600; color: #0f172a; }
  .col-action { width: 30%; color: #334155; }
  .col-expected { width: 30%; color: #0f172a; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<div class="header-box">
  <div>
    <h1 class="brand-title">VISTA — SMART TRAVEL PLATFORM</h1>
    <div class="brand-sub">Đặc Tả Ma Trận Kịch Bản Kiểm Thử & Nghiệm Thu Toàn Diện (5 Thành Viên)</div>
  </div>
  <div class="doc-tag">Tài Liệu Bảo Vệ Đồ Án</div>
</div>

<div class="intro-box">
  <strong>Mục đích tài liệu:</strong> Tổng hợp đầy đủ 100% các hướng kiểm thử thực tế phục vụ buổi bảo vệ đồ án VISTA. Bao gồm cả <em>Luồng chuẩn (Happy Path)</em>, <em>Kiểm thử phân quyền (RBAC / Forbidden)</em>, <em>Dữ liệu biên/rác (Validation)</em> và <em>Xử lý ngoại lệ xung đột nghiệp vụ (HTTP 409 Conflict)</em> cho từng thành viên.
</div>

<!-- ================= TV1 ================= -->
<div class="member-section">
  <div class="member-header">
    <h2>THÀNH VIÊN 1 (TV1): Khám Phá Điểm Đến, UI Kit & Quản Trị Kiểm Duyệt</h2>
    <span class="member-role">Guest / Visitor & Moderator</span>
  </div>
  <table>
    <thead>
      <tr>
        <th class="col-cat">Phân loại</th>
        <th class="col-scenario">Tình huống kiểm thử</th>
        <th class="col-action">Thao tác thực hiện</th>
        <th class="col-expected">Phản hồi kỳ vọng & Kết quả</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Tìm kiếm & Lọc đa tiêu chí</td>
        <td>Gõ từ khóa có dấu/không dấu (<em>ba na, bà nà</em>), chọn chip lọc theo vùng miền & danh mục.</td>
        <td>Trả về chính xác danh sách địa danh liên quan kèm thẻ ảnh, số sao, giờ mở cửa và giá vé ước tính.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Dữ liệu biên</span></td>
        <td>Tìm từ khóa không tồn tại</td>
        <td>Gõ chuỗi vô nghĩa: <code>xyz999</code>, <code>asdfghjkl</code> hoặc toàn khoảng trắng.</td>
        <td>Hiển thị <strong>Empty State</strong> thân thiện có hình minh họa và gợi ý tìm kiếm lại; không crash app.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Bảo mật</span></td>
        <td>Ký tự lạ & Tấn công SQLi</td>
        <td>Nhập chuỗi <code>' OR '1'='1</code>, <code>&lt;script&gt;</code>, <code>@#$%^&*</code>.</td>
        <td>Backend lọc sanitize an toàn, frontend render dạng văn bản thuần, không lộ lỗi 500 hay sập hệ thống.</td>
      </tr>
      <tr>
        <td><span class="badge badge-role">Sai Role</span></td>
        <td>Khách chưa login bấm Lưu yêu thích</td>
        <td>Khách vãng lai mở chi tiết điểm đến và bấm nút <em>"Thả tim (Yêu thích)"</em>.</td>
        <td><strong>Auth Guard</strong> chặn lại, hiện Toast/Modal: <em>"Vui lòng đăng nhập để lưu điểm đến yêu thích"</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Kiểm duyệt nội dung (Moderation)</td>
        <td>Đăng nhập tài khoản Admin/Moderator, mở <code>/moderation</code>, xem hàng đợi bài viết bị report.</td>
        <td>Xem danh sách báo cáo, thao tác <strong>Ẩn bài viết</strong> hoặc <strong>Khôi phục bài viết</strong> thành công.</td>
      </tr>
      <tr>
        <td><span class="badge badge-role">Sai Role</span></td>
        <td>Người dùng thường vào trang Admin</td>
        <td>Tài khoản Member thường hoặc Khách mở trực tiếp URL <code>/moderation</code>.</td>
        <td>Hệ thống chặn truy cập với mã <strong>HTTP 403 Forbidden</strong> hoặc tự động đá về trang chủ.</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="page-break"></div>

<!-- ================= TV2 ================= -->
<div class="member-section">
  <div class="member-header">
    <h2>THÀNH VIÊN 2 (TV2): Xác Thực (Auth), Quản Lý Chuyến Đi & Bảo Mật RBAC</h2>
    <span class="member-role">Trip Owner & Security Core</span>
  </div>
  <table>
    <thead>
      <tr>
        <th class="col-cat">Phân loại</th>
        <th class="col-scenario">Tình huống kiểm thử</th>
        <th class="col-action">Thao tác thực hiện</th>
        <th class="col-expected">Phản hồi kỳ vọng & Kết quả</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Đăng nhập & Đăng ký hợp lệ</td>
        <td>Nhập email, mật khẩu hợp lệ $\rightarrow$ Đăng nhập/Đăng ký.</td>
        <td>Cấp phát JWT, lưu SecureStore/Cookie, tải thông tin cá nhân và chuyển hướng vào ứng dụng.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Dữ liệu sai</span></td>
        <td>Đăng nhập sai pass / Email trùng</td>
        <td>Nhập sai mật khẩu; Đăng ký email đã tồn tại sẵn trong hệ thống.</td>
        <td>Sai pass trả <strong>401 Unauthorized</strong>; Email trùng trả <strong>409 Conflict</strong> có thông báo rõ lý do.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Tạo chuyến đi Riêng tư (Private)</td>
        <td>Nhập tên chuyến, điểm đến, ngày đi/về, ngân sách, chọn chế độ Private.</td>
        <td>Tạo thành công, sinh mã mời 6 ký tự, chuyến đi xuất hiện ngay trong tab <em>My Trips</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Dữ liệu sai</span></td>
        <td>Ngày về trước ngày đi</td>
        <td>Chọn ngày bắt đầu <em>15/12</em>, ngày kết thúc <em>10/12</em>.</td>
        <td>Client chặn validate ngay tại Form: <em>"Ngày kết thúc phải diễn ra sau ngày bắt đầu"</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-role">Bảo mật / IDOR</span></td>
        <td>Người ngoài xem lén chuyến Private</td>
        <td>Người dùng không thuộc chuyến đi dán link UUID chuyến Private vào trình duyệt.</td>
        <td>Chặn bằng màn hình <strong>403 Forbidden</strong>: <em>"Chuyến đi riêng tư, chỉ thành viên mới được xem"</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-role">Sai Role</span></td>
        <td>Thành viên thường cố Xóa chuyến</td>
        <td>Tài khoản Member tìm nút Xóa chuyến hoặc gọi <code>DELETE /trips/{id}</code>.</td>
        <td>Trên UI nút xóa bị ẩn; trên API trả về <strong>403 Forbidden (TRIP_ACCESS_DENIED)</strong>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-conflict">Xung đột nợ / P1</span></td>
        <td>Owner xóa chuyến khi CÒN NỢ</td>
        <td>Chuyến đi còn khoản chi chưa quyết toán, Owner bấm nút <em>"Xóa chuyến đi"</em>.</td>
        <td>Backend trả <strong>409 Conflict (TRIP_HAS_UNSETTLED_DEBTS)</strong>. Dữ liệu chuyến đi và chi phí giữ nguyên, hiện Modal có nút <em>"Mở Thủ quỹ"</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Owner xóa chuyến khi ĐÃ HẾT NỢ</td>
        <td>Toàn bộ chi phí đã được chuyển sang <code>SETTLED</code>, Owner bấm Xóa chuyến.</td>
        <td>Backend trả <strong>204 No Content</strong>, xóa sạch toàn bộ dữ liệu chuyến đi thành công.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Chuyển quyền Trưởng nhóm</td>
        <td>Owner chuyển quyền cho Member B.</td>
        <td>Hoán đổi quyền hạn lập tức: Owner cũ thành Member thường (mất quyền xóa), Member B thành Owner mới.</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ================= TV3 ================= -->
<div class="member-section">
  <div class="member-header">
    <h2>THÀNH VIÊN 3 (TV3): Lời Mời, Thành Viên, Lịch Trình & Biểu Quyết</h2>
    <span class="member-role">Trip Member & Collaboration</span>
  </div>
  <table>
    <thead>
      <tr>
        <th class="col-cat">Phân loại</th>
        <th class="col-scenario">Tình huống kiểm thử</th>
        <th class="col-action">Thao tác thực hiện</th>
        <th class="col-expected">Phản hồi kỳ vọng & Kết quả</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Nhập mã mời chính xác</td>
        <td>Mở <em>Tham gia bằng mã</em> $\rightarrow$ Nhập mã 6 ký tự đúng do TV2 gửi.</td>
        <td>Gia nhập thành công, tên xuất hiện trong danh sách thành viên, mở khóa xem lịch trình chuyến.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Dữ liệu sai</span></td>
        <td>Mã mời không tồn tại / hết hạn</td>
        <td>Nhập mã bừa <code>ABCXYZ</code> hoặc mã của chuyến đã hủy.</td>
        <td>Báo lỗi đỏ: <em>"Mã lời mời không tồn tại hoặc đã hết hạn. Vui lòng kiểm tra lại"</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Trùng lặp</span></td>
        <td>Thành viên cũ nhập lại mã mời</td>
        <td>Thành viên đã ở trong nhóm dán lại mã mời lần 2.</td>
        <td>Thông báo: <em>"Bạn đã là thành viên của chuyến đi này rồi"</em>, không tạo bản ghi duplicate trong DB.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Thành viên tự Rời nhóm</td>
        <td>Thành viên bấm <em>"Rời nhóm"</em> và xác nhận.</td>
        <td>Thực thi <code>DELETE /trips/{id}/members/me</code> thành công, xóa khỏi chuyến, quay về danh sách My Trips.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Thêm trạm dừng lịch trình</td>
        <td>Thêm hoạt động vào Ngày 1 (giờ bắt đầu/kết thúc, tên hoạt động, chi phí dự kiến).</td>
        <td>Hoạt động hiển thị chuẩn timeline dọc, tính toán thời gian di chuyển giữa các trạm dừng.</td>
      </tr>
      <tr>
        <td><span class="badge badge-conflict">Cảnh báo xung đột</span></td>
        <td>Trùng khung giờ hoạt động</td>
        <td>Thêm 2 hoạt động cùng khung giờ (ví dụ cùng <em>09:00 - 11:30</em>).</td>
        <td>Hệ thống gắn nhãn cảnh báo vàng cam: <em>"Trùng thời gian với hoạt động khác"</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Đề xuất địa điểm & Biểu quyết</td>
        <td>Tạo đề xuất mới $\rightarrow$ Các thành viên bấm <strong>Upvote (+1)</strong>.</td>
        <td>Điểm vote tăng realtime trên các thiết bị; bấm lại nút vote sẽ giảm trừ (-1).</td>
      </tr>
      <tr>
        <td><span class="badge badge-role">Sai Role</span></td>
        <td>Vote khi biểu quyết đã ĐÓNG</td>
        <td>Trưởng nhóm chốt đóng vote, thành viên cố bấm Vote hoặc thêm đề xuất.</td>
        <td>Nút vote bị vô hiệu hóa; nếu cố gửi request sẽ bị từ chối: <em>"Biểu quyết đã đóng (Closed)"</em>.</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="page-break"></div>

<!-- ================= TV4 ================= -->
<div class="member-section">
  <div class="member-header">
    <h2>THÀNH VIÊN 4 (TV4): Thủ Quỹ, Quyết Toán Công Nợ & AI Planner</h2>
    <span class="member-role">Budget, Treasury & AI Co-Pilot</span>
  </div>
  <table>
    <thead>
      <tr>
        <th class="col-cat">Phân loại</th>
        <th class="col-scenario">Tình huống kiểm thử</th>
        <th class="col-action">Thao tác thực hiện</th>
        <th class="col-expected">Phản hồi kỳ vọng & Kết quả</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Ghi nhận chi phí đầy đủ</td>
        <td>Nhập tên khoản chi, số tiền, danh mục, người ứng tiền $\rightarrow$ Lưu.</td>
        <td>Lưu vào sổ quỹ, tự động cộng tổng chi tiêu và so sánh tỷ lệ % với ngân sách dự kiến ban đầu.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Dữ liệu sai</span></td>
        <td>Số tiền chi tiêu âm hoặc bằng 0</td>
        <td>Nhập số tiền <code>0 đ</code> hoặc <code>-50.000 đ</code>.</td>
        <td>Validate chặn ngay tại Client: <em>"Số tiền chi tiêu phải lớn hơn 0"</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Thuật toán VND</span></td>
        <td>Chia tiền số lẻ không tròn</td>
        <td>Nhập hóa đơn <strong>100.000 đ</strong> chia đều cho 3 người ($100.000 / 3 = 33.333,33...$).</td>
        <td>Thuật toán làm tròn chuẩn VND: 1 người chịu <strong>34.000 đ</strong>, 2 người chịu <strong>33.000 đ</strong>. <strong>Tổng tiền khớp 100.000 đ</strong>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Loại trừ người không tham gia</td>
        <td>Nhập bữa ăn 300.000 đ, bỏ tích thành viên vắng mặt.</td>
        <td>Tiền chỉ chia đều cho người có mặt (150.000 đ/người), công nợ người vắng mặt giữ <strong>chính xác 0 đ</strong>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Rút gọn bù trừ công nợ</td>
        <td>A nợ B 100k, B nợ C 100k $\rightarrow$ Mở Ma trận công nợ.</td>
        <td>Thuật toán rút gọn thông minh: A trả trực tiếp cho C 100k, giảm tối đa số lần chuyển khoản trung gian.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Quyết toán toàn bộ (Settle All)</td>
        <td>Bấm nút <em>"Quyết toán toàn bộ"</em> trong sổ quỹ.</td>
        <td>Toàn bộ các khoản nợ chuyển sang trạng thái <code>SETTLED</code>, dư nợ về 0 đ. Mở khóa cho TV2 xóa chuyến thành công.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>AI Planner sinh lịch trình</td>
        <td>Chọn điểm đến, thời lượng, phong cách du lịch $\rightarrow$ Bấm <em>"Lên lịch AI"</em>.</td>
        <td>AI sinh lịch trình theo cấu trúc JSON (địa điểm, thứ tự tối ưu tuyến đường, chi phí vé dự tính) $\rightarrow$ Lưu vào chuyến đi.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Ngoại lệ</span></td>
        <td>AI Service Timeout / Mất mạng</td>
        <td>Ngắt kết nối mạng hoặc server AI phản hồi chậm.</td>
        <td>Ứng dụng hiển thị thông báo lỗi nhẹ nhàng và nút <em>"Thử lại"</em> (Graceful Degradation), không crash.</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ================= TV5 ================= -->
<div class="member-section">
  <div class="member-header">
    <h2>THÀNH VIÊN 5 (TV5): Bản Đồ Tương Tác, Check-in & Bảng Tin An Toàn</h2>
    <span class="member-role">Map, GPS, Check-in & Community Safety</span>
  </div>
  <table>
    <thead>
      <tr>
        <th class="col-cat">Phân loại</th>
        <th class="col-scenario">Tình huống kiểm thử</th>
        <th class="col-action">Thao tác thực hiện</th>
        <th class="col-expected">Phản hồi kỳ vọng & Kết quả</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Định vị GPS & Chỉ đường</td>
        <td>Cấp quyền vị trí $\rightarrow$ Mở bản đồ $\rightarrow$ Bấm chọn trạm dừng.</td>
        <td>Hiển thị chấm xanh GPS thực tế, các ghim trạm dừng, tính toán cự ly (km), thời gian và vẽ lộ trình di chuyển.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Ngoại lệ</span></td>
        <td>Từ chối cấp quyền GPS</td>
        <td>Khi hệ điều hành hỏi xin quyền vị trí, bấm <em>"Không cho phép (Don't Allow)"</em>.</td>
        <td>Ứng dụng <strong>không bị crash</strong>; tự động ghim về tâm điểm đến chuyến đi kèm thông báo: <em>"Định vị đang tắt"</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Ngoại lệ</span></td>
        <td>Mất mạng khi xem bản đồ</td>
        <td>Ngắt kết nối Wifi/4G khi đang thao tác bản đồ.</td>
        <td>Bản đồ vẫn hiển thị các mảnh tile và trạm dừng đã lưu trong bộ nhớ cache, không trắng màn hình.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Check-in điểm hẹn hợp lệ</td>
        <td>Trưởng nhóm tạo điểm hẹn; thành viên đứng trong bán kính &lt; 500m bấm <em>"Check-in"</em>.</td>
        <td>Check-in thành công, trạng thái chuyển sang xanh, gửi thông báo đã có mặt cho các thành viên khác.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Gian lận</span></td>
        <td>Check-in gian lận khi ở quá xa</td>
        <td>Thành viên đang ở cách điểm hẹn 10km bấm nút <em>"Check-in điểm hẹn"</em>.</td>
        <td>Thuật toán Haversine phát hiện $\rightarrow$ Từ chối: <em>"Bạn đang ở quá xa điểm hẹn, hãy đến nơi để check-in"</em>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Đăng bài, Thả tim & Bình luận</td>
        <td>Nhập nội dung, chọn ảnh hợp lệ $\rightarrow$ Bấm đăng lên Bảng tin cộng đồng.</td>
        <td>Bài viết xuất hiện ngay trên feed, hỗ trợ like và comment theo thời gian thực.</td>
      </tr>
      <tr>
        <td><span class="badge badge-edge">Dữ liệu rỗng</span></td>
        <td>Đăng bài rỗng không có chữ & ảnh</td>
        <td>Không nhập chữ và không chọn ảnh $\rightarrow$ Thử bấm đăng.</td>
        <td>Nút Đăng bị vô hiệu hóa (disabled), ngăn chặn gửi dữ liệu rác lên server.</td>
      </tr>
      <tr>
        <td><span class="badge badge-happy">Luồng chuẩn</span></td>
        <td>Báo cáo vi phạm (Report Content)</td>
        <td>Bấm nút <em>Báo cáo vi phạm</em> trên bài viết của người khác (chọn lý do: Spam, Lừa đảo).</td>
        <td>Bài viết bị ẩn tạm thời trên feed người báo cáo và <strong>đẩy thẳng vào hàng đợi Web Admin của TV1</strong>.</td>
      </tr>
      <tr>
        <td><span class="badge badge-role">Sai Role</span></td>
        <td>Tự báo cáo bài của chính mình</td>
        <td>Người dùng mở bài viết do chính mình đăng lên.</td>
        <td>Nút <em>"Báo cáo"</em> bị ẩn hoàn toàn (chỉ hiển thị nút Sửa/Xóa bài viết).</td>
      </tr>
    </tbody>
  </table>
</div>

</body>
</html>
"""

temp_html = "temp_test_scenarios.html"
with open(temp_html, "w", encoding="utf-8") as f:
    f.write(html_content)

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
output_pdf = os.path.abspath("KICH_BAN_TEST_TOAN_DIEN_5_THANH_VIEN_VISTA.pdf")
input_html = os.path.abspath(temp_html)

cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    f"--print-to-pdf={output_pdf}",
    input_html
]

print("Printing PDF via Microsoft Edge Headless...")
res = subprocess.run(cmd, capture_output=True, text=True)
if os.path.exists(output_pdf):
    print("SUCCESS: PDF created at", output_pdf)
    print("File size:", os.path.getsize(output_pdf), "bytes")
else:
    print("FAILED:", res.stderr)
