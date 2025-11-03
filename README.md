# i-love-pdf – Multi-tool document and media lab

An all-in-one React + TypeScript + Vite application for everyday file tasks and media utilities. It bundles PDF/Image tools, simple video/audio labs, a chat playground, and a YouTube-like viewer with search and trending feeds.

## Highlights
- Modern React app (Vite, TypeScript) with fast dev and builds.
- Clean chip-style tab bar with responsive design and scrolling on mobile.
- YouTube viewer: keyword search or paste URL, play in embedded player.
- Trending by topics with chips (All, Top, Music, Gaming, Animation).
- “Show more” pagination for search/trending; robust API fallback.
- Related videos when playing; basic engagement (Like/Dislike, Subscribe, Share) stored locally.
- AudioLab: real-time WebAudio effects (EQ, filters, saturation) and preset styles.
- Animated background (aurora + particles) for a lively UI.

## Getting Started

Prerequisites:
- Node.js 18+ recommended
- npm 9+ (or compatible package manager)

Install and run:
- `npm install`
- `npm run dev` – start local development server with HMR
- `npm run build` – type-check and generate production build in `dist/`
- `npm run preview` – serve the built app for local preview
- `npm run lint` – run ESLint across the project

## Tabs and Features
- `PDF` – PDF utilities using `pdf-lib` and `jspdf`.
- `Ảnh` (Image) – basic image operations and previews.
- `Video` – simple video utilities.
- `Âm thanh` (Audio) – WebAudio chain with presets (Pop, Ballad, Rock, Rap) and effects (Reverb, Chorus). Supports playback and WAV export.
- `ChatGPT` – chat playground UI.
- `YouTube` – search, trending topics, related videos, and local engagement controls.

### YouTube Viewer
- Search box accepts either keywords or a YouTube URL. If input looks like a URL but is invalid, an inline message appears; plain keywords always trigger search.
- Tabs for topics: All, Top, Music, Gaming, Animation. Selecting a chip reloads trending for that category.
- Grid results show thumbnails and titles; click to play. Supports `/watch?v=...` and `/shorts/...` formats.
- “Show more” loads subsequent pages without clearing the current grid.
- Engagement row under the player:
  - `Subscribe/Unsubscribe` – toggles a local state per channel.
  - `Like/Dislike` – toggles a local state per video.
  - `Share` – copies the `https://www.youtube.com/watch?v=<id>` link to clipboard.
  - `Open on YouTube` – opens the video on youtube.com.

### API Notes (YouTube)
- Uses public Piped API endpoints with a fallback chain:
  - `https://pipedapi.kavin.rocks`
  - `https://piped.video/api/v1`
  - `https://pipedapi.in.projectsegfau.lt`
  - `https://pipedapi.k-v.run`
- Endpoints: `/trending`, `/search`, `/streams/<id>`, `/video/<id>`.
- Results are parsed defensively; if one API base fails or returns non-JSON, the app tries the next base.
- No API keys are required. Local “Like/Dislike/Subscribe” states are stored in `localStorage` and do not interact with YouTube accounts.

## Project Structure
- `src/App.tsx` – app shell and tab routing
- `src/App.css` – layout, chips, ambient animations
- `src/components/` – feature labs
  - `YouTubeLab.tsx` – YouTube viewer (search, trending, related, engagement)
  - `AudioLab.tsx` – WebAudio processing and presets
  - `VideoLab.tsx`, `ImageLab.tsx`, `ChatLab.tsx` – respective labs
  - `ThreeBackground.tsx` – decorative SVG/three-like background elements
- `src/utils/i18n.ts` – simple language helper with English and Vietnamese keys
- `server/` – optional Express server scaffolding (if needed for future features)

## Internationalization (i18n)
- Built-in `vi` and `en` labels. Add new keys in `src/utils/i18n.ts` and pass `lang` prop to components.

## Development Tips
- The YouTube search accepts keywords. For URL paste, multiple formats are supported: `/watch?v=ID`, `/shorts/ID`, `youtu.be/ID`, `embed/ID`. Start time via `t` or `start` is respected when present.
- Styling uses CSS variables: `--accent`, `--primary-from`, `--primary-to`, `--card-bg`, `--card-border`, `--panel-bg`, `--panel-border`. Adjust them to theme the app.
- Ambient animations are added via `body::before/::after` so they don’t interfere with content.

## Known Limitations
- Public Piped endpoints may rate-limit or be intermittently unavailable; the app rotates through multiple bases automatically.
- Local engagement states (like/dislike/subscribe) are purely client-side and non-persistent across browsers.
- AudioLab is browser-based; results vary by device and may be CPU intensive on low-end hardware.

## Contributing
- Fork and create feature branches.
- Keep changes focused and consistent with the existing code style.
- Run `npm run lint` and `npm run build` before opening a pull request.

## License
- Copyright belongs to the project owner(s). No license is provided by default.
