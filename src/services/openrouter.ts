import type { BoundingBox, OpenRouterModelOption } from '../types/contact';

export const OPENROUTER_MODELS: OpenRouterModelOption[] = [
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tag: 'Recommended Default',
    costPer1k: '~$0.0003 / card',
    speed: 'Ultra-Fast (~1.5s)',
    recommended: true,
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    tag: 'High Reliability',
    costPer1k: '~$0.0003 / card',
    speed: 'Ultra-Fast (~1.5s)',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    tag: 'Cost-Effective',
    costPer1k: '~$0.001 / card',
    speed: 'Fast (~2s)',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    tag: 'Maximum Accuracy',
    costPer1k: '~$0.015 / card',
    speed: 'Moderate (~3.5s)',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o Vision',
    tag: 'High Fidelity',
    costPer1k: '~$0.01 / card',
    speed: 'Moderate (~3s)',
  },
];

export interface RawExtractedCard {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  designation?: string;
  phones?: Array<{ number: string; type?: string }>;
  emails?: Array<{ email: string; type?: string }>;
  address?: string;
  websites?: string[];
  notes?: string;
  box: BoundingBox;
}

export interface OpenRouterKeyInfo {
  isValid: boolean;
  label?: string;
  usage?: number;
  limit?: number | null;
  isFreeTier?: boolean;
  rateLimit?: any;
  error?: string;
}

/**
 * Validates the OpenRouter API Key via the official auth/key endpoint
 */
export async function testOpenRouterKey(apiKey: string): Promise<OpenRouterKeyInfo> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { isValid: false, error: 'API key is empty' };
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${trimmed}`,
      },
    });

    if (res.status === 401) {
      return { isValid: false, error: 'Invalid API key (401 Unauthorized)' };
    }

    if (!res.ok) {
      const errText = await res.text();
      return { isValid: false, error: `Key validation failed (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return {
      isValid: true,
      label: data.data?.label || 'Active Key',
      usage: data.data?.usage,
      limit: data.data?.limit,
      isFreeTier: data.data?.is_free_tier,
      rateLimit: data.data?.rate_limit,
    };
  } catch (err: any) {
    return { isValid: false, error: `Network connection error: ${err.message || err}` };
  }
}

const SYSTEM_PROMPT = `You are a high-precision computer vision and optical entity extraction system specialized in physical business card detection.
Your goal is to detect ALL distinct business cards present in the provided image (single card or multiple cards laid out on a table or surface).

For each detected business card, output:
1. "box": The bounding box coordinates enclosing the business card [ymin, xmin, ymax, xmax] normalized as decimal floats between 0.0 and 1.0 (where 0.0 is top/left, and 1.0 is bottom/right). Ensure the box tightly wraps the physical edges of the card.
2. "full_name": The individual's full name.
3. "first_name": Given name.
4. "last_name": Family / surname.
5. "company": Organization, employer, or company name.
6. "designation": Job title, role, or professional designation (e.g. "Senior Vice President", "Founding Partner", "Software Architect").
7. "phones": Array of phone numbers found on this card, with "number" and "type" ("CELL", "WORK", "HOME", or "OTHER").
8. "emails": Array of email addresses, with "email" and "type" ("INTERNET", "WORK", etc.).
9. "address": Physical address or office location formatted as a single clear string.
10. "websites": Array of websites, portfolio URLs, or LinkedIn/social handles found.
11. "notes": Relevant secondary info (tagline, certifications, languages, services, license numbers).

Output STRICTLY valid JSON with no markdown wrapping or preamble, adhering to this structure:
{
  "cards": [
    {
      "box": { "ymin": 0.12, "xmin": 0.08, "ymax": 0.48, "xmax": 0.52 },
      "full_name": "Jane Doe",
      "first_name": "Jane",
      "last_name": "Doe",
      "company": "Acme Innovations",
      "designation": "Chief Technology Officer",
      "phones": [ { "number": "+1 (555) 234-5678", "type": "CELL" } ],
      "emails": [ { "email": "jane@acmeinnovations.com", "type": "WORK" } ],
      "address": "100 Market St, Suite 400, San Francisco, CA 94105",
      "websites": [ "https://acmeinnovations.com" ],
      "notes": "Met at TechConf 2026. Cloud architecture consulting."
    }
  ]
}

If no business card is visible, return: {"cards": []}`;

