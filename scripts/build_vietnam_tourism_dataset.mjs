import fs from "node:fs/promises";
import path from "node:path";
import { Workbook, SpreadsheetFile } from "file:///C:/Users/Lenovo%20LEGION%205/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const raw = `
An Giang|Đồng bằng sông Cửu Long|Rừng tràm Trà Sư~Sinh thái;Núi Cấm~Thiên nhiên;Miếu Bà Chúa Xứ Núi Sam~Tâm linh;Làng Chăm Châu Phong~Văn hóa
Bà Rịa - Vũng Tàu|Đông Nam Bộ|Bãi Sau Vũng Tàu~Biển;Côn Đảo~Biển đảo;Hồ Tràm~Biển;Khu di tích Minh Đạm~Lịch sử
Bắc Giang|Trung du và miền núi phía Bắc|Tây Yên Tử~Tâm linh;Chùa Vĩnh Nghiêm~Tâm linh;Hồ Cấm Sơn~Sinh thái;Khu bảo tồn Khe Rỗ~Sinh thái
Bắc Kạn|Trung du và miền núi phía Bắc|Hồ Ba Bể~Sinh thái;Động Hua Mạ~Hang động;Thác Đầu Đẳng~Thiên nhiên;ATK Chợ Đồn~Lịch sử
Bạc Liêu|Đồng bằng sông Cửu Long|Nhà Công tử Bạc Liêu~Lịch sử;Cánh đồng điện gió Bạc Liêu~Check-in;Chùa Xiêm Cán~Tâm linh;Khu lưu niệm Cao Văn Lầu~Văn hóa
Bắc Ninh|Đồng bằng sông Hồng|Chùa Dâu~Tâm linh;Chùa Bút Tháp~Tâm linh;Đền Đô~Lịch sử;Làng tranh Đông Hồ~Làng nghề
Bến Tre|Đồng bằng sông Cửu Long|Cồn Phụng~Sinh thái;Cồn Quy~Sinh thái;Khu du lịch Lan Vương~Vui chơi;Làng hoa Cái Mơn~Làng nghề
Bình Định|Duyên hải Nam Trung Bộ|Kỳ Co~Biển;Eo Gió~Thiên nhiên;Ghềnh Ráng Tiên Sa~Danh thắng;Tháp Đôi Quy Nhơn~Kiến trúc
Bình Dương|Đông Nam Bộ|Khu du lịch Đại Nam~Vui chơi;Chùa Hội Khánh~Tâm linh;Di tích Nhà tù Phú Lợi~Lịch sử;Vườn cây Lái Thiêu~Sinh thái
Bình Phước|Đông Nam Bộ|Vườn quốc gia Bù Gia Mập~Sinh thái;Hồ Suối Giai~Thiên nhiên;Núi Bà Rá~Thiên nhiên;Sóc Bom Bo~Văn hóa
Bình Thuận|Duyên hải Nam Trung Bộ|Mũi Né~Biển;Bàu Trắng~Thiên nhiên;Đảo Phú Quý~Biển đảo;Hải đăng Kê Gà~Kiến trúc
Cà Mau|Đồng bằng sông Cửu Long|Mũi Cà Mau~Danh thắng;Vườn quốc gia U Minh Hạ~Sinh thái;Hòn Đá Bạc~Biển đảo;Đầm Thị Tường~Sinh thái
Cần Thơ|Đồng bằng sông Cửu Long|Chợ nổi Cái Răng~Văn hóa;Nhà cổ Bình Thủy~Kiến trúc;Bến Ninh Kiều~Danh thắng;Thiền viện Trúc Lâm Phương Nam~Tâm linh
Cao Bằng|Trung du và miền núi phía Bắc|Thác Bản Giốc~Thiên nhiên;Khu di tích Pác Bó~Lịch sử;Động Ngườm Ngao~Hang động;Phia Oắc - Phia Đén~Sinh thái
Đà Nẵng|Duyên hải Nam Trung Bộ|Bà Nà Hills~Vui chơi;Bán đảo Sơn Trà~Sinh thái;Ngũ Hành Sơn~Danh thắng;Bãi biển Mỹ Khê~Biển
Đắk Lắk|Tây Nguyên|Buôn Đôn~Văn hóa;Hồ Lắk~Sinh thái;Thác Dray Nur~Thiên nhiên;Bảo tàng Thế giới Cà phê~Bảo tàng
Đắk Nông|Tây Nguyên|Tà Đùng~Sinh thái;Hệ thống hang động Chư Bluk~Hang động;Thác Liêng Nung~Thiên nhiên;Công viên địa chất Đắk Nông~Địa chất
Điện Biên|Trung du và miền núi phía Bắc|Đồi A1~Lịch sử;Hầm Đờ Cát~Lịch sử;Hồ Pá Khoang~Sinh thái;Sở chỉ huy Chiến dịch Điện Biên Phủ~Lịch sử
Đồng Nai|Đông Nam Bộ|Vườn quốc gia Cát Tiên~Sinh thái;Khu du lịch Bửu Long~Danh thắng;Đá Ba Chồng~Danh thắng;Hồ Trị An~Sinh thái
Đồng Tháp|Đồng bằng sông Cửu Long|Vườn quốc gia Tràm Chim~Sinh thái;Khu di tích Xẻo Quýt~Lịch sử;Khu du lịch Gáo Giồng~Sinh thái;Làng hoa Sa Đéc~Làng nghề
Gia Lai|Tây Nguyên|Biển Hồ T'Nưng~Thiên nhiên;Núi lửa Chư Đăng Ya~Địa chất;Chùa Minh Thành~Tâm linh;Vườn quốc gia Kon Ka Kinh~Sinh thái
Hà Giang|Trung du và miền núi phía Bắc|Đèo Mã Pí Lèng~Thiên nhiên;Phố cổ Đồng Văn~Văn hóa;Cột cờ Lũng Cú~Danh thắng;Ruộng bậc thang Hoàng Su Phì~Danh thắng
Hà Nam|Đồng bằng sông Hồng|Chùa Tam Chúc~Tâm linh;Chùa Địa Tạng Phi Lai~Tâm linh;Nhà Bá Kiến~Văn hóa;Ngũ Động Sơn~Hang động
Hà Nội|Đồng bằng sông Hồng|Hồ Hoàn Kiếm~Danh thắng;Văn Miếu - Quốc Tử Giám~Lịch sử;Hoàng thành Thăng Long~Lịch sử;Làng cổ Đường Lâm~Văn hóa
Hà Tĩnh|Bắc Trung Bộ|Biển Thiên Cầm~Biển;Ngã ba Đồng Lộc~Lịch sử;Chùa Hương Tích~Tâm linh;Hồ Kẻ Gỗ~Sinh thái
Hải Dương|Đồng bằng sông Hồng|Côn Sơn - Kiếp Bạc~Lịch sử;Đền thờ Chu Văn An~Tâm linh;Đảo Cò Chi Lăng Nam~Sinh thái;Làng gốm Chu Đậu~Làng nghề
Hải Phòng|Đồng bằng sông Hồng|Quần đảo Cát Bà~Biển đảo;Bãi biển Đồ Sơn~Biển;Vịnh Lan Hạ~Biển đảo;Tuyệt Tình Cốc Thủy Nguyên~Danh thắng
Hậu Giang|Đồng bằng sông Cửu Long|Khu bảo tồn Lung Ngọc Hoàng~Sinh thái;Chợ nổi Ngã Bảy~Văn hóa;Thiền viện Trúc Lâm Hậu Giang~Tâm linh;Vùng khóm Cầu Đúc~Nông nghiệp
Hòa Bình|Trung du và miền núi phía Bắc|Mai Châu~Văn hóa;Thung Nai~Sinh thái;Nhà máy thủy điện Hòa Bình~Công trình;Suối khoáng Kim Bôi~Nghỉ dưỡng
Hưng Yên|Đồng bằng sông Hồng|Phố Hiến~Lịch sử;Đền Chử Đồng Tử~Tâm linh;Làng Nôm~Văn hóa;Đền Mẫu Hưng Yên~Tâm linh
Khánh Hòa|Duyên hải Nam Trung Bộ|Hòn Mun~Biển đảo;Vịnh Ninh Vân~Biển;Tháp Bà Ponagar~Kiến trúc;VinWonders Nha Trang~Vui chơi
Kiên Giang|Đồng bằng sông Cửu Long|Đảo Phú Quốc~Biển đảo;Quần đảo Nam Du~Biển đảo;Hà Tiên~Danh thắng;Vườn quốc gia U Minh Thượng~Sinh thái
Kon Tum|Tây Nguyên|Măng Đen~Sinh thái;Nhà thờ gỗ Kon Tum~Kiến trúc;Cầu treo Kon Klor~Danh thắng;Núi Ngọc Linh~Thiên nhiên
Lai Châu|Trung du và miền núi phía Bắc|Đèo Ô Quy Hồ~Thiên nhiên;Cao nguyên Sìn Hồ~Sinh thái;Đỉnh Pu Ta Leng~Trekking;Bản Sin Suối Hồ~Văn hóa
Lâm Đồng|Tây Nguyên|Hồ Xuân Hương~Danh thắng;Núi Langbiang~Thiên nhiên;Thác Datanla~Thiên nhiên;Đồi chè Cầu Đất~Nông nghiệp
Lạng Sơn|Trung du và miền núi phía Bắc|Mẫu Sơn~Sinh thái;Động Tam Thanh~Hang động;Ải Chi Lăng~Lịch sử;Núi Tô Thị~Danh thắng
Lào Cai|Trung du và miền núi phía Bắc|Sa Pa~Nghỉ dưỡng;Đỉnh Fansipan~Trekking;Y Tý~Sinh thái;Chợ phiên Bắc Hà~Văn hóa
Long An|Đồng bằng sông Cửu Long|Khu bảo tồn Láng Sen~Sinh thái;Làng nổi Tân Lập~Sinh thái;Nhà Trăm Cột~Kiến trúc;Làng cổ Phước Lộc Thọ~Văn hóa
Nam Định|Đồng bằng sông Hồng|Phủ Dầy~Tâm linh;Chùa Cổ Lễ~Tâm linh;Nhà thờ đổ Hải Lý~Kiến trúc;Vườn quốc gia Xuân Thủy~Sinh thái
Nghệ An|Bắc Trung Bộ|Khu di tích Kim Liên~Lịch sử;Biển Cửa Lò~Biển;Vườn quốc gia Pù Mát~Sinh thái;Đảo chè Thanh Chương~Nông nghiệp
Ninh Bình|Đồng bằng sông Hồng|Quần thể Tràng An~Danh thắng;Tam Cốc - Bích Động~Danh thắng;Chùa Bái Đính~Tâm linh;Hang Múa~Danh thắng
Ninh Thuận|Duyên hải Nam Trung Bộ|Vịnh Vĩnh Hy~Biển;Vườn quốc gia Núi Chúa~Sinh thái;Hang Rái~Danh thắng;Đồi cát Nam Cương~Thiên nhiên
Phú Thọ|Trung du và miền núi phía Bắc|Khu di tích Đền Hùng~Lịch sử;Vườn quốc gia Xuân Sơn~Sinh thái;Đồi chè Long Cốc~Nông nghiệp;Đầm Ao Châu~Sinh thái
Phú Yên|Duyên hải Nam Trung Bộ|Gành Đá Đĩa~Địa chất;Mũi Điện~Danh thắng;Bãi Xép~Biển;Vịnh Vũng Rô~Biển
Quảng Bình|Bắc Trung Bộ|Động Phong Nha~Hang động;Hang Sơn Đoòng~Hang động;Động Thiên Đường~Hang động;Biển Nhật Lệ~Biển
Quảng Nam|Duyên hải Nam Trung Bộ|Phố cổ Hội An~Di sản;Thánh địa Mỹ Sơn~Di sản;Cù Lao Chàm~Biển đảo;Rừng dừa Bảy Mẫu~Sinh thái
Quảng Ngãi|Duyên hải Nam Trung Bộ|Đảo Lý Sơn~Biển đảo;Sa Huỳnh~Văn hóa;Thác Trắng Minh Long~Thiên nhiên;Khu chứng tích Sơn Mỹ~Lịch sử
Quảng Ninh|Đồng bằng sông Hồng|Vịnh Hạ Long~Di sản;Yên Tử~Tâm linh;Đảo Cô Tô~Biển đảo;Bình Liêu~Sinh thái
Quảng Trị|Bắc Trung Bộ|Thành cổ Quảng Trị~Lịch sử;Địa đạo Vịnh Mốc~Lịch sử;Cầu Hiền Lương - Sông Bến Hải~Lịch sử;Di tích sân bay Tà Cơn~Lịch sử
Sóc Trăng|Đồng bằng sông Cửu Long|Chùa Dơi~Tâm linh;Chùa Chén Kiểu~Tâm linh;Chùa Kh'leang~Tâm linh;Chợ nổi Ngã Năm~Văn hóa
Sơn La|Trung du và miền núi phía Bắc|Cao nguyên Mộc Châu~Sinh thái;Tà Xùa~Trekking;Ngọc Chiến~Văn hóa;Nhà tù Sơn La~Lịch sử
Tây Ninh|Đông Nam Bộ|Núi Bà Đen~Tâm linh;Tòa Thánh Cao Đài~Tâm linh;Hồ Dầu Tiếng~Sinh thái;Ma Thiên Lãnh~Thiên nhiên
Thái Bình|Đồng bằng sông Hồng|Chùa Keo~Tâm linh;Cồn Vành~Biển;Cồn Đen~Sinh thái;Đền Trần Thái Bình~Lịch sử
Thái Nguyên|Trung du và miền núi phía Bắc|Hồ Núi Cốc~Sinh thái;ATK Định Hóa~Lịch sử;Bảo tàng Văn hóa các dân tộc Việt Nam~Bảo tàng;Đồi chè Tân Cương~Nông nghiệp
Thanh Hóa|Bắc Trung Bộ|Biển Sầm Sơn~Biển;Khu di tích Lam Kinh~Lịch sử;Pù Luông~Sinh thái;Thành Nhà Hồ~Di sản
Thừa Thiên Huế|Bắc Trung Bộ|Đại Nội Huế~Di sản;Chùa Thiên Mụ~Tâm linh;Lăng Khải Định~Kiến trúc;Vịnh Lăng Cô~Biển
Tiền Giang|Đồng bằng sông Cửu Long|Cù lao Thới Sơn~Sinh thái;Chùa Vĩnh Tràng~Tâm linh;Chợ nổi Cái Bè~Văn hóa;Biển Tân Thành~Biển
Thành phố Hồ Chí Minh|Đông Nam Bộ|Dinh Độc Lập~Lịch sử;Chợ Bến Thành~Văn hóa;Địa đạo Củ Chi~Lịch sử;Bưu điện Thành phố~Kiến trúc
Trà Vinh|Đồng bằng sông Cửu Long|Ao Bà Om~Danh thắng;Chùa Âng~Tâm linh;Chùa Hang~Tâm linh;Biển Ba Động~Biển
Tuyên Quang|Trung du và miền núi phía Bắc|Na Hang - Lâm Bình~Sinh thái;Khu di tích Tân Trào~Lịch sử;Thác Bản Ba~Thiên nhiên;Suối khoáng Mỹ Lâm~Nghỉ dưỡng
Vĩnh Long|Đồng bằng sông Cửu Long|Cù lao An Bình~Sinh thái;Làng gốm Mang Thít~Làng nghề;Văn Thánh Miếu Vĩnh Long~Lịch sử;Chùa Phước Hậu~Tâm linh
Vĩnh Phúc|Đồng bằng sông Hồng|Tam Đảo~Nghỉ dưỡng;Thiền viện Trúc Lâm Tây Thiên~Tâm linh;Hồ Đại Lải~Nghỉ dưỡng;Làng gốm Hương Canh~Làng nghề
Yên Bái|Trung du và miền núi phía Bắc|Ruộng bậc thang Mù Cang Chải~Danh thắng;Suối Giàng~Sinh thái;Hồ Thác Bà~Sinh thái;Thung lũng Tú Lệ~Danh thắng
`.trim();

const slugify = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const provinces = raw.split("\n").map(line => {
  const [province, region, attractions] = line.split("|");
  return { province, region, attractions: attractions.split(";").map(x => { const [name, category] = x.split("~"); return { name, category }; }) };
});

const categoryText = {
  "Biển":"điểm đến biển nổi bật", "Biển đảo":"không gian biển đảo tiêu biểu", "Sinh thái":"điểm du lịch sinh thái", "Thiên nhiên":"cảnh quan thiên nhiên", "Danh thắng":"danh thắng nổi bật", "Tâm linh":"điểm du lịch văn hóa tâm linh", "Lịch sử":"di tích lịch sử", "Văn hóa":"điểm trải nghiệm văn hóa địa phương", "Kiến trúc":"công trình kiến trúc đặc sắc", "Làng nghề":"làng nghề truyền thống", "Vui chơi":"khu vui chơi và trải nghiệm", "Hang động":"điểm khám phá hang động", "Di sản":"điểm di sản tiêu biểu", "Địa chất":"điểm tham quan địa chất", "Bảo tàng":"không gian bảo tàng", "Trekking":"điểm trekking và khám phá", "Nghỉ dưỡng":"điểm nghỉ dưỡng", "Nông nghiệp":"điểm trải nghiệm nông nghiệp", "Công trình":"công trình tham quan"
};

const rows = [];
for (const p of provinces) {
  p.attractions.forEach((a, i) => rows.push({
    id: `VN-${String(rows.length + 1).padStart(3,"0")}`,
    slug: slugify(`${a.name}-${p.province}`),
    name: a.name,
    province_legacy_63: p.province,
    region: p.region,
    category: a.category,
    short_description: `${a.name} là ${categoryText[a.category] || "điểm tham quan"} tại ${p.province}, phù hợp để đưa vào hành trình khám phá địa phương.`,
    featured_rank_in_province: i + 1,
    source_status: "Biên tập ban đầu - cần xác minh chi tiết vận hành",
    is_active: true
  }));
}

if (provinces.length !== 63) throw new Error(`Expected 63 provinces, got ${provinces.length}`);
if (rows.length !== 252) throw new Error(`Expected 252 attractions, got ${rows.length}`);
const dupNames = rows.filter((r,i) => rows.findIndex(x => x.slug === r.slug) !== i);
if (dupNames.length) throw new Error(`Duplicate slugs: ${dupNames.map(x=>x.slug).join(", ")}`);

const outDir = path.resolve("outputs/vietnam-tourism-legacy-63");
await fs.mkdir(outDir, { recursive: true });

const headers = Object.keys(rows[0]);
const escapeCsv = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s; };
const csv = [headers.join(","), ...rows.map(r => headers.map(h => escapeCsv(r[h])).join(","))].join("\r\n");
await fs.writeFile(path.join(outDir,"vietnam_tourism_252.csv"), "\uFEFF" + csv, "utf8");
await fs.writeFile(path.join(outDir,"vietnam_tourism_252.json"), JSON.stringify({
  metadata: { title:"Địa điểm du lịch Việt Nam theo 63 tỉnh/thành (địa giới trước 2025)", record_count:rows.length, province_count:provinces.length, generated_at:"2026-10-20", administrative_note:"Trường province_legacy_63 sử dụng 63 tỉnh/thành trước khi Nghị quyết 202/2025/QH15 có hiệu lực; không phản ánh danh mục 34 đơn vị cấp tỉnh hiện hành.", quality_note:"Danh sách phục vụ seed dữ liệu và thiết kế sản phẩm. Cần xác minh giờ mở cửa, giá vé, tọa độ và tình trạng vận hành trước khi phát hành cho người dùng." },
  places: rows
}, null, 2), "utf8");

const wb = Workbook.create();
const summary = wb.worksheets.add("Tổng quan");
const data = wb.worksheets.add("Địa điểm");
summary.showGridLines = false; data.showGridLines = false;
summary.getRange("A2:H2").merge();
summary.getRange("A2").values = [["Dữ liệu địa điểm du lịch Việt Nam"]];
summary.getRange("A2").format = { font:{name:"Arial",size:16,bold:true,color:"#12345B"}, verticalAlignment:"center" };
summary.getRange("A3:H3").merge();
summary.getRange("A3").values = [["252 địa điểm tiêu biểu theo danh sách 63 tỉnh/thành trước sắp xếp hành chính năm 2025"]];
summary.getRange("A3").format = { font:{name:"Arial",size:10,italic:true,color:"#526D82"} };
summary.getRange("A5:B8").values = [["Chỉ tiêu","Giá trị"],["Số địa điểm",rows.length],["Số tỉnh/thành",provinces.length],["Số vùng",new Set(rows.map(r=>r.region)).size]];
summary.getRange("D5:E5").values = [["Lưu ý dữ liệu", "Nội dung"]];
summary.getRange("D6:E8").values = [["Địa giới","province_legacy_63 giữ tên 63 tỉnh/thành trước năm 2025."],["Mục đích","Dùng làm seed data cho UI, tìm kiếm và thiết kế hành trình."],["Cần bổ sung","Xác minh tọa độ, giờ mở cửa, giá vé, ảnh và trạng thái vận hành trước production."]];
summary.getRange("A5:B5").format = summary.getRange("D5:E5").format = {fill:"#38A9F0",font:{name:"Arial",size:10,bold:true,color:"#FFFFFF"},horizontalAlignment:"center",verticalAlignment:"center"};
summary.getRange("A6:B8").format.font = summary.getRange("D6:E8").format.font = {name:"Arial",size:10,color:"#12345B"};
summary.getRange("A5:B8").format.borders = summary.getRange("D5:E8").format.borders = {preset:"outside",style:"thin",color:"#CFE8F8"};
summary.getRange("A5:E8").format.verticalAlignment = "center";
summary.getRange("E6:E8").format.wrapText = true;
summary.getRange("A5:A8").format.columnWidthPx = 150; summary.getRange("B5:B8").format.columnWidthPx = 90;
summary.getRange("D5:D8").format.columnWidthPx = 110; summary.getRange("E5:E8").format.columnWidthPx = 430;
summary.getRange("D6:E8").format.rowHeightPx = 40;

const matrix = [headers, ...rows.map(r=>headers.map(h=>r[h]))];
data.getRange("A1").write(matrix);
data.getRange(`A1:J${rows.length+1}`).format.font = {name:"Arial",size:9,color:"#12345B"};
data.getRange("A1:J1").format = {fill:"#1976C9",font:{name:"Arial",size:9,bold:true,color:"#FFFFFF"},horizontalAlignment:"center",verticalAlignment:"center",wrapText:true};
data.getRange(`A2:J${rows.length+1}`).format.verticalAlignment = "center";
data.getRange(`G2:G${rows.length+1}`).format.wrapText = true;
data.getRange(`H2:H${rows.length+1}`).format.numberFormat = "0";
data.getRange(`I2:J${rows.length+1}`).format.horizontalAlignment = "center";
const widths = [75,220,210,160,190,100,420,90,230,75];
widths.forEach((w,i)=>data.getRangeByIndexes(0,i,rows.length+1,1).format.columnWidthPx=w);
data.getRange("A1:I1").format.rowHeightPx = 34;
data.freezePanes.freezeRows(1); data.freezePanes.freezeColumns(3);
const table = data.tables.add(`A1:J${rows.length+1}`, true, "TourismPlacesTable");
table.style = "TableStyleMedium2";
table.showFilterButton = true;
data.getRange(`F2:F${rows.length+1}`).conditionalFormats.add("colorScale", {colors:["#E8F5FF","#BDE6FF","#77C7F5"],thresholds:["min",{type:"percentile",value:50},"max"]});

wb.recalculate();
console.log((await wb.inspect({kind:"table",sheetId:"Địa điểm",range:"A1:J8",include:"values,formulas",tableMaxRows:8,tableMaxCols:10,maxChars:5000})).ndjson);
console.log((await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",options:{useRegex:true,maxResults:100},summary:"final formula error scan"})).ndjson);
const preview = await wb.render({sheetName:"Tổng quan",range:"A1:H11",scale:1.5,format:"png"});
await fs.writeFile(path.join(outDir,"preview.png"), new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(path.join(outDir,"vietnam_tourism_252.xlsx"));
console.log(JSON.stringify({province_count:provinces.length,record_count:rows.length,output_dir:outDir},null,2));
