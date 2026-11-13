/* cases.js — кейсы v4: реальные подарки Telegram, ленты «Маркет», RTP-нормализация, демо */

Games.cases = (() => {
  /* Каталог подарков: m = предмет с рынка (можно продать дорого) */
  const G = (e, n, v, m) => ({ e, n, v, m: !!m });

  const GIFTS = {
    heart: G('💝', 'Сердечко', 15),
    bear: G('🧸', 'Мишка', 15),
    gift: G('🎁', 'Подарок', 25),
    rose: G('🌹', 'Роза', 25),
    cake: G('🎂', 'Торт', 50),
    bouquet: G('💐', 'Букет', 50),
    rocket: G('🚀', 'Ракета', 50),
    champagne: G('🍾', 'Шампанское', 50),
    trophy: G('🏆', 'Трофей', 100),
    ring: G('💍', 'Кольцо', 100),
    diamond: G('💎', 'Бриллиант', 100),
    icecream: G('🍦', 'Мороженое', 300, true),
    socks: G('🧦', 'Носки', 500, true),
    lollipop: G('🍭', 'Леденец', 505, true),
    lantern: G('🏮', 'Фонарь', 499, true),
    hammer: G('🔨', 'Молот', 438, true),
    flamingo: G('🦩', 'Фламинго', 460, true),
    cupcake: G('🧁', 'Капкейк', 460, true),
    bday: G('🎈', 'Happy B-day', 536, true),
    saber: G('🔦', 'Световой меч', 573, true),
    snake: G('🐍', 'Змея-2025', 434, true),
    jester: G('🃏', 'Шут', 480, true),
    medal: G('🏅', 'Медаль', 536, true),
    money: G('💸', 'Денежный букет', 536, true),
    keycap: G('⌨️', 'Клавиша-сердце', 574, true),
    book: G('📕', 'Книга', 530, true),
    monkey: G('🐒', 'Обезьяна', 734, true),
    dog: G('🐕', 'Пёс-рэпер', 536, true),
    cyl: G('🎩', 'Цилиндр', 536, true),
    moon: G('🌙', 'Полумесяц', 536, true),
    berry: G('🍰', 'Вишнёвый торт', 534, true),
    easter: G('🐣', 'Пасхальная корзина', 536, true),
    clover: G('🍀', 'Клевер', 536, true),
    backpack: G('🎒', 'Рюкзак', 536, true),
    torch: G('🔥', 'Факел', 490, true),
    mask: G('🎭', 'Маска Джейсона', 929, true),
    cigar: G('🚬', 'Сигара', 1443, true),
    statue: G('🗽', 'Статуя Свободы', 536, true)
  };

  const CASES = {
    bear: {
      id: 'bear', emoji: '🧸', name: 'Мишка', price: 35,
      items: [
        [GIFTS.heart, 22], [GIFTS.bear, 20], [GIFTS.gift, 16], [GIFTS.rose, 14],
        [GIFTS.cake, 12], [GIFTS.rocket, 6], [GIFTS.trophy, 4], [GIFTS.ring, 3],
        [GIFTS.diamond, 2], [GIFTS.icecream, .6], [GIFTS.socks, .3], [GIFTS.cigar, .1]
      ]
    },
    party: {
      id: 'party', emoji: '🎉', name: 'Праздник', price: 80,
      items: [
        [GIFTS.cake, 18], [GIFTS.bouquet, 16], [GIFTS.rocket, 14], [GIFTS.trophy, 12],
        [GIFTS.ring, 10], [GIFTS.diamond, 8], [GIFTS.icecream, 4], [GIFTS.lantern, 3],
        [GIFTS.lollipop, 2], [GIFTS.monkey, 1], [GIFTS.mask, .6], [GIFTS.cigar, .4]
      ]
    },
    lux: {
      id: 'lux', emoji: '👑', name: 'Люкс', price: 200,
      items: [
        [GIFTS.icecream, 26], [GIFTS.socks, 20], [GIFTS.lollipop, 16],
        [GIFTS.saber, 14], [GIFTS.monkey, 10], [GIFTS.mask, 8],
        [GIFTS.cigar, 4], [GIFTS.money, 2]
      ]
    }
  };

  /* нормализация: масштабируем веса так, чтобы RTP кейса = 97% */
  function normalize(c) {
    c.items = c.items.map(([g, w]) => ({ ...g, w }));
    const ev = c.items.reduce((s, i) => s + i.v * i.w, 0) /
      c.items.reduce((s, i) => s + i.w, 0);
    const k = (0.97 * c.price) / ev;
    c.items.forEach(i => i.w = i.w * k);
  }
  Object.values(CASES).forEach(normalize);

  let current = null, spinning = false, multi = 1, fast = false;

  function mount() {
    document.querySelectorAll('.case-card2').forEach(c =>
      c.addEventListener('click', () => showCase(c.dataset.case)));
    document.getElementById('btn-case-back').addEventListener('click', backToList);
    document.getElementById('btn-case-open').addEventListener('click', spin);
    document.querySelectorAll('.chip-m[data-n]').forEach(ch =>
      ch.addEventListener('click', () => {
        if (spinning) return;
        document.querySelectorAll('.chip-m[data-n]').forEach(x => x.classList.remove('sel'));
        ch.classList.add('sel');
        multi = +ch.dataset.n;
        updateBtn();
      }));
    document.getElementById('chip-fast').addEventListener('click', () =>
      document.getElementById('chip-fast').classList.toggle('sel'));
  }

  function updateBtn() {
    if (!current) return;
    document.getElementById('btn-case-open').textContent =
      'Открыть за ' + (current.price * multi) + ' ★';
  }

  function showCase(key) {
    const c = CASES[key];
    current = c;
    document.getElementById('cases-select').classList.add('hidden');
    const op = document.getElementById('case-opener');
    op.classList.remove('hidden');
    document.getElementById('ch-emoji').textContent = c.emoji;
    document.getElementById('ch-name').textContent = c.name + (Store.demoMode ? ' · ДЕМО' : '');
    document.getElementById('ch-sub').textContent =
      c.items.length + ' предметов · RTP 97%' + (Store.demoMode ? ' · ДЕМО-ШАНСЫ' : '');
    document.getElementById('case-result').innerHTML = '';
    updateBtn();
    renderPreview(c);
    renderDrops(c);
  }

  function backToList() {
    document.getElementById('case-opener').classList.add('hidden');
    document.getElementById('cases-select').classList.remove('hidden');
    current = null;
  }

  function ribbon(g) {
    return g.m ? '<span class="market-ribbon">Маркет</span>' : '';
  }

  function stripItemHTML(g) {
    return '<div class="strip-item t-' + tier(g) + '">' + ribbon(g) +
      '<span class="si-e">' + g.e + '</span>' +
      '<div class="ginfo"><div class="gn">' + g.n + '</div>' +
      '<div class="gp"><i>★</i> ' + g.v + '</div></div></div>';
  }

  /* цветовая тема предмета по редкости */
  function tier(g) {
    if (g.m) return g.v >= 900 ? 'gold' : 'blue';
    if (g.v >= 100) return 'purple';
    if (g.v >= 50) return 'red';
    if (g.v >= 25) return 'pink';
    return 'common';
  }

  function renderPreview(c) {
    const strip = document.getElementById('case-strip');
    strip.style.transition = 'none';
    strip.style.left = '0px';
    strip.innerHTML = '';
    for (let i = 0; i < 14; i++)
      strip.insertAdjacentHTML('beforeend', stripItemHTML(c.items[i % c.items.length]));
  }

  function renderDrops(c) {
    const grid = document.getElementById('drop-grid');
    grid.innerHTML = c.items.map((g, i) =>
      '<div class="drop-card d-' + tier(g) + '" style="animation-delay:' + (i * 0.04) + 's">' +
      ribbon(g) +
      '<span class="dc-e">' + g.e + '</span>' +
      '<div class="ginfo"><div class="gn">' + g.n + '</div>' +
      '<div class="gp"><i>★</i> ' + g.v + '</div></div></div>').join('');
  }

  function roll(c) {
    /* Luck: жёсткий RTP — чаще дешёвые, щедрый (демо) — чаще дорогие */
    const f = Luck.f(c.price, true);
    const maxV = Math.max(...c.items.map(i => i.v));
    let bias = 0;
    if (f < 0.95) bias = (0.95 - f) * 2.5;
    const ws = c.items.map(g => {
      let w = g.w;
      if (bias > 0) w = w / (1 + bias * 1.6 * (g.v / maxV));
      if (f > 1.05) w = w * (1 + (f - 1.05) * 2.2 * (g.v / maxV));
      return w;
    });
    const total = ws.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < c.items.length; i++) { r -= ws[i]; if (r <= 0) return c.items[i]; }
    return c.items[0];
  }

  function spin() {
    if (!current || spinning) return;
    const c = current;
    const price = c.price * multi;
    if (!Store.canAfford(price)) {
      return Store.toast(Store.demoMode
        ? 'Демо-баланс закончился — выключи и включи демо 🎮'
        : 'Недостаточно звёзд ⭐ (нужно ' + price + ')');
    }
    Store.add(-price);
    Store.recordBet('Кейс ' + c.name, price);
    spinning = true;

    const prizes = [];
    for (let i = 0; i < multi; i++) prizes.push(roll(c));

    const strip = document.getElementById('case-strip');
    const result = document.getElementById('case-result');
    const btn = document.getElementById('btn-case-open');
    btn.disabled = true;
    result.innerHTML = '';

    strip.style.transition = 'none';
    strip.style.left = '0px';
    strip.innerHTML = '';
    for (let i = 0; i < 60; i++) strip.insertAdjacentHTML('beforeend', stripItemHTML(roll(c)));
    strip.children[52].outerHTML = stripItemHTML(prizes[0]);

    const itemW = strip.firstElementChild
      ? strip.firstElementChild.getBoundingClientRect().width + 10 : 122;
    const wrap = strip.parentElement;
    const jitter = (Math.random() - 0.5) * 40;
    const target = wrap.clientWidth / 2 - (52 * itemW + 59) + jitter;
    const dur = fast ? 1.4 : 4.2;

    requestAnimationFrame(() => {
      strip.style.transition = 'left ' + dur + 's cubic-bezier(.08,.85,.12,1)';
      strip.style.left = target + 'px';
    });

    let tickIdx = 0;
    const tickTimer = setInterval(() => {
      if (Store.tg) { try { Store.tg.HapticFeedback.selectionChanged(); } catch (e) {} }
      if (++tickIdx > 90) clearInterval(tickTimer);
    }, fast ? 20 : 60);

    setTimeout(() => showResults(c, prizes, btn), dur * 1000 + 250);
  }

  function showResults(c, prizes, btn) {
    spinning = false;
    const result = document.getElementById('case-result');
    if (Store.tg) { try { Store.tg.HapticFeedback.notificationOccurred('success'); } catch (e) {} }

    if (prizes.length === 1) {
      const g = prizes[0];
      Store.recordWin(g.v / c.price, g.v, 'Кейс ' + c.name);
      result.innerHTML =
        '<div class="result-card">' +
        '<div class="drop-card d-' + tier(g) + '">' + ribbon(g) +
        '<span class="dc-e">' + g.e + '</span>' +
        '<div class="ginfo"><div class="gn">' + g.n + '</div>' +
        '<div class="gp"><i>★</i> ' + g.v + '</div></div></div></div>' +
        '<div class="rc-actions">' +
        '<button class="rc-btn rc-sell">Продать ★ ' + g.v + '</button>' +
        '<button class="rc-btn rc-keep">🎒 В инвентарь</button>' +
        '</div>';
      result.querySelector('.rc-sell').addEventListener('click', () => {
        Store.add(g.v);
        result.querySelector('.rc-actions').remove();
        Store.toast((Store.demoMode ? '(демо) ' : '') + 'Продано за ★ ' + g.v);
        btn.disabled = false;
      });
      result.querySelector('.rc-keep').addEventListener('click', () => {
        Store.addToInv(Object.assign({}, g, { r: tier(g) }));
        result.querySelector('.rc-actions').remove();
        Store.toast('🎒 ' + (Store.demoMode ? '(демо) ' : '') + 'Предмет в инвентаре');
        btn.disabled = false;
      });
    } else {
      const sum = prizes.reduce((s, g) => s + g.v, 0);
      prizes.forEach(g => Store.recordWin(g.v / c.price, g.v, 'Кейс ' + c.name));
      result.innerHTML =
        '<div class="multi-grid">' +
        prizes.map((g, i) =>
          '<div class="multi-item d-' + tier(g) + '" style="animation-delay:' + (i * 0.08) + 's">' +
          ribbon(g) + '<span class="ie">' + g.e + '</span>' +
          '<div class="ginfo"><div class="gn">' + g.n + '</div>' +
          '<div class="gp"><i>★</i> ' + g.v + '</div></div>').join('') +
        '</div>' +
        '<div class="rc-actions">' +
        '<button class="rc-btn rc-sell">Продать всё ★ ' + sum + '</button>' +
        '<button class="rc-btn rc-keep">🎒 Всё в инвентарь</button>' +
        '</div>';
      result.querySelector('.rc-sell').addEventListener('click', () => {
        Store.add(sum);
        result.querySelector('.rc-actions').remove();
        Store.toast((Store.demoMode ? '(демо) ' : '') + 'Продано всё за ★ ' + sum);
        btn.disabled = false;
      });
      result.querySelector('.rc-keep').addEventListener('click', () => {
        prizes.forEach(g => Store.addToInv(Object.assign({}, g, { r: tier(g) })));
        result.querySelector('.rc-actions').remove();
        Store.toast('🎒 ' + (Store.demoMode ? '(демо) ' : '') + 'Всё в инвентаре');
        btn.disabled = false;
      });
    }
  }

  return { mount };
})();

Games.cases.mount();
