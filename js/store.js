/* store.js — баланс, уровни, статистика, история, Telegram интеграция */
const API_URL = window.CASINO_API_URL || '';

const Store = {
  balance: 0,
  stats: { bets: 0, wins: 0, best: 0, xp: 0, history: [], staked: 0, won: 0 },
  inventory: [],
  withdrawals: [],
  promoUsed: [],
  demoMode: false,
  demoBalance: 0,
  online: false,
  session: { games: 0, avgBet: 0 },
  tg: window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null,
  user: null,

  load() {
    try {
      const raw = localStorage.getItem('casino_save');
      if (raw) {
        const d = JSON.parse(raw);
        this.balance = d.balance || 0;
        this.stats = Object.assign(
          { bets: 0, wins: 0, best: 0, xp: 0, history: [] }, d.stats);
        if (!Array.isArray(this.stats.history)) this.stats.history = [];
        this.inventory = Array.isArray(d.inventory) ? d.inventory : [];
        this.promoUsed = Array.isArray(d.promoUsed) ? d.promoUsed : [];
      }
    } catch (e) {}
    if (this.tg) {
      try {
        this.tg.ready();
        this.tg.expand();
        this.tg.setHeaderColor('#0e1220');
        this.tg.setBackgroundColor('#0e1220');
        this.user = this.tg.initDataUnsafe.user || null;
      } catch (e) {}
    }
    this.render();
    if (API_URL && this.tg && this.tg.initData) this.sync();
  },

  sync() {
    fetch(API_URL + '/api/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initData: this.tg.initData })
    }).then(r => r.json()).then(d => {
      if (!d.ok) return;
      this.online = true;
      this.balance = d.user.balance;
      if (d.user.stats && d.user.stats.bets != null) {
        this.stats = Object.assign(this.stats, d.user.stats);
      }
      if (!Array.isArray(d.user.inventory) && d.user.inventory) this.inventory = d.user.inventory;
      if (Array.isArray(d.user.inventory) && d.user.inventory.length && !this.inventory.length) {
        this.inventory = d.user.inventory;
      }
      this.withdrawals = Array.isArray(d.withdrawals) ? d.withdrawals : [];
      this.render();
    }).catch(() => {});
  },

  _settle(amount) {
    fetch(API_URL + '/api/settle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initData: this.tg.initData, amount })
    }).then(r => r.json()).then(d => {
      if (d.ok) { this.balance = d.balance; this.render(); }
    }).catch(() => {});
  },

  /* ---------- вывод звёзд (заявка) ---------- */
  requestWithdraw(amount) {
    if (this.demoMode) return this.toast('В демо-режиме вывод недоступен');
    if (!API_URL || !this.tg || !this.tg.initData) return this.toast('Открой мини-апп через бота, чтобы вывести');
    amount = Math.floor(+amount || 0);
    if (amount < 50) return this.toast('Минимум 50 ★ для вывода');
    if (amount > this.balance) return this.toast('Недостаточно звёзд');
    fetch(API_URL + '/api/withdraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initData: this.tg.initData, amount })
    }).then(r => r.json()).then(d => {
      if (!d.ok) {
        const msg = { min: 'Минимум 50 ★', funds: 'Недостаточно звёзд' }[d.error] || 'Ошибка, попробуй позже';
        return this.toast('Ошибка: ' + msg);
      }
      this.balance = d.balance;
      this.withdrawals = Array.isArray(d.withdrawals) ? d.withdrawals : this.withdrawals;
      this.render();
      this.toast('Заявка на ★ ' + amount + ' создана · статус: в обработке');
    }).catch(() => this.toast('Ошибка соединения'));
  },

  save() {
    this.stats.history = (this.stats.history || []).slice(0, 20);
    localStorage.setItem('casino_save', JSON.stringify({
      balance: this.balance, stats: this.stats,
      inventory: this.inventory, promoUsed: this.promoUsed
    }));
  },

  addToInv(item) {
    this.inventory.unshift({ e: item.e, n: item.n, v: item.v, r: item.r || 'common', m: item.m, a: item.a, d: this.demoMode ? 1 : 0, t: Date.now() });
    this.save(); this.render();
  },

  sellItem(idx) {
    const it = this.inventory[idx];
    if (!it) return;
    this.inventory.splice(idx, 1);
    this.add(it.v);
    this.toast('Продано: ' + it.n + ' за ★ ' + it.v);
  },

  PROMOS: { 'STAR': 10, 'BONUS': 25, 'HALLOW': 50 },

  usePromo(code) {
    const c = (code || '').trim().toUpperCase();
    if (!c) return this.toast('Введи промокод');
    if (!this.PROMOS[c]) return this.toast('❌ Неверный промокод');
    if (this.promoUsed.includes(c)) return this.toast('Уже использован');
    this.promoUsed.push(c);
    this.add(this.PROMOS[c]);
    this.toast('✅ Промокод активирован: +' + this.PROMOS[c] + ' ★');
  },

  invite() {
    const link = 'https://t.me/share/url?url=' +
      encodeURIComponent('https://t.me/YourCasinoBot/app') +
      '&text=' + encodeURIComponent('🎰 Заходи играть в FarerUp!');
    if (this.tg) {
      try { this.tg.openTelegramLink(link); return; } catch (e) {}
    }
    try { navigator.clipboard.writeText('https://t.me/YourCasinoBot/app'); } catch (e) {}
    this.toast('Ссылка скопирована 🔗');
  },

  add(amount) {
    if (this.online && !this.demoMode) {
      this.balance = Math.round((this.balance + amount) * 100) / 100;
      if (this.balance < 0) this.balance = 0;
      this.render();
      const chip = document.querySelector('.balance-chip');
      if (chip) {
        chip.classList.remove('pop');
        void chip.offsetWidth;
        chip.classList.add('pop');
      }
      this._settle(Math.round(amount));
      return;
    }
    if (this.demoMode) {
      this.demoBalance = Math.round((this.demoBalance + amount) * 100) / 100;
      if (this.demoBalance < 0) this.demoBalance = 0;
    } else {
      this.balance = Math.round((this.balance + amount) * 100) / 100;
      if (this.balance < 0) this.balance = 0;
      this.save();
    }
    this.render();
    const chip = document.querySelector('.balance-chip');
    if (chip) {
      chip.classList.remove('pop');
      void chip.offsetWidth;
      chip.classList.add('pop');
    }
  },

  canAfford(amount) {
    return this.demoMode ? this.demoBalance >= amount : this.balance >= amount;
  },

  toggleDemo() {
    this.demoMode = !this.demoMode;
    if (this.demoMode) {
      this.demoBalance = 1000;
      this.toast('🎮 Демо-режим: 1000 ★ для кейсов. Выигрыши ненастоящие');
    } else {
      this.toast('Возврат к реальному балансу');
    }
    this.save(); this.render();
  },

  get level() { return 1 + Math.floor(this.stats.xp / 500); },

  pushHistory(game, bet, win) {
    this.stats.history.unshift({
      g: game, b: bet, w: win, t: Date.now()
    });
  },

  recordBet(game, bet) {
    this.stats.bets++;
    if (bet > 0) this.stats.xp += bet;
    if (!this.demoMode) {
      this.stats.staked = (this.stats.staked || 0) + bet;
      this.session.games++;
      this.session.avgBet = this.session.avgBet
        ? this.session.avgBet * 0.8 + bet * 0.2 : bet;
    }
    if (game) this.pushHistory(game, bet, 0);
    this.save(); this.render();
  },

  recordWin(mult, win, game) {
    this.stats.wins++;
    if (mult > this.stats.best) this.stats.best = Math.round(mult * 100) / 100;
    if (!this.demoMode) this.stats.won = (this.stats.won || 0) + win;
    if (game && this.stats.history[0]) this.stats.history[0].w = win;
    this.save(); this.render();
  },

  recordLoss(game, bet) {
    if (game) this.pushHistory(game, bet, 0);
    this.save(); this.render();
  },

  timeAgo(t) {
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return 'только что';
    if (m < 60) return m + ' мин назад';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' ч назад';
    return Math.floor(h / 24) + ' дн назад';
  },

  GAME_ICONS: {
    'Мины': 'ic-bomb', 'Ракетка': 'ic-rocket', 'Рулетка': 'ic-wheel',
    'Двери': 'ic-door', 'Плинко': 'ic-plinko', 'Кейс': 'ic-gift'
  },

  render() {
    const b = document.getElementById('balance');
    if (b) b.textContent = this.demoMode ? this.demoBalance : this.balance;
    const chip = document.querySelector('.balance-chip');
    if (chip) chip.classList.toggle('demo', this.demoMode);
    const db = document.getElementById('demo-banner');
    if (db) db.classList.toggle('show', this.demoMode);
    const dt = document.getElementById('btn-demo-toggle');
    if (dt) dt.textContent = this.demoMode ? 'Выключить демо-режим' : 'Включить демо-режим';

    const s = this.stats;
    const rate = s.bets ? Math.round(s.wins / s.bets * 100) : 0;
    const eb = document.getElementById('st-bets'); if (eb) eb.textContent = s.bets;
    const ew = document.getElementById('st-wins'); if (ew) ew.textContent = s.wins;
    const er = document.getElementById('st-rate'); if (er) er.textContent = rate + '%';
    const es = document.getElementById('st-best'); if (es) es.textContent = 'x' + s.best;

    /* уровень и XP */
    const lvl = this.level;
    const xpIn = s.xp % 500;
    const el = document.getElementById('p-level'); if (el) el.textContent = 'LVL ' + lvl;
    const xf = document.getElementById('xp-fill'); if (xf) xf.style.width = (xpIn / 5) + '%';
    const xl = document.getElementById('xp-label');
    if (xl) xl.textContent = xpIn + ' / 500 XP до LVL ' + (lvl + 1);

    if (this.user) {
      const pn = document.getElementById('p-name');
      if (pn) pn.textContent = this.user.first_name || 'Игрок';
      const pi = document.getElementById('p-id');
      if (pi) pi.textContent = 'ID: ' + this.user.id;
      const av = document.getElementById('p-avatar');
      const tav = document.getElementById('top-avatar');
      if (this.user.photo_url) {
        const css = "url('" + this.user.photo_url + "') center/cover";
        if (av) { av.style.background = css; av.textContent = ''; }
        if (tav) { tav.style.background = css; tav.textContent = ''; }
      }
    }
    this.renderHistory();
    this.renderInv();
    this.renderWithdrawals();
  },

  renderWithdrawals() {
    const box = document.getElementById('wd-list');
    const sub = document.getElementById('wd-sub');
    if (sub) sub.textContent = this.withdrawals.length
      ? 'Заявок: ' + this.withdrawals.length
      : 'Заявок нет';
    if (!box) return;
    if (!this.withdrawals.length) {
      box.innerHTML = '<div class="wd-empty">Заявок пока нет — минимальный вывод 50 ★</div>';
      return;
    }
    box.innerHTML = this.withdrawals.map(w =>
      '<div class="wd-row">' +
      '<div><div class="wd-amount">★ ' + w.amount + '</div>' +
      '<div class="wd-date">' + this.timeAgo(w.ts) + '</div></div>' +
      '<div class="wd-status">' + (w.status === 'pending' ? 'В обработке' : (w.status === 'done' ? 'Выплачено' : 'Отклонено')) + '</div>' +
      '</div>'
    ).join('');
  },

  renderInv() {
    const grid = document.getElementById('inv-grid');
    const sub = document.getElementById('inv-sub');
    if (!grid) return;
    const mode = this.demoMode ? 1 : 0;
    const items = this.inventory
      .map((it, i) => ({ it, i }))
      .filter(x => (x.it.d ? 1 : 0) === mode);
    const sum = items.reduce((s, x) => s + x.it.v, 0);
    if (sub) sub.textContent = items.length + ' предметов · ' + sum + ' ★';
    if (!items.length) {
      grid.innerHTML = '<div class="inv-empty">' + (this.demoMode
        ? 'Демо-инвентарь пуст — выигрыши в демо попадают сюда'
        : 'Пусто — открой кейс, чтобы получить предметы') + '</div>';
      return;
    }
    grid.innerHTML = items.map(x => {
      const it = x.it;
      const art = it.a
        ? '<svg class="gi-art inv"><use href="#' + it.a + '"/></svg>'
        : '<span class="ie">' + it.e + '</span>';
      return '<div class="inv-item r-' + it.r + '" data-i="' + x.i + '">' +
        (it.m ? '<span class="market-ribbon">Маркет</span>' : '') +
        art +
        '<span class="price-pill">★ ' + it.v + '</span>' +
        '<span class="ilock"><svg viewBox="0 0 24 24"><use href="#ic-lock"/></svg></span></div>';
    }).join('');
    grid.querySelectorAll('.inv-item').forEach(el =>
      el.addEventListener('click', () => {
        if (el.querySelector('.isell')) return;
        const i = +el.dataset.i;
        const btn = document.createElement('button');
        btn.className = 'isell';
        btn.textContent = 'Продать ★ ' + this.inventory[i].v;
        el.appendChild(btn);
        btn.addEventListener('click', e => {
          e.stopPropagation();
          this.sellItem(i);
        });
      }));
  },

  renderHistory() {
    const box = document.getElementById('history');
    if (!box) return;
    const h = this.stats.history || [];
    if (!h.length) {
      box.innerHTML = '<div class="history-empty">Пока пусто — сыграй первую игру</div>';
      return;
    }
    box.innerHTML = h.map((r, i) => {
      const win = r.w > 0;
      return '<div class="history-row" style="animation-delay:' + (i * 0.04) + 's">' +
        '<div class="hr-icon"><svg class="hicon"><use href="#' + (this.GAME_ICONS[r.g] || this.GAME_ICONS[(r.g || '').split(' ')[0]] || 'ic-gift') + '"/></svg></div>' +
        '<div class="hr-main">' +
        '<div class="hr-game">' + r.g + '</div>' +
        '<div class="hr-time">' + this.timeAgo(r.t) + '</div></div>' +
        '<div class="hr-res">' +
        '<div class="hr-amount ' + (win ? 'plus' : 'minus') + '">' +
        (win ? '+' : '-') + (win ? r.w : r.b) + ' ★</div>' +
        '<div class="hr-mult">' + (win ? 'выигрыш' : 'проигрыш') + '</div>' +
        '</div></div>';
    }).join('');
  },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2200);
  }
};

Store.load();
