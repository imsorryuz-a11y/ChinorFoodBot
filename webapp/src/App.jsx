import React, {
  useState, useEffect, useRef, useCallback, memo
} from 'react';
import './index.css';

/* ─────────────────────────────────────────────────────────────
   GLOBALS
───────────────────────────────────────────────────────────── */
const tg   = window.Telegram?.WebApp;
const gsap = window.gsap;

/* ─────────────────────────────────────────────────────────────
   MENU DATA
───────────────────────────────────────────────────────────── */
const MENU = [
  { id:99, name:'Sirli Quti',        price:35000, cat:'hits',     emoji:'🎁', hit:true  },
  { id:1,  name:'50 CM Lavash',      price:45000, cat:'hits',     emoji:'🌯', hit:true  },
  { id:2,  name:'Asl Burger',        price:35000, cat:'hits',     emoji:'🍔', hit:true  },
  { id:3,  name:'Saboy Danar Big',   price:40000, cat:'hits',     emoji:'🍱', hit:true  },
  { id:4,  name:'Lavash Mini',       price:27000, cat:'lavash',   emoji:'🌯'            },
  { id:5,  name:'Lavash Obychniy',   price:33000, cat:'lavash',   emoji:'🌯'            },
  { id:6,  name:'Lavash Big',        price:37000, cat:'lavash',   emoji:'🌯'            },
  { id:7,  name:'Lavash Pishloqli',  price:35000, cat:'lavash',   emoji:'🧀'            },
  { id:8,  name:'Lavash Kuriniy',    price:25000, cat:'lavash',   emoji:'🐔'            },
  { id:9,  name:'Burger Mini',       price:25000, cat:'burger',   emoji:'🍔'            },
  { id:10, name:'Burger Big',        price:34000, cat:'burger',   emoji:'🍔'            },
  { id:11, name:'Gamburger',         price:25000, cat:'burger',   emoji:'🍔'            },
  { id:12, name:'Bigburger Sirli',   price:35000, cat:'burger',   emoji:'🧀'            },
  { id:13, name:'Xaggi',            price:35000, cat:'burger',   emoji:'🥪'            },
  { id:14, name:'Hot-Dog Assorti',   price:33000, cat:'hotdog',   emoji:'🌭'            },
  { id:15, name:'Tostor Non',        price:35000, cat:'hotdog',   emoji:'🍞'            },
  { id:20, name:'Muzqaymoq Vanil',   price:12000, cat:'icecream', emoji:'🍦'            },
  { id:21, name:'Muzqaymoq Shokolad',price:13000, cat:'icecream', emoji:'🍫'            },
  { id:22, name:'Muzqaymoq Fruktli', price:14000, cat:'icecream', emoji:'🍧'            },
  { id:23, name:'Waffle Korzinka',   price:15000, cat:'icecream', emoji:'🧁'            },
  { id:30, name:'Coca-Cola 1L',      price:14000, cat:'drinks',   emoji:'🥤'            },
  { id:31, name:'Coca-Cola 1.5L',    price:17000, cat:'drinks',   emoji:'🥤'            },
  { id:32, name:'Coca-Cola 2L',      price:20000, cat:'drinks',   emoji:'🥤'            },
  { id:33, name:'Coca-Cola 2.5L',    price:23000, cat:'drinks',   emoji:'🥤'            },
  { id:34, name:'Pepsi 1L',          price:12000, cat:'drinks',   emoji:'🫙'            },
  { id:35, name:'Pepsi 1.5L',        price:15000, cat:'drinks',   emoji:'🫙'            },
  { id:36, name:'Pepsi 2L',          price:18000, cat:'drinks',   emoji:'🫙'            },
  { id:37, name:'Pepsi 2.5L',        price:21000, cat:'drinks',   emoji:'🫙'            },
];

const CATS = [
  { key:'all',      icon:'🏠', label:'Barchasi' },
  { key:'hits',     icon:'🔥', label:'Hitlar'   },
  { key:'lavash',   icon:'🌯', label:'Lavash'   },
  { key:'burger',   icon:'🍔', label:'Burger'   },
  { key:'hotdog',   icon:'🌭', label:'Hot-Dog'  },
  { key:'icecream', icon:'🍦', label:'Muzqaymoq'},
  { key:'drinks',   icon:'🥤', label:'Ichimlik' },
];

const HERO_SLIDES = [
  { emoji:'🌿', title:'CHINOR FOOD',    sub:'Halollik foydadan ustun!',      color:'#00ff88' },
  { emoji:'🌯', title:'TANDIR LAVASH',  sub:"Maxsus go'shtli, qizg'in!",     color:'#ff9500' },
  { emoji:'🍔', title:'ASL BURGER',     sub:'Yangi non, muzdek sharbat!',     color:'#ff6b35' },
  { emoji:'🍦', title:'MUZQAYMOQ',      sub:'Sovuq, mazali, frukti!',         color:'#00e5ff' },
  { emoji:'🥤', title:'ICHIMLIKLAR',    sub:'Coca-Cola & Pepsi — ZUV!',       color:'#a855f7' },
];

