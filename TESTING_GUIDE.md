# Testing Guide: Cross-Origin & Multi-Iframe Scenarios

This document elaborates on untested edge cases and provides test scenarios for validating the message handling system in complex environments.

---

## Cross-Origin Scenarios

### Why Cross-Origin Testing Matters

The system's security depends on validating `event.origin`. But there are many edge cases:

```javascript
// These all look similar but behave very differently:
event.origin = 'https://philskaroulis.github.io'        // ✓ Trusted
event.origin = 'https://philskaroulis.github.io:443'    // ? Different port notation
event.origin = 'https://PHILSKAROULIS.GITHUB.IO'        // ? Case difference
event.origin = 'https://philskaroulis.github.io/'       // ? Trailing slash
event.origin = 'http://philskaroulis.github.io'         // ✗ Wrong protocol
event.origin = 'https://attacker.github.io'             // ✗ Subdomain attack
event.origin = 'https://philskaroulis.github.io.evil'   // ✗ Domain suffix attack
```

### Test Scenario 1: Origin Spoofing

**What could go wrong:** Attacker website sends a message claiming to be from the trusted vendor

**Test setup:**
```html
<!-- Parent page at: https://app.example.com -->
<iframe id="vendor" src="https://philskaroulis.github.io/iframe-activity-tracker/index.html"></iframe>

<!-- Attacker page at: https://evil.example.com (same-origin as parent!) -->
<script>
  // Evil page can directly manipulate parent's window
  parent.postMessage({
    source: 'iframe-messages',
    type: 'IFRAME_CLICK_MESSAGE',
    timestamp: Date.now()
  }, '*');  // ← This is the attack
</script>
```

**Expected behavior:** Parent should reject because origin is wrong
```javascript
// Parent console should show:
// [Usage Meter] ⚠️ Message from untrusted origin: https://evil.example.com
```

**Test code:**
```javascript
// Simulate evil message
const evilEvent = new MessageEvent('message', {
  origin: 'https://evil.example.com',
  source: window,
  data: {
    source: 'iframe-messages',
    type: 'IFRAME_CLICK_MESSAGE',
    timestamp: Date.now()
  }
});

// Manually trigger processMessage (from browser console)
// window.UsageMeter.processMessage(evilEvent);  // Not exposed, so test differently:

// Better: Create actual iframe from evil origin
const evilFrame = document.createElement('iframe');
evilFrame.src = 'https://evil.example.com/attacker.html';
document.body.appendChild(evilFrame);
// The attacker script in that iframe tries to impersonate
```

### Test Scenario 2: Protocol Mismatch

**What could go wrong:** `http://` vs `https://` confusion, mixed-content issues

**Test setup:**
```javascript
// CONFIG says vendor is https://...
CONFIG.VENDOR_ORIGIN = 'https://philskaroulis.github.io';

// But message claims to be from http://... (wrong protocol)
const event = new MessageEvent('message', {
  origin: 'http://philskaroulis.github.io',  // ← http, not https!
  data: { source: 'iframe-messages', type: 'IFRAME_CLICK_MESSAGE' }
});

// Should reject
expect(processMessage(event)).toBeFalsy();
```

**Why this matters:** HTTP is insecure; accepting it bypasses security model

### Test Scenario 3: Case Sensitivity

**What could go wrong:** Domain comparison is case-insensitive in real browsers

**Test setup:**
```javascript
// Real browser behavior:
// https://Example.COM and https://example.com are the SAME origin

const event1 = new MessageEvent('message', {
  origin: 'https://PHILSKAROULIS.GITHUB.IO',  // UPPERCASE
  data: { source: 'iframe-messages', type: 'IFRAME_CLICK_MESSAGE' }
});

// Should this be accepted?
// Current code: Exact string match (would REJECT)
// Expected: Should accept (origins are case-insensitive)
```

**Fix needed:** Use `.toLowerCase()` for comparison
```javascript
if (event.origin.toLowerCase() !== CONFIG.VENDOR_ORIGIN.toLowerCase()) {
  warn(`Untrusted origin: ${event.origin}`);
  return;
}
```

### Test Scenario 4: Port Handling

**What could go wrong:** Port variations like `:443` (default HTTPS), `:80` (default HTTP)

**Test setup:**
```javascript
// These should be equivalent:
'https://philskaroulis.github.io'          // Port 443 implicit
'https://philskaroulis.github.io:443'      // Port 443 explicit

// But browser's event.origin will be:
// 'https://philskaroulis.github.io' (always without explicit default port)

// So if CONFIG sets:
CONFIG.VENDOR_ORIGIN = 'https://philskaroulis.github.io:443';  // ← Port explicit

// And event.origin is:
// 'https://philskaroulis.github.io'  // ← Port implicit

// They won't match!
```

