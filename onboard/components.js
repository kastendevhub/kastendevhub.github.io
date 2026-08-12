/* ═══════════════════════════════════════════════════════════════════════════
   COURSE TEMPLATE — components.js  (widget behaviours)
   ───────────────────────────────────────────────────────────────────────────
   One self-contained, GUARDED IIFE per interactive component. Every module
   queries for its own root/mount element first and returns immediately when
   the element is absent — so a page that includes only some widgets never
   throws for the ones it omits. Load once, at the end of <body>:
       <script src="components.js"></script>

   Data-driven, not VONE-specific: components that need content read it from
   the markup — a <script type="application/json"> data island for list/quiz
   widgets, or semantic child elements / data-* attributes otherwise. Swap the
   sample data in the HTML; the behaviour here never changes.

   No analytics / mastery / milestone hooks — none exist in this template.

   MODULES
     1. Flip cards            .flipcards .flip
     2. Wizard                .wizard  (JSON island .wizard__data)
     3. Flow chain            .flow    (each .flow__node carries its detail)
     4. Hotspot quiz          .hotspot (JSON island .hotspot__data)
     5. Sorter                .sorter  (JSON island .sorter__data)
     6. Toggle-widget         .toggle-widget (buttons + [data-view-content] panels)
     7. Stepper               .stepper (steps in markup)
     8. Scenario slider       .widget[data-scenario]
     9. Decision              .decision (items in markup, data-rec + .decision__impact)
    10. Lightbox              .lightbox (+ .screenshot__img)
    11. Knowledge-check quiz  .quiz (JSON island .quiz__data)
    12. Carousel              .carousel (slides + prev/next + dots, aria-live)
    13. Compare-slider        .compare-slider (before/after; pointer + range fallback)
    14. Tabs                  .tabs (role=tablist/tab/tabpanel, roving tabindex)
    15. Glossary popover      .glossary-term / .glossary-pop (hover + focus/click)
    16. Labeled graphic       .labeled-graphic (markers + always-visible legend)
    17. Scenario (branching)  .branch (choices + in-markup outcomes)
    18. Fill-in-the-blank     .fitb (data-answers JSON array)
    19. Matching              .matching (JSON island .matching__data)
    20. Code copy             .code-block (copy <code> to clipboard)

   ISOLATION: every IIFE body is wrapped in try/catch (logs '[component:NAME]')
   so one broken/edited widget can never halt the file and kill the others.
   ═══════════════════════════════════════════════════════════════════════════ */


/* ── 1. FLIP CARDS ─────────────────────────────────────────────────────────
   Click / Enter / Space flips a card. Works for every .flip on the page. */
