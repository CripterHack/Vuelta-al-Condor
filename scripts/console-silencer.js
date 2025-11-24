// Silenciar logs ruidosos durante carga (se restaura luego)
// Muta canales no críticos para reducir ruido de terceros durante el parseo inicial.
(function(){
  var c = window.console || {};
  var noop = function(){};
  window.__consoleOriginal = {
    log: c.log,
    info: c.info,
    debug: c.debug,
    trace: c.trace,
    group: c.group,
    groupCollapsed: c.groupCollapsed,
    groupEnd: c.groupEnd
  };
  c.log = c.info = c.debug = c.trace = noop;
  c.group = c.groupCollapsed = c.groupEnd = noop;
})();