/* Cotizador de cortes a medida para la Tienda Nube de PerfilesdeAluminio.net.
 *
 * Lo carga la app "Sincro Zeus" (portal de socios -> Scripts) en toda la tienda.
 * Solo se muestra en las fichas de los perfiles que figuran en CONFIG
 * (estructurales y disipadores) y no depende del JS del tema: arma su propio
 * bloque y agrega al carrito con el mismo POST que usa la ficha (/comprar/).
 *
 * Copia el cotizador de la tienda vieja (tienda.perfilesdealuminio.net,
 * helper AgregarCorteCarrito + producto/index.phtml): boton "Corte a medida"
 * junto a la ficha que abre un panel de dos columnas; a la izquierda los pasos,
 * la entrega y el "Costo calculado"; a la derecha largo, tipo de corte (tarjetas),
 * acabado y cantidad. Se agrega una medida por vez y se repite por cada corte.
 *
 * La cuenta es la de la tienda vieja:
 *   mm a cobrar = cant x largo; minimo 1000 mm, si no redondeo ARRIBA al medio metro
 *   total       = mm * precio_por_mm + piezas * precio del corte
 * En el carrito entra como productos comunes:
 *   N x "Corte a medida · Material", variante del perfil (N = mm cobrados / 500)
 *   M x "Corte a medida · Servicio de corte", variante Manual / Precision
 * y las medidas se juntan para el carrito (copiar / WhatsApp) y la planilla.
 */
