import React from 'react';
import { CreditCard, Settings, Sun, Moon, Key, ShieldCheck } from 'lucide-react';
import type { AppSettings } from '../types/contact';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onToggleTheme,
}) => {
  const isKeyConfigured = Boolean(settings.openRouterApiKey && settings.openRouterApiKey.trim());

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo-icon" aria-hidden="true">
          <CreditCard size={22} />
        </div>
        <div className="brand-info">
          <h1>
            CardToContact
            <span className="brand-badge">PWA</span>
          </h1>
          <p className="brand-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={12} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
            <span>Zero-Egress Card Digitizer</span>
          </p>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          onClick={onOpenSettings}
          className={`key-status-pill ${isKeyConfigured ? 'connected' : 'disconnected'}`}
          title={isKeyConfigured ? 'OpenRouter API Key Connected' : 'Click to configure your OpenRouter API Key'}
          aria-label="OpenRouter key status"
        >
          <Key size={13} style={{ flexShrink: 0 }} />
          <span className="key-pill-text">{isKeyConfigured ? 'BYOK Ready' : 'Set API Key'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="icon-btn"
          title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="icon-btn"
          title="Settings & OpenRouter BYOK"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
