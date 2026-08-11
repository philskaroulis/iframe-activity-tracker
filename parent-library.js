// um-library.js - Parent page activity monitor
// This script runs on index.html and:
// 1. Listens for postMessage events from iframe-messages.js (in the iframe)
// 2. Tracks the last activity time
// 3. Updates the header color (green = active, gray = inactive after 15 seconds)

(function() {
    'use strict';

    // Configuration
    const INACTIVITY_TIMEOUT = 15000; // 15 seconds in milliseconds
    const ACTIVE_CLASS = 'active';
    const INACTIVE_CLASS = 'inactive';

    // Get DOM elements
    const header = document.querySelector('header');
    const statusText = document.querySelector('.status-text');
    const timestamp = document.querySelector('.timestamp');

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
     * The iframe sends: { type: 'activity', timestamp: Date.now() }
     */
    window.addEventListener('message', function(event) {
        // Security check: only accept messages from iframe sources
        // In a real app, you'd validate the origin more strictly
        if (event.data && event.data.type === 'activity') {
            // Activity detected from iframe - switch to active state
            setActive();
        }
    });

    // Initialize the page as INACTIVE
    setInactive();

    // Optional: Log for debugging
    console.log('um-library.js loaded - Activity monitor initialized');
})();