(function () {
  try {
  var cards = document.querySelectorAll('.flipcards .flip');
  if (!cards.length) return;
  cards.forEach(function (card) {
    var toggle = function () {
      var f = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', f ? 'true' : 'false');
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
  } catch (e) { console.error('[component:flip-cards]', e); }
})();


/* ── 2. WIZARD ─────────────────────────────────────────────────────────────
   Multi-step decision walkthrough. Reads steps from a JSON island
   <script type="application/json" class="wizard__data"> = [{title, body, mock}].
   Builds the step tablist + single rendered panel, roving tabindex, prev/next. */
(function () {
  try {
  document.querySelectorAll('.wizard').forEach(function (root) {
    var dataEl = root.querySelector('.wizard__data');
    var steps  = root.querySelector('.wizard__steps');
    var panel  = root.querySelector('.wizard__panel');
    var count  = root.querySelector('.wizard__count');
    var status = root.querySelector('.wizard__status');
    var prev   = (root.dataset.prev && document.getElementById(root.dataset.prev)) || root.querySelector('[data-wizard-prev]');
    var next   = (root.dataset.next && document.getElementById(root.dataset.next)) || root.querySelector('[data-wizard-next]');
    if (!dataEl || !steps || !panel) return;

    var DATA;
    try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!Array.isArray(DATA) || !DATA.length) return;

    // Build the step tablist from the data.
    steps.innerHTML = DATA.map(function (s, i) {
      return '<button class="wizard__step' + (i === 0 ? ' is-active' : '') + '" data-step="' + i +
        '" role="tab" aria-selected="' + (i === 0) + '" aria-controls="' + panel.id +
        '" tabindex="' + (i === 0 ? '0' : '-1') + '" type="button">' + s.title + '</button>';
    }).join('');

    var i = 0, first = true;
    function render() {
      var s = DATA[i];
      panel.innerHTML =
        '<div class="wizard__panel-info"><h3 tabindex="-1">' + s.title + '</h3>' + (s.body || '') + '</div>' +
        '<div class="wizard__panel-mock">' + (s.mock || '') + '</div>';
      if (count) count.textContent = 'STEP ' + String(i + 1).padStart(2, '0') + ' / ' + String(DATA.length).padStart(2, '0');
      if (status) status.textContent = 'Now showing: ' + s.title;
      steps.querySelectorAll('.wizard__step').forEach(function (b, x) {
        var on = x === i;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
        b.setAttribute('tabindex', on ? '0' : '-1');
      });
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === DATA.length - 1;
      if (first) { first = false; } else { var h = panel.querySelector('h3'); if (h) h.focus({ preventScroll: true }); }
    }
    steps.addEventListener('click', function (e) {
      var b = e.target.closest('.wizard__step'); if (!b) return;
      i = +b.dataset.step; render();
    });
    steps.addEventListener('keydown', function (e) {
      var b = e.target.closest('.wizard__step'); if (!b) return;
      var all = [].slice.call(steps.querySelectorAll('.wizard__step'));
      var cur = all.indexOf(b), n = null;
      if (e.key === 'ArrowRight') n = all[(cur + 1) % all.length];
      if (e.key === 'ArrowLeft')  n = all[(cur - 1 + all.length) % all.length];
      if (e.key === 'Home') n = all[0];
      if (e.key === 'End')  n = all[all.length - 1];
      if (!n) return;
      e.preventDefault(); i = +n.dataset.step; render(); n.focus();
    });
    if (prev) prev.addEventListener('click', function () { if (i > 0) { i--; render(); } });
    if (next) next.addEventListener('click', function () { if (i < DATA.length - 1) { i++; render(); } });
    render();
  });
  } catch (e) { console.error('[component:wizard]', e); }
})();


/* ── 3. FLOW CHAIN ─────────────────────────────────────────────────────────
   Click / arrow-key through pipeline stages; the active stage's detail is
   shown in the shared .flow__detail panel. Each .flow__node carries its own
   detail in a hidden .flow__node-detail child (no data baked into JS). */
(function () {
  try {
  document.querySelectorAll('.flow').forEach(function (root) {
    var chain  = root.querySelector('.flow__chain');
    var detail = root.querySelector('.flow__detail');
    if (!chain || !detail) return;
    var nodes = [].slice.call(chain.querySelectorAll('.flow__node'));
    if (!nodes.length) return;

    function setStage(idx, opts) {
      opts = opts || {};
      nodes.forEach(function (n, x) {
        var active = x === idx;
        n.classList.toggle('is-active', active);
        n.setAttribute('aria-selected', String(active));
        n.setAttribute('tabindex', active ? '0' : '-1');
      });
      var src = nodes[idx].querySelector('.flow__node-detail');
      detail.innerHTML = src ? src.innerHTML : '';
      detail.setAttribute('tabindex', '-1');
      if (nodes[idx].id) detail.setAttribute('aria-labelledby', nodes[idx].id);
      if (!opts.initial && !opts.keepFocus) detail.focus({ preventScroll: true });
    }
    chain.addEventListener('click', function (e) {
      var n = e.target.closest('.flow__node'); if (!n) return;
      setStage(nodes.indexOf(n));
    });
    chain.addEventListener('keydown', function (e) {
      var n = e.target.closest('.flow__node'); if (!n) return;
      var cur = nodes.indexOf(n), nx = null;
      if (e.key === 'ArrowRight') nx = (cur + 1) % nodes.length;
      if (e.key === 'ArrowLeft')  nx = (cur - 1 + nodes.length) % nodes.length;
      if (e.key === 'Home') nx = 0;
      if (e.key === 'End')  nx = nodes.length - 1;
      if (nx !== null) { e.preventDefault(); setStage(nx, { keepFocus: true }); nodes[nx].focus(); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStage(cur); }
    });
    setStage(0, { initial: true });
  });
  } catch (e) { console.error('[component:flow]', e); }
})();


/* ── 4. HOTSPOT QUIZ ───────────────────────────────────────────────────────
   Find-it quiz over a screenshot. Reads regions from a JSON island
   <script type="application/json" class="hotspot__data"> = [{num,title,body,
   box:{top,left,width,height}, prompt, posLabel}]. Prompts one at a time,
   two misses reveal the answer, tracks score, restart reshuffles. */
(function () {
  try {
  var MAX_ATTEMPTS = 2;
  document.querySelectorAll('.hotspot').forEach(function (root) {
    var dataEl  = root.querySelector('.hotspot__data');
    var stage   = root.querySelector('.hotspot__stage');
    var panel   = root.querySelector('.hotspot__panel');
    var scoreEl = root.querySelector('.hotspot__score');
    var restart = root.querySelector('.hotspot__mode-btn');
    if (!dataEl || !stage || !panel) return;

    var SPOTS;
    try { SPOTS = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!Array.isArray(SPOTS) || !SPOTS.length) return;

    var order = [], idx = 0, correctN = 0, mistakes = 0, attempts = 0;
    var pinById = {};
    SPOTS.forEach(function (h, k) {
      h.id = h.id || ('spot' + k);
      var pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'hotspot__pin';
      pin.dataset.id = h.id;
      pin.style.top = h.box.top + '%';
      pin.style.left = h.box.left + '%';
      pin.style.width = h.box.width + '%';
      pin.style.height = h.box.height + '%';
      pin.setAttribute('aria-label', h.posLabel || h.title);
      var num = document.createElement('span');
      num.className = 'hotspot__pin-num';
      num.textContent = String(h.num != null ? h.num : k + 1);
      num.setAttribute('aria-hidden', 'true');
      pin.appendChild(num);
      pin.addEventListener('click', function () { hit(h, pin); });
      stage.appendChild(pin);
      pinById[h.id] = pin;
    });

    function target() { return SPOTS.filter(function (x) { return x.id === order[idx]; })[0]; }
    function score() { if (scoreEl) scoreEl.textContent = 'Score: ' + correctN + ' / ' + SPOTS.length + ' correct · ' + mistakes + ' mistake' + (mistakes === 1 ? '' : 's'); }
    function prompt() {
      var t = target();
      panel.className = 'hotspot__panel is-prompt';
      panel.innerHTML = '<h4>Find it (' + (idx + 1) + ' / ' + SPOTS.length + ')</h4><p>Click where you’d find ' + t.prompt + '. Two wrong guesses reveal the answer.</p>';
    }
    function advance() {
      idx++; attempts = 0;
      stage.querySelectorAll('.hotspot__pin').forEach(function (p) { p.disabled = false; p.classList.remove('is-correct', 'is-wrong'); });
      if (idx >= order.length) {
        panel.className = 'hotspot__panel is-correct';
        panel.innerHTML = '<h4>Quiz complete</h4><p>You found ' + correctN + ' of ' + SPOTS.length + ', with ' + mistakes + ' mistake' + (mistakes === 1 ? '' : 's') + ' along the way. Select “Restart quiz” to reshuffle.</p>';
      } else { prompt(); }
    }
    function hit(h, pin) {
      if (pin.disabled) return;
      var t = target();
      if (h.id === t.id) {
        pin.classList.add('is-correct'); correctN++;
        panel.className = 'hotspot__panel is-correct';
        panel.innerHTML = '<h4>Correct — ' + h.title + '</h4><p>' + h.body + '</p>';
        score(); setTimeout(advance, 1100);
      } else {
        attempts++; mistakes++;
        pin.classList.add('is-wrong'); pin.disabled = true; score();
        if (attempts >= MAX_ATTEMPTS) {
          pinById[t.id].classList.add('is-correct');
          panel.className = 'hotspot__panel is-wrong';
          panel.innerHTML = '<h4>Out of attempts — that was ' + t.title + '</h4><p>' + t.body + '</p>';
          setTimeout(advance, 1400);
        } else {
          var left = MAX_ATTEMPTS - attempts;
          panel.className = 'hotspot__panel is-wrong';
          panel.innerHTML = '<h4>Not quite — that’s ' + h.title + '</h4><p>' + left + ' attempt' + (left === 1 ? '' : 's') + ' left. Try again: find ' + t.prompt + '.</p>';
        }
      }
    }
    function start() {
      order = SPOTS.map(function (h) { return h.id; });
      for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
      order.forEach(function (id) { stage.appendChild(pinById[id]); });
      stage.querySelectorAll('.hotspot__pin').forEach(function (p) { p.disabled = false; p.classList.remove('is-correct', 'is-wrong'); });
      idx = 0; correctN = 0; mistakes = 0; attempts = 0;
      score(); prompt();
    }
    if (restart) restart.addEventListener('click', start);
    start();
  });
  } catch (e) { console.error('[component:hotspot]', e); }
})();


/* ── 5. SORTER ─────────────────────────────────────────────────────────────
   Click a card in the tray, then click a bucket to file it. Each filing shows
   whether it fits + the "why". Progress line counts correct filings; reset
   clears. Reads config from a JSON island
   <script type="application/json" class="sorter__data"> =
       { buckets:[{id,label}], cards:[{id,text,answer,note}] }. */
(function () {
  try {
  document.querySelectorAll('.sorter').forEach(function (root) {
    var dataEl   = root.querySelector('.sorter__data');
    var tray     = root.querySelector('.sorter__tray');
    var buckets  = root.querySelector('.sorter__buckets');
    var progress = root.querySelector('.sorter__progress');
    var status   = root.querySelector('.sorter__status');
    var announce = root.querySelector('.sorter__announce');
    var resetBtn = root.querySelector('.sorter__reset');
    if (!dataEl || !tray || !buckets) return;

    var CFG;
    try { CFG = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var BUCKETS = CFG.buckets || [], CARDS = CFG.cards || [];
    if (!BUCKETS.length || !CARDS.length) return;

    var placement = {}, selected = null;
    function byId(id) { return CARDS.filter(function (c) { return c.id === id; })[0]; }
    function label(id) { var b = BUCKETS.filter(function (x) { return x.id === id; })[0]; return b ? b.label : id; }

    function render() {
      var loose = CARDS.filter(function (c) { return !placement[c.id]; });
      tray.innerHTML = loose.length
        ? loose.map(function (c) {
            var on = selected === c.id;
            return '<button type="button" class="sorter__card" data-card="' + c.id + '" aria-pressed="' + on + '">' + c.text + '</button>';
          }).join('')
        : '<span class="sorter__tray-empty">All filed. Select a filed card to move it, or reset.</span>';

      buckets.innerHTML = BUCKETS.map(function (b) {
        var placed = CARDS.filter(function (c) { return placement[c.id] === b.id; });
        var items = placed.map(function (c) {
          var fit = c.answer === b.id;
          var verdict = fit ? 'Good fit' : 'Doesn’t fit here';
          var why = fit ? c.note : ('This one fits ' + label(c.answer) + ' instead. ' + c.note);
          return '<button type="button" class="sorter__placed sorter__placed--' + (fit ? 'fit' : 'miss') + '" data-card="' + c.id +
            '" aria-label="' + c.text + '. ' + (fit ? 'Good fit for ' : 'Does not fit ') + b.label + '. Activate to move it back.">' +
            '<span class="sorter__placed-verdict">' + verdict + '</span>' + c.text +
            '<span class="sorter__placed-why">' + why + '</span><span class="sorter__placed-pull">Move back ↩</span></button>';
        }).join('');
        return '<div class="sorter__bucket">' +
          '<button type="button" class="sorter__bucket-head" data-bucket="' + b.id + '" aria-label="File the selected card under ' + b.label + '">' + b.label + '</button>' +
          '<p class="sorter__bucket-drop">' + (selected ? 'Click to file the selected card here.' : 'Select a card first.') + '</p>' +
          '<div class="sorter__bucket-items">' + items + '</div></div>';
      }).join('');

      var filed = Object.keys(placement).length;
      var correct = CARDS.filter(function (c) { return placement[c.id] === c.answer; }).length;
      if (status) status.textContent = filed + ' of ' + CARDS.length + ' cards filed.';
      if (progress) progress.textContent = correct + ' of ' + CARDS.length + ' filed correctly';
    }

    tray.addEventListener('click', function (e) {
      var btn = e.target.closest('.sorter__card'); if (!btn) return;
      var id = btn.dataset.card;
      selected = selected === id ? null : id;
      render();
    });
    buckets.addEventListener('click', function (e) {
      var head = e.target.closest('.sorter__bucket-head');
      if (head) {
        if (!selected) { if (announce) announce.textContent = 'Select a card from the tray first.'; return; }
        var c = byId(selected), bid = head.dataset.bucket;
        placement[selected] = bid;
        if (announce) announce.textContent = 'Filed under ' + label(bid) + '. ' + (c.answer === bid ? 'Good fit. ' + c.note : 'This one fits ' + label(c.answer) + ' instead. ' + c.note);
        selected = null; render(); return;
      }
      var placed = e.target.closest('.sorter__placed');
      if (placed) {
        var pid = placed.dataset.card; delete placement[pid]; selected = pid;
        if (announce) announce.textContent = 'Moved back to the tray and selected. Choose a bucket to re-file it.';
        render();
      }
    });
    if (resetBtn) resetBtn.addEventListener('click', function () {
      placement = {}; selected = null;
      if (announce) announce.textContent = 'Sorter reset. All cards are back in the tray.';
      render();
    });
    render();
  });
  } catch (e) { console.error('[component:sorter]', e); }
})();


/* ── 6. TOGGLE-WIDGET ──────────────────────────────────────────────────────
   Pill buttons swap which grouping panel is visible. Buttons carry
   data-view="<key>"; content panels carry data-view-content="<key>". One
   .toggle-widget__announce (aria-live) narrates the change. */
(function () {
  try {
  document.querySelectorAll('.toggle-widget').forEach(function (root) {
    var btns = [].slice.call(root.querySelectorAll('.toggle-widget__btn'));
    var panels = [].slice.call(root.querySelectorAll('[data-view-content]'));
    var announce = root.querySelector('.toggle-widget__announce');
    if (!btns.length || !panels.length) return;

    function show(view) {
      btns.forEach(function (b) {
        var on = b.dataset.view === view;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      panels.forEach(function (p) { p.hidden = p.dataset.viewContent !== view; });
      var active = btns.filter(function (b) { return b.dataset.view === view; })[0];
      if (announce && active) announce.textContent = 'Now showing: ' + active.textContent.trim() + '.';
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.view); }); });
    var initial = btns.filter(function (b) { return b.classList.contains('is-active'); })[0] || btns[0];
    show(initial.dataset.view);
  });
  } catch (e) { console.error('[component:toggle-widget]', e); }
})();


/* ── 7. STEPPER ────────────────────────────────────────────────────────────
   Click-to-reveal ordered steps; one open at a time (accordion). Steps live in
   the markup: a .stepper__btn (aria-controls a .stepper__detail) per step. */
(function () {
  try {
  document.querySelectorAll('.stepper').forEach(function (root) {
    var btns = [].slice.call(root.querySelectorAll('.stepper__btn'));
    if (!btns.length) return;
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btns.forEach(function (b) {
          b.setAttribute('aria-expanded', 'false');
          if (b.parentElement) b.parentElement.classList.remove('is-open');
          var d = document.getElementById(b.getAttribute('aria-controls'));
          if (d) d.classList.remove('is-open');
        });
        if (!open) {
          btn.setAttribute('aria-expanded', 'true');
          if (btn.parentElement) btn.parentElement.classList.add('is-open');
          var det = document.getElementById(btn.getAttribute('aria-controls'));
          if (det) det.classList.add('is-open');
        }
      });
    });
  });
  } catch (e) { console.error('[component:stepper]', e); }
})();


