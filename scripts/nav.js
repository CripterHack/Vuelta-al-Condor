// Control de navegación móvil con clase en <body> para evitar estilos inline
(function(){
  const navToggle = document.querySelector('.hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  const focusSelectors = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let focusTrap = null;

  function openNav(){
    if(!navToggle||!mobileNav) return;
    navToggle.setAttribute('aria-expanded','true');
    mobileNav.hidden = false;
    mobileNav.classList.add('open');
    document.body.classList.add('nav-open');
    const focusables = mobileNav.querySelectorAll(focusSelectors);
    if (focusables.length > 0) {
      focusTrap = { first: focusables[0], last: focusables[focusables.length - 1] };
      focusTrap.first.focus();
    }
  }

  function closeNav(){
    if(!navToggle||!mobileNav) return;
    navToggle.setAttribute('aria-expanded','false');
    mobileNav.classList.remove('open');
    mobileNav.hidden = true;
    document.body.classList.remove('nav-open');
    focusTrap = null;
    navToggle.focus();
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      expanded ? closeNav() : openNav();
    });

    mobileNav.addEventListener('click', event => {
      if (event.target instanceof HTMLAnchorElement) {
        closeNav();
      }
    });

    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        closeNav();
      }
      if (focusTrap) {
        if (ev.key === 'Tab') {
          const active = document.activeElement;
          if (ev.shiftKey && active === focusTrap.first) {
            ev.preventDefault(); focusTrap.last.focus();
          } else if (!ev.shiftKey && active === focusTrap.last) {
            ev.preventDefault(); focusTrap.first.focus();
          }
        }
      }
    });
  }
})();