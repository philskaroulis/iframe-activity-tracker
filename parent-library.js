// um-library.js - Parent page activity monitor
// This script runs on index.html and:
// 1. Listens for postMessage events from iframe-messages.js (in the iframe)
// 2. Tracks the last activity time
// 3. Updates the header color (green = active, gray = inactive after 15 seconds)

(function() {
    'use strict';

    // Configuration
    const INACTIVITY_TIMEOUT = 10000; // 10 seconds in milliseconds
    const ACTIVE_CLASS = 'active';
    const INACTIVE_CLASS = 'inactive';

    // Get DOM elements
    const header = document.querySelector('header');
    const statusText = document.querySelector('.status-text');
    const timestamp = document.querySelector('.timestamp');
    const countdown = document.querySelector('.countdown');

    // State
    let lastActivityTime = null;
    let inactivityTimer = null;
    let isActive = false;

    /**
     * Format a date to a readable string
     */
    function formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    /**
     * Update the countdown timer display
     */
    function updateCountdown() {
        if (!isActive || !lastActivityTime) {
            countdown.textContent = 'Next update in: --s';
            return;
        }

        const now = Date.now();
        const elapsed = now - lastActivityTime.getTime();
        const remainingMs = Math.max(0, INACTIVITY_TIMEOUT - elapsed);
        const remainingSeconds = (remainingMs / 1000).toFixed(1);

        countdown.textContent = `Next update in: ${remainingSeconds}s`;
    }

    /**
     * Set the page to ACTIVE state (green header)
     */
    function setActive() {
        isActive = true;
        header.classList.remove(INACTIVE_CLASS);
        header.classList.add(ACTIVE_CLASS);
        statusText.textContent = 'ACTIVE';

        // Update timestamp
        lastActivityTime = new Date();
        timestamp.textContent = `Last activity: ${formatTime(lastActivityTime)}`;

        // Clear any existing inactivity timer
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }

        // Set a new inactivity timer
        inactivityTimer = setTimeout(() => {
            setInactive();
        }, INACTIVITY_TIMEOUT);

        // Update countdown immediately
        updateCountdown();
    }

    /**
     * Set the page to INACTIVE state (gray header)
     */
    function setInactive() {
        isActive = false;
        header.classList.remove(ACTIVE_CLASS);
        header.classList.add(INACTIVE_CLASS);
        statusText.textContent = 'INACTIVE';

        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    }

    /**
     * Listen for messages from the iframe
     */
    window.addEventListener('message', function(event) {
        try {
            // Validate message structure
            if (!event.data) return;
            if (event.data.source !== 'vendorname-to-parentname-messages') return;

            const { type, timestamp } = event.data;

            // Handle activity events
            if (type && type.startsWith('IFRAME_')) {
                setActive();
                console.log(`Activity from iframe: ${type}`, event.data);
            }
        } catch (e) {
            console.error('Error processing message from iframe:', e);
        }
    });

    // Initialize the page as INACTIVE
    setInactive();

    // Start countdown animation loop
    function animateCountdown() {
        updateCountdown();
        requestAnimationFrame(animateCountdown);
    }
    animateCountdown();

    // Optional: Log for debugging
    console.log('parent-library.js loaded - Activity monitor initialized');
})();