/* ── 8. SCENARIO SLIDER ────────────────────────────────────────────────────
   A slider drives a live meter; "Check" reveals whether the value lands inside
   the acceptable band, "Reset" restores the default. Generic model: the meter
   fill mirrors the slider's position within its range, and a pass is any value
   in [data-ok-min, data-ok-max] on the root .widget[data-scenario]. Elements
   are found by role class within the widget. */
(function () {
  try {
  document.querySelectorAll('.widget[data-scenario]').forEach(function (root) {
    var slider = root.querySelector('.widget__slider');
    var valOut = root.querySelector('.widget__value-out');
    var fill   = root.querySelector('.widget__meter-fill');
    var meterV = root.querySelector('.widget__meter-value');
    var check  = root.querySelector('.widget__reveal');
    var reset  = root.querySelector('.widget__reset');
    var output = root.querySelector('.simoutput');
    if (!slider || !fill || !output) return;

    var okMin = parseFloat(root.dataset.okMin);
    var okMax = parseFloat(root.dataset.okMax);
    var unit  = root.dataset.unit || '';
    var def   = slider.getAttribute('value') || slider.value;
    var promptHTML = '<p class="simoutput__prompt">Set a value above, then select <strong>Check my answer</strong>.</p>';

    function pct() {
      var min = +slider.min || 0, max = +slider.max || 100, v = +slider.value;
      return max === min ? 0 : Math.round(((v - min) / (max - min)) * 100);
    }
    function render() {
      var v = +slider.value;
      if (valOut) valOut.textContent = v;
      fill.style.width = pct() + '%';
      if (meterV) meterV.textContent = v + (unit ? ' ' + unit : '');
    }
    function evaluate() {
      var v = +slider.value;
      var ok = (isNaN(okMin) || v >= okMin) && (isNaN(okMax) || v <= okMax);
      var band = (isNaN(okMin) ? '' : okMin) + '–' + (isNaN(okMax) ? '' : okMax) + (unit ? ' ' + unit : '');
      output.innerHTML =
        '<p class="simoutput__result ' + (ok ? 'is-right' : 'is-wrong') + '"><strong>' +
        (ok ? 'Correct.' : 'Not yet.') + '</strong> ' +
        (ok ? 'That value is inside the acceptable band.' : 'That value is outside the acceptable band — adjust and check again.') + '</p>' +
        '<div class="simoutput__row"><span>' + (ok ? '✓' : '✗') + '</span> Value ' + v + (unit ? ' ' + unit : '') + ' (target ' + band + ')</div>';
    }
    slider.addEventListener('input', function () {
      render();
      output.innerHTML = '<p class="simoutput__prompt">Value changed — select <strong>Check my answer</strong> again.</p>';
    });
    if (check) check.addEventListener('click', evaluate);
    if (reset) reset.addEventListener('click', function () { slider.value = def; render(); output.innerHTML = promptHTML; });
    render();
  });
  } catch (e) { console.error('[component:scenario]', e); }
})();


