# iframe Activity Tracker

A production-ready activity monitoring system for demonstrating secure message passing between parent and vendor iframes. Features comprehensive security, rate limiting, extensible event handling, and modular architecture.

## Features

### Core Functionality
- ✅ **Real-time Activity Detection** — Click, keypress, scroll, mouse movement, visibility changes
- ✅ **Live Countdown Timer** — Shows seconds until inactivity timeout
- ✅ **Color-coded Status** — GREEN (ACTIVE) / GRAY (INACTIVE) visual feedback

### Security & Reliability
- 🔒 **Message Validation** — Source verification, event type validation, origin checks
- 🛡️ **Error Handling** — Try-catch wrapper prevents silent failures
- ⚡ **Rate Limiting & Circuit Breaker** — Auto-limits damage from malicious/spamming iframes (max 100 events/sec)
- ⏰ **Timestamp Validation** — Detects clock skew (rejects events deviating >5 seconds)

### Developer Experience
- 📝 **Extensible Event Handlers** — Register custom handlers for any event type
- 🐛 **Debug Mode** — Toggle verbose logging for troubleshooting
- 🎛️ **Public API** — Runtime configuration and monitoring
- 📊 **Modular Architecture** — Separate message handling from UI concerns

## Architecture

### Overview
```
┌─────────────────────────────────────┐
│       PARENT PAGE (index.html)      │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Header (ACTIVE/INACTIVE)    │  │
│  │  ui-manager.js               │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Vendor Iframe               │  │
│  │  (loaded from GitHub Pages)  │  │
│  └──────────────────────────────┘  │
│                                     │
│  parent-library.js:                │
│  - Validates & routes messages     │
│  - Enforces rate limits            │
│  - Manages event handlers          │
└─────────────────────────────────────┘
         ▲
         │ postMessage() events
         │
    ┌────┴──────────────────┐
    │  VENDOR IFRAME        │
    │  (GitHub Pages)       │
    │                       │
    │ oreilly-messages.min.js:
    │ - Detects events      │
    │ - Sends messages      │
    └───────────────────────┘
```

### File Organization

| Layer | Files | Responsibility |
|-------|-------|-----------------|
| **UI** | `ui-manager.js`, `styles.css` | Visual state, countdown, header styling |
| **Message Handling** | `parent-library.js` | Validation, security, rate limiting, routing |
| **Vendor Script** | `oreilly-messages.min.js` | Event detection, message sending |
| **Static Content** | `docs/index.html` | Iframe content served from GitHub Pages |

### Message Format

Vendor iframe sends minimal, focused messages:

```javascript
{
  source: "oreilly-metered-iframe",    // Message source identifier
  type: "OREILLY_CLICK_MESSAGE",       // Event type
  timestamp: 1691743200000             // Event timestamp (ms)
}
```

**No additional event-specific payload** — handlers focus on the event type, not detailed data.

## Event Types

| Event | Throttle | Handler Parameter |
|-------|----------|-------------------|
| `OREILLY_CLICK_MESSAGE` | None | `details` (empty) |
| `OREILLY_KEYPRESS_MESSAGE` | None | `details` (empty) |
| `OREILLY_SCROLL_MESSAGE` | 200ms | `details` (empty) |
| `OREILLY_MOUSEMOVE_MESSAGE` | 500ms | `details` (empty) |
| `OREILLY_VISIBILITY_CHANGE_MESSAGE` | None | `details` (empty) |

## Configuration

Edit `CONFIG` in `parent-library.js`:

```javascript
const CONFIG = {
  MESSAGE_SOURCE: 'oreilly-metered-iframe',  // Expected message source
  DEBUG: false,                              // Enable verbose logging
  MAX_EVENTS_PER_SECOND: 100,                // Rate limit threshold
  MAX_TIMESTAMP_DEVIATION_MS: 5000           // Max acceptable clock skew (5s)
};
```

## Usage

### Basic Setup

1. Include scripts in order:
   ```html
   <script src="ui-manager.js"></script>
   <script src="parent-library.js"></script>
   ```

2. Set iframe source:
   ```javascript
   const iframe = document.getElementById('activity-iframe');
   iframe.src = 'https://philskaroulis.github.io/iframe-activity-tracker/index.html';
   ```

The scripts automatically:
- Listen for iframe messages
- Validate message structure and source
- Update UI state (via `UIManager`)
- Enforce rate limits

### Debug Mode

Enable verbose logging in the browser console:

```javascript
window.ActivityMonitor.setDebug(true);
```

Output example:
```
[Activity Monitor] Message received: {source: "oreilly-metered-iframe", type: "OREILLY_CLICK_MESSAGE", timestamp: 1691743200000}
[Activity Monitor] User clicked inside iframe {timestamp: 1691743200000}
```

### Register Custom Event Handler

```javascript
window.ActivityMonitor.registerHandler('OREILLY_CLICK_MESSAGE', (details, timestamp) => {
  console.log('User clicked in iframe', { timestamp });
  // Send to analytics, update database, etc.
});
```

All handlers receive:
- `details` — Empty object (no event-specific payload in messages)
- `timestamp` — Message timestamp in milliseconds

