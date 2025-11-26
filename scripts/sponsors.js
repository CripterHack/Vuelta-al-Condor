 (function(){
  const sponsorGrid = document.getElementById('sponsor-grid') || document.querySelector('[data-sponsors-grid]');
  if (!sponsorGrid) return;

  function renderError(msg){
    sponsorGrid.innerHTML = `<p class="muted text-center">${msg}</p>`;
  }
  function renderEmpty(){
    sponsorGrid.innerHTML = `<p class="muted text-center">Pronto anunciaremos a los patrocinadores confirmados.</p>`;
  }

  async function fetchSponsors(){
    try {
      const res = await fetch('/data/sponsors.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0){ renderEmpty(); return; }
      const frag = document.createDocumentFragment();
      list.forEach(s => {
        const hasUrl = typeof s.url === 'string' && s.url.length > 0;
        const card = document.createElement(hasUrl ? 'a' : 'div');
        card.className = 'sponsor-card';
        if (hasUrl){
          card.href = s.url;
          card.target = '_blank';
          card.rel = 'noopener sponsored';
          if (s.cta) card.title = s.cta;
          const label = s.cta ? `${s.cta}` : (s.name || 'Patrocinador');
          card.setAttribute('aria-label', label);
        }
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.setAttribute('fetchpriority', 'low');
        img.alt = s.name ? `Logo ${s.name}` : 'Logo patrocinador';
        img.src = s.logo;
        card.appendChild(img);
        frag.appendChild(card);
      });
      sponsorGrid.innerHTML = '';
      sponsorGrid.appendChild(frag);
    } catch (e) {
      renderError('No fue posible cargar los patrocinadores en este momento.');
    }
  }

  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){ obs.disconnect(); fetchSponsors(); }
    });
  }) : null;

  if (io) io.observe(sponsorGrid); else fetchSponsors();
})();