**Fix needed:** Normalize ports
```javascript
function normalizeOrigin(origin) {
  try {
    const url = new URL('http://dummy' + origin.split('//')[1]);
    // Remove explicit default ports
    if ((url.protocol === 'https:' && url.port === '443') ||
        (url.protocol === 'http:' && url.port === '80')) {
      url.port = '';
    }
    return url.origin;
  } catch (e) {
    return origin;
  }
}

// Then use:
if (normalizeOrigin(event.origin) !== normalizeOrigin(CONFIG.VENDOR_ORIGIN)) {
  warn(`Untrusted origin`);
  return;
}
```

### Test Scenario 5: Subdomain Attack

**What could go wrong:** Attacker owns a subdomain of the parent

**Test setup:**
```javascript
// Parent: https://app.example.com
// Attacker: https://evil.app.example.com (subdomain!)

// Attacker claims to be from:
event.origin = 'https://evil.app.example.com';

// Parent's CONFIG:
CONFIG.VENDOR_ORIGIN = 'https://vendor.example.com';

// Should reject (different domain entirely)
```

**Current code:** Already handles this (exact string match)

---

## Multiple Concurrent Iframes

### Why Multiple Iframes Testing Matters

Real-world apps often embed multiple vendors:
- Analytics from vendor A
- Chat from vendor B
- Payment from vendor C

Each should be independent, but they share the parent's single message listener.

### Test Scenario 1: Two Iframes, Same Origin

**What could go wrong:** Both send messages; parent processes both as if from same vendor

```html
<!-- Parent page -->
<iframe id="vendor-1" src="https://vendor1.example.com"></iframe>
<iframe id="vendor-2" src="https://vendor1.example.com"></iframe>  <!-- Same origin! -->

<script>
  // Both iframes send messages
  // Both have origin: 'https://vendor1.example.com'
  // Both have source: 'iframe-messages'
  
  // How does parent distinguish them?
  // Answer: It doesn't! Both trigger same handlers
</script>
```

**Expected behavior:** 
- Both messages accepted (same trusted origin)
- Both trigger handlers
- No way to tell which iframe sent what

**Test code:**
```javascript
// Simulate vendor-1 sending click
const event1 = new MessageEvent('message', {
  origin: 'https://vendor1.example.com',
  data: {
    source: 'iframe-messages',
    type: 'IFRAME_CLICK_MESSAGE',
    timestamp: Date.now()
  }
});

// Simulate vendor-2 sending keypress
const event2 = new MessageEvent('message', {
  origin: 'https://vendor1.example.com',
  data: {
    source: 'iframe-messages',
    type: 'IFRAME_KEYPRESS_MESSAGE',
    timestamp: Date.now()
  }
});

// Process both
processMessage(event1);  // ✓ Accepted
processMessage(event2);  // ✓ Accepted

// Parent doesn't know which iframe sent what
```

**Issue:** If you need to track which iframe, you'd need additional context in the message or separate listener per iframe

### Test Scenario 2: Two Iframes, Different Origins

**What could go wrong:** One iframe fails to load; parent stops accepting messages from the other

```html
<!-- Parent page -->
<iframe id="vendor-1" src="https://vendor1.example.com"></iframe>
<iframe id="vendor-2" src="https://vendor2.example.com"></iframe>
```

**Setup:**
```javascript
// Config only knows about one vendor
CONFIG.VENDOR_ORIGIN = 'https://vendor1.example.com';  // ← Only vendor-1!

// vendor-2 sends message
const event2 = new MessageEvent('message', {
  origin: 'https://vendor2.example.com',  // ← Different origin
  data: { source: 'iframe-messages', type: 'IFRAME_CLICK_MESSAGE' }
});

// Parent rejects it
processMessage(event2);
// Console: [Usage Meter] ⚠️ Message from untrusted origin: https://vendor2.example.com
```

**Fix needed:** Whitelist multiple vendors
```javascript
CONFIG.TRUSTED_ORIGINS = [
  'https://vendor1.example.com',
  'https://vendor2.example.com',
  'https://vendor3.example.com'
];

// In processMessage:
const isTrusted = CONFIG.TRUSTED_ORIGINS.some(origin => 
  normalizeOrigin(event.origin) === normalizeOrigin(origin)
);
if (!isTrusted) {
  warn(`Untrusted origin: ${event.origin}`);
  return;
}
```

### Test Scenario 3: One Iframe Fails to Load

**What could go wrong:** Error handling doesn't account for iframe load failures