export const BUSINESS_CARDS_STRUCTURED_SCHEMA = {
  name: 'business_card_detector',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      cards: {
        type: 'array',
        description: 'Array of all distinct physical business cards detected in the photograph',
        items: {
          type: 'object',
          properties: {
            full_name: {
              type: 'string',
              description: "The individual's full name",
            },
            first_name: {
              type: 'string',
              description: 'Given / first name',
            },
            last_name: {
              type: 'string',
              description: 'Family / surname',
            },
            company: {
              type: 'string',
              description: 'Organization, company, or employer name',
            },
            designation: {
              type: 'string',
              description: 'Job title, role, or professional designation',
            },
            phones: {
              type: 'array',
              description: 'List of phone numbers detected on this card',
              items: {
                type: 'object',
                properties: {
                  number: { type: 'string', description: 'Phone number' },
                  type: {
                    type: 'string',
                    description: 'Label type: CELL, WORK, HOME, or OTHER',
                  },
                },
                required: ['number', 'type'],
                additionalProperties: false,
              },
            },
            emails: {
              type: 'array',
              description: 'List of email addresses detected on this card',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string', description: 'Email address' },
                  type: {
                    type: 'string',
                    description: 'Label type: INTERNET, WORK, HOME, or OTHER',
                  },
                },
                required: ['email', 'type'],
                additionalProperties: false,
              },
            },
            address: {
              type: 'string',
              description: 'Physical postal address or office location',
            },
            websites: {
              type: 'array',
              description: 'Websites, social URLs, or portfolio links',
              items: { type: 'string' },
            },
            notes: {
              type: 'string',
              description: 'Secondary information, tagline, license numbers, or specialties',
            },
            box: {
              type: 'object',
              description: 'Normalized bounding box enclosing the card [ymin, xmin, ymax, xmax] between 0.0 and 1.0',
              properties: {
                ymin: { type: 'number', description: 'Top edge normalized coordinate (0.0 to 1.0)' },
                xmin: { type: 'number', description: 'Left edge normalized coordinate (0.0 to 1.0)' },
                ymax: { type: 'number', description: 'Bottom edge normalized coordinate (0.0 to 1.0)' },
                xmax: { type: 'number', description: 'Right edge normalized coordinate (0.0 to 1.0)' },
              },
              required: ['ymin', 'xmin', 'ymax', 'xmax'],
              additionalProperties: false,
            },
          },
          required: [
            'full_name',
            'first_name',
            'last_name',
            'company',
            'designation',
            'phones',
            'emails',
            'address',
            'websites',
            'notes',
            'box',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['cards'],
    additionalProperties: false,
  },
};

/**
 * Sends compressed image to OpenRouter vision model using Structured Outputs
 */
export async function analyzeBusinessCardPhoto(
  imageDataUri: string,
  apiKey: string,
  modelId = 'google/gemini-2.5-flash'
): Promise<RawExtractedCard[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('OpenRouter API key is missing. Please enter your key in Settings.');
  }

  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  // Request structured outputs according to OpenRouter json_schema spec
  const makePayload = (useStructuredSchema: boolean) => ({
    model: modelId,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this photo. Detect all distinct business cards, find their normalized bounding box [ymin, xmin, ymax, xmax] (0.0 to 1.0), and extract all contact fields into the requested JSON schema.',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUri,
            },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 3500,
    response_format: useStructuredSchema
      ? {
          type: 'json_schema',
          json_schema: BUSINESS_CARDS_STRUCTURED_SCHEMA,
        }
      : { type: 'json_object' },
  });

  const headers = {
    Authorization: `Bearer ${apiKey.trim()}`,
    'HTTP-Referer': window.location.origin || 'https://cardtocontact.app',
    'X-Title': 'CardToContact Business Card Scanner PWA',
    'Content-Type': 'application/json',
  };

  let response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(makePayload(true)),
  });

  // If endpoint doesn't support strict json_schema, fallback to json_object
  if (!response.ok && response.status === 400) {
    try {
      const errClone = await response.clone().json();
      const msg = (errClone.error?.message || '').toLowerCase();
      if (msg.includes('json_schema') || msg.includes('response_format') || msg.includes('schema')) {
        console.warn('Endpoint does not support strict json_schema, falling back to json_object mode:', msg);
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(makePayload(false)),
        });
      }
    } catch {
      // Continue with original response error
    }
  }

  if (response.status === 401) {
    throw new Error('OpenRouter Authentication Failed (401). Please verify your API Key in Settings.');
  }

  if (response.status === 402) {
    throw new Error(
      'OpenRouter Credit Exhaustion (402). You have insufficient credits on your OpenRouter account. Please top up at openrouter.ai/credits.'
    );
  }

  if (response.status === 429) {
    throw new Error('OpenRouter Rate Limit Exceeded (429). Please wait a moment before trying again.');
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(`OpenRouter Error (${response.status}): ${errorDetail}`);
  }

  const result = await response.json();
  const rawContent = result.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Empty response received from vision model');
  }

  return parseModelResponse(rawContent);
}

