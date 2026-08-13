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
- 🔄 **Environment-Based Loading** — Scripts auto-load from correct source (local or GitHub Pages)
- ✔️ **Version Tracking** — Built-in version verification to detect mismatches

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
│  fake-usage-meter.js:                │
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
    │ messages-from-iframe.min.js:
    │ - Detects events      │
    │ - Sends messages      │
    └───────────────────────┘
```

### File Organization

| Layer | Files | Responsibility |
|-------|-------|-----------------|
| **UI** | `ui-manager.js`, `styles.css` | Visual state, countdown, header styling |
| **Message Handling** | `fake-usage-meter.js` | Validation, security, rate limiting, routing |
| **Vendor Script** | `messages-from-iframe.min.js` | Event detection, message sending |
| **Static Content** | `docs/index.html` | Iframe content served from GitHub Pages or local (depending on environment) |

### Environment-Based Script Loading

Scripts automatically load from the correct source based on deployment environment:

```
Development (localhost, *.vercel.app)
    ↓
  Load iframe from: window.location.origin + '/docs/index.html'
    ↓
  Uses local scripts (develop branch)

Production (other domains)
    ↓
  Load iframe from: https://philskaroulis.github.io/...
    ↓
  Uses GitHub Pages scripts (main branch)
```

**Version Verification:** After iframe loads, scripts verify versions match:
```javascript
Parent version: window.UsageMeter.getVersion()      // → '2.0.0'
Iframe version: window.IframeMessenger.getVersion() // → '2.0.0'
```

Logs warning if versions don't match (indicates deployment issue).

### Message Format

Vendor iframe sends minimal, focused messages:

```javascript
{
  source: "iframe-messages",    // Message source identifier
  type: "IFRAME_CLICK_MESSAGE",       // Event type
  timestamp: 1691743200000             // Event timestamp (ms)
}
```

**No additional event-specific payload** — handlers focus on the event type, not detailed data.

## Event Types

| Event | Throttle | Handler Parameter |
|-------|----------|-------------------|
| `IFRAME_CLICK_MESSAGE` | None | `details` (empty) |
| `IFRAME_KEYPRESS_MESSAGE` | None | `details` (empty) |
| `IFRAME_SCROLL_MESSAGE` | 200ms | `details` (empty) |
| `IFRAME_MOUSEMOVE_MESSAGE` | 500ms | `details` (empty) |
| `IFRAME_VISIBILITY_CHANGE_MESSAGE` | None | `details` (empty) |

## Configuration

Edit `CONFIG` in `fake-usage-meter.js`:

```javascript
const CONFIG = {
  MESSAGE_SOURCE: 'iframe-messages',  // Expected message source
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
   <script src="fake-usage-meter.js"></script>
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

### Lifecycle Management

**For Parent Page (Usage Meter):**

Manage initialization and cleanup to prevent memory leaks in single-page applications:

```javascript
// In component mount
window.UsageMeter.init();
window.UIManager.init();

// In component unmount
window.UsageMeter.cleanup();
window.UIManager.cleanup();
```

**For Vendor App (in iframe):**

If your vendor app is an SPA, clean up the activity messenger on unmount:

```javascript
// When vendor app mounts
if (!window.IframeMessenger.isInitialized()) {
  window.IframeMessenger.init();
}

// When vendor app unmounts
window.IframeMessenger.cleanup();
```

**Integration Guides:**
- **[SPA_INTEGRATION.md](SPA_INTEGRATION.md)** — Parent page developers (React, Vue, Angular examples)
- **[VENDOR_INTEGRATION.md](VENDOR_INTEGRATION.md)** — Vendor app developers (how to clean up in your SPA)

### Debug Mode

Enable verbose logging in the browser console:

```javascript
window.UsageMeter.setDebug(true);
```

Output example:
```
[Activity Monitor] Message received: {source: "iframe-messages", type: "IFRAME_CLICK_MESSAGE", timestamp: 1691743200000}
[Activity Monitor] User clicked inside iframe {timestamp: 1691743200000}
```

### Register Custom Event Handler

```javascript
window.UsageMeter.registerHandler('IFRAME_CLICK_MESSAGE', (details, timestamp) => {
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
window.UsageMeter.getCircuitBreakerState();  // 'CLOSED', 'OPEN', 'HALF_OPEN'

// Get current event count this second
window.UsageMeter.getEventCountThisSecond(); // 0-100+

// Get current configuration
window.UsageMeter.getConfig();
```

### Lifecycle & Configuration API

**Parent Page (fake-usage-meter.js):**

```javascript
// Lifecycle control (for SPAs)
window.UsageMeter.init();                    // Manually initialize
window.UsageMeter.cleanup();                 // Clean up for unmount
window.UsageMeter.isInitialized();           // Check status

// Configuration
window.UsageMeter.setDebug(true);            // Enable/disable debug logging
window.UsageMeter.setVendorOrigin(url);      // Update trusted vendor origin

// Version verification
window.UsageMeter.getVersion();              // → '2.0.0'
```

**Vendor App (messages-from-iframe.js):**

```javascript
// Lifecycle control (for SPAs)
window.IframeMessenger.init();               // Manually initialize
window.IframeMessenger.cleanup();            // Clean up for unmount
window.IframeMessenger.isInitialized();      // Check status

// Version verification
window.IframeMessenger.getVersion();         // → '2.0.0'

// Auto-initializes on load, but can be managed for SPA lifecycle
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
Only event types starting with `IFRAME_` are processed:
```javascript
if (!type || !type.startsWith('IFRAME_')) {
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
  source: 'iframe-messages',
  type: 'IFRAME_INVALID_EVENT',  // Unknown type — rejected
  timestamp: 'not-a-number'       // Invalid timestamp — rejected
}, '*');
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Parent page with header, iframe embed, and script loading |
| `fake-usage-meter.js` | Message handling, validation, rate limiting, event routing |
| `ui-manager.js` | Activity state management, countdown display, header styling |
| `styles.css` | Styling for parent page (header, container, iframe) |
| `messages-from-iframe.js` | Unminified vendor script (development) |
| `messages-from-iframe.min.js` | Minified vendor script (production) |
| `docs/index.html` | Vendor iframe content (served from GitHub Pages) |
| `docs/messages-from-iframe.min.js` | Vendor script CDN link |

