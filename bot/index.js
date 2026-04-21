require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');

// ── Tokenlar ─────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN || '8663168868:AAEiP28ktTGWhHUrKI7obVTF-aVZm1niuz0';
const ADMIN_ID  = process.env.ADMIN_ID  || '1116270596';
const WEBAPP_URL = process.env.WEBAPP_URL
  || process.env.RENDER_EXTERNAL_URL
  || 'https://chinor-zuv-bot-33ec.onrender.com';

console.log('🌐 WebApp URL:', WEBAPP_URL);

const bot = new Telegraf(BOT_TOKEN);

// ── SESSION: in-memory (local)
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// In-memory session store
const sessionStore = new Map();
bot.use(async (ctx, next) => {
  const key = ctx.from?.id;
  if (key && !sessionStore.has(key)) sessionStore.set(key, {});
  ctx.session = key ? sessionStore.get(key) : {};
  await next();
  if (key) sessionStore.set(key, ctx.session);
});

// ── Global state ─────────────────────────────────────────────
const activeOrders = new Map();   // orderId → { userId, cart, info, status }
let orderCounter = 1000;

// ============================================================
//  📦  MENU — Mahsulotlar katalogi
// ============================================================
const MENU = {
  ovqatlar: [
    { id: 'lav1',  emoji: '🌯', name: 'Lavash Classic',    price: 18000 },
    { id: 'lav2',  emoji: '🌯', name: 'Lavash Spicy',      price: 20000 },
    { id: 'brg1',  emoji: '🍔', name: 'Burger Classic',    price: 25000 },
    { id: 'brg2',  emoji: '🥩', name: 'Burger Double',     price: 35000 },
    { id: 'hot1',  emoji: '🌭', name: 'Hot-Dog',           price: 15000 },
    { id: 'frz1',  emoji: '🍟', name: 'Kartoshka Fri',     price: 12000 },
    { id: 'piz1',  emoji: '🍕', name: 'Mini Pizza',        price: 22000 },
    { id: 'sha1',  emoji: '🥙', name: 'Shawarma',          price: 19000 },
  ],
  ichimliklar: [
    { id: 'col1',  emoji: '🥤', name: 'Coca-Cola 0.5L',    price: 8000  },
    { id: 'fan1',  emoji: '🧃', name: 'Fanta 0.5L',        price: 8000  },
    { id: 'spr1',  emoji: '🫧', name: 'Sprite 0.5L',       price: 8000  },
    { id: 'suv1',  emoji: '💧', name: 'Mineral Suv',       price: 5000  },
    { id: 'ayran', emoji: '🥛', name: 'Ayron',             price: 7000  },
    { id: 'tea1',  emoji: '🍵', name: 'Issiq Choy',        price: 5000  },
  ],
};

const ALL_PRODUCTS = [...MENU.ovqatlar, ...MENU.ichimliklar];

const DELIVERY_PRICE = 10000; // So'm

// ── Upsell tavsiyalar (chekdan keyin ko'rsatiladi)
const UPSELL_MAP = {
  'lav1': { id: 'col1',  msg: '🥤 Lavash bilan Cola mis bo\'ladi! +8 000 so\'m' },
  'lav2': { id: 'col1',  msg: '🥤 Spicy lavashga sovuq Cola kerak! +8 000 so\'m' },
  'brg1': { id: 'frz1',  msg: '🍟 Burger + Kartoshka Fri — klassik juft! +12 000 so\'m' },
  'brg2': { id: 'fan1',  msg: '🧃 Double Burger + Fanta — super to\'ydiradi! +8 000 so\'m' },
  'hot1': { id: 'spr1',  msg: '🫧 Hot-Dog + Sprite — ajoyib kombinatsiya! +8 000 so\'m' },
  'frz1': { id: 'col1',  msg: '🥤 Fri + Cola — qanday mazali! +8 000 so\'m' },
  'piz1': { id: 'col1',  msg: '🥤 Pizza + Cola yonida bo\'lsin! +8 000 so\'m' },
  'sha1': { id: 'ayran', msg: '🥛 Shawarma + Ayron — o\'zbek usulida! +7 000 so\'m' },
};

