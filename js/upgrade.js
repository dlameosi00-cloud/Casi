/* upgrade.js — Апгрейдер v2: сектор выигрыша снизу, шанс под колесом */

Games.upgrade = (() => {
  let bet = 50, mult = 2, spinning = false;

  const MIN = 10;
  const MULTS = [1.5, 2, 4, 8, 16, 50];

  const el = id => document.getElementById(id);

  function chance() {
    const f = Luck.f(bet);
    const c = (100 / mult) * 0.92 * (0.55 + 0.45 * Math.min(1.05, f));
    return Math.max(2, Math.min(92, Math.round(c)));
  }

  function syncInput() {
    const inp = el('upg-input');
    if (inp && +inp.value !== bet) inp.value = bet;
  }

  function update() {
    const maxBal = Store.demoMode ? Store.demoBalance : Store.balance;
    if (bet > maxBal) bet = Math.floor(maxBal);
    if (bet < MIN) bet = MIN;
    const target = Math.round(bet * mult);
    const c = chance();

    const bv = el('upg-bet-v');
    if (bv) bv.innerHTML = '<b>★ ' + bet + '</b>';
    const tv = el('upg-target-v');
    if (tv) tv.innerHTML = '<b>★ ' + target + '</b>';
    const cv = el('upg-c-val');
    if (cv) cv.innerHTML = '<b>★ ' + target + '</b>';
    const ch = el('upg-chance');
    if (ch) ch.textContent = c + '%';

    const g = el('upg-gauge');
    if (g) {
      const half = c * 1.8;
      g.style.setProperty('--ws', (90 - half) + 'deg');
      g.style.setProperty('--we', (90 + half) + 'deg');
    }
    const go = el('upg-go');
    if (go && !spinning) go.textContent = '⌃  Улучшить до ★ ' + target;
    syncInput();
  }

  function setMult(m) {
    mult = m;
    document.querySelectorAll('.upg-mult').forEach(b =>
      b.classList.toggle('sel', +b.dataset.m === m));
    update();
  }

  function go() {
    if (spinning) return;
    const target = Math.round(bet * mult);
    if (!Store.canAfford(bet)) {
      return Store.toast(Store.demoMode
        ? 'Демо-баланс закончился — включи демо заново'
        : 'Недостаточно звёзд ★ (нужно ' + bet + ')');
    }

    const c = chance();
    const win = Math.random() * 100 < c;

    /* стрелка визуально падает в свой сектор:
       зелёный сектор по центру снизу (180°), вне его — тёмная зона */
    const wHalf = c * 1.8;
    let angle;
    if (win) angle = 180 + (Math.random() * 2 - 1) * wHalf * 0.85;
    else angle = (180 + wHalf + Math.random() * (360 - 2 * wHalf)) % 360;

    spinning = true;
    const btn = el('upg-go');
    const arrow = el('upg-arrow');
    btn.disabled = true;
    btn.className = 'upg-go';
    btn.textContent = 'Крутим...';

    Store.add(-bet);
    Store.recordBet('Апгрейдер', bet);

    if (arrow) {
      arrow.style.transition = 'none';
      arrow.style.transform = 'rotate(0deg)';
      void arrow.offsetWidth;
      arrow.style.transition = 'transform 2.8s cubic-bezier(.15,.85,.12,1)';
      arrow.style.transform = 'rotate(' + (1440 + angle) + 'deg)';
    }

    let tick = 0;
    const timer = setInterval(() => {
      if (Store.tg) { try { Store.tg.HapticFeedback.selectionChanged(); } catch (e) {} }
      if (++tick > 70) clearInterval(timer);
    }, 35);

    setTimeout(() => {
      spinning = false;
      btn.disabled = false;
      if (win) {
        if (Store.tg) { try { Store.tg.HapticFeedback.notificationOccurred('success'); } catch (e) {} }
        Store.add(target);
        Store.recordWin(mult, target, 'Апгрейдер');
        btn.className = 'upg-go green';
        btn.textContent = 'Выигрыш +★ ' + target;
        Store.toast('Апгрейд удался: +★ ' + target);
      } else {
        if (Store.tg) { try { Store.tg.HapticFeedback.notificationOccurred('error'); } catch (e) {} }
        Store.recordLoss('Апгрейдер', bet);
        btn.className = 'upg-go red';
        btn.textContent = 'Не повезло · −★ ' + bet;
        Store.toast('Апгрейд не удался');
      }
      setTimeout(() => {
        btn.className = 'upg-go';
        update();
      }, 1700);
    }, 2950);
  }

  function mount(root) {
    const maxBal = Store.demoMode ? Store.demoBalance : Store.balance;
    bet = Math.max(MIN, Math.min(50, Math.floor(maxBal / 4) || MIN));
    mult = 2;
    spinning = false;

    root.innerHTML =
      '<div class="upg-wrap">' +
      '<div class="upg-gauge" id="upg-gauge">' +
      '<div class="upg-ring"></div><div class="upg-ticks"></div>' +
      '<div class="upg-arrow" id="upg-arrow"></div>' +
      '<div class="upg-center"><div class="upg-c-val" id="upg-c-val"><b>★ ' + (bet * mult) + '</b></div>' +
      '<div class="upg-c-l">выигрыш</div></div></div>' +
      '<div class="upg-chancerow"><span class="upg-chance" id="upg-chance">0%</span>' +
      '<span class="upg-chance-l">шанс</span></div>' +

      '<div class="upg-selects">' +
      '<div class="upg-panel"><div class="upg-p-title">Ваш подарок</div>' +
      '<div class="upg-p-val" id="upg-bet-v"><b>★ ' + bet + '</b></div></div>' +
      '<div class="upg-sep">→</div>' +
      '<div class="upg-panel"><div class="upg-p-title">Хочу получить</div>' +
      '<div class="upg-p-val" id="upg-target-v"><b>★ ' + (bet * mult) + '</b></div></div></div>' +

      '<div class="upg-mults">' +
      MULTS.map(m => '<button class="upg-mult' + (m === mult ? ' sel' : '') +
        '" data-m="' + m + '">x' + m + '</button>').join('') +
      '</div>' +

      '<div class="upg-betrow">' +
      '<button class="upg-step" id="upg-minus">−</button>' +
      '<input class="upg-input" id="upg-input" type="number" inputmode="numeric" value="' + bet + '">' +
      '<button class="upg-step" id="upg-plus">+</button>' +
      '<button class="upg-max" id="upg-max">MAX</button></div>' +

      '<div class="upg-quick">' +
      [10, 50, 100, 500].map(v => '<button data-q="' + v + '">' + v + '</button>').join('') +
      '</div>' +

      '<button class="upg-go" id="upg-go">⌃  Улучшить</button>' +
      '<div class="upg-note">Чем выше множитель — тем ниже шанс. Выигрыш зачисляется сразу.</div>' +
      '</div>';

    root.querySelectorAll('.upg-mult').forEach(b =>
      b.addEventListener('click', () => { if (!spinning) setMult(+b.dataset.m); }));

    el('upg-input').addEventListener('input', () => {
      bet = Math.floor(+el('upg-input').value || 0);
      if (bet < MIN) bet = MIN;
      update();
    });
    el('upg-minus').addEventListener('click', () => {
      bet = Math.max(MIN, bet - Math.max(MIN, Math.round(bet * 0.25)));
      update();
    });
    el('upg-plus').addEventListener('click', () => {
      bet = bet + Math.max(MIN, Math.round(bet * 0.25));
      update();
    });
    el('upg-max').addEventListener('click', () => {
      bet = Math.floor(Store.demoMode ? Store.demoBalance : Store.balance);
      update();
    });
    root.querySelectorAll('[data-q]').forEach(b =>
      b.addEventListener('click', () => { bet = +b.dataset.q; update(); }));

    el('upg-go').addEventListener('click', go);
    update();
  }

  return { mount };
})();