```html
<iframe id="vendor-1" src="https://vendor1.example.com"></iframe>
<iframe id="vendor-2" src="https://vendor2.invalid/fake"></iframe>  <!-- Invalid domain -->
```

**Setup:**
```javascript
// vendor-1 loads fine, sends messages ✓
// vendor-2 404s, never sends messages

// Parent only receives messages from vendor-1
// But doesn't know vendor-2 failed

// Questions:
// - Should parent alert developer that vendor-2 is down?
// - Should parent fall back to different vendor?
// - Should parent disable features that need vendor-2?
```

**Test code:**
```javascript
// Monitor iframe load state
const iframe1 = document.getElementById('vendor-1');
const iframe2 = document.getElementById('vendor-2');

iframe1.addEventListener('load', () => console.log('Vendor-1: OK'));
iframe1.addEventListener('error', () => console.log('Vendor-1: FAILED'));

iframe2.addEventListener('load', () => console.log('Vendor-2: OK'));
iframe2.addEventListener('error', () => console.log('Vendor-2: FAILED'));

// In production, track which vendors are healthy
const vendorStatus = {
  'vendor1.example.com': 'healthy',
  'vendor2.example.com': 'failed'
};
```

### Test Scenario 4: Message Ordering from Multiple Iframes

**What could go wrong:** Assume messages arrive in order

```javascript
// Vendor-1 sends: click, scroll, scroll
// Vendor-2 sends: keypress, click

// What order does parent receive?
// Option A: click(v1), scroll(v1), keypress(v2), scroll(v1), click(v2)
// Option B: click(v1), keypress(v2), scroll(v1), click(v2), scroll(v1)
// Option C: Something else!

// Answer: Depends on event loop, timing, OS scheduling
// No guaranteed order!
```

**Test code:**
```javascript
// Track message order
const messageLog = [];

// Patch processMessage to log
const originalProcessMessage = processMessage;
function processMessage(event) {
  messageLog.push({
    timestamp: Date.now(),
    origin: event.origin,
    type: event.data.type
  });
  return originalProcessMessage(event);
}

// Simulate rapid messages from both iframes
// Check that messages are NOT in expected order
```

**Issue:** Code shouldn't assume message ordering

### Test Scenario 5: Cleanup Impact on Multiple Iframes

**What could go wrong:** Cleaning up one vendor affects the other

```javascript
// Parent page with 2 vendors
// vendor-1: healthy, sending messages
// vendor-2: being unmounted (cleanup called)

window.UsageMeter.cleanup();  // ← Removes listener GLOBALLY!

// Now vendor-1 messages are also dropped!
// This is correct behavior (cleanup means stop all activity tracking)
// But developers might expect partial cleanup
```

**Test code:**
```javascript
// Before cleanup
window.UsageMeter.init();
let count1 = 0, count2 = 0;

window.UsageMeter.registerHandler('IFRAME_CLICK_MESSAGE', () => count1++);

// Simulate messages from both vendors
simulateMessage('https://vendor1.example.com', 'IFRAME_CLICK_MESSAGE');
simulateMessage('https://vendor2.example.com', 'IFRAME_CLICK_MESSAGE');

console.log('Before cleanup:', count1, count2);  // 2, 2

// Cleanup
window.UsageMeter.cleanup();

// Try to send more messages
simulateMessage('https://vendor1.example.com', 'IFRAME_CLICK_MESSAGE');
simulateMessage('https://vendor2.example.com', 'IFRAME_CLICK_MESSAGE');

console.log('After cleanup:', count1, count2);  // 2, 2 (no change)
```

### Test Scenario 6: Circuit Breaker with Multiple Iframes

**What could go wrong:** One vendor spamming fills the circuit breaker, blocking the other

```javascript
// Vendor-1: Normal activity
// Vendor-2: Malicious, sending 100+ events/second

// Parent's circuit breaker tracks TOTAL events:
MAX_EVENTS_PER_SECOND = 100;

// Combined: vendor-1 (10/sec) + vendor-2 (95/sec) = OK
// But vendor-1 (5/sec) + vendor-2 (200/sec) = CIRCUIT OPEN

// When circuit opens, BOTH vendors are rate-limited
// Even though vendor-1 is innocent
```

**Test code:**
```javascript
// Simulate attack
for (let i = 0; i < 150; i++) {
  simulateMessage('https://vendor2.example.com', 'IFRAME_CLICK_MESSAGE');
}

console.log('Circuit state:', window.UsageMeter.getCircuitBreakerState());
// Expected: 'OPEN'

// Now vendor-1 tries to send
simulateMessage('https://vendor1.example.com', 'IFRAME_CLICK_MESSAGE');
// Result: DROPPED (not processed)

// Is this the right behavior?
// Pros: Protects parent from DoS
// Cons: Penalizes innocent vendor
```