(function () {
  'use strict';
  var CONFIG_URL = 'https://ezequielinsumosadm-gif.github.io/tienda/cortes/config.json';
  var CLAVE_NOTA = 'pda_cortes_nota';
  var LARGO_MIN = 40, LARGO_MAX = 2500;
  var ENTREGA = 'El pedido se entrega a los 5 días hábiles de haber concretado la compra.';

  function money(v) { return Math.round(v).toLocaleString('es-AR'); }
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

  // mira (crosshairs) dibujada: no depende de que el tema traiga FontAwesome
  var MIRA = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="8"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6"/></svg>';
  var FLECHA = '<svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true"><path d="M3 1l5 4-5 4z" fill="currentColor"/></svg>';
  var RELOJ = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>';

  var CSS = '' +
    '.pda-tog{display:inline-flex;align-items:center;gap:6px;margin:4px 0 12px;padding:7px 14px;border:0;border-radius:4px;cursor:pointer;' +
      'background:linear-gradient(90deg,#1578DD 0%,#2DC4DE 100%);color:#fff;font:700 14px/1.2 inherit;font-family:inherit}' +
    '.pda-tog svg{transition:transform .3s}.pda-tog:hover svg,.pda-tog[aria-expanded="true"] svg{transform:rotate(180deg)}' +
    '.pda-cot{clear:both;width:100%;box-sizing:border-box;margin:24px 0;padding:28px 16px 40px;background:#f4f6f9;color:#122340;font-family:inherit;text-align:left;scroll-margin-top:140px}' +
    '.pda-cot[hidden]{display:none}' +
    '.pda-cot *{box-sizing:border-box}' +
    '.pda-cot__in{max-width:1140px;margin:0 auto;display:flex;flex-wrap:wrap;background:#fff;border:1px solid #e3e8ef;border-radius:6px;overflow:hidden}' +
    '.pda-cot__info,.pda-cot__form{flex:1 1 360px;padding:32px}' +
    '.pda-cot__info{display:flex;flex-direction:column}' +
    '.pda-cot__tit{display:flex;align-items:center;gap:8px;margin:0 0 14px;font-size:24px;font-weight:700;color:#1578DD}' +
    '.pda-cot__tit svg{width:22px;height:22px;color:#2DC4DE}' +
    '.pda-cot__pasos{list-style:none;margin:0 0 16px;padding:0}' +
    '.pda-cot__pasos li{display:flex;align-items:center;gap:8px;margin:0 0 7px;font-size:15px;color:#3d4c64}' +
    '.pda-cot__pasos li svg{color:#1578DD;flex:none}' +
    '.pda-cot__pasos li:last-child{font-weight:700;color:#122340}' +
    '.pda-cot__entrega{display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:5px;background:#e6f4fb;color:#0d5a85;font-size:14px}' +
    '.pda-cot__pie{flex-grow:1;display:flex;flex-direction:column;justify-content:flex-end;margin-top:28px}' +
    '.pda-cot__ptit{font-weight:700;color:#122340}' +
    '.pda-cot__precio{font-size:38px;font-weight:700;color:#1578DD;line-height:1.15}' +
    '.pda-cot__det{font:13px/1.5 monospace;color:#6a7890;margin-top:2px}' +
    '.pda-cot__aviso{font-size:13px;color:#b25e00;margin-top:4px}' +
    '.pda-cot__btn{display:inline-block;margin-top:18px;padding:13px 26px;border:0;border-radius:4px;cursor:pointer;background:#122340;color:#fff;font:700 15px inherit;font-family:inherit;text-decoration:none;text-align:center}' +
    '.pda-cot__btn:hover{background:#1578DD;color:#fff}' +
    '.pda-cot__btn[disabled]{opacity:.55;cursor:default}' +
    '.pda-cot__btn--sec{background:#fff;color:#122340;border:1px solid #122340;margin-right:8px}' +
    '.pda-cot__ok{margin-top:18px;font-size:15px}.pda-cot__ok b{color:#1578DD}' +
    '.pda-cot__err{margin-top:24px;padding:12px 16px;border-radius:5px;background:#fdecec;color:#a12020;font-size:14px}' +
    '.pda-cot__err ul{margin:0;padding:0;list-style:none}' +
    '.pda-cot__form{color:#fff;background:linear-gradient(135deg,#122340 0%,#1578DD 100%)}' +
    '.pda-cot__form h4{margin:0 0 8px;font-size:17px;font-weight:700;color:#fff}' +
    '.pda-cot__form h4 small{font-weight:400;opacity:.8}' +
    '.pda-cot__campo{margin-bottom:22px}' +
    '.pda-cot__campo>small{display:block;margin-top:5px;font-size:12.5px;opacity:.85}' +
    '.pda-cot__form input[type=number],.pda-cot__form select{width:100%;padding:10px 12px;border:0;border-radius:4px;background:#fff;color:#122340;font:16px inherit;font-family:inherit}' +
    '.pda-cot__tipos{display:flex;flex-wrap:wrap;gap:12px}' +
    '.pda-cot__tipos label{flex:1 1 150px;display:block;padding:11px 12px;border:2px solid transparent;border-radius:6px;cursor:pointer;background:rgba(255,255,255,.9);color:#122340;box-shadow:0 0 10px rgba(0,0,0,.1);transition:.3s}' +
    '.pda-cot__tipos label:hover{box-shadow:0 0 14px rgba(255,255,255,.4)}' +
    '.pda-cot__tipos input{position:absolute;opacity:0;pointer-events:none}' +
    '.pda-cot__tipos input:checked+label{background:#fff;border-color:#2DC4DE}' +
    '.pda-cot__tipos input:focus-visible+label{outline:2px solid #2DC4DE;outline-offset:2px}' +
    '.pda-cot__tipos strong{display:block;font-size:15px}.pda-cot__tipos strong span{color:#1578DD}' +
    '.pda-cot__tipos small{display:block;margin-top:2px;font-size:12.5px;color:#3d4c64}' +
    '@media (max-width:767px){.pda-cot{padding:16px 0 24px}.pda-cot__info,.pda-cot__form{padding:22px 18px}' +
      '.pda-cot__info{order:2}.pda-cot__tit{font-size:21px}.pda-cot__precio{font-size:32px}}';

  function montar(cfg, p) {
    var form = document.querySelector('form#product_form, form.js-product-form');
    if (!form || document.querySelector('.pda-cot')) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    var acabados = (p.acabados && p.acabados.length) ? p.acabados : [{id: 'Natural', nombre: 'Natural'}];
    var pasos = ['Completá el largo personalizado', 'Elegí un tipo de corte', 'Elegí el acabado del perfil',
      'Definí la cantidad de piezas', 'Repetí este proceso por cada corte que necesites'];

    // el boton va arriba del formulario de la ficha, como en la tienda vieja
    var tog = document.createElement('button');
    tog.type = 'button'; tog.className = 'pda-tog';
    tog.setAttribute('aria-expanded', 'false'); tog.setAttribute('aria-controls', 'pda-cotizador');
    tog.innerHTML = MIRA + '<span>Corte a medida</span>';
    form.parentNode.insertBefore(tog, form);

    var caja = document.createElement('section');
    caja.className = 'pda-cot'; caja.id = 'pda-cotizador'; caja.hidden = true;
    caja.innerHTML =
      '<div class="pda-cot__in">' +
        '<div class="pda-cot__info">' +
          '<h3 class="pda-cot__tit">' + MIRA + 'Cotizador de corte</h3>' +
          '<ul class="pda-cot__pasos">' + pasos.map(function (t) { return '<li>' + FLECHA + t + '</li>'; }).join('') + '</ul>' +
          '<div class="pda-cot__entrega">' + RELOJ + ENTREGA + '</div>' +
          '<div class="pda-cot__pie">' +
            '<div class="pda-cot__calc">' +
              '<div class="pda-cot__ptit">Costo calculado</div>' +
              '<div class="pda-cot__precio">$ <span class="pda-cot__num">0</span></div>' +
              '<div class="pda-cot__det"></div><div class="pda-cot__aviso" hidden></div>' +
              '<div class="pda-cot__acc"><button type="button" class="pda-cot__btn pda-cot__agregar">Agregar al carrito</button></div>' +
              '<div class="pda-cot__ok" hidden><b>✓ Se agregó el corte al carrito.</b><br>' +
                '<button type="button" class="pda-cot__btn pda-cot__btn--sec pda-cot__seguir">Cotizar otro corte</button>' +
                '<a class="pda-cot__btn" href="/comprar/">Pasar por caja</a></div>' +
            '</div>' +
            '<div class="pda-cot__err" hidden><ul></ul></div>' +
          '</div>' +
        '</div>' +
        '<div class="pda-cot__form">' +
          '<div class="pda-cot__campo"><h4 title="El costo mínimo por corte se calcula en base a un mínimo de 1 m">Largo personalizado <small>(mm)</small></h4>' +
            '<input type="number" class="pda-cot__largo" value="' + LARGO_MIN + '" min="' + LARGO_MIN + '" max="' + LARGO_MAX + '" inputmode="numeric" aria-label="Largo en milímetros">' +
            '<small>Largo mínimo ' + LARGO_MIN + ' mm | Largo máximo ' + LARGO_MAX + ' mm · se cobra mínimo 1 metro</small></div>' +
          '<div class="pda-cot__campo"><h4>Tipo de corte</h4><div class="pda-cot__tipos">' +
            '<input type="radio" name="pda-tipo" value="manual" id="pda-tipo-manual" checked>' +
            '<label for="pda-tipo-manual"><strong>Manual - <span>$' + money(cfg.corte.manual.precio) + '</span></strong><small>(+/- 3 mm de tolerancia)</small></label>' +
            '<input type="radio" name="pda-tipo" value="precision" id="pda-tipo-precision">' +
            '<label for="pda-tipo-precision"><strong>De Precisión - <span>$' + money(cfg.corte.precision.precio) + '</span></strong><small>(+/- 0,01 mm de tolerancia)</small></label>' +
          '</div></div>' +
          '<div class="pda-cot__campo"><h4>Acabado</h4><select class="pda-cot__acabado" aria-label="Acabado">' +
            acabados.map(function (a) { return '<option value="' + a.id + '">' + a.nombre + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="pda-cot__campo"><h4>Cantidad</h4><input type="number" class="pda-cot__cant" value="1" min="1" inputmode="numeric" aria-label="Cantidad de piezas"></div>' +
        '</div>' +
      '</div>';

    // a todo el ancho, debajo de la ficha (fila de foto + datos); si no la encuentra, debajo del formulario
    var fila = form.closest('#single-product .row, .js-product-detail .row, [data-store^="product-info"] .row, .row');
    var ancla = fila && fila.parentNode ? fila : form;
    ancla.parentNode.insertBefore(caja, ancla.nextSibling);

    var $ = function (s) { return caja.querySelector(s); };
    var ultimo = null;

    function calcular() {
      var largo = parseInt($('.pda-cot__largo').value, 10) || 0;
      var cant = parseInt($('.pda-cot__cant').value, 10) || 0;
      var tipo = caja.querySelector('input[name="pda-tipo"]:checked').value;
      var sel = $('.pda-cot__acabado'), ac = acabados[sel.selectedIndex] || acabados[0];
      var errores = [];
      if (cant < 1) errores.push('La cantidad debe ser mayor a 0.');
      if (!(largo >= LARGO_MIN && largo <= LARGO_MAX)) errores.push('El largo debe ser mayor a ' + LARGO_MIN + ' mm y menor a ' + LARGO_MAX + ' mm.');
      $('.pda-cot__calc').hidden = errores.length > 0;
      $('.pda-cot__err').hidden = !errores.length;
      $('.pda-cot__err ul').innerHTML = errores.map(function (e) { return '<li>- ' + e + '</li>'; }).join('');
      if (errores.length) { ultimo = null; return; }
      // acabado como en la vieja: multiplicador 1 suma un recargo por metro, si no multiplica
      var pm = p.pm;
      if (ac.multiplicador) pm = ac.multiplicador === 1 ? pm + (ac.valorEnPesos || 0) : pm * ac.multiplicador;
      var c = cotizar(pm, largo, cant, cfg.corte[tipo].precio);
      $('.pda-cot__num').textContent = money(c.material + c.cortes);
      $('.pda-cot__det').textContent = cant + ' × ' + largo + ' mm = ' + nf(c.util / 1000, 2) + ' m · se cobran ' + nf(c.mm / 1000, 2) +
        ' m (' + '$' + money(c.material) + ') + ' + cant + ' corte' + (cant > 1 ? 's' : '') + ' ($' + money(c.cortes) + ')';
      var av = $('.pda-cot__aviso');
      av.hidden = !(c.mm > c.util);
      av.textContent = c.mm > c.util ? 'Incluye ' + nf((c.mm - c.util) / 1000, 2) + ' m de recorte por el mínimo de 1 metro y el redondeo al medio metro.' : '';
      ultimo = {bloques: c.mm / 500, tipo: tipo, cant: cant,
        nota: p.nombre + ': ' + cant + ' x ' + largo + ' mm (' + (tipo === 'manual' ? 'manual' : 'precisión') + ')' +
          (ac.nombre && ac.nombre !== 'Natural' ? ' · ' + ac.nombre : '')};
    }

    caja.addEventListener('input', calcular);
    caja.addEventListener('change', calcular);

    function abrir(si) {
      caja.hidden = !si;
      tog.setAttribute('aria-expanded', si ? 'true' : 'false');
      if (si) caja.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
    tog.addEventListener('click', function () { abrir(caja.hidden); });

    function agregar(idProd, cantidad, valor) {
      var fd = new FormData();
      fd.append('add_to_cart', idProd);
      if (valor) fd.append('variation[0]', valor);       // la variante: el perfil o el tipo de corte
      fd.append('quantity', String(cantidad));
      return fetch('/comprar/', {method: 'POST', body: fd, credentials: 'same-origin'}).then(function (r) {
        if (!r.ok) throw new Error(r.status);
      });
    }

    $('.pda-cot__agregar').addEventListener('click', function () {
      var b = this, x = ultimo;
      if (!x) return;
      b.disabled = true; b.textContent = 'Agregando…';
      var pedidos = [[cfg.material.producto, x.bloques, p.valor], [cfg.corte[x.tipo].producto, x.cant, cfg.corte[x.tipo].valor]];
      pedidos.reduce(function (pr, s) { return pr.then(function () { return agregar(s[0], s[1], s[2]); }); }, Promise.resolve())
        .then(function () {
          // las medidas se acumulan: se pueden cotizar varios cortes y perfiles en la misma compra
          try {
            var prev = localStorage.getItem(CLAVE_NOTA);
            localStorage.setItem(CLAVE_NOTA, (prev ? prev + '\n' : '') + x.nota);
          } catch (e) {}
          // y a la planilla de cortes: de ahi salen la nota del pedido y el aviso por mail
          if (cfg.registro) {
            try {
              fetch(cfg.registro, {method: 'POST', mode: 'no-cors', keepalive: true,
                headers: {'Content-Type': 'text/plain;charset=utf-8'},
                body: JSON.stringify({carrito: window.LS && LS.cart && LS.cart.id, perfil: p.valor, bloques: x.bloques,
                                      manual: x.tipo === 'manual' ? x.cant : 0, precision: x.tipo === 'precision' ? x.cant : 0,
                                      medidas: x.nota})});
            } catch (e) {}
          }
          $('.pda-cot__acc').hidden = true; $('.pda-cot__ok').hidden = false;
          b.disabled = false; b.textContent = 'Agregar al carrito';
        })
        .catch(function () { b.disabled = false; b.textContent = 'No se pudo agregar. Probá de nuevo'; });
    });

    $('.pda-cot__seguir').addEventListener('click', function () {
      $('.pda-cot__ok').hidden = true; $('.pda-cot__acc').hidden = false;
      $('.pda-cot__largo').focus();
    });

    calcular();
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
