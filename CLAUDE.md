# Project: Canadian Shield (Static Trilingual Site)

## Architecture Style Rules
- NO Frameworks / NO Build Steps. Everything must be raw vanilla HTML5, CSS3, and ES6 JS.
- Never use CDNs for custom components; write raw vanilla implementations directly in `assets/js/main.js`.
- For layout changes, modify the shared global `assets/css/style.css`. Do not add inline styles except in `deck.html`.

## Visual Identity & Anti-Boilerplate Guidelines
- **Theme**: Dark, premium, highly tactical cybersecurity theme. 
- **Palette**: Deep woodland charcoal (`#0d110f`), striking boreal auroral green (`#00ff66`), stark white (`#ffffff`), and tactical muted gold (`#d4af37`).
- **Typography Layout**: Avoid blocky, centered columns. Use asymmetrical split layouts, absolute-positioned decorative elements, and wide letter-spacing tracking on headers.
- **Components**: Navigation, Modals, Threat Simulator, and PITR Scrubber must look like a military or high-tech dashboard (subtle glassmorphism, thin 1px borders, subtle glow metrics).

## Multi-Language Rule (Critical)
- When modifying text or layout structure in any file under the root (e.g., `index.html`), you MUST automatically apply the identical structural markup changes to `fr/index.html` and `es/index.html` to keep translations perfectly synced. Do not forget to adjust the `lang=""` attribute and text content appropriately.