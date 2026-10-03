import type { ExtractedContact, StoredContact } from '../types/contact';

/**
 * Escapes characters in vCard text fields according to RFC 2426
 */
function escapeVCardText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Folds lines to max 75 octets according to RFC 2426
 * Continuation lines start with a single space ' '
 */
function foldVCardLine(line: string, maxLen = 75): string {
  if (line.length <= maxLen) {
    return line;
  }

  const parts: string[] = [];
  parts.push(line.slice(0, maxLen));

  let remaining = line.slice(maxLen);
  // Continuation lines have 1 space prefix, so max chunk is maxLen - 1
  const chunkLen = maxLen - 1;

  while (remaining.length > 0) {
    parts.push(' ' + remaining.slice(0, chunkLen));
    remaining = remaining.slice(chunkLen);
  }

  return parts.join('\r\n');
}

/**
 * Generates a standard vCard 3.0 string for a single contact
 */
export function generateSingleVCard(contact: ExtractedContact | StoredContact): string {
  const lines: string[] = [];

  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');

  // Formatted Name
  const fn = contact.fullName.trim() || 'New Contact';
  lines.push(foldVCardLine(`FN:${escapeVCardText(fn)}`));

  // Structured Name N: Family;Given;Additional;Prefix;Suffix
  let lastName = contact.lastName.trim();
  let firstName = contact.firstName.trim();
  if (!firstName && !lastName && fn) {
    const parts = fn.split(/\s+/);
    if (parts.length > 1) {
      firstName = parts.slice(0, -1).join(' ');
      lastName = parts[parts.length - 1];
    } else {
      firstName = fn;
    }
  }
  lines.push(foldVCardLine(`N:${escapeVCardText(lastName)};${escapeVCardText(firstName)};;;`));

  // Company / Organization
  if (contact.company) {
    lines.push(foldVCardLine(`ORG:${escapeVCardText(contact.company)}`));
  }

  // Job Title / Designation
  if (contact.designation) {
    lines.push(foldVCardLine(`TITLE:${escapeVCardText(contact.designation)}`));
  }

  // Phone numbers
  if (contact.phones && contact.phones.length > 0) {
    contact.phones.forEach((p, idx) => {
      const num = p.number.trim();
      if (!num) return;
      const type = p.type || (idx === 0 ? 'CELL' : 'WORK');
      lines.push(foldVCardLine(`TEL;TYPE=${type}:${escapeVCardText(num)}`));
    });
  }

  // Emails
  if (contact.emails && contact.emails.length > 0) {
    contact.emails.forEach((e) => {
      const email = e.email.trim();
      if (!email) return;
      const type = e.type || 'INTERNET';
      lines.push(foldVCardLine(`EMAIL;TYPE=${type}:${escapeVCardText(email)}`));
    });
  }

  // Address
  if (contact.address) {
    lines.push(foldVCardLine(`ADR;TYPE=WORK:;;${escapeVCardText(contact.address)};;;;`));
  }

  // Websites
  if (contact.websites && contact.websites.length > 0) {
    contact.websites.forEach((w) => {
      const url = w.trim();
      if (!url) return;
      lines.push(foldVCardLine(`URL:${url}`));
    });
  }

  // Notes
  if (contact.notes) {
    lines.push(foldVCardLine(`NOTE:${escapeVCardText(contact.notes)}`));
  }

  // Card Photo Avatar (FR-6.3)
  if (contact.useAvatarInVcard && contact.cropAvatarUri) {
    // Strip "data:image/jpeg;base64," prefix to obtain pure base64
    const base64Match = contact.cropAvatarUri.match(/^data:image\/(?:jpeg|png|webp);base64,(.+)$/);
    if (base64Match && base64Match[1]) {
      const pureBase64 = base64Match[1].replace(/\s/g, '');
      const photoLine = `PHOTO;ENCODING=b;TYPE=JPEG:${pureBase64}`;
      lines.push(foldVCardLine(photoLine));
    }
  }

  // Timestamp
  lines.push(`REV:${new Date().toISOString()}`);
  lines.push('END:VCARD');

  return lines.join('\r\n') + '\r\n';
}

/**
 * Generates a consolidated batch vCard containing multiple contacts
 */
export function generateBatchVCard(contacts: (ExtractedContact | StoredContact)[]): string {
  return contacts.map((c) => generateSingleVCard(c)).join('');
}

/**
 * Clean filename helper
 */
function sanitizeFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/gi, '_')
      .replace(/_+/g, '_')
      .slice(0, 40) || 'contact'
  );
}

/**
 * Delivers vCard via native mobile share sheet (iOS Safari / Android Chrome)
 * or triggers a direct .vcf file download
 */
export async function exportContactVCard(
  contact: ExtractedContact | StoredContact,
  mode: 'share' | 'download' = 'share'
): Promise<{ success: boolean; method: 'share' | 'download'; error?: string }> {
  const vcfString = generateSingleVCard(contact);
  const blob = new Blob([vcfString], { type: 'text/vcard;charset=utf-8' });
  const fileName = `${sanitizeFileName(contact.fullName || 'contact')}.vcf`;

  if (mode === 'share' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], fileName, { type: 'text/vcard' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: contact.fullName || 'Contact Card',
          text: `Contact card for ${contact.fullName}`,
        });
        return { success: true, method: 'share' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled the share dialog
        return { success: false, method: 'share', error: 'Share cancelled' };
      }
      console.warn('Native share failed, falling back to download:', err);
    }
  }

  // Fallback: Trigger direct file download
  downloadBlob(blob, fileName);
  return { success: true, method: 'download' };
}

/**
 * Downloads a consolidated batch .vcf file with multiple contacts
 */
export function exportBatchVCard(contacts: (ExtractedContact | StoredContact)[]): void {
  if (contacts.length === 0) return;
  const vcfString = generateBatchVCard(contacts);
  const blob = new Blob([vcfString], { type: 'text/vcard;charset=utf-8' });
  const timeStamp = new Date().toISOString().slice(0, 10);
  const fileName = `batch_contacts_${timeStamp}_${contacts.length}_cards.vcf`;
  downloadBlob(blob, fileName);
}

/**
 * Helper to download Blob to user's disk
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}
