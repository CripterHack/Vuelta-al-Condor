// Lógica específica de guía: índice colapsable, botón volver y resaltado activo
(function(){
  function onReady(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  onReady(function(){
    var details = document.getElementById('toc');
    if (details) {
      var mq = window.matchMedia('(max-width: 1024px)');
      var apply = function(){ details.open = !mq.matches; };
      try { apply(); mq.addEventListener('change', apply); } catch(_){ }
    }

    var back = document.getElementById('back-to-index');
    if (back) {
      var showAt = 600;
      function onScroll(){ var visible = window.scrollY > showAt; back.classList.toggle('is-visible', visible); }
      window.addEventListener('scroll', onScroll, { passive: true });
      try { onScroll(); } catch(_){ }
      back.addEventListener('click', function(){
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(_) { window.scrollTo(0, 0); }
      });
    }

    // Enlaces inline “Volver al índice” en secciones largas
    try {
      var sections = Array.from(document.querySelectorAll('.guide-section.guide-card'));
      var tocLink = '#toc';
      sections.forEach(function(sec){
        if (sec.classList.contains('guide-toc')) return; // no dentro del bloque índice
        var minHeight = 700;
        var h = sec.offsetHeight;
        if (h >= minHeight) {
          var footer = document.createElement('div');
          footer.className = 'section-footer';
          var a = document.createElement('a');
          a.className = 'button secondary back-inline';
          a.href = tocLink;
          a.textContent = '↑ Volver al índice';
          a.addEventListener('click', function(ev){
            try { ev.preventDefault(); } catch(_){ }
            var d = document.getElementById('toc'); if (d) { d.open = true; }
            var el = document.querySelector('nav[aria-label="Índice de contenidos"]');
            if (el) {
              try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
              catch(_) { el.scrollIntoView(true); }
            } else {
              try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(_) { window.scrollTo(0, 0); }
            }
          });
          footer.appendChild(a);
          sec.appendChild(footer);
        }
      });
    } catch(_){ }

    // Resaltado de la sección activa en el índice mediante IntersectionObserver
    var toc = document.querySelector('nav[aria-label="Índice de contenidos"]');
    if (toc) {
      var links = Array.from(toc.querySelectorAll('a'));
      var ids = links.map(function(a){ return a.getAttribute('href'); })
                     .filter(function(h){ return h && h.indexOf('#')===0; })
                     .map(function(h){ return h.slice(1); });
      var targets = ids.map(function(id){ return document.getElementById(id); }).filter(Boolean);
      function setActive(id){
        links.forEach(function(a){
          var match = a.getAttribute('href') === ('#'+id);
          a.classList.toggle('active', match);
          if (match) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current');
        });
      }
      try {
        var obs = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){ if (entry.isIntersecting) setActive(entry.target.id); });
        }, { rootMargin: '-45% 0px -45% 0px', threshold: 0.01 });
        targets.forEach(function(el){ obs.observe(el); });
      } catch(_){ }
    }
  });
})();