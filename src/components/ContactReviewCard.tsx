import React from 'react';
import {
  User,
  Building,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Crop,
  Download,
  Trash2,
  AlertTriangle,
  Plus,
  X,
  PhoneCall,
  Share2,
} from 'lucide-react';
import type { ExtractedContact, PhoneType, EmailType } from '../types/contact';
import { formatContactFullName, stripFormattedSuffix } from '../types/contact';

interface ContactReviewCardProps {
  contact: ExtractedContact;
  onChange: (updated: ExtractedContact) => void;
  onAdjustCrop: (contact: ExtractedContact) => void;
  onOpenDuplicateModal?: (contact: ExtractedContact) => void;
  onSaveToDevice: (contact: ExtractedContact) => void;
  onShareContact?: (contact: ExtractedContact) => void;
  onDiscard: (id: string) => void;
}

export const ContactReviewCard: React.FC<ContactReviewCardProps> = ({
  contact,
  onChange,
  onAdjustCrop,
  onOpenDuplicateModal,
  onSaveToDevice,
  onShareContact,
  onDiscard,
}) => {
  const handleFieldChange = (field: keyof ExtractedContact, value: any) => {
    onChange({
      ...contact,
      [field]: value,
      updatedAt: Date.now(),
    });
  };

  const handleNameChange = (val: string) => {
    const parts = val.trim().split(/\s+/);
    let first = '';
    let last = '';
    if (parts.length > 1) {
      first = parts.slice(0, -1).join(' ');
      last = parts[parts.length - 1];
    } else {
      first = val;
    }

    onChange({
      ...contact,
      fullName: val,
      firstName: first,
      lastName: last,
      updatedAt: Date.now(),
    });
  };

  // Phones management
  const handlePhoneChange = (id: string, number: string, type: PhoneType) => {
    const newPhones = contact.phones.map((p) => (p.id === id ? { ...p, number, type } : p));
    handleFieldChange('phones', newPhones);
  };

  const handleAddPhone = () => {
    const newPhone = {
      id: Math.random().toString(36).substring(2, 9),
      number: '',
      type: 'CELL' as PhoneType,
    };
    handleFieldChange('phones', [...contact.phones, newPhone]);
  };

  const handleRemovePhone = (id: string) => {
    handleFieldChange(
      'phones',
      contact.phones.filter((p) => p.id !== id)
    );
  };

  // Emails management
  const handleEmailChange = (id: string, email: string, type: EmailType) => {
    const newEmails = contact.emails.map((e) => (e.id === id ? { ...e, email, type } : e));
    handleFieldChange('emails', newEmails);
  };

  const handleAddEmail = () => {
    const newEmail = {
      id: Math.random().toString(36).substring(2, 9),
      email: '',
      type: 'WORK' as EmailType,
    };
    handleFieldChange('emails', [...contact.emails, newEmail]);
  };

  const handleRemoveEmail = (id: string) => {
    handleFieldChange(
      'emails',
      contact.emails.filter((e) => e.id !== id)
    );
  };

  // Websites management
  const handleWebsiteChange = (index: number, val: string) => {
    const newWebs = [...contact.websites];
    newWebs[index] = val;
    handleFieldChange('websites', newWebs);
  };

  const handleAddWebsite = () => {
    handleFieldChange('websites', [...contact.websites, '']);
  };

  const handleRemoveWebsite = (index: number) => {
    handleFieldChange(
      'websites',
      contact.websites.filter((_, idx) => idx !== index)
    );
  };

  const hasAppendedSuffix =
    Boolean(contact.company && contact.fullName.includes(contact.company)) ||
    Boolean(contact.designation && contact.fullName.includes(contact.designation));

  const handleToggleCallerIdName = () => {
    if (hasAppendedSuffix) {
      // Strip suffix back to clean base name
      const clean = stripFormattedSuffix(contact.fullName);
      handleNameChange(clean);
    } else {
      // Format with company and designation
      const formatted = formatContactFullName(
        contact.fullName,
        contact.company,
        contact.designation,
        {
          appendCompanyToName: Boolean(contact.company),
          appendDesignationToName: Boolean(contact.designation),
          nameDisplayFormat: 'parentheses',
        }
      );
      handleNameChange(formatted);
    }
  };

  return (
    <article className="review-card">
      {/* Duplicate warning bar if flagged */}
      {contact.status === 'duplicate_detected' && contact.duplicateMatch && (
        <div className="review-card-top-alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>
              <strong>Duplicate Detected:</strong> Matches existing record &ldquo;
              {contact.duplicateMatch.existingContact.fullName}&rdquo;
            </span>
          </div>
          {onOpenDuplicateModal && (
            <button
              onClick={() => onOpenDuplicateModal(contact)}
              className="btn-secondary btn-sm"
              style={{
                background: 'rgba(245, 158, 11, 0.25)',
                color: '#fff',
                borderColor: 'rgba(245, 158, 11, 0.4)',
              }}
            >
              Resolve Match
            </button>
          )}
        </div>
      )}

      <div className="review-card-body">
        {/* Left Column: Avatar & Crop Management */}
        <div className="avatar-col">
          <div className="avatar-preview-box">
            {contact.cropAvatarUri ? (
              <img
                src={contact.cropAvatarUri}
                alt={`${contact.fullName} Card Crop`}
                title="Card Crop Avatar"
              />
            ) : (
              <User size={64} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>

          <button
            type="button"
            onClick={() => onAdjustCrop(contact)}
            className="btn-secondary btn-sm"
            style={{ width: '100%', maxWidth: '220px' }}
            title="Adjust bounding box crop boundaries"
          >
            <Crop size={14} />
            <span>Adjust Crop</span>
          </button>

          <label className="avatar-toggle-label">
            <input
              type="checkbox"
              checked={contact.useAvatarInVcard}
              onChange={(e) => handleFieldChange('useAvatarInVcard', e.target.checked)}
            />
            <span>Use card as contact photo</span>
          </label>
        </div>

        {/* Right Column: Editable Contact Fields */}
        <div className="fields-col">
          {/* Full Name & Designation */}
          <div className="fields-row">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">
                  <User size={12} />
                  Full Name (Caller ID)
                </label>
                {(contact.company || contact.designation) && (
                  <button
                    type="button"
                    onClick={handleToggleCallerIdName}
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: hasAppendedSuffix ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                      color: hasAppendedSuffix ? 'var(--accent-emerald)' : 'var(--accent-primary)',
                      border: `1px solid ${hasAppendedSuffix ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.25)'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                    }}
                    title={hasAppendedSuffix ? 'Click to remove Company/Title suffix' : 'Click to append Company and/or Designation to Full Name for easy Caller ID'}
                  >
                    <PhoneCall size={10} />
                    <span>{hasAppendedSuffix ? 'Caller Tag Active' : '+ Caller Tag'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                className="form-input"
                value={contact.fullName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Dr. Aris Thorne (Quantum Synthetics)"
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Displayed on your phone screen during incoming calls.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Briefcase size={12} />
                Designation / Job Title
              </label>
              <input
                type="text"
                className="form-input"
                value={contact.designation}
                onChange={(e) => handleFieldChange('designation', e.target.value)}
                placeholder="e.g. Chief Research Scientist"
              />
            </div>
          </div>

          {/* Company & Address */}
          <div className="fields-row">
            <div className="form-group">
              <label className="form-label">
                <Building size={12} />
                Company / Organization
              </label>
              <input
                type="text"
                className="form-input"
                value={contact.company}
                onChange={(e) => handleFieldChange('company', e.target.value)}
                placeholder="e.g. Quantum Synthetics"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <MapPin size={12} />
                Address
              </label>
              <input
                type="text"
                className="form-input"
                value={contact.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="e.g. 500 Howard St, San Francisco, CA"
              />
            </div>
          </div>

          {/* Phones Section */}
          <div className="form-group">
            <label className="form-label">
              <Phone size={12} />
              Phone Numbers
            </label>

            {contact.phones.map((phone) => (
              <div key={phone.id} className="dynamic-list-row">
                <select
                  value={phone.type}
                  onChange={(e) =>
                    handlePhoneChange(phone.id, phone.number, e.target.value as PhoneType)
                  }
                  className="form-select"
                >
                  <option value="CELL">Mobile</option>
                  <option value="WORK">Work</option>
                  <option value="HOME">Home</option>
                  <option value="OTHER">Other</option>
                </select>

                <input
                  type="tel"
                  className="form-input"
                  value={phone.number}
                  onChange={(e) =>
                    handlePhoneChange(phone.id, e.target.value, phone.type)
                  }
                  placeholder="+1 (555) 000-0000"
                />

                <button
                  type="button"
                  onClick={() => handleRemovePhone(phone.id)}
                  className="icon-btn"
                  style={{ width: 34, height: 34 }}
                  title="Remove phone"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            <button type="button" onClick={handleAddPhone} className="add-item-btn">
              <Plus size={12} />
              Add Phone
            </button>
          </div>

          {/* Emails Section */}
          <div className="form-group">
            <label className="form-label">
              <Mail size={12} />
              Emails
            </label>

            {contact.emails.map((email) => (
              <div key={email.id} className="dynamic-list-row">
                <select
                  value={email.type}
                  onChange={(e) =>
                    handleEmailChange(email.id, email.email, e.target.value as EmailType)
                  }
                  className="form-select"
                >
                  <option value="WORK">Work</option>
                  <option value="INTERNET">Personal</option>
                  <option value="OTHER">Other</option>
                </select>

                <input
                  type="email"
                  className="form-input"
                  value={email.email}
                  onChange={(e) =>
                    handleEmailChange(email.id, e.target.value, email.type)
                  }
                  placeholder="contact@company.com"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveEmail(email.id)}
                  className="icon-btn"
                  style={{ width: 34, height: 34 }}
                  title="Remove email"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            <button type="button" onClick={handleAddEmail} className="add-item-btn">
              <Plus size={12} />
              Add Email
            </button>
          </div>

          {/* Websites & Notes */}
          <div className="fields-row">
            <div className="form-group">
              <label className="form-label">
                <Globe size={12} />
                Websites / Socials
              </label>
              {contact.websites.map((web, idx) => (
                <div key={idx} className="dynamic-list-row">
                  <input
                    type="url"
                    className="form-input"
                    value={web}
                    onChange={(e) => handleWebsiteChange(idx, e.target.value)}
                    placeholder="https://example.com"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveWebsite(idx)}
                    className="icon-btn"
                    style={{ width: 34, height: 34 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={handleAddWebsite} className="add-item-btn">
                <Plus size={12} />
                Add URL
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FileText size={12} />
                Notes / Context
              </label>
              <textarea
                className="form-textarea"
                value={contact.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Met at Conference 2026, tags, specialties..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Review Card Action Footer */}
      <div className="review-card-footer">
        <button
          type="button"
          onClick={() => onDiscard(contact.id)}
          className="btn-danger btn-sm"
          title="Discard this contact card"
        >
          <Trash2 size={14} />
          <span>Discard</span>
        </button>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {onShareContact && (
            <button
              type="button"
              onClick={() => onShareContact(contact)}
              className="btn-secondary btn-sm"
              title="Share via AirDrop, Messages, WhatsApp, etc."
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSaveToDevice(contact)}
            className="btn-success btn-sm"
            title="Download .vcf card — tap the file to open Apple or Google Contacts"
          >
            <Download size={14} />
            <span>Add to Phone Contacts (.vcf)</span>
          </button>
        </div>
      </div>
    </article>
  );
};
