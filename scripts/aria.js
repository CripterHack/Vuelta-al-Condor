// Marcar enlaces de navegación activos con aria-current
(function(){
  const links = document.querySelectorAll('.site-nav a[href^="index.html#"], .mobile-nav a[href^="index.html#"]');
  function onScroll(){
    const y = window.scrollY + 100;
    links.forEach(a => {
      const id = a.getAttribute('href').split('#')[1];
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.offsetTop,
            bottom = top + el.offsetHeight;
      const active = y >= top && y < bottom;
      if (active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll, { once: true });
})();