(function () {
    // Configuration
    const WIDGET_URL = 'https://abu-crm-presen.vercel.app/chat-widget'; // TODO: Update with production URL or use relative if same domain
    // const WIDGET_URL = 'http://localhost:3000/chat-widget'; // Local dev

    // Create container
    const container = document.createElement('div');
    container.id = 'abu-chat-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '999999';
    container.style.width = '60px'; // Initial bubble size
    container.style.height = '60px'; // Initial bubble size
    container.style.transition = 'all 0.3s ease';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = WIDGET_URL;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '10px';

    container.appendChild(iframe);
    document.body.appendChild(container);

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
        // Security check: verify origin if possible
        // if (event.origin !== 'https://your-crm-domain.com') return;

        if (event.data.type === 'ABU_CHAT_TOGGLE') {
            if (event.data.isOpen) {
                // Expand
                container.style.width = '380px';
                container.style.height = '600px';
                container.style.bottom = '10px';
                container.style.right = '10px';
                iframe.style.boxShadow = '0 5px 20px rgba(0,0,0,0.15)';
                iframe.style.borderRadius = '12px';
            } else {
                // Collapse
                container.style.width = '60px';
                container.style.height = '60px';
                container.style.bottom = '20px';
                container.style.right = '20px';
                iframe.style.boxShadow = 'none';
                iframe.style.borderRadius = '30px'; // Round for bubble
            }
        }
    });
})();
