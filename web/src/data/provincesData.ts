export interface DestinationOption {
  id: string;
  nameVi: string;
  province: string;
  region: 'Bắc' | 'Trung' | 'Nam';
  lat: number;
  lng: number;
  photo: string;
}

export function normalizeVn(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

export function matchProvince(query: string, option: DestinationOption): boolean {
  if (!query || !query.trim()) return true;
  const qNorm = normalizeVn(query);
  const nameNorm = normalizeVn(option.nameVi);
  const provNorm = normalizeVn(option.province);
  const idNorm = normalizeVn(option.id);

  // Exact or substring match on normalized names
  if (nameNorm.includes(qNorm) || provNorm.includes(qNorm) || idNorm.includes(qNorm)) {
    return true;
  }

  // Prefix match for partial typing (e.g., user types "Đà S" -> words starting with "da" + "s")
  const qWords = qNorm.split(/\s+/).filter(Boolean);
  const targetWords = `${nameNorm} ${provNorm}`.split(/\s+/).filter(Boolean);
  return qWords.every((qw) => targetWords.some((tw) => tw.startsWith(qw) || tw.includes(qw)));
}

export const VIETNAM_63_PROVINCES: DestinationOption[] = [
  // Top 10 Major Tourist Hubs
  { id: 'danang', nameVi: 'Đà Nẵng', province: 'Đà Nẵng', region: 'Trung', lat: 16.0544, lng: 108.2022, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/danang_real.jpg' },
  { id: 'hanoi', nameVi: 'Hà Nội', province: 'Hà Nội', region: 'Bắc', lat: 21.0285, lng: 105.8542, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hanoi_real.jpg' },
  { id: 'saigon', nameVi: 'TP. Hồ Chí Minh', province: 'Hồ Chí Minh', region: 'Nam', lat: 10.7769, lng: 106.7009, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/saigon_real.jpg' },
  { id: 'phuquoc', nameVi: 'Phú Quốc (Kiên Giang)', province: 'Kiên Giang', region: 'Nam', lat: 10.2899, lng: 103.9840, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/phuquoc_real.jpg' },
  { id: 'lamdong', nameVi: 'Đà Lạt (Lâm Đồng)', province: 'Lâm Đồng', region: 'Trung', lat: 11.9404, lng: 108.4583, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/dalat_real.jpg' },
  { id: 'khanhhoa', nameVi: 'Nha Trang (Khánh Hòa)', province: 'Khánh Hòa', region: 'Trung', lat: 12.2388, lng: 109.1967, photo: 'https://cdn.findtour.vn/media/articles/1ff1f59e-734b-4b4f-63a3-08dc164bd1fd/anh%20bia.160124113008429.jpg?mode=crop&quality=99&width=1920' },
  { id: 'quangnam', nameVi: 'Hội An (Quảng Nam)', province: 'Quảng Nam', region: 'Trung', lat: 15.8801, lng: 108.3380, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hoian_real.jpg' },
  { id: 'laocai', nameVi: 'Sa Pa (Lào Cai)', province: 'Lào Cai', region: 'Bắc', lat: 22.3364, lng: 103.8438, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/sapa_real.jpg' },
  { id: 'quangninh', nameVi: 'Hạ Long (Quảng Ninh)', province: 'Quảng Ninh', region: 'Bắc', lat: 20.9505, lng: 107.0734, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/halong_real.jpg' },
  { id: 'ninhbinh', nameVi: 'Ninh Bình', province: 'Ninh Bình', region: 'Bắc', lat: 20.2506, lng: 105.9745, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/ninhbinh_real.jpg' },
  { id: 'hue', nameVi: 'Thừa Thiên Huế', province: 'Thừa Thiên Huế', region: 'Trung', lat: 16.4637, lng: 107.5909, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/hue_real.jpg' },
  { id: 'vungtau', nameVi: 'Vũng Tàu (Bà Rịa - Vũng Tàu)', province: 'Bà Rịa - Vũng Tàu', region: 'Nam', lat: 10.3460, lng: 107.0843, photo: 'https://static.vinwonders.com/production/2025/05/ngon-hai-dang-o-vung-tau.jpg' },
  { id: 'binhdinh', nameVi: 'Quy Nhơn (Bình Định)', province: 'Bình Định', region: 'Trung', lat: 13.7820, lng: 109.2194, photo: 'https://cdn2.tuoitre.vn/471584752817336320/2025/7/6/base64-17517970891451842881025.jpeg' },
  { id: 'quangbinh', nameVi: 'Phong Nha (Quảng Bình)', province: 'Quảng Bình', region: 'Trung', lat: 17.5833, lng: 106.2833, photo: 'https://www.vietnamairlines.com/content/dam/legacy-site-assets/SEO-images/2025%20SEO/Traffic%20TA/MB/en-cave/visitors-to-en-cave-often-spend-hours-simply-admiring-and-photographing-these-natural-wonders.jpg' },
  { id: 'hatinh', nameVi: 'Hà Tĩnh', province: 'Hà Tĩnh', region: 'Trung', lat: 18.3432, lng: 105.9059, photo: 'https://cdn.baohatinh.vn/images/95001fd96cbfed4a6372e11012113e1286eadc5b6a1120375dc0d2b4270b4138686159c5fe3fb8fc097ee660c6b14278/bht_brd_22.jpg' },

  // Remaining Provinces of Vietnam (alphabetical)
  { id: 'angiang', nameVi: 'An Giang', province: 'An Giang', region: 'Nam', lat: 10.4831, lng: 105.2262, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/angiang_trasu.jpg' },
  { id: 'bacgiang', nameVi: 'Bắc Giang', province: 'Bắc Giang', region: 'Bắc', lat: 21.3268, lng: 106.3154, photo: 'https://pystravel.vn/_next/image?q=75&url=https%3A%2F%2Fbooking.pystravel.vn%2Fuploads%2Fposts%2Falbums%2F17316%2F18376d5813d19f0bafb480fdaf2aaa1b.jpg&w=1920' },
  { id: 'backan', nameVi: 'Bắc Kạn (Hồ Ba Bể)', province: 'Bắc Kạn', region: 'Bắc', lat: 22.2572, lng: 105.8205, photo: 'https://ik.imagekit.io/tvlk/blog/2024/02/go-and-share-kham-pha-dong-hua-ma-bac-kan-7.webp' },
  { id: 'baclieu', nameVi: 'Bạc Liêu', province: 'Bạc Liêu', region: 'Nam', lat: 9.2941, lng: 105.7278, photo: 'https://ik.imagekit.io/tvlk/blog/2023/08/vuon-chim-Bac-Lieu-1.jpg?tr=dpr-2%2Cw-675' },
  { id: 'bacninh', nameVi: 'Bắc Ninh', province: 'Bắc Ninh', region: 'Bắc', lat: 21.1861, lng: 106.0763, photo: 'https://image.giacngo.vn/w770/Uploaded/2026/xpcwvolc/2026_03_09/vietgoing-rle2106159117-191-937.jpg.webp' },
  { id: 'bentre', nameVi: 'Bến Tre', province: 'Bến Tre', region: 'Nam', lat: 10.2415, lng: 106.3759, photo: 'https://bentrelogistics.com/wp-content/uploads/2024/09/CON-PHUNG.jpg' },
  { id: 'binhduong', nameVi: 'Bình Dương', province: 'Bình Dương', region: 'Nam', lat: 11.1606, lng: 106.6661, photo: 'https://i.ex-cdn.com/phatgiao.org.vn/files/content/2022/12/07/7-1913.jpg' },
  { id: 'binhphuoc', nameVi: 'Bình Phước', province: 'Bình Phước', region: 'Nam', lat: 11.7512, lng: 106.9168, photo: 'https://imagevietnam.vnanet.vn/Upload/2012/5/15/15-5DL04BaoAnh1552012141933239.jpg' },
  { id: 'binhthuan', nameVi: 'Mũi Né (Bình Thuận)', province: 'Bình Thuận', region: 'Trung', lat: 10.9804, lng: 108.2615, photo: 'https://product.hstatic.net/200000637161/product/du_lich_phu_quy__adf846c9c9444efabd8b9484ca614840_grande.jpeg' },
  { id: 'camau', nameVi: 'Đất Mũi (Cà Mau)', province: 'Cà Mau', region: 'Nam', lat: 9.1769, lng: 105.1524, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/camau_real.jpg' },
  { id: 'cantho', nameVi: 'Cần Thơ', province: 'Cần Thơ', region: 'Nam', lat: 10.0452, lng: 105.7469, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/cantho_cairang.jpg' },
  { id: 'caobang', nameVi: 'Cao Bằng (Thác Bản Giốc)', province: 'Cao Bằng', region: 'Bắc', lat: 22.6657, lng: 105.9739, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bangioc9tam.jpg/800px-Bangioc9tam.jpg' },
  { id: 'daklak', nameVi: 'Đắk Lắk (Buôn Ma Thuột)', province: 'Đắk Lắk', region: 'Trung', lat: 12.6667, lng: 108.0500, photo: 'https://cdn.xanhsm.com/2024/12/b400b825-buon-don-dak-lak-01.jpg' },
  { id: 'daknong', nameVi: 'Đắk Nông (Tà Đùng)', province: 'Đắk Nông', region: 'Trung', lat: 12.0000, lng: 107.7000, photo: 'https://danviet.ex-cdn.com/files/f1/296231569849192448/2022/2/28/saostar-88hcbv04hbi1yzlu-1646010506593-1646010506792753529682.jpg' },
  { id: 'dienbien', nameVi: 'Điện Biên', province: 'Điện Biên', region: 'Bắc', lat: 21.3860, lng: 103.0230, photo: 'https://vnanet.vn/Data/Articles/2020/06/25/4817876/vna_potal_du_lich_viet_nam_di_tich_cap_quoc_gia_thanh_ban_phu_-_den_tho_hoang_cong_chat_o_dien_bien_070712670_stand.jpg' },
  { id: 'dongnai', nameVi: 'Đồng Nai', province: 'Đồng Nai', region: 'Nam', lat: 10.9574, lng: 106.8427, photo: 'https://ik.imagekit.io/tvlk/blog/2022/03/khu-du-lich-sinh-thai-thac-giang-dien-1-1024x768.jpg?tr=dpr-2%2Cw-675' },
  { id: 'dongthap', nameVi: 'Đồng Tháp (Tràm Chim)', province: 'Đồng Tháp', region: 'Nam', lat: 10.4638, lng: 105.6328, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/dongthap_tramchim.jpg' },
  { id: 'gialai', nameVi: 'Gia Lai (Biển Hồ)', province: 'Gia Lai', region: 'Trung', lat: 13.9833, lng: 108.0000, photo: 'https://datviettour.com.vn/uploads/images/tin-tuc-SEO/tay-nguyen/danh-thang/chua-minh-thanh-pleiku-2.jpg' },
  { id: 'hagiang', nameVi: 'Hà Giang (Đồng Văn - Mã Pí Lèng)', province: 'Hà Giang', region: 'Bắc', lat: 22.8233, lng: 104.9836, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/%C4%90%C3%A8o_M%C3%A3_P%C3%AD_L%C3%A8ng_2022.jpg/960px-%C4%90%C3%A8o_M%C3%A3_P%C3%AD_L%C3%A8ng_2022.jpg' },
  { id: 'hanam', nameVi: 'Hà Nam (Tam Chúc)', province: 'Hà Nam', region: 'Bắc', lat: 20.5833, lng: 105.9167, photo: 'https://catbaexpress.com/upload/images/Cong-vao-den-truc.jpg' },
  { id: 'haiduong', nameVi: 'Hải Dương', province: 'Hải Dương', region: 'Bắc', lat: 20.9372, lng: 106.3145, photo: 'https://cdn.nhandan.vn/images/22f099ca8bc7ae81aa2a8d3416a84bf8048a98419e86a0ab79bcb19c0bdb932cd347a6d31515f197e18aa2c75b4a4e84d819fb7aa723d514207739f5abba87f42e052c3197e73e49933dcb8393bc6adb/d2008hd-5768.jpg.webp' },
  { id: 'haiphong', nameVi: 'Hải Phòng (Cát Bà)', province: 'Hải Phòng', region: 'Bắc', lat: 20.8449, lng: 106.6881, photo: 'https://mia.vn/media/uploads/blog-du-lich/kinh-nghiem-kham-pha-dao-bach-long-vi-duoc-menh-danh-la-xu-so-bao-ngu-05-1648574595.jpeg' },
  { id: 'haugiang', nameVi: 'Hậu Giang', province: 'Hậu Giang', region: 'Nam', lat: 9.7844, lng: 105.4701, photo: 'https://thiennhienmoitruong.vn/upload/images/btv/btv/btv/anh-lam.jpg' },
  { id: 'hoabinh', nameVi: 'Hòa Bình (Mai Châu)', province: 'Hòa Bình', region: 'Bắc', lat: 20.8172, lng: 105.3376, photo: 'https://cdn.xanhsm.com/2025/03/b3ad6438-thac-thang-thien-2.jpg' },
  { id: 'hungyen', nameVi: 'Hưng Yên', province: 'Hưng Yên', region: 'Bắc', lat: 20.6464, lng: 106.0511, photo: 'https://redsvn.net/wp-content/uploads/2021/01/Lang-Nom-02.jpg' },
  { id: 'kontum', nameVi: 'Kon Tum (Măng Đen)', province: 'Kon Tum', region: 'Trung', lat: 14.3500, lng: 108.0000, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Nh%C3%A0_th%E1%BB%9D_g%E1%BB%97_Kon_Tum.jpg/800px-Nh%C3%A0_th%E1%BB%9D_g%E1%BB%97_Kon_Tum.jpg' },
  { id: 'laichau', nameVi: 'Lai Châu', province: 'Lai Châu', region: 'Bắc', lat: 22.3964, lng: 103.4619, photo: 'https://bqlkkt.laichau.gov.vn/upload/2000066/20210420/18_097416f492.jpg' },
  { id: 'langson', nameVi: 'Lạng Sơn (Mẫu Sơn)', province: 'Lạng Sơn', region: 'Bắc', lat: 21.8537, lng: 106.7615, photo: 'https://luhanhvietnam.com.vn/du-lich/vnt_upload/news/04_2020/du-lich-ai-chi-lang4.jpg' },
  { id: 'longan', nameVi: 'Long An', province: 'Long An', region: 'Nam', lat: 10.5333, lng: 106.4167, photo: 'https://ik.imagekit.io/tvlk/blog/2023/11/nha-tram-cot-6-1024x768.jpg?tr=dpr-2%2Cw-675' },
  { id: 'namdinh', nameVi: 'Nam Định', province: 'Nam Định', region: 'Bắc', lat: 20.4344, lng: 106.1772, photo: 'https://viptrip.vn/public/upload/image-2_10-01-2026_691664738.jpg' },
  { id: 'nghean', nameVi: 'Nghệ An (Cửa Lò - Quê Bác)', province: 'Nghệ An', region: 'Trung', lat: 18.6734, lng: 105.6813, photo: 'https://gaohouse.vn/wp-content/uploads/2024/09/dao-hon-ngu-2.jpg' },
  { id: 'ninhthuan', nameVi: 'Ninh Thuận (Vĩnh Hy)', province: 'Ninh Thuận', region: 'Trung', lat: 11.5667, lng: 108.9833, photo: 'https://thiennhienmoitruong.vn/upload2024/images/btv-phuong-3/btv-phuong-7/88b.jpg' },
  { id: 'phutho', nameVi: 'Phú Thọ (Đền Hùng)', province: 'Phú Thọ', region: 'Bắc', lat: 21.3228, lng: 105.4019, photo: 'https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2026/4/4/ve-long-coc-ngam-vinh-xanh-giua-dat-to-1-1775270251759639631344.jpg' },
  { id: 'phuyen', nameVi: 'Phú Yên (Ghềnh Đá Đĩa)', province: 'Phú Yên', region: 'Trung', lat: 13.0883, lng: 109.3134, photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Ganh_Da_Dia_Phu_Yen.jpg/800px-Ganh_Da_Dia_Phu_Yen.jpg' },
  { id: 'quangngai', nameVi: 'Quảng Ngãi (Đảo Lý Sơn)', province: 'Quảng Ngãi', region: 'Trung', lat: 15.1205, lng: 108.7923, photo: 'https://lendang.vn/uploads/articles/526de26bcee20.jpg' },
  { id: 'quangtri', nameVi: 'Quảng Trị', province: 'Quảng Trị', region: 'Trung', lat: 16.7497, lng: 107.1854, photo: 'https://cdn.nhandan.vn/images/22f099ca8bc7ae81aa2a8d3416a84bf8793b27bf283f50300b1af63a8042d94ae535332719bd3c25d2920a328d51a8fcbb67820f513b63899b7fbd4fda8784f9/9-7268.jpg.webp' },
  { id: 'soctrang', nameVi: 'Sóc Trăng', province: 'Sóc Trăng', region: 'Nam', lat: 9.6033, lng: 105.9800, photo: 'https://images.baodantoc.vn/uploads/2020/Th%C3%A1ng_11/Ng%C3%A0y_25/Thanh/chuachenkieu-2.jpg' },
  { id: 'sonla', nameVi: 'Sơn La (Mộc Châu)', province: 'Sơn La', region: 'Bắc', lat: 20.8456, lng: 104.6496, photo: 'https://phetravel.com/uploads/thac-dai-yem-moc-chau-1.jpg.webp' },
  { id: 'tayninh', nameVi: 'Tây Ninh (Núi Bà Đen)', province: 'Tây Ninh', region: 'Nam', lat: 11.3100, lng: 106.0983, photo: 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/tayninh_nuibaden.jpg' },
  { id: 'thaibinh', nameVi: 'Thái Bình', province: 'Thái Bình', region: 'Bắc', lat: 20.4464, lng: 106.3366, photo: 'https://dulichvietnam.com.vn/vnt_upload/news/08_2023/1_bien_dong_chau_thai_binh.jpg' },
  { id: 'thainguyen', nameVi: 'Thái Nguyên (Hồ Núi Cốc)', province: 'Thái Nguyên', region: 'Bắc', lat: 21.5928, lng: 105.8442, photo: 'https://media.mia.vn/uploads/blog-du-lich/hang-phuong-hoang-tam-suoi-1696550278.jpg' },
  { id: 'thanhhoa', nameVi: 'Thanh Hóa (Sầm Sơn - Pù Luông)', province: 'Thanh Hóa', region: 'Trung', lat: 19.8075, lng: 105.7764, photo: 'https://flycorp-vn.s3.ap-southeast-1.amazonaws.com/blogs/1834509557157326.jpg' },
  { id: 'tiengiang', nameVi: 'Tiền Giang (Mỹ Tho)', province: 'Tiền Giang', region: 'Nam', lat: 10.3600, lng: 106.3600, photo: 'https://chuaviettoancau.com/userfiles/2020/02/04_resize-7063.jpg' },
  { id: 'travinh', nameVi: 'Trà Vinh', province: 'Trà Vinh', region: 'Nam', lat: 9.9347, lng: 106.3453, photo: 'https://i2.ex-cdn.com/crystalbay.com/files/content/2025/03/31/du-lich-cu-lao-tan-quy-4-2139.jpg' },
  { id: 'tuyenquang', nameVi: 'Tuyên Quang (Na Hang)', province: 'Tuyên Quang', region: 'Bắc', lat: 21.8234, lng: 105.2140, photo: 'https://mia.vn/media/uploads/blog-du-lich/thac-ban-ba-04-1699834746.jpeg' },
  { id: 'vinhlong', nameVi: 'Vĩnh Long', province: 'Vĩnh Long', region: 'Nam', lat: 10.2537, lng: 105.9722, photo: 'https://luhanhvietnam.com.vn/du-lich/vnt_upload/news/09_2022/cu-lao-an-binh_1_1.jpg' },
  { id: 'vinhphuc', nameVi: 'Vĩnh Phúc (Tam Đảo)', province: 'Vĩnh Phúc', region: 'Bắc', lat: 21.3614, lng: 105.6049, photo: 'https://www.vietfuntravel.com.vn/image/data/Ha-Noi/ho-dai-lai/Gia-ve-vao-tham-quan-Ho-Dai-Lai-1.jpg' },
  { id: 'yenbai', nameVi: 'Yên Bái (Mù Cang Chải)', province: 'Yên Bái', region: 'Bắc', lat: 21.7229, lng: 104.9113, photo: 'https://media.vietnamplus.vn/images/c14f6479e83e315b4cf3a2906cc6a51e9b4c1fb984396963cbe098b65cc53032af25f884c8e4a896ee7e3e2b67466b7b11ee9fdc17051f6c6d208ebb72b97eca58db261190b4d4ffeaa677e558889593/2805hothacba1-6454.jpg.webp' },
];

