# Launch Guide

Everything needed to take Dev Workbench from zero to its first 5,000 stars: a pre-launch checklist, ready-to-post copy for Hacker News, Reddit and Product Hunt, and a week-by-week growth plan.

Replace `{{DEMO_URL}}` with `https://zzoraemon043.github.io/dev-workbench/` and `{{REPO_URL}}` with `https://github.com/zzoraemon043/dev-workbench` before posting.

---

## 1. Positioning

**One-liner:** The offline-first developer toolbox. Paste anything — it figures out the rest.

**The hook (lead with this everywhere):** You paste production JWTs and customer JSON into random websites every week. Those sites can log everything. Dev Workbench does the same jobs in a static page that never makes a network request.

**Three proof points, in this order:**

1. **Smart paste** — paste a JWT, JSON, `wss://` URL, base64 blob or epoch timestamp anywhere and the right tool opens with the right decoder.
2. **Zero backend, verifiable** — open DevTools → Network while using it. Nothing. Share links live in the URL fragment, which is never sent to servers.
3. **It feels like a native app** — command palette, `Alt+1…6`, drag-and-drop, PWA install, light/dark.

**Audience:** full-stack and backend developers, API integrators, security-conscious teams that ban online formatters.

---

## 2. Pre-launch checklist (do all of these before posting anywhere)

- [ ] Enable GitHub Pages (**Settings → Pages → Source: GitHub Actions**) and confirm the live demo loads.
- [ ] Repository **description**: `The offline-first developer toolbox: JSON, Regex, JWT, Diff, encoders & WebSocket debugging in one zero-backend tab.`
- [ ] Repository **website**: the demo URL.
- [ ] **Topics**: `developer-tools`, `devtools`, `json`, `regex`, `jwt`, `diff`, `base64`, `websocket`, `offline-first`, `pwa`, `privacy`, `react`, `typescript`, `vite`, `tailwindcss`.
- [ ] **Social preview image** (Settings → General): 1280×640, dark JSON Studio screenshot with the one-liner on top.
- [ ] Record a **20–30 second GIF/MP4**: paste a JWT → auto-routes → claims + countdown → `Alt+2` → regex highlight → `Ctrl+K` palette. Put it at the top of the README.
- [ ] Enable **Discussions**; pin a "Which tool should we build next?" thread.
- [ ] Create 8–10 **`good first issue`** tickets from the README roadmap (cron explainer, cURL ⇄ fetch, JSON Schema, RS256 verification…). New visitors who see easy issues become contributors.
- [ ] Cut a **v1.0.0 release** with notes and screenshots — releases show up in followers' feeds.
- [ ] Test the demo on Chrome, Firefox, Safari and a phone. First impressions are unforgiving.

---

## 3. Hacker News — Show HN

**When:** Tuesday–Thursday, 8:00–10:00 a.m. US Eastern. Post it yourself from an account with some history. Stay in the thread for the first 3 hours and answer every comment.

**Rules to respect:** link directly to the demo or repo, no marketing superlatives in the title, never ask anyone for upvotes (vote rings get detected and the post is killed).

### Title (pick one, under 80 characters)

```
Show HN: Dev Workbench – JSON, JWT, regex and diff tools that never leave your browser
```

```
Show HN: An offline developer toolbox where you paste anything and it picks the tool
```

### URL

`{{DEMO_URL}}`

### First comment (post immediately after submitting)

```
Hi HN, I built Dev Workbench because I kept pasting production JWTs and customer
payloads into whatever "online JSON formatter" Google showed me, and at some
point realized I had no idea what those sites log.

It's a static React app — no backend, no analytics, no third-party scripts.
You can verify it in the Network tab. It bundles the tools I reach for every day:

- JSON Studio: validation with line/column errors, a tree with click-to-copy
  JSONPath, JSONPath queries, and JSON -> TypeScript interfaces (optional keys
  and unions inferred across array items)
- Regex Lab: live highlighting, capture groups, replace preview, and a
  token-by-token plain-English explanation. Matching runs in a Web Worker with
  a 1.5s watchdog, so (a+)+$ can't freeze the tab
- JWT Inspector: claims with a live expiry countdown, HS256/384/512
  verification via Web Crypto, and "edit payload & re-sign" for test tokens
- Diff Studio: Myers diff with word-level highlights
- Codec Pipeline: chain base64/url/hex/hash/case/timestamp transforms and
  drag to reorder (think CyberChef-lite)
- Socket Console: a small WebSocket client with a JSON-aware frame log

The part I'm happiest with is smart paste: hit Cmd+V anywhere outside an editor
and it detects whether you pasted a JWT, JSON, a ws:// URL, base64 or an epoch
timestamp and opens the right tool. Share links compress the tool state into the
URL fragment with CompressionStream, so sharing still doesn't involve a server
(and HMAC secrets are deliberately excluded).

Stack: Vite, React 19, TypeScript (strict), Tailwind v4, Zustand. MIT licensed.

Code: {{REPO_URL}}

I'd love feedback on which tool is missing from your daily workflow — RS256
verification and a cURL <-> fetch converter are next on my list.
```

