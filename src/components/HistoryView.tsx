import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Share2,
  Trash2,
  FileJson,
  Upload,
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import type { StoredContact } from '../types/contact';
import { exportBatchVCard, exportContactVCard } from '../services/vcard';
import { searchContacts } from '../services/storage';

interface HistoryViewProps {
  contacts: StoredContact[];
  onDeleteContact: (id: string) => void;
  onClearAll: () => void;
  onImportContacts: (imported: StoredContact[]) => void;
  onSelectContactForEdit?: (contact: StoredContact) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  contacts,
  onDeleteContact,
  onClearAll,
  onImportContacts,
  onSelectContactForEdit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredContacts = useMemo(() => {
    return searchContacts(contacts, searchQuery);
  }, [contacts, searchQuery]);

  const handleExportAllVcf = () => {
    if (filteredContacts.length === 0) return;
    exportBatchVCard(filteredContacts);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(contacts, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `cardtocontact_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportContacts(parsed);
        } else {
          alert('Invalid backup file format');
        }
      } catch (err) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section className="history-view">
      {/* Top Search & Actions Bar */}
      <div className="history-controls">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, company, title, phone, email..."
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportAllVcf}
            disabled={filteredContacts.length === 0}
            className="btn-primary btn-sm"
            title="Export all contacts into a single bulk .vcf file"
          >
            <Download size={14} />
            <span>Export All ({filteredContacts.length}) .vcf</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={contacts.length === 0}
            className="btn-secondary btn-sm"
            title="Backup all data as JSON"
          >
            <FileJson size={14} />
            <span>Backup JSON</span>
          </button>

          <label
            className="btn-secondary btn-sm"
            style={{ cursor: 'pointer' }}
            title="Import contacts from backup JSON"
          >
            <Upload size={14} />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              style={{ display: 'none' }}
            />
          </label>

          {contacts.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="btn-danger btn-sm"
              title="Clear all stored contacts"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Clearing History */}
      {showClearConfirm && (
        <div className="modal-backdrop" onClick={() => setShowClearConfirm(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} />
                Clear Local Contact History?
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                This will permanently delete all {contacts.length} saved contacts from your local browser database.
                This action cannot be undone. Consider exporting a JSON backup first.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowClearConfirm(false)} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="btn-danger btn-sm"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List Grid */}
      {contacts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1.5rem',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <div className="capture-icon-bubble" style={{ width: 52, height: 52, marginBottom: '1rem' }}>
            <User size={24} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No Saved Contacts Yet
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
            When you scan business cards and approve them on the staging screen, they will appear here for instant search,
            re-export, or batch download.
          </p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No contacts match &ldquo;{searchQuery}&rdquo;
        </div>
      ) : (
        <div className="history-card-grid">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="history-contact-card">
              <div>
                <div className="history-card-header">
                  {contact.cropAvatarUri ? (
                    <img
                      src={contact.cropAvatarUri}
                      alt={contact.fullName}
                      className="history-card-avatar"
                    />
                  ) : (
                    <div
                      className="history-card-avatar"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <User size={24} />
                    </div>
                  )}

                  <div className="history-card-info">
                    <h4>{contact.fullName}</h4>
                    {contact.designation && <div className="title">{contact.designation}</div>}
                    {contact.company && <div className="company">{contact.company}</div>}
                  </div>
                </div>

                <div className="history-card-meta">
                  {contact.phones?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Phone size={12} />
                      <span>{contact.phones[0].number}</span>
                    </div>
                  )}

                  {contact.emails?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={12} />
                      <span>{contact.emails[0].email}</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                    }}
                  >
                    <Calendar size={11} />
                    <span>Saved {new Date(contact.savedAt || contact.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="history-card-actions">
                <button
                  onClick={() => onDeleteContact(contact.id)}
                  className="icon-btn"
                  style={{ width: 32, height: 32 }}
                  title="Delete from local database"
                >
                  <Trash2 size={14} style={{ color: 'var(--accent-rose)' }} />
                </button>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {onSelectContactForEdit && (
                    <button
                      onClick={() => onSelectContactForEdit(contact)}
                      className="btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    >
                      Edit
                    </button>
                  )}

                  <button
                    onClick={() => exportContactVCard(contact, 'share')}
                    className="btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    title="Share via AirDrop, WhatsApp, Messages, etc."
                  >
                    <Share2 size={12} />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={() => exportContactVCard(contact, 'download')}
                    className="btn-primary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    title="Download .vcf card — tap file to add to Apple or Google Contacts"
                  >
                    <Download size={12} />
                    <span>Add to Contacts (.vcf)</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
