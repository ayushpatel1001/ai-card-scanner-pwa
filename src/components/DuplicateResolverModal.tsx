import React from 'react';
import { AlertTriangle, GitMerge, PlusCircle, Trash2, X } from 'lucide-react';
import type { DuplicateMatch, ExtractedContact } from '../types/contact';

interface DuplicateResolverModalProps {
  contact: ExtractedContact;
  duplicateMatch: DuplicateMatch;
  onMerge: (incomingContact: ExtractedContact) => void;
  onSaveAsNew: (incomingContact: ExtractedContact) => void;
  onDiscard: (contactId: string) => void;
  onClose: () => void;
}

export const DuplicateResolverModal: React.FC<DuplicateResolverModalProps> = ({
  contact,
  duplicateMatch,
  onMerge,
  onSaveAsNew,
  onDiscard,
  onClose,
}) => {
  const existing = duplicateMatch.existingContact;

  const getReasonLabel = () => {
    return duplicateMatch.reasons
      .map((r) => {
        if (r === 'email') return 'Matching Email';
        if (r === 'phone') return 'Matching Phone Number';
        if (r === 'name_company') return 'Matching Name & Organization';
        return r;
      })
      .join(', ');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottomColor: 'rgba(245, 158, 11, 0.3)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-amber)' }}>
            <AlertTriangle size={20} />
            Duplicate Contact Detected
          </h3>
          <button onClick={onClose} className="icon-btn" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
            }}
          >
            <strong>Match Rule:</strong> {getReasonLabel()} (
            {Math.round(duplicateMatch.confidenceScore * 100)}% match confidence)
            {duplicateMatch.matchedValue && (
              <span style={{ display: 'block', color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
                Key: &ldquo;{duplicateMatch.matchedValue}&rdquo;
              </span>
            )}
          </div>

          <div className="diff-container">
            {/* Existing Contact Column */}
            <div className="diff-col">
              <h4>
                <span>Existing Saved Record</span>
                <span className="brand-badge" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  In History
                </span>
              </h4>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                {existing.cropAvatarUri && (
                  <img
                    src={existing.cropAvatarUri}
                    alt={existing.fullName}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                )}
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{existing.fullName}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {existing.designation} {existing.company && `at ${existing.company}`}
                  </div>
                </div>
              </div>

              <div className={`diff-field ${duplicateMatch.reasons.includes('name_company') ? 'matched' : ''}`}>
                <div className="diff-field-label">Company</div>
                <div className="diff-field-value">{existing.company || '—'}</div>
              </div>

              <div className={`diff-field ${duplicateMatch.reasons.includes('phone') ? 'matched' : ''}`}>
                <div className="diff-field-label">Phone Numbers</div>
                <div className="diff-field-value">
                  {existing.phones?.map((p) => p.number).join(', ') || '—'}
                </div>
              </div>

              <div className={`diff-field ${duplicateMatch.reasons.includes('email') ? 'matched' : ''}`}>
                <div className="diff-field-label">Emails</div>
                <div className="diff-field-value">
                  {existing.emails?.map((e) => e.email).join(', ') || '—'}
                </div>
              </div>

              <div className="diff-field">
                <div className="diff-field-label">Address</div>
                <div className="diff-field-value">{existing.address || '—'}</div>
              </div>

              <div className="diff-field">
                <div className="diff-field-label">Websites</div>
                <div className="diff-field-value">{existing.websites?.join(', ') || '—'}</div>
              </div>
            </div>

            {/* Incoming Extracted Card Column */}
            <div className="diff-col new-card">
              <h4>
                <span>New Extracted Card</span>
                <span className="brand-badge">Incoming</span>
              </h4>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                {contact.cropAvatarUri && (
                  <img
                    src={contact.cropAvatarUri}
                    alt={contact.fullName}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                      border: '1px solid var(--accent-primary)',
                    }}
                  />
                )}
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{contact.fullName}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {contact.designation} {contact.company && `at ${contact.company}`}
                  </div>
                </div>
              </div>

              <div className={`diff-field ${duplicateMatch.reasons.includes('name_company') ? 'matched' : ''}`}>
                <div className="diff-field-label">Company</div>
                <div className="diff-field-value">{contact.company || '—'}</div>
              </div>

              <div className={`diff-field ${duplicateMatch.reasons.includes('phone') ? 'matched' : ''}`}>
                <div className="diff-field-label">Phone Numbers</div>
                <div className="diff-field-value">
                  {contact.phones?.map((p) => p.number).join(', ') || '—'}
                </div>
              </div>

              <div className={`diff-field ${duplicateMatch.reasons.includes('email') ? 'matched' : ''}`}>
                <div className="diff-field-label">Emails</div>
                <div className="diff-field-value">
                  {contact.emails?.map((e) => e.email).join(', ') || '—'}
                </div>
              </div>

              <div className="diff-field">
                <div className="diff-field-label">Address</div>
                <div className="diff-field-value">{contact.address || '—'}</div>
              </div>

              <div className="diff-field">
                <div className="diff-field-label">Websites</div>
                <div className="diff-field-value">{contact.websites?.join(', ') || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            onClick={() => onDiscard(contact.id)}
            className="btn-danger btn-sm"
            title="Discard this duplicate extracted contact"
          >
            <Trash2 size={14} />
            <span>Discard New</span>
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => onSaveAsNew(contact)}
              className="btn-secondary btn-sm"
              title="Save as a separate independent record"
            >
              <PlusCircle size={14} />
              <span>Save as New</span>
            </button>

            <button
              onClick={() => onMerge(contact)}
              className="btn-primary btn-sm"
              title="Merge new details into existing record"
            >
              <GitMerge size={14} />
              <span>Merge &amp; Update</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
