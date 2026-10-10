/* Completa la "Nota del cliente" del checkout con las medidas que cargo el
 * cotizador de cortes (cotizador.js las deja en localStorage). Si el cliente ya
 * escribio algo, se agrega abajo; no se pisa. Despues de usarla, la nota se
 * borra para que no aparezca en la proxima compra.
 */
(function () {
  'use strict';
  var CLAVE_NOTA = 'pda_cortes_nota';
  var nota;
  try { nota = localStorage.getItem(CLAVE_NOTA); } catch (e) { return; }
  if (!nota) return;
  // pagina de compra confirmada: la nota ya viajo con el pedido
  if (/success|confirm|gracias/i.test(location.pathname)) {
    try { localStorage.removeItem(CLAVE_NOTA); } catch (e) {}
    return;
  }
  var texto = 'Cortes a medida:\n' + nota;

  function campo() {
    var c = document.querySelectorAll('textarea');
    for (var i = 0; i < c.length; i++) {
      var t = c[i], s = ((t.name || '') + ' ' + (t.id || '') + ' ' + (t.placeholder || '')).toLowerCase();
      if (/nota|note|coment|observ/.test(s)) return t;
    }
    return c.length === 1 ? c[0] : null;
  }

  function poner(t) {
    if (t.value.indexOf('Cortes a medida:') !== -1) return true;
    var v = (t.value ? t.value + '\n\n' : '') + texto;
    var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(t, v);                                   // para que los formularios React lo registren
    t.dispatchEvent(new Event('input', {bubbles: true}));
    t.dispatchEvent(new Event('change', {bubbles: true}));
    return true;
  }

  // el campo de la nota aparece recien en un paso posterior del checkout:
  // se lo busca mientras la pagina este abierta
  var timer = setInterval(function () {
    var t = campo();
    if (t && poner(t)) clearInterval(timer);
  }, 1000);

  // al confirmar la compra, la nota ya viajo con el pedido
  document.addEventListener('submit', function () { try { localStorage.removeItem(CLAVE_NOTA); } catch (e) {} }, true);
})();