/* ── 9. DECISION ───────────────────────────────────────────────────────────
   Weigh a choice per item, reveal whether it's a good call + the tradeoff.
   Items live in the markup: .decision__item[data-rec="<choiceValue>"] with two
   .decision__btn[data-choice] and a hidden .decision__impact carrying the
   reasoning text. Selecting the recommended choice reads "good", else "recon". */
(function () {
  try {
  document.querySelectorAll('.decision').forEach(function (root) {
    var list = root.querySelector('.decision__list') || root;
    if (!list.querySelector('.decision__item')) return;
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('.decision__btn'); if (!btn) return;
      var item = btn.closest('.decision__item'); if (!item) return;
      var rec = item.dataset.rec;
      var choice = btn.dataset.choice;
      var impactEl = item.querySelector('.decision__impact');
      var impact = impactEl ? impactEl.innerHTML : '';
      item.querySelectorAll('.decision__btn').forEach(function (b) { b.classList.toggle('is-sel', b === btn); });
      var good = choice === rec;
      var fb = item.querySelector('.decision__fb');
      if (!fb) return;
      fb.className = 'decision__fb is-shown ' + (good ? 'is-good' : 'is-recon');
      fb.innerHTML = '<strong>' + (good ? 'Good call.' : 'Worth reconsidering.') + '</strong> ' + impact;
    });
  });
  } catch (e) { console.error('[component:decision]', e); }
})();