// ── Helper: sessiya savatini olib kelish
function getCart(ctx) {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.cart) ctx.session.cart = [];
  return ctx.session.cart;
}

// ── Helper: mahsulotni ID bo'yicha topish
function findProduct(id) {
  return ALL_PRODUCTS.find(p => p.id === id);
}

// ── Helper: savat jami
function calcTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

// ── Helper: chiroyli narx formati
function fmt(num) {
  return num.toLocaleString('uz-UZ') + ' so\'m';
}

// ============================================================
//  🎨  CHEk GENERATORI  (Receipt Builder)
// ============================================================
function buildReceipt(orderId, order) {
  const { cart, info, status, total } = order;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const deliveryFee = DELIVERY_PRICE;
  const grandTotal = total + deliveryFee;

  // ── Mahsulotlar qatori
  let itemsBlock = '';
  cart.forEach(item => {
    const subtotal = item.price * item.qty;
    const namePart  = `${item.emoji} ${item.name}`.padEnd(22, ' ');
    itemsBlock += `${namePart}\n`;
    itemsBlock += `   ${item.qty} x ${fmt(item.price)} = <b>${fmt(subtotal)}</b>\n`;
  });

  // ── To'lov turi belgisi
  const paymentIcon = info.paymentType === 'naqd' ? '💵' : '💳';
  const paymentLabel = info.paymentType === 'naqd' ? 'Naqd pul' : 'Karta';

  // ── Status badge
  const statusBadge = {
    new:        '🟡 Kutilmoqda',
    confirmed:  '🟢 Tasdiqlandi',
    cooking:    '👨‍🍳 Tayyorlanmoqda',
    onway:      '🛵 Yo\'lda',
    delivered:  '✅ Yetkazildi',
    cancelled:  '❌ Bekor qilindi',
  };

  const receipt = `
┌─────────────────────────────┐
│  🧾  <b>CHINOR FAST FOOD</b>         │
│     <i>Dostavka Kvitansiyasi</i>     │
└─────────────────────────────┘

📌 <b>Buyurtma:</b>  #<b>${orderId}</b>
📅 <b>Sana:</b>      ${dateStr}  ${timeStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b>      ${info.name}
📞 <b>Telefon:</b>    ${info.phone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛒 <b>BUYURTMA TARKIBI:</b>

${itemsBlock}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Mahsulotlar:       <b>${fmt(total)}</b>
🛵 Dostavka:          <b>${fmt(deliveryFee)}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 <b>JAMI TO'LOV:  ${fmt(grandTotal)}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${paymentIcon} <b>To'lov turi:</b>   ${paymentLabel}
⏱ <b>Yetkazish:</b>    ~25-35 daqiqa
📊 <b>Status:</b>       ${statusBadge[status] || '🟡 Kutilmoqda'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🙏 <i>Rahmat! Ishtahangiz chog' bo'lsin!</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return receipt.trim();
}

// ── Admin uchun qisqa xabar
function buildAdminNotice(orderId, order) {
  const { cart, info, total } = order;
  const grandTotal = total + DELIVERY_PRICE;
  let items = cart.map(i => `  🔸 ${i.emoji} ${i.name} × ${i.qty} — ${fmt(i.price * i.qty)}`).join('\n');

  return `
🚨 <b>YANGI BUYURTMA #${orderId}!</b> 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Mijoz: <b>${info.name}</b>
📞 Tel: <code>${info.phone}</code>
💳 To'lov: ${info.paymentType === 'naqd' ? '💵 Naqd' : '💳 Karta'}

📦 <b>Buyurtma:</b>
${items}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 <b>Jami: ${fmt(grandTotal)}</b> (dostavka bilan)
━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
}

// ============================================================
//  🏠  /start
// ============================================================
bot.start(async (ctx) => {
  ctx.session = { cart: [], step: null };
  await ctx.replyWithPhoto(
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1599&auto=format&fit=crop',
    {
      caption:
        `👋 <b>Xush kelibsiz, ${ctx.from.first_name}!</b>\n\n` +
        `🏆 <i>Chinor Fast Food — Premium Dostavka</i>\n\n` +
        `Nima buyurmoqchisiz? 👇`,
      parse_mode: 'HTML',
      reply_markup: mainKeyboard(),
    }
  );
});