### Prepared answers for predictable comments

| Comment | Answer |
|---|---|
| "CyberChef / jwt.io / regex101 already exist." | They're excellent and inspired this. The difference is one keyboard-driven tab for the everyday 80%, with smart paste between tools, a guarantee that nothing leaves the page, and a codebase small enough to audit in an afternoon. |
| "How do I know it's really offline?" | Load it once, turn off Wi-Fi, reload — it's a PWA. Or self-host `dist/` behind your own CSP. The app has no API client at all: the only `fetch` is the service worker caching the app's own files, and the only other network code is the WebSocket client you drive yourself. |
| "Why not a VS Code extension / CLI?" | Browser tabs are the one tool every developer has open, including on locked-down corporate machines where installing extensions is restricted. |
| "Electron?" | No — it's a ~90 KB gzipped static page that installs as a PWA. |

---

## 4. Reddit

Space posts at least 2–3 days apart, adapt each one to the subreddit, and reply to every comment. Read each subreddit's self-promotion rules first; on most, you should be an active participant, not just a poster.

### r/webdev (Showoff Saturday — post on Saturday)

**Title**

```
[Showoff Saturday] I built an offline developer toolbox — paste a JWT/JSON/base64/ws:// URL anywhere and it opens the right tool
```

**Body**

```
I got tired of juggling 6 bookmarked "online formatter" sites (and of wondering
what they log), so I built Dev Workbench: one tab, zero backend, works offline.

Demo: {{DEMO_URL}}
Source (MIT): {{REPO_URL}}

What's inside:
• JSON Studio — tree view, JSONPath queries, JSON → TypeScript interfaces
• Regex Lab — live highlights, capture groups, plain-English explanations
• JWT Inspector — claims, expiry countdown, HS256 verify + re-sign
• Diff Studio — word-level side-by-side diffs
• Codec Pipeline — drag-and-drop chains of base64/url/hex/sha/case transforms
• Socket Console — WebSocket client with a JSON-aware frame log

Front-end details people here might enjoy:
• Regex matching runs in a Web Worker that gets terminated after 1.5s, so
  catastrophic backtracking can't hang the UI
• Share links = tool state → CompressionStream('deflate-raw') → base64url →
  URL fragment. No server, no database
• Native <dialog> for the command palette, Tailwind v4 CSS-variable theming,
  every tool lazy-loaded (~90 KB gzipped initial JS)

Built with Vite + React 19 + TypeScript + Tailwind v4 + Zustand. Feedback and
feature requests very welcome — what tool do you open the most?
```

### r/programming

r/programming prefers technical substance over product announcements. Post a write-up and link the repo from it.

**Title**

```
Building a zero-backend developer toolbox: Myers diff, regex sandboxing with Web Workers, and share links that never touch a server
```

**Body / blog outline** (publish on dev.to or your blog, then submit the article link)

1. The problem: online formatters are a data-leak vector. Examples of what developers paste.
2. Constraint: "no network by construction" — what that rules out and what the web platform gives you instead (Web Crypto, CompressionStream, Service Workers).
3. Myers' O(ND) diff in ~60 lines, plus the trick of snapshotting only diagonals `[-d-1, d+1]` to keep memory at O(D²).
4. Sandboxing untrusted regexes: why `RegExp` can't be interrupted and how a terminable Worker with a watchdog solves it.
5. Inferring TypeScript types from JSON: merging shapes across array items into optional keys and unions.
6. Stateless sharing with compressed URL fragments, and why fragments are never sent to servers.
7. Link: `{{REPO_URL}}` — MIT, contributions welcome.

### Also worth posting (one per week)

- **r/javascript** — focus on the Web Worker regex watchdog.
- **r/reactjs** — focus on the plugin-style tool registry and lazy loading.
- **r/selfhosted** — focus on "static files, host it behind your VPN, nothing phones home".
- **r/netsec** / **r/AskNetsec** — focus on "stop pasting tokens into third-party sites" (be educational, not promotional).

---

## 5. Product Hunt