const DELIVERY_FEE = 10000;

/* ─────────────────────────────────────────────────────────────
   FLY-TO-CART ANIMATION
───────────────────────────────────────────────────────────── */
function flyToCart(fromEl, toEl, emoji) {
  if (!fromEl || !toEl) return;
  const fr = fromEl.getBoundingClientRect();
  const to = toEl.getBoundingClientRect();

  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; font-size:26px; z-index:9999; pointer-events:none;
    left:${fr.left + fr.width  / 2}px;
    top :${fr.top  + fr.height / 2}px;
    transform:translate(-50%,-50%);
    filter:drop-shadow(0 0 10px rgba(0,255,136,.9));
    will-change:left,top,transform,opacity;
  `;
  el.textContent = emoji;
  document.body.appendChild(el);

  const dX = to.left + to.width  / 2;
  const dY = to.top  + to.height / 2;
  const cX = (fr.left + dX) / 2 - 60;
  const cY = Math.min(fr.top, dY) - 120;

  let s = null;
  const D = 650;
  const ease = t => t < .5 ? 2*t*t : -1+(4-2*t)*t;

  const tick = ts => {
    if (!s) s = ts;
    const t  = Math.min((ts - s) / D, 1);
    const e  = ease(t);
    const iv = 1 - e;
    const x  = iv*iv*(fr.left+fr.width/2) + 2*iv*e*cX + e*e*dX;
    const y  = iv*iv*(fr.top +fr.height/2)+ 2*iv*e*cY + e*e*dY;
    const sc = 1 - e * .65;

    el.style.left    = x + 'px';
    el.style.top     = y + 'px';
    el.style.opacity = t > .75 ? (1-t)*4 : '1';
    el.style.transform = `translate(-50%,-50%) scale(${sc})`;

    if (t < 1) requestAnimationFrame(tick);
    else {
      document.body.removeChild(el);
      spawnBurst(dX, dY);
    }
  };
  requestAnimationFrame(tick);
}

function spawnBurst(x, y) {
  ['✨','⭐','💫'].forEach((ch, i) => {
    const b = document.createElement('div');
    b.style.cssText = `
      position:fixed; font-size:16px; z-index:9999; pointer-events:none;
      left:${x}px; top:${y}px;
      transform:translate(-50%,-50%);
      animation:burstOut .5s ${i*0.08}s forwards ease-out;
    `;
    b.textContent = ch;
    document.body.appendChild(b);
    setTimeout(() => document.body.removeChild(b), 700 + i*80);
  });
}

/* ─────────────────────────────────────────────────────────────
   CANVAS PARTICLES BACKGROUND
───────────────────────────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx    = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive:true });

    const pts = Array.from({ length:45 }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      r:  Math.random() * 1.5 + .4,
      vx: (Math.random()-.5) * .25,
      vy: (Math.random()-.5) * .25,
      a:  Math.random() * .35 + .05,
      hue: Math.round(Math.random()) ? 145 : 200,
    }));

    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x<0||p.x>canvas.width)  p.vx*=-1;
        if (p.y<0||p.y>canvas.height) p.vy*=-1;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = `hsla(${p.hue},100%,60%,${p.a})`;
        ctx.fill();
      });

      for (let i=0;i<pts.length;i++) {
        for (let j=i+1;j<pts.length;j++) {
          const dx = pts[i].x-pts[j].x;
          const dy = pts[i].y-pts[j].y;
          const d  = Math.sqrt(dx*dx+dy*dy);
          if (d<90) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x,pts[i].y);
            ctx.lineTo(pts[j].x,pts[j].y);
            ctx.strokeStyle = `rgba(0,255,136,${.06*(1-d/90)})`;
            ctx.lineWidth = .5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize); };
  }, []);
  return <canvas ref={ref} className="pcv" />;
}

/* ─────────────────────────────────────────────────────────────
   LOADING SCREEN
───────────────────────────────────────────────────────────── */
function LoadingScreen({ onDone }) {
  const [pct, setPct] = useState(0);
  const logoRef = useRef(null);
  
  useEffect(() => {
    if (gsap && logoRef.current) {
      gsap.fromTo(logoRef.current,
        { scale: 0, opacity: 0, rotationY: -180 },
        { scale: 1, opacity: 1, rotationY: 0, duration: 1.5, ease: 'elastic.out(1, 0.5)' }
      );
    }

    const iv = setInterval(() => setPct(p => { if(p>=100){clearInterval(iv);return 100;} return p+2; }), 40);
    const t  = setTimeout(onDone, 2900);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, []);

  return (
    <div className="loader">
      <div className="loader-orb lo1" /><div className="loader-orb lo2" /><div className="loader-orb lo3" />
      <div className="loader-inner">
        <div ref={logoRef} className="visual-logo-box">
          <img src="/logo.png" alt="Chinor Food Logo" className="visual-logo-img" onError={(e)=>{e.target.style.display='none'}}/>
          <div className="visual-logo-glow"></div>
        </div>

        <h1 className="loader-brand-title">CHINOR FOOD</h1>
        <p className="loader-sub">Premium Fast Food Delivery</p>
        
        <div className="loader-bar-wrap">
          <div className="loader-bar-fill" style={{width:`${pct}%`}} />
        </div>
        <div className="loader-pct">{pct}%</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO BANNER
───────────────────────────────────────────────────────────── */
function HeroBanner() {
  const [idx, setIdx]  = useState(0);
  const bannerRef      = useRef(null);
  const innerRef       = useRef(null);

  useEffect(() => {
    const iv = setInterval(() => setIdx(p => (p+1) % HERO_SLIDES.length), 3800);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const fn = () => { el.style.transform = `translateY(${window.scrollY*.28}px)`; };
    window.addEventListener('scroll', fn, { passive:true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    if (gsap && innerRef.current) {
      gsap.fromTo(innerRef.current,
        { y:18, opacity:0, scale:.95 },
        { y:0,  opacity:1, scale:1, duration:.55, ease:'power3.out' }
      );
    }
  }, [idx]);

  const s = HERO_SLIDES[idx];

  return (
    <div ref={bannerRef} className="hero" style={{'--hc': s.color}}>
      <div className="hero-mesh" />
      <div className="hero-orb hob1" style={{background:`radial-gradient(circle, ${s.color}44, transparent)`}} />
      <div className="hero-orb hob2" />
      <div className="hero-orb hob3" style={{background:`radial-gradient(circle, ${s.color}33, transparent)`}} />

      <img src="/logo.png" className="hero-visual-logo" onError={(e)=>{e.target.style.display='none'}} />

      <div ref={innerRef} className="hero-inner">
        <h1 className="hero-title" style={{color:s.color}}>{s.title}</h1>
        <p className="hero-sub">{s.sub}</p>
        <div className="hero-dots">
          {HERO_SLIDES.map((_,i)=>(
            <div key={i} className={`hero-dot ${i===idx?'hero-dot--on':''}`}
              style={i===idx?{background:s.color}:{}} />
          ))}
        </div>
      </div>

      <div className="hero-flames">
        <span className="hf hf1">🔥</span>
        <span className="hf hf2">🔥</span>
        <span className="hf hf3">🔥</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   3D PRODUCT CARD
───────────────────────────────────────────────────────────── */
const ProductCard = memo(function ProductCard({ item, qty, onAdd, onRemove, cartRef }) {
  const cardRef   = useRef(null);
  const addBtnRef = useRef(null);
  const shineRef  = useRef(null);

  const onMouseMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const r  = card.getBoundingClientRect();
    const x  = e.clientX - r.left;
    const y  = e.clientY - r.top;
    const rx = ((y/r.height)-.5)*-22;
    const ry = ((x/r.width )-.5)* 22;
    card.style.transform    = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px) scale(1.03)`;
    card.style.transition   = 'none';
    if (shineRef.current) {
      shineRef.current.style.background =
        `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,.13) 0%, transparent 60%)`;
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = 'transform .55s cubic-bezier(.34,1.56,.64,1), box-shadow .4s';
    card.style.transform  = '';
    if (shineRef.current) shineRef.current.style.background = 'none';
  }, []);

  const handleAdd = useCallback(e => {
    e.stopPropagation();
    onAdd(item);
    flyToCart(addBtnRef.current, cartRef?.current, item.emoji);

    const btn = addBtnRef.current;
    if (btn) {
      btn.style.transform  = 'scale(.85) translateZ(-6px)';
      btn.style.transition = 'transform .12s ease';
      setTimeout(() => { if(btn){ btn.style.transform=''; btn.style.transition=''; } }, 200);
    }
    if (gsap && cardRef.current) {
      gsap.fromTo(cardRef.current, { scale:1 }, { scale:1.06, duration:.12, yoyo:true, repeat:1, ease:'power2.out' });
    }
    try { tg?.HapticFeedback?.impactOccurred('medium'); } catch(_) {}
  }, [item, onAdd, cartRef]);

  return (
    <div
      ref={cardRef}
      className={`pcard ${qty>0?'pcard--in':''}${item.hit?' pcard--hit':''}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div ref={shineRef} className="pcard-shine" />

      {item.hit && <div className="pcard-badge">HIT 🔥</div>}

      <div className="pcard-img">
        <span className="pcard-emoji">{item.emoji}</span>
        <div className="pcard-glow" />
      </div>

      <div className="pcard-name">{item.name}</div>
      <div className="pcard-price">
        {item.price.toLocaleString()} <span>so'm</span>
      </div>

      <div className="pcard-ctrl">
        {qty > 0 ? (
          <div className="qty-row">
            <button className="qbtn qbtn--m" onClick={e=>{e.stopPropagation();onRemove(item.id);}}>−</button>
            <span className="qnum">{qty}</span>
            <button ref={addBtnRef} className="qbtn qbtn--p" onClick={handleAdd}>+</button>
          </div>
        ) : (
          <button ref={addBtnRef} className="add-btn" onClick={handleAdd}>
            Xohlayman <span>🤤</span>
          </button>
        )}
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────
   CART SCREEN
───────────────────────────────────────────────────────────── */
function CartScreen({ cart, onAdd, onRemove, onClose, onCheckout }) {
  const items = Object.values(cart);
  const total = items.reduce((s,i) => s + i.price*i.quantity, 0);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (gsap && wrapRef.current) {
      gsap.from(wrapRef.current.querySelectorAll('.ci'), {
        x:-24, opacity:0, duration:.35, stagger:.06, ease:'power3.out'
      });
    }
  }, []);

  return (
    <div className="screen">
      <div className="scr-header">
        <button className="back-btn" onClick={onClose}><span>←</span> Orqaga</button>
        <h2>🛒 Savatcha</h2>
        <div style={{width:70}}/>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">🛒</div>
          <p>Savatcha bo'sh!</p>
          <button className="primary-btn" onClick={onClose}>Menyuga qaytish 🍔</button>
        </div>
      ) : (
        <>
          <div ref={wrapRef} className="ci-list">
            {items.map(it => (
              <div key={it.id} className="ci">
                <span className="ci-emoji">{it.emoji}</span>
                <div className="ci-info">
                  <div className="ci-name">{it.name}</div>
                  <div className="ci-price">{(it.price*it.quantity).toLocaleString()} so'm</div>
                </div>
                <div className="ci-qty">
                  <button onClick={()=>onRemove(it.id)}>−</button>
                  <span>{it.quantity}</span>
                  <button onClick={()=>onAdd(it)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary glass">
            <div className="cs-row"><span>Mahsulotlar</span><span>{items.reduce((s,i)=>s+i.quantity,0)} ta</span></div>
            <div className="cs-row"><span>Dostavka</span><span className="cs-delivery">🛵 {DELIVERY_FEE.toLocaleString()} so'm</span></div>
            <div className="cs-row cs-total"><span>Jami to'lov</span><strong>{(total+DELIVERY_FEE).toLocaleString()} so'm</strong></div>
          </div>

          <button className="checkout-btn" onClick={onCheckout}>
            🧾 Buyurtmani rasmiylashtirish
          </button>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   🆕 CHECKOUT SCREEN — ism, telefon, to'lov turi
───────────────────────────────────────────────────────────── */
function CheckoutScreen({ cart, onBack, onConfirm }) {
  const items  = Object.values(cart);
  const total  = items.reduce((s,i) => s + i.price*i.quantity, 0);
  const grand  = total + DELIVERY_FEE;

  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [payment, setPayment] = useState('naqd');
  const [errors,  setErrors]  = useState({});
  const wrapRef = useRef(null);

  useEffect(() => {
    // Try to prefill from Telegram
    if (tg?.initDataUnsafe?.user) {
      const u = tg.initDataUnsafe.user;
      setName([u.first_name, u.last_name].filter(Boolean).join(' '));
    }
    if (gsap && wrapRef.current) {
      gsap.fromTo(wrapRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, []);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Ism kiritilmadi";
    if (!/^\+?[\d\s\-]{9,15}$/.test(phone)) e.phone = "To'g'ri raqam kiriting";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      try { tg?.HapticFeedback?.notificationOccurred('error'); } catch(_) {}
      return;
    }
    try { tg?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
    onConfirm({ name: name.trim(), phone: phone.trim(), payment });
  };

  return (
    <div className="screen">
      <div className="scr-header">
        <button className="back-btn" onClick={onBack}>← Orqaga</button>
        <h2>📝 Buyurtma</h2>
        <div style={{width:70}}/>
      </div>

      <div ref={wrapRef}>
        {/* ORDER SUMMARY MINI */}
        <div className="checkout-summary glass">
          <div className="chs-title">🛒 Buyurtma tarkibi</div>
          {items.map(it => (
            <div key={it.id} className="chs-row">
              <span>{it.emoji} {it.name} × {it.quantity}</span>
              <span>{(it.price * it.quantity).toLocaleString()} so'm</span>
            </div>
          ))}
          <div className="chs-divider" />
          <div className="chs-row chs-delivery">
            <span>🛵 Dostavka</span>
            <span>{DELIVERY_FEE.toLocaleString()} so'm</span>
          </div>
          <div className="chs-row chs-grand">
            <span>💎 Jami</span>
            <strong>{grand.toLocaleString()} so'm</strong>
          </div>
        </div>

        {/* FORM */}
        <div className="checkout-form">
          <div className="cf-group">
            <label className="cf-label">👤 Ismingiz</label>
            <input
              className={`cf-input ${errors.name ? 'cf-input--err' : ''}`}
              type="text"
              placeholder="Ali Valiyev"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p=>({...p,name:''})); }}
            />
            {errors.name && <span className="cf-error">{errors.name}</span>}
          </div>

          <div className="cf-group">
            <label className="cf-label">📞 Telefon raqam</label>
            <input
              className={`cf-input ${errors.phone ? 'cf-input--err' : ''}`}
              type="tel"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={e => { setPhone(e.target.value); setErrors(p=>({...p,phone:''})); }}
            />
            {errors.phone && <span className="cf-error">{errors.phone}</span>}
          </div>

          <div className="cf-group">
            <label className="cf-label">💳 To'lov turi</label>
            <div className="payment-grid">
              <button
                className={`pay-btn ${payment === 'naqd' ? 'pay-btn--on' : ''}`}
                onClick={() => setPayment('naqd')}
              >
                <span className="pay-icon">💵</span>
                <span>Naqd pul</span>
              </button>
              <button
                className={`pay-btn ${payment === 'karta' ? 'pay-btn--on' : ''}`}
                onClick={() => setPayment('karta')}
              >
                <span className="pay-icon">💳</span>
                <span>Karta</span>
              </button>
            </div>
          </div>
        </div>

        <button className="checkout-btn checkout-btn--confirm" onClick={handleSubmit}>
          🧾 Chekni ko'rish →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   🆕 RECEIPT SCREEN — professional chek ko'rinishi
───────────────────────────────────────────────────────────── */
function ReceiptScreen({ cart, info, orderId, onEdit, onConfirm, onCancel }) {
  const items = Object.values(cart);
  const total = items.reduce((s,i) => s + i.price*i.quantity, 0);
  const grand = total + DELIVERY_FEE;
  const now   = new Date();
  const dateStr = now.toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'numeric' });
  const timeStr = now.toLocaleTimeString('uz-UZ', { hour:'2-digit', minute:'2-digit' });

  const receiptRef = useRef(null);
  const [confirmed, setConfirmed] = useState(false);
  const [upsellDone, setUpsellDone] = useState(false);

  useEffect(() => {
    if (gsap && receiptRef.current) {
      gsap.fromTo(receiptRef.current,
        { y: 40, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.4)' }
      );
    }
    // Haptic 
    try { tg?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}

    // Upsell — 3s keyin
    const t = setTimeout(() => setUpsellDone(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Upsell product logikasi
  const UPSELL_MAP = {
    'hits': { emoji:'🥤', name:'Coca-Cola 1L', price:14000 },
    'lavash': { emoji:'🥤', name:'Coca-Cola 1L', price:14000 },
    'burger': { emoji:'🍟', name:'Kartoshka Fri (tashqaridan)', price:12000, note:true },
    'hotdog': { emoji:'🫧', name:'Sprite 0.5L', price:8000, note:true },
    'icecream': { emoji:'🥤', name:'Coca-Cola 1L', price:14000 },
    'drinks': { emoji:'🌯', name:'Lavash Mini', price:27000 },
  };
  const firstItem = items[0];
  const upsellCat = firstItem?.cat || 'hits';
  const upsell = UPSELL_MAP[upsellCat] || UPSELL_MAP['hits'];
  const alreadyHas = items.some(i => i.name === upsell.name);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
  };

  return (
    <div className="screen receipt-scr">
      <div className="scr-header">
        <button className="back-btn" onClick={onEdit}>✏️ O'zgartirish</button>
        <h2>🧾 Chek</h2>
        <div style={{width:80}}/>
      </div>

      {/* ── RECEIPT CARD ── */}
      <div ref={receiptRef} className="receipt-card glass">
        
        {/* Header */}
        <div className="rc-header">
          <div className="rc-logo">🍃</div>
          <div className="rc-brand">CHINOR FOOD</div>
          <div className="rc-subtitle">Dostavka Kvitansiyasi</div>
        </div>

        <div className="rc-divider">━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Order meta */}
        <div className="rc-meta">
          <div className="rc-meta-row">
            <span className="rc-ml">📌 Buyurtma</span>
            <span className="rc-mv rc-id">#{orderId}</span>
          </div>
          <div className="rc-meta-row">
            <span className="rc-ml">📅 Sana</span>
            <span className="rc-mv">{dateStr} · {timeStr}</span>
          </div>
        </div>

        <div className="rc-divider">━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Client info */}
        <div className="rc-client">
          <div className="rc-meta-row">
            <span className="rc-ml">👤 Mijoz</span>
            <span className="rc-mv">{info.name}</span>
          </div>
          <div className="rc-meta-row">
            <span className="rc-ml">📞 Telefon</span>
            <span className="rc-mv">{info.phone}</span>
          </div>
        </div>

        <div className="rc-divider">━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Items */}
        <div className="rc-items-title">🛒 BUYURTMA TARKIBI</div>
        <div className="rc-items">
          {items.map(it => (
            <div key={it.id} className="rc-item">
              <div className="rc-item-name">{it.emoji} {it.name}</div>
              <div className="rc-item-calc">
                <span className="rc-item-qty">{it.quantity} × {it.price.toLocaleString()}</span>
                <span className="rc-item-total">{(it.price*it.quantity).toLocaleString()} so'm</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rc-divider">━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Totals */}
        <div className="rc-totals">
          <div className="rc-tot-row">
            <span>💰 Mahsulotlar</span>
            <span>{total.toLocaleString()} so'm</span>
          </div>
          <div className="rc-tot-row">
            <span>🛵 Dostavka</span>
            <span>{DELIVERY_FEE.toLocaleString()} so'm</span>
          </div>
        </div>

        <div className="rc-divider">━━━━━━━━━━━━━━━━━━━━━</div>

        <div className="rc-grand">
          <span>💎 JAMI TO'LOV</span>
          <strong>{grand.toLocaleString()} so'm</strong>
        </div>

        <div className="rc-divider">━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Payment & delivery */}
        <div className="rc-footer-info">
          <div className="rc-meta-row">
            <span className="rc-ml">{info.payment==='naqd'?'💵':'💳'} To'lov</span>
            <span className="rc-mv">{info.payment==='naqd'?'Naqd pul':'Karta'}</span>
          </div>
          <div className="rc-meta-row">
            <span className="rc-ml">⏱ Yetkazish</span>
            <span className="rc-mv">~25-35 daqiqa</span>
          </div>
          <div className="rc-meta-row">
            <span className="rc-ml">📊 Status</span>
            <span className="rc-mv rc-status">🟡 Kutilmoqda</span>
          </div>
        </div>

        <div className="rc-divider">━━━━━━━━━━━━━━━━━━━━━</div>

        <div className="rc-thanks">🙏 Rahmat! Ishtahangiz chog' bo'lsin!</div>
      </div>

      {/* ── UPSELL banner (3s keyin) ── */}
      {upsellDone && !alreadyHas && !confirmed && (
        <div className="upsell-banner">
          <div className="upsell-inner">
            <span className="upsell-fire">🔥</span>
            <div className="upsell-text">
              <div className="upsell-title">Sizga tavsiya:</div>
              <div className="upsell-desc">{upsell.emoji} {upsell.name} qo'shasizmi?</div>
              <div className="upsell-price">+{upsell.price.toLocaleString()} so'm</div>
            </div>
          </div>
          <button className="upsell-no" onClick={() => setUpsellDone(false)}>✕</button>
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      {!confirmed ? (
        <div className="receipt-actions">
          <button className="ra-btn ra-confirm" onClick={handleConfirm}>
            ✅ Tasdiqlash
          </button>
          <div className="ra-secondary">
            <button className="ra-btn ra-edit" onClick={onEdit}>
              ✏️ O'zgartirish
            </button>
            <button className="ra-btn ra-cancel" onClick={onCancel}>
              ❌ Bekor
            </button>
          </div>
        </div>
      ) : (
        <div className="confirmed-card">
          <div className="cc-icon">✅</div>
          <div className="cc-title">Buyurtma yuborildi!</div>
          <div className="cc-sub">⏱ ~25-35 daqiqada yetkazamiz</div>
          <div className="cc-sub">📞 Muammo bo'lsa: @ChinorAdmin</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DELIVERY TRACKING
───────────────────────────────────────────────────────────── */
function DeliveryScreen({ orderId, onClose }) {
  const [pct,   setPct]   = useState(0);
  const [phase, setPhase] = useState('cooking');
  const barRef  = useRef(null);
  const TOTAL = 90000;

  useEffect(() => {
    const s = Date.now();
    let r;
    const tick = () => {
      const p = Math.min(((Date.now()-s)/TOTAL)*100, 100);
      setPct(p);
      setPhase(p<30?'cooking': p<95?'delivering':'arrived');
      if(p<100) r = requestAnimationFrame(tick);
    };
    r = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    if (gsap && barRef.current) {
      gsap.to(barRef.current, { width:`${pct}%`, duration:.3, ease:'none' });
    }
  }, [pct]);

  const phases = {
    cooking:    { icon:'👨‍🍳', label:'Oshpaz pishirmoqda...',  color:'#ff9500' },
    delivering: { icon:'🛵',  label:"Kuryer yo'lda!",    color:'#00ff88' },
    arrived:    { icon:'🎉',  label:'Yetib keldi!',            color:'#00e5ff' },
  };
  const info = phases[phase];
  const vX = phase==='cooking' ? 8 : phase==='arrived' ? 85 : 8 + ((pct-30)/65)*77;

  return (
    <div className="screen delivery-scr">
      <div className="scr-header">
        <button className="back-btn" onClick={onClose}>← Orqaga</button>
        <h2>Zakaz #{orderId}</h2>
        <div style={{width:80}} />
      </div>

      <div className="status-card" style={{'--sc':info.color}}>
        <div className="sc-icon">{info.icon}</div>
        <div className="sc-label" style={{color:info.color}}>{info.label}</div>
        <div className="sc-pct">{Math.round(pct)}%</div>
      </div>

      <div className="track-wrap">
        <div className="track-rail">
          <div ref={barRef} className="track-fill" style={{background:`linear-gradient(90deg,#ff9500,${info.color})`}} />
          <div className="track-dot" style={{left:`${pct}%`, boxShadow:`0 0 12px ${info.color}`, background:info.color}} />
        </div>
        <div className="track-lbls">
          <span className={phase==='cooking'?'tl--on':''}>Pishmoqda</span>
          <span className={phase==='delivering'?'tl--on':''}>Yo'lda</span>
          <span className={phase==='arrived'?'tl--on':''}>Yetdi!</span>
        </div>
      </div>

      <div className="road-card">
        <div className="road">
          <div className="road-line" />
          <span className="road-pin road-pin--s">🏪</span>
          <div className={`road-moto ${phase==='delivering'?'moto--go':''} ${phase==='arrived'?'moto--arr':''}`}
            style={{left:`${vX}%`}}>
            🛵
            {phase==='delivering' && <span className="moto-dust">💨</span>}
          </div>
          <span className="road-pin road-pin--e">🏠</span>
        </div>
        <div className="road-steps">
          {['Pishmoqda',"Yo'lda",'Yetdi!'].map((l,i)=>(
            <div key={i} className={`rs ${pct>=[0,30,95][i]?'rs--on':''}`}>
              <div className="rs-dot" style={pct>=[0,30,95][i]?{background:info.color,boxShadow:`0 0 8px ${info.color}`}:{}} />
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ADMIN DASHBOARD
───────────────────────────────────────────────────────────── */
function AdminDashboard() {
  const [stats, setStats] = useState({ totalRevenue:0, totalOrders:0, activeOrderCount:0 });
  const [orders, setOrders] = useState([]);

  const fetchData = async () => {
    try {
      const qs = await fetch('/api/admin/stats');
      setStats(await qs.json());
      const qo = await fetch('/api/admin/orders');
      setOrders(await qo.json());
    } catch(e) { console.error('Admin API error', e); }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 3000);
    return () => clearInterval(iv);
  }, []);

  const actionOrder = async (id, action) => {
    try {
      await fetch('/api/admin/order-status', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id, action })
      });
      fetchData();
    } catch(e) {}
  };

  return (
    <div className="screen admin-scr">
      <div className="admin-header glass">
        <h2>👑 Super Admin Panel</h2>
        <div className="ah-sub">Chinor Food System</div>
      </div>

      <div className="admin-stats">
        <div className="astat-card">
          <div className="astat-title">Umumiy Tushum</div>
          <div className="astat-val" style={{color:'var(--green)'}}>
            {stats.totalRevenue.toLocaleString()} <span style={{fontSize:14}}>so'm</span>
          </div>
        </div>
        <div className="astat-row">
          <div className="astat-card astat-sm">
            <div className="astat-title">Kutilayotgan</div>
            <div className="astat-val">{stats.activeOrderCount}</div>
          </div>
          <div className="astat-card astat-sm">
            <div className="astat-title">Jami Zakaz</div>
            <div className="astat-val">{stats.totalOrders}</div>
          </div>
        </div>
      </div>

      <h3 className="jonli-title">🔴 Jonli Buyurtmalar</h3>
      
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>Hozircha faol zakazlar yo'q...</p>
        </div>
      ) : (
        <div className="admin-orders">
          {orders.map(o => (
            <div key={o.id} className="a-order-card glass">
              <div className="ao-head">
                <span className="ao-id">#{o.id}</span>
                <span className="ao-time">{o.time}</span>
              </div>
              <div className="ao-user">👤 {o.user}</div>
              <div className="ao-items">
                {o.items.map((it,i) => (
                  <div key={i} className="ao-it">
                    <span>{it.emoji} {it.quantity}x {it.name}</span>
                  </div>
                ))}
              </div>
              <div className="ao-total">Jami: <b>{o.total.toLocaleString()} so'm</b></div>
              <div className="ao-actions">
                {o.status === 'cooking' ? (
                  <button className="ao-btn aob-green" onClick={()=>actionOrder(o.id,'ready')}>✅ Kuryerga berish</button>
                ) : (
                  <button className="ao-btn aob-blue" onClick={()=>actionOrder(o.id,'complete')}>🏆 Yetib Bordi (Yopish)</button>
                )}
                <button className="ao-btn aob-red" onClick={()=>actionOrder(o.id,'cancel')}>❌ Bekor</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────────── */
let ORDER_COUNTER = 1000 + Math.floor(Math.random() * 99);

export default function App() {
  const [loading,  setLoading]  = useState(true);
  const [screen,   setScreen]   = useState('home'); // home | cart | checkout | receipt | delivery | admin
  const [cart,     setCart]     = useState({});
  const [tab,      setTab]      = useState('all');
  const [trackId,  setTrackId]  = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [orderId,   setOrderId]   = useState(null);

  const cartBarRef = useRef(null);
  const gridRef    = useRef(null);

  /* Init */
  useEffect(() => {
    try { if(tg){tg.ready();tg.expand();} } catch(_){}
    const p = new URLSearchParams(window.location.search);
    if (p.get('admin') === '1') {
      setLoading(false);
      setScreen('admin');
      return;
    }
    if (p.get('tracking')==='1') {
      setTrackId(p.get('order')||'???');
      setLoading(false);
      setScreen('delivery');
    }
  }, []);

  /* TG MainButton — faqat Home/Cart da */
  useEffect(() => {
    const total = Object.values(cart).reduce((s,i)=>s+i.price*i.quantity,0);
    try {
      if (!tg?.MainButton) return;
      if (total > 0 && (screen === 'home' || screen === 'cart')) {
        tg.MainButton.show();
        tg.MainButton.setParams({ text:`🚀 ZAKAZ: ${total.toLocaleString()} so'm`, color:'#00ff88', textColor:'#07080f' });
        const cb = () => setScreen('checkout');
        tg.onEvent('mainButtonClicked', cb);
        return () => tg.offEvent('mainButtonClicked', cb);
      } else {
        tg.MainButton?.hide();
      }
    } catch(_) {}
  }, [cart, screen]);

  /* Grid GSAP */
  useEffect(() => {
    if (!loading && gsap && gridRef.current) {
      const cards = gridRef.current.querySelectorAll('.pcard');
      gsap.fromTo(cards,
        { y:16, opacity:0 },
        { y:0, opacity:1, duration:.3, stagger:.04, ease:'power2.out', clearProps:'all' }
      );
    }
  }, [tab, loading]);

  const addToCart = useCallback(item => {
    setCart(prev => {
      const ex = prev[item.id];
      return ex
        ? {...prev, [item.id]:{...ex, quantity:ex.quantity+1}}
        : {...prev, [item.id]:{...item, quantity:1}};
    });
  }, []);

  const removeFromCart = useCallback(id => {
    setCart(prev => {
      const ex = prev[id];
      if (!ex) return prev;
      if (ex.quantity<=1) { const n={...prev}; delete n[id]; return n; }
      return {...prev, [id]:{...ex, quantity:ex.quantity-1}};
    });
  }, []);

  /* Checkout — info tasdiqlanganda */
  const handleCheckoutConfirm = (info) => {
    const id = ++ORDER_COUNTER;
    setOrderInfo(info);
    setOrderId(id);
    setScreen('receipt');
  };

  /* Receipt — tasdiqlanganda bot ga yuborish */
  const handleReceiptConfirm = () => {
    const items = Object.values(cart);
    const total = items.reduce((s,i) => s + i.price*i.quantity, 0);
    const payload = {
      orderId,
      items: items.map(i => ({ id:i.id, name:i.name, emoji:i.emoji, price:i.price, quantity:i.quantity })),
      total,
      deliveryFee: DELIVERY_FEE,
      grand: total + DELIVERY_FEE,
      info: orderInfo,
    };
    try {
      if (tg?.sendData) {
        tg.sendData(JSON.stringify(payload));
      }
    } catch(_) {}
    // Savatni tozalash
    setTimeout(() => {
      setCart({});
      setScreen('home');
    }, 4000);
  };

  /* Receipt — bekor */
  const handleReceiptCancel = () => {
    setCart({});
    setOrderInfo(null);
    setOrderId(null);
    setScreen('home');
  };

  const cartTotal = Object.values(cart).reduce((s,i)=>s+i.price*i.quantity,0);
  const cartCount = Object.values(cart).reduce((s,i)=>s+i.quantity,0);
  const filtered  = tab==='all' ? MENU : MENU.filter(i=>i.cat===tab);

  /* ── Screens ── */
  if (loading)              return <LoadingScreen onDone={()=>setLoading(false)} />;
  if (screen==='admin')     return <AdminDashboard />;
  if (screen==='delivery')  return <DeliveryScreen orderId={trackId} onClose={()=>setScreen('home')} />;

  if (screen==='cart')      return (
    <CartScreen
      cart={cart}
      onAdd={addToCart}
      onRemove={removeFromCart}
      onClose={()=>setScreen('home')}
      onCheckout={()=>setScreen('checkout')}
    />
  );

  if (screen==='checkout')  return (
    <CheckoutScreen
      cart={cart}
      onBack={()=>setScreen('cart')}
      onConfirm={handleCheckoutConfirm}
    />
  );

  if (screen==='receipt')   return (
    <ReceiptScreen
      cart={cart}
      info={orderInfo}
      orderId={orderId}
      onEdit={()=>setScreen('checkout')}
      onConfirm={handleReceiptConfirm}
      onCancel={handleReceiptCancel}
    />
  );

  /* ── Home ── */
  return (
    <div className="app">
      <ParticleCanvas />
      <HeroBanner />

      <div className="cats-scroller">
        {CATS.map(c => (
          <button key={c.key}
            className={`cat-pill ${tab===c.key?'cat-pill--on':''}`}
            onClick={() => setTab(c.key)}
          >
            <span>{c.icon}</span><span>{c.label}</span>
          </button>
        ))}
      </div>

      <div ref={gridRef} className="pgrid">
        {filtered.map(item => (
          <ProductCard
            key={item.id} item={item}
            qty={cart[item.id]?.quantity||0}
            onAdd={addToCart} onRemove={removeFromCart}
            cartRef={cartBarRef}
          />
        ))}
      </div>

      {cartTotal > 0 && (
        <div className="cart-bar glass">
          <button ref={cartBarRef} className="cb-btn" onClick={()=>setScreen('cart')}>
            <div className="cb-count">
              <span className="cb-badge">{cartCount}</span>
              <span>ta</span>
            </div>
            <span className="cb-label">ZAKAZ ▶</span>
            <span className="cb-price">{cartTotal.toLocaleString()} so'm</span>
          </button>
        </div>
      )}
    </div>
  );
}