// ── Asosiy klaviatura
function mainKeyboard() {
  return Markup.keyboard([
    [Markup.button.webApp('🚀 Menyu (Mini App)', WEBAPP_URL)],
    ['🛒 Savat', '✅ Buyurtma berish'],
    ['🍔 Ovqatlar', '🥤 Ichimliklar', '❓ Yordam'],
  ]).resize();
}

// ============================================================
//  📜  MENYU ko'rsatish
// ============================================================
async function showCategory(ctx, category) {
  const items = MENU[category];
  const label = category === 'ovqatlar' ? '🍔 Ovqatlar' : '🥤 Ichimliklar';

  const buttons = items.map(p => [
    Markup.button.callback(`${p.emoji} ${p.name} — ${fmt(p.price)}`, `add_${p.id}`)
  ]);

  await ctx.reply(
    `${label} — <b>menyumiz:</b>\n\n<i>Qo'shish uchun bosing 👇</i>`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons),
    }
  );
}

bot.hears('🍔 Ovqatlar',     ctx => showCategory(ctx, 'ovqatlar'));
bot.hears('🥤 Ichimliklar',  ctx => showCategory(ctx, 'ichimliklar'));
bot.hears('❓ Yordam',       ctx => ctx.reply(
  '📞 Murojaat: @ChinorAdmin\n🕐 Ish vaqti: 10:00 — 22:00'
));

// ============================================================
//  ➕  Savatga qo'shish
// ============================================================
bot.action(/^add_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  const product = findProduct(productId);
  if (!product) return ctx.answerCbQuery('❌ Mahsulot topilmadi!');

  const cart = getCart(ctx);
  const existing = cart.find(i => i.id === productId);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  await ctx.answerCbQuery(`✅ ${product.emoji} ${product.name} savatga qo'shildi!`);

  // Inline reply update
  await ctx.editMessageReplyMarkup(
    Markup.inlineKeyboard([
      [Markup.button.callback(`➕ Yana qo'shish`, `add_${productId}`)],
      [Markup.button.callback('🛒 Savatni ko\'rish', 'view_cart')],
    ]).reply_markup
  );
});

// ============================================================
//  🛒  SAVAT ko'rsatish
// ============================================================
async function showCart(ctx) {
  const cart = getCart(ctx);

  if (cart.length === 0) {
    return ctx.reply(
      '🛒 <b>Savatingiz bo\'sh!</b>\n\n<i>Avval menyu orqali mahsulot tanlang.</i>',
      { parse_mode: 'HTML', reply_markup: mainKeyboard() }
    );
  }

  const total = calcTotal(cart);
  let text = '🛒 <b>SIZNING SAVATINGIZ:</b>\n━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  cart.forEach((item, i) => {
    text += `${i + 1}. ${item.emoji} <b>${item.name}</b>\n`;
    text += `   Miqdor: ${item.qty} × ${fmt(item.price)} = <b>${fmt(item.price * item.qty)}</b>\n\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🛵 Dostavka: <b>${fmt(DELIVERY_PRICE)}</b>\n`;
  text += `💎 <b>Jami: ${fmt(total + DELIVERY_PRICE)}</b>`;

  const cartButtons = cart.map((item, i) => [
    Markup.button.callback(`➕ ${item.emoji}`, `qty_inc_${item.id}`),
    Markup.button.callback(`${item.qty} ta`, `qty_noop`),
    Markup.button.callback(`➖`, `qty_dec_${item.id}`),
    Markup.button.callback(`🗑 O'chirish`, `remove_${item.id}`),
  ]);

  cartButtons.push([
    Markup.button.callback('🧹 Savatni tozalash', 'clear_cart'),
    Markup.button.callback('✅ Buyurtma berish', 'start_order'),
  ]);

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(cartButtons),
  });
}

bot.hears('🛒 Savat', ctx => showCart(ctx));
bot.action('view_cart', ctx => showCart(ctx));