/**
 * Robustly parses the model response, stripping potential markdown blocks
 */
export function parseModelResponse(content: string): RawExtractedCard[] {
  let cleaned = content.trim();

  // Strip markdown code fences if model enclosed in ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // Find first '{' or '[' and last '}' or ']'
  const firstBrace = cleaned.search(/[{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    console.error('Failed to parse JSON response from model:', cleaned, err);
    throw new Error('Unable to parse card data structure returned by the vision model: ' + err.message);
  }

  let cards: any[] = [];
  if (Array.isArray(parsed)) {
    cards = parsed;
  } else if (Array.isArray(parsed.cards)) {
    cards = parsed.cards;
  } else if (parsed.card) {
    cards = [parsed.card];
  } else if (parsed.full_name || parsed.company || parsed.box) {
    cards = [parsed];
  }

  // Validate and sanitize each card
  const validatedCards: RawExtractedCard[] = [];

  for (const c of cards) {
    if (!c || typeof c !== 'object') continue;

    // Handle bounding box format variations
    let box: BoundingBox = { ymin: 0, xmin: 0, ymax: 1, xmax: 1 };
    if (c.box && typeof c.box === 'object') {
      box = {
        ymin: Number(c.box.ymin ?? 0),
        xmin: Number(c.box.xmin ?? 0),
        ymax: Number(c.box.ymax ?? 1),
        xmax: Number(c.box.xmax ?? 1),
      };
    } else if (Array.isArray(c.bounding_box) && c.bounding_box.length === 4) {
      box = {
        ymin: Number(c.bounding_box[0]),
        xmin: Number(c.bounding_box[1]),
        ymax: Number(c.bounding_box[2]),
        xmax: Number(c.bounding_box[3]),
      };
    }

    // Format phones
    const phones: Array<{ number: string; type?: string }> = [];
    if (Array.isArray(c.phones)) {
      for (const p of c.phones) {
        if (typeof p === 'string' && p.trim()) {
          phones.push({ number: p.trim(), type: 'CELL' });
        } else if (p && typeof p === 'object' && p.number) {
          phones.push({
            number: String(p.number).trim(),
            type: (p.type || 'CELL').toUpperCase(),
          });
        }
      }
    } else if (c.phone) {
      phones.push({ number: String(c.phone).trim(), type: 'CELL' });
    }

    // Format emails
    const emails: Array<{ email: string; type?: string }> = [];
    if (Array.isArray(c.emails)) {
      for (const e of c.emails) {
        if (typeof e === 'string' && e.trim()) {
          emails.push({ email: e.trim(), type: 'INTERNET' });
        } else if (e && typeof e === 'object' && e.email) {
          emails.push({
            email: String(e.email).trim(),
            type: (e.type || 'INTERNET').toUpperCase(),
          });
        }
      }
    } else if (c.email) {
      emails.push({ email: String(c.email).trim(), type: 'INTERNET' });
    }

    // Format websites
    const websites: string[] = [];
    if (Array.isArray(c.websites)) {
      for (const w of c.websites) {
        if (typeof w === 'string' && w.trim()) websites.push(w.trim());
      }
    } else if (c.website) {
      websites.push(String(c.website).trim());
    }

    validatedCards.push({
      full_name: c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed Contact',
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      company: c.company || c.organization || '',
      designation: c.designation || c.title || c.job_title || '',
      phones,
      emails,
      address: c.address || '',
      websites,
      notes: c.notes || '',
      box,
    });
  }

  return validatedCards;
}
