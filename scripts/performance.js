// Toggle de modo rendimiento; ajusta calidad del fondo fluido y controla fuegos
(function(){
  const perfToggle = document.querySelector('.perf-toggle');
  let perfMode = false;

  function evaluateEventState(){
    // expuesto por scripts/event.js si está presente
    try { if (window.VAC && typeof window.VAC.evaluateEventState === 'function') window.VAC.evaluateEventState(Date.now()); } catch(_){}
  }

  function applyPerfMode(on){
    perfMode = !!on;
    try { localStorage.setItem('vac_perf_mode', perfMode ? 'on' : 'off'); } catch(_){}
    if (perfToggle) perfToggle.setAttribute('aria-pressed', String(perfMode));
    if (perfToggle) {
      const onTitle = 'Modo rendimiento activado: reducir animaciones y uso de GPU';
      const offTitle = 'Modo rendimiento desactivado: apariencia completa';
      perfToggle.title = perfMode ? onTitle : offTitle;
      perfToggle.setAttribute('aria-label', perfMode ? onTitle : offTitle);
    }
    if (window.FluidBG && typeof window.FluidBG.setQualityPreset === 'function'){
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const preset = perfMode ? 'minimal' : (reduced ? 'minimal' : 'high');
      window.FluidBG.setQualityPreset(preset);
    }
    // Notificar a controlador de fuegos
    try { if (window.VAC && window.VAC.fireworks) {
      if (perfMode && typeof window.VAC.fireworks.stop === 'function') window.VAC.fireworks.stop();
    }} catch(_){ }
    evaluateEventState();
  }

  try {
    const saved = localStorage.getItem('vac_perf_mode');
    if (saved === 'on') applyPerfMode(true);
  } catch(_){}

  if (perfToggle) {
    perfToggle.addEventListener('click', () => applyPerfMode(!perfMode));
  }

  // Exponer API mínima
  window.VAC = window.VAC || {};
  window.VAC.performance = { applyPerfMode };
})();