// ── Qty +/-
bot.action(/^qty_inc_(.+)$/, async (ctx) => {
  const cart = getCart(ctx);
  const item = cart.find(i => i.id === ctx.match[1]);
  if (item) { item.qty++; await ctx.answerCbQuery(`+1 qo'shildi`); }
  await ctx.deleteMessage();
  await showCart(ctx);
});

bot.action(/^qty_dec_(.+)$/, async (ctx) => {
  const cart = getCart(ctx);
  const idx = cart.findIndex(i => i.id === ctx.match[1]);
  if (idx !== -1) {
    if (cart[idx].qty > 1) cart[idx].qty--;
    else cart.splice(idx, 1);
    await ctx.answerCbQuery('Miqdor kamaytirildi');
  }
  await ctx.deleteMessage();
  await showCart(ctx);
});

bot.action('qty_noop', ctx => ctx.answerCbQuery());

// ── Mahsulotni o'chirish
bot.action(/^remove_(.+)$/, async (ctx) => {
  const cart = getCart(ctx);
  const idx = cart.findIndex(i => i.id === ctx.match[1]);
  if (idx !== -1) {
    const removed = cart.splice(idx, 1)[0];
    await ctx.answerCbQuery(`🗑 ${removed.name} o'chirildi`);
  }
  await ctx.deleteMessage();
  await showCart(ctx);
});

// ── Savatni tozalash
bot.action('clear_cart', async (ctx) => {
  ctx.session.cart = [];
  await ctx.answerCbQuery('🧹 Savat tozalandi!');
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.reply('🛒 Savat tozalandi.', { reply_markup: mainKeyboard() });
});

// ============================================================
//  📝  BUYURTMA BERISH  —  ismni so'rash
// ============================================================
async function startOrder(ctx) {
  const cart = getCart(ctx);
  if (cart.length === 0) {
    return ctx.reply('⚠️ Savat bo\'sh! Avval mahsulot tanlang.', { reply_markup: mainKeyboard() });
  }
  ctx.session.step = 'ask_name';
  await ctx.reply(
    '📝 <b>Buyurtma rasmiylashtirish</b>\n\n👤 Ismingizni kiriting:',
    { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
  );
}

bot.hears('✅ Buyurtma berish', ctx => startOrder(ctx));
bot.action('start_order', async (ctx) => {
  await ctx.answerCbQuery();
  await startOrder(ctx);
});

// ============================================================
//  💬  TEXT handler — multi-step form
// ============================================================
bot.on('text', async (ctx) => {
  const step = ctx.session?.step;
  const text = ctx.message.text;

  // ── STEP 1: Ism
  if (step === 'ask_name') {
    ctx.session.orderInfo = { name: text };
    ctx.session.step = 'ask_phone';
    return ctx.reply('📞 Telefon raqamingizni kiriting:\n<i>Misol: +998 90 123 45 67</i>', {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [[{ text: '📞 Raqamni yuborish', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  // ── STEP 2: Telefon (text orqali)
  if (step === 'ask_phone') {
    ctx.session.orderInfo.phone = text;
    ctx.session.step = 'ask_payment';
    return askPaymentType(ctx);
  }

  // ── DEFAULT: boshqa matnlar
  if (!step) {
    return ctx.reply('Iltimos, pastdagi menyu tugmalaridan foydalaning 👇', {
      reply_markup: mainKeyboard(),
    });
  }
});

// ── Contact orqali telefon
bot.on('contact', async (ctx) => {
  if (ctx.session?.step === 'ask_phone') {
    const phone = ctx.message.contact.phone_number;
    ctx.session.orderInfo.phone = phone.startsWith('+') ? phone : `+${phone}`;
    ctx.session.step = 'ask_payment';
    await askPaymentType(ctx);
  }
});

// ── To'lov turini so'rash
async function askPaymentType(ctx) {
  await ctx.reply(
    '💳 <b>To\'lov turini tanlang:</b>',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('💵 Naqd pul', 'pay_naqd'),
          Markup.button.callback('💳 Karta', 'pay_karta'),
        ],
      ]),
    }
  );
}

// ============================================================
//  🌐  WEBAPP DAN MA'LUMOT QABUL QILISH
// ============================================================
bot.on('web_app_data', async (ctx) => {
  const rawData = ctx.message?.web_app_data?.data;
  if (!rawData) return;
  
  let payload;
  try {
    payload = JSON.parse(rawData);
  } catch(e) { return; }

  // payload: { orderId, items, total, deliveryFee, grand, info: {name, phone, payment} }
  const { orderId, items, total, grand, info } = payload;
  
  const order = {
    userId: ctx.from.id,
    userName: ctx.from.first_name,
    userTag: ctx.from.username ? `@${ctx.from.username}` : `ID:${ctx.from.id}`,
    cart: items.map(i => ({ ...i, qty: i.quantity })),
    info: { ...info, paymentType: info.payment },
    total,
    status: 'new',
    createdAt: new Date(),
  };

  activeOrders.set(orderId, order);

  // Mijozga yangi chek
  const receipt = buildReceipt(orderId, order);
  await ctx.reply(receipt, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Tasdiqlash', `confirm_${orderId}`),
        Markup.button.callback('✏️ O\'zgartirish', `edit_${orderId}`),
        Markup.button.callback('❌ Bekor qilish', `mycancel_${orderId}`),
      ],
    ]),
  });

  setTimeout(() => upsellSuggest(ctx, order.cart), 3000);

  // Adminga
  const adminText = buildAdminNotice(orderId, order);
  await bot.telegram.sendMessage(ADMIN_ID, adminText, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Tasdiqlash', `adm_confirm_${orderId}`),
        Markup.button.callback('👨‍🍳 Tayyorlanmoqda', `adm_cook_${orderId}`),
      ],
      [
        Markup.button.callback('🛵 Yo\'lga chiqdi', `adm_onway_${orderId}`),
        Markup.button.callback('❌ Bekor qilish', `adm_cancel_${orderId}`),
      ],
    ]),
  }).catch(console.error);
});
async function askPaymentType(ctx) {
  await ctx.reply(
    '💳 <b>To\'lov turini tanlang:</b>',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('💵 Naqd pul', 'pay_naqd'),
          Markup.button.callback('💳 Karta', 'pay_karta'),
        ],
      ]),
    }
  );
}

