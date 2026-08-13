(function() {
    var PARENT_ORIGIN = 'https://iframe-activity-tracker.vercel.app/';
    var MESSAGE_SOURCE = 'iframe-messages';
    var LOG_SOURCE = '['+MESSAGE_SOURCE+'] ';

    function sendMessageToParent(eventType) {
        try {
            window.parent.postMessage({
                source: MESSAGE_SOURCE,
                type: eventType,
                timestamp: Date.now()
            }, PARENT_ORIGIN);
        } catch (e) {
            console.error(LOG_SOURCE + 'Failed to postMessage to parent:', e);
        }
    }

    function throttle(func, limit) {
        var inThrottle;
        return function() {
            if (!inThrottle) {
                func();
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    }

    window.addEventListener('click', function() {
        sendMessageToParent('IFRAME_CLICK_MESSAGE');
    }, { passive: true });

    window.addEventListener('keydown', function() {
        sendMessageToParent('IFRAME_KEYPRESS_MESSAGE');
    }, { passive: true });

    window.addEventListener('scroll', throttle(function() {
        sendMessageToParent('IFRAME_SCROLL_MESSAGE');
    }, 200), { passive: true });

    window.addEventListener('mousemove', throttle(function() {
        sendMessageToParent('IFRAME_MOUSEMOVE_MESSAGE');
    }, 500), { passive: true });

    document.addEventListener('visibilitychange', function() {
        sendMessageToParent('IFRAME_VISIBILITY_CHANGE_MESSAGE');
    }, { passive: true });

    console.log(LOG_SOURCE + 'Event listeners attached to ');
})();
