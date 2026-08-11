// oreilly-messages.js - Iframe activity detector
// This script runs inside the iframe and:
// 1. Listens for user events (click, keydown, scroll, mousemove, visibilitychange)
// 2. Sends each event to the parent page using window.parent.postMessage()

(function() {
    'use strict';

    // List of events to monitor
    const EVENTS_TO_MONITOR = [
        'click',
        'keydown',
        'scroll',
        'mousemove',
        'visibilitychange'
    ];

    /**
     * Send an activity message to the parent page
     */
    function sendActivityMessage(eventType) {
        const message = {
            type: 'activity',
            eventType: eventType,
            timestamp: Date.now()
        };

        // Send the message to the parent page
        window.parent.postMessage(message, '*');

        // Optional: Log for debugging in the iframe console
        console.log(`Activity detected (${eventType}) - Message sent to parent`);
    }

    /**
     * Create a throttled event handler
     * This prevents sending too many messages for rapid events like mousemove
     */
    function createThrottledHandler(eventType, delay = 500) {
        let lastTime = 0;

        return function() {
            const now = Date.now();
            if (now - lastTime >= delay) {
                sendActivityMessage(eventType);
                lastTime = now;
            }
        };
    }

    // Attach event listeners
    EVENTS_TO_MONITOR.forEach((eventType) => {
        if (eventType === 'mousemove') {
            // Throttle mousemove events (send max once every 500ms)
            document.addEventListener(eventType, createThrottledHandler(eventType, 500), false);
        } else if (eventType === 'scroll') {
            // Throttle scroll events (send max once every 500ms)
            document.addEventListener(eventType, createThrottledHandler(eventType, 500), false);
        } else {
            // Send immediately for other events
            document.addEventListener(eventType, function() {
                sendActivityMessage(eventType);
            }, false);
        }
    });

    // Log initialization
    console.log('oreilly-messages.js loaded - Event listeners attached');
    console.log(`Monitoring events: ${EVENTS_TO_MONITOR.join(', ')}`);
})();
