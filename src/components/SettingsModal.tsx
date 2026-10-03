import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cpu,
  Trash2,
  ExternalLink,
  X,
  Sliders,
  PhoneCall,
  Building2,
  Briefcase,
  Sun,
  Moon,
} from 'lucide-react';
import type { AppSettings, NameDisplayFormat } from '../types/contact';
import { formatContactFullName } from '../types/contact';
import { OPENROUTER_MODELS, testOpenRouterKey, type OpenRouterKeyInfo } from '../services/openrouter';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClose,
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(settings.theme || 'dark');
  const [apiKey, setApiKey] = useState(settings.openRouterApiKey);
  const [showKey, setShowKey] = useState(false);
  const [modelId, setModelId] = useState(settings.modelId);
  const [customModelId, setCustomModelId] = useState(settings.customModelId || '');
  const [targetKb, setTargetKb] = useState(settings.targetCompressionKb || 550);
  const [avatarSize, setAvatarSize] = useState(settings.avatarSize || 360);

  const [appendCompany, setAppendCompany] = useState(settings.appendCompanyToName ?? true);
  const [appendDesignation, setAppendDesignation] = useState(settings.appendDesignationToName ?? false);
  const [nameFormat, setNameFormat] = useState<NameDisplayFormat>(settings.nameDisplayFormat || 'parentheses');

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleClose = () => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    onClose();
  };

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<OpenRouterKeyInfo | null>(null);

  const isCustomModel = !OPENROUTER_MODELS.some((m) => m.id === modelId);

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ isValid: false, error: 'Please enter an API key first' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await testOpenRouterKey(apiKey);
    setTesting(false);
    setTestResult(result);
  };

  const handleClearKey = () => {
    setApiKey('');
    setTestResult(null);
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      theme,
      openRouterApiKey: apiKey.trim(),
      modelId: isCustomModel ? customModelId.trim() || 'google/gemini-2.5-flash' : modelId,
      customModelId: customModelId.trim(),
      targetCompressionKb: targetKb,
      avatarSize,
      appendCompanyToName: appendCompany,
      appendDesignationToName: appendDesignation,
      nameDisplayFormat: nameFormat,
    });
    onClose();
  };

  // Generate dynamic live caller ID simulation
  const previewCallerName = formatContactFullName(
    'Jane Doe',
    'Acme Innovations',
    'Chief Technology Officer',
    {
      appendCompanyToName: appendCompany,
      appendDesignationToName: appendDesignation,
      nameDisplayFormat: nameFormat,
    }
  );

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} style={{ color: 'var(--accent-primary)' }} />
            OpenRouter BYOK &amp; Scanner Settings
          </h3>
          <button type="button" onClick={handleClose} className="icon-btn" aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Privacy Banner */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            <ShieldCheck size={20} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: 'var(--accent-emerald)' }}>Zero Intermediate Servers:</strong> Your API
              key and card images are stored solely inside your browser. Vision inference requests travel directly
              from your device to OpenRouter.
            </div>
          </div>

          {/* API Key Input */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">
                <Key size={12} />
                OpenRouter API Key (BYOK)
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Get API Key <ExternalLink size={11} />
              </a>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="sk-or-v1-..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="icon-btn"
                  title="Clear API Key"
                >
                  <Trash2 size={15} style={{ color: 'var(--accent-rose)' }} />
                </button>
              )}

              <button
                type="button"
                onClick={handleTestKey}
                disabled={testing || !apiKey.trim()}
                className="btn-secondary btn-sm"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Test Key</span>
              </button>
            </div>

            {/* Test Key Feedback */}
            {testResult && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: testResult.isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  border: `1px solid ${testResult.isValid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                  color: testResult.isValid ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                }}
              >
                {testResult.isValid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <div>
                  {testResult.isValid ? (
                    <span>
                      Connection Verified! {testResult.label ? `(${testResult.label})` : ''}
                      {testResult.usage !== undefined ? ` • Total Usage: $${testResult.usage.toFixed(4)}` : ''}
                    </span>
                  ) : (
                    <span>{testResult.error || 'Connection Failed'}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Vision Model Selection */}
          <div className="form-group">
            <label className="form-label">
              <Cpu size={12} />
              Vision Inference Model
            </label>

            <select
              className="form-select"
              value={isCustomModel ? 'custom' : modelId}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setModelId('custom');
                } else {
                  setModelId(e.target.value);
                }
              }}
            >
              {OPENROUTER_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.tag} ({m.costPer1k}, {m.speed})
                </option>
              ))}
              <option value="custom">Custom OpenRouter Model ID...</option>
            </select>

            {isCustomModel && (
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. meta-llama/llama-3.2-11b-vision-instruct"
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Ensure your chosen custom model has vision / multimodal image input support.
                </span>
              </div>
            )}
          </div>

          {/* App Appearance & Theme (Night Mode & Day Mode) */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
              {theme === 'dark' ? (
                <Moon size={14} style={{ color: 'var(--accent-primary)' }} />
              ) : (
                <Sun size={14} style={{ color: 'var(--accent-amber)' }} />
              )}
              App Appearance (Night &amp; Day Mode)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`btn-secondary ${theme === 'dark' ? 'active-theme-choice' : ''}`}
                style={{
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: theme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-secondary)',
                  borderColor: theme === 'dark' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: theme === 'dark' ? 600 : 500,
                  fontSize: '0.85rem',
                }}
              >
                <Moon size={15} />
                <span>Night (Dark)</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`btn-secondary ${theme === 'light' ? 'active-theme-choice' : ''}`}
                style={{
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: theme === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                  borderColor: theme === 'light' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: theme === 'light' ? 600 : 500,
                  fontSize: '0.85rem',
                }}
              >
                <Sun size={15} />
                <span>Day (Light)</span>
              </button>
            </div>
          </div>

          {/* Caller ID & Name Formatting for Phone Calls */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                <PhoneCall size={16} style={{ color: 'var(--accent-primary)' }} />
                Caller ID &amp; Contact Name Recognition
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                When your phone rings, mobile lock screens only show the contact&apos;s name. Append the company and/or designation so you immediately recognize who is calling.
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={appendCompany}
                  onChange={(e) => setAppendCompany(e.target.checked)}
                  style={{
                    width: 17,
                    height: 17,
                    marginTop: 2,
                    accentColor: 'var(--accent-primary)',
                    cursor: 'pointer',
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building2 size={13} style={{ color: 'var(--accent-cyan)' }} />
                    Append Company Name to Full Name
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    e.g. &ldquo;Jane Doe (Acme Innovations)&rdquo;
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={appendDesignation}
                  onChange={(e) => setAppendDesignation(e.target.checked)}
                  style={{
                    width: 17,
                    height: 17,
                    marginTop: 2,
                    accentColor: 'var(--accent-primary)',
                    cursor: 'pointer',
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Briefcase size={13} style={{ color: 'var(--accent-primary)' }} />
                    Append Designation / Job Title to Full Name
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    e.g. &ldquo;Jane Doe (Chief Technology Officer)&rdquo;
                  </div>
                </div>
              </label>

              {(appendCompany || appendDesignation) && (
                <div style={{ marginTop: '0.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ marginBottom: '0.35rem' }}>
                    Separator &amp; Suffix Style
                  </label>
                  <select
                    className="form-select"
                    value={nameFormat}
                    onChange={(e) => setNameFormat(e.target.value as NameDisplayFormat)}
                    style={{ fontSize: '0.825rem' }}
                  >
                    <option value="parentheses">Parentheses — Name (Company • Title)</option>
                    <option value="dash">Hyphen / Dash — Name - Company • Title</option>
                    <option value="bracket">Square Brackets — Name [Company • Title]</option>
                  </select>
                </div>
              )}
            </div>

            {/* Live Incoming Call Simulator Preview */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--accent-cyan)',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <PhoneCall size={12} />
                Live Incoming Call Lock Screen Preview
              </div>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, var(--accent-primary), #06b6d4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 0 12px var(--accent-glow)',
                  }}
                >
                  <PhoneCall size={20} className="animate-pulse-glow" />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={previewCallerName}
                  >
                    {previewCallerName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    +1 (555) 234-5678 &bull; Mobile
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client Pre-Compression & Avatar Tuning */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <Sliders size={14} style={{ color: 'var(--accent-cyan)' }} />
              Performance &amp; Compression Preferences
            </div>

            <div className="fields-row">
              <div className="form-group">
                <label className="form-label">Client Pre-Compression Limit</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="range"
                    min="300"
                    max="900"
                    step="50"
                    value={targetKb}
                    onChange={(e) => setTargetKb(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '60px' }}>
                    {targetKb} KB
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Aggressively downscales raw phone photos before network upload to save mobile data.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Avatar Dimension</label>
                <select
                  className="form-select"
                  value={avatarSize}
                  onChange={(e) => setAvatarSize(Number(e.target.value))}
                >
                  <option value={320}>320 &times; 320 px (~20 KB JPEG)</option>
                  <option value={360}>360 &times; 360 px (~25 KB JPEG)</option>
                  <option value={400}>400 &times; 400 px (~35 KB JPEG)</option>
                </select>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Size of cropped card image embedded into standard vCard RFC folded payload.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={handleClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="btn-primary">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
