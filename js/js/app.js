/* app.js — навигация и пополнение */

const root = document.getElementById('game-root');

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nav = document.querySelector('.nav-btn[data-nav="' + name + '"]');
  if (nav) nav.classList.add('active');
  const scr = document.getElementById('screen-' + name);
  if (scr) scr.classList.add('active');
  document.querySelector('main').scrollTop = 0;
}

document.querySelectorAll('.nav-btn').forEach(b =>
  b.addEventListener('click', () => showScreen(b.dataset.nav)));

document.querySelectorAll('.btn-back').forEach(b =>
  b.addEventListener('click', () => showScreen(b.dataset.nav)));

/* открытие игр */
document.querySelectorAll('.game-card, .promo-card').forEach(c =>
  c.addEventListener('click', () => openGame(c.dataset.game)));

const Games = {}; // заполняется game-файлами через Games['mines'] = {mount, unmount}

function openGame(name) {
  if (name === 'cases') { showScreen('cases'); return; }
  if (!Games[name]) return;
  if (Games._current && Games[Games._current].unmount) Games[Games._current].unmount();
  Games._current = name;
  root.innerHTML = '';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const play = document.getElementById('screen-play');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  play.classList.add('active');
  Games[name].mount(root);
  document.querySelector('main').scrollTop = 0;
}

/* пополнение звёздами */
const modal = document.getElementById('deposit-modal');
function openDeposit() {
  if (!(Store.tg && Store.tg.initData)) {
    return Store.toast('Открой мини-апп через бота, чтобы пополнить ⭐');
  }
  if (!API_URL) {
    return Store.toast('Оплата будет работать после подключения бота ⭐');
  }
  modal.classList.remove('hidden');
}
function depositStars() { openDeposit(); }

document.getElementById('btn-deposit').addEventListener('click', depositStars);
const dep2 = document.getElementById('btn-deposit-2');
if (dep2) dep2.addEventListener('click', depositStars);
document.getElementById('deposit-close').addEventListener('click', () =>
  modal.classList.add('hidden'));

modal.querySelectorAll('[data-amt]').forEach(b =>
  b.addEventListener('click', () => {
    const amount = +b.dataset.amt;
    modal.classList.add('hidden');
    fetch(API_URL + '/api/deposit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initData: Store.tg.initData, amount })
    }).then(r => r.json()).then(d => {
      if (!d.ok) return Store.toast('Ошибка: ' + (d.error || 'попробуй позже'));
      if (Store.tg.openInvoice) {
        Store.tg.openInvoice(d.url);
        if (Store.tg.onEvent) {
          Store.tg.onEvent('invoiceClosed', ev => {
            if (ev.status === 'paid') {
              Store.toast('✅ Оплачено! Баланс обновляется...');
              setTimeout(() => Store.sync(), 1500);
            }
          });
        }
      } else {
        Store.tg.openTelegramLink(d.url);
      }
    }).catch(() => Store.toast('Ошибка соединения'));
  }));
document.getElementById('btn-demo-toggle').addEventListener('click', () => Store.toggleDemo());
document.getElementById('promo-btn').addEventListener('click', () =>
  Store.usePromo(document.getElementById('promo-input').value));
document.getElementById('invite-btn').addEventListener('click', () => Store.invite());
document.getElementById('top-avatar').addEventListener('click', () => showScreen('profile'));

/* живые счётчики "играют" на карточках */
function shuffleLive() {
  document.querySelectorAll('.game-card .live-n').forEach(el => {
    el.textContent = 5 + Math.floor(Math.random() * 45);
  });
}
shuffleLive();
setInterval(shuffleLive, 6000);
            
