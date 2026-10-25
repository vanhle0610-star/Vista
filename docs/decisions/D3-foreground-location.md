# D3 — Vị trí foreground và lựa chọn tự định vị

Ngày: 24/10/2026. Phạm vi hiện tại: vị trí cá nhân trên bản đồ TV5 tuần 1–3.

VISTA chỉ lấy vị trí khi màn bản đồ đang hoạt động. Lần đầu hiển thị giải thích và hai lựa chọn “Cho phép định vị”/“Để sau”; chỉ thao tác đồng ý mới gọi yêu cầu quyền hệ thống. Lưu một lựa chọn bật/tắt, không lưu tọa độ. Web dùng localStorage cho lựa chọn, mobile dùng Expo SecureStore.

Những lần sau, ý muốn đã lưu **và** quyền hệ thống hiện còn granted mới cho phép tự lấy lại vị trí. Web dùng Permissions API khi khả dụng; nếu không kiểm tra được thì chờ thao tác người dùng. Mobile kiểm tra quyền foreground, dịch vụ vị trí, screen focus và AppState. Quyền gần đúng được thể hiện như vị trí gần đúng; ứng dụng không tự bật GPS hệ thống.

Ưu tiên một lần lấy vị trí. Web dùng getCurrentPosition và bỏ callback cũ bằng generation khi rời màn/ẩn tab/tắt định vị/thu hồi quyền. Mobile dùng subscription ngắn đến khi có một fix, lỗi hoặc timeout 15 giây rồi remove; về nền hoặc mất focus hủy ngay. Khi trở lại foreground, kiểm tra quyền lại trước khi lấy mới. Tắt tự định vị xóa vị trí đang sử dụng và ngăn tự tiếp tục.

Khi người dùng chủ động tính tuyến từ vị trí của mình, tọa độ đi qua Spring Boot rồi gửi tới openrouteservice. Không tự gửi cho nhóm, không ghi lịch sử di chuyển và không log tọa độ/token trong module. Camera chỉ di chuyển theo thao tác chọn địa điểm, yêu cầu “Vị trí của tôi” hoặc tuyến mới; không kéo theo từng render.

Quyết định polling nhóm 10–15 giây của roadmap là ranh giới cho giai đoạn chia sẻ vị trí về sau; **chưa triển khai chia sẻ vị trí nhóm trong phạm vi này**. Mock polling nằm trong test-support, không phải bằng chứng đo giữa hai máy. Spike GPS trên điện thoại thật và đo giữa hai thiết bị: chưa kiểm chứng.

Nguồn: [Expo Location SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/location/). Kiểm thử tự động: `web/scripts/test-map-gps.mjs` và `mobile/src/features/map/__tests__/` dùng API thiết bị được mock; không thay thế kiểm thử phần cứng.
