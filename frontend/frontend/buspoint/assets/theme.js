/* Tema claro/escuro do BusPoint.
   Carregue no <head>, logo depois do styles.css, para o tema valer antes da primeira pintura.
   Ordem de decisão: escolha salva (localStorage "bp-theme") > preferência do sistema > claro. */
(function () {
  var KEY = 'bp-theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function saved() {
    try { var v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : null; }
    catch (e) { return null; }
  }
  function apply() { root.setAttribute('data-theme', saved() || (mq && mq.matches ? 'dark' : 'light')); }

  apply();

  // Sem escolha salva, acompanha o sistema em tempo real.
  if (mq) {
    var onChange = function () { if (!saved()) apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  window.BPTheme = {
    get: function () { return root.getAttribute('data-theme'); },
    set: function (t) {
      try { localStorage.setItem(KEY, t); } catch (e) {}
      // as cores deslizam por ~0,35 s em vez de trocar de uma vez
      root.classList.add('theme-anim');
      root.setAttribute('data-theme', t);
      clearTimeout(window.__bpThemeT);
      window.__bpThemeT = setTimeout(function () { root.classList.remove('theme-anim'); }, 400);
    },
    toggle: function () { this.set(this.get() === 'dark' ? 'light' : 'dark'); }
  };

  // Qualquer elemento com data-theme-toggle alterna o tema.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (b) window.BPTheme.toggle();
  });
})();
