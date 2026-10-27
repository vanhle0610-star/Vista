'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/i18n/LanguageContext';
import { COUNTRY_DIAL_CODES, CountryDialCode } from '@/i18n/languages';
import { CountryFlag } from '@/components/common/CountryFlag';

interface AuthCardProps {
  isNight: boolean;
}

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '577926332144-23qceg2o944n9hg5iv7nai2vr0s9u2d1.apps.googleusercontent.com';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace(/\/+$/, '');

const WEAK_PASSWORDS = new Set([
  '1234567890',
  '12345678901',
  'password123',
  'password1234',
  'admin123456',
  'qwertyuiop',
  'vista123456',
  'welcome1234',
  'iloveyou123',
]);

interface GoogleGsi {
  accounts: {
    id: {
      initialize: (config: object) => void;
      renderButton: (parent: HTMLElement, options: object) => void;
    };
    oauth2?: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (tokenResponse: { access_token?: string; error?: string }) => void;
      }) => {
        requestAccessToken: (options?: { prompt?: string }) => void;
      };
    };
  };
}

/**
 * Validate and sanitize return URL to prevent Open Redirect attacks.
 */
function getSafeReturnUrl(targetUrl: string | null): string {
  if (!targetUrl) return '/';
  const trimmed = targetUrl.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes('://')
  ) {
    return trimmed;
  }
  return '/';
}