### Monitor Circuit Breaker State

```javascript
// Check if iframe is being rate-limited
window.ActivityMonitor.getCircuitBreakerState();  // 'CLOSED', 'OPEN', 'HALF_OPEN'

// Get current event count this second
window.ActivityMonitor.getEventCountThisSecond(); // 0-100+

// Get current configuration
window.ActivityMonitor.getConfig();
```

### Control UI State Programmatically

```javascript
// Manually set active/inactive (useful for custom logic)
window.UIManager.setActive();
window.UIManager.setInactive();
```

## Security Considerations

### 1. Message Source Validation
Messages are validated to originate from the expected source:
```javascript
if (event.data.source !== CONFIG.MESSAGE_SOURCE) {
  // Message rejected
  return;
}
```

### 2. Event Type Validation
Only event types starting with `OREILLY_` are processed:
```javascript
if (!type || !type.startsWith('OREILLY_')) {
  // Message rejected
  return;
}
```

### 3. Rate Limiting
The circuit breaker automatically protects against DOS attacks:
- **Closed** (normal) — Events processed normally
- **Open** (rate limit exceeded) — Events dropped, protection active
- **Half-Open** (recovery) — Gradual re-enabling of event processing

Default: max 100 events/second

### 4. Timestamp Validation
Events with timestamps deviating >5 seconds are rejected to detect:
- Malicious clock manipulation
- Browser tab restore issues
- Time synchronization problems

### 5. Error Handling
All errors are caught and logged without crashing the application:

```javascript
// Invalid messages are safely rejected
window.parent.postMessage({
  source: 'oreilly-metered-iframe',
  type: 'OREILLY_INVALID_EVENT',  // Unknown type — rejected
  timestamp: 'not-a-number'       // Invalid timestamp — rejected
}, '*');
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Parent page with header, iframe embed, and script loading |
| `parent-library.js` | Message handling, validation, rate limiting, event routing |
| `ui-manager.js` | Activity state management, countdown display, header styling |
| `styles.css` | Styling for parent page (header, container, iframe) |
| `oreilly-messages.js` | Unminified vendor script (development) |
| `oreilly-messages.min.js` | Minified vendor script (production) |
| `docs/index.html` | Vendor iframe content (served from GitHub Pages) |
| `docs/oreilly-messages.min.js` | Vendor script CDN link |

## Getting Started

### Local Development

1. **Start local server:**
   ```bash
   python3 -m http.server 8000
   # Then open http://localhost:8000 in your browser
   ```

2. **Interact with the iframe:**
   - Click anywhere in the iframe
   - Type or press keys
   - Scroll the content
   - Move your mouse
   - Switch tabs (visibility change)

3. **Watch the header:**
   - Turns **GREEN (ACTIVE)** when you interact
   - Turns **GRAY (INACTIVE)** after 10 seconds with no interaction
   - Countdown timer shows seconds remaining

4. **Inspect message flow:**
   - Open DevTools (F12)
   - Run `window.ActivityMonitor.setDebug(true)`
   - Interact with iframe to see detailed event logs

### Production Deployment

The vendor iframe content is served from GitHub Pages:
```
https://philskaroulis.github.io/iframe-activity-tracker/index.html
```

Embed the vendor script in any page:
```html
<iframe src="https://philskaroulis.github.io/iframe-activity-tracker/index.html"
        sandbox="allow-same-origin allow-scripts">
</iframe>
```

## Browser Compatibility

Works in all modern browsers supporting:
- `postMessage()` API
- ES6 (arrow functions, destructuring, const/let)
- `requestAnimationFrame()`
- `classList` API

## Performance

- **Event Processing:** <1ms per message
- **Memory:** ~30KB for scripts + state
- **DOM Updates:** Only on state change or countdown tick
- **Rate Limiting:** Automatically drops excess messages at threshold

## Troubleshooting

### Iframe not rendering?
- Verify iframe `src` is correct and accessible
- Check browser console for CORS or loading errors
- Ensure `allow-scripts` and `allow-same-origin` sandbox attributes are set

### No messages received?
- Enable debug mode: `window.ActivityMonitor.setDebug(true)`
- Verify vendor script loaded in iframe (check iframe console)
- Check message source matches `CONFIG.MESSAGE_SOURCE`

### Header not changing color?
- Ensure you're interacting **within the iframe** (not the parent page)
- Check that `ui-manager.js` loaded before `parent-library.js`
- Verify both scripts are present: `window.ActivityMonitor` and `window.UIManager` should exist

### Rate limiting preventing events?
- Reduce event frequency or increase `MAX_EVENTS_PER_SECOND`
- Check circuit breaker state: `window.ActivityMonitor.getCircuitBreakerState()`
- Look for runaway event listeners in vendor script

## Technical Notes

- Pure JavaScript (no dependencies)
- Modular architecture separates concerns (UI vs. messaging)
- Passive event listeners for better scroll performance
- IIFE pattern for namespace isolation
- `requestAnimationFrame` for smooth countdown updates
- Minified vendor script (~823 bytes) for CDN distribution

## License

MIT
