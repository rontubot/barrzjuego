import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, type Language } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['es'];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: translations.es,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('barrz_language');
    return (saved === 'en' || saved === 'es') ? saved : 'es';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('barrz_language', lang);
    window.dispatchEvent(new CustomEvent('barrz_language_changed', { detail: lang }));
  };

  useEffect(() => {
    const handleLangEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      if (customEvent.detail && (customEvent.detail === 'en' || customEvent.detail === 'es')) {
        setLanguageState(customEvent.detail);
      }
    };
    window.addEventListener('barrz_language_changed', handleLangEvent);
    return () => window.removeEventListener('barrz_language_changed', handleLangEvent);
  }, []);

  const t = translations[language] || translations.es;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useI18n = () => useContext(LanguageContext);