bot.action(/^pay_(naqd|karta)$/, async (ctx) => {
  const payType = ctx.match[1];
  ctx.session.orderInfo.paymentType = payType;
  ctx.session.step = null;
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await placeOrder(ctx);
});

// ============================================================
//  🧾  BUYURTMANI RASMIYLASHTIRISH va CHEK YUBORISH
// ============================================================
async function placeOrder(ctx) {
  const cart   = getCart(ctx);
  const info   = ctx.session.orderInfo || {};
  const total  = calcTotal(cart);
  const orderId = orderCounter++;

  const order = {
    userId: ctx.from.id,
    userName: ctx.from.first_name,
    userTag: ctx.from.username ? `@${ctx.from.username}` : `ID:${ctx.from.id}`,
    cart: JSON.parse(JSON.stringify(cart)),   // deep copy
    info,
    total,
    status: 'new',
    createdAt: new Date(),
  };

  activeOrders.set(orderId, order);

  // ── Mijozga CHEK yuborish
  const receipt = buildReceipt(orderId, order);
  await ctx.reply(receipt, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Tasdiqlash', `confirm_${orderId}`),
        Markup.button.callback('✏️ O\'zgartirish', `edit_${orderId}`),
        Markup.button.callback('❌ Bekor qilish', `mycancel_${orderId}`),
      ],
    ]),
  });

  // ── Upsell (tavsiya) — 3 sekunddan keyin
  setTimeout(() => upsellSuggest(ctx, cart), 3000);

  // ── Adminga xabar
  const adminText = buildAdminNotice(orderId, order);
  await bot.telegram.sendMessage(ADMIN_ID, adminText, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Tasdiqlash', `adm_confirm_${orderId}`),
        Markup.button.callback('👨‍🍳 Tayyorlanmoqda', `adm_cook_${orderId}`),
      ],
      [
        Markup.button.callback('🛵 Yo\'lga chiqdi', `adm_onway_${orderId}`),
        Markup.button.callback('❌ Bekor qilish', `adm_cancel_${orderId}`),
      ],
    ]),
  }).catch(console.error);

  // ── Savatni tozalash
  ctx.session.cart = [];
}