**Design consideration:** 
- Current behavior: Global rate limit (all vendors share budget)
- Alternative: Per-origin rate limit (each vendor gets 100/sec)

---

## Test Implementation

### Unit Test Example

```javascript
describe('Message Validation', () => {
  beforeEach(() => {
    window.UsageMeter.init();
  });

  afterEach(() => {
    window.UsageMeter.cleanup();
  });

  describe('Origin Validation', () => {
    it('accepts messages from trusted origin', () => {
      const event = new MessageEvent('message', {
        origin: 'https://philskaroulis.github.io',
        data: {
          source: 'iframe-messages',
          type: 'IFRAME_CLICK_MESSAGE',
          timestamp: Date.now()
        }
      });

      // Should not log warning
      spyOn(console, 'warn');
      window.dispatchEvent(event);
      
      expect(console.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('untrusted origin')
      );
    });

    it('rejects messages from untrusted origin', () => {
      const event = new MessageEvent('message', {
        origin: 'https://evil.example.com',
        data: {
          source: 'iframe-messages',
          type: 'IFRAME_CLICK_MESSAGE',
          timestamp: Date.now()
        }
      });

      spyOn(console, 'warn');
      window.dispatchEvent(event);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('untrusted origin')
      );
    });

    it('handles case-insensitive origins correctly', () => {
      const event = new MessageEvent('message', {
        origin: 'HTTPS://PHILSKAROULIS.GITHUB.IO',  // UPPERCASE
        data: {
          source: 'iframe-messages',
          type: 'IFRAME_CLICK_MESSAGE',
          timestamp: Date.now()
        }
      });

      spyOn(console, 'warn');
      window.dispatchEvent(event);

      // Should accept (case-insensitive comparison)
      expect(console.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('untrusted origin')
      );
    });
  });

  describe('Multiple Iframes', () => {
    it('processes messages from multiple trusted origins', () => {
      window.UsageMeter.setVendorOrigin('https://multi-origin');
      
      const origins = [
        'https://vendor1.example.com',
        'https://vendor2.example.com'
      ];

      // Whitelist approach would be needed for this
      // Current code only supports one origin
    });
  });
});
```

### Integration Test: Browser DevTools

```javascript
// In browser console, test cross-origin manually:

// 1. Open parent page
// 2. Open child iframe (vendor)
// 3. In console, simulate evil message:

parent.postMessage({
  source: 'iframe-messages',
  type: 'IFRAME_CLICK_MESSAGE',
  timestamp: Date.now()
}, '*');  // ← Comes from iframe origin, should be accepted

// 4. Check parent console:
// Should log: [Usage Meter] User clicked inside iframe

// 5. Now test spoofing from another tab:
// In attacker tab, try:
window.open('https://app.example.com').postMessage({
  source: 'iframe-messages',
  type: 'IFRAME_CLICK_MESSAGE',
  timestamp: Date.now()
}, '*');

// Parent should reject with: Message from untrusted origin
```

---

## Recommended Test Coverage

| Scenario | Priority | Difficulty | Impact |
|----------|----------|-----------|--------|
| Origin validation (exact match) | 🔴 HIGH | Easy | Security-critical |
| Origin case sensitivity | 🔴 HIGH | Medium | Security |
| Port normalization | 🟠 MEDIUM | Medium | Edge case bug |
| Protocol mismatch | 🟠 MEDIUM | Easy | Security |
| Multiple origins whitelist | 🟠 MEDIUM | Hard | Real-world scenario |
| Iframe load failure | 🟠 MEDIUM | Easy | Reliability |
| Message ordering | 🟡 LOW | Hard | Very rare issue |
| Circuit breaker (multi-iframe) | 🟡 LOW | Hard | Edge case |

---

## Summary

**Key untested areas:**
1. **Origin validation edge cases** — Case sensitivity, ports, protocols
2. **Multiple concurrent iframes** — From same/different origins, load failures
3. **Rate limiting with multiple vendors** — One vendor blocking others
4. **Message ordering guarantees** — None exist, but code might assume them

**Recommended next steps:**
1. Add unit tests for origin validation (case-insensitive, port-aware)
2. Test multiple iframes with different origins
3. Add iframe load/error handlers (already partially done)
4. Document assumptions about message ordering
5. Consider per-origin vs global rate limiting

Most of these are edge cases in real deployments, but security-related tests (origin validation) should be added immediately.