/* ── 10. LIGHTBOX ──────────────────────────────────────────────────────────
   Enlarge any .screenshot__img. One .lightbox root per page. Open on click /
   Enter / Space, close on overlay click, close button, or Esc; focus restored. */
(function () {
  try {
  var lb = document.querySelector('.lightbox');
  if (!lb) return;
  var img = lb.querySelector('img');
  var closeBtn = lb.querySelector('.lightbox__close');
  if (!img || !closeBtn) return;
  var lastFocused = null;

  function open(src) {
    lastFocused = document.activeElement;
    img.src = src.currentSrc || src.src;
    img.alt = src.alt || '';
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function close() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    img.src = '';
    if (lastFocused) lastFocused.focus();
  }
  document.querySelectorAll('.screenshot__img').forEach(function (el) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    if (!/(enlarge|zoom)/i.test(el.alt || '')) el.alt = (el.alt || '') + ' (click to enlarge)';
    el.addEventListener('click', function () { open(el); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); } });
  });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === closeBtn) close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('is-open')) close(); });
  } catch (e) { console.error('[component:lightbox]', e); }
})();


/* ── PAGE CHROME: progress bar + section rail scrollspy ────────────────────
   Updates the top progress bar and the active rail dot on scroll; clicking a
   dot smooth-scrolls to its data-target section. Guarded: no rail, no-op. */
(function () {
  try {
  var fill = document.querySelector('.progress-bar__fill');
  var dots = [].slice.call(document.querySelectorAll('.rail__dot'));
  if (!fill && !dots.length) return;
  var sections = dots.map(function (d) { return document.getElementById(d.dataset.target); });
  function update() {
    if (fill) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      fill.style.width = (window.scrollY / Math.max(docH, 1)) * 100 + '%';
    }
    if (dots.length) {
      var fromTop = window.scrollY + window.innerHeight * 0.4, active = 0;
      /* offsetParent === null skips sections still hidden behind a Continue gate */
      sections.forEach(function (s, i) { if (s && s.offsetParent !== null && s.offsetTop <= fromTop) active = i; });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === active); });
    }
  }
  window.addEventListener('scroll', update, { passive: true });
  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      var t = document.getElementById(d.dataset.target);
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    });
  });
  update();
  } catch (e) { console.error('[component:page-chrome-rail]', e); }
})();


/* ── Continue gate (Rise-style progressive reveal) ─────────────────────────
   Each [data-continue] hides the element immediately after it (its next
   sibling — a block or a whole <section>) until the learner clicks Continue,
   then reveals it, refreshes the rail/progress, and moves focus to its
   heading. Progressive enhancement: with JS off, nothing is hidden. Guarded. */
(function () {
  try {
  var gates = [].slice.call(document.querySelectorAll('[data-continue]'));
  gates.forEach(function (gate, i) {
    var btn = gate.querySelector('.continue__btn');
    // The locked target is the gate's next sibling; if the gate sits at the end
    // of a <section> (no next sibling), fall back to that section's next sibling.
    // This lets gates chain: a gate inside a hidden section can't be clicked, so
    // sections reveal one at a time.
    var sect = gate.closest('section');
    var locked = gate.nextElementSibling || (sect ? sect.nextElementSibling : null);
    if (!btn || !locked) return;
    locked.id = locked.id || 'gate-target-' + (i + 1);
    locked.hidden = true;
    locked.classList.add('continue__locked');
    btn.setAttribute('aria-controls', locked.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      locked.hidden = false;
      locked.classList.add('is-revealed');
      btn.setAttribute('aria-expanded', 'true');
      gate.classList.add('is-done');
      window.dispatchEvent(new Event('scroll')); // refresh progress bar + rail
      locked.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var h = locked.querySelector('h1, h2, h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    });
  });
  } catch (e) { console.error('[component:continue-gate]', e); }
})();


/* ── PAGE CHROME: Storylane embed fullscreen toggle ────────────────────────
   Delegated click on any .sl-embed__fullscreen requests fullscreen on its
   sibling iframe. Guarded via the delegated closest() check. */
(function () {
  try {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.sl-embed__fullscreen');
    if (!btn) return;
    var frame = btn.closest('.sl-embed').querySelector('iframe');
    if (!frame) return;
    if (frame.requestFullscreen) frame.requestFullscreen();
    else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
  });
  } catch (e) { console.error('[component:storylane-fullscreen]', e); }
})();


/* ── 11. KNOWLEDGE-CHECK QUIZ ──────────────────────────────────────────────
   Renders question cards and scores them. Reads questions from a JSON island
   <script type="application/json" class="quiz__data"> =
       [{q, opts:[{t, correct, why}]}].
   One answer per question; on the last answer a score panel is revealed. */
