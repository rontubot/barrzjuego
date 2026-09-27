import React, { useState, useEffect } from 'react';
import { Cloud, ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, HelpCircle, Compass, Radio } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { useI18n } from '../i18n/LanguageContext';
import './OnboardingAuth.css';

interface OnboardingAuthProps {
  step: 'onboarding_1' | 'onboarding_2' | 'auth_choice' | 'auth_password' | 'auth_verify';
  onNext: (nextStep: string, data?: any) => void;
  onBack: () => void;
}

const getApiUrl = (path: string) => {
  const base = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
  return `${base}${path}`;
};

export const OnboardingAuth: React.FC<OnboardingAuthProps> = ({ step, onNext, onBack }) => {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpotifyLinked] = useState(() => localStorage.getItem('barrz_spotify_linked') === 'true');
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    try {
      GoogleAuth.initialize({
        clientId: '103522205562-b9r1r76scj8g7btrhfs8a209t7h6j3s1.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    } catch (e) {
      console.warn('GoogleAuth.initialize error:', e);
    }
  }, []);

  useEffect(() => {
    if (step === 'auth_choice' && !Capacitor.isNativePlatform()) {
      const initGoogle = () => {
        // @ts-ignore
        if (window.google?.accounts?.id) {
          // @ts-ignore
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '103522205562-b9r1r76scj8g7btrhfs8a209t7h6j3s1.apps.googleusercontent.com',
            callback: handleGoogleCredentialResponse
          });
          
          // @ts-ignore
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-btn-container'),
            { 
              theme: 'outline', 
              size: 'large', 
              text: 'signin_with',
              shape: 'pill',
              width: 320,
              logo_alignment: 'center'
            }
          );
        } else {
          setTimeout(initGoogle, 500);
        }
      };
      initGoogle();
    }
  }, [step]);

  const handleSpotifyToggle = () => {
    const token = localStorage.getItem('barrz_token');
    if (!token) {
      setErrorMsg(t.auth.spotify_need_auth);
      return;
    }
    window.location.href = getApiUrl(`/api/spotify/login?state=${encodeURIComponent(token)}`);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg(t.auth.enter_email);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg(t.auth.invalid_email);
      return;
    }
    
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch(getApiUrl('/api/auth/send-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIsLogin(false);
        onNext('auth_password', { email });
      } else if (data.error === 'El correo ya está registrado.') {
        setIsLogin(true);
        setErrorMsg('');
        onNext('auth_password', { email });
      } else {
        setErrorMsg(data.error || t.auth.server_error);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t.auth.server_error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg(t.auth.pass_min);
      return;
    }
    setErrorMsg('');
    
    if (isLogin) {
      setIsSubmitting(true);
      try {
        const res = await fetch(getApiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          localStorage.setItem('barrz_token', data.token);
          onNext('lobby_start', { email: data.email, username: data.username, avatar: data.avatar, avatar_type: data.avatar_type, custom_avatar_url: data.custom_avatar_url, stats: data.stats, history: data.history, spotify_linked: data.spotify_linked, loggedIn: true, method: 'email' });
        } else {
          setErrorMsg(data.error || t.auth.wrong_pass);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg(t.auth.server_error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      onNext('auth_verify', { email, password });
    }
  };

  const handleVerificationCodeChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next field
    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '');
    
    if (digits.length >= 6) {
      const newCode = digits.slice(0, 6).split('');
      setVerificationCode(newCode);
      
      const lastInput = document.getElementById('code-input-5');
      lastInput?.focus();
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeString = verificationCode.join('');
    if (codeString.length < 6) {
      setErrorMsg(t.auth.code_incomplete);
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code: codeString })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('barrz_token', data.token);
        onNext('lobby_start', { email: data.email, username: data.username, avatar: data.avatar, avatar_type: data.avatar_type, custom_avatar_url: data.custom_avatar_url, stats: data.stats, history: data.history, spotify_linked: data.spotify_linked, loggedIn: true, method: 'email' });
      } else {
        setErrorMsg(data.error || t.auth.wrong_code);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t.auth.server_error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(getApiUrl('/api/auth/google-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('barrz_token', data.token);
        onNext('lobby_start', { email: data.email, username: data.username, avatar: data.avatar, avatar_type: data.avatar_type, custom_avatar_url: data.custom_avatar_url, stats: data.stats, history: data.history, spotify_linked: data.spotify_linked, loggedIn: true, method: 'google' });
      } else {
        setErrorMsg(data.error || t.auth.google_error);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t.auth.server_error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNativeGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken || (googleUser as any)?.idToken;
      if (!idToken) {
        throw new Error('No se recibió el token de autenticación de Google.');
      }
      
      const res = await fetch(getApiUrl('/api/auth/google-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: idToken })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('barrz_token', data.token);
        onNext('lobby_start', { email: data.email, username: data.username, avatar: data.avatar, avatar_type: data.avatar_type, custom_avatar_url: data.custom_avatar_url, stats: data.stats, history: data.history, spotify_linked: data.spotify_linked, loggedIn: true, method: 'google' });
      } else {
        setErrorMsg(data.error || t.auth.google_error);
      }
    } catch (err: any) {
      console.error('Error en Google Sign-In nativo:', err);
      const errMsg = err?.message || String(err);
      if (errMsg !== 'canceled' && !errMsg.includes('popup_closed_by_user') && !errMsg.includes('12501')) {
        setErrorMsg(errMsg || t.auth.google_error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setErrorMsg('');
    try {
      const res = await fetch(getApiUrl('/api/auth/send-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        alert(t.auth.code_resent_alert);
      } else {
        setErrorMsg(data.error);
      }
    } catch (err) {
      setErrorMsg(t.auth.code_resend_error);
    }
  };

  return (
    <div className="auth-outer-container">
      <div className="grunge-overlay"></div>
      
      {/* Botón de volver */}
      {step !== 'auth_choice' && (
        <button className="btn-auth-back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>{t.common.back}</span>
        </button>
      )}

      <div className="auth-card glass-panel glow-pink">
        
        {/* LOGO SIMPLIFICADO */}
        <div className="auth-logo-header">
          <img src="/Barrzjuego.png" alt="BARRZ" className="auth-logo-img" />
          <div className="auth-logo-badge">FREESTYLE LAB</div>
        </div>

        {/* STEP 1: NUBE DE NAVEGACION */}
        {step === 'onboarding_1' && (
          <div className="step-content fade-in">
            <div className="illustration-wrapper">
              <div className="cloud-bubble glow-teal">
                <Cloud size={64} className="teal-text pulse-teal-anim" />
                <Compass size={24} className="inside-icon pink-text" />
              </div>
            </div>
            <h2 className="step-title font-graffiti text-glow-teal">{t.auth.onboarding_1_title}</h2>
            <p className="step-description">
              {t.auth.onboarding_1_desc}
            </p>
            <div className="feature-bullets">
              <div className="bullet-item">
                <Radio size={16} className="pink-text" />
                <span>{t.auth.onboarding_1_bullet_1}</span>
              </div>
              <div className="bullet-item">
                <Radio size={16} className="teal-text" />
                <span>{t.auth.onboarding_1_bullet_2}</span>
              </div>
            </div>
            <button className="btn-neon-pink w-100" onClick={() => onNext('onboarding_2')}>
              <span>{t.common.continue}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: NUBE DE INTERNET / INFORMES */}
        {step === 'onboarding_2' && (
          <div className="step-content fade-in">
            <div className="illustration-wrapper">
              <div className="cloud-bubble glow-pink">
                <Cloud size={64} className="pink-text pulse-pink-anim" />
                <HelpCircle size={24} className="inside-icon teal-text" />
              </div>
            </div>
            <h2 className="step-title font-graffiti text-glow-pink">{t.auth.onboarding_2_title}</h2>
            <p className="step-description">
              {t.auth.onboarding_2_desc}
            </p>
            <div className="feature-bullets">
              <div className="bullet-item">
                <Radio size={16} className="teal-text" />
                <span>{t.auth.onboarding_2_bullet_1}</span>
              </div>
              <div className="bullet-item">
                <Radio size={16} className="pink-text" />
                <span>{t.auth.onboarding_2_bullet_2}</span>
              </div>
            </div>
            <button className="btn-neon-teal w-100" onClick={() => onNext('auth_choice')}>
              <span>{t.auth.start_registration}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 3: AUTH CHOICE */}
        {step === 'auth_choice' && (
          <div className="step-content fade-in">
            <h2 className="step-title font-graffiti text-glow-pink">{t.auth.enter_title}</h2>
            <p className="step-sub">{t.auth.enter_sub}</p>

            <form onSubmit={handleEmailSubmit} className="auth-form">
              <div className="input-group">
                <label>{t.auth.email_label}</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder={t.auth.email_placeholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {errorMsg && <p className="error-message">{errorMsg}</p>}

              <button type="submit" className="btn-neon-pink w-100" disabled={isSubmitting}>
                <span>{t.auth.enter_btn}</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="divider-or">
              <span>{t.auth.google_or}</span>
            </div>

            <div className="google-btn-wrapper">
              {Capacitor.isNativePlatform() ? (
                <button 
                  type="button" 
                  className="btn-native-google w-100"
                  onClick={handleNativeGoogleSignIn}
                  disabled={isSubmitting}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continuar con Google</span>
                </button>
              ) : (
                <div id="google-signin-btn-container"></div>
              )}
            </div>

            <button 
              type="button" 
              className={`btn-spotify-auth w-100 mt-10 ${isSpotifyLinked ? 'linked' : ''}`}
              onClick={handleSpotifyToggle}
              disabled={isSubmitting}
            >
              <svg className="spotify-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.31c-.22.36-.68.48-1.04.26-2.91-1.78-6.58-2.18-10.9-1.2-.42.09-.83-.17-.92-.59-.09-.41.17-.83.59-.92 4.73-1.08 8.78-.62 12.01 1.36.36.21.48.67.26 1.09zm1.46-3.26c-.28.45-.87.6-1.32.32-3.33-2.05-8.41-2.65-12.35-1.45-.51.15-1.04-.14-1.2-.66-.15-.51.14-1.04.66-1.2 4.51-1.37 10.12-.7 13.9 1.63.45.27.6.86.31 1.36zm.1-3.38C15.2 8.35 8.86 8.14 5.17 9.26c-.57.17-1.16-.16-1.33-.73-.17-.57.16-1.16.73-1.33 4.23-1.28 11.23-1.04 15.67 1.59.51.3 1.17.47 1.47-.04.3-.51.13-1.17-.38-1.47z"/>
              </svg>
              <span>{isSpotifyLinked ? t.auth.spotify_linked_btn : t.auth.spotify_link_btn}</span>
            </button>
          </div>
        )}

        {/* STEP 4: CONTRASEÑA */}
        {step === 'auth_password' && (
          <form onSubmit={handlePasswordSubmit} className="step-content fade-in">
            <h2 className="step-title font-graffiti text-glow-teal">
              {isLogin ? t.auth.login_title : t.auth.create_title}
            </h2>
            <p className="step-sub">
              {isLogin 
                ? t.auth.login_sub 
                : t.auth.create_sub
              }
            </p>

            <div className="auth-form">
              <div className="input-group">
                <label>{t.auth.password_label}</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    placeholder={t.auth.pass_sub_placeholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {errorMsg && <p className="error-message">{errorMsg}</p>}

              <button type="submit" className="btn-neon-teal w-100" disabled={isSubmitting}>
                <span>{isSubmitting ? t.auth.processing_btn : (isLogin ? t.auth.login_btn : t.auth.next_btn)}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: VERIFICACION */}
        {step === 'auth_verify' && (
          <form onSubmit={handleVerificationSubmit} className="step-content fade-in">
            <div className="illustration-wrapper">
              <ShieldCheck size={48} className="teal-text pulse-teal-anim" />
            </div>
            <h2 className="step-title font-graffiti text-glow-pink">{t.auth.verify_code_title}</h2>
            <p className="step-description">
              {t.auth.verify_code_desc_1} <strong className="white-text">{email}</strong>{t.auth.verify_code_desc_2}
            </p>

            <div className="code-input-container">
              {verificationCode.map((val, idx) => (
                <input
                  key={idx}
                  id={`code-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={val}
                  className="digit-input"
                  onChange={(e) => handleVerificationCodeChange(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && val === '' && idx > 0) {
                      const prevInput = document.getElementById(`code-input-${idx - 1}`);
                      prevInput?.focus();
                    }
                  }}
                  onPaste={handlePaste}
                  disabled={isSubmitting}
                />
              ))}
            </div>

            {errorMsg && <p className="error-message">{errorMsg}</p>}

            <button type="submit" className="btn-neon-pink w-100 mt-20" disabled={isSubmitting}>
              <span>{isSubmitting ? t.auth.verifying : t.auth.complete_reg}</span>
              <ArrowRight size={18} />
            </button>
            
            <p className="resend-text">
              {t.auth.no_code_prompt} <button type="button" className="btn-link" onClick={handleResendCode} disabled={isSubmitting}>{t.auth.resend_code}</button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
};

