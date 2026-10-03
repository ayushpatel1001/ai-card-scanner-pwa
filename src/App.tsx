import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  History,
  Sparkles,
  Download,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Header } from './components/Header';
import { CaptureZone } from './components/CaptureZone';
import { QueueViewer } from './components/QueueViewer';
import { ContactReviewCard } from './components/ContactReviewCard';
import { CropAdjustModal } from './components/CropAdjustModal';
import { DuplicateResolverModal } from './components/DuplicateResolverModal';
import { HistoryView } from './components/HistoryView';
import { SettingsModal } from './components/SettingsModal';
import { ToastProvider, useToast } from './components/Toast';

import type {
  AppSettings,
  BoundingBox,
  ExtractedContact,
  ScanQueueItem,
  StoredContact,
} from './types/contact';
import { formatContactFullName } from './types/contact';
import {
  loadSettings,
  saveSettings,
  getAllContacts,
  saveContact,
  deleteContact,
  clearAllContacts,
  saveContactsBatch,
} from './services/storage';
import { precompressImage, cropCardAvatar, normalizeBoundingBox } from './services/imageProcessor';
import { analyzeBusinessCardPhoto } from './services/openrouter';
import { checkForDuplicate, mergeContacts } from './services/deduplication';
import { exportBatchVCard, exportContactVCard } from './services/vcard';
import { generateSampleMultiCardImage } from './services/sampleData';

import './styles/main.css';
import './styles/components.css';

