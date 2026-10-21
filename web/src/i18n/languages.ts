export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  country: string;
  defaultDialCode: string;
}

export interface CountryDialCode {
  country: string;
  code: string;
  dialCode: string;
  flag: string;
  sample: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { country: 'Việt Nam', code: 'VN', dialCode: '+84', flag: '🇻🇳', sample: '0912345678' },
  { country: 'Hàn Quốc (South Korea)', code: 'KR', dialCode: '+82', flag: '🇰🇷', sample: '10-1234-5678' },
  { country: 'Nhật Bản (Japan)', code: 'JP', dialCode: '+81', flag: '🇯🇵', sample: '90-1234-5678' },
  { country: 'Trung Quốc (China)', code: 'CN', dialCode: '+86', flag: '🇨🇳', sample: '138 0013 8000' },
  { country: 'Hoa Kỳ / Mỹ (USA)', code: 'US', dialCode: '+1', flag: '🇺🇸', sample: '202-555-0123' },
  { country: 'Vương Quốc Anh (UK)', code: 'GB', dialCode: '+44', flag: '🇬🇧', sample: '7911 123456' },
  { country: 'Đức (Germany)', code: 'DE', dialCode: '+49', flag: '🇩🇪', sample: '151 23456789' },
  { country: 'Pháp (France)', code: 'FR', dialCode: '+33', flag: '🇫🇷', sample: '6 12 34 56 78' },
  { country: 'Lào (Laos)', code: 'LA', dialCode: '+856', flag: '🇱🇦', sample: '20 55 123 456' },
  { country: 'Thái Lan (Thailand)', code: 'TH', dialCode: '+66', flag: '🇹🇭', sample: '81 234 5678' },
  { country: 'Tây Ban Nha (Spain)', code: 'ES', dialCode: '+34', flag: '🇪🇸', sample: '612 34 56 78' },
  { country: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', sample: '8123 4567' },
  { country: 'Úc (Australia)', code: 'AU', dialCode: '+61', flag: '🇦🇺', sample: '412 345 678' },
];

export interface TranslationDictionary {
  // Top nav
  navExplore: string;
  navItinerary: string;
  navCommunity: string;
  navMap: string;
  navSaved: string;
  themeDay: string;
  themeNight: string;
  langSelectTitle: string;

  // Auth card
  tabLogin: string;
  tabRegister: string;
  loginTitle: string;
  loginSubtitle: string;
  registerTitle: string;
  registerSubtitle: string;

  // Form fields
  fullNameLabel: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneOptional: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;

  // Password Strength
  pwdStrengthTitle: string;
  pwdWeak: string;
  pwdMedium: string;
  pwdStrong: string;
  pwdFeedbackWeak: string;
  pwdFeedbackMedium: string;
  pwdFeedbackStrong: string;

  // Options & Terms
  rememberMe: string;
  forgotPassword: string;
  termsAgreement: string;
  termsLink: string;
  privacyLink: string;

  // Submit
  btnSignIn: string;
  btnRegister: string;
  btnProcessing: string;

  // Social
  socialOrRegisterWith: string;
  socialOrLoginWith: string;
  googleSignIn: string;
  phoneSignIn: string;
  appleSignIn: string;

  // Footer switch
  noAccountPrompt: string;
  signUpNow: string;
  haveAccountPrompt: string;
  signInNow: string;

  // Validation messages
  errInvalidName: string;
  errInvalidEmail: string;
  errInvalidPhone: string;
  errPwdMinLength: string;
  errPwdMaxLength: string;
  errPwdCommon: string;
  errPwdMismatch: string;
  errTermsRequired: string;
  errGoogleFailed: string;
  errServerConnect: string;
  successRegister: string;
  successLogin: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'vi', name: 'Tiếng Việt', nativeName: 'Tiếng Việt', flag: '🇻🇳', country: 'Vietnam', defaultDialCode: '+84' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', country: 'United Kingdom', defaultDialCode: '+44' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', country: 'South Korea', defaultDialCode: '+82' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', country: 'Japan', defaultDialCode: '+81' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', country: 'China', defaultDialCode: '+86' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', country: 'Germany', defaultDialCode: '+49' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', country: 'France', defaultDialCode: '+33' },
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', flag: '🇱🇦', country: 'Laos', defaultDialCode: '+856' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', country: 'Thailand', defaultDialCode: '+66' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', country: 'Spain', defaultDialCode: '+34' },
];

