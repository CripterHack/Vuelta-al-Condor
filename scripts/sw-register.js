// Registro del Service Worker con manejo de actualización
(function(){
  const script = document.currentScript;
  if ('serviceWorker' in navigator && script?.src) {
    // Resolve from scripts/ while currentScript is available, not from the host root.
    const workerUrl = new URL('../sw.js', script.src).href;
    window.addEventListener('load', function(){
      navigator.serviceWorker.register(workerUrl).then(function(reg){
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
      }).catch(function(){ /* silencioso */ });
    }, { once: true });
  }
})();