(function () {
  try {
  var quizEl = document.querySelector('.quiz');
  if (!quizEl) return;
  var dataEl = quizEl.querySelector('.quiz__data') || document.querySelector('.quiz__data');
  if (!dataEl) return;
  var QUIZ;
  try { QUIZ = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!Array.isArray(QUIZ) || !QUIZ.length) return;

  var scoreEl = document.querySelector('.quiz-score');
  var pctEl   = document.querySelector('.quiz-score__pct');
  var labelEl = document.querySelector('.quiz-score__label');
  var answered = 0, correct = 0;

  quizEl.innerHTML = QUIZ.map(function (item, qi) {
    return '<div class="quiz-card" data-q="' + qi + '">' +
      '<div class="quiz-card__num">QUESTION ' + String(qi + 1).padStart(2, '0') + ' / ' + String(QUIZ.length).padStart(2, '0') + '</div>' +
      '<div class="quiz-card__q">' + item.q + '</div>' +
      '<div class="quiz-card__opts">' +
        item.opts.map(function (o, oi) {
          return '<button class="quiz-opt" data-q="' + qi + '" data-o="' + oi + '" type="button">' +
            '<div class="quiz-opt__marker"></div><span>' + o.t + '</span></button>';
        }).join('') +
      '</div>' +
      '<div class="quiz-card__feedback" aria-live="polite"></div></div>';
  }).join('');

  quizEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.quiz-opt');
    if (!btn || btn.disabled) return;
    var qi = +btn.dataset.q, oi = +btn.dataset.o;
    var card = btn.closest('.quiz-card');
    var opt = QUIZ[qi].opts[oi];
    card.querySelectorAll('.quiz-opt').forEach(function (b) { b.disabled = true; });
    btn.classList.add(opt.correct ? 'is-correct' : 'is-wrong');
    if (!opt.correct) {
      var ci = QUIZ[qi].opts.findIndex(function (o) { return o.correct; });
      var right = card.querySelector('.quiz-opt[data-o="' + ci + '"]');
      if (right) right.classList.add('is-correct');
    }
    var fb = card.querySelector('.quiz-card__feedback');
    fb.classList.add('is-shown', opt.correct ? 'is-correct' : 'is-wrong');
    fb.innerHTML = '<strong>' + (opt.correct ? 'Correct.' : 'Not quite.') + '</strong> ' + opt.why;
    answered++;
    if (opt.correct) correct++;
    if (answered === QUIZ.length && scoreEl) {
      var pct = Math.round((correct / QUIZ.length) * 100);
      if (pctEl) pctEl.textContent = pct + '%';
      if (labelEl) labelEl.textContent = pct >= 80
        ? correct + ' of ' + QUIZ.length + ' correct — ready for the next module.'
        : correct + ' of ' + QUIZ.length + ' correct — review the sections above before moving on.';
      scoreEl.classList.add('is-shown');
    }
  });
  } catch (e) { console.error('[component:quiz]', e); }
})();


/* ── 12. CAROUSEL ──────────────────────────────────────────────────────────
   One slide visible at a time; prev/next buttons + a generated dot per slide.
   Builds the dots, announces the active slide via an aria-live region, and
   loops. Every .carousel on the page is independent. Guarded + fault-isolated. */
(function () {
  try {
    document.querySelectorAll('.carousel').forEach(function (root) {
      var track  = root.querySelector('.carousel__track');
      var slides = [].slice.call(root.querySelectorAll('.carousel__slide'));
      var prev   = root.querySelector('.carousel__nav--prev');
      var next   = root.querySelector('.carousel__nav--next');
      var dotsEl = root.querySelector('.carousel__dots');
      var live   = root.querySelector('.carousel__live');
      if (!track || !slides.length) return;

      var i = 0, dots = [];
      if (dotsEl) {
        dotsEl.innerHTML = slides.map(function (s, k) {
          return '<button type="button" class="carousel__dot' + (k === 0 ? ' is-active' : '') +
            '" role="tab" aria-selected="' + (k === 0) + '" aria-label="Go to slide ' + (k + 1) + ' of ' + slides.length + '"></button>';
        }).join('');
        dots = [].slice.call(dotsEl.querySelectorAll('.carousel__dot'));
      }
      function show(n) {
        i = (n + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + (i * 100) + '%)';
        slides.forEach(function (s, k) { s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
        dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); d.setAttribute('aria-selected', String(k === i)); });
        if (live) live.textContent = 'Slide ' + (i + 1) + ' of ' + slides.length;
      }
      if (prev) prev.addEventListener('click', function () { show(i - 1); });
      if (next) next.addEventListener('click', function () { show(i + 1); });
      dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k); }); });
      show(0);
    });
  } catch (e) { console.error('[component:carousel]', e); }
})();


/* ── 13. COMPARE-SLIDER (before / after) ───────────────────────────────────
   Drag anywhere on the frame (pointer) to reveal the overlaid "before" image
   over the "after" base. A native range input mirrors the position and gives a
   fully keyboard-accessible fallback. Guarded + fault-isolated. */
(function () {
  try {
    document.querySelectorAll('.compare-slider').forEach(function (root) {
      var frame   = root.querySelector('.compare-slider__frame');
      var overlay = root.querySelector('.compare-slider__overlay');
      var handle  = root.querySelector('.compare-slider__handle');
      var range   = root.querySelector('.compare-slider__range');
      if (!frame || !overlay) return;

      function setPct(p) {
        p = Math.max(0, Math.min(100, p));
        overlay.style.width = p + '%';
        if (handle) handle.style.left = p + '%';
        if (range && +range.value !== Math.round(p)) range.value = Math.round(p);
      }
      function fromClientX(x) {
        var r = frame.getBoundingClientRect();
        if (r.width) setPct(((x - r.left) / r.width) * 100);
      }
      var dragging = false;
      frame.addEventListener('pointerdown', function (e) {
        dragging = true; fromClientX(e.clientX);
        if (frame.setPointerCapture) { try { frame.setPointerCapture(e.pointerId); } catch (err) {} }
      });
      frame.addEventListener('pointermove', function (e) { if (dragging) fromClientX(e.clientX); });
      frame.addEventListener('pointerup', function () { dragging = false; });
      frame.addEventListener('pointercancel', function () { dragging = false; });
      if (range) range.addEventListener('input', function () { setPct(+range.value); });
      setPct(range ? +range.value : 50);
    });
  } catch (e) { console.error('[component:compare-slider]', e); }
})();


