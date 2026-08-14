// Environment Configuration - Shared across all scripts
// Detects environment and provides URLs based on isDevelopment flag

(function() {
    // ============ ENVIRONMENT DETECTION ============
    // isDevelopment is true on localhost OR on vercel preview deployments
    const isDevelopment = window.location.hostname.includes('vercel.app') ||
                         window.location.hostname === 'localhost';

    // ============ CONFIGURATION ============
    const ENV_CONFIG = {
        prod: {
            VENDOR_URL: 'https://philskaroulis.github.io/iframe-activity-tracker/index.html',
            VENDOR_ORIGIN: 'https://philskaroulis.github.io',
            PARENT_ORIGIN: 'https://iframe-activity-tracker.vercel.app/',
            MESSAGES_SCRIPT_SRC: 'https://philskaroulis.github.io/iframe-activity-tracker/messages-from-iframe.min.js'
        },
        dev: {
            VENDOR_URL: 'https://philskaroulis.github.io/iframe-activity-tracker/index-dev.html',
            VENDOR_ORIGIN: 'https://philskaroulis.github.io',
            PARENT_ORIGIN: 'https://iframe-activity-tracker-git-develop-phil-skaroulis-projects.vercel.app',
            MESSAGES_SCRIPT_SRC: 'https://iframe-activity-tracker-git-develop-phil-skaroulis-projects.vercel.app/messages-from-iframe.min.js'
        }
    };

    // Select appropriate config based on environment
    const activeConfig = isDevelopment ? ENV_CONFIG.dev : ENV_CONFIG.prod;

    // ============ PUBLIC API ============
    window.EnvConfig = {
        isDevelopment: isDevelopment,
        get: (key) => activeConfig[key],
        getAll: () => ({ ...activeConfig }),
        environment: isDevelopment ? 'development' : 'production'
    };

    console.log('[EnvConfig] Initialized for', window.EnvConfig.environment, 'environment');
    console.log('[EnvConfig] PARENT_ORIGIN:', activeConfig.PARENT_ORIGIN);
    console.log('[EnvConfig] VENDOR_ORIGIN:', activeConfig.VENDOR_ORIGIN);
})();