// ============================================================
//  💡  UPSELL — qo'shimcha tavsiya
// ============================================================
async function upsellSuggest(ctx, cart) {
  // Birinchi ovqatni topish
  const food = cart.find(i => MENU.ovqatlar.some(f => f.id === i.id));
  if (!food) return;

  const suggestion = UPSELL_MAP[food.id];
  if (!suggestion) return;

  // Agar u allaqachon savatda bo'lsa — tavsiya qilmaymiz
  const alreadyHas = cart.some(i => i.id === suggestion.id);
  if (alreadyHas) return;

  const sugProduct = findProduct(suggestion.id);
  if (!sugProduct) return;

  await ctx.reply(
    `🔥 <b>Tavsiya:</b>\n\n${suggestion.msg}\n\n<i>Qo'shiladimi? 👇</i>`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(`✅ Ha, qo'shaman!`, `add_${suggestion.id}`),
          Markup.button.callback(`❌ Yo'q, rahmat`, 'upsell_no'),
        ],
      ]),
    }
  );
}

bot.action('upsell_no', async (ctx) => {
  await ctx.answerCbQuery('Yaxshi! Buyurtmangiz yo\'lga chiqdi 🛵');
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
});

// ============================================================
//  🔘  MIJOZ TUGMALARI — Tasdiqlash / O'zgartirish / Bekor
// ============================================================

// ── Tasdiqlash
bot.action(/^confirm_(\d+)$/, async (ctx) => {
  const orderId = Number(ctx.match[1]);
  await ctx.answerCbQuery('✅ Buyurtma tasdiqlandi!');
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  await ctx.reply(
    `✅ <b>Buyurtma #${orderId} tasdiqlandi!</b>\n\n` +
    `⏱ Taxminiy vaqt: <b>25-35 daqiqa</b>\n` +
    `📞 Muammo bo'lsa: @ChinorAdmin`,
    { parse_mode: 'HTML', reply_markup: mainKeyboard() }
  );
});

// ── O'zgartirish
bot.action(/^edit_(\d+)$/, async (ctx) => {
  const orderId = Number(ctx.match[1]);
  const order = activeOrders.get(orderId);
  if (!order) return ctx.answerCbQuery('Buyurtma topilmadi!');

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  // Savatni qayta tiklash
  ctx.session.cart = JSON.parse(JSON.stringify(order.cart));
  activeOrders.delete(orderId);

  await ctx.reply(
    '✏️ <b>O\'zgartirish rejimi</b>\n\n' +
    'Savatingiz qayta tiklandi. Mahsulot qo\'shing yoki o\'chirng, keyin "✅ Buyurtma berish" bosing.',
    { parse_mode: 'HTML', reply_markup: mainKeyboard() }
  );
  await showCart(ctx);
});

// ── Mijoz tomonidan bekor qilish
bot.action(/^mycancel_(\d+)$/, async (ctx) => {
  const orderId = Number(ctx.match[1]);
  await ctx.answerCbQuery('❌ Buyurtma bekor qilindi');
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  activeOrders.delete(orderId);

  await ctx.reply(
    `❌ <b>Buyurtma #${orderId} bekor qilindi.</b>\n\nQayta buyurtma berish uchun:`,
    { parse_mode: 'HTML', reply_markup: mainKeyboard() }
  );

  // Adminga ham xabar
  await bot.telegram.sendMessage(
    ADMIN_ID,
    `ℹ️ Buyurtma <b>#${orderId}</b> mijoz tomonidan bekor qilindi.`,
    { parse_mode: 'HTML' }
  ).catch(console.error);
});

// ============================================================
//  👨‍💼  ADMIN PANELI — Status boshqaruvi
// ============================================================

