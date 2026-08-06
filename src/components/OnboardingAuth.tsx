import React, { useState, useEffect } from 'react';
import { Cloud, ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, HelpCircle, Compass, Radio } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpotifyLinked, setIsSpotifyLinked] = useState(() => localStorage.getItem('barrz_spotify_linked') === 'true');
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    if (step === 'auth_choice') {
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
    const nextVal = !isSpotifyLinked;
    setIsSpotifyLinked(nextVal);
    localStorage.setItem('barrz_spotify_linked', String(nextVal));
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Por favor, ingresá un correo electrónico.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Ingresá un correo válido.');
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
        setErrorMsg(data.error || 'Ocurrió un error. Intenta de nuevo.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
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
          onNext('lobby_start', { email: data.email, username: data.username, avatar: data.avatar, avatar_type: data.avatar_type, custom_avatar_url: data.custom_avatar_url, stats: data.stats, history: data.history, loggedIn: true, method: 'email' });
        } else {
          setErrorMsg(data.error || 'Contraseña incorrecta.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('No se pudo conectar con el servidor.');
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
    const digits = pastedData.replace(/\D/g, ''); // Extraer solo los dígitos
    
    if (digits.length >= 6) {
      const newCode = digits.slice(0, 6).split('');
      setVerificationCode(newCode);
      
      // Enfocar el último input para indicar que está completo
      const lastInput = document.getElementById('code-input-5');
      lastInput?.focus();
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeString = verificationCode.join('');
    if (codeString.length < 6) {
      setErrorMsg('Ingresá el código completo de 6 dígitos.');
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
        onNext('lobby_start', { email: data.email, username: data.username, avatar: data.avatar, avatar_type: data.avatar_type, custom_avatar_url: data.custom_avatar_url, stats: data.stats, history: data.history, loggedIn: true, method: 'email' });
      } else {
        setErrorMsg(data.error || 'Código incorrecto.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo conectar con el servidor.');
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
        onNext('lobby_start', { email: data.email, username: data.username, avatar: data.avatar, avatar_type: data.avatar_type, custom_avatar_url: data.custom_avatar_url, stats: data.stats, history: data.history, loggedIn: true, method: 'google' });
      } else {
        setErrorMsg(data.error || 'Error al iniciar sesión con Google.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo conectar con el servidor.');
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
        alert('Código re-enviado!');
      } else {
        setErrorMsg(data.error);
      }
    } catch (err) {
      setErrorMsg('Error al reenviar código.');
    }
  };

  return (
    <div className="auth-outer-container">
      <div className="grunge-overlay"></div>
      
      {/* Botón de volver */}
      {step !== 'auth_choice' && (
        <button className="btn-auth-back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Atrás</span>
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
            <h2 className="step-title font-graffiti text-glow-teal">1. Navegando la App</h2>
            <p className="step-description">
              Bienvenido al laboratorio de freestyle definitivo. Navegá por los diferentes mazos de cartas, desafíos dinámicos y bases instrumentales.
            </p>
            <div className="feature-bullets">
              <div className="bullet-item">
                <Radio size={16} className="pink-text" />
                <span>Interactividad en tiempo real</span>
              </div>
              <div className="bullet-item">
                <Radio size={16} className="teal-text" />
                <span>Cronómetro de rimas incorporado</span>
              </div>
            </div>
            <button className="btn-neon-pink w-100" onClick={() => onNext('onboarding_2')}>
              <span>Continuar</span>
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
            <h2 className="step-title font-graffiti text-glow-pink">2. Beats y Conexión</h2>
            <p className="step-description">
              Para disfrutar de la experiencia al 100%, sincronizá tus bases directamente con Spotify. Abrí el enlace de cada beat para reproducirlo en segundo plano.
            </p>
            <div className="feature-bullets">
              <div className="bullet-item">
                <Radio size={16} className="teal-text" />
                <span>Integración con Spotify Premium y Free</span>
              </div>
              <div className="bullet-item">
                <Radio size={16} className="pink-text" />
                <span>Estadísticas de batallas e informes</span>
              </div>
            </div>
            <button className="btn-neon-teal w-100" onClick={() => onNext('auth_choice')}>
              <span>Comenzar Registro</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 3: AUTH CHOICE */}
        {step === 'auth_choice' && (
          <div className="step-content fade-in">
            <h2 className="step-title font-graffiti text-glow-pink">INGRESÁ</h2>
            <p className="step-sub">Introduce tu correo electrónico para iniciar sesión o registrarte.</p>

            <form onSubmit={handleEmailSubmit} className="auth-form">
              <div className="input-group">
                <label>Correo Electrónico</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="nombre@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {errorMsg && <p className="error-message">{errorMsg}</p>}

              <button type="submit" className="btn-neon-pink w-100" disabled={isSubmitting}>
                <span>CONTINUAR</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="divider-or">
              <span>O</span>
            </div>

            <div className="google-btn-wrapper">
              <div id="google-signin-btn-container"></div>
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
              <span>{isSpotifyLinked ? 'Spotify Vinculado ✓' : 'Vincular con Spotify'}</span>
            </button>
          </div>
        )}

        {/* STEP 4: CONTRASEÑA */}
        {step === 'auth_password' && (
          <form onSubmit={handlePasswordSubmit} className="step-content fade-in">
            <h2 className="step-title font-graffiti text-glow-teal">
              {isLogin ? 'INICIAR SESIÓN' : 'CREAR CONTRASEÑA'}
            </h2>
            <p className="step-sub">
              {isLogin 
                ? 'Ingresá tu contraseña para acceder a tu cuenta.' 
                : 'Escribe una clave segura para proteger tus registros y puntuaciones.'
              }
            </p>

            <div className="auth-form">
              <div className="input-group">
                <label>Contraseña</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {errorMsg && <p className="error-message">{errorMsg}</p>}

              <button type="submit" className="btn-neon-teal w-100" disabled={isSubmitting}>
                <span>{isSubmitting ? 'PROCESANDO...' : (isLogin ? 'INGRESAR' : 'SIGUIENTE')}</span>
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
            <h2 className="step-title font-graffiti text-glow-pink">VERIFICA TU CORREO</h2>
            <p className="step-description">
              Enviamos un código de verificación de 6 dígitos a <strong className="white-text">{email}</strong>. Ingresalo abajo para continuar:
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
              <span>{isSubmitting ? 'VERIFICANDO...' : 'COMPLETAR REGISTRO'}</span>
              <ArrowRight size={18} />
            </button>
            
            <p className="resend-text">
              ¿No recibiste el código? <button type="button" className="btn-link" onClick={handleResendCode} disabled={isSubmitting}>Reenviar código</button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
};
