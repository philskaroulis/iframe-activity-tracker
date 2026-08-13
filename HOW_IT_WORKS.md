# How Cross-Origin Iframe Communication Works

## The Problem

Let's say you're building a usage meter for your app. You want to track when users are actively engaging—clicks, typing, scrolling—so you can measure time spent and pause billing during periods of inactivity.

Easy enough, right? Just listen to click, keydown, and scroll events... except there's a catch.

If the content running inside your iframe comes from a **different origin** (different domain, port, or protocol), the browser's same-origin policy blocks direct access. You can't do this:

```javascript
// ❌ This won't work for cross-origin iframes
const iframe = document.getElementById('my-iframe');
iframe.contentDocument.addEventListener('click', () => {
  console.log('User clicked!');
});
// Cross-origin error: Access denied
```

The browser is being protective—it prevents one website from snooping on user activity inside another website's iframe. This is a security feature, not a bug.

## Why This Matters

Cross-origin iframes are common:

- **Embedded vendors** — analytics, payment processors, chat widgets
- **Multi-tenant apps** — content from different subdomains or services
- **Federated systems** — iframes loading content from partner domains
- **Content sandboxing** — isolating untrusted content for security

In all these cases, you still need to track activity—but you need to do it safely and with explicit cooperation from both sides.

## The Solution: postMessage API

Instead of the parent eavesdropping on the iframe's events, the **iframe tells the parent** about its events. Think of it as the iframe sending letters to the parent: "Hey, the user just clicked!" or "The user is typing!"

This is exactly what the `postMessage()` API is designed for:

```javascript
// Inside the iframe
window.parent.postMessage({
  source: 'iframe-messages',
  type: 'IFRAME_CLICK_MESSAGE',
  timestamp: Date.now()
}, 'https://parent-domain.com');

// On the parent page
window.addEventListener('message', (event) => {
  if (event.data.source === 'iframe-messages') {
    console.log('Iframe sent:', event.data.type);
  }
});
```

## How This Project Does It

This repo demonstrates the pattern with a fake usage meter. Here's the flow:

### 1. **Iframe Detects Events** (`messages-from-iframe.js`)

The vendor script inside the iframe listens for user activity:

```javascript
window.addEventListener('click', function() {
  sendMessageToParent('IFRAME_CLICK_MESSAGE');
}, { passive: true });

window.addEventListener('keydown', function() {
  sendMessageToParent('IFRAME_KEYPRESS_MESSAGE');
}, { passive: true });
```

When an event happens, it sends a message to the parent:

```javascript
function sendMessageToParent(eventType) {
  window.parent.postMessage({
    source: 'iframe-messages',
    type: eventType,
    timestamp: Date.now()
  }, PARENT_ORIGIN);
}
```

**What it sends:**
- `source` — Identifies who sent the message (prevents confusion if other scripts are messaging too)
- `type` — The event type (IFRAME_CLICK_MESSAGE, IFRAME_SCROLL_MESSAGE, etc.)
- `timestamp` — When the event occurred (milliseconds since epoch)

### 2. **Parent Receives & Validates** (`fake-usage-meter.js`)

The parent page listens for these messages:

```javascript
window.addEventListener('message', processMessage);
```

When a message arrives, it validates it:

```javascript
function processMessage(event) {
  // 1. Check the message came from expected source
  if (event.data.source !== 'iframe-messages') {
    return; // Reject unknown sources
  }

  // 2. Validate the event type
  if (!event.data.type.startsWith('IFRAME_')) {
    return; // Reject unknown event types
  }

  // 3. Check the timestamp isn't too old (detects clock manipulation)
  if (!validateTimestamp(event.data.timestamp)) {
    return; // Reject suspicious timestamps
  }

  // 4. Check we're not being spam-attacked
  if (!checkRateLimit()) {
    return; // Reject if over 100 events/second
  }

  // 5. Route to the appropriate handler
  const handler = eventHandlers.get(event.data.type);
  if (handler) {
    handler(event.data, event.data.timestamp);
  }
}
```

### 3. **Parent Updates UI** (`ui-manager.js`)

Once the message is validated, the parent can safely react:

```javascript
// Message is valid, so update the usage meter
window.UIManager.setActive();

// Start a 10-second countdown timer
// If no new messages arrive, mark the user as inactive
```

## Why All This Validation?

You might be thinking: "Can't the iframe just lie and send fake messages?"

Yes. That's why validation matters.

**The iframe could:**
- Spam 1000 events per second (we rate-limit)
- Send events with timestamps from last year (we validate timestamps)
- Claim to be a trustworthy source (we check the source identifier)
- Send unknown event types (we whitelist known types)