function MainApp() {
  const { showToast } = useToast();

  // Settings & Theme
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active Navigation Tab: 'scan' | 'history'
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');

  // Queue of images being processed
  const [queue, setQueue] = useState<ScanQueueItem[]>([]);

  // Pending extracted contacts on the staging screen
  const [stagingContacts, setStagingContacts] = useState<ExtractedContact[]>([]);

  // Stored historical contacts in IndexedDB
  const [storedContacts, setStoredContacts] = useState<StoredContact[]>([]);

  // Modals state
  const [cropModalContact, setCropModalContact] = useState<ExtractedContact | null>(null);
  const [cropModalSourceUri, setCropModalSourceUri] = useState<string>('');

  const [dupModalContact, setDupModalContact] = useState<ExtractedContact | null>(null);

  // Map of sourceImageId to compressedDataUri for re-cropping
  const [imageCache, setImageCache] = useState<Record<string, string>>({});

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Load contacts from IndexedDB on startup
  const refreshStoredContacts = useCallback(async () => {
    try {
      const contacts = await getAllContacts();
      setStoredContacts(contacts);
    } catch (err) {
      console.error('Failed to load contacts from IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    refreshStoredContacts();
  }, [refreshStoredContacts]);

  // Handle Settings Save
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    showToast('success', 'Settings updated successfully');
  };

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = { ...settings, theme: nextTheme as 'dark' | 'light' };
    setSettings(updated);
    saveSettings(updated);
  };

  // Process a single image through downscaling, inference, and cropping
  const processImageFile = async (
    file: File,
    customDataUri?: string,
    mockCards?: any[]
  ) => {
    const queueId = Math.random().toString(36).substring(2, 9);
    const sourceImageId = 'img_' + queueId;

    // 1. Enqueue item
    const initialItem: ScanQueueItem = {
      id: queueId,
      fileName: file.name,
      fileSizeOriginal: file.size,
      previewUrl: '',
      status: 'compressing',
      progress: 20,
    };

    setQueue((prev) => [initialItem, ...prev]);

    try {
      // 2. Pre-compress image client-side (downscale to <= 1920px, JPEG < 600 KB)
      let compressedDataUri = customDataUri;
      let compressedBytes = file.size;

      if (!compressedDataUri) {
        const comp = await precompressImage(
          file,
          1920,
          (settings.targetCompressionKb || 550) * 1024
        );
        compressedDataUri = comp.dataUri;
        compressedBytes = comp.sizeBytes;
      }

      // Store in image cache for manual re-crop
      setImageCache((prev) => ({ ...prev, [sourceImageId]: compressedDataUri! }));

      // Update queue item with compressed preview & stats
      setQueue((prev) =>
        prev.map((item) =>
          item.id === queueId
            ? {
                ...item,
                previewUrl: compressedDataUri!,
                compressedDataUri: compressedDataUri!,
                fileSizeCompressed: compressedBytes,
                status: 'analyzing',
                progress: 50,
              }
            : item
        )
      );

      // 3. Vision Inference
      let extractedCards: any[] = [];

      if (mockCards) {
        // Instant synthetic sample analysis
        extractedCards = mockCards;
      } else {
        if (!settings.openRouterApiKey) {
          setIsSettingsOpen(true);
          throw new Error('Please configure your OpenRouter API Key in Settings to scan cards');
        }

        extractedCards = await analyzeBusinessCardPhoto(
          compressedDataUri!,
          settings.openRouterApiKey,
          settings.modelId
        );
      }

      if (extractedCards.length === 0) {
        throw new Error('No business cards detected. Please ensure good lighting and clear card borders.');
      }

      // 4. Crop each card avatar & perform local deduplication check
      const newContacts: ExtractedContact[] = [];

      for (let i = 0; i < extractedCards.length; i++) {
        const raw = extractedCards[i];
        const box = normalizeBoundingBox(raw.box || { ymin: 0, xmin: 0, ymax: 1, xmax: 1 });

        // Generate 360x360 avatar crop
        let cropAvatarUri = '';
        try {
          cropAvatarUri = await cropCardAvatar(
            compressedDataUri!,
            box,
            settings.avatarSize || 360
          );
        } catch (cropErr) {
          console.warn('Avatar cropping failed, using full image fallback:', cropErr);
          cropAvatarUri = compressedDataUri!;
        }

        const rawName = raw.full_name || [raw.first_name, raw.last_name].filter(Boolean).join(' ') || 'New Contact';
        const company = raw.company || '';
        const designation = raw.designation || '';

        const formattedFullName = formatContactFullName(rawName, company, designation, {
          appendCompanyToName: settings.appendCompanyToName,
          appendDesignationToName: settings.appendDesignationToName,
          nameDisplayFormat: settings.nameDisplayFormat,
        });

        const contact: ExtractedContact = {
          id: 'card_' + Math.random().toString(36).substring(2, 9),
          sourceImageId,
          sourceImageFileName: file.name,
          cardIndex: i,
          fullName: formattedFullName,
          firstName: raw.first_name || '',
          lastName: raw.last_name || '',
          company,
          designation,
          phones: (raw.phones || []).map((p: any) => ({
            id: Math.random().toString(36).substring(2, 7),
            number: p.number,
            type: p.type || 'CELL',
          })),
          emails: (raw.emails || []).map((e: any) => ({
            id: Math.random().toString(36).substring(2, 7),
            email: e.email,
            type: e.type || 'WORK',
          })),
          address: raw.address || '',
          websites: raw.websites || [],
          notes: raw.notes || '',
          box,
          cropAvatarUri,
          useAvatarInVcard: true,
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Deduplication check against stored contacts
        const duplicateMatch = checkForDuplicate(contact, storedContacts);
        if (duplicateMatch) {
          contact.status = 'duplicate_detected';
          contact.duplicateMatch = duplicateMatch;
        }

        newContacts.push(contact);
      }

      // 5. Update queue status
      setQueue((prev) =>
        prev.map((item) =>
          item.id === queueId
            ? {
                ...item,
                status: 'extracted',
                progress: 100,
                cardsFound: newContacts.length,
              }
            : item
        )
      );

      // 6. Add contacts to staging review
      setStagingContacts((prev) => [...newContacts, ...prev]);
      showToast(
        'success',
        `Successfully isolated ${newContacts.length} business card${newContacts.length === 1 ? '' : 's'}!`
      );
    } catch (err: any) {
      console.error('Image processing pipeline failed:', err);
      setQueue((prev) =>
        prev.map((item) =>
          item.id === queueId
            ? {
                ...item,
                status: 'error',
                error: err.message || 'Processing failed',
              }
            : item
        )
      );
      showToast('error', err.message || 'Failed to process card');
    }
  };

  // Handle multi-file selection from Camera or Gallery
  const handleFilesSelected = (files: File[]) => {
    for (const f of files) {
      processImageFile(f);
    }
  };

  // Load synthetic tabletop snapshot demo
  const handleLoadSample = async () => {
    try {
      showToast('info', 'Generating high-resolution multi-card tabletop snapshot...');
      const sample = await generateSampleMultiCardImage();
      await processImageFile(sample.file, sample.dataUri, sample.cards);
    } catch (err: any) {
      showToast('error', 'Sample generation failed: ' + err.message);
    }
  };

  // Contact Field Change on Staging Screen
  const handleContactChange = (updated: ExtractedContact) => {
    setStagingContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  // Save Contact to IndexedDB & download standard .vcf for device Contacts import
  const handleSaveToDevice = async (contact: ExtractedContact) => {
    try {
      const stored: StoredContact = {
        ...contact,
        status: 'saved',
        savedAt: Date.now(),
      };

      await saveContact(stored);
      await refreshStoredContacts();

      // Trigger standard vCard 3.0 file download
      await exportContactVCard(stored, 'download');

      // Remove from staging
      setStagingContacts((prev) => prev.filter((c) => c.id !== contact.id));
      showToast('success', `Saved! Tap downloaded ${contact.fullName}.vcf to add to Apple or Google Contacts.`);
    } catch (err: any) {
      showToast('error', 'Failed to save contact: ' + err.message);
    }
  };

  // Share Contact via native mobile share sheet (AirDrop, WhatsApp, Messages)
  const handleShareContact = async (contact: ExtractedContact) => {
    try {
      const res = await exportContactVCard(contact, 'share');
      if (res.success && res.method === 'share') {
        showToast('info', `Shared ${contact.fullName}`);
      } else if (res.method === 'download') {
        showToast('info', `Downloaded ${contact.fullName}.vcf`);
      }
    } catch (err: any) {
      showToast('error', 'Share failed: ' + err.message);
    }
  };

  // Discard Contact from Staging
  const handleDiscardContact = (id: string) => {
    setStagingContacts((prev) => prev.filter((c) => c.id !== id));
    showToast('info', 'Card discarded');
  };

  // Bulk Save all verified staging contacts & download batch .vcf
  const handleSaveAllStaging = async () => {
    if (stagingContacts.length === 0) return;

    try {
      const storedBatch: StoredContact[] = stagingContacts.map((c) => ({
        ...c,
        status: 'saved',
        savedAt: Date.now(),
      }));

      await saveContactsBatch(storedBatch);
      await refreshStoredContacts();

      // Export bulk .vcf
      exportBatchVCard(storedBatch);

      setStagingContacts([]);
      showToast('success', `Saved! Open the downloaded batch .vcf to import all ${storedBatch.length} contacts.`);
    } catch (err: any) {
      showToast('error', 'Bulk save failed: ' + err.message);
    }
  };

  // Open Interactive Crop Modal
  const handleOpenCropModal = (contact: ExtractedContact) => {
    const sourceUri = imageCache[contact.sourceImageId] || contact.cropAvatarUri;
    setCropModalContact(contact);
    setCropModalSourceUri(sourceUri);
  };

  // Apply new crop boundaries
  const handleApplyCrop = (contactId: string, newBox: BoundingBox, newAvatarUri: string) => {
    setStagingContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? {
              ...c,
              box: newBox,
              cropAvatarUri: newAvatarUri,
              updatedAt: Date.now(),
            }
          : c
      )
    );
    setCropModalContact(null);
    showToast('success', 'Card crop avatar updated');
  };

  // Duplicate Resolution Handlers
  const handleOpenDuplicateModal = (contact: ExtractedContact) => {
    setDupModalContact(contact);
  };

  const handleMergeDuplicate = async (incoming: ExtractedContact) => {
    if (!incoming.duplicateMatch) return;
    try {
      const merged = mergeContacts(incoming.duplicateMatch.existingContact, incoming);
      await saveContact(merged);
      await refreshStoredContacts();

      // Remove from staging
      setStagingContacts((prev) => prev.filter((c) => c.id !== incoming.id));
      setDupModalContact(null);
      showToast('success', `Merged updates into ${merged.fullName}`);
    } catch (err: any) {
      showToast('error', 'Merge failed: ' + err.message);
    }
  };

  const handleSaveAsNewDuplicate = (incoming: ExtractedContact) => {
    setStagingContacts((prev) =>
      prev.map((c) =>
        c.id === incoming.id
          ? {
              ...c,
              status: 'verified',
              duplicateMatch: undefined,
            }
          : c
      )
    );
    setDupModalContact(null);
    showToast('info', 'Kept as a new independent contact');
  };

  // History Handlers
  const handleDeleteContact = async (id: string) => {
    try {
      await deleteContact(id);
      await refreshStoredContacts();
      showToast('info', 'Contact deleted');
    } catch (err: any) {
      showToast('error', 'Delete failed: ' + err.message);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await clearAllContacts();
      await refreshStoredContacts();
      showToast('info', 'All contact history cleared');
    } catch (err: any) {
      showToast('error', 'Clear history failed: ' + err.message);
    }
  };

  const handleImportContacts = async (imported: StoredContact[]) => {
    try {
      await saveContactsBatch(imported);
      await refreshStoredContacts();
      showToast('success', `Imported ${imported.length} contacts successfully`);
    } catch (err: any) {
      showToast('error', 'Import failed: ' + err.message);
    }
  };

  const handleSelectContactForEdit = (contact: StoredContact) => {
    // Put back into staging for editing
    setStagingContacts((prev) => [contact, ...prev.filter((c) => c.id !== contact.id)]);
    setActiveTab('scan');
    showToast('info', `Loaded ${contact.fullName} into editor`);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTheme={handleToggleTheme}
      />

      {/* Navigation Tabs */}
      <nav className="nav-tabs" aria-label="Main Navigation">
        <button
          onClick={() => setActiveTab('scan')}
          className={`nav-tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
          id="tab-scan"
        >
          <CreditCard size={16} />
          <span>Scan &amp; Review</span>
          {stagingContacts.length > 0 && (
            <span className="tab-badge">{stagingContacts.length}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          id="tab-history"
        >
          <History size={16} />
          <span>Saved Contacts</span>
          {storedContacts.length > 0 && (
            <span
              className="tab-badge"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {storedContacts.length}
            </span>
          )}
        </button>
      </nav>

      {/* Main Tab Content */}
      <main>
        {activeTab === 'scan' && (
          <>
            {/* Capture Area */}
            <CaptureZone
              onFilesSelected={handleFilesSelected}
              onLoadSample={handleLoadSample}
            />

            {/* Batch Processing Queue */}
            <QueueViewer
              queue={queue}
              onRemoveItem={(id) => setQueue((prev) => prev.filter((i) => i.id !== id))}
              onRetryItem={(item) => {
                if (item.compressedDataUri) {
                  // Retry analysis
                  setQueue((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, status: 'analyzing', error: undefined } : i))
                  );
                }
              }}
              onClearCompleted={() =>
                setQueue((prev) => prev.filter((i) => i.status !== 'extracted'))
              }
            />

            {/* Staging Review Screen */}
            {stagingContacts.length > 0 && (
              <section className="staging-section">
                <div className="staging-header">
                  <h2>
                    <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
                    Staging &amp; Verification ({stagingContacts.length} Card
                    {stagingContacts.length === 1 ? '' : 's'})
                  </h2>

                  <div className="staging-actions">
                    <button
                      onClick={() => exportBatchVCard(stagingContacts)}
                      className="btn-secondary btn-sm"
                      title="Export all staging cards into a consolidated .vcf file"
                    >
                      <Download size={14} />
                      <span>Export All vCard</span>
                    </button>

                    <button
                      onClick={handleSaveAllStaging}
                      className="btn-primary btn-sm"
                      title="Save all staging contacts to device history & export"
                    >
                      <CheckCircle2 size={14} />
                      <span>Save All ({stagingContacts.length})</span>
                    </button>
                  </div>
                </div>

                <div className="contacts-import-info-banner">
                  <div className="import-banner-icon">
                    <Info size={16} />
                  </div>
                  <div className="import-banner-text">
                    <strong>Saving to Phone Contacts:</strong> Due to mobile browser security sandboxes, web apps cannot directly write to your phone's address book without user confirmation. Tapping <strong>"Add to Phone Contacts (.vcf)"</strong> downloads the contact card — simply tap the downloaded file in your browser to open Apple Contacts or Google Contacts and tap <strong>"Save"</strong>!
                  </div>
                </div>

                <div className="review-cards-grid">
                  {stagingContacts.map((contact) => (
                    <ContactReviewCard
                      key={contact.id}
                      contact={contact}
                      onChange={handleContactChange}
                      onAdjustCrop={handleOpenCropModal}
                      onOpenDuplicateModal={handleOpenDuplicateModal}
                      onSaveToDevice={handleSaveToDevice}
                      onShareContact={handleShareContact}
                      onDiscard={handleDiscardContact}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <HistoryView
            contacts={storedContacts}
            onDeleteContact={handleDeleteContact}
            onClearAll={handleClearAllHistory}
            onImportContacts={handleImportContacts}
            onSelectContactForEdit={handleSelectContactForEdit}
          />
        )}
      </main>

      {/* Manual Re-Crop Modal */}
      {cropModalContact && (
        <CropAdjustModal
          contact={cropModalContact}
          sourceImageUri={cropModalSourceUri}
          onApplyCrop={handleApplyCrop}
          onClose={() => setCropModalContact(null)}
        />
      )}

      {/* Duplicate Resolution Modal */}
      {dupModalContact && dupModalContact.duplicateMatch && (
        <DuplicateResolverModal
          contact={dupModalContact}
          duplicateMatch={dupModalContact.duplicateMatch}
          onMerge={handleMergeDuplicate}
          onSaveAsNew={handleSaveAsNewDuplicate}
          onDiscard={handleDiscardContact}
          onClose={() => setDupModalContact(null)}
        />
      )}

      {/* BYOK Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

export default App;
