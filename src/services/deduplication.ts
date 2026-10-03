import type { DuplicateMatch, ExtractedContact, MatchReason, StoredContact } from '../types/contact';

/**
 * Normalizes email address for comparison
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalizes phone number: strips all non-digits, keeps last 10 digits
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Keep up to last 10 digits to handle country codes (+1, +44, etc.)
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Normalizes name & company string for similarity comparison
 */
function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Dice coefficient similarity between two strings (0.0 to 1.0)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = cleanString(str1);
  const s2 = cleanString(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1.0 : 0.0;

  const getBigrams = (str: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);

  let intersection = 0;
  bg1.forEach((count1, bigram) => {
    if (bg2.has(bigram)) {
      intersection += Math.min(count1, bg2.get(bigram)!);
    }
  });

  const total = (s1.length - 1) + (s2.length - 1);
  return (2.0 * intersection) / total;
}

/**
 * Checks an incoming extracted contact against all stored contacts in local storage
 * Returns DuplicateMatch if a match is detected according to FR-4.2 heuristics
 */
export function checkForDuplicate(
  incoming: ExtractedContact,
  storedContacts: StoredContact[]
): DuplicateMatch | null {
  if (!storedContacts || storedContacts.length === 0) {
    return null;
  }

  // 1. Check exact email matches
  const incomingEmails = incoming.emails.map((e) => normalizeEmail(e.email)).filter(Boolean);
  if (incomingEmails.length > 0) {
    for (const existing of storedContacts) {
      const existingEmails = existing.emails.map((e) => normalizeEmail(e.email)).filter(Boolean);
      for (const inEmail of incomingEmails) {
        if (existingEmails.includes(inEmail)) {
          return {
            existingContact: existing,
            reasons: ['email'],
            confidenceScore: 0.98,
            matchedValue: inEmail,
          };
        }
      }
    }
  }

  // 2. Check phone matches (clean numeric phone string)
  const incomingPhones = incoming.phones
    .map((p) => normalizePhone(p.number))
    .filter((p) => p.length >= 7);

  if (incomingPhones.length > 0) {
    for (const existing of storedContacts) {
      const existingPhones = existing.phones
        .map((p) => normalizePhone(p.number))
        .filter((p) => p.length >= 7);

      for (const inPhone of incomingPhones) {
        if (existingPhones.includes(inPhone)) {
          return {
            existingContact: existing,
            reasons: ['phone'],
            confidenceScore: 0.95,
            matchedValue: inPhone,
          };
        }
      }
    }
  }

  // 3. High-confidence string similarity on Name + Company combination
  const inName = cleanString(incoming.fullName);
  const inCompany = cleanString(incoming.company);

  if (inName.length >= 3) {
    let bestMatch: StoredContact | null = null;
    let highestScore = 0;
    let matchedReason: MatchReason[] = [];

    for (const existing of storedContacts) {
      const exName = cleanString(existing.fullName);
      const exCompany = cleanString(existing.company);

      const nameSim = stringSimilarity(inName, exName);

      // If names are very similar and both companies match
      if (inCompany && exCompany) {
        const companySim = stringSimilarity(inCompany, exCompany);
        if (nameSim >= 0.85 && companySim >= 0.75) {
          const combined = (nameSim + companySim) / 2;
          if (combined > highestScore) {
            highestScore = combined;
            bestMatch = existing;
            matchedReason = ['name_company'];
          }
        }
      } else if (nameSim >= 0.95) {
        // Almost exact name match even without company
        if (nameSim > highestScore) {
          highestScore = nameSim;
          bestMatch = existing;
          matchedReason = ['name_company'];
        }
      }
    }

    if (bestMatch && highestScore >= 0.82) {
      return {
        existingContact: bestMatch,
        reasons: matchedReason,
        confidenceScore: highestScore,
        matchedValue: `${bestMatch.fullName}${bestMatch.company ? ' (' + bestMatch.company + ')' : ''}`,
      };
    }
  }

  return null;
}

/**
 * Merges new extracted data into an existing contact, filling missing fields
 */
export function mergeContacts(existing: StoredContact, incoming: ExtractedContact): StoredContact {
  const merged: StoredContact = {
    ...existing,
    fullName: existing.fullName || incoming.fullName,
    firstName: existing.firstName || incoming.firstName,
    lastName: existing.lastName || incoming.lastName,
    company: existing.company || incoming.company,
    designation: existing.designation || incoming.designation,
    address: existing.address || incoming.address,
    notes: [existing.notes, incoming.notes].filter(Boolean).join('\n---\n'),
    updatedAt: Date.now(),
  };

  // Merge phone numbers without duplicates
  const existingNumbers = new Set(existing.phones.map((p) => normalizePhone(p.number)));
  const mergedPhones = [...existing.phones];
  for (const p of incoming.phones) {
    const norm = normalizePhone(p.number);
    if (norm && !existingNumbers.has(norm)) {
      mergedPhones.push(p);
      existingNumbers.add(norm);
    }
  }
  merged.phones = mergedPhones;

  // Merge emails without duplicates
  const existingEmails = new Set(existing.emails.map((e) => normalizeEmail(e.email)));
  const mergedEmails = [...existing.emails];
  for (const e of incoming.emails) {
    const norm = normalizeEmail(e.email);
    if (norm && !existingEmails.has(norm)) {
      mergedEmails.push(e);
      existingEmails.add(norm);
    }
  }
  merged.emails = mergedEmails;

  // Merge websites without duplicates
  const existingWebsites = new Set(existing.websites.map((w) => w.toLowerCase().trim()));
  const mergedWebsites = [...existing.websites];
  for (const w of incoming.websites) {
    const clean = w.toLowerCase().trim();
    if (clean && !existingWebsites.has(clean)) {
      mergedWebsites.push(w);
      existingWebsites.add(clean);
    }
  }
  merged.websites = mergedWebsites;

  // Use newer avatar crop if existing is empty
  if (!merged.cropAvatarUri && incoming.cropAvatarUri) {
    merged.cropAvatarUri = incoming.cropAvatarUri;
  }

  return merged;
}
