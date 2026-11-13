/* upgrade.js — Апгрейдер v3: подарок → цель, шанс, колесо (сектор снизу) */

Games.upgrade = (() => {
  const GIFTS = [
    { e: '💝', n: 'Сердечко', v: 15 },
    { e: '🎁', n: 'Подарок', v: 25 },
    { e: '🎂', n: 'Торт', v: 50 },
    { e: '🏆', n: 'Трофей', v: 100 },
    { e: '🧸', n: 'Мишка', v: 220, a: 'g-bear' },
    { e: '💎', n: 'Бриллиант', v: 536 },
    { e: '👑', n: 'Корона', v: 1000, a: 'g-crown' },
    { e: '🎈', n: 'Шарики', v: 1800, a: 'g-balloons' },
    { e: '🚀', n: 'Ракета', v: 3500 },
    { e: '🌟', n: 'Звезда', v: 6000 }
  ];
  const MULTS = [1.5, 2, 4, 8, 16, 50];

  let gi = 2, mult = 2, spinning = false;

  const el = id => document.getElementById(id);
  const gift = () => GIFTS[gi];

  function targetGift() {
    const want = Math.round(gift().v * mult);
    for (const g of GIFTS) if (g.v >= want) return { g, v: g.v };
    return { g: { e: '⭐', n: 'Звёзды' }, v: want };
  }

  function chance() {
    const f = Luck.f(gift().v);
    const c = (100 / mult) * 0.92 * (0.55 + 0.45 * Math.min(1.05, f));
    return Math.max(2, Math.min(92, Math.round(c)));
  }

  function update() {
    const tg = targetGift();
    const c = chance();

    const bv = el('upg-bet-v');
    if (bv) bv.innerHTML = '<b>' + gift().n + '</b> · ★ ' + gift().v;
    const tv = el('upg-target-v');
    if (tv) tv.innerHTML = '<b>' + tg.g.n + '</b> · ★ ' + tg.v;
    const cv = el('upg-c-val');
    if (cv) cv.innerHTML = tg.g.a
      ? '<svg class="gi-art upg-c"><use href="#' + tg.g.a + '"/></svg>'
      : '<span class="upg-c-e">' + (tg.g.e || '⭐') + '</span>';
    const ch = el('upg-chance');
    if (ch) ch.textContent = c + '%';

    const g = el('upg-gauge');
    if (g) {
      const half = c * 1.8;
      g.style.setProperty('--ws', (90 - half) + 'deg');
      g.style.setProperty('--we', (90 + half) + 'deg');
    }
    const go = el('upg-go');
    if (go && !spinning) go.textContent = '⌃  Улучшить до ' + tg.g.n;

    document.querySelectorAll('.ugift').forEach(b =>
      b.classList.toggle('sel', +b.dataset.i === gi));
  }

  function setMult(m) {
    mult = m;
    document.querySelectorAll('.upg-mult').forEach(b =>
      b.classList.toggle('sel', +b.dataset.m === m));
    update();
  }

  function go() {
    if (spinning) return;
    const g = gift();
    const tg = targetGift();
    if (!Store.canAfford(g.v)) {
      return Store.toast(Store.demoMode
        ? 'Демо-баланс закончился — включи демо заново'
        : 'Недостаточно звёзд ★ (нужно ' + g.v + ')');
    }

    const c = chance();
    const win = Math.random() * 100 < c;

    /* стрелка визуально падает в свой сектор: зелёный по центру снизу */
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

    Store.add(-g.v);
    Store.recordBet('Апгрейдер', g.v);

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
        Store.add(tg.v);
        Store.recordWin(tg.v / g.v, tg.v, 'Апгрейдер');
        if (tg.g.e && tg.g.e !== '⭐') {
          Store.addToInv(Object.assign({}, tg.g, { r: 'gold' }));
        }
        btn.className = 'upg-go green';
        btn.textContent = 'Выигрыш: ' + tg.g.n + ' +★ ' + tg.v;
        Store.toast('Апгрейд удался: ' + tg.g.n + ' (+★ ' + tg.v + ')');
      } else {
        if (Store.tg) { try { Store.tg.HapticFeedback.notificationOccurred('error'); } catch (e) {} }
        Store.recordLoss('Апгрейдер', g.v);
        btn.className = 'upg-go red';
        btn.textContent = 'Не повезло · −★ ' + g.v;
        Store.toast('Апгрейд не удался');
      }
      setTimeout(() => {
        btn.className = 'upg-go';
        update();
      }, 1700);
    }, 2950);
  }

  function mount(root) {
    gi = 2; mult = 2; spinning = false;

    root.innerHTML =
      '<div class="upg-wrap">' +
      '<div class="upg-gauge" id="upg-gauge">' +
      '<div class="upg-ring"></div><div class="upg-ticks"></div>' +
      '<div class="upg-arrow" id="upg-arrow"></div>' +
      '<div class="upg-center"><div class="upg-c-val" id="upg-c-val"><span class="upg-c-e">🎂</span></div>' +
      '<div class="upg-c-l">выигрыш</div></div></div>' +
      '<div class="upg-chancerow"><span class="upg-chance" id="upg-chance">0%</span>' +
      '<span class="upg-chance-l">шанс</span></div>' +

      '<div class="upg-selects">' +
      '<div class="upg-panel"><div class="upg-p-title">Ваш подарок</div>' +
      '<div class="upg-p-val" id="upg-bet-v"></div></div>' +
      '<div class="upg-sep">→</div>' +
      '<div class="upg-panel"><div class="upg-p-title">Хочу получить</div>' +
      '<div class="upg-p-val" id="upg-target-v"></div></div></div>' +

      '<div class="ugifts">' +
      GIFTS.map((g, i) =>
        '<button class="ugift" data-i="' + i + '">' +
        (g.a ? '<svg class="gi-art ugift-a"><use href="#' + g.a + '"/></svg>'
             : '<span class="ugift-e">' + g.e + '</span>') +
        '<span class="ugift-v">★ ' + g.v + '</span></button>').join('') +
      '</div>' +

      '<div class="upg-mults">' +
      MULTS.map(m => '<button class="upg-mult' + (m === mult ? ' sel' : '') +
        '" data-m="' + m + '">x' + m + '</button>').join('') +
      '</div>' +

      '<button class="upg-go" id="upg-go">⌃  Улучшить</button>' +
      '<div class="upg-note">Выбери подарок, множитель — и крути. Чем выше множитель, тем ниже шанс.</div>' +
      '</div>';

    root.querySelectorAll('.ugift').forEach(b =>
      b.addEventListener('click', () => { if (!spinning) { gi = +b.dataset.i; update(); } }));

    root.querySelectorAll('.upg-mult').forEach(b =>
      b.addEventListener('click', () => { if (!spinning) setMult(+b.dataset.m); }));

    el('upg-go').addEventListener('click', go);
    update();
  }

  return { mount };
})();