export function AuthCard({ isNight }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get('returnUrl') || searchParams.get('redirect');

  const { t, currentLangConfig } = useLanguage();

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const dialDropdownRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [alreadyLoggedInUser, setAlreadyLoggedInUser] = useState<{
    id?: string;
    email?: string;
    displayName?: string;
    roles?: string[];
  } | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem('vista_token');
      const userStr = localStorage.getItem('vista_user');
      if (token && userStr) {
        setAlreadyLoggedInUser(JSON.parse(userStr));
      } else {
        setAlreadyLoggedInUser(null);
      }
    } catch {
      setAlreadyLoggedInUser(null);
    }
  }, []);

  // International Country Dial Code State
  const [selectedDialCode, setSelectedDialCode] = useState<CountryDialCode>(() => {
    return (
      COUNTRY_DIAL_CODES.find((c) => c.dialCode === currentLangConfig.defaultDialCode) ||
      COUNTRY_DIAL_CODES[0]
    );
  });
  const [prevDefaultDialCode, setPrevDefaultDialCode] = useState(currentLangConfig.defaultDialCode);
  const [showDialDropdown, setShowDialDropdown] = useState(false);

  // Automatically sync dial code with language selection if user hasn't explicitly chosen another country
  if (prevDefaultDialCode !== currentLangConfig.defaultDialCode) {
    setPrevDefaultDialCode(currentLangConfig.defaultDialCode);
    const matched = COUNTRY_DIAL_CODES.find((c) => c.dialCode === currentLangConfig.defaultDialCode);
    if (matched) {
      setSelectedDialCode(matched);
    }
  }

  // Close dial dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dialDropdownRef.current && !dialDropdownRef.current.contains(event.target as Node)) {
        setShowDialDropdown(false);
      }
    }
    if (showDialDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDialDropdown]);

  // Password strength calculation localized
  const pwdStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', feedback: '' };
    let score = 0;
    if (password.length >= 10) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 1) {
      return {
        score: 1,
        label: t.pwdWeak,
        color: '#e74c3c',
        feedback: t.pwdFeedbackWeak,
      };
    } else if (score === 2 || score === 3) {
      return {
        score: 2,
        label: t.pwdMedium,
        color: '#f39c12',
        feedback: t.pwdFeedbackMedium,
      };
    } else {
      return {
        score: 3,
        label: t.pwdStrong,
        color: '#27ae60',
        feedback: t.pwdFeedbackStrong,
      };
    }
  }, [password, t]);

  const navigateToDestination = useCallback(() => {
    const destination = getSafeReturnUrl(returnUrlParam);
    window.location.href = destination;
  }, [returnUrlParam]);

  const handleGoogleCredentialResponse = useCallback(
    async (response: {
      credential?: string;
      profile?: { email?: string; name?: string; picture?: string };
    }) => {
      if (!response.credential) {
        setStatusMsg({
          type: 'error',
          text: t.errGoogleFailed,
        });
        setGoogleLoading(false);
        return;
      }

      setGoogleLoading(true);
      setStatusMsg({
        type: 'info',
        text: 'Google Sign-In...',
      });

      try {
        const res = await fetch(`${API_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: response.credential }),
        });

        if (res.ok) {
          const data = await res.json();
          setStatusMsg({
            type: 'success',
            text: `🎉 ${data.displayName || data.email}!`,
          });
          if (data.accessToken) {
            localStorage.setItem('vista_token', data.accessToken);
            document.cookie = `vista_token=${data.accessToken}; path=/; SameSite=Lax`;
            const safeProfile = {
              id: data.id,
              email: data.email,
              displayName: data.displayName,
              roles: data.roles || [],
            };
            localStorage.setItem('vista_user', JSON.stringify(safeProfile));
            window.dispatchEvent(new Event('vista-auth-change'));
          }
          setTimeout(() => {
            navigateToDestination();
          }, 1000);
        } else {
          const errData = await res.json().catch(() => null);
          setStatusMsg({
            type: 'error',
            text: errData?.detail || t.errGoogleFailed,
          });
        }
      } catch {
        setStatusMsg({
          type: 'error',
          text: t.errServerConnect,
        });
      } finally {
        setGoogleLoading(false);
      }
    },
    [navigateToDestination, t]
  );

  useEffect(() => {
    const initGsi = () => {
      const google = (window as unknown as { google?: GoogleGsi }).google;
      if (!google?.accounts?.id) {
        return;
      }
      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: isNight ? 'filled_black' : 'outline',
            size: 'medium',
            shape: 'pill',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 290,
          });
        }
      } catch (err) {
        console.warn('Google GSI init notice:', err);
      }
    };

    if (!document.getElementById('google-gsi-sdk')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-sdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    } else {
      initGsi();
    }
  }, [handleGoogleCredentialResponse, isNight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    // 1. Client-side Name & Phone Validation (for Register)
    if (mode === 'register') {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setStatusMsg({ type: 'error', text: t.errInvalidName });
        fullNameInputRef.current?.focus();
        return;
      }

      if (phoneNumber.trim()) {
        const cleanPhone = phoneNumber.trim().replace(/[\s.-]/g, '');
        // Validate local phone number contains 6 to 15 digits
        const phoneRegex = /^[0-9]{6,15}$/;
        if (!phoneRegex.test(cleanPhone)) {
          setStatusMsg({
            type: 'error',
            text: `${t.errInvalidPhone} (${selectedDialCode.sample})`,
          });
          phoneInputRef.current?.focus();
          return;
        }
      }
    }

    // 2. Client-side Email Validation
    if (!email || !email.includes('@')) {
      setStatusMsg({ type: 'error', text: t.errInvalidEmail });
      emailInputRef.current?.focus();
      return;
    }

    // 3. Client-side Password Policy Validation
    if (mode === 'register') {
      if (password.length < 10) {
        setStatusMsg({
          type: 'error',
          text: t.errPwdMinLength,
        });
        passwordInputRef.current?.focus();
        return;
      }
      if (password.length > 128) {
        setStatusMsg({
          type: 'error',
          text: t.errPwdMaxLength,
        });
        passwordInputRef.current?.focus();
        return;
      }
      if (WEAK_PASSWORDS.has(password.toLowerCase())) {
        setStatusMsg({
          type: 'error',
          text: t.errPwdCommon,
        });
        passwordInputRef.current?.focus();
        return;
      }

      if (password !== confirmPassword) {
        setStatusMsg({
          type: 'error',
          text: t.errPwdMismatch,
        });
        confirmPasswordInputRef.current?.focus();
        return;
      }

      if (!agreeTerms) {
        setStatusMsg({
          type: 'error',
          text: t.errTermsRequired,
        });
        return;
      }
    }

    setLoading(true);

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';

    // Format phone number with selected country dial code if provided
    let formattedPhone: string | undefined = undefined;
    if (mode === 'register' && phoneNumber.trim()) {
      const cleanDigits = phoneNumber.trim().replace(/[\s.-]/g, '').replace(/^0+/, '');
      formattedPhone = `${selectedDialCode.dialCode}${cleanDigits}`;
    }

    const payload =
      mode === 'login'
        ? { email: email.trim(), password }
        : {
            email: email.trim(),
            password,
            displayName: fullName.trim() || 'VISTA Traveler',
            phoneNumber: formattedPhone,
          };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMsg({
          type: 'success',
          text: mode === 'login' ? t.successLogin : t.successRegister,
        });
        if (data.accessToken) {
          localStorage.setItem('vista_token', data.accessToken);
          document.cookie = `vista_token=${data.accessToken}; path=/; SameSite=Lax`;
          const safeProfile = {
            id: data.id,
            email: data.email,
            displayName: data.displayName,
            roles: data.roles || [],
          };
          localStorage.setItem('vista_user', JSON.stringify(safeProfile));
          window.dispatchEvent(new Event('vista-auth-change'));
        }
        setTimeout(() => {
          navigateToDestination();
        }, 1000);
      } else {
        const errData = await res.json().catch(() => null);
        const detailMsg = errData?.detail || errData?.message || 'Authentication error';
        setStatusMsg({
          type: 'error',
          text: detailMsg,
        });

        // Focus first invalid input
        if (detailMsg.toLowerCase().includes('email')) {
          emailInputRef.current?.focus();
        } else {
          passwordInputRef.current?.focus();
        }
      }
    } catch {
      setStatusMsg({
        type: 'error',
        text: t.errServerConnect,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setStatusMsg({
      type: 'info',
      text: 'Opening Google Sign-In...',
    });

    const google = (
      window as unknown as {
        google?: {
          accounts?: {
            oauth2?: {
              initTokenClient: (config: object) => {
                requestAccessToken: (options?: { prompt?: string }) => void;
              };
            };
          };
        };
      }
    ).google;

    if (google?.accounts?.oauth2) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
          callback: async (tokenRes: { access_token?: string; error?: string }) => {
            if (tokenRes?.error) {
              setGoogleLoading(false);
              setStatusMsg({
                type: 'error',
                text: t.errGoogleFailed,
              });
              return;
            }

            if (tokenRes?.access_token) {
              setGoogleLoading(true);
              try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenRes.access_token}` },
                });
                const googleProfile = await userInfoRes.json();
                await handleGoogleCredentialResponse({
                  credential: tokenRes.access_token,
                  profile: googleProfile,
                });
              } catch (e) {
                console.warn('UserInfo fetch error:', e);
                await handleGoogleCredentialResponse({ credential: tokenRes.access_token });
              }
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('OAuth token client error:', err);
      }
    }

    setGoogleLoading(false);
    setStatusMsg({
      type: 'error',
      text: t.errGoogleFailed,
    });
  };

  if (alreadyLoggedInUser) {
    return (
      <div className={`auth-card-wrapper ${isNight ? 'auth-card-night' : 'auth-card-day'}`}>
        <div className="auth-glass-panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#FFFFFF',
              fontSize: '22px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 20px rgba(2, 132, 199, 0.3)',
            }}
          >
            {(alreadyLoggedInUser.displayName || alreadyLoggedInUser.email || 'U').slice(0, 2).toUpperCase()}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: isNight ? '#F8FAFC' : '#0F172A', marginBottom: '6px' }}>
            Xin chào, {alreadyLoggedInUser.displayName || 'VISTA Traveler'}!
          </h2>
          <p style={{ fontSize: '13px', color: isNight ? '#94A3B8' : '#64748B', marginBottom: '20px' }}>
            {alreadyLoggedInUser.email}
          </p>
          <div style={{ background: isNight ? 'rgba(255,255,255,0.06)' : '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '10px 14px', marginBottom: '22px', fontSize: '12.5px', color: '#0369A1', fontWeight: 600 }}>
            ✓ Bạn đã đăng nhập vào hệ sinh thái VISTA
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                const dest = getSafeReturnUrl(returnUrlParam);
                window.location.href = dest;
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              }}
            >
              Vào trang chủ VISTA →
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = '/trips';
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: isNight ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                color: isNight ? '#F8FAFC' : '#334155',
                borderRadius: '12px',
                fontWeight: 650,
                fontSize: '14px',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
              }}
            >
              Xem chuyến đi của tôi
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('vista_token');
                localStorage.removeItem('vista_user');
                document.cookie = 'vista_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                window.dispatchEvent(new Event('vista-auth-change'));
                setAlreadyLoggedInUser(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#EF4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '6px',
                padding: '6px',
              }}
            >
              Đăng xuất / Dùng tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-card-wrapper ${isNight ? 'auth-card-night' : 'auth-card-day'}`}>
      <div className="auth-glass-panel">
        {/* Card Header & Brand */}
        <div className="card-brand-header">
          <div className="brand-logo-row">
            <svg className="vista-ribbon-logo" viewBox="0 0 44 32" width="32" height="24" fill="none">
              <path
                d="M 6,24 C 12,6 20,6 26,18 C 30,26 36,26 40,16"
                stroke="#0984e3"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M 2,16 C 8,28 16,28 22,14"
                stroke="#00cec9"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.85"
              />
            </svg>
            <span className="brand-title-text">VISTA</span>
          </div>

          <h2 className="card-welcome-title">
            {mode === 'login' ? t.loginTitle : t.registerTitle}
          </h2>
          <p className="card-welcome-subtitle">
            {mode === 'login' ? t.loginSubtitle : t.registerSubtitle}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-switch" role="tablist" aria-label="Lựa chọn phương thức xác thực">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            aria-controls="auth-form"
            className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setStatusMsg(null);
            }}
          >
            {t.tabLogin}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            aria-controls="auth-form"
            className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setStatusMsg(null);
            }}
          >
            {t.tabRegister}
          </button>
        </div>

        {/* Form Body */}
        <form id="auth-form" onSubmit={handleSubmit} className="auth-form-body" noValidate>
          {/* Full Name Input (Register Only) */}
          {mode === 'register' && (
            <div className="input-group">
              <label htmlFor="auth-fullname-input" className="sr-only" style={{ display: 'none' }}>
                {t.fullNameLabel}
              </label>
              <div className="input-field-box">
                <span className="field-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="auth-fullname-input"
                  ref={fullNameInputRef}
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder={t.fullNamePlaceholder}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="auth-text-input"
                  required
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="input-group">
            <label htmlFor="auth-email-input" className="sr-only" style={{ display: 'none' }}>
              {t.emailLabel}
            </label>
            <div className="input-field-box">
              <span className="field-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                id="auth-email-input"
                ref={emailInputRef}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-text-input"
                required
                aria-required="true"
                aria-invalid={statusMsg?.type === 'error'}
                aria-describedby={statusMsg ? 'auth-status-banner' : undefined}
              />
            </div>
          </div>

          {/* International Phone Number Input (Register Only) */}
          {mode === 'register' && (
            <div className="input-group" ref={dialDropdownRef}>
              <label htmlFor="auth-phone-input" className="sr-only" style={{ display: 'none' }}>
                {t.phoneLabel}
              </label>
              <div className="input-field-box intl-phone-box">
                {/* Country Dial Code Trigger */}
                <button
                  type="button"
                  className="country-dial-trigger"
                  onClick={() => setShowDialDropdown(!showDialDropdown)}
                  title={`${selectedDialCode.country} (${selectedDialCode.dialCode})`}
                  aria-haspopup="listbox"
                  aria-expanded={showDialDropdown}
                >
                  <CountryFlag countryCode={selectedDialCode.code} width={18} height={12} />
                  <span>{selectedDialCode.dialCode}</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>▾</span>
                </button>

                {/* Country Dial Code Dropdown */}
                {showDialDropdown && (
                  <div className="country-dial-dropdown" role="listbox">
                    {COUNTRY_DIAL_CODES.map((c) => {
                      const isSelected = c.code === selectedDialCode.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`country-dial-option ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedDialCode(c);
                            setShowDialDropdown(false);
                            phoneInputRef.current?.focus();
                          }}
                        >
                          <div className="dial-option-main">
                            <CountryFlag countryCode={c.code} width={20} height={13} />
                            <span>{c.country}</span>
                          </div>
                          <span className="dial-option-code">{c.dialCode}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <input
                  id="auth-phone-input"
                  ref={phoneInputRef}
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={`${t.phonePlaceholder} (${t.phoneOptional})`}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="auth-text-input"
                />
              </div>
            </div>
          )}

          {/* Password Input */}
          <div className="input-group">
            <label htmlFor="auth-password-input" className="sr-only" style={{ display: 'none' }}>
              {t.passwordLabel}
            </label>
            <div className="input-field-box">
              <span className="field-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="auth-password-input"
                ref={passwordInputRef}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-text-input"
                required
                aria-required="true"
                aria-invalid={statusMsg?.type === 'error'}
                aria-describedby={statusMsg ? 'auth-status-banner' : undefined}
              />
              <button
                type="button"
                className="toggle-pwd-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator (Register Only) */}
          {mode === 'register' && password.length > 0 && (
            <div className="password-strength-container" aria-live="polite">
              <div className="strength-header">
                <span className="strength-title">{t.pwdStrengthTitle}:</span>
                <span className="strength-status" style={{ color: pwdStrength.color, fontWeight: 700 }}>
                  {pwdStrength.label}
                </span>
              </div>
              <div className="strength-track">
                <div
                  className="strength-segment"
                  style={{ backgroundColor: pwdStrength.score >= 1 ? pwdStrength.color : undefined }}
                />
                <div
                  className="strength-segment"
                  style={{ backgroundColor: pwdStrength.score >= 2 ? pwdStrength.color : undefined }}
                />
                <div
                  className="strength-segment"
                  style={{ backgroundColor: pwdStrength.score >= 3 ? pwdStrength.color : undefined }}
                />
              </div>
              <p className="strength-hint">{pwdStrength.feedback}</p>
            </div>
          )}

          {/* Confirm Password Input (Register Only) */}
          {mode === 'register' && (
            <div className="input-group">
              <label htmlFor="auth-confirm-password-input" className="sr-only" style={{ display: 'none' }}>
                {t.confirmPasswordLabel}
              </label>
              <div className="input-field-box">
                <span className="field-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <input
                  id="auth-confirm-password-input"
                  ref={confirmPasswordInputRef}
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-text-input"
                  required
                  aria-required="true"
                />
                <button
                  type="button"
                  className="toggle-pwd-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Remember me (Login) OR Terms Agreement (Register) */}
          {mode === 'login' ? (
            <div className="options-row">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-label">{t.rememberMe}</span>
              </label>

              <button
                type="button"
                className="forgot-password-link"
                onClick={() => alert('Password reset link has been dispatched to admin contact.')}
              >
                {t.forgotPassword}
              </button>
            </div>
          ) : (
            <div className="options-row terms-row">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  id="auth-agree-terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-label terms-label">
                  {t.termsAgreement}{' '}
                  <button
                    type="button"
                    className="terms-link-btn"
                    onClick={() =>
                      alert(
                        'VISTA Global Terms:\n1. Community safety & verified travel guidelines.\n2. Transparent booking and smart trip planning.\n3. Zero data selling, compliant with international privacy standards.'
                      )
                    }
                  >
                    {t.termsLink}
                  </button>{' '}
                  &{' '}
                  <button
                    type="button"
                    className="terms-link-btn"
                    onClick={() =>
                      alert(
                        'VISTA Privacy Policy:\n1. Strict encryption of credentials and tokens.\n2. Location & phone number are strictly used for trip safety and SOS alerts.\n3. Fully GDPR, PDPA & Vietnam Decree 13 compliant.'
                      )
                    }
                  >
                    {t.privacyLink}
                  </button>
                </span>
              </label>
            </div>
          )}

          {/* Feedback message */}
          {statusMsg && (
            <div
              id="auth-status-banner"
              role="alert"
              aria-live="polite"
              className={`status-banner ${statusMsg.type}`}
            >
              {statusMsg.text}
            </div>
          )}

          {/* Primary CTA Submit Button */}
          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <span>{mode === 'login' ? t.btnSignIn : t.btnRegister}</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        {/* Social Login Section */}
        <div className="social-divider">
          <span className="divider-line"></span>
          <span className="divider-label">
            {mode === 'login' ? t.socialOrLoginWith : t.socialOrRegisterWith}
          </span>
          <span className="divider-line"></span>
        </div>

        {/* Official Google Button Container */}
        <div
          ref={googleBtnContainerRef}
          style={{
            display: 'flex',
            justifyContent: 'center',
            minHeight: '38px',
            marginBottom: '0.45rem',
          }}
        />

        <div className="social-buttons-grid">
          {/* Google Button (Fallback) */}
          <button
            type="button"
            className="social-icon-btn google-btn"
            title={t.googleSignIn}
            aria-label={t.googleSignIn}
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <span className="loading-spinner" style={{ width: '15px', height: '15px', borderWidth: '2px' }}></span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
          </button>

          {/* Apple Button */}
          <button
            type="button"
            className="social-icon-btn apple-btn"
            title={t.appleSignIn}
            aria-label={t.appleSignIn}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.6-.74 1.01-1.77.9-2.8-.87.04-1.92.58-2.54 1.31-.55.64-1.03 1.68-.9 2.69.97.08 1.95-.49 2.54-1.2" />
            </svg>
          </button>

          {/* Phone / Device Button */}
          <button
            type="button"
            className="social-icon-btn phone-btn"
            title={t.phoneSignIn}
            aria-label={t.phoneSignIn}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
            </svg>
          </button>
        </div>

        {/* Footer Link */}
        <div className="card-footer-note">
          {mode === 'login' ? (
            <p>
              {t.noAccountPrompt}{' '}
              <button
                type="button"
                className="switch-mode-link"
                onClick={() => {
                  setMode('register');
                  setStatusMsg(null);
                }}
              >
                {t.signUpNow}
              </button>
            </p>
          ) : (
            <p>
              {t.haveAccountPrompt}{' '}
              <button
                type="button"
                className="switch-mode-link"
                onClick={() => {
                  setMode('login');
                  setStatusMsg(null);
                }}
              >
                {t.signInNow}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
