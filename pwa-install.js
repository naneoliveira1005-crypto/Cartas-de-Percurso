'use strict';
(() => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return;

  let deferredPrompt = null;
  let installButton = null;

  function ensureButton(label) {
    if (installButton) return installButton;
    installButton = document.createElement('button');
    installButton.type = 'button';
    installButton.className = 'pwa-install-button';
    installButton.textContent = label;
    installButton.setAttribute('aria-label', label);
    installButton.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (choice?.outcome === 'accepted') installButton.remove();
        return;
      }
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        alert('Para adicionar o Por Escrito no iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.');
      }
    });
    document.body.append(installButton);
    return installButton;
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    ensureButton('Instalar Por Escrito');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installButton) installButton.remove();
  });

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => ensureButton('Adicionar Por Escrito'));
    } else {
      ensureButton('Adicionar Por Escrito');
    }
  }
})();
