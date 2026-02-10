(function () {
    // Determine origin more reliably
    let origin;
    if (document.currentScript) {
        origin = new URL(document.currentScript.src).origin;
    } else {
        // Fallback for older browsers or certain edge cases
        const scripts = document.getElementsByTagName('script');
        const lastScript = scripts[scripts.length - 1];
        origin = new URL(lastScript.src).origin;
    }

    console.log('[ABU Chat] Initializing from:', origin);
    const WIDGET_URL = origin + '/chat-widget';

    // Avoid multiple initializations
    if (document.getElementById('abu-chat-container')) {
        console.warn('[ABU Chat] Already initialized');
        return;
    }

    // Create container
    const container = document.createElement('div');
    container.id = 'abu-chat-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '2147483647'; // Max z-index
    container.style.width = '64px';
    container.style.height = '64px';
    container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = WIDGET_URL;
    iframe.id = 'abu-chat-iframe';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '32px';
    iframe.style.backgroundColor = 'transparent';
    iframe.style.colorScheme = 'light';
    iframe.allowTransparency = 'true';

    container.appendChild(iframe);
    document.body.appendChild(container);

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
        if (event.origin !== origin) return;

        if (event.data.type === 'ABU_CHAT_TOGGLE') {
            if (event.data.isOpen) {
                // Expand
                container.style.width = '400px';
                container.style.height = '650px';
                container.style.maxWidth = '90vw';
                container.style.maxHeight = '90vh';
                container.style.bottom = '10px';
                container.style.right = '10px';
                iframe.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)';
                iframe.style.borderRadius = '16px';
            } else {
                // Collapse
                container.style.width = '64px';
                container.style.height = '64px';
                container.style.bottom = '20px';
                container.style.right = '20px';
                iframe.style.boxShadow = 'none';
                iframe.style.borderRadius = '32px';
            }
        }
    });
})();
