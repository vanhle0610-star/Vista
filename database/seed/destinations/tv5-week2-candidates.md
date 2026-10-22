# Đóng góp TV5 tuần 2 — 10 địa điểm để TV1 duyệt

CSV giữ đúng 12 cột của sample.schema.csv. Có 10 tên mới so với bộ 60 trong demo_destinations_seed.csv tại thời điểm kiểm kê. Đã chuẩn bị 10 ảnh thumbnail local và thông tin nguồn/tác giả/giấy phép trong [photo credits](tv5-week2-photo-credits.json). Chưa seed hoặc upload lên môi trường chung.

Nguồn tên địa danh được tra cứu ngày 22/10/2026; verified_at xác nhận nguồn dữ liệu đã kiểm tra, không xác nhận giá, giờ đón khách hay tình trạng mở cửa. Bài về Lăng Cô/Lập An trên vietnamtourism.gov.vn có nội dung trong chỉ mục tìm kiếm nhưng bản đọc trực tiếp bị giới hạn; TV1 cần đối chiếu trước duyệt. Tên tỉnh giữ theo danh mục repository (Thừa Thiên Huế, Quảng Nam), cần ánh xạ nếu nhóm thay danh mục hành chính.

## Tọa độ

Sáu tọa độ được đối chiếu nguồn, làm tròn 6 chữ số thập phân. Là điểm đại diện địa danh, không phải xác nhận cổng vào hoặc đường đi có thể tiếp cận. Bản đồ mobile hiện lấy 60 điểm từ API TV1; không dùng CSV này làm fallback khi API lỗi.

| Địa điểm | Nguồn tọa độ |
|---|---|
| Non Nước | [OSM way 1204900824](https://www.openstreetmap.org/way/1204900824) |
| Mỹ Sơn | [UNESCO](https://whc.unesco.org/en/list/949/), DMS N15 46 25.835 E108 6 33.008 đổi sang thập phân |
| Từ Hiếu | [OSM way 519775822](https://www.openstreetmap.org/way/519775822) |
| Thanh Toàn | [OSM node 13503143701](https://www.openstreetmap.org/node/13503143701) |
| An Định | [OSM way 1172897446](https://www.openstreetmap.org/way/1172897446) |
| Bạch Mã | [OSM relation 7122565](https://www.openstreetmap.org/relation/7122565), điểm đại diện vùng vườn quốc gia |

Để trống tọa độ của Vịnh Lăng Cô, Đầm Lập An, Thuận An và Kim Bồng vì kết quả geocoder trống hoặc lệch loại địa danh/khu vực. Không lấy ga Lăng Cô, quán bar tại Thuận An hoặc khu dân cư Hòa Xuân làm điểm đến tương ứng. TV1 cần đối chiếu GIS/cổng vào phù hợp trước đưa vào map.

Phần tọa độ OSM: © OpenStreetMap contributors, ODbL 1.0; [giấy phép](https://www.openstreetmap.org/copyright). Metadata thô ở artifacts/tv5-mobile/source-metadata-initial.json và source-metadata.json chứa cả kết quả bị loại, không phải danh sách tọa độ đã duyệt. Giá để trống và opening_hours={} vì chưa xác minh; không diễn giải trường trống là miễn phí hoặc mở 24/7.

## Ảnh

Ảnh đã tải tại images/tv5/photo-01.jpg tới photo-10.jpg, được xem lại trực quan và đối chiếu caption nguồn. image_reference có dạng destinations/tv5/photo-01.jpg là khóa đích dự kiến; TV1 upload tới Storage tương ứng rồi mới import, không coi khóa này đã tồn tại trên server. Không hotlink ảnh khi chạy app.

tv5-week2-photo-credits.json ghi từng ảnh: địa điểm, tên Commons, nguồn file gốc, tác giả, license, license URL, thay đổi và SHA256. Ảnh gồm Public domain, CC BY 2.0/4.0 và CC BY-SA 3.0. Giữ attribution khi phân phối; với bản biến đổi ảnh CC BY-SA giữ điều kiện ShareAlike. Các thumbnail do Commons cung cấp, không chỉnh sửa thêm. Metadata đầy đủ: artifacts/tv5-mobile/selected-photo-metadata.json.

## Làm mới nguồn

Chạy verify-tv5-source-metadata.ps1 -FetchPublicMetadata từ PowerShell để lấy lại metadata công khai theo đúng tên ảnh đã duyệt và geocoder tuần tự cách nhau ít nhất 1.2 giây. Script chỉ lưu source-refresh.json, không tự sửa CSV hoặc chấp nhận kết quả geocoder. Không gửi GPS, token hay dữ liệu người dùng. Phải rà định danh địa điểm/giấy phép trước khi cập nhật dữ liệu đã duyệt.