async function updateOrderStatus(ctx, orderId, newStatus) {
  const order = activeOrders.get(orderId);
  if (!order) return ctx.answerCbQuery('Bu buyurtma topilmadi yoki yakunlangan!');

  order.status = newStatus;
  await ctx.answerCbQuery(`✅ Status yangilandi: ${newStatus}`);

  const statusMessages = {
    confirmed: `✅ <b>Buyurtmangiz #${orderId} tasdiqlandi!</b>\n\n👨‍🍳 Oshpazlar tayyorlashga kirishdi.\n⏱ ~25-35 daqiqa`,
    cooking:   `👨‍🍳 <b>Buyurtmangiz #${orderId} tayyorlanmoqda!</b>\n\n🔥 Oshxonada qizg'in ish ketmoqda...\n⏱ Tez orada tayyor bo'ladi`,
    onway:     `🛵 <b>Buyurtmangiz #${orderId} yo'lda!</b>\n\n📍 Kuryer sizga yo'lga chiqdi.\n⏱ ~10-15 daqiqa kutilmoqda`,
    cancelled: `❌ <b>Buyurtmangiz #${orderId} bekor qilindi.</b>\n\n😔 Kechirasiz. Murojaat: @ChinorAdmin`,
  };

  const msgToClient = statusMessages[newStatus];
  if (msgToClient) {
    await bot.telegram.sendMessage(order.userId, msgToClient, {
      parse_mode: 'HTML',
      reply_markup: newStatus === 'cancelled' ? mainKeyboard() : undefined,
    }).catch(console.error);
  }

  // Adminga ham yangilangan chekni yuborish
  order.status = newStatus;
  const updatedReceipt = buildReceipt(orderId, order);
  await ctx.reply(`📋 Yangilangan chek:\n\n${updatedReceipt}`, { parse_mode: 'HTML' });

  if (newStatus === 'cancelled') {
    activeOrders.delete(orderId);
  }
}

bot.action(/^adm_confirm_(\d+)$/, ctx => updateOrderStatus(ctx, Number(ctx.match[1]), 'confirmed'));
bot.action(/^adm_cook_(\d+)$/,    ctx => updateOrderStatus(ctx, Number(ctx.match[1]), 'cooking'));
bot.action(/^adm_onway_(\d+)$/,   ctx => updateOrderStatus(ctx, Number(ctx.match[1]), 'onway'));
bot.action(/^adm_cancel_(\d+)$/,  ctx => updateOrderStatus(ctx, Number(ctx.match[1]), 'cancelled'));

// ── Admin buyurtmalar ro'yxati
bot.command('orders', async (ctx) => {
  if (String(ctx.from.id) !== String(ADMIN_ID)) return;

  if (activeOrders.size === 0) {
    return ctx.reply('📋 Hozircha faol buyurtmalar yo\'q.');
  }

  let text = `📋 <b>FAOL BUYURTMALAR (${activeOrders.size} ta):</b>\n━━━━━━━━━━━━━━━\n\n`;
  for (const [id, order] of activeOrders) {
    text += `🔸 <b>#${id}</b> — ${order.info.name} — ${fmt(order.total + DELIVERY_PRICE)}\n`;
    text += `   📊 Status: ${order.status} | 🕒 ${order.createdAt.toLocaleTimeString('uz-UZ')}\n\n`;
  }

  await ctx.reply(text, { parse_mode: 'HTML' });
});

// ============================================================
//  🌐  Express static server
// ============================================================
const app = express();
app.use(express.static(path.join(__dirname, '../webapp/dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../webapp/dist', 'index.html'));
});
const PORT = process.env.PORT || 5173;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ WebApp Static Server running on port ${PORT}`);
});

// ============================================================
//  🚀  Botni ishga tushirish
// ============================================================
bot.launch({ dropPendingUpdates: true })
  .then(async () => {
    console.log('🚀 Chinor ZUV Bot (Receipt Edition) muvaffaqiyatli ishga tushdi!');
    console.log('📡 Polling faol | Bot: @dostavkaqabulqilubvchibot');
    
    // Asosiy "Menu" tugmasining manzilini avtomatik to'g'rilash:
    try {
      await bot.telegram.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: '🍔 Menyu',
          web_app: { url: WEBAPP_URL }
        }
      });
      console.log('✅ Menu tugma manzili yangilandi:', WEBAPP_URL);
    } catch(err) {
      console.error('Menu tugmani yangilashda xatolik:', err.message);
    }
  })
  .catch((err) => {
    console.error('❌ Bot launch xatosi:', err.message);
    console.error(err);
  });

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