## Documentation

| Document | Purpose |
|----------|---------|
| `HOW_IT_WORKS.md` | Conceptual explanation of cross-origin iframe communication |
| `IFRAME_ANALYSIS.md` | Security audit identifying weaknesses and improvements |
| `DEPLOYMENT_STRATEGY.md` | **START HERE** — Environment-based loading, version verification, deployment workflows |
| `SPA_INTEGRATION.md` | Parent page developers: lifecycle management in React, Vue, Angular |
| `VENDOR_INTEGRATION.md` | Vendor app developers: lifecycle management in vendor SPAs |
| `TESTING_GUIDE.md` | Comprehensive testing for cross-origin and multi-iframe scenarios |

## Getting Started

### Local Development

1. **Start local server:**
   ```bash
   python3 -m http.server 8000
   # Then open http://localhost:8000 in your browser
   ```

2. **Verify environment detection:**
   - Open DevTools (F12)
   - Check console for:
     ```
     [App] Environment: Development
     [App] Loading iframe from: http://localhost:8000/docs/index.html
     ```
   - This confirms local scripts are being loaded

3. **Interact with the iframe:**
   - Click anywhere in the iframe
   - Type or press keys
   - Scroll the content
   - Move your mouse
   - Switch tabs (visibility change)

4. **Watch the header:**
   - Turns **GREEN (ACTIVE)** when you interact
   - Turns **GRAY (INACTIVE)** after 10 seconds with no interaction
   - Countdown timer shows seconds remaining

