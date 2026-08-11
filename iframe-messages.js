(function() {
    'use strict';

    const PARENT_ORIGIN = '*';
    const MESSAGE_SOURCE = 'vendorname-to-parentname-messages';

    function sendEventToParent(eventType, payload = {}) {
        try {
            window.parent.postMessage(
                {
                    source: MESSAGE_SOURCE,
                    type: eventType,
                    timestamp: Date.now(),
                    ...payload
                },
                PARENT_ORIGIN
            );
            console.log(`[${MESSAGE_SOURCE}] ${eventType} sent to parent`, payload);
        } catch (e) {
            console.error('Failed to postMessage to parent:', e);
        }
    }

    function throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    window.addEventListener(
        'click',
        (e) => {
            sendEventToParent('IFRAME_CLICK', {
                targetTag: e.target ? e.target.tagName : 'UNKNOWN'
            });
        },
        { passive: true }
    );

    window.addEventListener(
        'keydown',
        () => {
            sendEventToParent('IFRAME_KEYPRESS');
        },
        { passive: true }
    );

    window.addEventListener(
        'scroll',
        throttle(() => {
            sendEventToParent('IFRAME_SCROLL', {
                scrollX: window.scrollX || document.documentElement.scrollLeft,
                scrollY: window.scrollY || document.documentElement.scrollTop
            });
        }, 200),
        { passive: true }
    );

    window.addEventListener(
        'mousemove',
        throttle(() => {
            sendEventToParent('IFRAME_MOUSEMOVE');
        }, 500),
        { passive: true }
    );

    document.addEventListener(
        'visibilitychange',
        () => {
            sendEventToParent('IFRAME_VISIBILITY_CHANGE', {
                visibilityState: document.visibilityState
            });
        },
        { passive: true }
    );

    console.log(`[${MESSAGE_SOURCE}] Event listeners attached`);
    console.log(`[${MESSAGE_SOURCE}] Monitoring: IFRAME_CLICK, IFRAME_KEYPRESS, IFRAME_SCROLL, IFRAME_MOUSEMOVE, IFRAME_VISIBILITY_CHANGE`);
})();
