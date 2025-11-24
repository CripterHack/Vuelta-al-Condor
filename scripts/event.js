// Lógica de estado del evento: banner y fuegos artificiales
(function(){
  const eventBanner = document.getElementById('event-banner');
  const fireworksCanvas = document.getElementById('fireworks-canvas');

  const countdownTargetEl = document.getElementById('countdown-target');
  const countdownTarget = countdownTargetEl ? Number(countdownTargetEl.getAttribute('data-target-ms')) : new Date('2025-11-29T06:00:00-06:00').getTime();
  const eventStartMs = countdownTarget;
  const eventEndMs = new Date('2025-11-29T22:00:00-06:00').getTime();
  const thanksSwitchMs = eventStartMs + (20 * 60 * 60 * 1000);

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fwCtx = null, fwParticles = [], fwRunning = false, fwAnimId = 0, fwLastSpawn = 0;

  function fwResize(){
    if (!fireworksCanvas) return;
    const dprCap = prefersReducedMotion ? 1.2 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    fireworksCanvas.width = Math.floor(window.innerWidth * dpr);
    fireworksCanvas.height = Math.floor(window.innerHeight * dpr);
    if (fwCtx) fwCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawnFirework(){
    if (!fwCtx) return;
    const W = window.innerWidth, H = window.innerHeight;
    const cx = Math.random() * W;
    const cy = (0.2 + Math.random() * 0.6) * H;
    const hue = Math.floor(Math.random() * 360);
    const count = 90 + Math.floor(Math.random() * 60);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3.5;
      fwParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        decay: 0.012 + Math.random() * 0.025,
        color: `hsl(${hue}, 100%, ${55 + Math.random()*20}%)`
      });
    }
  }
  function fwStep(ts){
    if (!fwCtx || !fwRunning) return;
    const now = ts || performance.now();
    if (now - fwLastSpawn > 550){ spawnFirework(); fwLastSpawn = now; }
    fwCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    fwCtx.globalCompositeOperation = 'lighter';
    for (let i = fwParticles.length - 1; i >= 0; i--) {
      const p = fwParticles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.985; p.vy *= 0.985; p.vy += 0.02;
      p.alpha -= p.decay;
      if (p.alpha <= 0 || p.y > window.innerHeight + 40) { fwParticles.splice(i, 1); continue; }
      fwCtx.globalAlpha = Math.max(p.alpha, 0);
      fwCtx.fillStyle = p.color;
      fwCtx.beginPath(); fwCtx.arc(p.x, p.y, 2.2, 0, Math.PI*2); fwCtx.fill();
    }
    fwAnimId = requestAnimationFrame(fwStep);
  }
  function startFireworks(){
    if (fwRunning || !fireworksCanvas) return;
    if (prefersReducedMotion || document.visibilityState !== 'visible') return;
    fireworksCanvas.classList.add('is-visible');
    fwCtx = fireworksCanvas.getContext('2d');
    fwParticles = [];
    fwRunning = true;
    fwLastSpawn = performance.now();
    fwResize();
    fwAnimId = requestAnimationFrame(fwStep);
  }
  function stopFireworks(){
    if (!fwRunning) return;
    fwRunning = false;
    fwParticles = [];
    try { cancelAnimationFrame(fwAnimId); } catch(_){ }
    fwAnimId = 0;
    if (fireworksCanvas) fireworksCanvas.classList.remove('is-visible');
  }

  window.addEventListener('resize', fwResize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopFireworks();
    else evaluateEventState(Date.now());
  });

  function showBanner(text, type){
    if (!eventBanner) return;
    eventBanner.textContent = text;
    eventBanner.classList.remove('motivation', 'thanks');
    if (type) eventBanner.classList.add(type);
    eventBanner.hidden = false;
  }
  function hideBanner(){ if (!eventBanner) return; eventBanner.hidden = true; }

  function evaluateEventState(nowTs){
    const now = nowTs || Date.now();
    if (now < eventStartMs){ hideBanner(); stopFireworks(); return; }
    if (now >= eventStartMs && now < eventEndMs){
      showBanner('¡Arrancamos! Hoy rodamos fuerte y con respeto. ¡Ánimo ciclistas y afición!', 'motivation');
      if (!fwRunning) startFireworks();
      return;
    }
    if (now >= thanksSwitchMs){
      showBanner('¡Gracias por ser parte de la Vuelta al Cóndor! Comunidad, respeto y diversidad.', 'thanks');
      stopFireworks(); return;
    }
    showBanner('Gran día de competencia. ¡Recupérate y comparte tu experiencia!', 'motivation');
    stopFireworks();
  }

  // Exponer API
  window.VAC = window.VAC || {};
  // Exponer el objetivo del contador para otros módulos
  window.VAC.countdownTarget = countdownTarget;
  window.VAC.fireworks = { start: startFireworks, stop: stopFireworks };
  window.VAC.evaluateEventState = evaluateEventState;
})();
