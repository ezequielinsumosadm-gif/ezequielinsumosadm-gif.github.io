/* Ayudantes para manejar el editor nuevo de Tienda Nube (Ipanema) desde la consola.
 * Se cargan con: eval(await fetch('https://ezequielinsumosadm-gif.github.io/tienda/ipanema_editor.js').then(r=>r.text()))
 * El arbol de secciones son [role=treeitem][data-tree-item-id]; los botones de cada fila
 * (Ocultar/Mostrar/Duplicar) aparecen recien con mouseover; los campos del panel derecho
 * estan a la derecha de x=1200 y son React (hay que usar el setter nativo).
 */
(function () {
  var w = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var der = function (e) { return e.getBoundingClientRect().left > 1200; };
  window.__w = w;
  window.__items = function () {
    return [].map.call(document.querySelectorAll('[role=treeitem]'), function (t, i) {
      return i + ' L' + t.getAttribute('aria-level') + ' ' + t.getAttribute('aria-expanded') + ' ' + t.dataset.treeItemId + ' :: ' + t.innerText.replace(/\s+/g, ' ').trim().slice(0, 40);
    });
  };
  window.__ti = function (id) { return document.querySelector('[role=treeitem][data-tree-item-id="' + id + '"]'); };
  window.__hijos = function (pref) {
    return [].map.call(document.querySelectorAll('[role=treeitem]'), function (t) { return t.dataset.treeItemId; })
      .filter(function (id) { return id.indexOf(pref) === 0; });
  };
  window.__arriba = function () {
    var n = 0;
    document.querySelectorAll('*').forEach(function (e) { if (e.scrollTop > 0 && der(e)) { e.scrollTop = 0; n++; } });
    return n;
  };
  window.__abrir = async function (id) {
    var t = window.__ti(id);
    if (t && t.getAttribute('aria-expanded') === 'false') { t.querySelector('button').click(); await w(700); }
    return !!t;
  };
  window.__sel = async function (id) {
    var t = window.__ti(id);
    if (!t) return 'no ' + id;
    t.scrollIntoView({block: 'center'}); t.click(); await w(1500); window.__arriba();
    return t.innerText.replace(/\s+/g, ' ');
  };
  var hover = async function (t) {
    ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove'].forEach(function (ev) {
      t.dispatchEvent(new MouseEvent(ev, {bubbles: true}));
    });
    await w(300);
  };
  window.__ocultar = async function (id) {
    var t = window.__ti(id); if (!t) return 'no ' + id;
    await hover(t); var b = t.querySelector('button[title=Ocultar]');
    if (!b) return 'ya oculto ' + id; b.click(); await w(500); return 'oculto ' + id;
  };
  window.__mostrar = async function (id) {
    var t = window.__ti(id); if (!t) return 'no ' + id;
    await hover(t); var b = t.querySelector('button[title=Mostrar]');
    if (!b) return 'ya visible ' + id; b.click(); await w(500); return 'visible ' + id;
  };
  window.__duplicar = async function (id) {
    var t = window.__ti(id); if (!t) return 'no ' + id;
    await hover(t); t.querySelector('button[title=Duplicar]').click(); await w(1200); return 'ok';
  };
  window.__mover = async function (srcId, dstId) {
    var src = window.__ti(srcId), dst = window.__ti(dstId), dt = new DataTransfer();
    var r = dst.getBoundingClientRect(), rs = src.getBoundingClientRect();
    var ev = function (el, type, x, y) { el.dispatchEvent(new DragEvent(type, {bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y})); };
    ev(src, 'dragstart', rs.x + 40, rs.y + 10); await w(100);
    ev(dst, 'dragenter', r.x + 40, r.y + 4);
    for (var i = 0; i < 5; i++) { ev(dst, 'dragover', r.x + 40, r.y + 4); await w(60); }
    ev(dst, 'drop', r.x + 40, r.y + 4); ev(src, 'dragend', r.x + 40, r.y + 4); await w(800);
  };
  window.__textoPanel = function () {
    var r = [].filter.call(document.querySelectorAll('*'), function (e) { return der(e) && e.children.length === 0 && e.innerText && e.offsetParent; })
      .map(function (e) { return e.innerText.trim(); }).filter(Boolean);
    return Array.from(new Set(r)).join(' | ').slice(0, 1500);
  };
  window.__panel = function () {
    return [].filter.call(document.querySelectorAll('img'), der).map(function (i) { return (i.src.split('/media/')[1] || '').split('/')[0]; });
  };
  window.__inputs = function () { return [].filter.call(document.querySelectorAll('input[type=text]'), der); };
  window.__setInp = async function (n, val) {
    var i = window.__inputs()[n];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, val);
    i.dispatchEvent(new Event('input', {bubbles: true})); i.dispatchEvent(new Event('change', {bubbles: true}));
    i.blur(); i.dispatchEvent(new Event('focusout', {bubbles: true})); await w(400);
    return window.__inputs()[n].value;
  };
  window.__setNum = async function (n, val) {
    var i = [].filter.call(document.querySelectorAll('input[type=number]'), der)[n];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, String(val));
    i.dispatchEvent(new Event('input', {bubbles: true})); i.dispatchEvent(new Event('change', {bubbles: true})); i.blur(); await w(400);
    return i.value;
  };
  window.__selTexto = function (n) {
    var eds = [].filter.call(document.querySelectorAll('[contenteditable=true]'), der), ed = eds[n || 0];
    if (!ed) return null;
    ed.focus(); var r = document.createRange(); r.selectNodeContents(ed);
    var s = getSelection(); s.removeAllRanges(); s.addRange(r); return ed;
  };
  window.__texto = async function (val, n) {
    var ed = window.__selTexto(n); if (!ed) return 'sin editor';
    document.execCommand('insertText', false, val); await w(400); return ed.innerText;
  };
  window.__select = async function (n, val) {
    var s = [].filter.call(document.querySelectorAll('select'), der)[n];
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, val);
    s.dispatchEvent(new Event('change', {bubbles: true})); await w(500); return s.value;
  };
  window.__boton = function (texto) {
    var b = [].filter.call(document.querySelectorAll('button'), function (b) { return b.innerText.trim() === texto && b.offsetParent; });
    return b[b.length - 1];
  };
  window.__guardar = async function () { var b = window.__boton('Guardar'); if (b && !b.disabled) { b.click(); await w(3500); return 'guardado'; } return 'sin cambios'; };
  window.__switch = async function (etiqueta, valor) {
    var lab = [].find.call(document.querySelectorAll('*'), function (e) { return der(e) && e.children.length === 0 && e.innerText && e.innerText.trim() === etiqueta; });
    if (!lab) return 'no ' + etiqueta;
    var c = lab.parentElement, sw = null;
    for (var i = 0; i < 4 && !sw; i++) { sw = c.querySelector('[role=switch], input[type=checkbox]'); c = c.parentElement; }
    if (!sw) return 'sin switch ' + etiqueta;
    var on = sw.getAttribute('aria-checked') === 'true' || sw.checked === true;
    if (on !== valor) { sw.click(); await w(500); }
    return etiqueta + '=' + valor;
  };
  window.__opcion = async function (etiqueta) {
    var b = [].find.call(document.querySelectorAll('button,[role=radio],label'), function (e) { return der(e) && e.innerText && e.innerText.trim() === etiqueta; });
    if (!b) return 'no ' + etiqueta; b.click(); await w(500); return 'ok ' + etiqueta;
  };
})();
