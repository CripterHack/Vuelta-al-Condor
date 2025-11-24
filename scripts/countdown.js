// Contador regresivo hacia el inicio del evento
(function(){
  const values = {
    days: document.getElementById('countdown-days'),
    hours: document.getElementById('countdown-hours'),
    minutes: document.getElementById('countdown-minutes'),
    seconds: document.getElementById('countdown-seconds')
  };

  function readCountdownTarget(){
    try {
      if (window.VAC && typeof window.VAC.countdownTarget === 'number') {
        return window.VAC.countdownTarget;
      }
    } catch(_){ }
    const el = document.getElementById('countdown-target');
    const attr = el ? Number(el.getAttribute('data-target-ms')) : NaN;
    if (!Number.isNaN(attr)) return attr;
    return new Date('2025-11-29T06:00:00-06:00').getTime();
  }

  const countdownTarget = readCountdownTarget();

  function pad(n){ return String(n).padStart(2, '0'); }

  function evaluateEvent(now){
    try {
      if (window.VAC && typeof window.VAC.evaluateEventState === 'function') {
        window.VAC.evaluateEventState(now);
      }
    } catch(_){ }
  }

  function update(){
    const now = Date.now();
    const distance = countdownTarget - now;
    if (distance <= 0){
      if (values.days) values.days.textContent = '00';
      if (values.hours) values.hours.textContent = '00';
      if (values.minutes) values.minutes.textContent = '00';
      if (values.seconds) values.seconds.textContent = '00';
      evaluateEvent(now);
      return;
    }
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((distance / (1000 * 60)) % 60);
    const seconds = Math.floor((distance / 1000) % 60);
    if (values.days) values.days.textContent = pad(days);
    if (values.hours) values.hours.textContent = pad(hours);
    if (values.minutes) values.minutes.textContent = pad(minutes);
    if (values.seconds) values.seconds.textContent = pad(seconds);
    evaluateEvent(now);
  }

  update();
  setInterval(update, 1000);
  setInterval(function(){ evaluateEvent(Date.now()); }, 30000);
})();
