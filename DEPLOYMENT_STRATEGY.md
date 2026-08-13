# Deployment Strategy: Environment-Based Script Loading

## Problem

The `develop` and `main` branches had mismatched script versions:
- `develop` branch code tried to load scripts from GitHub Pages (main branch)
- But GitHub Pages served the OLD version of scripts (main branch)
- Result: Version mismatch → functionality broken

## Solution

Implemented **environment-based script loading** with **version verification**.

### How It Works

```
┌─────────────────────────────────────────┐
│  User deploys application               │
├─────────────────────────────────────────┤
│  1. Browser loads index.html            │
│  2. index.html detects environment      │
│     - localhost → development           │
│     - *.vercel.app → development        │
│     - Other → production                │
│  3. Load appropriate iframe URL:        │
│     - Dev: /docs/index.html (local)     │
│     - Prod: GitHub Pages URL            │
│  4. Verify version match                │
│     - Parent version (fake-usage-meter) │
│     - Iframe version (messages-from)    │
│  5. Log results to console              │
└─────────────────────────────────────────┘
```

### Key Features

**1. Environment Detection**

```javascript
const isDevelopment = window.location.hostname.includes('vercel.app') ||
                     window.location.hostname === 'localhost';

const VENDOR_URL = isDevelopment
    ? window.location.origin + '/docs/index.html'  // Local
    : 'https://philskaroulis.github.io/iframe-activity-tracker/index.html';  // GitHub Pages
```

**2. Version Tracking**

Each script exposes its version:
```javascript
window.UsageMeter.getVersion()          // → '2.0.0'
window.IframeMessenger.getVersion()     // → '2.0.0'
```

**3. Version Verification**

After iframe loads:
```
[App] ✓ Versions match - Parent: 2.0.0, Iframe: 2.0.0
```

If versions don't match:
```
[App] ⚠️  Version mismatch! Parent: 2.0.0, Iframe: 1.9.0
```

---

## Deployment Workflows

### Develop Branch (Preview)

```bash
# Push to develop branch
git push origin develop

# Vercel auto-deploys to preview URL (e.g., https://app-preview.vercel.app)
# ↓
# index.html detects: hostname includes 'vercel.app'
# ↓
# Loads iframe from: https://app-preview.vercel.app/docs/index.html
# ↓
# Uses develop branch scripts (latest changes)
```

**Result:** Develop branch code + develop branch scripts = ✓ Match

### Main Branch (Production)

```bash
# Push to main branch
git push origin main

# Vercel auto-deploys to production URL (e.g., https://app.example.com)
# ↓
# index.html detects: NOT vercel.app or localhost
# ↓
# Loads iframe from: https://philskaroulis.github.io/...
# ↓
# Uses main branch scripts (GitHub Pages)
```

**Result:** Main branch code + GitHub Pages scripts = ✓ Match

---

## No More Manual Merging!

**Before:** Had to merge `develop` into `main` to sync scripts
- Risky
- Extra step
- Blocks feature testing on develop

**After:** Each branch loads its own scripts
- No merging needed
- Safe to test on develop
- Main always serves stable version
- Easy to rollback

---

## Console Output Examples

### Successful Deployment

```
[App] Environment: Development
[App] Loading iframe from: http://localhost:3000/docs/index.html
[App] Iframe loaded successfully
[App] Version check - Parent: 2.0.0, Iframe: 2.0.0
[App] ✓ Versions match
[App] Iframe messenger is initialized and responsive
[Usage Meter] Initialized with:
  ✓ Origin validation...
```

### Version Mismatch (Problem!)

```
[App] Version check - Parent: 2.0.0, Iframe: 1.9.0
[App] ⚠️  Version mismatch! This may cause compatibility issues
```

→ Indicates scripts don't match; need to redeploy or check deployment

### Iframe Not Loading

```
[App] Iframe failed to load
[App] Check vendor URL, CSP headers, and CORS policy
[App] Vendor URL: http://localhost:3000/docs/index.html
```

→ Check if local server is running, or GitHub Pages is accessible

---

## Versioning

Both scripts now track version (`v2.0.0`):
- `fake-usage-meter.js` line 10: `var VERSION = '2.0.0';`
- `messages-from-iframe.js` line 4: `var VERSION = '2.0.0';`

**When to bump version:**
- Major breaking changes → `2.0.0` → `3.0.0`
- New features → `2.0.0` → `2.1.0`
- Bug fixes → `2.0.0` → `2.0.1`

Update both scripts and regenerate minified versions.

---

## Local Development

### Option 1: Run Both Locally

```bash
# Terminal 1: Run local dev server
npm run dev
# Starts on http://localhost:3000

# Terminal 2: Open in browser
# http://localhost:3000
# ↓
# Detects: localhost
# ↓
# Loads: http://localhost:3000/docs/index.html
# ↓
# All local scripts loaded
```

### Option 2: Test Production Build Locally

```bash
# Build production version
npm run build

# Serve production build
npm run serve:prod
# http://localhost:5000

# In browser DevTools:
console.log(window.location.hostname)  // 'localhost'
// Still loads local scripts (localhost = development)
```

### Option 3: Override Script URL (Advanced)

```javascript
// In browser console
window.OVERRIDE_VENDOR_URL = 'https://my-staging.example.com/docs/index.html';
location.reload();
```

Or in index.html for testing:
```javascript
const VENDOR_URL = window.OVERRIDE_VENDOR_URL || (isDevelopment ? ... : ...);
```

---

## Troubleshooting

### Problem: Iframe not loading

**Check console logs:**
```
[App] Iframe failed to load
[App] Vendor URL: ...
```

**Possible causes:**
1. Local dev server not running (if testing develop)
2. GitHub Pages down (if testing main)
3. CSP header blocking (check `docs/index.html` CSP policy)
4. Network issue (check DevTools Network tab)

**Fix:**
- Start dev server: `npm run dev`
- Or check GitHub Pages is accessible: https://philskaroulis.github.io/...

### Problem: Version mismatch warning

**Console shows:**
```
[App] ⚠️  Version mismatch! Parent: 2.0.0, Iframe: 1.9.0
```

**Cause:** Deployed code doesn't match loaded scripts

**Fix:**
- Wait for Vercel deployment to complete
- Or manually clear browser cache: Ctrl+Shift+Delete
- Or check GitHub Pages reflects latest code

### Problem: Messages not being processed

**Check version match first:**
```javascript
window.UsageMeter.getVersion()
// 2.0.0

window.IframeMessenger.getVersion()
// 2.0.0

window.UsageMeter.getConfig()
// {VENDOR_ORIGIN: 'https://...', MESSAGE_SOURCE: 'iframe-messages', ...}
```

**Then check:**
- Is UIManager initialized? `window.UIManager.isInitialized()`
- Is UsageMeter initialized? `window.UsageMeter.isInitialized()`
- Are there console errors? (Check browser console)

---

## Summary

✅ **develop** branch: Loads from local `/docs` folder
✅ **main** branch: Loads from GitHub Pages
✅ **Version verification**: Detects mismatches automatically
✅ **No manual merging**: Scripts stay in sync with code
✅ **Clear logging**: Console shows which environment is active
✅ **Easy debugging**: Version info helps diagnose issues

This approach scales for multiple environments (staging, QA, production) by simply adjusting the environment detection logic.
