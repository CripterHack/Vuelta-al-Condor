// Restaurar consola tras carga completa
window.addEventListener('load', function(){
  try {
    var c = window.console || {};
    var o = window.__consoleOriginal;
    if (o) {
      c.log = o.log;
      c.info = o.info;
      c.debug = o.debug;
      c.trace = o.trace;
      c.group = o.group;
      c.groupCollapsed = o.groupCollapsed;
      c.groupEnd = o.groupEnd;
    }
    window.__consoleOriginal = null;
  } catch (_) {
    // intencionalmente silencioso
  }
}, { once: true });