5. **Inspect message flow:**
   - Run `window.UsageMeter.setDebug(true)` in console
   - Interact with iframe to see detailed event logs
   - Check version match: `window.UsageMeter.getVersion()` should equal `window.IframeMessenger.getVersion()`

## Deployment

### How It Works

The app automatically loads scripts from the correct source based on environment:

| Environment | Script Source | Branch |
|-------------|---------------|--------|
| `localhost` | Local `/docs/index.html` | develop |
| `*.vercel.app` (preview) | Local `/docs/index.html` | develop |
| Other domains | GitHub Pages | main |

**No manual merging needed!** Each branch's code loads scripts from the same branch.

### Deploy Develop Branch (Preview)

```bash
git push origin develop
# Vercel auto-deploys to https://your-app-preview.vercel.app
# ↓
# Loads: https://your-app-preview.vercel.app/docs/index.html
# ↓
# Uses develop branch scripts (latest changes)
```

**Console output:**
```
[App] Environment: Development
[App] Loading iframe from: https://your-app-preview.vercel.app/docs/index.html
[App] ✓ Versions match - Parent: 2.0.0, Iframe: 2.0.0
```

### Deploy Main Branch (Production)

```bash
git push origin main
# Vercel auto-deploys to production domain
# ↓
# Loads: https://philskaroulis.github.io/iframe-activity-tracker/index.html
# ↓
# Uses GitHub Pages scripts (stable main branch)
```

**Console output:**
```
[App] Environment: Production
[App] Loading iframe from: https://philskaroulis.github.io/iframe-activity-tracker/index.html
[App] ✓ Versions match - Parent: 2.0.0, Iframe: 2.0.0
```

### Version Mismatch Detection

If versions don't match (deployment issue):
```
[App] ⚠️  Version mismatch! Parent: 2.0.0, Iframe: 1.9.0
[App] This may cause compatibility issues
```

This indicates scripts aren't synced. Solutions:
1. Wait for Vercel/GitHub Pages deployment to complete
2. Clear browser cache (Ctrl+Shift+Delete)
3. Check GitHub Pages has latest main branch code

**See [DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md) for detailed deployment guide.**

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
- Enable debug mode: `window.UsageMeter.setDebug(true)`
- Verify vendor script loaded in iframe (check iframe console)
- Check message source matches `CONFIG.MESSAGE_SOURCE`

### Header not changing color?
- Ensure you're interacting **within the iframe** (not the parent page)
- Check that `ui-manager.js` loaded before `fake-usage-meter.js`
- Verify both scripts are present: `window.UsageMeter` and `window.UIManager` should exist

### Rate limiting preventing events?
- Reduce event frequency or increase `MAX_EVENTS_PER_SECOND`
- Check circuit breaker state: `window.UsageMeter.getCircuitBreakerState()`
- Look for runaway event listeners in vendor script

### Version mismatch warning in console?

**Warning appears:**
```
[App] ⚠️  Version mismatch! Parent: 2.0.0, Iframe: 1.9.0
```

**Likely causes:**
1. Deployment still in progress (GitHub Pages or Vercel)
2. Browser cache hasn't updated
3. CDN/GitHub Pages serving old version

**Solutions:**
1. Wait 1-2 minutes for deployment to complete
2. Hard refresh: `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
3. Check [DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md) for deployment details

### Wrong environment being loaded?

**Check in console:**
```javascript
window.location.hostname          // What domain are we on?
// If localhost or *.vercel.app → should load local /docs/
// Otherwise → should load GitHub Pages
```

**Verify correct iframe URL is loaded:**
```javascript
document.getElementById('activity-iframe').src
// Should show either:
// - http://localhost:3000/docs/index.html (dev)
// - https://philskaroulis.github.io/... (prod)
```

## Technical Notes

- Pure JavaScript (no dependencies)
- Modular architecture separates concerns (UI vs. messaging)
- Passive event listeners for better scroll performance
- IIFE pattern for namespace isolation
- `requestAnimationFrame` for smooth countdown updates
- Minified vendor script (~823 bytes) for CDN distribution

## License

MIT
