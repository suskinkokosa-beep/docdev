import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppSettings {
  systemName: string;
  maxUpload: string;
  backup: boolean;
  twoFactor: boolean;
  sessionTimeout: string;
  auditLog: boolean;
  emailNotif: boolean;
  docUpdate: boolean;
  newUser: boolean;
  smtp: string;
  ldap: string;
}

const defaultSettings: AppSettings = {
  systemName: "УправДок",
  maxUpload: "100",
  backup: true,
  twoFactor: false,
  sessionTimeout: "30",
  auditLog: true,
  emailNotif: true,
  docUpdate: true,
  newUser: false,
  smtp: "",
  ldap: "",
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('app-settings', JSON.stringify(newSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
