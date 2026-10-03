# CardToContact 📇

> **Privacy-first, client-side Progressive Web Application (PWA) to digitize physical business cards directly into your smartphone's native address book.**

🚀 **Live Demo:** Try it out deployed at **[https://main.d120adivgcidxs.amplifyapp.com/](https://main.d120adivgcidxs.amplifyapp.com/)**

CardToContact uses your own OpenRouter API key (BYOK) with state-of-the-art vision models (e.g. `google/gemini-2.5-flash`, `anthropic/claude-3.5-sonnet`, `openai/gpt-4o-mini`). It aggressively downscales photos locally, detects single or multiple business cards in a single frame, extracts structured contact entities using **OpenRouter Structured Outputs**, flags duplicates, and exports standard vCards (`.vcf`) containing the physical card crop as the contact avatar.

---

## 🌟 Key Features

* **Zero Intermediate Servers:** 100% client-side. Contact data, images, crops, and API keys remain exclusively on your device, communicating directly with OpenRouter via HTTPS.
* **OpenRouter Structured Outputs:** Uses `response_format` with `type: "json_schema"` (`strict: true`) to ensure type-safe extraction with zero parsing errors.
* **Multi-Card Tabletop Detection:** Lay 2 to 6 cards on a table and snap a single photo; spatial bounding boxes isolate and extract each card independently.
* **Client-Side Pre-Compression:** Scales images down to $\le 1920\text{px}$ and compresses to $< 600\text{ KB}$ before upload to save mobile bandwidth.
* **Contact Avatar Isolation:** HTML5 canvas automatically crops each card and compresses it to an avatar thumbnail ($\sim 25\text{ KB}$ JPEG).
* **Caller ID Recognition:** Option in Settings to append the Company Name and/or Designation to the Full Name (e.g. `Jane Doe (Acme Innovations • CTO)`), so when your phone rings you immediately know who is calling.
* **Interactive Re-Crop Tool:** Drag-and-drop boundary handles with live avatar preview if AI bounding box needs adjustment.
* **Local Deduplication:** Checks incoming cards against local history using exact email, normalized phone, and string similarity heuristics.
* **Standard vCard 3.0 Export:** Generates RFC 2426-compliant `.vcf` files with 75-octet folded lines for embedded `PHOTO` avatars (compatible with iOS Contacts and Google Contacts).
* **Searchable Offline History:** IndexedDB-backed local contact store with instant real-time search, bulk `.vcf` export, and JSON backup/restore.
* **PWA Ready:** Web app manifest and offline service worker for home screen installation on iOS and Android.

---

## 🛠️ Technology Stack

* **Frontend:** React 19 + TypeScript
* **Build Tool:** Vite 6
* **Icons:** Lucide React
* **Styling:** Bespoke Vanilla CSS (Dark/Light modes, Glassmorphism, CSS Custom Properties)
* **Storage:** Native IndexedDB (`CardToContactDB`) & `localStorage`
* **AI Gateway:** Direct client-side OpenRouter API integration (BYOK)

---

## 🚀 Getting Started

### Prerequisites

* Node.js 18+ (tested on Node 20+)
* npm 9+

### Installation & Development

```bash
# Clone the repository
git clone <repository-url>
cd cardscannerprd

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
```

The static bundle will be built in the `dist/` directory, ready to be hosted on any static CDN (Vercel, Cloudflare Pages, Netlify, GitHub Pages) without any backend server.

---

## 🔒 Privacy & Security

* **Zero Telemetry / Zero Egress:** No tracking analytics, third-party trackers, or proxy servers.
* **BYOK Architecture:** Your OpenRouter API key is stored only in your browser's local storage and is sent only in the `Authorization: Bearer ...` header directly to `https://openrouter.ai/api/v1/chat/completions`.
* **No Database Sync:** All scans and saved contacts remain strictly on your local device.

---

## 📄 License

MIT License. Free and open source for personal and commercial use.
