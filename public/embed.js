// ABU Chat Widget Embed Script v2.1
(function () {
    console.log('[ABU Chat] Script loaded. Checking readiness...');

    if (window.ABU_CHAT_LOADED) {
        console.warn('[ABU Chat] Already loaded, skipping.');
        return;
    }
    window.ABU_CHAT_LOADED = true;

    // Detect origin
    let origin = 'https://crm.abuapp.io'; // Default fallback
    if (document.currentScript && document.currentScript.src) {
        try {
            origin = new URL(document.currentScript.src).origin;
            console.log('[ABU Chat] Detected origin from script src:', origin);
        } catch (e) {
            console.error('[ABU Chat] Error parsing script src:', e);
        }
    } else {
        console.warn('[ABU Chat] Could not detect script source, using fallback:', origin);
    }

    // Create container
    var container = document.createElement('div');
    container.id = 'abu-chat-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.zIndex = '2147483647'; // Max safe integer
    container.style.width = '64px';
    container.style.height = '64px';
    container.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'; // Launcher shadow
    container.style.borderRadius = '32px'; // Rounded for launcher
    container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    container.style.overflow = 'hidden'; // Prevent content overflow
    container.style.pointerEvents = 'auto'; // Ensure clickable

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.id = 'abu-chat-iframe';
    iframe.src = origin + '/chat-widget';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '32px';
    iframe.style.display = 'block'; // Prevent inline spacing issues
    iframe.style.colorScheme = 'light'; // Force light mode for standard iframe behavior

    // Append
    container.appendChild(iframe);
    document.body.appendChild(container);
    console.log('[ABU Chat] Container and iframe injected.');

    // Listen to messages
    window.addEventListener('message', function (event) {
        // We verify the origin to ensure security, but log mismatches for debugging
        if (event.origin !== origin) {
            console.log('[ABU Chat] Ignored message from origin:', event.origin, 'Expected:', origin);
            return;
        }

        if (event.data.type === 'ABU_CHAT_TOGGLE') {
            console.log('[ABU Chat] Toggle event received:', event.data.isOpen);
            if (event.data.isOpen) {
                container.style.width = '400px';
                container.style.height = '650px';
                container.style.maxWidth = '90vw';
                container.style.maxHeight = '90vh';
                container.style.bottom = '24px';
                container.style.right = '24px';
                container.style.boxShadow = '0 20px 50px rgba(0,0,0,0.25)'; // Open state shadow
                container.style.borderRadius = '16px'; // Rounded for open chat
                iframe.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)';
                iframe.style.borderRadius = '16px';
            } else {
                container.style.width = '64px';
                container.style.height = '64px';
                container.style.bottom = '24px';
                container.style.right = '24px';
                container.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'; // Back to launcher shadow
                container.style.borderRadius = '32px'; // Back to launcher radius
                iframe.style.boxShadow = 'none';
                iframe.style.borderRadius = '32px';
            }
        }
    });

    console.log('[ABU Chat] Initialization complete. Waiting for messages...');
})();
