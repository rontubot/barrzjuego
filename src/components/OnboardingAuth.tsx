import React, { useState } from 'react';
import { Cloud, ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, HelpCircle, Compass, Radio } from 'lucide-react';
import './OnboardingAuth.css';

interface OnboardingAuthProps {
  step: 'onboarding_1' | 'onboarding_2' | 'auth_choice' | 'auth_password' | 'auth_verify';
  onNext: (nextStep: string, data?: any) => void;
  onBack: () => void;
}

export const OnboardingAuth: React.FC<OnboardingAuthProps> = ({ step, onNext, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpotifyLinked, setIsSpotifyLinked] = useState(() => localStorage.getItem('barrz_spotify_linked') === 'true');

  const handleSpotifyToggle = () => {
    const nextVal = !isSpotifyLinked;
    setIsSpotifyLinked(nextVal);
    localStorage.setItem('barrz_spotify_linked', String(nextVal));
  };

  // MOCK LOGIC FOR AUTH FLOW
  const handleEmailSubmit = (e: React.FormEvent) => {
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
    onNext('auth_password', { email });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onNext('auth_verify', { email, password });
    }, 800);
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

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const codeString = verificationCode.join('');
    if (codeString.length < 6) {
      setErrorMsg('Ingresá el código completo de 6 dígitos.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onNext('lobby_start', { email, loggedIn: true, method: 'email' });
    }, 1000);
  };

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onNext('lobby_start', { email: 'freestyler.google@gmail.com', loggedIn: true, method: 'google' });
    }, 1200);
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
            <h2 className="step-title font-graffiti text-glow-pink">REGÍSTRATE</h2>
            <p className="step-sub">Ingresá tu correo para crear tu perfil de competidor.</p>

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
                <span>CREAR CUENTA</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="divider-or">
              <span>O</span>
            </div>

            <button className="btn-google-auth w-100" onClick={handleGoogleLogin} disabled={isSubmitting}>
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.29 1.5-.145 2.77-.98 3.69v3.063h6.39c3.746-3.447 5.735-8.52 5.735-14.61z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.955-1.076 7.94-2.923l-6.39-4.96c-1.78 1.194-4.06 1.9-6.55 1.9-5.04 0-9.31-3.41-10.83-8.01H.17v5.18C2.185 20.07 6.68 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M1.17 10.027A14.348 14.348 0 0 1 1.17 6.01V.83H.17C.17.83 0 2 .03 3.96l1.14 6.067z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 6.68 0 2.185 3.93.17 9.12l5.04 3.9c1.52-4.6 5.79-8.01 10.79-8.01z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

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
            <h2 className="step-title font-graffiti text-glow-teal">CREAR CONTRASEÑA</h2>
            <p className="step-sub">Escribe una clave segura para proteger tus registros y puntuaciones.</p>

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
                <span>{isSubmitting ? 'GUARDANDO...' : 'SIGUIENTE'}</span>
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
              ¿No recibiste el código? <button type="button" className="btn-link" onClick={() => alert('Código re-enviado!')}>Reenviar código</button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
};
