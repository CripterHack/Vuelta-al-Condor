// Google Analytics: carga tras interacción o idle, respetando DNT/Save-Data
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  function dntEnabled(){
    try {
      var dnt = (navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack || '').toString().toLowerCase();
      return dnt === '1' || dnt === 'yes' || dnt === 'true';
    } catch(_) { return false; }
  }
  function saveData(){
    try { return navigator.connection && navigator.connection.saveData === true; } catch(_) { return false; }
  }
  function loadGA(){
    var script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-132SN84E79';
    script.async = true;
    document.head.appendChild(script);
    gtag('js', new Date());
    gtag('config', 'G-132SN84E79', { anonymize_ip: true, transport_type: 'beacon' });
  }
  (function(){
    var interacted = false; var loaded = false;
    function removeListeners(){
      document.removeEventListener('pointerdown', onInteract);
      document.removeEventListener('keydown', onInteract);
      document.removeEventListener('touchstart', onInteract);
      window.removeEventListener('scroll', onInteract);
    }
    function loadWhenAllowed(){ if (loaded) return; if (dntEnabled() || saveData()) return; loaded = true; loadGA(); removeListeners(); }
    function onInteract(){ interacted = true; loadWhenAllowed(); }
    document.addEventListener('pointerdown', onInteract, { once: true });
    document.addEventListener('keydown', onInteract, { once: true });
    document.addEventListener('touchstart', onInteract, { once: true, passive: true });
    window.addEventListener('scroll', onInteract, { once: true, passive: true });
    var ric = window.requestIdleCallback || function(fn){ setTimeout(fn, 10000); };
    window.addEventListener('load', function(){ ric(function(){ if (!interacted) loadWhenAllowed(); }); }, { once: true });
  })();
})();