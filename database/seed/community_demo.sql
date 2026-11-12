-- Explicit demo data: run with npm.cmd run seed:community.
-- Stable IDs make repeated runs safe and preserve existing comments, likes and edits.
-- Demo authors are disabled and have no usable login password.
INSERT INTO users (id, email, password_hash, display_name, status)
VALUES
    ('5d000000-0000-4000-8000-000000000001', 'community-danang@example.invalid', '!disabled-demo-account', 'Nguyễn Hải Đăng (Demo)', 'INACTIVE'),
    ('5d000000-0000-4000-8000-000000000002', 'community-hoian@example.invalid', '!disabled-demo-account', 'Trần Bích Phương (Demo)', 'INACTIVE'),
    ('5d000000-0000-4000-8000-000000000003', 'community-hagiang@example.invalid', '!disabled-demo-account', 'Lê Minh Anh (Demo)', 'INACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO posts (id, user_id, body, status)
VALUES
    ('5d100000-0000-4000-8000-000000000001', '5d000000-0000-4000-8000-000000000001',
     'Đón bình minh tại Bà Nà Hills lúc 6 giờ sáng. Khi sương mù vừa tan và những tia nắng đầu tiên rọi qua đôi bàn tay đá khổng lồ, cảm giác như lạc vào cõi tiên vậy. Mọi người nên đi chuyến cáp treo sớm nhất để tránh đông nhé!

📍 Cầu Vàng, Đà Nẵng
Bài mẫu để kiểm thử bình luận và thả tim.', 'VISIBLE'),
    ('5d100000-0000-4000-8000-000000000002', '5d000000-0000-4000-8000-000000000002',
     'Một buổi chiều thật dịu dàng ở Hội An 🌿 Những mái nhà rêu phong, giàn hoa giấy rực rỡ và những chiếc đèn lồng lung linh khi phố lên đèn. Đừng quên ghé ăn một tô cao lầu gia truyền đậm đà!

📍 Phố cổ Hội An
Bài mẫu để kiểm thử bình luận và thả tim.', 'VISIBLE'),
    ('5d100000-0000-4000-8000-000000000003', '5d000000-0000-4000-8000-000000000003',
     'Hành trình 3N2Đ chinh phục những cung đèo ngoạn mục nhất miền cực Bắc. Đứng trên đỉnh Mã Pì Lèng nhìn xuống dòng sông Nho Quế xanh ngắt như dải lụa là trải nghiệm nhất định phải thử một lần trong đời!

📍 Mã Pì Lèng, Hà Giang
Bài mẫu để kiểm thử bình luận và thả tim.', 'VISIBLE')
ON CONFLICT (id) DO NOTHING;