**The rate limiter** protects against denial-of-service attacks. If the iframe starts spamming messages, the circuit breaker opens and drops excess events.

**The timestamp validator** detects clock manipulation. If your system clock is wrong, we reject it. If someone tries to send ancient or future timestamps, we reject those too.

**The source check** makes sure the message is coming from code we expect, not some rogue script that happened to open the same postMessage listener.

**Event type whitelist** means we only process known event types. Unknown events are logged but ignored.

## The Complete Flow

```
User clicks in iframe
         ↓
messages-from-iframe.js detects click
         ↓
Sends postMessage to parent:
  {
    source: 'iframe-messages',
    type: 'IFRAME_CLICK_MESSAGE',
    timestamp: 1691743200000
  }
         ↓
Parent receives message event
         ↓
fake-usage-meter.js validates:
  ✓ Source matches
  ✓ Type is known
  ✓ Timestamp is recent
  ✓ Not rate-limited
         ↓
Route to handler
         ↓
ui-manager.js updates state
         ↓
Header turns GREEN, countdown timer starts
         ↓
After 10 seconds with no activity → turns GRAY
```

## Key Insights

**1. No Direct Access Across Origins**

The browser enforces strict isolation. The parent can't peek into the iframe's DOM, event listeners, or variables. That's by design.

**2. Explicit Cooperation Required**

Both the iframe and parent must agree on:
- The message format
- The event types
- The origin they trust

This is a feature, not a limitation. It means the iframe vendor controls exactly what telemetry the parent sees.

**3. Security Through Validation**

Even messages from your own iframe should be validated. The iframe could be compromised, buggy, or even be a different version than expected. Validation protects you.

**4. Throttling Prevents Spam**

The iframe script throttles some events (scroll at 200ms, mousemove at 500ms). This reduces noise and saves bandwidth.

**5. Minimal Payload**

We send only essential data: source, type, timestamp. No extra details. This keeps messages lightweight and reduces attack surface.

## Extending This Pattern

Want to track more data? You can add it to the message:

```javascript
// In the iframe
window.parent.postMessage({
  source: 'iframe-messages',
  type: 'IFRAME_SCROLL_MESSAGE',
  timestamp: Date.now(),
  scrollX: window.scrollX,
  scrollY: window.scrollY,
  viewportHeight: window.innerHeight
}, PARENT_ORIGIN);

// In the parent handler
window.UsageMeter.registerHandler('IFRAME_SCROLL_MESSAGE', (details, timestamp) => {
  analytics.track('scroll', {
    scrollY: details.scrollY,
    timestamp
  });
});
```

Just remember: **validate everything**. Never trust data from an iframe.

## When to Use This Pattern

Use postMessage for cross-origin iframe communication when you need to:

- Track user activity
- Communicate state changes
- Trigger actions based on iframe events
- Share non-sensitive data safely

**Don't use postMessage for:**

- Passing authentication tokens (use credentials in request headers instead)
- Sensitive PII (the message is visible in devtools)
- High-frequency data (performance will suffer)

## Common Gotchas

**1. Wrong Origin in postMessage()**

```javascript
// ❌ If parent origin is https://app.com but you pass 'https://other.com',
//    the message won't be delivered
window.parent.postMessage(data, 'https://wrong-origin.com');

// ✓ Use the correct parent origin
window.parent.postMessage(data, 'https://app.com');

// Or use '*' to allow any origin (less secure but works everywhere)
window.parent.postMessage(data, '*');
```

**2. Forgetting to Listen**

```javascript
// ❌ Iframe sends messages but parent never listens
window.addEventListener('message', () => { /* ... */ });

// Messages are sent but silently discarded if nobody listens
```

**3. Not Validating**

```javascript
// ❌ Blindly trusting iframe data
window.addEventListener('message', (event) => {
  updateBilling(event.data.hoursWorked); // iframe could lie!
});

// ✓ Validate the source
if (event.data.source !== 'trusted-vendor') return;
```

**4. Assuming Order**

```javascript
// ❌ Messages might arrive out of order or with delays
// Don't assume message N+1 arrived after message N

// ✓ Use timestamps to sort or deduplicate if needed
```

## Summary

Cross-origin iframes can't directly expose their events to the parent page—that's a security feature. The solution is **explicit communication via postMessage()**: the iframe tells the parent about user activity, the parent validates the messages, and everyone stays secure.

This repo shows a complete, production-ready example of this pattern with:
- Event detection in the iframe
- Secure message passing
- Comprehensive validation
- Rate limiting to prevent abuse
- Clean separation between message handling and UI updates

Now you know why it works this way, and you can apply the pattern to your own projects.
