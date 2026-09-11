import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  name: string;
  org: string;
  email: string;
  pfp: string | null; // Base64 data URL
  avatarPreset?: 'satellite' | 'shield' | 'flame' | 'radio' | 'user' | null;
}

export interface AppSettings {
  alertsEnabled: boolean;
  highRiskOnly: boolean;
  autoRefresh: boolean;
  showDemo: boolean;
  minConfidence: number;
  refreshInterval: string;
}

interface SettingsContextType {
  profile: UserProfile;
  settings: AppSettings;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetToDefaults: () => void;
  saveAll: (newProfile: UserProfile, newSettings: AppSettings) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Operations Command',
  org: 'TERRASAFE',
  email: 'ops@terrasafe.io',
  pfp: null,
  avatarPreset: null,
};

const DEFAULT_SETTINGS: AppSettings = {
  alertsEnabled: true,
  highRiskOnly: false,
  autoRefresh: true,
  showDemo: true,
  minConfidence: 60,
  refreshInterval: '30s',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem('terrasafe_user_profile');
      if (stored) return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
    } catch (e) {
      console.warn('Failed to load profile from storage', e);
    }
    return DEFAULT_PROFILE;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('terrasafe_app_settings');
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {
      console.warn('Failed to load settings from storage', e);
    }
    return DEFAULT_SETTINGS;
  });

  const updateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('terrasafe_user_profile', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save profile', e);
      }
      return next;
    });
  };

  const updateSettings = (updated: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('terrasafe_app_settings', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save settings', e);
      }
      return next;
    });
  };

  const saveAll = (newProfile: UserProfile, newSettings: AppSettings) => {
    setProfile(newProfile);
    setSettings(newSettings);
    try {
      localStorage.setItem('terrasafe_user_profile', JSON.stringify(newProfile));
      localStorage.setItem('terrasafe_app_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to save all settings', e);
    }
  };

  const resetToDefaults = () => {
    setProfile(DEFAULT_PROFILE);
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem('terrasafe_user_profile', JSON.stringify(DEFAULT_PROFILE));
      localStorage.setItem('terrasafe_app_settings', JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {
      console.warn('Failed to reset settings', e);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        profile,
        settings,
        updateProfile,
        updateSettings,
        resetToDefaults,
        saveAll,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}

export function getInitials(name: string): string {
  if (!name || !name.trim()) return 'OP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function compressAvatarImage(file: File, maxSize = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.width;
        const height = img.height;
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
