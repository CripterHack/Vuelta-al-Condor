// Registro del Service Worker con manejo de actualización
(function(){
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/sw.js').then(function(reg){
        if (!reg) return;
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', function(){
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function(){
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Opcional: notificar actualización disponible
              // console.info('Actualización lista. Se actualizará al recargar.');
            }
          });
        });
      }).catch(function(_){ /* silencioso */ });
    }, { once: true });
  }
})();