export const TRANSLATIONS: Record<string, TranslationDictionary> = {
  vi: {
    navExplore: 'Khám phá',
    navItinerary: 'Lịch trình',
    navCommunity: 'Cộng đồng',
    navMap: 'Bản đồ',
    navSaved: 'Đã lưu',
    themeDay: '☀️ Nắng Vàng Rực Rỡ',
    themeNight: '🌙 Hội An Đêm Trăng',
    langSelectTitle: 'Chọn ngôn ngữ & quốc gia',

    tabLogin: 'Đăng nhập',
    tabRegister: 'Đăng ký',
    loginTitle: 'Chào mừng trở lại',
    loginSubtitle: 'Khởi hành chuyến đi mơ ước cùng cộng đồng VISTA',
    registerTitle: 'Tạo tài khoản VISTA',
    registerSubtitle: 'Gia nhập mạng lưới du lịch thông minh toàn cầu',

    fullNameLabel: 'Họ và tên',
    fullNamePlaceholder: 'Họ và tên của bạn',
    emailLabel: 'Địa chỉ Email',
    emailPlaceholder: 'name@example.com',
    phoneLabel: 'Số điện thoại',
    phonePlaceholder: 'Số điện thoại',
    phoneOptional: 'Tùy chọn',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Tối thiểu 10 ký tự',
    confirmPasswordLabel: 'Xác nhận mật khẩu',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu',

    pwdStrengthTitle: 'Độ mạnh mật khẩu',
    pwdWeak: 'Yếu',
    pwdMedium: 'Trung bình',
    pwdStrong: 'Mạnh',
    pwdFeedbackWeak: 'Tối thiểu 10 ký tự, gồm chữ hoa, thường & số.',
    pwdFeedbackMedium: 'Thêm chữ hoa hoặc ký tự đặc biệt (!@#$...).',
    pwdFeedbackStrong: 'Mật khẩu an toàn đạt chuẩn quốc tế.',

    rememberMe: 'Ghi nhớ đăng nhập',
    forgotPassword: 'Quên mật khẩu?',
    termsAgreement: 'Tôi đồng ý với',
    termsLink: 'Điều khoản dịch vụ',
    privacyLink: 'Chính sách bảo mật',

    btnSignIn: 'Đăng nhập vào VISTA',
    btnRegister: 'Tạo tài khoản ngay',
    btnProcessing: 'Đang xử lý...',

    socialOrRegisterWith: 'HOẶC ĐĂNG KÝ VỚI',
    socialOrLoginWith: 'HOẶC ĐĂNG NHẬP VỚI',
    googleSignIn: 'Đăng nhập với Google',
    phoneSignIn: 'Đăng nhập bằng số điện thoại',
    appleSignIn: 'Đăng nhập với Apple ID',

    noAccountPrompt: 'Chưa có tài khoản VISTA?',
    signUpNow: 'Đăng ký ngay',
    haveAccountPrompt: 'Đã có tài khoản?',
    signInNow: 'Đăng nhập',

    errInvalidName: 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự).',
    errInvalidEmail: 'Vui lòng nhập địa chỉ email hợp lệ.',
    errInvalidPhone: 'Số điện thoại không đúng định dạng.',
    errPwdMinLength: 'Mật khẩu phải có độ dài tối thiểu 10 ký tự.',
    errPwdMaxLength: 'Mật khẩu không được vượt quá 128 ký tự.',
    errPwdCommon: 'Mật khẩu quá phổ biến. Vui lòng chọn mật khẩu an toàn hơn.',
    errPwdMismatch: 'Mật khẩu xác nhận không khớp.',
    errTermsRequired: 'Vui lòng đồng ý với Điều khoản và Chính sách bảo mật.',
    errGoogleFailed: 'Xác thực Google không thành công.',
    errServerConnect: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    successRegister: 'Tạo tài khoản thành công! Đang chuyển hướng...',
    successLogin: 'Đăng nhập thành công! Đang chuyển hướng...',
  },

  en: {
    navExplore: 'Explore',
    navItinerary: 'Itineraries',
    navCommunity: 'Community',
    navMap: 'Map',
    navSaved: 'Saved',
    themeDay: '☀️ Golden Sunshine',
    themeNight: '🌙 Moonlight Hoi An',
    langSelectTitle: 'Select Language & Region',

    tabLogin: 'Sign In',
    tabRegister: 'Sign Up',
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Embark on your dream journey with the VISTA travel community',
    registerTitle: 'Create VISTA Account',
    registerSubtitle: 'Join the global smart travel network',

    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'Your full name',
    emailLabel: 'Email Address',
    emailPlaceholder: 'name@example.com',
    phoneLabel: 'Phone Number',
    phonePlaceholder: 'Phone number',
    phoneOptional: 'Optional',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 10 characters',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',

    pwdStrengthTitle: 'Password strength',
    pwdWeak: 'Weak',
    pwdMedium: 'Medium',
    pwdStrong: 'Strong',
    pwdFeedbackWeak: 'At least 10 chars, combining uppercase, lowercase & numbers.',
    pwdFeedbackMedium: 'Add uppercase letters or special characters (!@#$...).',
    pwdFeedbackStrong: 'Password meets high security standards.',

    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    termsAgreement: 'I agree to the',
    termsLink: 'Terms of Service',
    privacyLink: 'Privacy Policy',

    btnSignIn: 'Sign In to VISTA',
    btnRegister: 'Create Account Now',
    btnProcessing: 'Processing...',

    socialOrRegisterWith: 'OR SIGN UP WITH',
    socialOrLoginWith: 'OR SIGN IN WITH',
    googleSignIn: 'Continue with Google',
    phoneSignIn: 'Sign in with Phone number',
    appleSignIn: 'Continue with Apple ID',

    noAccountPrompt: "Don't have an account?",
    signUpNow: 'Sign up now',
    haveAccountPrompt: 'Already have an account?',
    signInNow: 'Sign in',

    errInvalidName: 'Please enter your full name (at least 2 characters).',
    errInvalidEmail: 'Please enter a valid email address.',
    errInvalidPhone: 'Invalid phone number format.',
    errPwdMinLength: 'Password must be at least 10 characters long.',
    errPwdMaxLength: 'Password cannot exceed 128 characters.',
    errPwdCommon: 'This password is too common. Please pick a stronger password.',
    errPwdMismatch: 'Password confirmation does not match.',
    errTermsRequired: 'Please agree to the Terms of Service & Privacy Policy.',
    errGoogleFailed: 'Google authentication failed.',
    errServerConnect: 'Unable to connect to server. Please try again later.',
    successRegister: 'Account created successfully! Redirecting...',
    successLogin: 'Signed in successfully! Redirecting...',
  },

  ko: {
    navExplore: '탐색',
    navItinerary: '여행 일정',
    navCommunity: '커뮤니티',
    navMap: '지도',
    navSaved: '저장됨',
    themeDay: '☀️ 눈부신 햇살',
    themeNight: '🌙 호이안의 달밤',
    langSelectTitle: '언어 및 국가 선택',

    tabLogin: '로그인',
    tabRegister: '회원가입',
    loginTitle: '다시 오신 것을 환영합니다',
    loginSubtitle: 'VISTA 글로벌 여행 커뮤니티와 함께 특별한 여정을 시작하세요',
    registerTitle: 'VISTA 계정 만들기',
    registerSubtitle: '스마트 글로벌 여행 네트워크에 참여하세요',

    fullNameLabel: '성명',
    fullNamePlaceholder: '성명을 입력하세요',
    emailLabel: '이메일 주소',
    emailPlaceholder: 'name@example.com',
    phoneLabel: '전화번호',
    phonePlaceholder: '전화번호 입력',
    phoneOptional: '선택 사항',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '최소 10자 이상',
    confirmPasswordLabel: '비밀번호 확인',
    confirmPasswordPlaceholder: '비밀번호 재입력',

    pwdStrengthTitle: '비밀번호 보안 수준',
    pwdWeak: '취약',
    pwdMedium: '보통',
    pwdStrong: '안전',
    pwdFeedbackWeak: '영문 대소문자, 숫자를 조합하여 10자 이상 입력하세요.',
    pwdFeedbackMedium: '특수문자(!@#$...)를 추가하여 보안을 강화하세요.',
    pwdFeedbackStrong: '표준 보안 기준을 충족하는 안전한 비밀번호입니다.',

    rememberMe: '로그인 상태 유지',
    forgotPassword: '비밀번호를 잊으셨나요?',
    termsAgreement: '본인은 다음 사항에 동의합니다:',
    termsLink: '서비스 이용약관',
    privacyLink: '개인정보 처리방침',

    btnSignIn: 'VISTA 로그인',
    btnRegister: '지금 계정 생성하기',
    btnProcessing: '처리 중...',

    socialOrRegisterWith: '또는 소셜 계정으로 가입',
    socialOrLoginWith: '또는 소셜 계정으로 로그인',
    googleSignIn: 'Google 계정으로 계속',
    phoneSignIn: '전화번호로 로그인',
    appleSignIn: 'Apple ID로 계속',

    noAccountPrompt: '아직 VISTA 계정이 없으신가요?',
    signUpNow: '지금 가입하기',
    haveAccountPrompt: '이미 계정이 있으신가요?',
    signInNow: '로그인',

    errInvalidName: '성명을 올바르게 입력해 주세요 (최소 2자).',
    errInvalidEmail: '올바른 이메일 주소를 입력해 주세요.',
    errInvalidPhone: '전화번호 형식이 올바르지 않습니다.',
    errPwdMinLength: '비밀번호는 최소 10자 이상이어야 합니다.',
    errPwdMaxLength: '비밀번호는 128자를 초과할 수 없습니다.',
    errPwdCommon: '너무 일반적인 비밀번호입니다. 더 안전한 비밀번호를 선택하세요.',
    errPwdMismatch: '비밀번호 확인이 일치하지 않습니다.',
    errTermsRequired: '이용약관 및 개인정보 처리방침에 동의해 주세요.',
    errGoogleFailed: 'Google 인증에 실패했습니다.',
    errServerConnect: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    successRegister: '회원가입이 완료되었습니다! 이동 중...',
    successLogin: '로그인되었습니다! 이동 중...',
  },

  ja: {
    navExplore: '見つける',
    navItinerary: '旅程プラン',
    navCommunity: 'コミュニティ',
    navMap: 'マップ',
    navSaved: '保存済み',
    themeDay: '☀️ 輝く陽光',
    themeNight: '🌙 ホイアン月夜',
    langSelectTitle: '言語と地域の選択',

    tabLogin: 'ログイン',
    tabRegister: '新規登録',
    loginTitle: 'おかえりなさい',
    loginSubtitle: 'VISTAのグローバルトラベルコミュニティと共に旅へ出かけましょう',
    registerTitle: 'VISTAアカウント作成',
    registerSubtitle: 'スマートな旅行プラットフォームへ参加しましょう',

    fullNameLabel: 'お名前',
    fullNamePlaceholder: '氏名を入力',
    emailLabel: 'メールアドレス',
    emailPlaceholder: 'name@example.com',
    phoneLabel: '電話番号',
    phonePlaceholder: '電話番号を入力',
    phoneOptional: '任意',
    passwordLabel: 'パスワード',
    passwordPlaceholder: '10文字以上',
    confirmPasswordLabel: 'パスワード（確認）',
    confirmPasswordPlaceholder: 'もう一度入力してください',

    pwdStrengthTitle: 'パスワード強度',
    pwdWeak: '弱い',
    pwdMedium: '普通',
    pwdStrong: '安全',
    pwdFeedbackWeak: '大文字・小文字・数字を含む10文字以上が必要です。',
    pwdFeedbackMedium: '記号(!@#$...)を追加するとさらに安全です。',
    pwdFeedbackStrong: '国際基準を満たした安全なパスワードです。',

    rememberMe: 'ログイン状態を保持',
    forgotPassword: 'パスワードをお忘れですか？',
    termsAgreement: '以下に同意します：',
    termsLink: '利用規約',
    privacyLink: 'プライバシーポリシー',

    btnSignIn: 'VISTAにログイン',
    btnRegister: '今すぐアカウント作成',
    btnProcessing: '処理中...',

    socialOrRegisterWith: 'またはソーシャルで登録',
    socialOrLoginWith: 'またはソーシャルでログイン',
    googleSignIn: 'Googleでログイン',
    phoneSignIn: '電話番号でログイン',
    appleSignIn: 'Apple IDでログイン',

    noAccountPrompt: 'アカウントをお持ちではありませんか？',
    signUpNow: '今すぐ登録',
    haveAccountPrompt: 'すでにアカウントをお持ちですか？',
    signInNow: 'ログイン',

    errInvalidName: 'お名前を正しく入力してください（2文字以上）。',
    errInvalidEmail: '有効なメールアドレスを入力してください。',
    errInvalidPhone: '電話番号の形式が正しくありません。',
    errPwdMinLength: 'パスワードは10文字以上である必要があります。',
    errPwdMaxLength: 'パスワードは128文字以内にしてください。',
    errPwdCommon: '推測されやすいパスワードです。別の安全なパスワードをお選びください。',
    errPwdMismatch: '確認用パスワードが一致しません。',
    errTermsRequired: '利用規約およびプライバシーポリシーに同意してください。',
    errGoogleFailed: 'Google認証に失敗しました。',
    errServerConnect: 'サーバーに接続できません。しばらくしてから再度お試しください。',
    successRegister: '登録が完了しました！移動中...',
    successLogin: 'ログインに成功しました！移動中...',
  },

  zh: {
    navExplore: '探索',
    navItinerary: '行程规划',
    navCommunity: '旅行社区',
    navMap: '地图',
    navSaved: '已收藏',
    themeDay: '☀️ 金色阳光',
    themeNight: '🌙 会安月夜',
    langSelectTitle: '选择语言与国家地区',

    tabLogin: '登录',
    tabRegister: '注册',
    loginTitle: '欢迎回来',
    loginSubtitle: '与 VISTA 全球旅行者社区一同开启精彩旅程',
    registerTitle: '创建 VISTA 账号',
    registerSubtitle: '加入全球智能旅行新生态',

    fullNameLabel: '姓名',
    fullNamePlaceholder: '您的姓名',
    emailLabel: '电子邮箱',
    emailPlaceholder: 'name@example.com',
    phoneLabel: '手机号码',
    phonePlaceholder: '手机号码',
    phoneOptional: '选填',
    passwordLabel: '密码',
    passwordPlaceholder: '至少10位字符',
    confirmPasswordLabel: '确认密码',
    confirmPasswordPlaceholder: '请再次输入密码',

    pwdStrengthTitle: '密码强度',
    pwdWeak: '较弱',
    pwdMedium: '中等',
    pwdStrong: '安全',
    pwdFeedbackWeak: '需至少10位，包含大小写字母与数字。',
    pwdFeedbackMedium: '建议添加特殊字符 (!@#$...) 提升安全性。',
    pwdFeedbackStrong: '密码符合国际高安全标准。',

    rememberMe: '记住我的登录',
    forgotPassword: '忘记密码？',
    termsAgreement: '我已阅读并同意',
    termsLink: '服务条款',
    privacyLink: '隐私政策',

    btnSignIn: '登录 VISTA',
    btnRegister: '立即创建账号',
    btnProcessing: '正在处理...',

    socialOrRegisterWith: '或通过其他方式注册',
    socialOrLoginWith: '或通过其他方式登录',
    googleSignIn: '使用 Google 账号继续',
    phoneSignIn: '使用手机号登录',
    appleSignIn: '使用 Apple ID 继续',

    noAccountPrompt: '还没有 VISTA 账号？',
    signUpNow: '立即注册',
    haveAccountPrompt: '已有账号？',
    signInNow: '直接登录',

    errInvalidName: '请输入有效的姓名（至少2个字符）。',
    errInvalidEmail: '请输入有效的电子邮箱地址。',
    errInvalidPhone: '手机号码格式不正确。',
    errPwdMinLength: '密码长度至少需10位字符。',
    errPwdMaxLength: '密码长度不能超过128位。',
    errPwdCommon: '该密码过于常见，请选择更安全的密码。',
    errPwdMismatch: '两次输入的密码不一致。',
    errTermsRequired: '请同意服务条款与隐私政策。',
    errGoogleFailed: 'Google 验证失败。',
    errServerConnect: '无法连接到服务器，请稍后重试。',
    successRegister: '账号创建成功！正在跳转...',
    successLogin: '登录成功！正在跳转...',
  },

  de: {
    navExplore: 'Entdecken',
    navItinerary: 'Reisepläne',
    navCommunity: 'Community',
    navMap: 'Karte',
    navSaved: 'Gespeichert',
    themeDay: '☀️ Sonnenschein',
    themeNight: '🌙 Hoi An Mondnacht',
    langSelectTitle: 'Sprache & Region wählen',

    tabLogin: 'Anmelden',
    tabRegister: 'Registrieren',
    loginTitle: 'Willkommen zurück',
    loginSubtitle: 'Starte deine Traumreise mit der VISTA Reise-Community',
    registerTitle: 'VISTA-Konto erstellen',
    registerSubtitle: 'Tritt dem weltweiten Reise-Netzwerk bei',

    fullNameLabel: 'Vollständiger Name',
    fullNamePlaceholder: 'Ihr Name',
    emailLabel: 'E-Mail-Adresse',
    emailPlaceholder: 'name@example.com',
    phoneLabel: 'Telefonnummer',
    phonePlaceholder: 'Telefonnummer',
    phoneOptional: 'Optional',
    passwordLabel: 'Passwort',
    passwordPlaceholder: 'Mindestens 10 Zeichen',
    confirmPasswordLabel: 'Passwort bestätigen',
    confirmPasswordPlaceholder: 'Passwort wiederholen',

    pwdStrengthTitle: 'Passwortsicherheit',
    pwdWeak: 'Schwach',
    pwdMedium: 'Mittel',
    pwdStrong: 'Sicher',
    pwdFeedbackWeak: 'Mind. 10 Zeichen mit Groß-, Kleinbuchstaben & Ziffern.',
    pwdFeedbackMedium: 'Sonderzeichen (!@#$...) für mehr Sicherheit hinzufügen.',
    pwdFeedbackStrong: 'Passwort entspricht internationalen Sicherheitsstandards.',

    rememberMe: 'Angemeldet bleiben',
    forgotPassword: 'Passwort vergessen?',
    termsAgreement: 'Ich akzeptiere die',
    termsLink: 'Nutzungsbedingungen',
    privacyLink: 'Datenschutzrichtlinie',

    btnSignIn: 'Bei VISTA anmelden',
    btnRegister: 'Konto jetzt erstellen',
    btnProcessing: 'Wird bearbeitet...',

    socialOrRegisterWith: 'ODER REGISTRIEREN MIT',
    socialOrLoginWith: 'ODER ANMELDEN MIT',
    googleSignIn: 'Mit Google fortfahren',
    phoneSignIn: 'Mit Telefonnummer anmelden',
    appleSignIn: 'Mit Apple ID fortfahren',

    noAccountPrompt: 'Noch kein VISTA-Konto?',
    signUpNow: 'Jetzt registrieren',
    haveAccountPrompt: 'Bereits registriert?',
    signInNow: 'Anmelden',

    errInvalidName: 'Bitte vollständigen Namen eingeben (mindestens 2 Zeichen).',
    errInvalidEmail: 'Bitte eine gültige E-Mail-Adresse eingeben.',
    errInvalidPhone: 'Ungültiges Telefonnummernformat.',
    errPwdMinLength: 'Das Passwort muss mindestens 10 Zeichen lang sein.',
    errPwdMaxLength: 'Das Passwort darf maximal 128 Zeichen lang sein.',
    errPwdCommon: 'Dieses Passwort ist zu unsicher. Bitte ein anderes wählen.',
    errPwdMismatch: 'Die Passwörter stimmen nicht überein.',
    errTermsRequired: 'Bitte stimme den Nutzungsbedingungen & Datenschutz zu.',
    errGoogleFailed: 'Google-Authentifizierung fehlgeschlagen.',
    errServerConnect: 'Verbindung zum Server fehlgeschlagen. Bitte später erneut versuchen.',
    successRegister: 'Konto erfolgreich erstellt! Weiterleitung...',
    successLogin: 'Erfolgreich angemeldet! Weiterleitung...',
  },

  fr: {
    navExplore: 'Explorer',
    navItinerary: 'Itinéraires',
    navCommunity: 'Communauté',
    navMap: 'Carte',
    navSaved: 'Favoris',
    themeDay: '☀️ Soleil Éclatant',
    themeNight: '🌙 Nuit Étoilée à Hoi An',
    langSelectTitle: 'Choisir la langue & le pays',

    tabLogin: 'Connexion',
    tabRegister: 'Inscription',
    loginTitle: 'Bon retour parmi nous',
    loginSubtitle: 'Partez vers de nouveaux horizons avec la communauté VISTA',
    registerTitle: 'Créer un compte VISTA',
    registerSubtitle: 'Rejoignez le réseau mondial des voyageurs connectés',

    fullNameLabel: 'Nom complet',
    fullNamePlaceholder: 'Votre nom et prénom',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'nom@example.com',
    phoneLabel: 'Numéro de téléphone',
    phonePlaceholder: 'Numéro de téléphone',
    phoneOptional: 'Facultatif',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '10 caractères minimum',
    confirmPasswordLabel: 'Confirmer le mot de passe',
    confirmPasswordPlaceholder: 'Ressaisissez votre mot de passe',

    pwdStrengthTitle: 'Force du mot de passe',
    pwdWeak: 'Faible',
    pwdMedium: 'Moyen',
    pwdStrong: 'Sécurisé',
    pwdFeedbackWeak: '10 car. min. avec majuscules, minuscules et chiffres.',
    pwdFeedbackMedium: 'Ajoutez des caractères spéciaux (!@#$...) pour renforcer.',
    pwdFeedbackStrong: 'Mot de passe conforme aux standards de sécurité.',

    rememberMe: 'Se souvenir de moi',
    forgotPassword: 'Mot de passe oublié ?',
    termsAgreement: "J'accepte les",
    termsLink: "Conditions d'utilisation",
    privacyLink: 'Politique de confidentialité',

    btnSignIn: 'Se connecter à VISTA',
    btnRegister: 'Créer mon compte',
    btnProcessing: 'Traitement en cours...',

    socialOrRegisterWith: "OU S'INSCRIRE AVEC",
    socialOrLoginWith: 'OU SE CONNECTER AVEC',
    googleSignIn: 'Continuer avec Google',
    phoneSignIn: 'Connexion par téléphone',
    appleSignIn: 'Continuer avec Apple ID',

    noAccountPrompt: "Pas encore de compte VISTA ?",
    signUpNow: "S'inscrire maintenant",
    haveAccountPrompt: 'Vous avez déjà un compte ?',
    signInNow: 'Se connecter',

    errInvalidName: 'Veuillez saisir votre nom complet (au moins 2 caractères).',
    errInvalidEmail: 'Veuillez saisir une adresse e-mail valide.',
    errInvalidPhone: 'Format de numéro de téléphone invalide.',
    errPwdMinLength: 'Le mot de passe doit comporter au moins 10 caractères.',
    errPwdMaxLength: 'Le mot de passe ne peut pas dépasser 128 caractères.',
    errPwdCommon: 'Mot de passe trop vulnérable. Veuillez en choisir un autre.',
    errPwdMismatch: 'Les mots de passe ne correspondent pas.',
    errTermsRequired: "Veuillez accepter les conditions d'utilisation et la confidentialité.",
    errGoogleFailed: 'Échec de la validation Google.',
    errServerConnect: 'Connexion au serveur impossible. Veuillez réessayer ultérieurement.',
    successRegister: 'Compte créé avec succès ! Redirection en cours...',
    successLogin: 'Connexion réussie ! Redirection en cours...',
  },

  lo: {
    navExplore: 'ສຳຫຼວດ',
    navItinerary: 'ແຜນການເດີນທາງ',
    navCommunity: 'ຊຸມຊົນ',
    navMap: 'ແຜນທີ່',
    navSaved: 'ບັນທຶກແລ້ວ',
    themeDay: '☀️ ແສງແດດສົດໃສ',
    themeNight: '🌙 ແສງເດືອນຮອຍອານ',
    langSelectTitle: 'ເລືອກພາສາ & ປະເທດ',

    tabLogin: 'ເຂົ້າສູ່ລະບົບ',
    tabRegister: 'ລົງທະບຽນ',
    loginTitle: 'ຍິນດີຕ້ອນຮັບກັບຄືນມາ',
    loginSubtitle: 'ເລີ່ມຕົ້ນການເດີນທາງໃນຝັນກັບຊຸມຊົນທ່ອງທ່ຽວ VISTA',
    registerTitle: 'ສ້າງບັນຊີ VISTA',
    registerSubtitle: 'ເຂົ້າຮ່ວມເຄືອຂ່າຍການທ່ອງທ່ຽວອັດສະລິຍະທົ່ວໂລກ',

    fullNameLabel: 'ຊື່ ແລະ ນາມສະກຸນ',
    fullNamePlaceholder: 'ຊື່ ແລະ ນາມສະກຸນຂອງທ່ານ',
    emailLabel: 'ອີເມວ',
    emailPlaceholder: 'name@example.com',
    phoneLabel: 'ເບີໂທລະສັບ',
    phonePlaceholder: 'ເບີໂທລະສັບ',
    phoneOptional: 'ເລືອກໃສ່ກໍໄດ້',
    passwordLabel: 'ລະຫັດຜ່ານ',
    passwordPlaceholder: 'ຢ່າງໜ້ອຍ 10 ຕົວອັກສອນ',
    confirmPasswordLabel: 'ຢືນຢັນລະຫັດຜ່ານ',
    confirmPasswordPlaceholder: 'ໃສ່ລະຫັດຜ່ານຄືນອີກຄັ້ງ',

    pwdStrengthTitle: 'ຄວາມປອດໄພຂອງລະຫັດຜ່ານ',
    pwdWeak: 'ອ່ອນ',
    pwdMedium: 'ປານກາງ',
    pwdStrong: 'ແຂງແຮງ',
    pwdFeedbackWeak: 'ຢ່າງໜ້ອຍ 10 ຕົວອັກສອນ, ປະກອບມີຕົວພິມໃຫຍ່, ນ້ອຍ ແລະ ຕົວເລກ.',
    pwdFeedbackMedium: 'ເພີ່ມຕົວອັກສອນພິເສດ (!@#$...) ເພື່ອຄວາມປອດໄພ.',
    pwdFeedbackStrong: 'ລະຫັດຜ່ານປອດໄພໄດ້ມາດຕະຖານສາກົນ.',

    rememberMe: 'ຈື່ການເຂົ້າສູ່ລະບົບ',
    forgotPassword: 'ລືມລະຫັດຜ່ານບໍ?',
    termsAgreement: 'ຂ້າພະເຈົ້າເຫັນດີກັບ',
    termsLink: 'ເງື່ອນໄຂການບໍລິການ',
    privacyLink: 'ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ',

    btnSignIn: 'ເຂົ້າສູ່ລະບົບ VISTA',
    btnRegister: 'ສ້າງບັນຊີດຽວນີ້',
    btnProcessing: 'ກຳລັງປະມວນຜົນ...',

    socialOrRegisterWith: 'ຫຼື ລົງທະບຽນດ້ວຍ',
    socialOrLoginWith: 'ຫຼື ເຂົ້າສູ່ລະບົບດ້ວຍ',
    googleSignIn: 'ດຳເນີນການຕໍ່ດ້ວຍ Google',
    phoneSignIn: 'ເຂົ້າສູ່ລະບົບດ້ວຍເບີໂທ',
    appleSignIn: 'ດຳເນີນການຕໍ່ດ້ວຍ Apple ID',

    noAccountPrompt: 'ຍັງບໍ່ມີບັນຊີ VISTA ບໍ?',
    signUpNow: 'ລົງທະບຽນດຽວນີ້',
    haveAccountPrompt: 'ມີບັນຊີແລ້ວບໍ?',
    signInNow: 'ເຂົ້າສູ່ລະບົບ',

    errInvalidName: 'ກະລຸນາໃສ່ຊື່ ແລະ ນາມສະກຸນ (ຢ່າງໜ້ອຍ 2 ຕົວອັກສອນ).',
    errInvalidEmail: 'ກະລຸນາໃສ່ທີ່ຢູອີເມວທີ່ຖືກຕ້ອງ.',
    errInvalidPhone: 'ຮູບແບບເບີໂທລະສັບບໍ່ຖືກຕ້ອງ.',
    errPwdMinLength: 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 10 ຕົວອັກສອນ.',
    errPwdMaxLength: 'ລະຫັດຜ່ານບໍ່ເກີນ 128 ຕົວອັກສອນ.',
    errPwdCommon: 'ລະຫັດຜ່ານນີ້ງ່າຍເກີນໄປ. ກະລຸນາເລືອກລະຫັດຜ່ານອື່ນທີ່ປອດໄພກວ່າ.',
    errPwdMismatch: 'ລະຫັດຜ່ານຢືນຢັນບໍ່ກົງກັນ.',
    errTermsRequired: 'ກະລຸນາເຫັນດີກັບເງື່ອນໄຂການບໍລິການ ແລະ ນະໂຍບາຍ.',
    errGoogleFailed: 'ການຢືນຢັນ Google ບໍ່ສຳເລັດ.',
    errServerConnect: 'ບໍ່ສາມາດເຊື່ອມຕໍ່ກັບເຊີບເວີໄດ້. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.',
    successRegister: 'ສ້າງບັນຊີສຳເລັດແລ້ວ! ກຳລັງປ່ຽນໜ້າ...',
    successLogin: 'ເຂົ້າສູ່ລະບົບສຳເລັດແລ້ວ! ກຳລັງປ່ຽນໜ້າ...',
  },

  th: {
    navExplore: 'สำรวจ',
    navItinerary: 'แผนการเดินทาง',
    navCommunity: 'ชุมชนนักท่องเที่ยว',
    navMap: 'แผนที่',
    navSaved: 'บันทึกแล้ว',
    themeDay: '☀️ แสงแดดสดใส',
    themeNight: '🌙 คืนจันทร์ฮอยอัน',
    langSelectTitle: 'เลือกภาษาและภูมิภาค',

    tabLogin: 'เข้าสู่ระบบ',
    tabRegister: 'ลงทะเบียน',
    loginTitle: 'ยินดีต้อนรับกลับมา',
    loginSubtitle: 'ออกเดินทางสู่ทริปในฝันร่วมกับคอมมูนิตี้ท่องเที่ยว VISTA',
    registerTitle: 'สร้างบัญชี VISTA',
    registerSubtitle: 'เข้าร่วมเครือข่ายท่องเที่ยวอัจฉริยะระดับโลก',

    fullNameLabel: 'ชื่อ-นามสกุล',
    fullNamePlaceholder: 'ชื่อและนามสกุลของคุณ',
    emailLabel: 'อีเมล',
    emailPlaceholder: 'name@example.com',
    phoneLabel: 'เบอร์โทรศัพท์',
    phonePlaceholder: 'เบอร์โทรศัพท์',
    phoneOptional: 'ไม่บังคับ',
    passwordLabel: 'รหัสผ่าน',
    passwordPlaceholder: 'อย่างน้อย 10 ตัวอักษร',
    confirmPasswordLabel: 'ยืนยันรหัสผ่าน',
    confirmPasswordPlaceholder: 'กรอกรหัสผ่านอีกครั้ง',

    pwdStrengthTitle: 'ระดับความปลอดภัยของรหัสผ่าน',
    pwdWeak: 'ง่ายเกินไป',
    pwdMedium: 'ปานกลาง',
    pwdStrong: 'ปลอดภัย',
    pwdFeedbackWeak: 'อย่างน้อย 10 ตัวอักษร ผสมตัวพิมพ์ใหญ่ เล็ก และตัวเลข',
    pwdFeedbackMedium: 'เพิ่มอักขระพิเศษ (!@#$...) เพื่อความปลอดภัยยิ่งขึ้น',
    pwdFeedbackStrong: 'รหัสผ่านปลอดภัยตามมาตรฐานสากล',

    rememberMe: 'จดจำการเข้าสู่ระบบ',
    forgotPassword: 'ลืมรหัสผ่าน?',
    termsAgreement: 'ฉันยอมรับ',
    termsLink: 'ข้อกำหนดการให้บริการ',
    privacyLink: 'นโยบายความเป็นส่วนตัว',

    btnSignIn: 'เข้าสู่ระบบ VISTA',
    btnRegister: 'สร้างบัญชีทันที',
    btnProcessing: 'กำลังดำเนินการ...',

    socialOrRegisterWith: 'หรือลงทะเบียนด้วย',
    socialOrLoginWith: 'หรือเข้าสู่ระบบด้วย',
    googleSignIn: 'ดำเนินการต่อด้วย Google',
    phoneSignIn: 'เข้าสู่ระบบด้วยเบอร์โทรศัพท์',
    appleSignIn: 'ดำเนินการต่อด้วย Apple ID',

    noAccountPrompt: 'ยังไม่มีบัญชี VISTA ใช่ไหม?',
    signUpNow: 'ลงทะเบียนตอนนี้',
    haveAccountPrompt: 'มีบัญชีอยู่แล้วใช่ไหม?',
    signInNow: 'เข้าสู่ระบบ',

    errInvalidName: 'กรุณากรอกชื่อ-นามสกุล (อย่างน้อย 2 ตัวอักษร)',
    errInvalidEmail: 'กรุณากรอกอีเมลที่ถูกต้อง',
    errInvalidPhone: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง',
    errPwdMinLength: 'รหัสผ่านต้องมีความยาวอย่างน้อย 10 ตัวอักษร',
    errPwdMaxLength: 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร',
    errPwdCommon: 'รหัสผ่านนี้คาดเดาได้ง่ายเกินไป กรุณาเลือกรหัสผ่านอื่น',
    errPwdMismatch: 'รหัสผ่านยืนยันไม่ตรงกัน',
    errTermsRequired: 'กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว',
    errGoogleFailed: 'การยืนยันตัวตน Google ไม่สำเร็จ',
    errServerConnect: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง',
    successRegister: 'สร้างบัญชีสำเร็จ! กำลังนำทาง...',
    successLogin: 'เข้าสู่ระบบสำเร็จ! กำลังนำทาง...',
  },

  es: {
    navExplore: 'Explorar',
    navItinerary: 'Itinerarios',
    navCommunity: 'Comunidad',
    navMap: 'Mapa',
    navSaved: 'Guardado',
    themeDay: '☀️ Sol Dorado',
    themeNight: '🌙 Noche de Luna en Hoi An',
    langSelectTitle: 'Seleccionar idioma y región',

    tabLogin: 'Iniciar sesión',
    tabRegister: 'Registrarse',
    loginTitle: 'Bienvenido de nuevo',
    loginSubtitle: 'Comienza el viaje de tus sueños con la comunidad VISTA',
    registerTitle: 'Crear cuenta VISTA',
    registerSubtitle: 'Únete a la red global de viajes inteligentes',

    fullNameLabel: 'Nombre completo',
    fullNamePlaceholder: 'Tu nombre y apellidos',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'nombre@ejemplo.com',
    phoneLabel: 'Número de teléfono',
    phonePlaceholder: 'Número de teléfono',
    phoneOptional: 'Opcional',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Mínimo 10 caracteres',
    confirmPasswordLabel: 'Confirmar contraseña',
    confirmPasswordPlaceholder: 'Vuelve a introducir tu contraseña',

    pwdStrengthTitle: 'Seguridad de la contraseña',
    pwdWeak: 'Débil',
    pwdMedium: 'Media',
    pwdStrong: 'Fuerte',
    pwdFeedbackWeak: 'Mín. 10 caracteres con mayúsculas, minúsculas y números.',
    pwdFeedbackMedium: 'Añade caracteres especiales (!@#$...) para mayor seguridad.',
    pwdFeedbackStrong: 'Contraseña segura según estándares internacionales.',

    rememberMe: 'Recordar sesión',
    forgotPassword: '¿Olvidaste tu contraseña?',
    termsAgreement: 'Acepto los',
    termsLink: 'Términos de servicio',
    privacyLink: 'Política de privacidad',

    btnSignIn: 'Iniciar sesión en VISTA',
    btnRegister: 'Crear cuenta ahora',
    btnProcessing: 'Procesando...',

    socialOrRegisterWith: 'O REGÍSTRATE CON',
    socialOrLoginWith: 'O INICIA SESIÓN CON',
    googleSignIn: 'Continuar con Google',
    phoneSignIn: 'Iniciar sesión con teléfono',
    appleSignIn: 'Continuar con Apple ID',

    noAccountPrompt: '¿No tienes cuenta en VISTA?',
    signUpNow: 'Regístrate ahora',
    haveAccountPrompt: '¿Ya tienes una cuenta?',
    signInNow: 'Iniciar sesión',

    errInvalidName: 'Introduce tu nombre completo (mínimo 2 caracteres).',
    errInvalidEmail: 'Introduce un correo electrónico válido.',
    errInvalidPhone: 'Formato de teléfono no válido.',
    errPwdMinLength: 'La contraseña debe tener al menos 10 caracteres.',
    errPwdMaxLength: 'La contraseña no puede superar los 128 caracteres.',
    errPwdCommon: 'Esta contraseña es demasiado común. Elige una más segura.',
    errPwdMismatch: 'Las contraseñas no coinciden.',
    errTermsRequired: 'Debes aceptar los Términos de servicio y la Privacidad.',
    errGoogleFailed: 'Error en la autenticación de Google.',
    errServerConnect: 'No se puede conectar con el servidor. Inténtalo más tarde.',
    successRegister: '¡Cuenta creada con éxito! Redirigiendo...',
    successLogin: '¡Sesión iniciada con éxito! Redirigiendo...',
  },
};