/* ── 14. TABS ──────────────────────────────────────────────────────────────
   ARIA tabs with roving tabindex: click or Arrow/Home/End to switch. Reads the
   role="tab" buttons + role="tabpanel" panels from the markup; the panel shown
   is the one whose index matches the selected tab. Guarded + fault-isolated. */
(function () {
  try {
    document.querySelectorAll('.tabs').forEach(function (root) {
      var tabs   = [].slice.call(root.querySelectorAll('[role="tab"]'));
      var panels = [].slice.call(root.querySelectorAll('[role="tabpanel"]'));
      if (!tabs.length || !panels.length) return;

      function select(idx, focus) {
        tabs.forEach(function (t, k) {
          var on = k === idx;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.setAttribute('tabindex', on ? '0' : '-1');
          if (on && focus) t.focus();
        });
        panels.forEach(function (pnl, k) { pnl.hidden = k !== idx; });
      }
      tabs.forEach(function (t, k) {
        t.addEventListener('click', function () { select(k); });
        t.addEventListener('keydown', function (e) {
          var n = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (k + 1) % tabs.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (k - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') n = 0;
          else if (e.key === 'End') n = tabs.length - 1;
          if (n === null) return;
          e.preventDefault(); select(n, true);
        });
      });
      var start = tabs.map(function (t) { return t.getAttribute('aria-selected') === 'true'; }).indexOf(true);
      select(start < 0 ? 0 : start);
    });
  } catch (e) { console.error('[component:tabs]', e); }
})();


/* ── 15. GLOSSARY POPOVER ──────────────────────────────────────────────────
   Inline .glossary-term reveals its .glossary-pop definition on hover AND on
   focus/click; dismiss on blur, Esc, or an outside click. The term is linked to
   its popover via aria-describedby (falls back to the sibling within .glossary).
   Guarded + fault-isolated. */
(function () {
  try {
    var terms = [].slice.call(document.querySelectorAll('.glossary-term'));
    if (!terms.length) return;

    var openPop = null;
    function close(pop) { if (!pop) return; pop.classList.remove('is-open'); if (openPop === pop) openPop = null; }
    function open(pop) { if (openPop && openPop !== pop) close(openPop); pop.classList.add('is-open'); openPop = pop; }

    terms.forEach(function (term) {
      var id  = term.getAttribute('aria-describedby');
      var pop = id ? document.getElementById(id) : null;
      if (!pop && term.parentElement) pop = term.parentElement.querySelector('.glossary-pop');
      if (!pop) return;
      function toggle() { if (pop.classList.contains('is-open')) close(pop); else open(pop); }
      term.addEventListener('mouseenter', function () { open(pop); });
      term.addEventListener('mouseleave', function () { if (document.activeElement !== term) close(pop); });
      term.addEventListener('focus', function () { open(pop); });
      term.addEventListener('blur', function () { close(pop); });
      term.addEventListener('click', toggle);
      term.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        else if (e.key === 'Escape') { close(pop); }
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openPop) close(openPop); });
    document.addEventListener('click', function (e) { if (openPop && !e.target.closest('.glossary')) close(openPop); });
  } catch (e) { console.error('[component:glossary]', e); }
})();


/* ── 16. LABELED GRAPHIC ───────────────────────────────────────────────────
   Static annotated image: numbered markers + an always-visible legend. Clicking
   a marker highlights it and the matching legend row (data-marker ↔ data-legend);
   clicking the active marker clears the highlight. Works with JS off — the legend
   is always readable. Guarded + fault-isolated. */
(function () {
  try {
    document.querySelectorAll('.labeled-graphic').forEach(function (root) {
      var markers = [].slice.call(root.querySelectorAll('.labeled-graphic__marker'));
      var legend  = [].slice.call(root.querySelectorAll('[data-legend]'));
      if (!markers.length) return;
      function activate(key) {
        markers.forEach(function (m) { m.classList.toggle('is-active', key != null && m.dataset.marker === key); });
        legend.forEach(function (li) { li.classList.toggle('is-active', key != null && li.dataset.legend === key); });
      }
      markers.forEach(function (m) {
        m.addEventListener('click', function () {
          activate(m.classList.contains('is-active') ? null : m.dataset.marker);
        });
      });
    });
  } catch (e) { console.error('[component:labeled-graphic]', e); }
})();


/* ── 17. SCENARIO (branching) ──────────────────────────────────────────────
   A prompt + 2–3 choice buttons; picking one reveals its matching outcome panel
   (data-outcome === data-choice) and shows a "Try again" reset. Outcomes flagged
   data-quality="poor" render in the warn palette. Guarded + fault-isolated. */
(function () {
  try {
    document.querySelectorAll('.branch').forEach(function (root) {
      var btns     = [].slice.call(root.querySelectorAll('.branch__btn'));
      var outcomes = [].slice.call(root.querySelectorAll('.branch__outcome'));
      var reset    = root.querySelector('.branch__reset');
      if (!btns.length || !outcomes.length) return;

      function choose(key) {
        btns.forEach(function (b) { b.classList.toggle('is-sel', b.dataset.choice === key); });
        outcomes.forEach(function (o) {
          var on = o.dataset.outcome === key;
          o.classList.toggle('is-shown', on);
          o.classList.toggle('is-poor', on && o.dataset.quality === 'poor');
        });
        if (reset) reset.classList.add('is-shown');
      }
      btns.forEach(function (b) { b.addEventListener('click', function () { choose(b.dataset.choice); }); });
      if (reset) reset.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('is-sel'); });
        outcomes.forEach(function (o) { o.classList.remove('is-shown', 'is-poor'); });
        reset.classList.remove('is-shown');
      });
    });
  } catch (e) { console.error('[component:branch]', e); }
})();


