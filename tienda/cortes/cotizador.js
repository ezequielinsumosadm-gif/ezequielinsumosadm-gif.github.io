/* Cotizador de cortes a medida para la Tienda Nube de PerfilesdeAluminio.net.
 *
 * Lo carga la app "Sincro Zeus" (portal de socios -> Scripts) en toda la tienda.
 * Solo se muestra en las fichas de los perfiles que figuran en CONFIG
 * (estructurales y disipadores) y no depende del JS del tema: arma su propio
 * bloque y agrega al carrito con el mismo POST que usa la ficha (/comprar/).
 *
 * La cuenta es la de la tienda actual (verificada contra el sitio):
 *   mm a cobrar = redondeo ARRIBA al medio metro, minimo 1000 mm, por renglon
 *   total       = mm * precio_por_mm + piezas * precio del corte
 * En el carrito entra como productos comunes:
 *   N x "Corte a medida · Material", variante del perfil (N = mm cobrados / 500)
 *   M x "Corte a medida · Servicio de corte", variante Manual / Precision
 * y el detalle de medidas queda guardado para la "Nota del cliente" del
 * checkout (checkout.js la completa sola).
 */
(function () {
  'use strict';
  var CONFIG_URL = 'https://ezequielinsumosadm-gif.github.io/tienda/cortes/config.json';
  var CLAVE_NOTA = 'pda_cortes_nota';
  var LARGO_MIN = 40, LARGO_MAX = 2500;

  function money(v) { return '$ ' + Math.round(v).toLocaleString('es-AR'); }
  function nf(v, d) { return v.toLocaleString('es-AR', {minimumFractionDigits: d, maximumFractionDigits: d}); }

  function idProducto() {
    var f = document.querySelector('form#product_form input[name="add_to_cart"], form.js-product-form input[name="add_to_cart"]');
    return f ? String(f.value) : null;
  }

  function cotizar(pm, largo, cant, precioCorte) {
    var util = cant * largo;
    var mm = util <= 1000 ? 1000 : Math.ceil(util / 500) * 500;
    return {util: util, mm: mm, material: mm * pm / 1000, cortes: cant * precioCorte};
  }

  var CSS = '' +
    '.pda-cot{margin:22px 0;border:1px solid #dde4ee;border-radius:10px;overflow:hidden;font-family:inherit;color:#122340;background:#fff}' +
    '.pda-cot__cab{background:#122340;color:#fff;padding:14px 16px;background-image:linear-gradient(rgba(45,196,222,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(45,196,222,.1) 1px,transparent 1px);background-size:24px 24px}' +
    '.pda-cot__eye{font:600 11px/1 monospace;letter-spacing:.12em;text-transform:uppercase;color:#2DC4DE}' +
    '.pda-cot__tit{font-size:19px;font-weight:700;margin:6px 0 2px}' +
    '.pda-cot__sub{font-size:13px;color:#b9c6da}' +
    '.pda-cot__cuerpo{padding:14px 16px}' +
    '.pda-cot table{width:100%;border-collapse:collapse}' +
    '.pda-cot th{font:600 11px monospace;text-transform:uppercase;letter-spacing:.06em;color:#6a7890;text-align:left;padding:0 4px 6px}' +
    '.pda-cot td{padding:4px}' +
    '.pda-cot input,.pda-cot select{width:100%;padding:8px;border:1px solid #dde4ee;border-radius:6px;font:inherit;background:#f6f8fb;color:#122340}' +
    '.pda-cot .pda-num{font:500 13px monospace;text-align:right;white-space:nowrap}' +
    '.pda-cot__mas{margin-top:8px;background:none;border:1px dashed #1578DD;color:#1578DD;padding:8px 12px;border-radius:6px;cursor:pointer;font:600 13px inherit}' +
    '.pda-cot__x{background:none;border:0;color:#6a7890;cursor:pointer;font-size:18px}' +
    '.pda-cot__res{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid #dde4ee}' +
    '.pda-cot__total{font-size:26px;font-weight:700}' +
    '.pda-cot__det{font:12.5px/1.5 monospace;color:#3d4c64}' +
    '.pda-cot__aviso{font-size:12.5px;color:#c26a00;margin-top:8px}' +
    '.pda-cot__btn{background:#2DC4DE;color:#122340;border:0;border-radius:999px;padding:12px 20px;font-weight:700;cursor:pointer}' +
    '.pda-cot__btn[disabled]{opacity:.5;cursor:default}' +
    '.pda-cot__reglas{font-size:12px;color:#6a7890;margin-top:10px;line-height:1.5}';

  function montar(cfg, p) {
    var form = document.querySelector('form#product_form, form.js-product-form');
    if (!form || document.querySelector('.pda-cot')) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var caja = document.createElement('section');
    caja.className = 'pda-cot';
    caja.innerHTML =
      '<div class="pda-cot__cab"><div class="pda-cot__eye">Corte a medida</div>' +
      '<div class="pda-cot__tit">Pedilo cortado al largo que necesitás</div>' +
      '<div class="pda-cot__sub">' + money(p.pm) + ' por metro · de ' + LARGO_MIN + ' a ' + LARGO_MAX + ' mm</div></div>' +
      '<div class="pda-cot__cuerpo"><table><thead><tr><th>Largo (mm)</th><th>Cant.</th><th>Corte</th><th style="text-align:right">Subtotal</th><th></th></tr></thead>' +
      '<tbody class="pda-filas"></tbody></table>' +
      '<button type="button" class="pda-cot__mas">+ Agregar otro corte</button>' +
      '<div class="pda-cot__res"><div><div class="pda-cot__total">$ 0</div><div class="pda-cot__det"></div></div>' +
      '<button type="button" class="pda-cot__btn">Agregar cortes al carrito</button></div>' +
      '<div class="pda-cot__aviso" hidden></div>' +
      '<div class="pda-cot__reglas">Se cobra por medio metro, redondeando para arriba, con un mínimo de 1 metro por medida. ' +
      'Corte manual ' + money(cfg.corte.manual.precio) + ' (±3 mm) · de precisión ' + money(cfg.corte.precision.precio) + ' (±0,01 mm). ' +
      'Entrega a los 5 días hábiles. En el carrito te dejamos las medidas listas para copiar en la nota del pedido.</div></div>';
    form.parentNode.insertBefore(caja, form.nextSibling);

    var filas = [{largo: 500, cant: 1, tipo: 'manual'}];
    var tb = caja.querySelector('.pda-filas');

    function pintar() {
      tb.innerHTML = filas.map(function (f, i) {
        return '<tr><td><input type="number" min="' + LARGO_MIN + '" max="' + LARGO_MAX + '" value="' + f.largo + '" data-k="largo" data-i="' + i + '" aria-label="Largo en mm"></td>' +
          '<td style="width:70px"><input type="number" min="1" value="' + f.cant + '" data-k="cant" data-i="' + i + '" aria-label="Cantidad"></td>' +
          '<td style="width:120px"><select data-k="tipo" data-i="' + i + '" aria-label="Tipo de corte">' +
          '<option value="manual"' + (f.tipo === 'manual' ? ' selected' : '') + '>Manual</option>' +
          '<option value="precision"' + (f.tipo === 'precision' ? ' selected' : '') + '>Precisión</option></select></td>' +
          '<td class="pda-num" data-st="' + i + '"></td>' +
          '<td><button type="button" class="pda-cot__x" data-q="' + i + '" aria-label="Quitar"' + (filas.length < 2 ? ' disabled' : '') + '>×</button></td></tr>';
      }).join('');
      calcular();
    }

    var ultimo = null;
    function calcular() {
      var mm = 0, util = 0, material = 0, cortes = 0, nMan = 0, nPre = 0, malos = 0, notas = [];
      filas.forEach(function (f, i) {
        var td = tb.querySelector('[data-st="' + i + '"]');
        if (!(f.largo >= LARGO_MIN && f.largo <= LARGO_MAX && f.cant >= 1)) { td.textContent = LARGO_MIN + '–' + LARGO_MAX + ' mm'; malos++; return; }
        var c = cotizar(p.pm, f.largo, f.cant, cfg.corte[f.tipo].precio);
        td.textContent = money(c.material + c.cortes);
        mm += c.mm; util += c.util; material += c.material; cortes += c.cortes;
        if (f.tipo === 'manual') nMan += f.cant; else nPre += f.cant;
        notas.push(f.cant + ' x ' + f.largo + ' mm (' + (f.tipo === 'manual' ? 'manual' : 'precisión') + ')');
      });
      caja.querySelector('.pda-cot__total').textContent = money(material + cortes);
      caja.querySelector('.pda-cot__det').innerHTML = nf(util / 1000, 2) + ' m útiles · se cobran ' + nf(mm / 1000, 2) + ' m<br>' +
        'material ' + money(material) + ' + cortes ' + money(cortes);
      var av = caja.querySelector('.pda-cot__aviso');
      av.hidden = !(mm > util);
      av.textContent = mm > util ? 'Estás pagando ' + nf((mm - util) / 1000, 2) + ' m de recorte por el redondeo al medio metro.' : '';
      caja.querySelector('.pda-cot__btn').disabled = malos > 0 || !notas.length;
      ultimo = {bloques: mm / 500, nMan: nMan, nPre: nPre, nota: p.nombre + ': ' + notas.join(', ')};
    }

    tb.addEventListener('input', function (e) {
      var t = e.target, i = +t.dataset.i;
      if (!t.dataset.k) return;
      filas[i][t.dataset.k] = t.dataset.k === 'tipo' ? t.value : +t.value;
      calcular();
    });
    tb.addEventListener('change', function (e) { if (e.target.dataset.k === 'tipo') { filas[+e.target.dataset.i].tipo = e.target.value; calcular(); } });
    tb.addEventListener('click', function (e) {
      var q = e.target.dataset && e.target.dataset.q;
      if (q !== undefined && filas.length > 1) { filas.splice(+q, 1); pintar(); }
    });
    caja.querySelector('.pda-cot__mas').addEventListener('click', function () { filas.push({largo: 500, cant: 1, tipo: 'manual'}); pintar(); });

    function agregar(idProd, cantidad, valor) {
      var fd = new FormData();
      fd.append('add_to_cart', idProd);
      if (valor) fd.append('variation[0]', valor);       // la variante: el perfil o el tipo de corte
      fd.append('quantity', String(cantidad));
      return fetch('/comprar/', {method: 'POST', body: fd, credentials: 'same-origin'});
    }

    caja.querySelector('.pda-cot__btn').addEventListener('click', function () {
      var b = this, x = ultimo;
      if (!x) return;
      b.disabled = true; b.textContent = 'Agregando…';
      var pasos = [[cfg.material.producto, x.bloques, p.valor]];
      if (x.nMan) pasos.push([cfg.corte.manual.producto, x.nMan, cfg.corte.manual.valor]);
      if (x.nPre) pasos.push([cfg.corte.precision.producto, x.nPre, cfg.corte.precision.valor]);
      // la nota se acumula: se pueden cotizar varios perfiles en la misma compra
      try {
        var prev = localStorage.getItem(CLAVE_NOTA);
        localStorage.setItem(CLAVE_NOTA, (prev ? prev + '\n' : '') + x.nota);
      } catch (e) {}
      pasos.reduce(function (pr, s) { return pr.then(function () { return agregar(s[0], s[1], s[2]); }); }, Promise.resolve())
        .then(function () { window.location.href = '/comprar/'; })
        .catch(function () { b.disabled = false; b.textContent = 'No se pudo agregar. Probá de nuevo'; });
    });

    pintar();
  }

  /* En el carrito: las medidas listas para copiar en la "Nota del cliente".
   * El checkout de Tienda Nube no acepta scripts que toquen sus campos (solo
   * NubeSDK, sin acceso a la nota), asi que se las damos al cliente aca, con
   * un boton para copiarlas y otro para mandarlas por WhatsApp. */
  var WHATSAPP = '5491140458668';
  var CSS_CARRITO = '' +
    '.pda-med{margin:0 0 16px;border:1px solid #2DC4DE;border-radius:10px;overflow:hidden;color:#122340;background:#fff;text-align:left}' +
    '.pda-med__cab{background:#122340;color:#fff;padding:10px 14px;font-weight:700;font-size:15px}' +
    '.pda-med__cab span{display:block;font:600 11px monospace;letter-spacing:.12em;text-transform:uppercase;color:#2DC4DE;margin-bottom:3px}' +
    '.pda-med__txt{margin:0;padding:10px 14px;font:13px/1.5 monospace;white-space:pre-wrap;background:#f6f8fb}' +
    '.pda-med__pie{padding:10px 14px;font-size:13px;line-height:1.45}' +
    '.pda-med__btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}' +
    '.pda-med__btns button,.pda-med__btns a{flex:1 1 140px;text-align:center;border-radius:999px;padding:9px 12px;font-weight:700;font-size:13px;cursor:pointer;text-decoration:none}' +
    '.pda-med__copiar{background:#2DC4DE;color:#122340;border:0}' +
    '.pda-med__wa{background:#fff;color:#1578DD;border:1px solid #1578DD}';

  function carrito() {
    if (!/^\/comprar\/?$/.test(location.pathname)) return false;
    var nota;
    try { nota = localStorage.getItem(CLAVE_NOTA); } catch (e) { return true; }
    if (!nota || document.querySelector('.pda-med')) return true;
    var boton = document.getElementById('go-to-checkout');
    if (!boton) return true;
    // si ya no quedan cortes en el carrito, las medidas viejas no sirven
    if (document.body.innerText.indexOf('Corte a medida') === -1) {
      try { localStorage.removeItem(CLAVE_NOTA); } catch (e) {}
      return true;
    }
    var texto = 'Cortes a medida:\n' + nota;
    var st = document.createElement('style'); st.textContent = CSS_CARRITO; document.head.appendChild(st);
    var caja = document.createElement('div');
    caja.className = 'pda-med';
    caja.innerHTML = '<div class="pda-med__cab"><span>Corte a medida</span>Tus medidas</div>' +
      '<pre class="pda-med__txt"></pre>' +
      '<div class="pda-med__pie">Al finalizar la compra, <b>pegalas en "Nota del cliente"</b> para que cortemos cada pieza a la medida. ' +
      'Si preferís, mandánoslas por WhatsApp.' +
      '<div class="pda-med__btns"><button type="button" class="pda-med__copiar">Copiar medidas</button>' +
      '<a class="pda-med__wa" target="_blank" rel="noopener">Enviar por WhatsApp</a></div></div>';
    caja.querySelector('.pda-med__txt').textContent = texto;
    caja.querySelector('.pda-med__wa').href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hola! Hice un pedido en la tienda con estos cortes:\n' + texto);
    var copiar = caja.querySelector('.pda-med__copiar');
    copiar.addEventListener('click', function () {
      function listo() { copiar.textContent = 'Copiadas ✓'; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(listo, listo);
      else {
        var ta = document.createElement('textarea'); ta.value = texto; document.body.appendChild(ta);
        ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); listo();
      }
    });
    boton.parentNode.insertBefore(caja, boton);
    return true;
  }

  function iniciar() {
    if (carrito()) return;
    var id = idProducto();
    if (!id) return;
    fetch(CONFIG_URL, {cache: 'no-cache'}).then(function (r) { return r.json(); }).then(function (cfg) {
      var p = cfg.perfiles && cfg.perfiles[id];
      if (p) montar(cfg, p);
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
