# Activity Monitor POC

A simple proof-of-concept app that demonstrates cross-origin communication between a parent page and an embedded iframe using `postMessage()`.

## What It Does

- **Parent Page** (`index.html`): Monitors user activity and displays status in the header
  - **GREEN** when user is active (clicking, typing, scrolling, moving mouse)
  - **GRAY** when inactive for 15+ seconds

- **Iframe**: Detects user events and communicates them to the parent page

## Files

- `index.html` - Main HTML page with header and embedded iframe
- `parent-library.js` - Parent page script that tracks activity and updates status
- `iframe-messages.js` - Iframe script that detects events and sends messages

## How It Works

1. **iframe-messages.js** (in iframe) listens for user events:
   - `click` - Any mouse click
   - `keydown` - Any keyboard input
   - `scroll` - Page scrolling
   - `mousemove` - Mouse movement (throttled)
   - `visibilitychange` - Tab visibility change

2. **Event Detection**: Each event triggers a `postMessage()` call to the parent

3. **parent-library.js** (parent) receives the message and:
   - Sets the header to GREEN (ACTIVE)
   - Resets the 15-second inactivity timer
   - Updates the "Last activity" timestamp

4. **Inactivity**: After 15 seconds of no events, the header turns GRAY (INACTIVE)

## Getting Started

1. Open `index.html` in a web browser
2. Try interacting with the iframe area (clicking, typing, scrolling)
3. Watch the header change between ACTIVE (green) and INACTIVE (gray)
4. Open browser DevTools (F12) to see console messages from both scripts

## Browser Compatibility

Works in all modern browsers that support:
- `postMessage()` API
- ES6 features
- iframe sandbox attribute

## Technical Notes

- Uses vanilla JavaScript (no frameworks)
- Iframe uses `data:` URI for inline HTML
- Throttling applied to `mousemove` and `scroll` events to reduce message frequency
- All event listeners properly scoped with IIFE pattern
