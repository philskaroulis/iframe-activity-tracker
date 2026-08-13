// UI Manager - Handles visual representation of activity state
(function() {
    'use strict';

    const ACTIVE_CLASS = 'active';
    const INACTIVE_CLASS = 'inactive';
    const INACTIVITY_TIMEOUT = 10000;

    // State
    let lastActivityTime = null;
    let inactivityTimer = null;
    let isActive = false;

    // DOM elements
    const header = document.querySelector('header');
    const statusText = document.querySelector('.status-text');
    const countdown = document.querySelector('.countdown');

    function formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    function updateCountdown() {
        if (!isActive || !lastActivityTime) {
            countdown.textContent = 'Seconds to INACTIVE: --s';
            return;
        }

        const now = Date.now();
        const elapsed = now - lastActivityTime.getTime();
        const remainingMs = Math.max(0, INACTIVITY_TIMEOUT - elapsed);
        const remainingSeconds = (remainingMs / 1000).toFixed(1);

        countdown.textContent = `Seconds to INACTIVE: ${remainingSeconds}s`;
    }

    function setActive() {
        isActive = true;
        header.classList.remove(INACTIVE_CLASS);
        header.classList.add(ACTIVE_CLASS);
        statusText.textContent = 'ACTIVE';

        countdown.classList.remove('disabled');
        lastActivityTime = new Date();

        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }

        inactivityTimer = setTimeout(() => {
            setInactive();
        }, INACTIVITY_TIMEOUT);

        updateCountdown();
    }

    function setInactive() {
        isActive = false;
        header.classList.remove(ACTIVE_CLASS);
        header.classList.add(INACTIVE_CLASS);
        statusText.textContent = 'INACTIVE';

        countdown.classList.add('disabled');

        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    }

    // Public API
    window.UIManager = {
        setActive,
        setInactive
    };

    // Initialization
    setInactive();
    countdown.classList.add('disabled');

    // Start countdown animation loop
    function animateCountdown() {
        updateCountdown();
        requestAnimationFrame(animateCountdown);
    }
    animateCountdown();

    // Handle parent window visibility
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            setInactive();
        }
    });

    console.log('[UI Manager] Initialized');
})();