/* ── 18. FILL-IN-THE-BLANK ─────────────────────────────────────────────────
   Compares the input (case/space-insensitive) against the accepted answers in
   the root's data-answers (a JSON array). Shows correct/incorrect + the answer.
   Enter or the Check button evaluates. Guarded + fault-isolated. */
(function () {
  try {
    document.querySelectorAll('.fitb').forEach(function (root) {
      var input = root.querySelector('.fitb__input');
      var btn   = root.querySelector('.fitb__check');
      var fb    = root.querySelector('.fitb__feedback');
      if (!input || !btn || !fb) return;

      var answers;
      try { answers = JSON.parse(root.dataset.answers || '[]'); } catch (e) { answers = []; }
      if (!Array.isArray(answers)) answers = [];

      function norm(s) { return String(s).trim().toLowerCase().replace(/\s+/g, ' '); }
      function check() {
        var val = norm(input.value);
        if (!val) return;
        var ok = answers.some(function (a) { return norm(a) === val; });
        input.classList.toggle('is-correct', ok);
        input.classList.toggle('is-wrong', !ok);
        fb.className = 'fitb__feedback is-shown ' + (ok ? 'is-correct' : 'is-wrong');
        fb.innerHTML = ok
          ? '<strong>Correct.</strong> That’s the answer.'
          : '<strong>Not quite.</strong> The accepted answer is “' + (answers[0] || '') + '”.';
      }
      btn.addEventListener('click', check);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    });
  } catch (e) { console.error('[component:fitb]', e); }
})();


/* ── 19. MATCHING (term ↔ definition) ──────────────────────────────────────
   Click a term, then a definition. A matched pair (same data-pair index) locks
   green and disables; a mismatch flashes and clears. Progress line + reset.
   Reads pairs from a JSON island <script type="application/json" class="matching__data">
   = [{term, def}]; both columns are shuffled independently. Guarded + fault-isolated. */
(function () {
  try {
    document.querySelectorAll('.matching').forEach(function (root) {
      var dataEl   = root.querySelector('.matching__data');
      var termsEl  = root.querySelector('.matching__terms');
      var defsEl   = root.querySelector('.matching__defs');
      var progress = root.querySelector('.matching__progress');
      var announce = root.querySelector('.matching__announce');
      var resetBtn = root.querySelector('.matching__reset');
      if (!dataEl || !termsEl || !defsEl) return;

      var PAIRS;
      try { PAIRS = JSON.parse(dataEl.textContent); } catch (e) { return; }
      if (!Array.isArray(PAIRS) || !PAIRS.length) return;

      var selTerm = null, matched = 0;
      function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
      function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function updateProgress() { if (progress) progress.textContent = matched + ' of ' + PAIRS.length + ' matched'; }
      function build() {
        selTerm = null; matched = 0;
        var idx = PAIRS.map(function (_, i) { return i; });
        termsEl.innerHTML = shuffle(idx.slice()).map(function (i) {
          return '<button type="button" class="matching__item" data-pair="' + i + '">' + esc(PAIRS[i].term) + '</button>';
        }).join('');
        defsEl.innerHTML = shuffle(idx.slice()).map(function (i) {
          return '<button type="button" class="matching__item" data-pair="' + i + '">' + esc(PAIRS[i].def) + '</button>';
        }).join('');
        updateProgress();
      }

      termsEl.addEventListener('click', function (e) {
        var b = e.target.closest('.matching__item'); if (!b || b.disabled) return;
        [].forEach.call(termsEl.querySelectorAll('.matching__item'), function (x) { x.classList.remove('is-sel'); });
        b.classList.add('is-sel'); selTerm = b;
      });
      defsEl.addEventListener('click', function (e) {
        var d = e.target.closest('.matching__item'); if (!d || d.disabled) return;
        if (!selTerm) { if (announce) announce.textContent = 'Select a term first.'; return; }
        if (selTerm.dataset.pair === d.dataset.pair) {
          selTerm.classList.remove('is-sel'); selTerm.classList.add('is-matched'); selTerm.disabled = true;
          d.classList.add('is-matched'); d.disabled = true;
          matched++; updateProgress();
          if (announce) announce.textContent = 'Matched. ' + matched + ' of ' + PAIRS.length + '.';
          selTerm = null;
        } else {
          var badTerm = selTerm, badDef = d;
          badTerm.classList.add('is-wrong'); badDef.classList.add('is-wrong');
          if (announce) announce.textContent = 'Not a match. Try again.';
          setTimeout(function () { badTerm.classList.remove('is-wrong', 'is-sel'); badDef.classList.remove('is-wrong'); }, 350);
          selTerm = null;
        }
      });
      if (resetBtn) resetBtn.addEventListener('click', build);
      build();
    });
  } catch (e) { console.error('[component:matching]', e); }
})();


/* ── 20. CODE COPY ─────────────────────────────────────────────────────────
   Copies the .code-block's <code> text to the clipboard via the async Clipboard
   API, falling back to a hidden textarea + execCommand where that's unavailable.
   Button label confirms briefly. Guarded + fault-isolated. */
(function () {
  try {
    document.querySelectorAll('.code-block').forEach(function (root) {
      var btn  = root.querySelector('.code-block__copy');
      var code = root.querySelector('code');
      if (!btn || !code) return;

      function flash(msg) { var old = btn.dataset.label || btn.textContent; btn.dataset.label = old; btn.textContent = msg; setTimeout(function () { btn.textContent = btn.dataset.label; }, 1500); }
      function fallback(text) {
        try {
          var ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', '');
          ta.style.position = 'absolute'; ta.style.left = '-9999px';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
          flash('Copied');
        } catch (err) { flash('Copy failed'); }
      }
      btn.addEventListener('click', function () {
        var text = code.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { flash('Copied'); }, function () { fallback(text); });
        } else { fallback(text); }
      });
    });
  } catch (e) { console.error('[component:code-copy]', e); }
})();
