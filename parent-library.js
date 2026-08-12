// Parent Activity Monitor - Enhanced with Security & Extensibility
// Features:
// - Error handling with try-catch
// - Rate limiting & circuit breaker (prevent DOS)
// - Extensible event handler registry
// - Debug mode toggle
// - Timestamp validation

(function() {
    'use strict';

    // ============ CONFIGURATION ============
    const CONFIG = {
        INACTIVITY_TIMEOUT: 10000,
        VENDOR_ORIGIN: '*',
        MESSAGE_SOURCE: 'vendorname-to-parentname-messages',
        DEBUG: false,
        MAX_EVENTS_PER_SECOND: 100,
        MAX_TIMESTAMP_DEVIATION_MS: 5000
    };

    const ACTIVE_CLASS = 'active';
    const INACTIVE_CLASS = 'inactive';

    // ============ STATE ============
    let lastActivityTime = null;
    let inactivityTimer = null;
    let isActive = false;

    // Circuit breaker state
    let circuitBreakerState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    let eventCountThisSecond = 0;
    let lastEventCountReset = Date.now();

    // Event handler registry
    const eventHandlers = new Map();

    // Get DOM elements
    const header = document.querySelector('header');
    const statusText = document.querySelector('.status-text');
    const countdown = document.querySelector('.countdown');

    // ============ LOGGING UTILITIES ============
    function log(message, data) {
        if (CONFIG.DEBUG) {
            console.log(`[Activity Monitor] ${message}`, data || '');
        }
    }

    function warn(message, data) {
        console.warn(`[Activity Monitor] ⚠️  ${message}`, data || '');
    }

    function error(message, data) {
        console.error(`[Activity Monitor] ❌ ${message}`, data || '');
    }

    // ============ TIMESTAMP VALIDATION ============
    function validateTimestamp(eventTimestamp) {
        const now = Date.now();
        const deviation = Math.abs(now - eventTimestamp);

        if (deviation > CONFIG.MAX_TIMESTAMP_DEVIATION_MS) {
            warn(`Timestamp deviation exceeds threshold: ${deviation}ms (event: ${eventTimestamp}, now: ${now})`);
            return false;
        }

        return true;
    }

    // ============ RATE LIMITING & CIRCUIT BREAKER ============
    function checkRateLimit() {
        const now = Date.now();

        // Reset counter every second
        if (now - lastEventCountReset >= 1000) {
            eventCountThisSecond = 0;
            lastEventCountReset = now;
        }

        eventCountThisSecond++;

        // Transition: CLOSED -> OPEN (rate limit exceeded)
        if (eventCountThisSecond > CONFIG.MAX_EVENTS_PER_SECOND && circuitBreakerState === 'CLOSED') {
            circuitBreakerState = 'OPEN';
            error(`Rate limit exceeded (${eventCountThisSecond}/${CONFIG.MAX_EVENTS_PER_SECOND} events/sec). Circuit breaker OPEN.`);
            return false;
        }

        // Transition: OPEN -> HALF_OPEN (rate dropped below 50%)
        if (circuitBreakerState === 'OPEN' && eventCountThisSecond < CONFIG.MAX_EVENTS_PER_SECOND / 2) {
            circuitBreakerState = 'HALF_OPEN';
            log('Circuit breaker HALF_OPEN - attempting recovery');
        }

        // Transition: HALF_OPEN -> CLOSED (rate normalized)
        if (circuitBreakerState === 'HALF_OPEN' && eventCountThisSecond < 10) {
            circuitBreakerState = 'CLOSED';
            log('Circuit breaker CLOSED - recovered');
        }

        // Reject if circuit is open
        if (circuitBreakerState === 'OPEN') {
            return false;
        }

        return true;
    }

    // ============ EVENT HANDLER REGISTRY ============
    function registerEventHandler(eventType, handler) {
        if (typeof handler !== 'function') {
            throw new Error(`Handler for ${eventType} must be a function`);
        }
        eventHandlers.set(eventType, handler);
        log(`Registered handler for ${eventType}`);
    }

    function createDefaultHandlers() {
        registerEventHandler('IFRAME_CLICK', (details, eventTimestamp) => {
            log(`User clicked on ${details.targetTag || 'UNKNOWN'} element`, { timestamp: eventTimestamp });
        });

        registerEventHandler('IFRAME_KEYPRESS', (details, eventTimestamp) => {
            log(`User typing detected inside iframe`, { timestamp: eventTimestamp });
        });

        registerEventHandler('IFRAME_SCROLL', (details, eventTimestamp) => {
            log(`User scrolled inside iframe`, { scrollX: details.scrollX, scrollY: details.scrollY, timestamp: eventTimestamp });
        });

        registerEventHandler('IFRAME_MOUSEMOVE', (details, eventTimestamp) => {
            log(`Active mouse movement inside iframe`, { timestamp: eventTimestamp });
        });

        registerEventHandler('IFRAME_VISIBILITY_CHANGE', (details, eventTimestamp) => {
            log(`iFrame visibility changed to: ${details.visibilityState}`, { timestamp: eventTimestamp });
        });
    }

    // ============ TIME FORMATTING ============
    function formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    // ============ COUNTDOWN DISPLAY ============
    function updateCountdown() {
        if (!isActive || !lastActivityTime) {
            countdown.textContent = 'Seconds to INACTIVE: --s';
            return;
        }

        const now = Date.now();
        const elapsed = now - lastActivityTime.getTime();
        const remainingMs = Math.max(0, CONFIG.INACTIVITY_TIMEOUT - elapsed);
        const remainingSeconds = (remainingMs / 1000).toFixed(1);

        countdown.textContent = `Seconds to INACTIVE: ${remainingSeconds}s`;
    }

    // ============ ACTIVITY STATE MANAGEMENT ============
    function setActive() {
        isActive = true;
        header.classList.remove(INACTIVE_CLASS);
        header.classList.add(ACTIVE_CLASS);
        statusText.textContent = 'ACTIVE';

        // Show countdown when active
        countdown.classList.remove('disabled');

        // Track activity time for countdown
        lastActivityTime = new Date();

        // Clear any existing inactivity timer
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }

        // Set a new inactivity timer
        inactivityTimer = setTimeout(() => {
            setInactive();
        }, CONFIG.INACTIVITY_TIMEOUT);

        // Update countdown immediately
        updateCountdown();
    }

    function setInactive() {
        isActive = false;
        header.classList.remove(ACTIVE_CLASS);
        header.classList.add(INACTIVE_CLASS);
        statusText.textContent = 'INACTIVE';

        // Disable countdown when inactive
        countdown.classList.add('disabled');

        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    }

    // ============ MESSAGE PROCESSING ============
    function processMessage(event) {
        try {
            // Debug: Log all messages received
            console.log('[Activity Monitor] Message received:', event.data);

            // 1. Security: Source validation
            if (!event.data) {
                console.log('[Activity Monitor] No data in message');
                return;
            }

            if (event.data.source !== CONFIG.MESSAGE_SOURCE) {
                console.log(`[Activity Monitor] Wrong source: ${event.data.source} (expected: ${CONFIG.MESSAGE_SOURCE})`);
                return;
            }

            // 2. Extract and validate data
            const { type, timestamp: eventTimestamp, ...details } = event.data;

            // 3. Timestamp validation
            if (!validateTimestamp(eventTimestamp)) {
                return;
            }

            // 4. Event type validation
            if (!type || !type.startsWith('IFRAME_')) {
                warn(`Unknown event type: ${type}`);
                return;
            }

            // 5. Rate limiting / Circuit breaker
            if (!checkRateLimit()) {
                log(`Message dropped - circuit breaker OPEN or rate limit exceeded`);
                return;
            }

            // 6. Route to handler
            const handler = eventHandlers.get(type);
            if (handler) {
                handler(details, eventTimestamp);
            } else {
                warn(`No handler registered for event type: ${type}`);
            }

            // 7. Trigger activity state change based on event type
            // Visibility changes deactivate, all other user actions activate
            if (type === 'IFRAME_VISIBILITY_CHANGE') {
                setInactive();
            } else {
                setActive();
            }

        } catch (e) {
            error(`Failed to process message from iframe: ${e.message}`);
        }
    }

    // ============ PUBLIC API ============
    window.ActivityMonitor = {
        registerHandler: registerEventHandler,
        setDebug: (enabled) => {
            CONFIG.DEBUG = enabled;
            log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
        },
        getCircuitBreakerState: () => circuitBreakerState,
        getEventCountThisSecond: () => eventCountThisSecond,
        getConfig: () => ({ ...CONFIG })
    };

    // ============ INITIALIZATION ============
    window.addEventListener('message', processMessage);
    console.log('[Activity Monitor] Message listener registered');

    // Listen for parent window visibility changes (parent losing/gaining focus)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            log('Parent window lost focus - setting INACTIVE');
            setInactive();
        } else {
            log('Parent window regained focus');
            // Don't automatically set ACTIVE - wait for user activity in iframe
        }
    });

    // Set initial state (INACTIVE with disabled countdown)
    setInactive();
    countdown.classList.add('disabled');

    // Start countdown animation loop
    function animateCountdown() {
        updateCountdown();
        requestAnimationFrame(animateCountdown);
    }
    animateCountdown();

    // Register default event handlers
    createDefaultHandlers();

    // Log initialization
    console.log('[Activity Monitor] Initialized with enhancements:');
    console.log('  ✓ Error handling');
    console.log('  ✓ Rate limiting & circuit breaker');
    console.log('  ✓ Extensible event handlers');
    console.log('  ✓ Timestamp validation');
    console.log('  ✓ Debug mode support');
    console.log('[Activity Monitor] Enable debug: window.ActivityMonitor.setDebug(true)');
})();