**When:** 12:01 a.m. Pacific, Tuesday–Thursday. Ask a well-followed hunter only if you have one; self-hunting is fine. Line up 10–20 people who genuinely use it to leave thoughtful comments (not just upvotes) during the day.

**Name:** Dev Workbench

**Tagline (60 chars max)**

```
Paste anything: the private, offline toolbox for developers
```

**Topics:** Developer Tools, Open Source, Privacy, Productivity

**Description (260 chars max)**

```
JSON, regex, JWT, diff, encoder pipelines and a WebSocket console in one beautiful tab. Paste anything and it opens the right tool. 100% client-side: no backend, no tracking, works offline. Free and open source (MIT).
```

**Gallery (in this order):**

1. Hero: dark JSON Studio with the tagline overlaid
2. 30-second demo video (smart paste → JWT → regex → palette)
3. JWT Inspector with "Signature verified" and expiry countdown
4. Regex Lab with highlights and explanations
5. Codec Pipeline drag-and-drop
6. Light-mode JSON → TypeScript

**Maker's first comment**

```
Hey Product Hunt! 👋

I'm the maker of Dev Workbench. Like most developers, I used to paste JWTs,
API responses and config files into whatever online formatter came up first —
until I realized I had no idea what those sites were logging.

Dev Workbench is my answer: a single, fast tab with the tools I use daily, built
so that nothing you paste ever leaves your browser. There's literally no backend.

A few things I'm proud of:
🪄 Smart paste — Cmd/Ctrl+V anywhere and it detects JWT, JSON, URLs, base64,
   timestamps and WebSocket endpoints, then opens the right tool
🔐 Offline JWT verification and re-signing with the Web Crypto API
⛓️ Drag-and-drop transform pipelines (base64 → JSON → …)
🔗 Share links that store state in the URL itself — still no server
⌨️ Command palette and shortcuts for everything

It's free and MIT-licensed. I'd love to hear which tool you'd want next!
```

---

## 6. Other channels

| Channel | Angle | Notes |
|---|---|---|
| X / Bluesky / Mastodon | 30-second screen recording of smart paste, no talking | Post the video natively, link in the first reply. Tag `#buildinpublic` `#webdev`. |
| dev.to / Hashnode | The r/programming article | Canonical URL on your own blog if you have one. |
| Newsletters | JavaScript Weekly, Frontend Focus, Bytes, Console.dev, TLDR Web Dev | Submit via their forms after HN/Reddit traction — they love "trending on GitHub" projects. |
| Awesome lists | `awesome-devtools`, `awesome-privacy`, `awesome-selfhosted`, `awesome-pwa` | Open small, well-formatted PRs that follow each list's contribution rules. |
| Chinese-speaking communities | V2EX (分享创造), Juejin, Ruanyifeng's 科技爱好者周刊 submissions | Translate the HN first comment; lead with privacy. |
| Japanese communities | Zenn, Qiita | Short tutorial: "JWT をブラウザ内だけで検証する". |

---

## 7. Growth playbook

### Week 0 — Foundation
Complete the pre-launch checklist. Get 5–10 friends to try it and fix every rough edge they hit.

### Week 1 — Launch
Day 1 Show HN → Day 3 r/webdev (Showoff Saturday) → Day 5 Product Hunt → Day 6 X/Bluesky video. Reply to everything within the hour. Turn every feature request into a GitHub issue and link it back in the thread — visible responsiveness converts visitors into stargazers.

### Weeks 2–4 — Momentum
Ship one visible improvement per week (start with the most requested tool) and announce each one. Publish the r/programming technical article. Submit to newsletters and awesome lists. Thank first-time contributors publicly.

### Month 2+ — Compounding
- Monthly releases with GIFs in the notes.
- A "Tool of the month" contributor challenge in Discussions.
- Embed mode (`?embed=1`) so docs sites and blogs can embed a tool — every embed is a backlink.
- A browser extension that opens Workbench on selected text.

### Metrics to watch

| Metric | Healthy target |
|---|---|
| Stars from launch week | 500–1,500 |
| Repo visitor → star conversion | > 8% (improve the README GIF if lower) |
| Demo visitors who use 2+ tools | > 30% |
| Issues answered within 24h | 100% |
| External contributors by month 3 | 10+ |

---

## 8. Asset checklist

- [ ] `docs/screenshots/*.png` — already in the repo
- [ ] Social preview image, 1280×640
- [ ] Product Hunt thumbnail, 240×240 (the logo on a gradient)
- [ ] 30-second demo video (MP4 and GIF under 10 MB)
- [ ] 3 short clips: smart paste, regex watchdog, drag-and-drop pipeline
