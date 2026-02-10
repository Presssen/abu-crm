(function () {
    // Determine the origin of the script itself to set the WIDGET_URL
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    const scriptUrl = new URL(currentScript.src);
    const origin = scriptUrl.origin;
    const WIDGET_URL = origin + '/chat-widget';

    // Create container
    const container = document.createElement('div');
    container.id = 'abu-chat-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '999999';
    container.style.width = '64px';
    container.style.height = '64px';
    container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = WIDGET_URL;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '32px';
    iframe.style.backgroundColor = 'transparent';
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
