/* ═══════════════════════════════════════
   OFM — app.js
   Semua logic aplikasi (Firebase, icon system, service worker,
   dan seluruh app state/render/interaksi).
═══════════════════════════════════════ */

/* ══════════════════════════════════════════
   FIREBASE INIT
   Dimuat lewat dynamic import() (bukan <script type="module">)
   supaya tetap satu file app.js dan semua fungsi lain di file ini
   tetap ada di global scope (dibutuhkan oleh atribut onclick="" inline
   di index.html).
══════════════════════════════════════════ */
(async function initFirebase() {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js');
  const {
    getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
    createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut
  } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js');
  const { getFirestore, doc, setDoc, getDoc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js');

  const firebaseConfig = {
    apiKey: "AIzaSyCkYcfBseaPEiJDY65I9xqDPATYq0ZV-jE",
    authDomain: "oriasfinancialmanagement.firebaseapp.com",
    projectId: "oriasfinancialmanagement",
    storageBucket: "oriasfinancialmanagement.firebasestorage.app",
    messagingSenderId: "583348308396",
    appId: "1:583348308396:web:284f7da8f629d3b743d209"
  };

  const app      = initializeApp(firebaseConfig);
  const auth     = getAuth(app);
  const db       = getFirestore(app);
  const provider = new GoogleAuthProvider();

  // Expose to global scope for non-module JS
  window._fbAuth     = auth;
  window._fbDb       = db;
  window._fbProvider = provider;
  window._fbFns = {
    signInWithPopup, signInWithEmailAndPassword,
    createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
    doc, setDoc, getDoc, onSnapshot,
    GoogleAuthProvider
  };

  // Auth state observer
  onAuthStateChanged(auth, user => {
    if (user) {
      window._currentUser = user;
      window._isGuest = false;
      hideAuthOverlay();
      document.getElementById('app').style.display = 'block';
      // Load user data from Firestore
      window._loadUserData(user.uid);
      // Username default: email prefix, only the first time (won't override a saved choice)
      if (!window._customUsername) {
        window._customUsername = user.email ? user.email.split('@')[0] : (user.displayName || 'Pengguna OFM');
      }
      // Update profile UI
      if (typeof updateProfileHeroUI === 'function') updateProfileHeroUI();
      if (typeof updateBrandTitle === 'function') updateBrandTitle();
    } else {
      window._currentUser = null;
      if (window._isGuest) return; // tetap di mode tamu, jangan paksa balik ke layar login
      // Belum ada sesi login — otomatis lanjut sebagai tamu, jangan paksa ke layar login.
      // Layar login tetap bisa diakses manual lewat menu "Login" di Setting.
      if (typeof continueAsGuest === 'function') continueAsGuest();
    }
  });
})();

/* ── Icon system: replaces all emoji with inline SVG icons ── */
    const ICON = {
      trash: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/></svg>',
      warning: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/></svg>',
      trendUp: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg>',
      trendDown: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 7l6 6 4-4 8 9"/><path d="M15 18h6v-6"/></svg>',
      laptop: '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M2 20h20"/></svg>',
      target: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none"/></svg>',
      arrowRight: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 12h16M13 6l6 6-6 6"/></svg>',
      bank: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 10l9-6 9 6"/><path d="M5 10v9M9 10v9M15 10v9M19 10v9"/><path d="M3 19h18"/></svg>',
      close: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
      car: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 16V11l2-5h12l2 5v5"/><path d="M4 16h16"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/></svg>',
      swap: '<svg class="ic" viewBox="0 0 24 24"><path d="M7 8h13M17 4l3 4-3 4"/><path d="M17 16H4M7 20l-3-4 3-4"/></svg>',
      wallet: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l2-3h11"/><circle cx="16" cy="13" r="1.3" fill="currentColor" stroke="none"/></svg>',
      bill: '<svg class="ic" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6h5.4c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/></svg>',
      package: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
      checkCircle: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>',
      smartphone: '<svg class="ic" viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
      chart: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 20V10M12 20V4M20 20v-7"/><path d="M2 20h20"/></svg>',
      bell: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
      refresh: '<svg class="ic" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>',
      utensils: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11"/><path d="M17 3c-1.5 0-3 1.5-3 4v3h3M17 10v11"/></svg>',
      gamepad: '<svg class="ic" viewBox="0 0 24 24"><rect x="2" y="8" width="20" height="9" rx="4"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r="0.8" fill="currentColor" stroke="none"/><circle cx="18" cy="13.5" r="0.8" fill="currentColor" stroke="none"/></svg>',
      creditCard: '<svg class="ic" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
      calendar: '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
      upload: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
      cart: '<svg class="ic" viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.3" fill="currentColor" stroke="none"/><circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none"/><path d="M2 4h3l2.6 12.4A2 2 0 0 0 9.6 18h7.8a2 2 0 0 0 2-1.6L21 8H6"/></svg>',
      health: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
      briefcase: '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>',
      cash: '<svg class="ic" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
      sun: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
      coins: '<svg class="ic" viewBox="0 0 24 24"><circle cx="8" cy="14" r="6"/><circle cx="15" cy="8" r="6"/></svg>',
      cloud: '<svg class="ic" viewBox="0 0 24 24"><path d="M7 18a4 4 0 1 1 .6-7.96A5.5 5.5 0 0 1 18 12.5 3.5 3.5 0 0 1 17.5 18H7z"/></svg>',
      logout: '<svg class="ic" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
      search: '<svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
      book: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M19 19H6a2 2 0 0 1 0-4h13"/></svg>',
      gift: '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3"/><path d="M12 5v16"/><path d="M12 5C11 2 7 2 7 5s5 3 5 0zM12 5c1-3 5-3 5 0s-5 3-5 0z"/></svg>',
      moon: '<svg class="ic" viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
      home: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>',
      plane: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 12l18-7-7 18-2-8-8-3z"/></svg>',
      gem: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M2 9h20"/></svg>',
      graduationCap: '<svg class="ic" viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/></svg>',
      check: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>',
      clipboard: '<svg class="ic" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6M9 15h6"/></svg>',
      flame: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 2s-6 6-6 11a6 6 0 0 0 12 0c0-2-1-3-1-3s-1 2-2 2c1-3-3-5-3-8z"/></svg>',
      heart: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 5a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>',
      edit: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 21l4-1 12-12-3-3L4 17z"/><path d="M14 4l3 3"/></svg>',
      settings: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
      alertOctagon: '<svg class="ic" viewBox="0 0 24 24"><path d="M7.5 2h9L21 6.5v9L16.5 20h-9L3 15.5v-9z"/><path d="M12 8v5"/><circle cx="12" cy="16.3" r="0.6" fill="currentColor" stroke="none"/></svg>',
      sparkles: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
      info: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></svg>',
      lock: '<svg class="ic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
      fingerprint: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-7 7v2c0 3 1 5 1 5"/><path d="M12 3a7 7 0 0 1 7 7v3"/><path d="M8 21c-1-2-2-4-2-9a6 6 0 0 1 12 0v2"/><path d="M12 21c-2-3-3-6-3-9a3 3 0 0 1 6 0c0 1 0 2 .5 3.5"/></svg>',
    };

    // Escape user-provided text before inserting into innerHTML, to prevent XSS
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

/* ── Service worker registration ── */
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(r => {
        r.addEventListener('updatefound', () => {
          r.installing.addEventListener('statechange', e => {
            if (e.target.state === 'activated') console.log('[OFM] SW updated');
          });
        });
      });
    }

/* ══════════════════════════════════════════
   ANIMATED BACKGROUND ORBS
══════════════════════════════════════════ */
(function() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H;

  const orbs = [
    { x: 0.2, y: 0.15, r: 0.38, c: [0, 80, 200],  vx: 0.00012, vy: 0.00008 },
    { x: 0.8, y: 0.25, r: 0.32, c: [130, 0, 200],  vx:-0.00009, vy: 0.00011 },
    { x: 0.5, y: 0.65, r: 0.35, c: [0, 160, 130],  vx: 0.00007, vy:-0.00010 },
    { x: 0.1, y: 0.8,  r: 0.25, c: [200, 100, 0],  vx: 0.00010, vy:-0.00007 },
    { x: 0.9, y: 0.75, r: 0.28, c: [0, 120, 220],  vx:-0.00008, vy:-0.00009 },
  ];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth  = window.innerWidth;
    H = canvas.clientHeight = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }

  let t = 0;
  function draw() {
    t += 1;
    ctx.clearRect(0, 0, W, H);
    // Deep navy base
    ctx.fillStyle = '#060A18';
    ctx.fillRect(0, 0, W, H);

    orbs.forEach(o => {
      const x = (o.x + Math.sin(t * o.vx * 1000) * 0.18) * W;
      const y = (o.y + Math.cos(t * o.vy * 1000) * 0.14) * H;
      const r = o.r * Math.min(W, H);
      const [r0,g0,b0] = o.c;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${r0},${g0},${b0},0.28)`);
      grad.addColorStop(0.5,`rgba(${r0},${g0},${b0},0.10)`);
      grad.addColorStop(1,  `rgba(${r0},${g0},${b0},0)`);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

/* ══════════════════════════════════════════
   APP VERSION / UPDATE CHECK
   Bump APP_VERSION setiap kali kamu bikin GitHub Release baru dengan
   tag yang sama (mis. tag "v1.2.0" → APP_VERSION = 'v1.2.0').
══════════════════════════════════════════ */
const APP_VERSION  = 'v1.0.0';
const GITHUB_REPO  = 'bayuharlanpriangga/OFM'; // ganti sesuai nama repo kamu

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
const S = {
  transactions: [],
  currentType: 'expense',
  selectedCat: null,
  selectedBudgetCat: null,
  amountRaw: 0,
  currentPage: 'dashboard',
  _txReturnPage: 'dashboard',
};

const CATS = {
  expense:  [
    { id:'food',     label:'Makan',      color:'#FF8C00' },
    { id:'trans',    label:'Transport',  color:'#5EB3FF' },
    { id:'shop',     label:'Belanja',    color:'#C4A8FF' },
    { id:'ent',      label:'Hiburan',    color:'#FF6B84' },
    { id:'health',   label:'Kesehatan',  color:'#2AE8C4' },
    { id:'edu',      label:'Pendidikan', color:'#FFD166' },
    { id:'bill',     label:'Tagihan',    color:'#5EB3FF' },
    { id:'other',    label:'Lainnya',    color:'#888' },
  ],
  income: [
    { id:'salary',   label:'Gaji',       color:'#2AE8C4' },
    { id:'bonus',    label:'Bonus',      color:'#FFD166' },
    { id:'invest',   label:'Investasi',  color:'#C4A8FF' },
    { id:'freelance',label:'Freelance',  color:'#5EB3FF' },
    { id:'other',    label:'Lainnya',    color:'#888' },
  ],
  transfer: [{ id:'transfer', label:'Antar Akun', color:'#5EB3FF' }],
};

const BUDGET = {
  total: 0,
  cats: []
};

// Curated icon set for custom budget categories — kept visually consistent with the app's icon language
const BUDGET_CAT_ICONS = ['utensils','car','cart','gamepad','health','book','bill','home','smartphone','gift','plane','coins','heart','briefcase','creditCard','package'];
const BUDGET_CAT_COLORS = ['#FF8C00','#5EB3FF','#C4A8FF','#FF6B84','#2AE8C4','#FFD166','#7CE38B','#FF9EC4'];
let _pendingBudgetCatIcon = null;

let WALLETS = [];

// Supported wallet currencies — a wallet's currency decides which symbol shows
// up on its card and on the amount field when that wallet is picked in a transaction.
// Note: amounts are NOT converted between currencies, they're just tagged/displayed.
const CURRENCIES = {
  IDR: { symbol: 'Rp',  name: 'Rupiah Indonesia', locale: 'id-ID' },
  USD: { symbol: '$',   name: 'Dolar Amerika',    locale: 'en-US' },
  EUR: { symbol: '€',   name: 'Euro',             locale: 'de-DE' },
  SGD: { symbol: 'S$',  name: 'Dolar Singapura',  locale: 'en-SG' },
  JPY: { symbol: '¥',   name: 'Yen Jepang',       locale: 'ja-JP' },
  GBP: { symbol: '£',   name: 'Poundsterling',    locale: 'en-GB' },
};
function currencyInfo(code) { return CURRENCIES[code] || CURRENCIES.IDR; }
function currencyLabelText(code) {
  const c = currencyInfo(code);
  return `${c.symbol} ${c.name} (${code})`;
}
function walletCurrencyCode(walletId) {
  const w = WALLETS.find(w => w.id === walletId);
  return (w && w.currency) || 'IDR';
}

/* ══════════════════════════════════════════
   SMART QUICK-ADD — parsing teks bebas jadi transaksi
   Tulis kalimat kayak "makan siang 25rb kemarin" → otomatis
   ngisi nominal, kategori, tanggal, dan keterangan di form
   "Catat Transaksi" yang sudah ada. User tetap bisa cek/ubah
   manual sebelum tekan Simpan — parser cuma mempercepat isi,
   bukan langsung nyimpen.
══════════════════════════════════════════ */

// Kamus kata kunci kategori (dicek berurutan, frasa lebih panjang duluan menang)
const SMART_CAT_KEYWORDS = {
  expense: {
    food:   ['makan siang','makan malam','makan pagi','sarapan','ngopi','ngemil','jajan','warteg','angkringan','restoran','resto','cafe','kafe','minum','boba','kuliner','gofood','grabfood','nasi padang','ayam geprek','bakso','mie ayam','seblak','kopi','makan'],
    trans:  ['bensin','bbm','pertalite','pertamax','parkir','tol','ojek','ojol','gojek','grab car','grabcar','gocar','angkot','krl','mrt','taksi','taxi','servis motor','service motor','ganti oli','oli motor','tiket kereta','tiket pesawat','transportasi'],
    shop:   ['belanja bulanan','belanja','beli baju','beli sepatu','skincare','make up','makeup','supermarket','indomaret','alfamart','shopee','tokopedia','lazada','marketplace','baju','sepatu','tas'],
    ent:    ['nonton bioskop','nonton','bioskop','netflix','spotify','youtube premium','langganan','game','steam','konser','karaoke','wisata','jalan-jalan','staycation','hiburan'],
    health: ['rumah sakit','dokter gigi','dokter','klinik','apotek','vitamin','obat','bpjs','vaksin','periksa','kesehatan'],
    edu:    ['spp','kuliah','sekolah','kursus','pelatihan','seminar','workshop','beli buku','buku pelajaran','pendidikan'],
    bill:   ['listrik','token listrik','pln','air pdam','pdam','wifi','indihome','internet','pulsa','paket data','cicilan','kartu kredit','premi asuransi','asuransi','sewa kos','kontrakan','kos','tagihan'],
  },
  income: {
    salary:    ['gajian','gaji bulanan','gaji'],
    bonus:     ['bonus tahunan','bonus','thr','insentif'],
    invest:    ['dividen','untung saham','profit trading','hasil investasi','cuan'],
    freelance: ['freelance','proyek','project','komisi','honor'],
  },
};

const SMART_INCOME_HINTS   = ['gaji','gajian','bonus','thr','dividen','untung','profit','cashback','refund','honor','komisi','freelance','proyek','project','terima uang','dapat uang','pemasukan','cuan'];
const SMART_TRANSFER_HINTS = ['transfer ke','tf ke','pindah saldo','tarik tunai','kirim ke rekening',' transfer ', ' tf '];
const SMART_DAY_MS = 86400000;
const SMART_WEEKDAYS = ['minggu','senin','selasa','rabu','kamis','jumat',"jum'at",'sabtu'];
const SMART_WEEKDAY_INDEX = { minggu:0, ahad:0, senin:1, selasa:2, rabu:3, kamis:4, jumat:5, "jum'at":5, sabtu:6 };

function smartToDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function smartFindDate(text, today) {
  const t = ' ' + text.toLowerCase() + ' ';
  const kemarinLusaM = t.match(/\bkemarin lusa\b|\bkemaren lusa\b/);
  if (kemarinLusaM) return { date: new Date(today.getTime() - 2*SMART_DAY_MS), matched: kemarinLusaM[0].trim() };
  if (/\bbesok lusa\b/.test(t)) return { date: new Date(today.getTime() + 2*SMART_DAY_MS), matched: 'besok lusa' };
  if (/\blusa\b/.test(t)) return { date: new Date(today.getTime() + 2*SMART_DAY_MS), matched: 'lusa' };
  const nHariLalu = t.match(/\b(\d+)\s*hari\s*(yang\s*)?lalu\b/);
  if (nHariLalu) {
    const n = parseInt(nHariLalu[1], 10) || 0;
    return { date: new Date(today.getTime() - n*SMART_DAY_MS), matched: nHariLalu[0].trim() };
  }
  const kemarinM = t.match(/\bkemarin\b|\bkemaren\b/);
  if (kemarinM) return { date: new Date(today.getTime() - SMART_DAY_MS), matched: kemarinM[0].trim() };
  if (/\bbesok\b/.test(t)) return { date: new Date(today.getTime() + SMART_DAY_MS), matched: 'besok' };
  if (/\bhari ini\b/.test(t)) return { date: today, matched: 'hari ini' };
  const tadiPhrase = t.match(/\btadi\s*(pagi|siang|sore|malam)?\b/);
  if (tadiPhrase) return { date: today, matched: tadiPhrase[0].trim() };

  for (const name of SMART_WEEKDAYS) {
    const re = new RegExp('\\b(hari\\s+)?' + name.replace("'", "'?") + '\\b');
    const m = t.match(re);
    if (m) {
      const targetIdx = SMART_WEEKDAY_INDEX[name];
      const todayIdx = today.getDay();
      let diff = todayIdx - targetIdx;
      if (diff < 0) diff += 7;
      return { date: new Date(today.getTime() - diff*SMART_DAY_MS), matched: m[0].trim() };
    }
  }

  const MONTHS = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
  const namedMonth = t.match(/\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\b/);
  if (namedMonth) {
    const day = parseInt(namedMonth[1], 10);
    const month = MONTHS.indexOf(namedMonth[2]);
    return { date: new Date(today.getFullYear(), month, day), matched: namedMonth[0].trim() };
  }
  const slashDate = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (slashDate) {
    const day = parseInt(slashDate[1], 10);
    const month = parseInt(slashDate[2], 10) - 1;
    const year = slashDate[3] ? (slashDate[3].length === 2 ? 2000 + parseInt(slashDate[3], 10) : parseInt(slashDate[3], 10)) : today.getFullYear();
    return { date: new Date(year, month, day), matched: slashDate[0].trim() };
  }

  return { date: today, matched: null };
}

function smartFindAmount(text) {
  const t = text.toLowerCase();
  const unitMatch = t.match(/\b(\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu|k)\b/);
  if (unitMatch) {
    const num = parseFloat(unitMatch[1].replace(',', '.'));
    const factor = (unitMatch[2] === 'jt' || unitMatch[2] === 'juta') ? 1000000 : 1000;
    return { amount: Math.round(num * factor), matched: unitMatch[0] };
  }
  const sepMatch = t.match(/\brp\.?\s*(\d{1,3}(?:[.,]\d{3})+)\b/) || t.match(/\b(\d{1,3}(?:[.,]\d{3})+)\b/);
  if (sepMatch) return { amount: parseInt(sepMatch[1].replace(/[.,]/g, ''), 10), matched: sepMatch[0] };
  const bareMatches = [...t.matchAll(/\b\d{3,}\b/g)];
  if (bareMatches.length) {
    const longest = bareMatches.reduce((a, b) => (b[0].length > a[0].length ? b : a));
    return { amount: parseInt(longest[0], 10), matched: longest[0] };
  }
  return { amount: 0, matched: null };
}

function smartFindCategory(text, type) {
  const t = text.toLowerCase();
  const dict = SMART_CAT_KEYWORDS[type];
  if (!dict) return { catId: 'transfer', matched: null };
  for (const catId in dict) {
    for (const kw of dict[catId]) {
      if (t.includes(kw)) return { catId, matched: kw };
    }
  }
  return { catId: 'other', matched: null };
}

function smartDetectType(text) {
  const t = ' ' + text.toLowerCase() + ' ';
  for (const kw of SMART_TRANSFER_HINTS) if (t.includes(kw)) return 'transfer';
  for (const kw of SMART_INCOME_HINTS)   if (t.includes(kw)) return 'income';
  return 'expense';
}

function smartCleanNote(rawText, removeMatches) {
  let note = rawText;
  removeMatches.filter(Boolean).forEach(m => {
    const idx = note.toLowerCase().indexOf(m.toLowerCase());
    if (idx !== -1) note = note.slice(0, idx) + note.slice(idx + m.length);
  });
  note = note.replace(/\brp\.?\b/gi, '').replace(/\s{2,}/g, ' ').replace(/^[\s,.\-]+|[\s,.\-]+$/g, '').trim();
  if (note) note = note.charAt(0).toUpperCase() + note.slice(1);
  return note;
}

// Parse teks bebas → { type, amount, catId, date, note }
function parseSmartText(text, today) {
  today = today || new Date();
  today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const type = smartDetectType(text);
  const amountRes = smartFindAmount(text);
  const dateRes = smartFindDate(text, today);
  const catRes = smartFindCategory(text, type);
  const note = smartCleanNote(text, [amountRes.matched, dateRes.matched]);
  return {
    type, amount: amountRes.amount, catId: catRes.catId,
    date: smartToDateStr(dateRes.date), note: note || null,
    _debug: { amountMatched: amountRes.matched, dateMatched: dateRes.matched, catMatched: catRes.matched },
  };
}

// Terapkan hasil parse ke form "Catat Transaksi" yang sudah ada di halaman.
// Nggak langsung nyimpen — cuma ngisi field, user tetap review lalu tekan Simpan.
function applySmartParse() {
  const input = document.getElementById('smartInput');
  const raw = (input.value || '').trim();
  if (!raw) { showToast('Ketik dulu transaksinya, mis. "makan siang 25rb"', 'warning'); return; }

  const result = parseSmartText(raw, new Date());
  const chips = [];

  // Tipe (expense/income/transfer) — reset kategori dulu via setType sebelum diisi ulang
  setType(result.type);

  // Nominal
  if (result.amount > 0) {
    S.amountRaw = result.amount;
    document.getElementById('amountDisplay').textContent = result.amount.toLocaleString('id-ID');
    chips.push({ text: 'Rp' + result.amount.toLocaleString('id-ID'), warn: false });
  } else {
    chips.push({ text: 'Nominal Tidak Terdeteksi', warn: true });
  }

  // Kategori
  const catList = CATS[result.type] || [];
  const cat = catList.find(c => c.id === result.catId) || catList.find(c => c.id === 'other');
  if (cat) {
    pickOpt('txCategory', { value: cat.id, text: cat.label, icon: catIcon(cat.id) });
    chips.push({ text: cat.label, warn: false });
  }

  // Tanggal
  pickTxDate(result.date);
  const todayStr = smartToDateStr(new Date());
  const yestStr = smartToDateStr(new Date(Date.now() - SMART_DAY_MS));
  const dateChipText = result.date === todayStr ? 'Hari ini' : (result.date === yestStr ? 'Kemarin' : result.date);
  chips.push({ text: dateChipText, warn: false });

  // Keterangan
  if (result.note) {
    document.getElementById('txNote').value = result.note;
  }

  // Tampilkan preview chip biar user tau apa yang kedeteksi sebelum simpan
  const previewEl = document.getElementById('smartPreview');
  previewEl.innerHTML = chips.map(c =>
    `<span class="smart-chip${c.warn ? ' warn' : ''}">${c.warn ? ICON.warning : ICON.check}${escapeHtml(c.text)}</span>`
  ).join('');
  previewEl.classList.add('show');

  if (result.amount <= 0) {
    showToast('Sebagian terisi otomatis — cek nominal dulu ya', 'warning');
  } else {
    showToast('Form terisi otomatis, cek sebelum simpan', 'success');
    // Let the user see the confirmation chips for a beat, then hand them
    // back to the (now-filled) form behind the modal to review & save.
    const ov = document.getElementById('quickNoteModalOverlay');
    if (ov && ov.classList.contains('open')) setTimeout(closeQuickNoteModal, 900);
  }
}

/* ══════════════════════════════════════════
   SMART-PARSE NOTIFIKASI SMS / E-WALLET
   Format notifikasi jauh lebih terstruktur daripada catatan bebas
   (biasanya ada "Rp" eksplisit, kata kunci baku "pembayaran"/"transfer
   masuk", dan nominal saldo yang HARUS dibedain dari nominal transaksi).
   Dipisah dari parseSmartText() supaya masing-masing tetap sederhana.
══════════════════════════════════════════ */
const SMS_PROVIDER_HINTS = {
  BCA: ['bca'], Mandiri: ['mandiri'], BNI: ['bni'], BRI: ['bri'],
  CIMB: ['cimb'], Jenius: ['jenius'], Jago: ['jago', 'bank jago'],
  Permata: ['permata'], GoPay: ['gopay', 'go-pay'], OVO: ['ovo'],
  DANA: ['dana'], ShopeePay: ['shopeepay', 'shopee pay'],
  LinkAja: ['linkaja', 'link aja'],
};
const SMS_INCOME_KEYWORDS = [
  'transfer masuk', 'dana masuk', 'mutasi kredit', 'kredit sebesar',
  'menerima', 'diterima', 'cashback', 'refund', 'pengembalian dana',
  'top up berhasil dari', 'menerima transfer',
];
const SMS_EXPENSE_KEYWORDS = [
  'pembayaran', 'berhasil membayar', 'transaksi debit', 'mutasi debit',
  'tarik tunai', 'transfer keluar', 'berhasil bayar', 'debit sebesar',
];
const SMS_MERCHANT_STOP = 'telah|berhasil|saldo|senilai|sebesar|pada|tanggal|melalui|via|dengan|no\\.?|ref';

// Ambil nominal transaksi — bukan saldo — dari teks notifikasi.
// Aturan: baca semua kemunculan "Rp<angka>" berurutan, lalu skip kalau
// kata "saldo" muncul tepat sebelum angka itu (mis. "Saldo Rp5.750.000").
function smsFindAmount(text) {
  const re = /rp\.?\s?(\d{1,3}(?:[.,]\d{3})+|\d+)/gi;
  const matches = [...text.matchAll(re)];
  if (!matches.length) return { amount: 0, matched: null };
  for (const m of matches) {
    const before = text.slice(Math.max(0, m.index - 15), m.index).toLowerCase();
    if (before.includes('saldo')) continue;
    return { amount: parseInt(m[1].replace(/[.,]/g, ''), 10), matched: m[0] };
  }
  // Semua kemunculan didahului "saldo" (jarang) — pakai yang pertama saja.
  return { amount: parseInt(matches[0][1].replace(/[.,]/g, ''), 10), matched: matches[0][0] };
}

// Ambil nama merchant/pengirim setelah kata "di", "ke", atau "dari".
// PENTING: kata sambung ("dari"/"ke"/"di") dicocokkan case-insensitive lewat
// alternation manual, tapi nama merchant-nya sendiri HARUS diawali huruf
// kapital/angka (regex tanpa flag /i) — supaya kata sambung Indonesia lain
// yang kebetulan nempel (mis. "dari transaksi di Alfamart") gak ikut kebawa
// jadi bagian dari nama merchant.
function smsFindMerchant(text) {
  const re = new RegExp(
    '\\b(?:dari|Dari|ke|Ke|di|Di)\\s+([A-Z0-9][\\w .,\\-/&]{1,30}?)(?=\\s+(?:' + SMS_MERCHANT_STOP + ')\\b|[.,]|$)'
  );
  const m = text.match(re);
  return m ? m[1].trim().replace(/\s{2,}/g, ' ') : null;
}

function smsDetectType(text) {
  const t = text.toLowerCase();
  for (const kw of SMS_INCOME_KEYWORDS)  if (t.includes(kw)) return 'income';
  for (const kw of SMS_EXPENSE_KEYWORDS) if (t.includes(kw)) return 'expense';
  return 'expense'; // default paling aman buat notifikasi transaksi
}

function smsDetectProvider(text) {
  const t = text.toLowerCase();
  for (const name in SMS_PROVIDER_HINTS) {
    for (const kw of SMS_PROVIDER_HINTS[name]) if (t.includes(kw)) return name;
  }
  return null;
}

// Parse notifikasi SMS/e-wallet → { type, amount, catId, note, provider }
function parseSmsNotif(text) {
  const type = smsDetectType(text);
  const amountRes = smsFindAmount(text);
  const merchant = smsFindMerchant(text);
  const provider = smsDetectProvider(text);
  const catRes = smartFindCategory(merchant ? (text + ' ' + merchant) : text, type);
  let note = merchant || provider || null;
  if (note) note = note.charAt(0).toUpperCase() + note.slice(1);
  return {
    type, amount: amountRes.amount, catId: catRes.catId, note, provider,
    _debug: { merchant, amountMatched: amountRes.matched, catMatched: catRes.matched },
  };
}

// Terapkan hasil parse notifikasi ke form "Catat Transaksi" — sama seperti
// applySmartParse(), tetap gak langsung nyimpen, user tetap review dulu.
function applySmsParse() {
  const input = document.getElementById('smsInput');
  const raw = (input.value || '').trim();
  if (!raw) { showToast('Tempel dulu notifikasinya', 'warning'); return; }

  const result = parseSmsNotif(raw);
  const chips = [];

  setType(result.type);

  if (result.amount > 0) {
    S.amountRaw = result.amount;
    document.getElementById('amountDisplay').textContent = result.amount.toLocaleString('id-ID');
    chips.push({ text: 'Rp' + result.amount.toLocaleString('id-ID'), warn: false });
  } else {
    chips.push({ text: 'Nominal Tidak Terdeteksi', warn: true });
  }

  const catList = CATS[result.type] || [];
  const cat = catList.find(c => c.id === result.catId) || catList.find(c => c.id === 'other');
  if (cat) {
    pickOpt('txCategory', { value: cat.id, text: cat.label, icon: catIcon(cat.id) });
    chips.push({ text: cat.label, warn: false });
  }

  // Notifikasi hampir selalu real-time, jadi tanggalnya hari ini.
  pickTxDate(smartToDateStr(new Date()));
  chips.push({ text: 'Hari ini', warn: false });

  if (result.provider) chips.push({ text: result.provider, warn: false });

  if (result.note) document.getElementById('txNote').value = result.note;

  const previewEl = document.getElementById('smartPreview');
  previewEl.innerHTML = chips.map(c =>
    `<span class="smart-chip${c.warn ? ' warn' : ''}">${c.warn ? ICON.warning : ICON.check}${escapeHtml(c.text)}</span>`
  ).join('');
  previewEl.classList.add('show');

  if (result.amount <= 0) {
    showToast('Sebagian terisi otomatis — cek nominal dulu ya', 'warning');
  } else {
    showToast('Notifikasi kebaca, cek sebelum simpan', 'success');
    const ov = document.getElementById('quickNoteModalOverlay');
    if (ov && ov.classList.contains('open')) setTimeout(closeQuickNoteModal, 900);
  }
}

// Tempel isi clipboard langsung ke kotak notifikasi lalu langsung di-parse.
async function pasteSmsClipboard() {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    showToast('Browser ini gak izinin baca clipboard — tempel manual aja (tap & tahan)', 'warning');
    return;
  }
  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) { showToast('Clipboard kosong', 'warning'); return; }
    const el = document.getElementById('smsInput');
    el.value = text.trim();
    applySmsParse();
  } catch (err) {
    showToast('Gagal baca clipboard — tempel manual aja (tap & tahan)', 'warning');
  }
}

// Ganti antara mode "Ketik" (teks bebas) dan "Tempel Notifikasi" di modal Catat Cepat.
function setSmartMode(mode, animate = true) {
  const isSms = mode === 'sms';
  S._smartMode = mode;
  document.getElementById('smartModeTypeTab').classList.toggle('active', !isSms);
  document.getElementById('smartModeSmsTab').classList.toggle('active', isSms);
  document.getElementById('smartTypePanel').style.display = isSms ? 'none' : '';
  document.getElementById('smartSmsPanel').style.display = isSms ? '' : 'none';
  moveTypeIndicator('smartModeTabs', 'smartModeIndicator', isSms ? 'smartModeSmsTab' : 'smartModeTypeTab', animate);

  const previewEl = document.getElementById('smartPreview');
  previewEl.classList.remove('show');
  previewEl.innerHTML = '';

  if (isSms) stopQuickNoteVoice();
  setTimeout(() => {
    const el = document.getElementById(isSms ? 'smsInput' : 'smartInput');
    if (el) el.focus();
  }, 150);
}

/* ══════════════════════════════════════════
   NAV — floating FAB that opens a vertical
   liquid-glass rail of bubbles, dragged like
   a speed-dial with a wave/label-reveal effect.
══════════════════════════════════════════ */
// Every page reachable from the rail (bubble id "nav-<key>" must exist).
const NAV_PAGES = ['dashboard', 'budget', 'riwayat', 'analytics', 'goals', 'recurring', 'kelolakategori', 'akun', 'settings'];

// Tracks which bubble is currently marked active, so it survives resizes/re-renders.
let _activeNavKey = 'dashboard';

function setActiveNavBubble(key) {
  _activeNavKey = key;
  document.querySelectorAll('.nav-bubble').forEach(b => b.classList.remove('active'));
  const item = document.getElementById('nav-' + key);
  if (item) item.classList.add('active');
}

function toggleNavRail() {
  const rail = document.getElementById('navRail');
  if (!rail) return;
  if (rail.classList.contains('open')) closeNavRail();
  else openNavRail();
}

function openNavRail() {
  document.getElementById('navRail')?.classList.add('open');
  document.getElementById('navFab')?.classList.add('open');
  document.getElementById('navRailScrim')?.classList.add('open');
}

function closeNavRail() {
  document.getElementById('navRail')?.classList.remove('open');
  document.getElementById('navRail')?.classList.remove('dragging');
  document.getElementById('navFab')?.classList.remove('open');
  document.getElementById('navRailScrim')?.classList.remove('open');
  _railBubbles.forEach(b => { b.style.removeProperty('--wave'); b.classList.remove('nb-peek', 'nb-focus'); });
}

function navRailSelect(id) {
  closeNavRail();
  if (id === 'addtx') openModal();
  else showPage(id);
}

// ── Drag-wave: pressing a bubble and dragging up/down ripples the label
//    open on whichever bubble the finger is currently nearest to, like a
//    dock magnifying under the cursor, and picks that item on release.
let _railBubbles = [];
let _railDragging = false;
let _railNearest = null;

function initNavRail() {
  const rail = document.getElementById('navRail');
  if (!rail) return;
  _railBubbles = Array.from(rail.querySelectorAll('.nav-bubble'));
  rail.addEventListener('pointerdown', onRailPointerDown);
}

function onRailPointerDown(e) {
  const rail = document.getElementById('navRail');
  if (!rail || !rail.classList.contains('open')) return;
  _railDragging = true;
  rail.classList.add('dragging');
  updateRailWave(e.clientY);
  window.addEventListener('pointermove', onRailPointerMove);
  window.addEventListener('pointerup', onRailPointerUp, { once: true });
  window.addEventListener('pointercancel', onRailPointerUp, { once: true });
}

function onRailPointerMove(e) {
  if (!_railDragging) return;
  updateRailWave(e.clientY);
}

function updateRailWave(clientY) {
  let nearest = null, nearestDist = Infinity;
  _railBubbles.forEach(b => {
    const r = b.getBoundingClientRect();
    const cy = r.top + r.height / 2;
    const dist = Math.abs(clientY - cy);
    const falloff = Math.max(0, 1 - dist / 85); // wave falloff radius
    b.style.setProperty('--wave', falloff.toFixed(3));
    b.classList.toggle('nb-peek', falloff > 0.3);
    if (dist < nearestDist) { nearestDist = dist; nearest = b; }
  });
  _railNearest = (nearestDist < 40) ? nearest : null;
  _railBubbles.forEach(b => b.classList.toggle('nb-focus', b === _railNearest));
}

function onRailPointerUp() {
  window.removeEventListener('pointermove', onRailPointerMove);
  _railDragging = false;
  document.getElementById('navRail')?.classList.remove('dragging');
  const picked = _railNearest;
  _railBubbles.forEach(b => { b.style.removeProperty('--wave'); b.classList.remove('nb-peek', 'nb-focus'); });
  _railNearest = null;
  // Only act on a real drag-select; a plain tap already fires the bubble's
  // own onclick handler, so don't double-navigate.
  if (picked && _railDidDragMove) navRailSelect(picked.dataset.nav);
  _railDidDragMove = false;
}
let _railDidDragMove = false;
window.addEventListener('pointermove', (e) => { if (_railDragging) _railDidDragMove = true; });

// Close the rail when tapping anywhere outside it (the scrim already
// handles this on touch, this covers mouse/keyboard users too).
document.addEventListener('click', (e) => {
  const rail = document.getElementById('navRail');
  const fab = document.getElementById('navFab');
  if (!rail || !rail.classList.contains('open')) return;
  if (rail.contains(e.target) || (fab && fab.contains(e.target))) return;
  closeNavRail();
});

// Generic sliding indicator for type-toggle groups (Keluar/Masuk/Transfer etc.) —
// same glide-between-items behavior as the bottom nav pill.
function moveTypeIndicator(toggleId, indicatorId, activeId, animate = true) {
  const toggle = document.getElementById(toggleId);
  const indicator = document.getElementById(indicatorId);
  const item = document.getElementById(activeId);
  if (!toggle || !indicator) return;
  if (!item) { indicator.classList.remove('ready'); return; }
  const toggleRect = toggle.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const w = Math.round(itemRect.width), h = Math.round(itemRect.height);
  const t = Math.round(itemRect.top - toggleRect.top), l = Math.round(itemRect.left - toggleRect.left);
  // Skip no-op relayouts. This matters most on mobile: the on-screen keyboard opening/
  // closing (and the address-bar collapsing while scrolling) fires plain window "resize"
  // events even though the pill's own geometry hasn't actually changed. Without this guard,
  // every one of those events still forces `transition:none` below to snap the indicator
  // instantly — and if one lands mid-tap, it eats the very transition the tap just started,
  // which is why the slide animation could look like it "died" after enough taps.
  if (indicator.classList.contains('ready') && indicator.dataset.w === String(w) &&
      indicator.dataset.h === String(h) && indicator.dataset.t === String(t) && indicator.dataset.l === String(l)) {
    return;
  }
  indicator.dataset.w = w; indicator.dataset.h = h; indicator.dataset.t = t; indicator.dataset.l = l;
  if (!animate) indicator.style.transition = 'none';
  indicator.style.width     = w + 'px';
  indicator.style.height    = h + 'px';
  indicator.style.top       = t + 'px';
  indicator.style.transform = `translateX(${l}px)`;
  indicator.classList.add('ready');
  if (!animate) {
    void indicator.offsetWidth; // force reflow so the transition re-enables cleanly
    indicator.style.transition = '';
  }
}
let _typeIndicatorResizeTimer = null;
window.addEventListener('resize', () => {
  // Debounced: a burst of resize events (mobile keyboard, toolbar collapse while
  // scrolling) would otherwise re-run this many times a second — see the guard
  // inside moveTypeIndicator() for why that broke the tap animation.
  clearTimeout(_typeIndicatorResizeTimer);
  _typeIndicatorResizeTimer = setTimeout(() => {
    moveTypeIndicator('addtxTypeToggle', 'typeIndicator', 'type' + S.currentType.charAt(0).toUpperCase() + S.currentType.slice(1), false);
    moveTypeIndicator('recurTypeToggle', 'recurTypeIndicator', 'recurType' + (_recurType||'expense').charAt(0).toUpperCase() + (_recurType||'expense').slice(1), false);
    moveTypeIndicator('smartModeTabs', 'smartModeIndicator', (S._smartMode === 'sms') ? 'smartModeSmsTab' : 'smartModeTypeTab', false);
  }, 150);
});

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');

  const nav = document.getElementById('bottomNav');

  const qnFab = document.getElementById('quickNoteFab');

  if (id === 'addtx') {
    // Full-screen add-transaction page — keep whatever nav item was highlighted
    // before, and hide the floating nav pill since there's already a back button.
    if (nav) nav.classList.add('hidden');
    // Floating "Catat Cepat" trigger only ever appears here.
    if (qnFab) qnFab.classList.add('show');
    clearTimeout(S._qnBubbleShowTimer);
    S._qnBubbleShowTimer = setTimeout(showQuickNoteBubble, 700);
  } else {
    if (qnFab) qnFab.classList.remove('show');
    closeQuickNoteModal();
    hideQuickNoteBubble();
    clearTimeout(S._qnBubbleShowTimer);
    if (nav) nav.classList.remove('hidden');
    closeNavRail();
    if (NAV_PAGES.includes(id)) setActiveNavBubble(id);
  }

  if (id !== 'addtx') S._txReturnPage = id;
  S.currentPage = id;
  if (id === 'analytics')       { setTimeout(renderAnalytics, 60); }
  if (id === 'budget')          setTimeout(renderBudget, 30);
  if (id === 'akun')            renderWallets();
  if (id === 'goals')           renderGoals();
  if (id === 'recurring')       { renderRecurList(); renderSubDetections(); }
  if (id === 'riwayat')         { setTimeout(renderRiwayat, 60); }
  if (id === 'settings')        updateSettingsPage();
  if (id === 'kelolakategori')  renderKategoriList();
}

function updateSettingsPage() {
  if (typeof updateProfileHeroUI === 'function') updateProfileHeroUI();
  const notifDesc  = document.getElementById('settingsNotifDesc');
  const pushBadge  = document.getElementById('settingsPushBadge');
  const supported  = 'Notification' in window;
  const perm       = supported ? Notification.permission : 'unsupported';
  const permLabel  = { granted:'perangkat aktif', denied:'perangkat diblokir', default:'perangkat belum aktif', unsupported:'perangkat tidak didukung' }[perm] || 'perangkat belum aktif';
  if (notifDesc) {
    notifDesc.textContent = NOTIFICATIONS.length + ' peringatan aktif · ' + permLabel;
  }
  if (pushBadge) {
    if (!supported) {
      pushBadge.textContent = '—'; pushBadge.style.opacity = '0.5';
      pushBadge.style.background = ''; pushBadge.style.color = '';
      pushBadge.title = 'Notifikasi perangkat tidak didukung';
    } else if (perm === 'granted') {
      pushBadge.textContent = 'Aktif'; pushBadge.style.opacity = '1';
      pushBadge.style.background = ''; pushBadge.style.color = '';
      pushBadge.title = 'Alert real aktif di perangkat ini';
    } else if (perm === 'denied') {
      pushBadge.textContent = 'Diblokir'; pushBadge.style.opacity = '1';
      pushBadge.style.background = 'rgba(255,107,132,0.18)'; pushBadge.style.color = 'var(--red)';
      pushBadge.title = 'Diblokir — ubah lewat pengaturan browser';
    } else {
      pushBadge.textContent = 'Aktifkan'; pushBadge.style.opacity = '0.85';
      pushBadge.style.background = ''; pushBadge.style.color = '';
      pushBadge.title = 'Tap untuk aktifkan alert real di HP-mu';
    }
  }
  const lockDesc  = document.getElementById('settingsLockDesc');
  const lockBadge = document.getElementById('settingsLockBadge');
  if (lockDesc && lockBadge) {
    if (lockEnabled()) {
      lockDesc.textContent = lockHasBio() ? 'Aktif — PIN & biometrik' : 'Aktif — PIN 6 digit';
      lockBadge.textContent = 'Aktif';
      lockBadge.style.opacity = '1';
    } else {
      lockDesc.textContent = 'Nonaktif — data tanpa PIN';
      lockBadge.textContent = 'Nonaktif';
      lockBadge.style.opacity = '0.6';
    }
  }
  const cloudDesc  = document.getElementById('settingsCloudDesc');
  const cloudBadge = document.getElementById('settingsCloudBadge');
  if (cloudDesc && cloudBadge) {
    if (window._isGuest) {
      cloudDesc.textContent = 'Tersimpan lokal di HP ini — masuk untuk sinkron ke cloud';
      cloudBadge.textContent = 'Lokal';
      cloudBadge.style.opacity = '0.85';
      cloudBadge.style.background = '';
      cloudBadge.style.color = '';
    } else if (window._lastSaveFailed) {
      cloudDesc.textContent = 'Gagal sync — periksa koneksi internetmu';
      cloudBadge.textContent = 'Gagal';
      cloudBadge.style.opacity = '1';
      cloudBadge.style.background = 'rgba(255,107,132,0.18)';
      cloudBadge.style.color = 'var(--red)';
    } else if (window._currentUser) {
      cloudDesc.textContent = 'Data tersimpan otomatis ke akunmu';
      cloudBadge.textContent = 'Sinkron';
      cloudBadge.style.opacity = '1';
      cloudBadge.style.background = '';
      cloudBadge.style.color = '';
    } else {
      cloudDesc.textContent = 'Belum login';
      cloudBadge.textContent = 'Nonaktif';
      cloudBadge.style.opacity = '0.6';
    }
  }
}

function showPageFromMore(id) {
  showPage(id);
}

function cloudBackupTap() {
  if (window._isGuest) {
    showToast('Masuk untuk mengaktifkan sinkronisasi cloud', 'warning');
    exitGuestToLogin();
  } else if (window._lastSaveFailed) {
    _saveNow();
    showToast('Mencoba sinkron ulang...', 'warning');
  } else if (window._currentUser) {
    showToast('Data tersinkron ke akunmu', 'success');
  }
}

/* ══════════════════════════════════════════
   MODAL
══════════════════════════════════════════ */
function openModal() {
  showPage('addtx');
  const _td = new Date().toISOString().split('T')[0];
  document.getElementById('txDate').value = _td;
  const _tdLbl = document.getElementById('txDateLabel');
  if (_tdLbl) _tdLbl.textContent = 'Hari ini';
  document.getElementById('txNote').value = '';
  document.getElementById('amountDisplay').textContent = '0';
  S.amountRaw = 0; S.selectedCat = null; S.selectedBudgetCat = null;
  removeReceipt();
  setType('expense');
  // Reset kotak "Catat Cepat" tiap kali form dibuka, biar ga ada teks/preview nyisa dari sesi sebelumnya
  const smartInputEl = document.getElementById('smartInput');
  const smartPreviewEl = document.getElementById('smartPreview');
  if (smartInputEl) smartInputEl.value = '';
  if (smartPreviewEl) { smartPreviewEl.innerHTML = ''; smartPreviewEl.classList.remove('show'); }
  closeQuickNoteModal();
  // Reset account picker label to first wallet
  const lbl = document.getElementById('txAccountLabel');
  const hid = document.getElementById('txAccount');
  if (WALLETS.length) {
    if (hid) hid.value = WALLETS[0].id;
    if (lbl) lbl.textContent = WALLETS[0].name;
  } else {
    if (lbl) lbl.textContent = 'Tambah akun dulu';
    if (hid) hid.value = '';
  }
  updateTxAmountCurrency();
  renderBudgetCatPicker();
}
function closeModal() { showPage(S._txReturnPage || 'dashboard'); }

/* ══════════════════════════════════════════
   QUICK NOTE — floating trigger + modal
   (only ever shown on the "Catat Transaksi" page — see showPage())
══════════════════════════════════════════ */
function openQuickNoteModal() {
  hideQuickNoteBubble();
  const overlay = document.getElementById('quickNoteModalOverlay');
  overlay.classList.add('open');
  document.getElementById('quickNoteFab').classList.add('open');
  _qnRefreshVoiceButton();
  setSmartMode('type', false);
  // The tab pill is measured against .modal-sheet, which is still mid-way through its own
  // scale/translateY "pop in" transition at this exact point — so the very first measurement
  // above can land a few px off (the pill looked slightly shifted up right as the modal opened).
  // Re-measure once that sheet transition has actually settled so it snaps to its true spot.
  const sheet = overlay.querySelector('.modal-sheet');
  if (sheet) {
    const resync = (e) => {
      if (e && e.target !== sheet) return;
      if (e && e.propertyName && e.propertyName !== 'transform') return;
      sheet.removeEventListener('transitionend', resync);
      setSmartMode(S._smartMode === 'sms' ? 'sms' : 'type', false);
    };
    sheet.addEventListener('transitionend', resync);
    setTimeout(resync, 320); // fallback in case transitionend never fires
  }
  setTimeout(() => { const el = document.getElementById('smartInput'); if (el) el.focus(); }, 250);
}
function closeQuickNoteModal() {
  document.getElementById('quickNoteModalOverlay').classList.remove('open');
  document.getElementById('quickNoteFab').classList.remove('open');
  stopQuickNoteVoice();
  // Notifikasi SMS/e-wallet bisa memuat info saldo/rekening — jangan biarkan nyangkut di form.
  const smsEl = document.getElementById('smsInput');
  if (smsEl) smsEl.value = '';
}
function toggleQuickNoteModal() {
  const ov = document.getElementById('quickNoteModalOverlay');
  if (ov.classList.contains('open')) closeQuickNoteModal(); else openQuickNoteModal();
}
function showQuickNoteBubble() {
  const b = document.getElementById('quickNoteBubble');
  if (!b || document.getElementById('quickNoteModalOverlay').classList.contains('open')) return;
  b.classList.add('show');
  clearTimeout(S._qnBubbleHideTimer);
  S._qnBubbleHideTimer = setTimeout(hideQuickNoteBubble, 4500);
}
function hideQuickNoteBubble() {
  const b = document.getElementById('quickNoteBubble');
  if (b) b.classList.remove('show');
  clearTimeout(S._qnBubbleHideTimer);
}

/* ══════════════════════════════════════════
   VOICE QUICK NOTE — Web Speech API
   Native browser speech-to-text (no external service, no API cost).
   Transcribed text feeds straight into the same parseSmartText() pipeline
   used by typed quick notes — same review-before-save flow either way.
══════════════════════════════════════════ */
const _SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
let _qnRecognition = null;
let _qnListening = false;

function _qnVoiceSupported() { return !!_SpeechRecognitionCtor; }

// Called each time the quick-note modal opens, so the mic button reflects
// support correctly even if it's the very first render.
function _qnRefreshVoiceButton() {
  const micBtn = document.getElementById('smartVoiceBtn');
  if (!micBtn) return;
  micBtn.classList.toggle('unsupported', !_qnVoiceSupported());
}

function toggleQuickNoteVoice() {
  if (!_qnVoiceSupported()) {
    showToast('Input suara belum didukung di browser ini', 'warning');
    return;
  }
  if (_qnListening) { stopQuickNoteVoice(); return; }
  startQuickNoteVoice();
}

function startQuickNoteVoice() {
  const input = document.getElementById('smartInput');
  const micBtn = document.getElementById('smartVoiceBtn');
  const statusEl = document.getElementById('smartVoiceStatus');
  if (!input || !micBtn || !_qnVoiceSupported()) return;

  const recognition = new _SpeechRecognitionCtor();
  _qnRecognition = recognition;
  recognition.lang = 'id-ID';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let gotFinal = false;
  const prevPlaceholder = input.placeholder;
  input.value = '';

  recognition.onstart = () => {
    _qnListening = true;
    micBtn.classList.add('listening');
    if (statusEl) statusEl.classList.add('show');
  };
  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
      if (e.results[i].isFinal) gotFinal = true;
    }
    input.value = transcript;
  };
  recognition.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      showToast('Izin mikrofon ditolak — aktifkan lewat pengaturan browser', 'warning');
    } else if (e.error === 'no-speech') {
      showToast('Gak kedengeran suaranya, coba lagi', 'warning');
    } else if (e.error !== 'aborted') {
      showToast('Gagal merekam suara, coba lagi', 'warning');
    }
  };
  recognition.onend = () => {
    _qnListening = false;
    _qnRecognition = null;
    micBtn.classList.remove('listening');
    if (statusEl) statusEl.classList.remove('show');
    input.placeholder = prevPlaceholder;
    // Auto-run the same parser used for typed quick notes, so voice and
    // typing land in the exact same review-before-save flow.
    if (gotFinal && input.value.trim()) applySmartParse();
  };

  try {
    recognition.start();
  } catch (err) {
    _qnListening = false;
    _qnRecognition = null;
    micBtn.classList.remove('listening');
  }
}

function stopQuickNoteVoice() {
  if (_qnRecognition) { try { _qnRecognition.stop(); } catch (e) {} }
}

function setType(t) {
  S.currentType = t;
  const cats = CATS[t] || [];
  // If there's only one possible category (e.g. Transfer), pick it automatically —
  // otherwise force the user to choose explicitly.
  S.selectedCat = cats.length === 1 ? cats[0].id : null;
  S.selectedBudgetCat = null;
  ['expense','income','transfer'].forEach(type => {
    const b = document.getElementById('type' + type.charAt(0).toUpperCase() + type.slice(1));
    b.className = 'type-btn' + (type === t ? ' active ' + t : '');
  });
  moveTypeIndicator('addtxTypeToggle', 'typeIndicator', 'type' + t.charAt(0).toUpperCase() + t.slice(1));
  // Sync category picker field label/value with the new type's category list
  const catHidden = document.getElementById('txCategory');
  const catLbl     = document.getElementById('txCategoryLabel');
  if (S.selectedCat) {
    const c = cats.find(c => c.id === S.selectedCat);
    if (catHidden) catHidden.value = S.selectedCat;
    if (catLbl && c) catLbl.innerHTML = (ICON[catIcon(c.id)]||'') + ' ' + escapeHtml(c.label);
  } else {
    if (catHidden) catHidden.value = '';
    if (catLbl) catLbl.textContent = 'Pilih kategori';
  }
  renderBudgetCatPicker();
}

function renderBudgetCatPicker() {
  const wrap = document.getElementById('budgetCatWrap');
  const picker = document.getElementById('budgetCatPicker');
  if (!wrap || !picker) return;
  const accId = document.getElementById('txAccount') ? document.getElementById('txAccount').value : '';
  const accCurrency = walletCurrencyCode(accId);
  // Cuma tampilkan kategori anggaran yang currency-nya cocok sama akun yang
  // lagi dipilih — biar transaksi nggak bisa ke-assign ke budget beda currency.
  const matchingCats = BUDGET.cats.filter(c => (c.currency || 'IDR') === accCurrency);
  if (S.selectedBudgetCat && !matchingCats.some(c => c.id === S.selectedBudgetCat)) {
    S.selectedBudgetCat = null; // akun diganti, kategori lama gak relevan lagi
  }
  if (S.currentType !== 'expense' || !matchingCats.length) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'flex';
  picker.innerHTML = matchingCats.map(c =>
    `<div class="cat-chip ${S.selectedBudgetCat===c.id?'selected':''}" onclick="selectBudgetCat('${c.id}')">${ICON[c.icon]||''} ${escapeHtml(c.label)}</div>`
  ).join('');
}

function selectBudgetCat(id) {
  S.selectedBudgetCat = (S.selectedBudgetCat === id) ? null : id;
  renderBudgetCatPicker();
}

/* ══════════════════════════════════════════
   RECEIPT ATTACHMENT
   Photos are compressed client-side (max ~640px wide, JPEG q0.55)
   before being stored inline on the transaction — keeps things simple
   without needing separate file storage, but still adds up if you
   attach a lot of receipts since everything rides in the same synced
   record. Fine for normal use.
══════════════════════════════════════════ */
function handleReceiptSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('File harus berupa gambar', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const maxW = 640;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
      S.pendingReceipt = dataUrl;
      const preview = document.getElementById('txReceiptPreview');
      preview.src = dataUrl;
      document.getElementById('txReceiptPreviewWrap').style.display = 'block';
      document.getElementById('txReceiptEmpty').style.display = 'none';
      runReceiptOCR(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function removeReceipt() {
  S.pendingReceipt = null;
  document.getElementById('txReceiptPreviewWrap').style.display = 'none';
  document.getElementById('txReceiptEmpty').style.display = 'flex';
  const resultEl = document.getElementById('receiptOcrResult');
  if (resultEl) { resultEl.classList.remove('show'); resultEl.innerHTML = ''; }
  const overlay = document.getElementById('receiptOcrOverlay');
  if (overlay) overlay.classList.remove('show');
}

function openReceiptLightbox(src) {
  document.getElementById('receiptLightboxImg').src = src;
  document.getElementById('receiptLightbox').classList.add('open');
}
function closeReceiptLightbox() {
  document.getElementById('receiptLightbox').classList.remove('open');
}

/* ══════════════════════════════════════════
   RECEIPT OCR — Tesseract.js (client-side, gratis, tanpa API key)
   Struk itu beda dari teks bebas: banyak angka (harga per item, subtotal,
   pajak, total, kembalian), jadi pakai pencari nominal sendiri yang nyari
   baris "Total" dulu, baru fallback ke angka terbesar di struk. Hasilnya
   dipakai buat isi form yang sama kayak alur "Catat Cepat" — user tetap
   review chip-nya sebelum Simpan, OCR ga pernah auto-submit.
══════════════════════════════════════════ */
const RECEIPT_TOTAL_KEYWORDS = ['grand total', 'total belanja', 'total bayar', 'total tagihan', 'jumlah bayar', 'total', 'jumlah', 'sub total', 'subtotal'];

// "Rp45.000" / "45.000" / "45,000" -> 45000 (titik/koma dianggap pemisah ribuan ala struk ID)
function receiptParseNumber(str) {
  const digits = str.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return isNaN(n) ? 0 : n;
}

function receiptFindTotal(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const numRe = /\d{1,3}(?:[.,]\d{3})+|\d{4,}/g;

  // 1) Baris yang mengandung kata kunci total — ambil angka terbesar di baris itu.
  //    Urutan keyword sengaja dari yang paling spesifik ("grand total") ke paling umum,
  //    supaya "Total" murni tidak kalah sama "Subtotal" kalau keduanya ada.
  for (const kw of RECEIPT_TOTAL_KEYWORDS) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!lower.includes(kw)) continue;
      // "total" ada sebagai substring di dalam "subtotal"/"sub total", jadi kalau
      // keyword yang lagi dicek adalah "total" polos, baris subtotal harus di-skip —
      // biar ga ke-anggap match duluan sebelum sampai ke baris "Total" beneran.
      if (kw === 'total' && (lower.includes('subtotal') || lower.includes('sub total'))) continue;
      const nums = [...line.matchAll(numRe)].map(m => receiptParseNumber(m[0]));
      if (nums.length) return Math.max(...nums);
    }
  }

  // 2) Fallback: ga ada kata kunci ketemu sama sekali — ambil angka terbesar
  //    di seluruh struk (biasanya total lebih gede dari harga per item).
  const allNums = [...text.matchAll(numRe)].map(m => receiptParseNumber(m[0])).filter(n => n >= 500);
  if (allNums.length) return Math.max(...allNums);

  return 0;
}

// Tebak nama toko/keterangan dari baris atas struk (biasanya nama merchant ada di paling atas)
function receiptGuessNote(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // Baris tanggal/nomor invoice/nomor meja gampang ke-anggap "nama toko" kalau cuma
  // dicek "ada huruf ≥3 karakter" — jadi baris kayak "Date: 2023-07-06 15:19:44" atau
  // "R.No: PB012033" harus di-skip duluan biar yang kepilih beneran nama merchant.
  const skipPatterns = [/^date\b/i, /^r\.?\s*no\b/i, /^invoice\b/i, /^table\b/i, /\d{4}[-/]\d{2}[-/]\d{2}/];
  for (const line of lines.slice(0, 6)) {
    if (skipPatterns.some(re => re.test(line))) continue;
    if (line.length >= 3 && /[a-zA-Z]{3,}/.test(line) && !/^\d+$/.test(line)) {
      return line.length > 40 ? line.slice(0, 40).trim() : line;
    }
  }
  return null;
}

async function runReceiptOCR(dataUrl) {
  if (typeof Tesseract === 'undefined') return; // CDN gagal load / offline — diam aja, isi manual tetap jalan
  const overlay = document.getElementById('receiptOcrOverlay');
  const resultEl = document.getElementById('receiptOcrResult');
  if (overlay) overlay.classList.add('show');
  if (resultEl) { resultEl.classList.remove('show'); resultEl.innerHTML = ''; }

  try {
    const { data } = await Tesseract.recognize(dataUrl, 'ind', { logger: () => {} });
    const text = data.text || '';
    const total = receiptFindTotal(text);
    const note = receiptGuessNote(text);
    const chips = [];

    if (total > 0) {
      S.amountRaw = total;
      const amtEl = document.getElementById('amountDisplay');
      if (amtEl) amtEl.textContent = total.toLocaleString('id-ID');
      chips.push({ text: 'Rp' + total.toLocaleString('id-ID'), warn: false });
    } else {
      chips.push({ text: 'Nominal tidak kebaca — isi manual', warn: true });
    }

    if (note) {
      const noteEl = document.getElementById('txNote');
      if (noteEl && !noteEl.value) noteEl.value = note;
      chips.push({ text: note, warn: false });
    }

    if (resultEl) {
      resultEl.innerHTML = chips.map(c =>
        `<span class="smart-chip${c.warn ? ' warn' : ''}">${c.warn ? ICON.warning : ICON.check}${escapeHtml(c.text)}</span>`
      ).join('');
      resultEl.classList.add('show');
    }
    showToast(total > 0 ? 'Struk kebaca — cek nominal sebelum simpan' : 'Struk susah kebaca, isi manual ya', total > 0 ? 'success' : 'warning');
  } catch (err) {
    console.error('OCR struk gagal:', err);
    showToast('Gagal baca struk, isi manual ya', 'warning');
  } finally {
    if (overlay) overlay.classList.remove('show');
  }
}

function formatAmount(el) {
  const raw = el.textContent.replace(/\D/g,'');
  S.amountRaw = parseInt(raw)||0;
  el.textContent = S.amountRaw.toLocaleString('id-ID');
  const range = document.createRange(), sel = window.getSelection();
  range.selectNodeContents(el); range.collapse(false);
  sel.removeAllRanges(); sel.addRange(range);
}

function submitTransaction() {
  if (S.amountRaw <= 0) { showToast('Nominal harus lebih dari 0', 'warning'); return; }
  if (!S.selectedCat) { showToast('Pilih kategori transaksi dulu', 'warning'); return; }
  const note    = document.getElementById('txNote').value || 'Transaksi';
  const date    = document.getElementById('txDate').value;
  const account = document.getElementById('txAccount').value;
  const cats    = CATS[S.currentType] || [];
  const catId   = S.selectedCat;
  const cat     = cats.find(c=>c.id===catId) || { label:'Lainnya', color:'#888' };

  const tx = { id:Date.now(), type:S.currentType, amount:S.amountRaw,
    note, date, account, cat:cat.label, catId, catColor:cat.color,
    budgetCatId: (S.currentType === 'expense' ? (S.selectedBudgetCat || null) : null),
    receipt: S.pendingReceipt || null };
  S.transactions.unshift(tx);

  if (S.currentType === 'expense') {
    // Prefer the explicitly-picked budget category; fall back to an id match
    // (covers custom budget categories that also appear as a regular category chip).
    const bc = (S.selectedBudgetCat && BUDGET.cats.find(b=>b.id===S.selectedBudgetCat))
             || BUDGET.cats.find(b=>b.id===catId);
    if (bc) {
      if (walletCurrencyCode(account) === (bc.currency || 'IDR')) {
        bc.spent += S.amountRaw;
      } else {
        // Currency wallet & kategori anggaran beda — jangan dicampur ke limit
        // kategori ini. Transaksinya tetap tersimpan, cuma nggak masuk hitungan budget.
        showToast(`Tercatat, tapi nggak dihitung ke budget "${bc.label}" karena beda mata uang`, 'info');
      }
    }
  }
  saveToStorage();
  closeModal();
  showToast('Transaksi tersimpan', 'success');
  renderDashboard();
  if (S.currentPage === 'budget') renderBudget();
  setTimeout(checkBudgetAlerts, 200);
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
function renderDashboard() {
  const txs = S.transactions;
  // Keep BUDGET.total fresh (auto-summed from category limits) before this
  // function's own meter/budget-left calculations read it further down.
  BUDGET.total = computeBudgetTotal();

  // Rp adalah mata uang utama untuk logic internal lain (budget, goals,
  // savings estimate dsb tetap dihitung dari transaksi ber-Rp saja).
  const income  = txs.filter(t => t.type === 'income'  && walletCurrencyCode(t.account) === 'IDR').reduce((s,t) => s+t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense' && walletCurrencyCode(t.account) === 'IDR').reduce((s,t) => s+t.amount, 0);

  // Total aset = saldo real-time tiap wallet, dikelompokkan per currency.
  // Kalau user punya wallet lebih dari satu mata uang, headline Total Aset
  // bergantian menampilkan tiap mata uang (papan iklan/ticker) — nggak
  // dicampur jadi satu angka karena nggak ada konversi kurs di app ini.
  const totalsByCurrency = {};
  WALLETS.forEach(w => {
    const code = w.currency || 'IDR';
    totalsByCurrency[code] = (totalsByCurrency[code] || 0) + getWalletBalance(w.id);
  });
  let balanceEntries = Object.entries(totalsByCurrency).map(([code, amount]) => ({ code, amount }));
  if (!balanceEntries.length) balanceEntries = [{ code: 'IDR', amount: 0 }];
  balanceEntries.sort((a,b) => (a.code==='IDR'?-1:1) - (b.code==='IDR'?-1:1));
  runBalanceTicker(balanceEntries);

  // Pemasukan / Pengeluaran: sama, tapi cuma mata uang yang BENERAN ada
  // transaksinya yang ikut dirotasi. Kalau semua transaksi cuma Rp, ya
  // cuma Rp yang tampil (nggak dipaksa nampilin mata uang kosong).
  const incomeByCurrency = {}, expenseByCurrency = {};
  txs.forEach(t => {
    if (t.type !== 'income' && t.type !== 'expense') return;
    const code = walletCurrencyCode(t.account);
    const bucket = t.type === 'income' ? incomeByCurrency : expenseByCurrency;
    bucket[code] = (bucket[code] || 0) + t.amount;
  });
  let incomeEntries  = Object.entries(incomeByCurrency).map(([code, amount]) => ({ code, amount }));
  let expenseEntries = Object.entries(expenseByCurrency).map(([code, amount]) => ({ code, amount }));
  if (!incomeEntries.length)  incomeEntries  = [{ code: 'IDR', amount: 0 }];
  if (!expenseEntries.length) expenseEntries = [{ code: 'IDR', amount: 0 }];
  runAmountTicker('income',  document.getElementById('totalIncome'),  incomeEntries);
  runAmountTicker('expense', document.getElementById('totalExpense'), expenseEntries);

  const spent = BUDGET.cats.filter(c => (c.currency || 'IDR') === 'IDR').reduce((s,c)=>s+c.spent,0);
  const pct   = BUDGET.total > 0 ? Math.min(100,Math.round(spent/BUDGET.total*100)) : 0;
  document.getElementById('meterBar').style.width  = pct + '%';
  document.getElementById('meterPct').textContent  = pct + '%';
  document.getElementById('meterSub').textContent  =
    'Rp ' + spent.toLocaleString('id-ID') + ' dari Rp ' + BUDGET.total.toLocaleString('id-ID');

  document.getElementById('budgetLeft').textContent = 'Rp ' + fmtK(Math.max(0,BUDGET.total-spent));
  // Populate meter cats dynamically
  const mcEl = document.getElementById('meterCats');
  if (mcEl) {
    const activeCats = BUDGET.cats.filter(c => c.spent > 0).slice(0, 4);
    mcEl.innerHTML = activeCats.map(c => `<div class="meter-cat">${ICON[c.icon]||''} ${escapeHtml(c.label)}</div>`).join('');
  }
  document.getElementById('savingsAmt').textContent = 'Rp ' + fmtK(Math.max(0,income*0.28));
  document.getElementById('txCount').textContent    = txs.length + ' tx';
  // Compute streak
  const streakEl = document.getElementById('streakVal');
  if (streakEl) {
    const dates = [...new Set(txs.map(t=>t.date))].sort((a,b)=>b.localeCompare(a));
    let streak = 0;
    const today2 = new Date(); today2.setHours(0,0,0,0);
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]+'T00:00:00');
      const diffDays = Math.round((today2 - d) / 86400000);
      if (diffDays === i) streak++;
      else break;
    }
    streakEl.textContent = streak + ' hari';
  }

  renderTxList();
  renderBudget();
  drawRiver();
  drawScore();
}

/* ══════════════════════════════════════════
   MULTI-CURRENCY TICKER (dashboard "papan iklan")
   Kalau ada lebih dari satu mata uang yang relevan, angka di Total Aset /
   Pemasukan / Pengeluaran bergantian menampilkan tiap mata uang dengan
   animasi fade+slide, mirip papan iklan berjalan. Kalau cuma satu mata
   uang, tampil statis (nggak ada animasi yang nggak perlu).
══════════════════════════════════════════ */
const _tickerState = {}; // key -> { interval }

function _tickerFade(el, apply) {
  if (!el) { apply(); return; }
  el.style.transition = 'opacity .28s ease, transform .28s ease';
  el.style.opacity = '0';
  el.style.transform = 'translateY(5px)';
  setTimeout(() => {
    apply();
    el.style.transform = 'translateY(-5px)';
    void el.offsetWidth; // force reflow supaya transisi baliknya kepakai
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, 280);
}

function runBalanceTicker(entries) {
  const key = 'balance';
  if (_tickerState[key] && _tickerState[key].interval) clearInterval(_tickerState[key].interval);
  const curEl  = document.getElementById('totalBalanceCur');
  const numEl  = document.getElementById('totalBalance');
  const wrapEl = numEl ? numEl.closest('.balance-amount') : null;
  const dotsEl = document.getElementById('balanceCurDots');

  const paint = i => {
    const { code, amount } = entries[i];
    const info = currencyInfo(code);
    if (curEl) curEl.textContent = info.symbol;
    if (numEl) numEl.textContent = amount.toLocaleString(info.locale);
    if (dotsEl) dotsEl.querySelectorAll('.dot').forEach((d, di) => d.classList.toggle('active', di === i));
  };

  if (dotsEl) {
    if (entries.length > 1) {
      dotsEl.style.display = 'flex';
      dotsEl.innerHTML = entries.map(() => `<span class="dot"></span>`).join('');
    } else {
      dotsEl.style.display = 'none';
      dotsEl.innerHTML = '';
    }
  }

  paint(0);
  if (entries.length > 1) {
    let idx = 0;
    _tickerState[key] = { interval: setInterval(() => {
      idx = (idx + 1) % entries.length;
      _tickerFade(wrapEl, () => paint(idx));
    }, 2800) };
  } else {
    _tickerState[key] = { interval: null };
  }
}

function runAmountTicker(key, el, entries) {
  if (_tickerState[key] && _tickerState[key].interval) clearInterval(_tickerState[key].interval);
  if (!el) return;
  const paint = i => {
    const { code, amount } = entries[i];
    const info = currencyInfo(code);
    el.textContent = info.symbol + ' ' + amount.toLocaleString(info.locale);
  };
  paint(0);
  if (entries.length > 1) {
    let idx = 0;
    _tickerState[key] = { interval: setInterval(() => {
      idx = (idx + 1) % entries.length;
      _tickerFade(el, () => paint(idx));
    }, 2800) };
  } else {
    _tickerState[key] = { interval: null };
  }
}

function fmtK(n) {
  if (n>=1e9) return (n/1e9).toFixed(1)+'M';
  if (n>=1e6) return (n/1e6).toFixed(1)+'jt';
  if (n>=1e3) return Math.round(n/1e3)+'rb';
  return n.toString();
}

function renderTxList() {
  const list  = document.getElementById('txList');
  const empty = document.getElementById('txEmpty');
  // "Terbaru" on the dashboard is meant to be a same-day feed — only show
  // today's transactions here; once the day rolls over it goes back to the
  // empty state automatically (full history still lives in Riwayat).
  const todayStr = new Date().toISOString().split('T')[0];
  const txs = S.transactions.filter(t => t.date === todayStr).slice(0, 15);
  if (!txs.length) { list.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  const groups = {};
  txs.forEach(t=>{ if(!groups[t.date]) groups[t.date]=[]; groups[t.date].push(t); });
  list.innerHTML = Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,items])=>`
    <div class="date-chip">${fmtDate(date)}</div>
    ${items.map(t=>`
      <div class="tx-item-wrap" id="txwrap-${t.id}">
        <div class="tx-delete-bg">${ICON.trash}</div>
        <div class="tx-item glass-sm" id="txitem-${t.id}">
          <div class="tx-icon" style="background:${t.catColor}22">${ICON[catIcon(t.catId)]||''}</div>
          <div class="tx-info">
            <div class="tx-name">${escapeHtml(t.note)}</div>
            <div class="tx-meta">${escapeHtml(t.cat)} · ${escapeHtml(walletName(t.account))}</div>
          </div>
          <div class="tx-amt ${t.type}">${t.type==='income'?'+':'-'}Rp ${t.amount.toLocaleString('id-ID')}</div>
        </div>
      </div>
    `).join('')}
  `).join('');
  // attach swipe-to-delete
  txs.forEach(t => {
    const wrap = document.getElementById('txwrap-'+t.id);
    const item = document.getElementById('txitem-'+t.id);
    if (!wrap || !item) return;
    let startX=0, dx=0, swiping=false;
    item.addEventListener('touchstart', e=>{
      startX=e.touches[0].clientX; dx=0; swiping=false;
    }, {passive:true});
    item.addEventListener('touchmove', e=>{
      dx = e.touches[0].clientX - startX;
      if (dx < -10) { swiping=true; wrap.classList.add('swiping'); }
      if (swiping && dx < 0) item.style.transform = `translateX(${Math.max(dx,-80)}px)`;
    }, {passive:true});
    item.addEventListener('touchend', ()=>{
      if (dx < -60) {
        // confirmed delete
        item.style.transition='transform 0.25s, opacity 0.25s';
        item.style.transform='translateX(-100%)'; item.style.opacity='0';
        setTimeout(()=>{ deleteTx(t.id); }, 250);
      } else {
        item.style.transform=''; wrap.classList.remove('swiping');
      }
      swiping=false;
    });
  });
}

function deleteTx(id) {
  const tx = S.transactions.find(t=>t.id===id);
  if (!tx) return;
  // reverse budget impact (only if it was actually counted toward that budget,
  // i.e. same currency — mirrors the guard in submitTransaction())
  if (tx.type==='expense') {
    const bc = BUDGET.cats.find(b=>b.id===tx.catId);
    if (bc && walletCurrencyCode(tx.account) === (bc.currency || 'IDR')) {
      bc.spent = Math.max(0, bc.spent - tx.amount);
    }
  }
  S.transactions = S.transactions.filter(t=>t.id!==id);
  saveToStorage();
  showToast('Transaksi dihapus', 'success');
  renderDashboard();
}

function calcScore() {
  // No transactions at all yet — there's nothing to score. Returning null
  // (instead of a fake flat number) lets drawScore() show a proper
  // "belum ada data" empty state rather than a misleading "Cukup Baik".
  if (!S.transactions.length) return null;
  // Simple dynamic score: savings rate, budget adherence, tx consistency
  const income  = S.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = S.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  // Savings rate: portion of income left after expenses. With expenses but
  // no income at all, that's the worst case (0) rather than a divide-by-zero.
  const savRate = income > 0 ? Math.max(0, (income-expense)/income) : (expense > 0 ? 0 : 1);
  const budgetPct = expense > 0 ? Math.min(1, BUDGET.total/expense) : 1;
  const txBonus = Math.min(50, S.transactions.length * 5);
  return Math.round(600 + savRate*150 + budgetPct*50 + txBonus);
}

function gradeScore(s) {
  if (s >= 800) return { g:'Luar Biasa!', color:'#2ECC71', t:'Keuangan kamu sangat sehat. Pertahankan!' };
  if (s >= 700) return { g:'Sangat Baik', color:'#2ECC71', t:'Tabungan & pengeluaran dalam kontrol. Bagus!' };
  if (s >= 600) return { g:'Cukup Baik', color:'#FFD166', t:'Ada ruang untuk hemat lebih. Coba kurangi 1 kategori.' };
  if (s >= 500) return { g:'Perlu Perhatian', color:'#FF8C00', t:'Pengeluaran mendekati pemasukan. Tinjau anggaran.' };
  return { g:'Perlu Diperbaiki', color:'#FF6B84', t:'Pengeluaran melebihi pemasukan. Segera tinjau!' };
}

const CUSTOM_CAT_ICONS = {};
function catIcon(id) {
  return CUSTOM_CAT_ICONS[id] || {food:'utensils',trans:'car',shop:'cart',ent:'gamepad',health:'health',edu:'book',
          bill:'bill',other:'package',salary:'briefcase',bonus:'gift',invest:'trendUp',freelance:'laptop',transfer:'swap'}[id]||'package';
}
function fmtDate(s) {
  const d=new Date(s+'T00:00:00'),t=new Date(); t.setHours(0,0,0,0);
  const diff=(t-d)/86400000;
  return diff<1?'Hari Ini':diff<2?'Kemarin':d.toLocaleDateString('id-ID',{day:'numeric',month:'long'});
}

/* ══════════════════════════════════════════
   BUDGET
══════════════════════════════════════════ */
// Total anggaran nggak lagi diinput manual — dihitung otomatis dari jumlah
// limit tiap kategori anggaran (yang mata uangnya Rp), biar selalu nyambung
// sama kategori per kategori di bawahnya alih-alih dua angka terpisah yang
// bisa nggak sinkron.
function computeBudgetTotal() {
  return BUDGET.cats.filter(c => (c.currency || 'IDR') === 'IDR').reduce((s,c) => s + (c.limit || 0), 0);
}

function renderBudget() {
  BUDGET.total = computeBudgetTotal();
  // Apply budget filter to compute real spent from transactions
  const bf   = typeof BUDGET_FILTER !== 'undefined' ? BUDGET_FILTER : {};
  const filtTx = S.transactions.filter(t => {
    if (t.type !== 'expense') return false;
    if (bf.dateFrom && t.date < bf.dateFrom) return false;
    if (bf.dateTo   && t.date > bf.dateTo)   return false;
    return true;
  });
  // Overview (bov-*) dibandingkan ke BUDGET.total yang Rp — jadi cuma
  // transaksi ber-currency IDR yang dihitung di sini, konsisten sama dashboard.
  const used = filtTx.filter(t => walletCurrencyCode(t.account) === 'IDR').reduce((s,t) => s+t.amount, 0);
  const left = Math.max(0, BUDGET.total - used);
  document.getElementById('bov-total').textContent = 'Rp ' + BUDGET.total.toLocaleString('id-ID');
  document.getElementById('bov-used').textContent  = 'Rp ' + used.toLocaleString('id-ID');
  document.getElementById('bov-left').textContent  = 'Rp ' + left.toLocaleString('id-ID');
  document.getElementById('bov-save').textContent  = BUDGET.total > 0 ? Math.round(left/BUDGET.total*100)+'%' : '—';
  // Period label
  const periodEl = document.getElementById('budgetPeriod');
  if (periodEl) {
    if (!bf.dateFrom) periodEl.textContent = 'Semua Waktu';
    else if (bf.dateFrom === bf.dateTo) periodEl.textContent = fmtDateShort(bf.dateFrom);
    else periodEl.textContent = fmtDateShort(bf.dateFrom) + ' – ' + fmtDateShort(bf.dateTo);
  }
  document.getElementById('budgetCats').innerHTML = BUDGET.cats.length ? BUDGET.cats.map(c => {
    const cCode = c.currency || 'IDR';
    const sym   = currencyInfo(cCode).symbol;
    // Spent kategori ini cuma dari transaksi yang wallet-nya se-currency sama kategorinya
    const spent = filtTx.filter(t => t.catId === c.id && walletCurrencyCode(t.account) === cCode).reduce((s,t) => s+t.amount, 0);
    const pct   = c.limit > 0 ? Math.min(100, Math.round(spent/c.limit*100)) : 0;
    const color = pct>90?'var(--red)':pct>70?'var(--gold)':c.color;
    return `
      <div class="bcat-item-wrap">
        <div class="bcat-actions">
          <div class="wact-btn wact-edit" onclick="openEditBudgetModal('${c.id}')">${ICON.edit||''}<span>Edit</span></div>
          <div class="wact-btn wact-del" onclick="removeBudgetCat('${c.id}')">${ICON.trash||''}<span>Hapus</span></div>
        </div>
        <div class="bcat-item-slide" data-bcat-id="${c.id}">
          <div class="bcat glass-sm">
            <div class="bcat-head">
              <div class="bcat-icon" style="background:${c.color}22">${ICON[c.icon]||''}</div>
              <div class="bcat-name">${escapeHtml(c.label)}</div>
              <div class="bcat-remain">sisa ${sym} ${fmtK(Math.max(0,c.limit-spent))}</div>
            </div>
            <div class="bcat-bar-bg"><div class="bcat-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <div class="bcat-amounts"><span>${sym} ${spent.toLocaleString(currencyInfo(cCode).locale)}</span><span>${sym} ${c.limit.toLocaleString(currencyInfo(cCode).locale)}</span></div>
          </div>
        </div>
      </div>`;
  }).join('') : `
    <div class="empty" onclick="openAddBudgetModal()" style="cursor:pointer">
      <div class="empty-icon">${ICON.wallet||ICON.settings||''}</div>
      <h3>Belum ada kategori anggaran</h3>
      <p>Ketuk ＋ di atas untuk membuat kategori anggaranmu sendiri</p>
    </div>`;
  initBcatSwipe();
}

/* Swipe-to-reveal for budget category cards — same interaction as wallet
   cards (see initWalletSwipe) and category rows (see initKcSwipe): drag a
   card left to uncover its Edit/Hapus buttons underneath instead of
   showing them permanently, or stuffing category management inside the
   "Tambah Anggaran" modal. Only one card stays open at a time. */
function initBcatSwipe() {
  document.querySelectorAll('.bcat-item-slide').forEach(slide => {
    const wrap    = slide.closest('.bcat-item-wrap');
    const actions = wrap ? wrap.querySelector('.bcat-actions') : null;
    if (!wrap || !actions) return;
    const maxOffset = () => actions.offsetWidth;
    let startX = 0, startY = 0, baseX = 0, dragging = false, decided = false, horiz = false;

    slide.addEventListener('touchstart', e => {
      closeOtherBcatSwipes(slide);
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      baseX  = getBcatSlideX(slide);
      dragging = true; decided = false; horiz = false;
      slide.classList.add('dragging');
      actions.classList.add('dragging');
    }, {passive:true});

    slide.addEventListener('touchmove', e => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        decided = true;
        horiz = Math.abs(dx) > Math.abs(dy);
        if (!horiz) { dragging = false; slide.classList.remove('dragging'); actions.classList.remove('dragging'); return; }
      }
      const next = Math.max(-maxOffset(), Math.min(0, baseX + dx));
      slide.style.transform = `translateX(${next}px)`;
      setBcatActionsProgress(actions, Math.min(1, Math.abs(next) / maxOffset()));
    }, {passive:true});

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      slide.classList.remove('dragging');
      actions.classList.remove('dragging');
      if (!decided || !horiz) return;
      const x = getBcatSlideX(slide);
      const open = x < -maxOffset() * 0.35;
      slide.style.transform = `translateX(${open ? -maxOffset() : 0}px)`;
      setBcatActionsProgress(actions, open ? 1 : 0);
      _bcatSwipeOpen = open ? slide : null;
    }
    slide.addEventListener('touchend', endDrag);
    slide.addEventListener('touchcancel', endDrag);
  });
}
let _bcatSwipeOpen = null;
function getBcatSlideX(el) {
  const m = /translateX\((-?[\d.]+)px\)/.exec(el.style.transform || '');
  return m ? parseFloat(m[1]) : 0;
}
function setBcatActionsProgress(actions, progress) {
  actions.style.opacity   = progress;
  const scale = 0.86 + 0.14 * progress;
  const tx    = (1 - progress) * 10;
  actions.style.transform = `scale(${scale}) translateX(${tx}px)`;
}
function closeOtherBcatSwipes(except) {
  document.querySelectorAll('.bcat-item-slide').forEach(s => {
    if (s === except) return;
    if (getBcatSlideX(s) === 0) return;
    s.style.transform = 'translateX(0px)';
    const actions = s.closest('.bcat-item-wrap')?.querySelector('.bcat-actions');
    if (actions) setBcatActionsProgress(actions, 0);
  });
  if (_bcatSwipeOpen && _bcatSwipeOpen !== except) _bcatSwipeOpen = null;
}
document.addEventListener('touchstart', e => {
  if (!_bcatSwipeOpen) return;
  if (e.target.closest('.bcat-item-wrap')) return;
  closeOtherBcatSwipes(null);
}, {passive:true});

/* ══════════════════════════════════════════
   WALLETS
══════════════════════════════════════════ */
function walletName(walletId) {
  const w = WALLETS.find(w => w.id === walletId);
  return w ? w.name : (walletId || '—');
}
function getWalletBalance(walletId) {
  // Start from base balance, apply all transactions for that wallet
  const w = WALLETS.find(w => w.id === walletId);
  if (!w) return 0;
  let bal = w.bal;
  S.transactions.forEach(t => {
    if (t.account === walletId) {
      if (t.type === 'income')   bal += t.amount;
      if (t.type === 'expense')  bal -= t.amount;
    }
    if (t.type === 'transfer') {
      if (t.fromAccount === walletId) bal -= t.amount;
      if (t.toAccount   === walletId) bal += t.amount;
    }
  });
  return bal;
}

function renderWallets() {
  const list = document.getElementById('walletList');
  if (!list) return;
  if (!WALLETS.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">${ICON.creditCard}</div><h3>Belum ada akun</h3><p>Tambahkan rekening atau dompetmu</p></div>`;
    return;
  }
  const WALLET_TYPE_LABELS = { bank:'Rekening', ewallet:'E-Wallet', tunai:'Tunai', invest:'Investasi' };
  const walletTypeLabel = w => WALLET_TYPE_LABELS[w.type] || 'Rekening';
  document.getElementById('walletList').innerHTML = WALLETS.map(w => {
    const bal = getWalletBalance(w.id);
    const cur = currencyInfo(w.currency);
    return `
    <div class="wallet-item-wrap">
      <div class="wallet-actions">
        <button class="wact-btn wact-edit" onclick="openEditWalletModal('${w.id}')">${ICON.edit}<span>Edit</span></button>
        <button class="wact-btn wact-del"  onclick="deleteWallet('${w.id}')">${ICON.trash}<span>Hapus</span></button>
      </div>
      <div class="wallet-card-slide" data-wallet-id="${w.id}">
        <div class="wallet-card" style="background:${w.bg}">
          <div class="wallet-chip" style="color:${w.chipColor}">${walletTypeLabel(w)}</div>
          <div class="wallet-name">${w.name}</div>
          <div class="wallet-bank">${w.bank}</div>
          <div class="wallet-bal"><span class="wr-cur">${cur.symbol}</span>${bal.toLocaleString(cur.locale)}</div>
          <div class="wallet-footer">
            <div class="wallet-last">Saldo awal: ${cur.symbol} ${w.bal.toLocaleString(cur.locale)}</div>
            <div class="wallet-tag" style="color:${w.chipColor}">Aktif</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  initWalletSwipe();
}

/* Swipe-to-reveal for wallet cards — drag a card left to uncover its
   Edit/Hapus buttons underneath (like a standard swipeable list item)
   instead of showing them under every card all the time. Only one card
   stays open at a time. */
function initWalletSwipe() {
  document.querySelectorAll('.wallet-card-slide').forEach(slide => {
    const wrap    = slide.closest('.wallet-item-wrap');
    const actions = wrap ? wrap.querySelector('.wallet-actions') : null;
    if (!wrap || !actions) return;
    const maxOffset = () => actions.offsetWidth;
    let startX = 0, startY = 0, baseX = 0, dragging = false, decided = false, horiz = false;

    slide.addEventListener('touchstart', e => {
      closeOtherWalletSwipes(slide);
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      baseX  = getWalletSlideX(slide);
      dragging = true; decided = false; horiz = false;
      slide.classList.add('dragging');
      actions.classList.add('dragging');
    }, {passive:true});

    slide.addEventListener('touchmove', e => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        decided = true;
        horiz = Math.abs(dx) > Math.abs(dy);
        if (!horiz) { dragging = false; slide.classList.remove('dragging'); actions.classList.remove('dragging'); return; }
      }
      const next = Math.max(-maxOffset(), Math.min(0, baseX + dx));
      slide.style.transform = `translateX(${next}px)`;
      setWalletActionsProgress(actions, Math.min(1, Math.abs(next) / maxOffset()));
    }, {passive:true});

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      slide.classList.remove('dragging');
      actions.classList.remove('dragging');
      if (!decided || !horiz) return;
      const x = getWalletSlideX(slide);
      const open = x < -maxOffset() * 0.35;
      slide.style.transform = `translateX(${open ? -maxOffset() : 0}px)`;
      setWalletActionsProgress(actions, open ? 1 : 0);
      _walletSwipeOpen = open ? slide : null;
    }
    slide.addEventListener('touchend', endDrag);
    slide.addEventListener('touchcancel', endDrag);
  });
}
let _walletSwipeOpen = null;
function getWalletSlideX(el) {
  const m = /translateX\((-?[\d.]+)px\)/.exec(el.style.transform || '');
  return m ? parseFloat(m[1]) : 0;
}
function setWalletActionsProgress(actions, progress) {
  actions.style.opacity   = progress;
  const scale = 0.86 + 0.14 * progress;
  const tx    = (1 - progress) * 10;
  actions.style.transform = `scale(${scale}) translateX(${tx}px)`;
}
function closeOtherWalletSwipes(except) {
  document.querySelectorAll('.wallet-card-slide').forEach(s => {
    if (s === except) return;
    if (getWalletSlideX(s) === 0) return;
    s.style.transform = 'translateX(0px)';
    const actions = s.closest('.wallet-item-wrap')?.querySelector('.wallet-actions');
    if (actions) setWalletActionsProgress(actions, 0);
  });
  if (_walletSwipeOpen && _walletSwipeOpen !== except) _walletSwipeOpen = null;
}
document.addEventListener('touchstart', e => {
  if (!_walletSwipeOpen) return;
  if (e.target.closest('.wallet-item-wrap')) return;
  closeOtherWalletSwipes(null);
}, {passive:true});

function deleteWallet(id) {
  showConfirm('Hapus akun ini?', 'Transaksi terkait tidak ikut terhapus.', () => {
    WALLETS = WALLETS.filter(w => w.id !== id);
    saveToStorage();
    renderWallets();
    updateAccountDropdown();
    renderDashboard();
    showToast('Akun dihapus', 'success');
  });
}

function openEditWalletModal(id) {
  const w = WALLETS.find(w => w.id === id);
  if (!w) return;
  document.getElementById('editWalletId').value        = id;
  document.getElementById('editWalletNameInput').value = w.name;
  document.getElementById('editWalletBankInput').value = w.bank;
  document.getElementById('editWalletBalInput').value  = w.bal;
  const n = w.name.toLowerCase();
  let wType = w.type;
  if (!wType) {
    // Fallback for akun lama yang belum punya field type tersimpan — tebak dari nama.
    wType = 'bank';
    if (n.includes('tunai') || n.includes('cash')) wType = 'tunai';
    else if (n.includes('pay') || n.includes('ovo') || n.includes('dana') || n.includes('wallet')) wType = 'ewallet';
    else if (n.includes('saham') || n.includes('invest') || n.includes('reksa')) wType = 'invest';
  }
  const ewt = document.getElementById('editWalletTypeInput'); if(ewt) ewt.value = wType;
  const typeIcons  = {bank:'bank', ewallet:'smartphone', tunai:'cash', invest:'trendUp'};
  const typeLabels = {bank:'Rekening', ewallet:'E-Wallet', tunai:'Tunai', invest:'Investasi'};
  const etl = document.getElementById('editWalletTypeLbl');
  if (etl) etl.innerHTML = (ICON[typeIcons[wType]]||'') + ' ' + escapeHtml(typeLabels[wType]||'Rekening');
  const currCode = w.currency || 'IDR';
  const eci = document.getElementById('editWalletCurrencyInput'); if (eci) eci.value = currCode;
  const ecl = document.getElementById('editWalletCurrencyLbl');   if (ecl) ecl.textContent = currencyLabelText(currCode);
  document.getElementById('editWalletModalOverlay').classList.add('open');
}
function closeEditWalletModal() { document.getElementById('editWalletModalOverlay').classList.remove('open'); }

function submitEditWallet() {
  const id   = document.getElementById('editWalletId').value;
  const name = document.getElementById('editWalletNameInput').value.trim();
  const bank = document.getElementById('editWalletBankInput').value.trim() || name;
  const bal  = parseInt(document.getElementById('editWalletBalInput').value) || 0;
  const type = document.getElementById('editWalletTypeInput').value;
  const currency = document.getElementById('editWalletCurrencyInput').value || 'IDR';
  if (!name) { showToast('Nama akun wajib diisi', 'warning'); return; }
  const WALLET_THEMES = {
    bank:    { bg:'linear-gradient(135deg,#0a2463,#1a3a8a)', chipColor:'#5EB3FF' },
    ewallet: { bg:'linear-gradient(135deg,#0d3320,#1a5c38)', chipColor:'#2AE8C4' },
    tunai:   { bg:'linear-gradient(135deg,#3a2000,#6b3d00)', chipColor:'#FFD166' },
    invest:  { bg:'linear-gradient(135deg,#1a0a3a,#3a1a6a)', chipColor:'#C4A8FF' },
  };
  const theme = WALLET_THEMES[type] || WALLET_THEMES.bank;
  WALLETS = WALLETS.map(w => w.id === id ? { ...w, name, bank, bal, currency, type, ...theme } : w);
  saveToStorage();
  closeEditWalletModal();
  renderWallets();
  updateAccountDropdown();
  renderDashboard();
  showToast('Akun diperbarui', 'success');
}

/* ══════════════════════════════════════════
   BUDGET MODAL (Tambah / Edit Anggaran)
   Add-only trigger from the topbar (＋); editing and deleting an existing
   budget category happens on the page itself via swipe-to-reveal
   Edit/Hapus (see renderBudget() + initBcatSwipe below) — same pattern
   as Kelola Kategori and Akun. This modal never lists existing
   categories anymore.
══════════════════════════════════════════ */
let _editingBudgetCatId = null;

function openAddBudgetModal() {
  _editingBudgetCatId = null;
  document.getElementById('budgetModalTitle').textContent = 'Tambah Anggaran';
  document.getElementById('budgetModalSubmitBtn').textContent = 'Tambah Anggaran';
  document.getElementById('editBudgetCatId').value = '';
  document.getElementById('newBudgetCatName').value = '';
  document.getElementById('budgetCatLimitInput').value = '';
  document.getElementById('newBudgetCatCurrency').value = 'IDR';
  document.getElementById('newBudgetCatCurrencyLbl').textContent = currencyLabelText('IDR');
  _pendingBudgetCatIcon = null;
  renderBudgetCatIconGrid();
  document.getElementById('budgetSettingsModalOverlay').classList.add('open');
}
// Kept as an alias so any older onclick reference still opens the (now add-only) modal.
function openBudgetSettingsModal() { openAddBudgetModal(); }

function openEditBudgetModal(id) {
  const cat = BUDGET.cats.find(c => c.id === id);
  if (!cat) return;
  _editingBudgetCatId = id;
  document.getElementById('budgetModalTitle').textContent = 'Edit Anggaran';
  document.getElementById('budgetModalSubmitBtn').textContent = 'Simpan Perubahan';
  document.getElementById('editBudgetCatId').value = id;
  document.getElementById('newBudgetCatName').value = cat.label;
  document.getElementById('budgetCatLimitInput').value = cat.limit || '';
  const cur = cat.currency || 'IDR';
  document.getElementById('newBudgetCatCurrency').value = cur;
  document.getElementById('newBudgetCatCurrencyLbl').textContent = currencyLabelText(cur);
  _pendingBudgetCatIcon = cat.icon;
  renderBudgetCatIconGrid();
  document.getElementById('budgetSettingsModalOverlay').classList.add('open');
}

function closeBudgetSettingsModal() { document.getElementById('budgetSettingsModalOverlay').classList.remove('open'); }

function renderBudgetCatIconGrid() {
  const grid = document.getElementById('budgetCatIconGrid');
  grid.innerHTML = BUDGET_CAT_ICONS.map(key => `
    <div class="icon-pick-item ${_pendingBudgetCatIcon===key?'selected':''}" onclick="selectBudgetCatIcon('${key}')">${ICON[key]||''}</div>
  `).join('');
}
function selectBudgetCatIcon(key) {
  _pendingBudgetCatIcon = key;
  renderBudgetCatIconGrid();
}

function submitBudgetCatModal() {
  const name = document.getElementById('newBudgetCatName').value.trim();
  if (!name) { showToast('Nama kategori wajib diisi', 'warning'); return; }
  if (!_pendingBudgetCatIcon) { showToast('Pilih ikon untuk kategori ini', 'warning'); return; }
  const limit    = parseInt(document.getElementById('budgetCatLimitInput').value) || 0;
  const currency = document.getElementById('newBudgetCatCurrency').value || 'IDR';

  if (_editingBudgetCatId) {
    // Edit mode
    const cat = BUDGET.cats.find(c => c.id === _editingBudgetCatId);
    if (!cat) { closeBudgetSettingsModal(); return; }
    const currencyChanged = (cat.currency || 'IDR') !== currency;
    cat.label    = name;
    cat.icon     = _pendingBudgetCatIcon;
    cat.limit    = limit;
    cat.currency = currency;
    CUSTOM_CAT_ICONS[cat.id] = _pendingBudgetCatIcon;
    // Keep the matching expense category in sync (name/icon shown when logging transactions)
    const expCat = CATS.expense.find(c => c.id === cat.id);
    if (expCat) expCat.label = name;
    if (currencyChanged && cat.spent > 0) {
      // Progres "terpakai" lama dihitung dalam currency lama — nggak nyambung
      // lagi sama limit di currency baru, jadi direset biar nggak nyesatin.
      cat.spent = 0;
      showToast('Anggaran diperbarui — progres terpakai direset karena mata uang berubah', 'info');
    } else {
      showToast('Anggaran diperbarui', 'success');
    }
  } else {
    // Add mode
    const id = 'cat_' + name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,20) + '_' + Date.now().toString(36);
    const color = BUDGET_CAT_COLORS[BUDGET.cats.length % BUDGET_CAT_COLORS.length];
    BUDGET.cats.push({ id, label:name, icon:_pendingBudgetCatIcon, color, limit, spent:0, currency });
    CUSTOM_CAT_ICONS[id] = _pendingBudgetCatIcon;
    // Make it selectable when logging expense transactions too, so spending actually tracks against this budget
    const expCats = CATS.expense;
    const insertAt = expCats.length && expCats[expCats.length-1].id === 'other' ? expCats.length - 1 : expCats.length;
    expCats.splice(insertAt, 0, { id, label:name, color });
    showToast('Anggaran ditambahkan', 'success');
  }

  closeBudgetSettingsModal();
  saveToStorage();
  renderBudget();
  updateSettingsPage();
}

function removeBudgetCat(id) {
  showConfirm('Hapus kategori anggaran ini?', 'Limit anggaran untuk kategori ini akan dihapus.', () => {
    BUDGET.cats = BUDGET.cats.filter(c => c.id !== id);
    CATS.expense = CATS.expense.filter(c => c.id !== id);
    delete CUSTOM_CAT_ICONS[id];
    saveToStorage();
    renderBudget();
    updateSettingsPage();
    showToast('Anggaran dihapus', 'success');
  }, 'trash');
}

/* ══════════════════════════════════════════
   KELOLA KATEGORI
══════════════════════════════════════════ */
let KC_TYPE = 'expense';
let _editingCatId = null;
let _pendingCatIcon = null;
let _pendingCatColor = null;

function setKategoriType(type) {
  KC_TYPE = type;
  document.getElementById('kcTypeExpense').classList.toggle('active', type === 'expense');
  document.getElementById('kcTypeIncome').classList.toggle('active', type === 'income');
  renderKategoriList();
}

function renderKategoriList() {
  const wrap = document.getElementById('kategoriList');
  if (!wrap) return;
  const cats = CATS[KC_TYPE] || [];
  if (!cats.length) {
    wrap.innerHTML = `
      <div class="empty" onclick="openAddCategoryModal()" style="cursor:pointer">
        <div class="empty-icon">${ICON.package||''}</div>
        <h3>Belum ada kategori</h3>
        <p>Ketuk ＋ di atas untuk menambah kategori pertamamu</p>
      </div>`;
    return;
  }
  wrap.innerHTML = cats.map(c => `
    <div class="kc-item-wrap">
      <div class="kc-actions">
        <div class="kc-act-btn" onclick="openEditCategoryModal('${KC_TYPE}','${c.id}')">${ICON.edit||''}</div>
        <div class="kc-act-btn kc-act-del" onclick="deleteCategory('${KC_TYPE}','${c.id}')">${ICON.trash||''}</div>
      </div>
      <div class="kc-item kc-item-slide glass-sm" data-cat-id="${c.id}">
        <div class="kc-icon" style="background:${c.color}22;color:${c.color}">${ICON[catIcon(c.id)]||ICON.package}</div>
        <div class="kc-name">${escapeHtml(c.label)}</div>
      </div>
    </div>`).join('');
  initKcSwipe();
}

/* Swipe-to-reveal for category rows — same interaction as wallet cards
   (see initWalletSwipe): drag a row left to uncover its Edit/Hapus
   buttons underneath instead of showing them permanently on every row.
   Only one row stays open at a time. */
function initKcSwipe() {
  document.querySelectorAll('.kc-item-slide').forEach(slide => {
    const wrap    = slide.closest('.kc-item-wrap');
    const actions = wrap ? wrap.querySelector('.kc-actions') : null;
    if (!wrap || !actions) return;
    const maxOffset = () => actions.offsetWidth;
    let startX = 0, startY = 0, baseX = 0, dragging = false, decided = false, horiz = false;

    slide.addEventListener('touchstart', e => {
      closeOtherKcSwipes(slide);
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      baseX  = getKcSlideX(slide);
      dragging = true; decided = false; horiz = false;
      slide.classList.add('dragging');
      actions.classList.add('dragging');
    }, {passive:true});

    slide.addEventListener('touchmove', e => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        decided = true;
        horiz = Math.abs(dx) > Math.abs(dy);
        if (!horiz) { dragging = false; slide.classList.remove('dragging'); actions.classList.remove('dragging'); return; }
      }
      const next = Math.max(-maxOffset(), Math.min(0, baseX + dx));
      slide.style.transform = `translateX(${next}px)`;
      setKcActionsProgress(actions, Math.min(1, Math.abs(next) / maxOffset()));
    }, {passive:true});

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      slide.classList.remove('dragging');
      actions.classList.remove('dragging');
      if (!decided || !horiz) return;
      const x = getKcSlideX(slide);
      const open = x < -maxOffset() * 0.35;
      slide.style.transform = `translateX(${open ? -maxOffset() : 0}px)`;
      setKcActionsProgress(actions, open ? 1 : 0);
      _kcSwipeOpen = open ? slide : null;
    }
    slide.addEventListener('touchend', endDrag);
    slide.addEventListener('touchcancel', endDrag);
  });
}
let _kcSwipeOpen = null;
function getKcSlideX(el) {
  const m = /translateX\((-?[\d.]+)px\)/.exec(el.style.transform || '');
  return m ? parseFloat(m[1]) : 0;
}
function setKcActionsProgress(actions, progress) {
  actions.style.opacity   = progress;
  const scale = 0.86 + 0.14 * progress;
  const tx    = (1 - progress) * 10;
  actions.style.transform = `scale(${scale}) translateX(${tx}px)`;
}
function closeOtherKcSwipes(except) {
  document.querySelectorAll('.kc-item-slide').forEach(s => {
    if (s === except) return;
    if (getKcSlideX(s) === 0) return;
    s.style.transform = 'translateX(0px)';
    const actions = s.closest('.kc-item-wrap')?.querySelector('.kc-actions');
    if (actions) setKcActionsProgress(actions, 0);
  });
  if (_kcSwipeOpen && _kcSwipeOpen !== except) _kcSwipeOpen = null;
}
document.addEventListener('touchstart', e => {
  if (!_kcSwipeOpen) return;
  if (e.target.closest('.kc-item-wrap')) return;
  closeOtherKcSwipes(null);
}, {passive:true});

function renderCategoryIconGrid() {
  const grid = document.getElementById('categoryIconGrid');
  if (!grid) return;
  grid.innerHTML = BUDGET_CAT_ICONS.map(key => `
    <div class="icon-pick-item ${_pendingCatIcon===key?'selected':''}" onclick="selectCategoryIcon('${key}')">${ICON[key]||''}</div>
  `).join('');
}
function selectCategoryIcon(key) {
  _pendingCatIcon = key;
  renderCategoryIconGrid();
}

function renderCategoryColorGrid() {
  const grid = document.getElementById('categoryColorGrid');
  if (!grid) return;
  grid.innerHTML = BUDGET_CAT_COLORS.map(color => `
    <div class="color-pick-item ${_pendingCatColor===color?'selected':''}" style="background:${color}" onclick="selectCategoryColor('${color}')"></div>
  `).join('');
}
function selectCategoryColor(color) {
  _pendingCatColor = color;
  renderCategoryColorGrid();
}

function openAddCategoryModal() {
  _editingCatId = null;
  document.getElementById('categoryModalTitle').textContent = 'Tambah Kategori';
  document.getElementById('categoryModalSubmitBtn').textContent = 'Simpan Kategori';
  document.getElementById('editCategoryId').value = '';
  document.getElementById('categoryNameInput').value = '';
  _pendingCatIcon  = BUDGET_CAT_ICONS[0];
  _pendingCatColor = BUDGET_CAT_COLORS[(CATS[KC_TYPE]||[]).length % BUDGET_CAT_COLORS.length];
  renderCategoryIconGrid();
  renderCategoryColorGrid();
  document.getElementById('categoryModalOverlay').classList.add('open');
}

function openEditCategoryModal(type, id) {
  const cat = (CATS[type]||[]).find(c => c.id === id);
  if (!cat) return;
  _editingCatId = id;
  KC_TYPE = type;
  document.getElementById('categoryModalTitle').textContent = 'Edit Kategori';
  document.getElementById('categoryModalSubmitBtn').textContent = 'Simpan Perubahan';
  document.getElementById('editCategoryId').value = id;
  document.getElementById('categoryNameInput').value = cat.label;
  _pendingCatIcon  = catIcon(id);
  _pendingCatColor = cat.color;
  renderCategoryIconGrid();
  renderCategoryColorGrid();
  document.getElementById('categoryModalOverlay').classList.add('open');
}

function closeCategoryModal() {
  document.getElementById('categoryModalOverlay').classList.remove('open');
}

function submitCategoryModal() {
  const name = document.getElementById('categoryNameInput').value.trim();
  if (!name) { showToast('Nama kategori wajib diisi', 'warning'); return; }
  if (!_pendingCatIcon)  { showToast('Pilih ikon untuk kategori ini', 'warning'); return; }
  if (!_pendingCatColor) { showToast('Pilih warna untuk kategori ini', 'warning'); return; }

  if (_editingCatId) {
    // Edit mode
    const id = _editingCatId;
    const cat = (CATS[KC_TYPE]||[]).find(c => c.id === id);
    if (!cat) { closeCategoryModal(); return; }
    cat.label = name;
    cat.color = _pendingCatColor;
    CUSTOM_CAT_ICONS[id] = _pendingCatIcon;
    // Keep budget category in sync if this category also has a spending limit
    if (KC_TYPE === 'expense') {
      const bc = BUDGET.cats.find(b => b.id === id);
      if (bc) { bc.label = name; bc.color = _pendingCatColor; bc.icon = _pendingCatIcon; }
    }
    showToast('Kategori diperbarui', 'success');
  } else {
    // Add mode
    const id = 'cat_' + name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,20) + '_' + Date.now().toString(36);
    const cats = CATS[KC_TYPE];
    const insertAt = cats.length && cats[cats.length-1].id === 'other' ? cats.length - 1 : cats.length;
    cats.splice(insertAt, 0, { id, label: name, color: _pendingCatColor });
    CUSTOM_CAT_ICONS[id] = _pendingCatIcon;
    showToast('Kategori ditambahkan', 'success');
  }

  saveToStorage();
  closeCategoryModal();
  renderKategoriList();
}

function deleteCategory(type, id) {
  const cats = CATS[type] || [];
  if (cats.length <= 1) { showToast('Minimal harus ada 1 kategori', 'warning'); return; }
  showConfirm('Hapus kategori ini?', 'Transaksi lama tetap tersimpan dengan nama kategori ini.', () => {
    CATS[type] = cats.filter(c => c.id !== id);
    delete CUSTOM_CAT_ICONS[id];
    if (type === 'expense') {
      BUDGET.cats = BUDGET.cats.filter(c => c.id !== id);
      renderBudget();
    }
    saveToStorage();
    renderKategoriList();
    showToast('Kategori dihapus', 'success');
  }, 'trash');
}

function openUsernameModal() {
  if (window._isGuest || !window._currentUser) {
    showToast('Login dulu untuk bisa mengatur username', 'warning');
    return;
  }
  document.getElementById('usernameInput').value = window._customUsername || (window._currentUser && window._currentUser.displayName) || '';
  document.getElementById('usernameModalOverlay').classList.add('open');
}
function closeUsernameModal() { document.getElementById('usernameModalOverlay').classList.remove('open'); }
function submitUsername() {
  const val = document.getElementById('usernameInput').value.trim();
  if (!val) { showToast('Username tidak boleh kosong', 'warning'); return; }
  window._customUsername = val;
  updateBrandTitle();
  updateSettingsPage();
  closeUsernameModal();
  saveToStorage();
  showToast('Username berhasil disimpan', 'success');
}
function updateBrandTitle() {
  const el = document.getElementById('brandTitle');
  if (!el) return;
  if (window._isGuest || !window._currentUser) {
    el.innerHTML = 'O<span>FM</span>';
  } else {
    el.textContent = window._customUsername || window._currentUser.displayName || window._currentUser.email || 'Pengguna OFM';
  }
}

function openAddWalletModal() {
  document.getElementById('addWalletModalOverlay').classList.add('open');
  document.getElementById('walletNameInput').value   = '';
  document.getElementById('walletBankInput').value   = '';
  document.getElementById('walletBalInput').value    = '';
  const wci = document.getElementById('walletCurrencyInput'); if (wci) wci.value = 'IDR';
  const wcl = document.getElementById('walletCurrencyLbl');   if (wcl) wcl.textContent = currencyLabelText('IDR');
}
function closeAddWalletModal() { document.getElementById('addWalletModalOverlay').classList.remove('open'); }

function submitWallet() {
  const name = document.getElementById('walletNameInput').value.trim();
  const bank = document.getElementById('walletBankInput').value.trim() || name;
  const bal  = parseInt(document.getElementById('walletBalInput').value) || 0;
  const type = document.getElementById('walletTypeInput').value;
  const currency = document.getElementById('walletCurrencyInput').value || 'IDR';
  if (!name) { showToast('Nama akun wajib diisi', 'warning'); return; }
  const WALLET_THEMES = {
    bank:    { bg:'linear-gradient(135deg,#0a2463,#1a3a8a)', chipColor:'#5EB3FF' },
    ewallet: { bg:'linear-gradient(135deg,#0d3320,#1a5c38)', chipColor:'#2AE8C4' },
    tunai:   { bg:'linear-gradient(135deg,#3a2000,#6b3d00)', chipColor:'#FFD166' },
    invest:  { bg:'linear-gradient(135deg,#1a0a3a,#3a1a6a)', chipColor:'#C4A8FF' },
  };
  const theme = WALLET_THEMES[type] || WALLET_THEMES.bank;
  const id = 'w_' + Date.now();
  WALLETS = [...WALLETS, { id, name, bank, bal, currency, type, ...theme }];
  saveToStorage();
  closeAddWalletModal();
  renderWallets();
  updateAccountDropdown();
  renderDashboard();
  showToast('Akun ditambahkan', 'success');
}

function updateAccountDropdown() {
  // Set default selection to first wallet
  const hidden = document.getElementById('txAccount');
  const lbl    = document.getElementById('txAccountLabel');
  if (WALLETS.length) {
    if (hidden && !hidden.value) hidden.value = WALLETS[0].id;
    if (lbl && (!hidden || !hidden.value || !WALLETS.find(w => w.id === hidden.value))) {
      if (hidden) hidden.value = WALLETS[0].id;
      lbl.textContent = WALLETS[0].name;
    } else if (lbl && hidden) {
      const w = WALLETS.find(w => w.id === hidden.value);
      if (w) lbl.textContent = w.name;
    }
  } else {
    if (lbl) lbl.textContent = 'Pilih akun';
    if (hidden) hidden.value = '';
  }
  updateTxAmountCurrency();
}

// Keeps the currency symbol on the "Nominal" field in sync with the currently
// selected wallet/account — e.g. shows "$" when a USD wallet is picked.
function updateTxAmountCurrency() {
  const curEl = document.getElementById('txAmountCur');
  if (!curEl) return;
  const hid  = document.getElementById('txAccount');
  const code = hid && hid.value ? walletCurrencyCode(hid.value) : 'IDR';
  curEl.textContent = currencyInfo(code).symbol;
}

/* ══════════════════════════════════════════
   CANVAS: RIVER
══════════════════════════════════════════ */
function drawRiver() {
  const canvas = document.getElementById('riverCanvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio||1;
  const W   = canvas.parentElement.clientWidth - 36;
  const H   = 100;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);

  const rd = buildRiverData();
  const income  = rd.income;
  const expense = rd.expense;
  // Update global for tooltip
  RIVER_DATA.income  = income;
  RIVER_DATA.expense = expense;
  RIVER_DATA.labels  = rd.labels;

  if (!income.some(v=>v>0) && !expense.some(v=>v>0)) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Belum ada data', W/2, H/2);
    return;
  }
  const max = Math.max(...income,...expense,1)*1.2;
  const n=income.length, step=(W-8)/(n-1);
  const py=8;

  function getY(v){ return H-py-(v/max)*(H-py*2); }

  // Grid
  ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
  [0.33,0.66].forEach(f=>{
    const y=py+(H-py*2)*(1-f);
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
  });

  function drawArea(data,color,key) {
    const pts=data.map((v,i)=>({x:4+i*step,y:getY(v),idx:i}));
    _riverPts[key]=pts;
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,color+'55'); grad.addColorStop(1,color+'00');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.moveTo(pts[0].x,H); ctx.lineTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++){
      const cx=(pts[i-1].x+pts[i].x)/2;
      ctx.bezierCurveTo(cx,pts[i-1].y,cx,pts[i].y,pts[i].x,pts[i].y);
    }
    ctx.lineTo(pts[pts.length-1].x,H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++){
      const cx=(pts[i-1].x+pts[i].x)/2;
      ctx.bezierCurveTo(cx,pts[i-1].y,cx,pts[i].y,pts[i].x,pts[i].y);
    }
    ctx.stroke();
    pts.forEach(p=>{ ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle=color;ctx.fill(); });
  }
  drawArea(income,'#2AE8C4','income');
  drawArea(expense,'#FF6B84','expense');
  RIVER_DATA.labels.forEach((d,i)=>{
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText(d,4+i*step,H-1);
  });
}

/* ══════════════════════════════════════════
   CANVAS: SCORE
══════════════════════════════════════════ */
function drawScore() {
  const canvas=document.getElementById('scoreCanvas'); if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  canvas.width=80*dpr; canvas.height=80*dpr;
  canvas.style.width='80px'; canvas.style.height='80px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const score = calcScore();
  const cx=40,cy=40,r=30,lw=7;
  ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=lw;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();

  const scoreEl = document.getElementById('siVal');
  const gradeEl = document.getElementById('siGrade');
  const tipEl   = document.getElementById('siTip');

  if (score === null) {
    // No transactions yet — neutral empty ring, no fake number/grade.
    if (scoreEl) scoreEl.textContent = '—';
    if (gradeEl) gradeEl.innerHTML = `<span class="status-dot" style="background:var(--txt3)"></span> Belum ada data`;
    if (tipEl)   tipEl.textContent   = 'Catat transaksi pertamamu untuk mulai dapat skor keuangan.';
    return;
  }

  const pct = score/850;
  const grad=ctx.createLinearGradient(0,0,80,80);
  if (score >= 700) { grad.addColorStop(0,'#C4A8FF'); grad.addColorStop(1,'#5EB3FF'); }
  else if (score >= 600) { grad.addColorStop(0,'#FFD166'); grad.addColorStop(1,'#FF8C00'); }
  else { grad.addColorStop(0,'#FF8C00'); grad.addColorStop(1,'#FF6B84'); }
  ctx.strokeStyle=grad; ctx.lineWidth=lw; ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+pct*Math.PI*2); ctx.stroke();
  // Update score text
  const info = gradeScore(score);
  if (scoreEl) scoreEl.textContent = score;
  if (gradeEl) gradeEl.innerHTML = `<span class="status-dot" style="background:${info.color}"></span> ${escapeHtml(info.g)}`;
  if (tipEl)   tipEl.textContent   = info.t;
}

/* ══════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════ */
let _donutType = 'expense';

function renderAnalytics() {
  renderForecast();
  drawDonut();
  renderCompare();
  renderAverages();
  renderInsights();
  renderBudgetOverlay();
  renderAccountBreakdown();
  drawTrend();
}

// Toggle the donut between expense breakdown and income-source breakdown
function setDonutType(type) {
  _donutType = type;
  document.getElementById('donutBtnExpense').classList.toggle('active', type === 'expense');
  document.getElementById('donutBtnIncome').classList.toggle('active', type === 'income');
  drawDonut();
}

function drawDonut() {
  const canvas=document.getElementById('donutCanvas'); if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  canvas.width=160*dpr; canvas.height=160*dpr;
  canvas.style.width='160px'; canvas.style.height='160px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);

  const type = _donutType || 'expense';
  const _af = typeof ANALYTICS_FILTER !== 'undefined' ? ANALYTICS_FILTER : {};

  // Build data from real transactions for the selected type (expense or income)
  const catMap = {};
  S.transactions.filter(t => {
    if (t.type !== type) return false;
    if (_af.dateFrom && t.date < _af.dateFrom) return false;
    if (_af.dateTo   && t.date > _af.dateTo)   return false;
    return true;
  }).forEach(t=>{
    if (!catMap[t.catId]) catMap[t.catId] = { label: t.cat, color: t.catColor, total: 0 };
    catMap[t.catId].total += t.amount;
  });
  const totalSel = Object.values(catMap).reduce((s,c)=>s+c.total,0);
  let data = Object.entries(catMap)
    .sort((a,b)=>b[1].total-a[1].total)
    .slice(0,5)
    .map(([id,c])=>({ label:c.label, color:c.color, pct: totalSel>0?Math.round(c.total/totalSel*100):0 }));

  const dcLabel = document.getElementById('donutCenterLabel');
  if (dcLabel) dcLabel.textContent = type === 'expense' ? 'pengeluaran' : 'pemasukan';

  // no data = empty state
  if (!data.length) {
    const cx2=80,cy2=80;
    ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=14;
    ctx.beginPath(); ctx.arc(cx2,cy2,62,0,Math.PI*2); ctx.stroke();
    const dcPct = document.getElementById('donutPct');
    if (dcPct) dcPct.textContent = '0%';
    document.getElementById('donutLegend').innerHTML = `<div style="color:var(--txt3);font-size:12px;text-align:center;padding:8px 0">Belum ada data ${type==='expense'?'pengeluaran':'pemasukan'}</div>`;
    return;
  }
  // normalize to 100
  const pctSum = data.reduce((s,d)=>s+d.pct,0);
  if (pctSum !== 100 && data.length) data[0].pct += (100 - pctSum);

  const cx=80,cy=80,r=65,inner=42;
  let start=-Math.PI/2;
  data.forEach(d=>{
    const slice=(d.pct/100)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+slice); ctx.closePath();
    ctx.fillStyle=d.color; ctx.fill();
    start+=slice;
  });
  // inner cutout
  ctx.beginPath(); ctx.arc(cx,cy,inner,0,Math.PI*2);
  ctx.fillStyle='rgba(30,20,60,0.6)'; ctx.fill();
  const ig=ctx.createRadialGradient(cx,cy,inner-4,cx,cy,inner+2);
  ig.addColorStop(0,'rgba(255,255,255,0.08)'); ig.addColorStop(1,'transparent');
  ctx.beginPath(); ctx.arc(cx,cy,inner+1,0,Math.PI*2);
  ctx.fillStyle=ig; ctx.fill();

  // Update center text — share of the selected type within total money flow (income + expense)
  const otherType = type === 'expense' ? 'income' : 'expense';
  const totalOther = S.transactions.filter(t => t.type===otherType && (!_af.dateFrom || t.date >= _af.dateFrom) && (!_af.dateTo || t.date <= _af.dateTo)).reduce((s,t)=>s+t.amount,0);
  const selPct = totalSel>0 ? Math.round(totalSel/(totalSel+totalOther)*100) : 0;
  const dcPct = document.getElementById('donutPct');
  if (dcPct) dcPct.textContent = selPct + '%';

  document.getElementById('donutLegend').innerHTML=data.map(d=>`
    <div class="dl-item">
      <div class="dl-color" style="background:${d.color}"></div>
      <div class="dl-name">${escapeHtml(d.label)}</div>
      <div class="dl-bar"><div class="dl-fill" style="width:${d.pct}%;background:${d.color}"></div></div>
      <div class="dl-pct">${d.pct}%</div>
    </div>`).join('');
}

/* ── Period comparison (this period vs the immediately preceding one) ── */
function getPreviousPeriod(from, to) {
  if (!from || !to) return null;
  const fromD = new Date(from + 'T00:00:00');
  const toD   = new Date(to   + 'T00:00:00');
  const days  = Math.round((toD - fromD) / 86400000) + 1;
  const prevTo = new Date(fromD); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: prevFrom.toISOString().split('T')[0], to: prevTo.toISOString().split('T')[0] };
}

function periodSum(type, from, to) {
  return S.transactions.filter(t => {
    if (t.type !== type) return false;
    if (from && t.date < from) return false;
    if (to   && t.date > to)   return false;
    return true;
  }).reduce((s,t)=>s+t.amount,0);
}

function renderCompare() {
  const grid = document.getElementById('compareGrid');
  if (!grid) return;
  const _af = typeof ANALYTICS_FILTER !== 'undefined' ? ANALYTICS_FILTER : {};
  const prev = getPreviousPeriod(_af.dateFrom, _af.dateTo);

  if (!prev) {
    grid.outerHTML = '<div class="compare-empty glass-sm" id="compareGrid">Pilih periode tertentu (mis. bulan ini / 7 hari) untuk melihat perbandingan dengan periode sebelumnya.</div>';
    return;
  }
  // If compareGrid was previously replaced with the empty-state div, restore it as a proper grid
  if (grid.classList.contains('compare-empty')) {
    const fresh = document.createElement('div');
    fresh.className = 'compare-grid';
    fresh.id = 'compareGrid';
    grid.replaceWith(fresh);
  }
  const el = document.getElementById('compareGrid');

  const curExp  = periodSum('expense', _af.dateFrom, _af.dateTo);
  const prevExp = periodSum('expense', prev.from, prev.to);
  const curInc  = periodSum('income',  _af.dateFrom, _af.dateTo);
  const prevInc = periodSum('income',  prev.from, prev.to);

  function deltaInfo(cur, prev, badWhenUp) {
    let pct, dir;
    if (prev > 0) { pct = Math.round(((cur - prev) / prev) * 100); }
    else { pct = cur > 0 ? 100 : 0; }
    if (pct > 0) dir = 'up'; else if (pct < 0) dir = 'down'; else dir = 'flat';
    const cls = dir === 'flat' ? 'flat' : ((dir === 'up') === badWhenUp ? 'bad' : 'good');
    const icon = dir === 'down' ? ICON.trendDown : ICON.trendUp;
    const sign = pct > 0 ? '+' : '';
    return { cls, icon: dir === 'flat' ? '' : icon, text: dir === 'flat' ? 'Sama dengan periode lalu' : `${sign}${pct}% dari periode lalu` };
  }

  const expD = deltaInfo(curExp, prevExp, true);   // expense going up = bad
  const incD = deltaInfo(curInc, prevInc, false);  // income going up = good

  el.innerHTML = `
    <div class="compare-card glass-sm">
      <div class="cc-label">Pengeluaran</div>
      <div class="cc-val">Rp ${curExp.toLocaleString('id-ID')}</div>
      <div class="cc-delta ${expD.cls}">${expD.icon}<span>${expD.text}</span></div>
      <div class="cc-sub">Sebelumnya: Rp ${prevExp.toLocaleString('id-ID')}</div>
    </div>
    <div class="compare-card glass-sm">
      <div class="cc-label">Pemasukan</div>
      <div class="cc-val">Rp ${curInc.toLocaleString('id-ID')}</div>
      <div class="cc-delta ${incD.cls}">${incD.icon}<span>${incD.text}</span></div>
      <div class="cc-sub">Sebelumnya: Rp ${prevInc.toLocaleString('id-ID')}</div>
    </div>`;
}

/* ── Automatic insights: biggest category, biggest transaction, biggest spike ── */
function renderInsights() {
  const list = document.getElementById('insightList');
  if (!list) return;
  const _af = typeof ANALYTICS_FILTER !== 'undefined' ? ANALYTICS_FILTER : {};
  const inRange = t => (!_af.dateFrom || t.date >= _af.dateFrom) && (!_af.dateTo || t.date <= _af.dateTo);
  const expenses = S.transactions.filter(t => t.type === 'expense' && inRange(t));

  if (!expenses.length) {
    list.innerHTML = '<div class="insight-card glass-sm"><div class="insight-icon" style="background:rgba(255,255,255,0.08);color:var(--txt3)">'+ICON.sparkles+'</div><div class="insight-body"><div class="insight-title">Belum ada insight</div><div class="insight-desc">Catat beberapa transaksi pengeluaran dulu supaya kami bisa kasih insight otomatis di sini.</div></div></div>';
    return;
  }

  const cards = [];

  // 1) Most expensive category
  const catMap = {};
  expenses.forEach(t => {
    if (!catMap[t.catId]) catMap[t.catId] = { label: t.cat, color: t.catColor, total: 0, count: 0 };
    catMap[t.catId].total += t.amount;
    catMap[t.catId].count += 1;
  });
  const totalExp = expenses.reduce((s,t)=>s+t.amount,0);
  const topCat = Object.values(catMap).sort((a,b)=>b.total-a.total)[0];
  if (topCat) {
    const pct = totalExp > 0 ? Math.round(topCat.total / totalExp * 100) : 0;
    cards.push(`
      <div class="insight-card glass-sm">
        <div class="insight-icon" style="background:${topCat.color}22;color:${topCat.color}">${ICON.flame}</div>
        <div class="insight-body">
          <div class="insight-title">Kategori paling boros: ${escapeHtml(topCat.label)}</div>
          <div class="insight-desc">Rp ${topCat.total.toLocaleString('id-ID')} (${pct}% dari total pengeluaran periode ini, dari ${topCat.count} transaksi)</div>
        </div>
      </div>`);
  }

  // 2) Biggest single transaction
  const biggestTx = [...expenses].sort((a,b)=>b.amount-a.amount)[0];
  if (biggestTx) {
    cards.push(`
      <div class="insight-card glass-sm">
        <div class="insight-icon" style="background:rgba(255,107,132,0.15);color:var(--red)">${ICON.alertOctagon}</div>
        <div class="insight-body">
          <div class="insight-title">Transaksi terbesar: ${escapeHtml(biggestTx.note || biggestTx.cat)}</div>
          <div class="insight-desc">Rp ${biggestTx.amount.toLocaleString('id-ID')} · ${escapeHtml(biggestTx.cat)} · ${fmtDate(biggestTx.date)}</div>
        </div>
      </div>`);
  }

  // 3) Category that spiked the most vs the previous period (only if a bounded period is selected)
  const prev = getPreviousPeriod(_af.dateFrom, _af.dateTo);
  if (prev) {
    const prevExpenses = S.transactions.filter(t => t.type === 'expense' && t.date >= prev.from && t.date <= prev.to);
    const prevCatMap = {};
    prevExpenses.forEach(t => { prevCatMap[t.catId] = (prevCatMap[t.catId] || 0) + t.amount; });
    let spike = null;
    Object.entries(catMap).forEach(([id, c]) => {
      const prevTotal = prevCatMap[id] || 0;
      const diff = c.total - prevTotal;
      if (diff <= 0) return;
      const pct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 100;
      if (!spike || diff > spike.diff) spike = { label: c.label, color: c.color, diff, pct, prevTotal };
    });
    if (spike && (spike.prevTotal > 0 || spike.diff > 0)) {
      cards.push(`
        <div class="insight-card glass-sm">
          <div class="insight-icon" style="background:${spike.color}22;color:${spike.color}">${ICON.trendUp}</div>
          <div class="insight-body">
            <div class="insight-title">${escapeHtml(spike.label)} melonjak</div>
            <div class="insight-desc">Naik Rp ${spike.diff.toLocaleString('id-ID')} (${spike.prevTotal > 0 ? '+' + spike.pct + '%' : 'kategori baru'}) dibanding periode sebelumnya</div>
          </div>
        </div>`);
    }
  }

  list.innerHTML = cards.join('');
}

/* ── Daily / weekly average spending ── */
function periodDayCount(from, to) {
  if (from && to) {
    return Math.max(1, Math.round((new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00')) / 86400000) + 1);
  }
  // "Semua" (no bound) — span from the earliest transaction to the effective end date
  if (!S.transactions.length) return 1;
  const earliestDate = S.transactions.reduce((min, t) => t.date < min ? t.date : min, S.transactions[0].date);
  const endDate = to ? new Date(to + 'T00:00:00') : new Date();
  const days = Math.round((endDate - new Date(earliestDate + 'T00:00:00')) / 86400000) + 1;
  return Math.max(1, days);
}

function renderAverages() {
  const grid = document.getElementById('avgGrid');
  if (!grid) return;
  const _af = typeof ANALYTICS_FILTER !== 'undefined' ? ANALYTICS_FILTER : {};
  const inRange = t => (!_af.dateFrom || t.date >= _af.dateFrom) && (!_af.dateTo || t.date <= _af.dateTo);
  const totalExp = S.transactions.filter(t => t.type === 'expense' && inRange(t)).reduce((s,t)=>s+t.amount,0);
  const days = periodDayCount(_af.dateFrom, _af.dateTo);
  const dailyAvg = totalExp / days;
  const weeklyAvg = dailyAvg * 7;

  grid.innerHTML = `
    <div class="compare-card glass-sm">
      <div class="cc-label">Rata-rata Harian</div>
      <div class="cc-val">Rp ${Math.round(dailyAvg).toLocaleString('id-ID')}</div>
      <div class="cc-sub">berdasarkan ${days} hari</div>
    </div>
    <div class="compare-card glass-sm">
      <div class="cc-label">Rata-rata Mingguan</div>
      <div class="cc-val">Rp ${Math.round(weeklyAvg).toLocaleString('id-ID')}</div>
      <div class="cc-sub">estimasi per 7 hari</div>
    </div>`;
}

/* ══════════════════════════════════════════
   FORECASTING SEDERHANA — proyeksi saldo Rp akhir bulan
   Dua komponen, dijumlah biar gak dobel hitung:
   1) Tren harian, dari transaksi NON-rutin (isRecurring:false) —
      supaya bukan cerminan bulan lalu, tapi kebiasaan belanja/terima
      uang harian yang aktual belakangan ini.
   2) Transaksi rutin (RECURRINGS) yang terjadwal jatuh tempo sebelum
      akhir bulan — dihitung eksplisit per kejadian, bukan lewat rata-rata,
      karena nilai & tanggalnya sudah pasti diketahui dari app.
   Cuma pakai wallet Rp (IDR), selaras dengan headline saldo di Dashboard.
══════════════════════════════════════════ */

// Rata-rata net harian (pemasukan - pengeluaran) dari transaksi non-rutin.
// Default: transaksi bulan berjalan. Kalau bulan baru mulai (<4 hari data),
// fallback ke 30 hari terakhir biar sampelnya gak kekecilan.
function forecastDailyTrend() {
  const now = new Date(); now.setHours(0,0,0,0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let elapsedDays = Math.round((now - startOfMonth) / SMART_DAY_MS) + 1;
  let from = smartToDateStr(startOfMonth);
  let source = 'bulan ini';
  if (elapsedDays < 4) {
    from = smartToDateStr(new Date(now.getTime() - 29 * SMART_DAY_MS));
    elapsedDays = 30;
    source = '30 hari terakhir';
  }
  const to = smartToDateStr(now);
  const relevant = S.transactions.filter(t =>
    !t.isRecurring && t.date >= from && t.date <= to &&
    (t.type === 'income' || t.type === 'expense') && walletCurrencyCode(t.account) === 'IDR'
  );
  const net = relevant.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  return { dailyNet: net / elapsedDays, elapsedDays, source, sampleCount: relevant.length };
}

// Total efek transaksi rutin aktif yang akan jatuh tempo dari besok sampai
// akhir bulan (Rp saja). Dihitung per kejadian lewat nextOccurrence() yang
// sudah ada, jadi selaras dengan apa yang bakal benar-benar tercatat otomatis.
function forecastRecurringNet(endOfMonth) {
  let net = 0;
  const items = [];
  RECURRINGS.filter(r => r.active && r.type !== 'transfer' && walletCurrencyCode(r.account) === 'IDR').forEach(r => {
    let occ = nextOccurrence(r.start, r.freq); // selalu > hari ini, jadi gak dobel hitung yang udah diproses hari ini
    let guard = 0;
    while (occ <= endOfMonth && guard < 60) {
      const amt = r.type === 'income' ? r.amount : -r.amount;
      net += amt;
      items.push({ name: r.name, date: new Date(occ), amount: amt });
      if (r.freq === 'monthly')     occ = new Date(occ.getFullYear(), occ.getMonth() + 1, occ.getDate());
      else if (r.freq === 'weekly') occ = new Date(occ.getTime() + 7 * SMART_DAY_MS);
      else if (r.freq === 'yearly') occ = new Date(occ.getFullYear() + 1, occ.getMonth(), occ.getDate());
      else break;
      guard++;
    }
  });
  return { net, items };
}

function computeForecast() {
  const now = new Date(); now.setHours(0,0,0,0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); endOfMonth.setHours(0,0,0,0);
  const daysRemaining = Math.max(0, Math.round((endOfMonth - now) / SMART_DAY_MS));

  const totalsByCurrency = {};
  WALLETS.forEach(w => { totalsByCurrency[w.currency || 'IDR'] = (totalsByCurrency[w.currency || 'IDR'] || 0) + getWalletBalance(w.id); });
  const currentBalance = totalsByCurrency.IDR || 0;

  const trend = forecastDailyTrend();
  const trendProjection = trend.dailyNet * daysRemaining;
  const recur = forecastRecurringNet(endOfMonth);

  return {
    currentBalance, daysRemaining, endOfMonth,
    trend, trendProjection, recur,
    projected: currentBalance + trendProjection + recur.net,
  };
}

function renderForecast() {
  const card = document.getElementById('forecastCard');
  const daysEl = document.getElementById('forecastDaysLeft');
  if (!card) return;

  if (!WALLETS.length) {
    card.innerHTML = `<div style="color:var(--txt3);font-size:12px;text-align:center;padding:8px 0">Tambahkan akun/dompet dulu supaya proyeksi saldo bisa dihitung.</div>`;
    if (daysEl) daysEl.textContent = '';
    return;
  }

  const f = computeForecast();
  if (daysEl) daysEl.textContent = f.daysRemaining === 0 ? 'Hari terakhir bulan ini' : f.daysRemaining + ' hari lagi';

  const delta = f.projected - f.currentBalance;
  const deltaUp = delta >= 0;
  const valClass = f.projected >= f.currentBalance ? 'up' : 'down';

  const recurCount = f.recur.items.length;
  const recurSub = recurCount === 0
    ? 'Gak ada transaksi rutin terjadwal sisa bulan ini'
    : recurCount + ' transaksi rutin terjadwal sisa bulan ini';

  let html = `
    <div class="forecast-top">
      <div>
        <div class="forecast-label">Proyeksi Saldo Akhir Bulan</div>
        <div class="forecast-val ${valClass}">Rp ${Math.round(f.projected).toLocaleString('id-ID')}</div>
        <div class="forecast-cur">dari saldo sekarang Rp ${Math.round(f.currentBalance).toLocaleString('id-ID')}</div>
      </div>
      <div class="forecast-delta ${deltaUp ? 'good' : 'bad'}">
        ${deltaUp ? ICON.trendUp : ICON.trendDown}
        ${deltaUp ? '+' : '-'}Rp ${Math.abs(Math.round(delta)).toLocaleString('id-ID')}
      </div>
    </div>
    <div class="forecast-rows">
      <div class="forecast-row">
        <div class="forecast-row-icon" style="background:${f.trendProjection >= 0 ? 'rgba(42,232,196,0.15)' : 'rgba(255,107,132,0.15)'};color:${f.trendProjection >= 0 ? 'var(--teal)' : 'var(--red)'}">${ICON.chart}</div>
        <div class="forecast-row-body">
          <div class="forecast-row-title">Tren harian</div>
          <div class="forecast-row-sub">rata-rata ${f.trend.source} · ${f.daysRemaining} hari tersisa</div>
        </div>
        <div class="forecast-row-val" style="color:${f.trendProjection >= 0 ? 'var(--teal)' : 'var(--red)'}">${f.trendProjection >= 0 ? '+' : '-'}Rp ${Math.abs(Math.round(f.trendProjection)).toLocaleString('id-ID')}</div>
      </div>
      <div class="forecast-row">
        <div class="forecast-row-icon" style="background:${f.recur.net >= 0 ? 'rgba(42,232,196,0.15)' : 'rgba(255,107,132,0.15)'};color:${f.recur.net >= 0 ? 'var(--teal)' : 'var(--red)'}">${ICON.refresh}</div>
        <div class="forecast-row-body">
          <div class="forecast-row-title">Transaksi rutin terjadwal</div>
          <div class="forecast-row-sub">${recurSub}</div>
        </div>
        <div class="forecast-row-val" style="color:${f.recur.net >= 0 ? 'var(--teal)' : 'var(--red)'}">${f.recur.net >= 0 ? '+' : '-'}Rp ${Math.abs(Math.round(f.recur.net)).toLocaleString('id-ID')}</div>
      </div>
    </div>`;

  if (f.projected < 0) {
    html += `<div class="forecast-warn">${ICON.warning} Saldo diproyeksikan minus akhir bulan ini — kebiasaan belanja atau tagihan rutin sekarang lebih besar dari saldo yang ada.</div>`;
  }

  card.innerHTML = html;
}

/* ── Budget overlay: actual spend vs budget limit per category ── */
function renderBudgetOverlay() {
  const wrap = document.getElementById('budgetOverlayList');
  if (!wrap) return;
  const catsWithLimit = BUDGET.cats.filter(c => c.limit > 0);
  if (!catsWithLimit.length) {
    wrap.innerHTML = `<div style="color:var(--txt3);font-size:12px;text-align:center;padding:8px 0">Belum ada limit anggaran. Atur limit per kategori di halaman <b style="color:var(--txt2)">Anggaran</b> dulu supaya bisa dibandingkan di sini.</div>`;
    return;
  }
  const _af = typeof ANALYTICS_FILTER !== 'undefined' ? ANALYTICS_FILTER : {};
  const inRange = t => (!_af.dateFrom || t.date >= _af.dateFrom) && (!_af.dateTo || t.date <= _af.dateTo);
  const expTx = S.transactions.filter(t => t.type === 'expense' && inRange(t));

  wrap.innerHTML = catsWithLimit.map(c => {
    const cCode = c.currency || 'IDR';
    const sym   = currencyInfo(cCode).symbol;
    const spent = expTx.filter(t => t.catId === c.id && walletCurrencyCode(t.account) === cCode).reduce((s,t) => s+t.amount, 0);
    const pct = Math.round((spent / c.limit) * 100);
    const over = spent > c.limit;
    const barColor = over ? 'var(--red)' : c.color;
    return `
      <div class="dl-item">
        <div class="dl-color" style="background:${barColor}"></div>
        <div class="dl-name">${escapeHtml(c.label)}
          <div class="dl-sub">${over ? 'Lebih ' : ''}${sym} ${spent.toLocaleString(currencyInfo(cCode).locale)} / ${sym} ${c.limit.toLocaleString(currencyInfo(cCode).locale)}</div>
        </div>
        <div class="dl-bar"><div class="dl-fill" style="width:${Math.min(100,pct)}%;background:${barColor}"></div></div>
        <div class="dl-pct" style="color:${over?'var(--red)':'var(--txt2)'}">${pct}%</div>
      </div>`;
  }).join('');
}

/* ── Per-account/wallet breakdown ── */
function renderAccountBreakdown() {
  const wrap = document.getElementById('accountBreakdownList');
  if (!wrap) return;
  if (!WALLETS.length) {
    wrap.innerHTML = `<div style="color:var(--txt3);font-size:12px;text-align:center;padding:8px 0">Belum ada akun/dompet ditambahkan.</div>`;
    return;
  }
  const _af = typeof ANALYTICS_FILTER !== 'undefined' ? ANALYTICS_FILTER : {};
  const inRange = t => (!_af.dateFrom || t.date >= _af.dateFrom) && (!_af.dateTo || t.date <= _af.dateTo);
  const palette = ['#2AE8C4','#5EB3FF','#C4A8FF','#FF8C00','#FF6B84','#FFD166','#7CE38B','#FF9EC4'];
  const map = {};
  S.transactions.filter(t => t.type !== 'transfer' && inRange(t)).forEach(t => {
    if (!t.account) return;
    if (!map[t.account]) map[t.account] = { count: 0, total: 0 };
    map[t.account].count += 1;
    map[t.account].total += t.amount;
  });
  const rows = Object.entries(map)
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([id, d], i) => ({ id, name: walletName(id), color: palette[i % palette.length], ...d }));

  if (!rows.length) {
    wrap.innerHTML = `<div style="color:var(--txt3);font-size:12px;text-align:center;padding:8px 0">Belum ada transaksi pada periode ini.</div>`;
    return;
  }
  const maxCount = Math.max(...rows.map(r => r.count));
  wrap.innerHTML = rows.map(r => `
    <div class="dl-item">
      <div class="dl-color" style="background:${r.color}"></div>
      <div class="dl-name">${escapeHtml(r.name)}
        <div class="dl-sub">${r.count}x transaksi</div>
      </div>
      <div class="dl-bar"><div class="dl-fill" style="width:${Math.round(r.count/maxCount*100)}%;background:${r.color}"></div></div>
      <div class="dl-pct">Rp ${fmtK(r.total)}</div>
    </div>`).join('');
}

function drawTrend() {
  const canvas=document.getElementById('trendCanvas'); if(!canvas)return;
  const dpr=window.devicePixelRatio||1;
  const W=canvas.parentElement.clientWidth-36, H=120;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);

  // "Tren 6 Bulan" always spans exactly 6 months — it never shrinks to fewer
  // months just because a narrower preset (7 Hari/Bulan Ini/etc) is active up
  // top. But WHICH 6 months it shows does track the filter: the window's end
  // anchors to the month containing the filter's end date. So "Bulan Ini"
  // (dateTo = today) ends the window on this month as usual, but a custom
  // range that ends last month shifts the whole 6-month window back so it
  // ends on *that* month instead — the window slides with the filter instead
  // of being clipped by it.
  const _tf = typeof ANALYTICS_FILTER !== 'undefined' ? ANALYTICS_FILTER : {};
  const trendTo   = _tf.dateTo ? new Date(_tf.dateTo + 'T00:00:00') : new Date();
  const trendFrom = (() => { const d = new Date(trendTo); d.setDate(1); d.setMonth(d.getMonth()-5); return d; })();
  // Build month buckets between trendFrom and trendTo
  const monthData = {};
  const monthLabels = [];
  const cur = new Date(trendFrom.getFullYear(), trendFrom.getMonth(), 1);
  const endMonth = new Date(trendTo.getFullYear(), trendTo.getMonth(), 1);
  while (cur <= endMonth) {
    const key   = cur.toISOString().slice(0,7);
    const label = cur.toLocaleDateString('id-ID', { month: 'short' });
    monthLabels.push(label.charAt(0).toUpperCase() + label.slice(1, 3));
    monthData[key] = { income: 0, expense: 0 };
    cur.setMonth(cur.getMonth() + 1);
  }
  S.transactions.forEach(t => {
    const key = t.date ? t.date.slice(0,7) : null;
    if (key && monthData[key]) {
      if (t.type === 'income')  monthData[key].income  += t.amount;
      if (t.type === 'expense') monthData[key].expense += t.amount;
    }
  });
  const months = Object.keys(monthData).sort();
  const income  = months.map(k => monthData[k].income);
  const expense = months.map(k => monthData[k].expense);
  const fi = income;
  const fe = expense;

  if (!monthLabels.length || (!fi.some(v=>v>0) && !fe.some(v=>v>0))) {
    // No data — draw empty state text
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Belum ada data transaksi', W/2, H/2);
    return;
  }
  const max=Math.max(...fi,...fe,1)*1.15;
  const n=monthLabels.length, step=n>1?(W-20)/(n-1):W-20, px=10, py=12;
  const getY=v=>H-py-(v/max)*(H-py*2);
  const getPts=data=>data.map((v,i)=>({x:px+i*step,y:getY(v)}));
  ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
  [0.33,0.66].forEach(f=>{
    const y=py+(H-py*2)*(1-f);
    ctx.beginPath();ctx.moveTo(px,y);ctx.lineTo(W-px,y);ctx.stroke();
  });
  fi.forEach((v,i)=>{
    const x=px+i*step-8,y=getY(v);
    const gr=ctx.createLinearGradient(0,y,0,H);
    gr.addColorStop(0,'rgba(42,232,196,0.45)');
    gr.addColorStop(1,'rgba(42,232,196,0.04)');
    ctx.fillStyle=gr; ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,y,16,H-py-y,3);
    else { ctx.moveTo(x,y);ctx.lineTo(x+16,y);ctx.lineTo(x+16,H-py);ctx.lineTo(x,H-py); }
    ctx.fill();
  });
  const ep=getPts(fe);
  ctx.strokeStyle='#FF6B84'; ctx.lineWidth=2.5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(ep[0].x,ep[0].y);
  ep.slice(1).forEach((p,i)=>{
    const cx=(ep[i].x+p.x)/2; ctx.bezierCurveTo(cx,ep[i].y,cx,p.y,p.x,p.y);
  });
  ctx.stroke();
  monthLabels.forEach((m,i)=>{
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='10px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText(m,px+i*step,H);
  });
  // Legend
  const legendEl = document.getElementById('trendLegend');
  if (legendEl) legendEl.style.display = 'flex';
}

function switchRiver(el) {
  document.querySelectorAll('.river-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active'); drawRiver();
}

/* ══════════════════════════════════════════
   TOAST / EXPORT
══════════════════════════════════════════ */
let _tt;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  const iconKey = { success:'checkCircle', warning:'warning', danger:'alertOctagon', info:'info' }[type] || 'info';
  t.innerHTML = ICON[iconKey] + '<span>' + escapeHtml(msg) + '</span>';
  t.classList.add('show');
  clearTimeout(_tt); _tt=setTimeout(()=>t.classList.remove('show'),2400);
}

function exportCSV() {
  if(!S.transactions.length){showToast('Belum ada data untuk diekspor', 'warning');return;}
  const csvEsc = v => '"' + String(v).replace(/"/g,'""') + '"';
  const rows=S.transactions.map(t=>`${t.date},${t.type},${t.amount},${csvEsc(t.note)},${csvEsc(t.cat)},${csvEsc(walletName(t.account))}`);
  const blob=new Blob(['Tanggal,Tipe,Nominal,Keterangan,Kategori,Akun\n'+rows.join('\n')],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`OFM_Transaksi_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  showToast('Transaksi berhasil diekspor ke CSV', 'success');
}
// Alias kept for any call sites still using the old name.
function exportData() { openExportModal(); }

// Backup lengkap semua data (bukan cuma transaksi) — buat disimpan sendiri
// atau, ke depannya, di-restore lagi lewat fitur import.
function exportJSON() {
  const hasData = S.transactions.length || WALLETS.length || GOALS.length || RECURRINGS.length || BUDGET.cats.length;
  if (!hasData) { showToast('Belum ada data untuk diekspor', 'warning'); return; }
  const backup = {
    app: 'OFM', version: 1,
    exportedAt: new Date().toISOString(),
    transactions: S.transactions,
    wallets: WALLETS,
    budget: BUDGET,
    goals: GOALS,
    recurrings: RECURRINGS,
    dismissedSubs: DISMISSED_SUBS,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `OFM_Backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
  showToast('Backup lengkap berhasil diekspor ke JSON', 'success');
}

function openExportModal() { document.getElementById('exportModalOverlay').classList.add('open'); }
function closeExportModal() { document.getElementById('exportModalOverlay').classList.remove('open'); }
function closeExportModalOutside(e) { if (e.target === document.getElementById('exportModalOverlay')) closeExportModal(); }

/* ══════════════════════════════════════════
   IMPORT / RESTORE (dari backup JSON exportJSON())
══════════════════════════════════════════ */
function triggerImportFile() {
  const input = document.getElementById('importFileInput');
  if (input) { input.value = ''; input.click(); }
}

function handleImportFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (err) {
      showToast('File bukan JSON yang valid', 'danger');
      return;
    }
    // Terima file backup OFM (punya field app/transactions dkk) — tolak file lain
    const looksLikeBackup = data && typeof data === 'object' &&
      (data.app === 'OFM' || Array.isArray(data.transactions) || Array.isArray(data.wallets));
    if (!looksLikeBackup) {
      showToast('File ini bukan backup OFM yang valid', 'danger');
      return;
    }
    const txCount = Array.isArray(data.transactions) ? data.transactions.length : 0;
    const dateLabel = data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : 'tidak diketahui';
    showConfirm(
      'Pulihkan Backup?',
      `File ini berisi ${txCount} transaksi (dibuat ${dateLabel}). Semua data yang ada sekarang di aplikasi ini akan DIGANTI — tindakan ini tidak bisa dibatalkan.`,
      () => applyImportedBackup(data),
      'upload'
    );
  };
  reader.onerror = () => showToast('Gagal membaca file', 'danger');
  reader.readAsText(file);
}

function applyImportedBackup(data) {
  try {
    S.transactions = Array.isArray(data.transactions) ? data.transactions : [];
    WALLETS        = Array.isArray(data.wallets) ? data.wallets : [];
    BUDGET.cats    = (data.budget && Array.isArray(data.budget.cats)) ? data.budget.cats : [];
    BUDGET.total   = (data.budget && typeof data.budget.total === 'number') ? data.budget.total : 0;
    GOALS          = Array.isArray(data.goals) ? data.goals : [];
    RECURRINGS     = Array.isArray(data.recurrings) ? data.recurrings : [];
    DISMISSED_SUBS = Array.isArray(data.dismissedSubs) ? data.dismissedSubs : [];

    // Daftarkan ulang kategori anggaran custom (icon lookup + expense picker),
    // sama seperti alur load dari Firestore, biar tetap konsisten setelah restore.
    const knownExpIds = new Set(CATS.expense.map(c => c.id));
    BUDGET.cats.forEach(c => {
      CUSTOM_CAT_ICONS[c.id] = c.icon;
      if (!knownExpIds.has(c.id)) {
        const insertAt = CATS.expense.length && CATS.expense[CATS.expense.length-1].id === 'other' ? CATS.expense.length - 1 : CATS.expense.length;
        CATS.expense.splice(insertAt, 0, { id:c.id, label:c.label, color:c.color });
        knownExpIds.add(c.id);
      }
    });

    refreshAllUI();
    saveToStorage();
    showToast('Data berhasil dipulihkan dari backup', 'success');
  } catch (err) {
    console.warn('Import restore error', err);
    showToast('Gagal memulihkan data dari file ini', 'danger');
  }
}

// Re-render semua bagian UI yang tergantung data setelah restore/import massal
function refreshAllUI() {
  if (typeof renderDashboard === 'function')  renderDashboard();
  if (typeof renderWallets === 'function')    renderWallets();
  if (typeof renderBudget === 'function')     renderBudget();
  if (typeof renderGoals === 'function')      renderGoals();
  if (typeof renderGoalsPreview === 'function') renderGoalsPreview();
  if (typeof renderRecurList === 'function')  renderRecurList();
  if (typeof renderRecurPreview === 'function') renderRecurPreview();
  if (typeof renderSubDetections === 'function') renderSubDetections();
  if (typeof renderKategoriList === 'function') renderKategoriList();
  if (typeof renderRiwayat === 'function')    renderRiwayat();
  if (typeof updateAccountDropdown === 'function') updateAccountDropdown();
  if (typeof updateBellBadge === 'function')  updateBellBadge();
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}

/* ══════════════════════════════════════════
   RECURRING TRANSACTIONS
══════════════════════════════════════════ */
let RECURRINGS = [];

// Kunci normalisasi (nama transaksi, lowercase+trim) yang sudah di-"Abaikan" user
// dari daftar deteksi langganan otomatis, supaya tidak terus muncul lagi.
let DISMISSED_SUBS = [];

let _recurType = 'expense';

function nextOccurrence(startDate, freq) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(startDate + 'T00:00:00');
  while (d <= today) {
    if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (freq === 'weekly') d.setDate(d.getDate() + 7);
    else if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

function freqLabel(f) {
  return { monthly:'Bulanan', weekly:'Mingguan', yearly:'Tahunan' }[f] || f;
}

function daysUntil(d) {
  const diff = Math.ceil((d - new Date()) / 86400000);
  if (diff <= 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  return diff + ' hari lagi';
}

function processRecurringDue() {
  const today = new Date().toISOString().split('T')[0];
  let processed = 0;
  let skippedNoWallet = false;
  RECURRINGS.forEach(r => {
    if (!r.active) return;
    const next = nextOccurrence(r.start, r.freq);
    const nextStr = next.toISOString().split('T')[0];
    if (nextStr === today && r.lastProcessed !== today) {
      // Pakai akun yang dipilih user pas bikin tagihan rutin ini. Fallback ke
      // wallet pertama cuma buat data lama (dibuat sebelum field ini ada) atau
      // kalau wallet-nya udah dihapus — bukan lagi hardcode 'bca'.
      const account = (r.account && WALLETS.some(w => w.id === r.account)) ? r.account : (WALLETS[0] && WALLETS[0].id);
      if (!account) { skippedNoWallet = true; return; } // belum ada akun sama sekali — tunda, jangan catat ke akun ngasal
      const cats = CATS[r.type] || [];
      const cat  = cats.find(c => c.id === r.catId) || { label:'Lainnya', color: r.catColor };
      S.transactions.unshift({
        id: Date.now() + processed,
        type: r.type, amount: r.amount,
        note: r.name + ' (Rutin)',
        date: today, account,
        cat: cat.label, catId: r.catId, catColor: r.catColor,
        isRecurring: true,
      });
      r.lastProcessed = today;
      processed++;
    }
  });
  if (processed > 0) {
    saveToStorage();
    addNotif('Transaksi Rutin', `${processed} transaksi rutin dicatat hari ini`, 'teal');
  }
  if (skippedNoWallet) {
    addNotif('Transaksi rutin tertunda', 'Tambahkan akun dulu supaya transaksi rutin bisa dicatat', 'warn');
  }
}

function renderRecurList() {
  const el = document.getElementById('recurList');
  if (!el) return;
  if (!RECURRINGS.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">${ICON.refresh}</div><h3>Belum ada transaksi rutin</h3><p>Tambahkan tagihan atau pemasukan rutin</p></div>`;
    return;
  }
  el.innerHTML = RECURRINGS.map(r => {
    const next  = nextOccurrence(r.start, r.freq);
    const color = r.type === 'income' ? 'var(--teal)' : 'var(--red)';
    const accName = walletName(r.account) || 'Akun tak dikenal';
    return `
      <div class="recur-item glass-sm">
        <div class="recur-icon" style="background:${r.catColor}22">${ICON[catIcon(r.catId)]||''}</div>
        <div class="recur-info">
          <div class="recur-name">${r.name}</div>
          <div class="recur-meta">
            <span class="recur-freq">${freqLabel(r.freq)}</span>
            <span>${daysUntil(next)}</span>
            <span>· ${escapeHtml(accName)}</span>
          </div>
        </div>
        <div class="recur-right">
          <div class="recur-amt" style="color:${color}">${r.type==='income'?'+':'-'}Rp ${fmtK(r.amount)}</div>
          <div class="recur-next">${next.toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:center">
          <div class="recur-pause-btn" onclick="toggleRecur(${r.id})" title="${r.active?'Pause':'Aktifkan'}">
            ${r.active ? '⏸' : '▶'}
          </div>
          <div class="recur-pause-btn" onclick="deleteRecur(${r.id})" title="Hapus" style="color:var(--red);font-size:13px">${ICON.trash}</div>
        </div>
      </div>`;
  }).join('');
}

function deleteRecur(id) {
  showConfirm('Hapus transaksi rutin?', 'Transaksi rutin ini akan dihapus permanen.', () => {
    RECURRINGS = RECURRINGS.filter(r => r.id !== id);
    saveToStorage();
    renderRecurList();
    renderRecurPreview();
    renderSubDetections();
    showToast('Transaksi rutin dihapus', 'success');
  });
}

function renderRecurPreview() {
  const el = document.getElementById('recurPreview');
  if (!el) return;
  const sorted = RECURRINGS
    .filter(r => r.active)
    .map(r => ({ ...r, next: nextOccurrence(r.start, r.freq) }))
    .sort((a,b) => a.next - b.next)
    .slice(0, 3);
  if (!sorted.length) {
    el.innerHTML = `<div style="color:var(--txt3);font-size:12px;padding:4px 0">Belum ada tagihan rutin</div>`;
    return;
  }
  el.innerHTML = sorted.map(r => `
    <div class="recur-prev-item">
      <div class="rp-icon">${ICON[catIcon(r.catId)]||''}</div>
      <div class="rp-info">
        <div class="rp-name">${r.name}</div>
        <div class="rp-date">${daysUntil(r.next)} · ${r.next.toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</div>
      </div>
      <div class="rp-amt ${r.type}">${r.type==='income'?'+':'-'}Rp ${fmtK(r.amount)}</div>
    </div>`).join('');
}

function toggleRecur(id) {
  const r = RECURRINGS.find(r => r.id === id);
  if (!r) return;
  r.active = !r.active;
  saveToStorage();
  renderRecurList();
  renderRecurPreview();
  renderSubDetections();
  showToast(r.active ? 'Transaksi rutin diaktifkan' : 'Transaksi rutin dijeda', 'success');
}

function setRecurType(t) {
  _recurType = t;
  ['expense','income'].forEach(type => {
    const b = document.getElementById('recurType' + type.charAt(0).toUpperCase() + type.slice(1));
    if (b) b.className = 'type-btn' + (type === t ? ' active ' + t : '');
  });
  moveTypeIndicator('recurTypeToggle', 'recurTypeIndicator', 'recurType' + t.charAt(0).toUpperCase() + t.slice(1));
}

function openRecurModal() {
  document.getElementById('recurModalOverlay').classList.add('open');
  document.getElementById('recurStart').value = new Date().toISOString().split('T')[0];
  document.getElementById('recurStartLabel').textContent = 'Hari ini';
  document.getElementById('recurName').value   = '';
  document.getElementById('recurAmount').value = '';
  setRecurType('expense');
  const accLbl = document.getElementById('recurAccountLabel');
  const accHid = document.getElementById('recurAccount');
  if (WALLETS.length) {
    if (accHid) accHid.value = WALLETS[0].id;
    if (accLbl) accLbl.textContent = WALLETS[0].name;
  } else {
    if (accHid) accHid.value = '';
    if (accLbl) accLbl.textContent = 'Tambah akun dulu';
  }
}
function closeRecurModal() { document.getElementById('recurModalOverlay').classList.remove('open'); }
function closeRecurModalOutside(e) { if (e.target === document.getElementById('recurModalOverlay')) closeRecurModal(); }

function submitRecur() {
  const name   = document.getElementById('recurName').value.trim();
  const amount = parseInt(document.getElementById('recurAmount').value) || 0;
  const freq   = document.getElementById('recurFreq').value;
  const start  = document.getElementById('recurStart').value;
  const catId  = document.getElementById('recurCat').value;
  const account = document.getElementById('recurAccount').value;
  if (!name)   { showToast('Nama wajib diisi', 'warning'); return; }
  if (!amount) { showToast('Nominal harus lebih dari 0', 'warning'); return; }
  if (!account) { showToast('Tambahkan akun dulu di halaman Akun', 'warning'); return; }
  const catColors = { bill:'#5EB3FF', food:'#FF8C00', trans:'#5EB3FF', ent:'#FF6B84', salary:'#2AE8C4', other:'#888' };
  RECURRINGS = [...RECURRINGS, {
    id: Date.now(), name, type: _recurType, amount, freq,
    catId, catColor: catColors[catId] || '#888', start, active: true, account,
  }];
  saveToStorage();
  closeRecurModal();
  renderRecurList();
  renderRecurPreview();
  renderSubDetections();
  showToast('Transaksi rutin ditambahkan', 'success');
}

/* ══════════════════════════════════════════
   DETEKSI LANGGANAN BERULANG (dari histori transaksi)
   Analisa transaksi pengeluaran yang sudah ada — cari nama transaksi yang
   sama, nominal mirip, dan muncul di interval waktu yang konsisten
   (mingguan/bulanan/tahunan) — lalu tawarkan ke user untuk dijadikan
   Transaksi Rutin. Murni dari data lokal, tidak butuh integrasi luar.
══════════════════════════════════════════ */
let _lastSubDetections = [];

function _normSubName(note) {
  return (note || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Klasifikasi rata-rata jarak hari antar transaksi ke salah satu frekuensi
// yang didukung RECURRINGS (weekly/monthly/yearly), dengan toleransi wajar.
function _classifySubFreq(avgGap) {
  if (avgGap >= 5 && avgGap <= 10)   return 'weekly';
  if (avgGap >= 24 && avgGap <= 37)  return 'monthly';
  if (avgGap >= 340 && avgGap <= 390) return 'yearly';
  return null;
}

function detectRecurringSubscriptions() {
  const groups = {};
  S.transactions.forEach(t => {
    if (t.type !== 'expense' || t.isRecurring) return; // yang isRecurring udah ke-track lewat RECURRINGS
    const key = _normSubName(t.note);
    if (!key) return; // butuh nama transaksi buat dicocokkan antar transaksi
    (groups[key] = groups[key] || []).push(t);
  });

  const existingRecurNames = new Set(RECURRINGS.map(r => _normSubName(r.name)));
  const candidates = [];

  Object.entries(groups).forEach(([key, txs]) => {
    if (txs.length < 3) return; // minimal 3 kejadian biar polanya cukup meyakinkan
    if (DISMISSED_SUBS.includes(key)) return;
    if (existingRecurNames.has(key)) return; // sudah ada di Transaksi Rutin, gak usah disaranin lagi

    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    const amounts = sorted.map(t => t.amount);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const minAmt = Math.min(...amounts), maxAmt = Math.max(...amounts);
    if (avgAmount <= 0 || (maxAmt - minAmt) / avgAmount > 0.25) return; // nominal harus cukup konsisten

    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i - 1].date + 'T00:00:00');
      const d2 = new Date(sorted[i].date + 'T00:00:00');
      gaps.push(Math.round((d2 - d1) / SMART_DAY_MS));
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (avgGap <= 0) return;
    const variance = gaps.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / gaps.length;
    const stddev = Math.sqrt(variance);
    if (stddev / avgGap > 0.35) return; // interval antar transaksi harus cukup teratur

    const freq = _classifySubFreq(avgGap);
    if (!freq) return;

    const last = sorted[sorted.length - 1];
    const nextPredicted = new Date(last.date + 'T00:00:00');
    if (freq === 'weekly')  nextPredicted.setDate(nextPredicted.getDate() + 7);
    if (freq === 'monthly') nextPredicted.setMonth(nextPredicted.getMonth() + 1);
    if (freq === 'yearly')  nextPredicted.setFullYear(nextPredicted.getFullYear() + 1);

    candidates.push({
      key,
      name: last.note || last.cat,
      avgAmount: Math.round(avgAmount),
      freq,
      occurrences: sorted.length,
      lastDate: last.date,
      nextPredicted,
      catId: last.catId, catColor: last.catColor, cat: last.cat,
      account: last.account,
    });
  });

  candidates.sort((a, b) => b.occurrences - a.occurrences || b.avgAmount - a.avgAmount);
  return candidates;
}

function renderSubDetections() {
  const section = document.getElementById('subDetectSection');
  const list = document.getElementById('subDetectList');
  if (!section || !list) return;

  _lastSubDetections = detectRecurringSubscriptions();

  if (!_lastSubDetections.length) {
    section.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  section.style.display = '';

  list.innerHTML = _lastSubDetections.map(c => `
    <div class="insight-card glass-sm sub-detect-card">
      <div class="insight-icon" style="background:${c.catColor}22;color:${c.catColor}">${ICON.refresh}</div>
      <div class="insight-body">
        <div class="insight-title">Kemungkinan langganan: ${escapeHtml(c.name)}</div>
        <div class="insight-desc">Rp ${c.avgAmount.toLocaleString('id-ID')} · ${freqLabel(c.freq)} · terdeteksi ${c.occurrences}x · terakhir ${fmtDate(c.lastDate)}</div>
        <div class="sub-detect-actions">
          <button class="sub-detect-btn primary" onclick="quickAddDetectedSub('${c.key.replace(/'/g, "\\'")}')">+ Jadikan Rutin</button>
          <button class="sub-detect-btn" onclick="dismissSubDetection('${c.key.replace(/'/g, "\\'")}')">Abaikan</button>
        </div>
      </div>
    </div>`).join('');
}

function quickAddDetectedSub(key) {
  const c = _lastSubDetections.find(x => x.key === key);
  if (!c) return;
  openRecurModal();
  document.getElementById('recurName').value = c.name;
  document.getElementById('recurAmount').value = c.avgAmount;
  document.getElementById('recurFreqLabel').textContent = freqLabel(c.freq);
  document.getElementById('recurFreq').value = c.freq;
  document.getElementById('recurStart').value = c.lastDate;
  document.getElementById('recurStartLabel').textContent = fmtDate(c.lastDate);
  setRecurType('expense');
  const cats = CATS.expense || [];
  const cat = cats.find(x => x.id === c.catId);
  if (cat) {
    document.getElementById('recurCat').value = cat.id;
    document.getElementById('recurCatLabel').innerHTML = `${ICON[catIcon(cat.id)] || ''} ${escapeHtml(cat.label)}`;
  }
  const accHid = document.getElementById('recurAccount');
  const accLbl = document.getElementById('recurAccountLabel');
  if (c.account && WALLETS.some(w => w.id === c.account)) {
    if (accHid) accHid.value = c.account;
    if (accLbl) accLbl.textContent = walletName(c.account);
  }
  showToast('Form udah diisi otomatis — cek dulu lalu simpan', 'success');
}

function dismissSubDetection(key) {
  if (!DISMISSED_SUBS.includes(key)) DISMISSED_SUBS.push(key);
  saveToStorage();
  renderSubDetections();
  showToast('Saran langganan diabaikan', 'success');
}

/* ══════════════════════════════════════════
   BUDGET ALERT ENGINE
══════════════════════════════════════════ */
const NOTIFICATIONS = [];

function addNotif(title, sub, type='warn', url=null) {
  NOTIFICATIONS.unshift({
    id: Date.now(),
    title, sub, type, url,
    time: new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }),
  });
  if (NOTIFICATIONS.length > 20) NOTIFICATIONS.pop();
  updateBellBadge();
  renderNotifPanel();
  firePushNotif(title, sub);
}

/* ══════════════════════════════════════════
   UPDATE CHECK
   Bandingkan APP_VERSION lokal dengan tag rilis terbaru di GitHub
   (dari endpoint /releases/latest). Kalau ada versi lebih baru,
   munculin notifikasi lonceng (type "blue") yang bisa diklik buat
   buka halaman rilisnya. Di-throttle 12 jam sekali biar gak boros
   kuota API GitHub (60 request/jam per IP tanpa token), dan gak
   notifikasi ulang buat versi yang sama.
══════════════════════════════════════════ */
function isNewerVersion(latest, current) {
  const clean = v => String(v).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const a = clean(latest), b = clean(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

async function checkAppUpdate() {
  try {
    const lastCheck = parseInt(localStorage.getItem('ofm_update_last_check') || '0', 10);
    const now = Date.now();
    if (now - lastCheck < 12 * 60 * 60 * 1000) return; // throttle: max sekali per 12 jam
    localStorage.setItem('ofm_update_last_check', String(now));

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) return; // repo belum punya release, atau rate-limited — diam saja
    const data = await res.json();
    const latestTag = data.tag_name;
    if (!latestTag || !isNewerVersion(latestTag, APP_VERSION)) return;

    const alreadyNotified = localStorage.getItem('ofm_update_notified_version');
    if (alreadyNotified === latestTag) return; // sudah pernah dikasih tau buat versi ini

    localStorage.setItem('ofm_update_notified_version', latestTag);
    addNotif(
      `Pembaruan Tersedia — ${latestTag}`,
      data.name || 'Versi baru OFM sudah rilis. Ketuk untuk lihat detail & unduh.',
      'blue',
      data.html_url
    );
  } catch (e) {
    // Offline atau gagal fetch — abaikan, coba lagi di sesi berikutnya
  }
}


/* ══════════════════════════════════════════
   DEVICE NOTIFICATIONS
   Real OS-level alerts via the Notification API, shown through the
   service worker so they still land while the app is backgrounded.
   Note: this only works while the browser/PWA process is alive —
   true background push (app fully closed) needs a server push
   service (e.g. Web Push + a backend), which isn't wired up here.
══════════════════════════════════════════ */
function requestPushPermission() {
  if (!('Notification' in window)) { showToast('Perangkat ini tidak mendukung notifikasi', 'warning'); return; }
  if (Notification.permission === 'granted') { showToast('Notifikasi sudah aktif', 'success'); return; }
  if (Notification.permission === 'denied') {
    showToast('Notifikasi diblokir — aktifkan lewat pengaturan browser', 'warning');
    return;
  }
  Notification.requestPermission().then(perm => {
    updateSettingsPage();
    if (perm === 'granted') showToast('Notifikasi perangkat aktif', 'success');
    else showToast('Izin notifikasi ditolak', 'warning');
  });
}

function firePushNotif(title, sub) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // already visible in-app via bell panel
  if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, { body: sub, icon: 'icon-192.png', badge: 'icon-144.png' }).catch(()=>{});
    });
  } else {
    try { new Notification(title, { body: sub, icon: 'icon-192.png' }); } catch(e) {}
  }
}

function updateBellBadge() {
  const badge = document.getElementById('bellBadge');
  if (!badge) return;
  const count = NOTIFICATIONS.length;
  badge.textContent = count > 9 ? '9+' : count;
  badge.classList.toggle('show', count > 0);
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    renderNotifPanel();
    // Mark all as read — clear badge
    const badge = document.getElementById('bellBadge');
    if (badge) { badge.textContent = '0'; badge.classList.remove('show'); }
  }
}

function renderNotifPanel() {
  const el = document.getElementById('notifItems');
  if (!el) return;
  if (!NOTIFICATIONS.length) {
    el.innerHTML = `<div class="notif-empty">${ICON.checkCircle} Semua lancar, tidak ada peringatan</div>`;
    return;
  }
  const dotColors  = { warn:'var(--gold)', danger:'var(--red)', teal:'var(--teal)', blue:'var(--blue)' };
  const typeIcons  = { warn:'warning', danger:'alertOctagon', teal:'settings', blue:'refresh' };
  el.innerHTML = NOTIFICATIONS.map(n => `
    <div class="notif-item"${n.url ? ` onclick="window.open('${n.url}','_blank')" style="cursor:pointer"` : ''}>
      <div class="notif-dot" style="background:${dotColors[n.type]||'var(--gold)'}">${ICON[typeIcons[n.type]]||''}</div>
      <div class="notif-body">
        <div class="notif-title-text">${escapeHtml(n.title)}</div>
        <div class="notif-sub">${escapeHtml(n.sub)}</div>
      </div>
      <div class="notif-time">${n.time}</div>
    </div>`).join('');
}

function checkBudgetAlerts() {
  BUDGET.cats.forEach(c => {
    const pct = c.limit > 0 ? Math.round(c.spent / c.limit * 100) : 0;
    const sym = currencyInfo(c.currency || 'IDR').symbol;
    if (pct >= 100 && !c._alerted100) {
      c._alerted100 = true;
      addNotif(`Budget ${c.label} Habis!`, `Pengeluaran sudah melampaui limit ${sym} ${c.limit.toLocaleString('id-ID')}`, 'danger');
    } else if (pct >= 80 && !c._alerted80) {
      c._alerted80 = true;
      addNotif(`Budget ${c.label} ${pct}%`, `Sisa ${sym} ${fmtK(Math.max(0, c.limit - c.spent))} dari ${sym} ${fmtK(c.limit)}`, 'warn');
    }
  });

  // Goal deadline alert
  GOALS.forEach(g => {
    const diff = Math.ceil((new Date(g.deadline) - new Date()) / 86400000);
    const pct  = Math.round(g.saved / g.target * 100);
    if (diff <= 7 && diff > 0 && pct < 100 && !g._alerted) {
      g._alerted = true;
      addNotif(`Goal "${g.name}" hampir deadline`, `${diff} hari lagi, baru ${pct}% tercapai`, 'warn');
    }
  });

  // Upcoming recurring alert (3 days ahead)
  RECURRINGS.filter(r => r.active).forEach(r => {
    const next = nextOccurrence(r.start, r.freq);
    const diff = Math.ceil((next - new Date()) / 86400000);
    if (diff <= 3 && !r._alerted) {
      r._alerted = true;
      addNotif(`${r.name} jatuh tempo`, `${daysUntil(next)} — Rp ${r.amount.toLocaleString('id-ID')}`, 'blue');
    }
  });
}


// ── Firestore save (debounced 800ms) ──────────────────────
let _saveTimer = null;
function saveToStorage() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_saveNow, 800);
}
async function _saveNow() {
  if (!window._currentUser || !window._fbDb) return;
  try {
    const { doc, setDoc } = window._fbFns;
    await setDoc(doc(window._fbDb, 'users', window._currentUser.uid), {
      transactions: S.transactions,
      budgetCats:   BUDGET.cats,
      budgetTotal:  BUDGET.total,
      goals:        GOALS,
      wallets:      WALLETS,
      recurrings:   RECURRINGS,
      dismissedSubs: DISMISSED_SUBS,
      username:     window._customUsername || null,
      updatedAt:    Date.now(),
    });
    if (window._lastSaveFailed) {
      window._lastSaveFailed = false;
      updateSettingsPage();
      showToast('Koneksi pulih, data tersimpan', 'success');
    }
  } catch(e) {
    console.warn('Firestore save error', e);
    if (!window._lastSaveFailed) {
      window._lastSaveFailed = true;
      showToast('Gagal menyimpan — periksa koneksi internetmu', 'danger');
      updateSettingsPage();
    }
  }
}

// ── Firestore load ─────────────────────────────────────────
window._loadUserData = async function(uid) {
  if (!window._fbDb) return;
  try {
    const { doc, getDoc } = window._fbFns;
    const snap = await getDoc(doc(window._fbDb, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data.transactions) S.transactions = data.transactions;
      if (data.budgetCats)   BUDGET.cats    = data.budgetCats;
      if (data.budgetTotal !== undefined) BUDGET.total = data.budgetTotal;
      if (data.goals)        GOALS          = data.goals;
      if (data.wallets)      WALLETS        = data.wallets;
      if (data.recurrings)   RECURRINGS     = data.recurrings;
      if (Array.isArray(data.dismissedSubs)) DISMISSED_SUBS = data.dismissedSubs;
      window._customUsername = data.username || (window._currentUser && window._currentUser.displayName) || null;
      // Re-register custom budget categories (icon lookup + expense picker) so they still work after reload
      const knownExpIds = new Set(CATS.expense.map(c => c.id));
      BUDGET.cats.forEach(c => {
        CUSTOM_CAT_ICONS[c.id] = c.icon;
        if (!knownExpIds.has(c.id)) {
          const insertAt = CATS.expense.length && CATS.expense[CATS.expense.length-1].id === 'other' ? CATS.expense.length - 1 : CATS.expense.length;
          CATS.expense.splice(insertAt, 0, { id:c.id, label:c.label, color:c.color });
          knownExpIds.add(c.id);
        }
      });
    } else {
      window._customUsername = (window._currentUser && window._currentUser.displayName) || null;
    }
    updateBrandTitle();
    // Init app after data loaded
    _initApp();
    hideLoadingScreen();
  } catch(e) {
    console.warn('Firestore load error', e);
    _initApp();
    hideLoadingScreen();
    showToast('Gagal memuat data — periksa koneksi internetmu', 'danger');
  }
};

function loadFromStorage() { /* replaced by Firestore */ }

/* ══════════════════════════════════════════
   APP LOCK — PIN + Biometric
   Local-device gate only: separate from the Firebase login above.
   The PIN is hashed (SHA-256) and kept in localStorage on this device —
   it's never sent anywhere and doesn't touch the account/cloud data.
   Biometric unlock piggybacks on the WebAuthn platform authenticator
   (Face ID / Touch ID / Windows Hello) purely as a local "did the
   device owner verify themself" signal, with the PIN always kept as
   the underlying fallback.
══════════════════════════════════════════ */
const LOCK_PIN_LEN = 6;

function lockEnabled()      { return localStorage.getItem('ofm_lock_enabled') === '1'; }
function lockHasBio()       { return !!localStorage.getItem('ofm_lock_bio_cred'); }
function lockBioSupported() { return !!(window.PublicKeyCredential && navigator.credentials); }

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ofm_lock_v1:' + str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function b64FromBuf(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function b64ToBuf(b64)   { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer; }

// ── Shared PIN-entry state machine — drives both the full-screen lock
//    and the setup/change/disable flow inside the Settings modal ──
const LOCKUI = { active: false, context: null, step: null, buffer: '', firstEntry: null, afterVerify: null };

function lockUiStart(context, step) {
  LOCKUI.active = true; LOCKUI.context = context; LOCKUI.step = step;
  LOCKUI.buffer = ''; LOCKUI.firstEntry = null;
  lockUiRenderDots();
  lockUiSetPrompt(step, '');
}

function lockUiSetPrompt(step, error) {
  const prompts = {
    'verify-old': 'Masukkan PIN saat ini',
    'new':        'Buat PIN baru (6 digit)',
    'confirm':    'Konfirmasi PIN baru',
    'lock':       'Masukkan PIN',
  };
  const subEl = document.getElementById('lockScreenSub');
  if (LOCKUI.context === 'screen' && subEl) subEl.textContent = prompts[step] || '';
  const modalPrompt = document.getElementById('lockModalPrompt');
  if (LOCKUI.context === 'modal' && modalPrompt) modalPrompt.textContent = prompts[step] || '';
  const err = document.getElementById(LOCKUI.context === 'screen' ? 'lockScreenError' : 'lockModalError');
  if (err) err.textContent = error || '';
}

function lockUiRenderDots() {
  document.querySelectorAll('.pinpad-dots').forEach(wrap => {
    [...wrap.children].forEach((d, i) => d.classList.toggle('filled', i < LOCKUI.buffer.length));
  });
}

function lockUiFail(msg) {
  lockUiSetPrompt(LOCKUI.step, msg);
  document.querySelectorAll('.pinpad-dots').forEach(w => { w.classList.add('shake'); setTimeout(() => w.classList.remove('shake'), 400); });
  LOCKUI.buffer = '';
  setTimeout(lockUiRenderDots, 50);
}

function lockKeyPress(d) {
  if (!LOCKUI.active || LOCKUI.buffer.length >= LOCK_PIN_LEN) return;
  LOCKUI.buffer += d;
  lockUiRenderDots();
  if (LOCKUI.buffer.length === LOCK_PIN_LEN) setTimeout(lockUiSubmit, 100);
}
function lockKeyBackspace() {
  if (!LOCKUI.active) return;
  LOCKUI.buffer = LOCKUI.buffer.slice(0, -1);
  lockUiRenderDots();
}

async function lockUiSubmit() {
  const entered = LOCKUI.buffer;
  const step = LOCKUI.step;

  if (step === 'lock' || step === 'verify-old') {
    const hash = await sha256Hex(entered);
    const stored = localStorage.getItem('ofm_lock_pin_hash');
    if (hash !== stored) {
      lockUiFail(step === 'lock' ? 'PIN salah, coba lagi' : 'PIN saat ini salah');
      return;
    }
    if (step === 'lock') { lockUnlockSuccess(); return; }
    // verify-old sukses — lanjut sesuai alasan awal diminta verifikasi
    LOCKUI.buffer = '';
    if (LOCKUI.afterVerify === 'disable') { lockDisable(); return; }
    LOCKUI.step = 'new'; LOCKUI.firstEntry = null;
    lockUiRenderDots(); lockUiSetPrompt('new', '');
    return;
  }

  if (step === 'new') {
    LOCKUI.firstEntry = entered;
    LOCKUI.buffer = ''; LOCKUI.step = 'confirm';
    lockUiRenderDots(); lockUiSetPrompt('confirm', '');
    return;
  }

  if (step === 'confirm') {
    if (entered !== LOCKUI.firstEntry) {
      LOCKUI.step = 'new'; LOCKUI.firstEntry = null;
      lockUiFail('PIN tidak cocok, ulangi dari awal');
      setTimeout(() => lockUiSetPrompt('new', ''), 900);
      return;
    }
    const hash = await sha256Hex(entered);
    localStorage.setItem('ofm_lock_pin_hash', hash);
    localStorage.setItem('ofm_lock_enabled', '1');
    LOCKUI.active = false;
    showToast('PIN berhasil diaktifkan', 'success');
    renderLockModal();
    updateSettingsPage();
    return;
  }
}

function lockUnlockSuccess() {
  LOCKUI.active = false;
  LOCKUI.buffer = '';
  window._appUnlocked = true;
  const scr = document.getElementById('lockScreen');
  const icon = document.getElementById('lockPadlockIcon');
  // Play the little padlock "ceklek" open animation (shackle pops open + icon turns white)
  // before the whole lock screen disappears, instead of just vanishing instantly.
  if (icon) icon.classList.add('unlocked');
  setTimeout(() => {
    if (scr) scr.classList.remove('open');
    if (icon) icon.classList.remove('unlocked'); // reset so it shows locked+teal again next time
  }, 380);
}

function lockDisable() {
  localStorage.removeItem('ofm_lock_pin_hash');
  localStorage.removeItem('ofm_lock_enabled');
  localStorage.removeItem('ofm_lock_bio_cred');
  LOCKUI.active = false;
  showToast('Kunci PIN dinonaktifkan', 'info');
  renderLockModal();
  updateSettingsPage();
}

// ── Full-screen lock, shown on launch (and after being backgrounded a while) ──
function showLockScreen(force) {
  if (!lockEnabled()) return;
  if (window._appUnlocked && !force) return;
  const scr = document.getElementById('lockScreen');
  if (!scr) return;
  scr.classList.add('open');
  // Biometrik + PIN sekaligus aktif? Tampilkan biometrik duluan aja — jangan
  // barengan sama PIN pad. User bisa pindah ke PIN lewat tombol "Gunakan PIN".
  if (lockHasBio()) {
    showLockBioView();
  } else {
    showLockPinView();
  }
}

function showLockBioView() {
  const bioView = document.getElementById('lockBioView');
  const pinView = document.getElementById('lockPinView');
  if (bioView) bioView.style.display = '';
  if (pinView) pinView.style.display = 'none';
  LOCKUI.active = false;
  const sub = document.getElementById('lockScreenSub');
  if (sub) sub.textContent = 'Verifikasi untuk melanjutkan';
  setTimeout(() => attemptBiometricUnlock(true), 400);
}

function showLockPinView() {
  const bioView = document.getElementById('lockBioView');
  const pinView = document.getElementById('lockPinView');
  if (bioView) bioView.style.display = 'none';
  if (pinView) pinView.style.display = '';
  lockUiStart('screen', 'lock');
}

// Dipanggil dari tombol "Gunakan PIN" di layar biometrik
function switchToPinFromBio() {
  showLockPinView();
}

let _lockHiddenAt = null;
document.addEventListener('visibilitychange', () => {
  if (!lockEnabled()) return;
  if (document.hidden) {
    _lockHiddenAt = Date.now();
  } else if (_lockHiddenAt && (Date.now() - _lockHiddenAt) > 15000) {
    window._appUnlocked = false;
    showLockScreen(true);
  }
});

function forgotPin() {
  showConfirm(
    'Lupa PIN?',
    'Ini akan menghapus kunci PIN & biometrik dari perangkat ini — data transaksimu tetap aman dan tidak terhapus. Kamu perlu membuat PIN baru lagi nanti kalau mau mengaktifkan kunci lagi.',
    () => { lockDisable(); lockUnlockSuccess(); },
    'warning'
  );
}

// ── Biometric enroll / verify (WebAuthn platform authenticator) ──
async function enrollBiometric() {
  if (!lockBioSupported()) { showToast('Biometrik tidak didukung di perangkat/browser ini', 'warning'); return; }
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) { showToast('Sensor biometrik tidak tersedia di perangkat ini', 'warning'); return; }
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'OFM' },
        user: { id: userId, name: 'ofm-local-user', displayName: 'Pengguna OFM' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
      }
    });
    if (!cred) throw new Error('no credential returned');
    localStorage.setItem('ofm_lock_bio_cred', b64FromBuf(cred.rawId));
    showToast('Biometrik berhasil diaktifkan', 'success');
    renderLockModal();
  } catch (err) {
    console.warn('Biometric enroll failed', err);
    showToast('Gagal mengaktifkan biometrik', 'danger');
  }
}

function disableBiometric() {
  localStorage.removeItem('ofm_lock_bio_cred');
  showToast('Biometrik dinonaktifkan', 'info');
  renderLockModal();
}

async function attemptBiometricUnlock(silent) {
  if (!lockHasBio()) { if (!silent) showToast('Biometrik belum diaktifkan', 'info'); return; }
  try {
    const credId = b64ToBuf(localStorage.getItem('ofm_lock_bio_cred'));
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: credId, type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      }
    });
    if (assertion) lockUnlockSuccess();
  } catch (err) {
    if (!silent) showToast('Verifikasi biometrik dibatalkan', 'warning');
  }
}

// ── Settings modal: setup / change / disable PIN, toggle biometric ──
function openLockSettings() {
  document.getElementById('lockModalOverlay').classList.add('open');
  renderLockModal();
}
function closeLockModal() {
  document.getElementById('lockModalOverlay').classList.remove('open');
  LOCKUI.active = false;
}
function closeLockModalOutside(e) { if (e.target === document.getElementById('lockModalOverlay')) closeLockModal(); }

function lockModalPinpadHTML() {
  return `
    <div style="text-align:center">
      <div id="lockModalPrompt" style="font-size:13px;color:var(--txt2);margin-bottom:14px">Buat PIN baru (6 digit)</div>
      <div class="pinpad-dots" style="margin-bottom:6px"><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="lock-error" id="lockModalError"></div>
      <div class="pinpad-grid" style="max-width:230px;margin:0 auto">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pinpad-key" onclick="lockKeyPress('${n}')">${n}</button>`).join('')}
        <div></div>
        <button class="pinpad-key" onclick="lockKeyPress('0')">0</button>
        <button class="pinpad-key pinpad-key-ghost" onclick="lockKeyBackspace()"><svg class="ic" viewBox="0 0 24 24"><path d="M21 12H8M11 6l-6 6 6 6"/></svg></button>
      </div>
      <div class="lock-forgot" onclick="renderLockModal()" style="margin-top:16px">Batal</div>
    </div>`;
}

function lockStartSetup() {
  document.getElementById('lockModalBody').innerHTML = lockModalPinpadHTML();
  lockUiStart('modal', 'new');
}
function lockStartChange() {
  document.getElementById('lockModalBody').innerHTML = lockModalPinpadHTML();
  LOCKUI.afterVerify = 'change';
  lockUiStart('modal', 'verify-old');
}
function lockStartDisable() {
  document.getElementById('lockModalBody').innerHTML = lockModalPinpadHTML();
  LOCKUI.afterVerify = 'disable';
  lockUiStart('modal', 'verify-old');
}

function renderLockModal() {
  LOCKUI.active = false;
  const body = document.getElementById('lockModalBody');
  if (!body) return;
  if (!lockEnabled()) {
    body.innerHTML = `
      <p style="font-size:12.5px;color:var(--txt3);line-height:1.6;margin-bottom:18px">
        Kunci aplikasi pakai PIN 6 digit sebelum siapa pun bisa lihat data keuanganmu. PIN disimpan cuma di perangkat ini (terenkripsi/hash), tidak dikirim ke server mana pun.
      </p>
      <button class="auth-btn-primary" onclick="lockStartSetup()">Aktifkan Kunci PIN</button>
    `;
    return;
  }
  const bioSupported = lockBioSupported();
  const bioOn = lockHasBio();
  body.innerHTML = `
    <div class="s-items flat" style="margin-bottom:18px">
      <div class="settings-item" style="cursor:default">
        <div class="si-icon">${ICON.lock}</div>
        <div class="si-text"><div class="si-name">PIN Aktif</div><div class="si-desc">Diminta tiap kali buka aplikasi</div></div>
        <div class="si-badge">Aktif</div>
      </div>
      ${bioSupported ? `
      <div class="settings-item" onclick="${bioOn ? 'disableBiometric()' : 'enrollBiometric()'}">
        <div class="si-icon">${ICON.fingerprint}</div>
        <div class="si-text"><div class="si-name">Buka dengan Biometrik</div><div class="si-desc">Face ID / sidik jari, PIN tetap jadi cadangan</div></div>
        <div class="si-badge" style="${bioOn ? '' : 'opacity:0.6'}">${bioOn ? 'Aktif' : 'Nonaktif'}</div>
      </div>` : ''}
    </div>
    <button class="auth-btn-primary" style="margin-bottom:10px" onclick="lockStartChange()">Ubah PIN</button>
    <button class="auth-btn-primary" style="background:rgba(255,107,132,0.16);border-color:rgba(255,107,132,0.35);color:var(--red);box-shadow:none" onclick="lockStartDisable()">Matikan Kunci PIN</button>
  `;
}

/* ══════════════════════════════════════════
   GOALS STATE
══════════════════════════════════════════ */
let GOALS = [];

let _activeTopupGoalId = null;

function goalColor(g) {
  const pct = g.saved / g.target;
  if (pct >= 1)   return '#2AE8C4';
  if (pct >= 0.7) return '#FFD166';
  return g.color || '#5EB3FF';
}

function daysLeft(deadline) {
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (diff < 0)  return 'Selesai';
  if (diff === 0) return 'Hari ini!';
  return diff + ' hari lagi';
}

function renderGoals() {
  const list = document.getElementById('goalsList');
  if (!list) return;
  if (!GOALS.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">${ICON.target}</div><h3>Belum ada goal</h3><p>Mulai tetapkan target tabunganmu</p></div>`;
    return;
  }
  list.innerHTML = GOALS.map(g => {
    const pct   = g.target > 0 ? Math.min(100, Math.round(g.saved / g.target * 100)) : 0;
    const color = goalColor(g);
    return `
      <div class="goal-card glass">
        <div class="goal-header">
          <div class="goal-icon" style="background:${color}22">${ICON[g.icon]||ICON.target}</div>
          <div class="goal-meta">
            <div class="goal-name">${escapeHtml(g.name)}</div>
            <div class="goal-days">${daysLeft(g.deadline)}</div>
          </div>
          <div class="goal-amount">
            <div class="goal-saved">Rp ${fmtK(g.saved)}</div>
            <div class="goal-target">dari Rp ${fmtK(g.target)}</div>
          </div>
        </div>
        <div class="goal-bar-bg">
          <div class="goal-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${color},${color}99)"></div>
        </div>
        <div class="goal-footer">
          <div class="goal-pct" style="color:${color}">${pct}%</div>
          <div style="display:flex;gap:8px;align-items:center">
            <div class="goal-add-btn" onclick="openTopupModal(${g.id})">＋ Tambah Dana</div>
            <div class="goal-add-btn" onclick="deleteGoal(${g.id})" style="color:var(--red);border-color:rgba(255,107,132,0.3);background:rgba(255,107,132,0.08)">${ICON.trash}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  renderGoalsPreview();
}

function renderGoalsPreview() {
  const el = document.getElementById('goalsPreview');
  if (!el) return;
  if (!GOALS.length) { el.innerHTML = `<div style="color:var(--txt3);font-size:12px;padding:4px 0">Belum ada goal — <span style="color:var(--gold);cursor:pointer" onclick="showPage('goals')">buat sekarang</span></div>`; return; }
  el.innerHTML = GOALS.map(g => {
    const pct   = g.target > 0 ? Math.min(100, Math.round(g.saved / g.target * 100)) : 0;
    const color = goalColor(g);
    return `
      <div class="gp-chip" onclick="showPage('goals')">
        <div class="gp-emoji">${ICON[g.icon]||ICON.target}</div>
        <div class="gp-info">
          <div class="gp-name">${escapeHtml(g.name)}</div>
          <div class="gp-mini-bar"><div class="gp-mini-fill" style="width:${pct}%;background:${color}"></div></div>
        </div>
      </div>`;
  }).join('');
}

function deleteGoal(id) {
  showConfirm('Hapus goal ini?', 'Goal akan dihapus permanen.', () => {
    GOALS = GOALS.filter(g => g.id !== id);
    saveToStorage();
    renderGoals();
    showToast('Goal dihapus', 'success');
  });
}

/* Goal Modal */
function openGoalModal() {
  document.getElementById('goalModalOverlay').classList.add('open');
  const next3mo = new Date(); next3mo.setMonth(next3mo.getMonth() + 3);
  document.getElementById('goalDeadline').value = next3mo.toISOString().split('T')[0];
  document.getElementById('goalDeadlineLabel').textContent = fmtDateShort(next3mo.toISOString().split('T')[0]);
  document.getElementById('goalName').value   = '';
  document.getElementById('goalTarget').value = '';
  document.getElementById('goalSaved').value  = '0';
  const gi = document.getElementById('goalIcon'); if(gi) gi.value='laptop';
  const gl = document.getElementById('goalIconLabel'); if(gl) gl.innerHTML = ICON.laptop + ' Laptop';
  // Reset picker display
  const gta = document.getElementById('txAccountLabel'); if(gta && WALLETS.length) gta.textContent = WALLETS[0].name;
}
function closeGoalModal() { document.getElementById('goalModalOverlay').classList.remove('open'); }
function closeGoalModalOutside(e) { if (e.target === document.getElementById('goalModalOverlay')) closeGoalModal(); }

function submitGoal() {
  const name    = document.getElementById('goalName').value.trim();
  const target  = parseInt(document.getElementById('goalTarget').value) || 0;
  const saved   = parseInt(document.getElementById('goalSaved').value)  || 0;
  const deadline= document.getElementById('goalDeadline').value;
  const icon    = document.getElementById('goalIcon').value || 'target';
  if (!name)   { showToast('Nama goal wajib diisi', 'warning'); return; }
  if (!target) { showToast('Target harus lebih dari 0', 'warning'); return; }
  const colors  = ['#5EB3FF','#2AE8C4','#FFD166','#C4A8FF','#FF8C00'];
  const color   = colors[GOALS.length % colors.length];
  GOALS = [...GOALS, { id: Date.now(), name, icon, target, saved, deadline, color }];
  saveToStorage();
  closeGoalModal();
  showToast('Goal berhasil ditambahkan!', 'success');
  renderGoals();
}

/* Top-up Modal */
function openTopupModal(goalId) {
  _activeTopupGoalId = goalId;
  const g = GOALS.find(g => g.id === goalId);
  if (!g) return;
  document.getElementById('topupModalTitle').textContent = 'Tambah Dana — ' + g.name;
  document.getElementById('topupAmount').value = '';
  document.getElementById('topupModalOverlay').classList.add('open');
}
function closeTopupModal() { document.getElementById('topupModalOverlay').classList.remove('open'); _activeTopupGoalId = null; }
function closeTopupModalOutside(e) { if (e.target === document.getElementById('topupModalOverlay')) closeTopupModal(); }

function submitTopup() {
  const amount = parseInt(document.getElementById('topupAmount').value) || 0;
  if (!amount) { showToast('Jumlah harus lebih dari 0', 'warning'); return; }
  const g = GOALS.find(g => g.id === _activeTopupGoalId);
  if (!g) return;
  g.saved = Math.min(g.target, g.saved + amount);
  saveToStorage();
  closeTopupModal();
  const pct = Math.round(g.saved / g.target * 100);
  showToast(pct >= 100 ? 'Goal tercapai!' : `+Rp ${amount.toLocaleString('id-ID')} ditambahkan (${pct}%)`, 'success');
  renderGoals();
}

/* ══════════════════════════════════════════
   CHART INTERACTIVE TOOLTIP
══════════════════════════════════════════ */
function buildRiverData() {
  // Build 7-day cashflow from real transactions
  const days = 7;
  const labels = [], income = [], expense = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
    labels.push(dayName.charAt(0).toUpperCase() + dayName.slice(1, 3));
    const dayTxs = S.transactions.filter(t => t.date === dateStr);
    income.push(dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
    expense.push(dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }
  return { income, expense, labels };
}

const RIVER_DATA = { income: [], expense: [], labels: [] };
let _riverPts = { income: [], expense: [] };

function initRiverTooltip() {
  const canvas  = document.getElementById('riverCanvas');
  const tooltip = document.getElementById('chartTooltip');
  if (!canvas) return;

  function findNearestPoint(clientX, clientY) {
    const rect   = canvas.getBoundingClientRect();
    const x      = clientX - rect.left;
    const y      = clientY - rect.top;
    let best = null, bestDist = 999;
    [..._riverPts.income, ..._riverPts.expense].forEach(p => {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bestDist && d < 28) { bestDist = d; best = p; }
    });
    return best;
  }

  function showTip(clientX, clientY) {
    const p = findNearestPoint(clientX, clientY);
    const rect = canvas.getBoundingClientRect();
    if (!p) { tooltip.classList.remove('show'); return; }
    const wrapRect = canvas.parentElement.getBoundingClientRect();
    let tx = p.x + 10;
    if (tx + 140 > wrapRect.width - 20) tx = p.x - 150;
    tooltip.style.left = tx + 'px';
    tooltip.style.top  = (p.y - 50) + 'px';
    const i = p.idx;
    document.getElementById('ctLabel').textContent   = RIVER_DATA.labels[i];
    document.getElementById('ctIncome').textContent  = 'Rp ' + RIVER_DATA.income[i].toLocaleString('id-ID');
    document.getElementById('ctExpense').textContent = 'Rp ' + RIVER_DATA.expense[i].toLocaleString('id-ID');
    tooltip.classList.add('show');
  }

  canvas.addEventListener('mousemove', e => showTip(e.clientX, e.clientY));
  canvas.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    showTip(t.clientX, t.clientY);
  }, { passive: false });
  canvas.addEventListener('touchend', () => setTimeout(() => tooltip.classList.remove('show'), 1200));
}


function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Masih kerja?';
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function initScrollDetection() {
  document.querySelectorAll('.page').forEach(pg => {
    const topbar = pg.querySelector('.topbar');
    if (topbar) {
      pg.addEventListener('scroll', () => {
        topbar.classList.toggle('scrolled', pg.scrollTop > 20);
      }, { passive: true });
    }
    // Close any open date picker on scroll
    pg.addEventListener('scroll', () => {
      document.querySelectorAll('.dp-overlay.open .date-picker-panel, .dp-overlay.open .currency-filter-panel').forEach(p => closeDp(p));
    }, { passive: true });
  });
}

function _initApp() {
  // Set balance
  const el = document.getElementById('totalBalance');
  if (el) el.textContent = '0';

  renderDashboard();
  renderWallets();
  renderGoals();
  renderRecurPreview();
  updateAccountDropdown();

  // Greeting
  const greetEl = document.getElementById('topbarGreeting');
  if (greetEl) greetEl.textContent = getGreeting();

  // Mark Beranda active and wire up the floating nav rail
  setActiveNavBubble('dashboard');
  initNavRail();

  // Scroll detection for topbar glass
  setTimeout(initScrollDetection, 100);
  setTimeout(initRiverTooltip, 300);
  setTimeout(() => { processRecurringDue(); checkBudgetAlerts(); }, 500);
  setTimeout(checkAppUpdate, 1500);
}

/* ══════════════════════════════════════════
   LOADING SCREEN
   Shown immediately on load to mask the brief gap before Firebase
   resolves auth state / loads data. Hidden once we reach a final
   state (guest mode, or logged-in data loaded) — with a fallback
   timeout so it never gets stuck if something goes wrong.
══════════════════════════════════════════ */
let _loadingHidden = false;
let _loadingProgress = 0;
let _loadingTimer = setInterval(() => {
  // Ease toward 90%, never quite finishing on its own — the real
  // finish happens in hideLoadingScreen() once data is actually ready.
  // Slower easing factor + longer tick so the bar doesn't rush to ~90%
  // within a couple seconds; it now takes roughly 3-4s to reach ~70%.
  _loadingProgress += (90 - _loadingProgress) * 0.05;
  const fill = document.getElementById('loadingProgressFill');
  const pct = document.getElementById('loadingProgressPct');
  const shown = Math.min(90, Math.round(_loadingProgress));
  if (fill) fill.style.width = shown + '%';
  if (pct) pct.textContent = shown + '%';
}, 150);

function hideLoadingScreen() {
  if (_loadingHidden) return;
  _loadingHidden = true;
  clearInterval(_loadingTimer);
  const fill = document.getElementById('loadingProgressFill');
  const pct = document.getElementById('loadingProgressPct');
  if (fill) fill.style.width = '100%';
  if (pct) pct.textContent = '100%';
  const screen = document.getElementById('loadingScreen');
  if (screen) {
    setTimeout(() => {
      screen.classList.add('hide');
      const app = document.getElementById('app');
      if (app) app.classList.remove('pre-load');
      showLockScreen(); // opaque lock overlay goes up before the loading screen fully fades, so data never flashes
      setTimeout(() => { screen.style.display = 'none'; }, 550);
    }, 180);
  } else {
    showLockScreen();
  }
}
// Safety net — never leave the user stuck on the loading screen
setTimeout(hideLoadingScreen, 4500);

function init() {
  // App is shown immediately (no login gate on first load). Render the shell right away
  // with whatever state is available; Firebase auth state (below) fills in real user data
  // or falls back to guest mode automatically, without forcing the login screen.
  _initApp();
}


/* ══════════════════════════════════════════
   ANALYTICS DATE PICKER
══════════════════════════════════════════ */
const ANALYTICS_DP = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  rangeStart: null,
  rangeEnd: null,
};

const ANALYTICS_FILTER = (function() {
  const now   = new Date();
  const from  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to    = now.toISOString().split('T')[0];
  return { dateFrom: from, dateTo: to };
})();

function toggleAnalyticsDatePicker() {
  const panel   = document.getElementById('analyticsDatePicker');
  const isOpen  = isDpOpen(panel);
  if (isOpen) { closeDp(panel); return; }
  ANALYTICS_DP.year  = new Date().getFullYear();
  ANALYTICS_DP.month = new Date().getMonth();
  renderAnalyticsDp();
  openDp(panel);
}

function analyticsDpNav(dir) {
  ANALYTICS_DP.month += dir;
  if (ANALYTICS_DP.month > 11) { ANALYTICS_DP.month = 0; ANALYTICS_DP.year++; }
  if (ANALYTICS_DP.month < 0)  { ANALYTICS_DP.month = 11; ANALYTICS_DP.year--; }
  renderAnalyticsDp();
}

function renderAnalyticsDp() {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('analyticsDpLabel').textContent = months[ANALYTICS_DP.month] + ' ' + ANALYTICS_DP.year;

  const firstDay    = new Date(ANALYTICS_DP.year, ANALYTICS_DP.month, 1).getDay();
  const daysInMonth = new Date(ANALYTICS_DP.year, ANALYTICS_DP.month + 1, 0).getDate();
  const todayStr    = new Date().toISOString().split('T')[0];

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="dp-day dp-blank"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = ANALYTICS_DP.year + '-' + String(ANALYTICS_DP.month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    let cls = 'dp-day';
    if (ds === todayStr) cls += ' today';
    if (ds === ANALYTICS_DP.rangeStart) cls += ' selected';
    html += '<div class="' + cls + '" onclick="analyticsDpClick(\'' + ds + '\')">' + d + '</div>';
  }
  document.getElementById('analyticsDpDays').innerHTML = html;

  const info = document.getElementById('analyticsDpRangeInfo');
  if (info) info.textContent = ANALYTICS_DP.rangeStart ? fmtDateShort(ANALYTICS_DP.rangeStart) : 'Pilih tanggal';
}

function analyticsDpClick(ds) {
  // Single click = filter that specific day
  ANALYTICS_DP.rangeStart   = ds;
  ANALYTICS_DP.rangeEnd     = ds;
  ANALYTICS_FILTER.dateFrom = ds;
  ANALYTICS_FILTER.dateTo   = ds;
  updateAnalyticsDtLabel();
  closeDp(document.getElementById('analyticsDatePicker'));
  renderAnalytics();
}

function analyticsDpPreset(preset) {
  const today   = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().split('T')[0];
  let from, to, label;

  if (preset === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 6);
    from = d.toISOString().split('T')[0]; to = todayStr; label = '7 Hari';
  } else if (preset === 'month') {
    from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    to = todayStr; label = 'Bulan Ini';
  } else if (preset === 'last3') {
    const d = new Date(today); d.setMonth(d.getMonth() - 3);
    from = d.toISOString().split('T')[0]; to = todayStr; label = '3 Bulan';
  } else if (preset === 'year') {
    from = today.getFullYear() + '-01-01'; to = todayStr; label = 'Tahun Ini';
  } else {
    from = null; to = null; label = 'Semua';
  }

  ANALYTICS_FILTER.dateFrom   = from;
  ANALYTICS_FILTER.dateTo     = to;
  ANALYTICS_DP.rangeStart     = from;
  ANALYTICS_DP.rangeEnd       = to;
  document.getElementById('analyticsDtLabel').textContent = label;
  // Update active preset style
  document.querySelectorAll('#analyticsDatePicker .dp-preset').forEach(el => {
    el.classList.toggle('active', el.textContent.trim() === label || el.getAttribute('onclick') === "analyticsDpPreset('" + preset + "')");
  });
  closeDp(document.getElementById('analyticsDatePicker'));
  renderAnalytics();
}

function updateAnalyticsDtLabel() {
  const lbl = document.getElementById('analyticsDtLabel');
  if (!ANALYTICS_FILTER.dateFrom) {
    if (lbl) lbl.textContent = 'Semua';
  } else if (ANALYTICS_FILTER.dateFrom === ANALYTICS_FILTER.dateTo) {
    if (lbl) lbl.textContent = fmtDateShort(ANALYTICS_FILTER.dateFrom);
  } else {
    if (lbl) lbl.textContent = fmtDateShort(ANALYTICS_FILTER.dateFrom) + ' – ' + fmtDateShort(ANALYTICS_FILTER.dateTo);
  }
}


/* ══════════════════════════════════════════
   TX DATE PICKER
══════════════════════════════════════════ */
const TX_DP = { year: new Date().getFullYear(), month: new Date().getMonth() };

function openTxDatePicker() {
  const panel   = document.getElementById('txDatePicker');
  if (isDpOpen(panel)) { closeDp(panel); return; }
  TX_DP.year  = new Date().getFullYear();
  TX_DP.month = new Date().getMonth();
  renderTxDp();
  openDp(panel);
}

function txDpNav(dir) {
  TX_DP.month += dir;
  if (TX_DP.month > 11) { TX_DP.month = 0; TX_DP.year++; }
  if (TX_DP.month < 0)  { TX_DP.month = 11; TX_DP.year--; }
  renderTxDp();
}

function renderTxDp() {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('txDpLabel').textContent = months[TX_DP.month] + ' ' + TX_DP.year;
  const firstDay    = new Date(TX_DP.year, TX_DP.month, 1).getDay();
  const daysInMonth = new Date(TX_DP.year, TX_DP.month + 1, 0).getDate();
  const todayStr    = new Date().toISOString().split('T')[0];
  const curVal      = document.getElementById('txDate').value || todayStr;
  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="dp-day dp-blank"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = TX_DP.year + '-' + String(TX_DP.month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    let cls = 'dp-day';
    if (ds === todayStr) cls += ' today';
    if (ds === curVal)   cls += ' selected';
    html += '<div class="' + cls + '" onclick="pickTxDate(\'' + ds + '\')">' + d + '</div>';
  }
  document.getElementById('txDpDays').innerHTML = html;
}

function pickTxDate(ds) {
  document.getElementById('txDate').value = ds;
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now()-86400000).toISOString().split('T')[0];
  const lbl = document.getElementById('txDateLabel');
  if (ds === today)     lbl.textContent = 'Hari ini';
  else if (ds === yesterday) lbl.textContent = 'Kemarin';
  else {
    const d = new Date(ds + 'T00:00:00');
    lbl.textContent = d.toLocaleDateString('id-ID', { day:'numeric', month:'short' });
  }
  closeDp(document.getElementById('txDatePicker'));
}

function txDpPreset(p) {
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now()-86400000).toISOString().split('T')[0];
  pickTxDate(p === 'today' ? today : yesterday);
}


/* ══════════════════════════════════════════
   RECUR START DATE PICKER (single date, same
   glass component as every other date picker)
══════════════════════════════════════════ */
const RECUR_START_DP = { year: new Date().getFullYear(), month: new Date().getMonth() };

function toggleRecurStartPicker() {
  const panel = document.getElementById('recurStartPicker');
  if (isDpOpen(panel)) { closeDp(panel); return; }
  const cur = document.getElementById('recurStart').value;
  const d = cur ? new Date(cur + 'T00:00:00') : new Date();
  RECUR_START_DP.year  = d.getFullYear();
  RECUR_START_DP.month = d.getMonth();
  renderRecurStartDp();
  openDp(panel);
}

function recurStartDpNav(dir) {
  RECUR_START_DP.month += dir;
  if (RECUR_START_DP.month > 11) { RECUR_START_DP.month = 0; RECUR_START_DP.year++; }
  if (RECUR_START_DP.month < 0)  { RECUR_START_DP.month = 11; RECUR_START_DP.year--; }
  renderRecurStartDp();
}

function renderRecurStartDp() {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('recurStartDpLabel').textContent = months[RECUR_START_DP.month] + ' ' + RECUR_START_DP.year;
  const firstDay    = new Date(RECUR_START_DP.year, RECUR_START_DP.month, 1).getDay();
  const daysInMonth = new Date(RECUR_START_DP.year, RECUR_START_DP.month + 1, 0).getDate();
  const todayStr    = new Date().toISOString().split('T')[0];
  const curVal      = document.getElementById('recurStart').value || todayStr;
  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="dp-day dp-blank"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = RECUR_START_DP.year + '-' + String(RECUR_START_DP.month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    let cls = 'dp-day';
    if (ds === todayStr) cls += ' today';
    if (ds === curVal)   cls += ' selected';
    html += '<div class="' + cls + '" onclick="pickRecurStartDate(\'' + ds + '\')">' + d + '</div>';
  }
  document.getElementById('recurStartDpDays').innerHTML = html;
}

function pickRecurStartDate(ds) {
  document.getElementById('recurStart').value = ds;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('recurStartLabel').textContent = (ds === today) ? 'Hari ini' : fmtDateShort(ds);
  closeDp(document.getElementById('recurStartPicker'));
}

function recurStartDpPreset(p) {
  const today = new Date().toISOString().split('T')[0];
  pickRecurStartDate(p === 'today' ? today : today);
}


/* ══════════════════════════════════════════
   GOAL DEADLINE DATE PICKER (single date, same
   glass component as every other date picker)
══════════════════════════════════════════ */
const GOAL_DEADLINE_DP = { year: new Date().getFullYear(), month: new Date().getMonth() };

function toggleGoalDeadlinePicker() {
  const panel = document.getElementById('goalDeadlinePicker');
  if (isDpOpen(panel)) { closeDp(panel); return; }
  const cur = document.getElementById('goalDeadline').value;
  const d = cur ? new Date(cur + 'T00:00:00') : new Date();
  GOAL_DEADLINE_DP.year  = d.getFullYear();
  GOAL_DEADLINE_DP.month = d.getMonth();
  renderGoalDeadlineDp();
  openDp(panel);
}

function goalDeadlineDpNav(dir) {
  GOAL_DEADLINE_DP.month += dir;
  if (GOAL_DEADLINE_DP.month > 11) { GOAL_DEADLINE_DP.month = 0; GOAL_DEADLINE_DP.year++; }
  if (GOAL_DEADLINE_DP.month < 0)  { GOAL_DEADLINE_DP.month = 11; GOAL_DEADLINE_DP.year--; }
  renderGoalDeadlineDp();
}

function renderGoalDeadlineDp() {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('goalDeadlineDpLabel').textContent = months[GOAL_DEADLINE_DP.month] + ' ' + GOAL_DEADLINE_DP.year;
  const firstDay    = new Date(GOAL_DEADLINE_DP.year, GOAL_DEADLINE_DP.month, 1).getDay();
  const daysInMonth = new Date(GOAL_DEADLINE_DP.year, GOAL_DEADLINE_DP.month + 1, 0).getDate();
  const todayStr    = new Date().toISOString().split('T')[0];
  const curVal      = document.getElementById('goalDeadline').value;
  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="dp-day dp-blank"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = GOAL_DEADLINE_DP.year + '-' + String(GOAL_DEADLINE_DP.month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    let cls = 'dp-day';
    if (ds === todayStr) cls += ' today';
    if (ds === curVal)   cls += ' selected';
    html += '<div class="' + cls + '" onclick="pickGoalDeadlineDate(\'' + ds + '\')">' + d + '</div>';
  }
  document.getElementById('goalDeadlineDpDays').innerHTML = html;
}

function pickGoalDeadlineDate(ds) {
  document.getElementById('goalDeadline').value = ds;
  document.getElementById('goalDeadlineLabel').textContent = fmtDateShort(ds);
  closeDp(document.getElementById('goalDeadlinePicker'));
}

function goalDeadlineDpPreset(months) {
  const d = new Date(); d.setMonth(d.getMonth() + months);
  pickGoalDeadlineDate(d.toISOString().split('T')[0]);
}


/* ══════════════════════════════════════════
   BUDGET DATE PICKER
══════════════════════════════════════════ */
const BUDGET_DP = { year: new Date().getFullYear(), month: new Date().getMonth() };
const BUDGET_FILTER = (function() {
  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to   = now.toISOString().split('T')[0];
  return { dateFrom: from, dateTo: to };
})();

function toggleBudgetDatePicker() {
  const panel   = document.getElementById('budgetDatePicker');
  if (isDpOpen(panel)) { closeDp(panel); return; }
  BUDGET_DP.year  = new Date().getFullYear();
  BUDGET_DP.month = new Date().getMonth();
  renderBudgetDp();
  openDp(panel);
}

function budgetDpNav(dir) {
  BUDGET_DP.month += dir;
  if (BUDGET_DP.month > 11) { BUDGET_DP.month = 0; BUDGET_DP.year++; }
  if (BUDGET_DP.month < 0)  { BUDGET_DP.month = 11; BUDGET_DP.year--; }
  renderBudgetDp();
}

function renderBudgetDp() {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('budgetDpLabel').textContent = months[BUDGET_DP.month] + ' ' + BUDGET_DP.year;
  const firstDay    = new Date(BUDGET_DP.year, BUDGET_DP.month, 1).getDay();
  const daysInMonth = new Date(BUDGET_DP.year, BUDGET_DP.month + 1, 0).getDate();
  const todayStr    = new Date().toISOString().split('T')[0];
  const selDate     = BUDGET_FILTER.dateFrom === BUDGET_FILTER.dateTo ? BUDGET_FILTER.dateFrom : null;
  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="dp-day dp-blank"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = BUDGET_DP.year + '-' + String(BUDGET_DP.month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    let cls = 'dp-day';
    if (ds === todayStr) cls += ' today';
    if (ds === selDate)  cls += ' selected';
    html += '<div class="' + cls + '" onclick="budgetDpPickDay(\'' + ds + '\')">' + d + '</div>';
  }
  document.getElementById('budgetDpDays').innerHTML = html;
  const info = document.getElementById('budgetDpRangeInfo');
  if (info) info.textContent = BUDGET_FILTER.dateFrom && BUDGET_FILTER.dateTo && BUDGET_FILTER.dateFrom !== BUDGET_FILTER.dateTo
    ? fmtDateShort(BUDGET_FILTER.dateFrom) + ' – ' + fmtDateShort(BUDGET_FILTER.dateTo)
    : BUDGET_FILTER.dateFrom ? fmtDateShort(BUDGET_FILTER.dateFrom) : '';
}

function budgetDpPickDay(ds) {
  // Single click = set both from and to to that day
  BUDGET_FILTER.dateFrom = ds;
  BUDGET_FILTER.dateTo   = ds;
  document.getElementById('budgetDtLabel').textContent = fmtDateShort(ds);
  closeDp(document.getElementById('budgetDatePicker'));
  renderBudget();
}

function budgetDpPreset(preset) {
  const today = new Date(); today.setHours(0,0,0,0);
  const ts    = today.toISOString().split('T')[0];
  let from, to, label;
  if (preset === 'today') {
    from = to = ts; label = 'Hari Ini';
  } else if (preset === 'month') {
    from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    to = ts; label = 'Bulan Ini';
  } else if (preset === 'last3') {
    const d = new Date(today); d.setMonth(d.getMonth()-3);
    from = d.toISOString().split('T')[0]; to = ts; label = '3 Bulan';
  } else if (preset === 'year') {
    from = today.getFullYear() + '-01-01'; to = ts; label = 'Tahun Ini';
  } else {
    from = null; to = null; label = 'Semua';
  }
  BUDGET_FILTER.dateFrom = from;
  BUDGET_FILTER.dateTo   = to;
  document.getElementById('budgetDtLabel').textContent = label;
  document.querySelectorAll('#budgetDatePicker .dp-preset').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick') === "budgetDpPreset('" + preset + "')");
  });
  closeDp(document.getElementById('budgetDatePicker'));
  renderBudget();
}


/* ══════════════════════════════════════════
   AUTH FUNCTIONS
══════════════════════════════════════════ */
let _authMode = 'login';

function switchAuthTab(mode) {
  _authMode = mode;
  const isLogin = mode === 'login';
  document.getElementById('tabLogin').classList.toggle('sel', isLogin);
  document.getElementById('tabRegister').classList.toggle('sel', !isLogin);
  document.getElementById('authBtn').textContent          = isLogin ? 'Masuk' : 'Daftar';
  document.getElementById('authNameWrap').style.display   = isLogin ? 'none' : 'block';
  const fpEl = document.getElementById('authForgotPw');
  if (fpEl) fpEl.style.display = isLogin ? 'block' : 'none';
  document.getElementById('authError').textContent = '';
  document.getElementById('authError').style.color = '#FF6B84';
}

// ── Auth welcome sequence: typewriter text + logo-forming animation ──
function _sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function _typeInto(el, text, speed) {
  if (!el) return;
  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    await _sleep(speed);
  }
}

async function _deleteFrom(el, speed) {
  if (!el) return;
  let text = el.textContent;
  while (text.length > 0) {
    text = text.slice(0, -1);
    el.textContent = text;
    await _sleep(speed);
  }
}

// Builds an NxN grid of small clipped pieces inside a .logo-shatter wrapper
// (see data-grid on the element). Each piece gets its own scatter offset,
// rotation and stagger delay based on its distance from the icon's center,
// so the icon visibly assembles piece by piece from the middle outward —
// a much more detailed "forming" process than a plain fade/scale.
const LOGO_GRID_SCATTER_UNIT = 11; // px of scatter per grid step, per piece
const LOGO_GRID_DELAY_STEP   = 42; // ms of stagger per grid step of distance

function _buildLogoGrid(wrap) {
  if (!wrap || wrap.dataset.built === '1') return;
  const n = parseInt(wrap.dataset.grid, 10) || 6;
  wrap.dataset.built = '1';
  const mid = (n - 1) / 2;
  const step = 100 / n;
  const frag = document.createDocumentFragment();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const dx = c - mid, dy = r - mid;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const piece = document.createElement('div');
      piece.className = 'piece';
      const top = r * step, left = c * step;
      const bottom = 100 - top - step, right = 100 - left - step;
      const clip = `inset(${top.toFixed(3)}% ${right.toFixed(3)}% ${bottom.toFixed(3)}% ${left.toFixed(3)}%)`;
      piece.style.clipPath = clip;
      piece.style.webkitClipPath = clip;
      piece.style.setProperty('--tx', (dx * LOGO_GRID_SCATTER_UNIT).toFixed(1) + 'px');
      piece.style.setProperty('--ty', (dy * LOGO_GRID_SCATTER_UNIT).toFixed(1) + 'px');
      piece.style.setProperty('--rot', ((dx - dy) * 7).toFixed(1) + 'deg');
      piece.style.setProperty('--pd', Math.round(dist * LOGO_GRID_DELAY_STEP) + 'ms');
      frag.appendChild(piece);
    }
  }
  wrap.appendChild(frag);
}

function buildLogoShatterGrids() {
  document.querySelectorAll('.logo-shatter[data-grid]').forEach(_buildLogoGrid);
}
buildLogoShatterGrids();

// Plays the "logo forms piece by piece" (mode-form) or "logo falls apart"
// (mode-disassemble) animation on a .logo-shatter wrapper, restarting cleanly.
function _setLogoMode(wrap, mode) {
  if (!wrap) return;
  wrap.classList.remove('mode-form', 'mode-disassemble');
  void wrap.offsetWidth; // force reflow so the animation restarts from frame 0
  if (mode) wrap.classList.add(mode);
}
async function _playLogoForm(wrap) {
  _setLogoMode(wrap, 'mode-form');
  await _sleep(900); // ~ farthest piece's stagger delay + its animation duration
}
async function _playLogoDisassemble(wrap) {
  _setLogoMode(wrap, 'mode-disassemble');
  await _sleep(800);
}

let _authLoopToken = 0;

// Loops forever while the login screen is open:
//   type "Selamat datang" → delete it → logo forms → title fades in →
//   subtitle types → hold → (reveal the form once, first time only) →
//   subtitle deletes → title fades out → logo disassembles → repeat
async function runAuthWelcomeLoop() {
  const myToken = ++_authLoopToken;
  const welcomeEl     = document.getElementById('authWelcomeText');
  const welcomeCursor = document.getElementById('authWelcomeCursor');
  const titleO         = document.getElementById('authTitleO');
  const titleFM         = document.getElementById('authTitleFM');
  const titleCursor    = document.getElementById('authTitleCursor');
  const subEl         = document.getElementById('authSubtitleText');
  const subCursor     = document.getElementById('authSubtitleCursor');
  const logoWrap      = document.getElementById('authLogoShatter');
  const card          = document.getElementById('authCard');
  if (!welcomeEl || !logoWrap) return;

  let firstCycle = true;

  while (_authLoopToken === myToken) {
    // reset visual state for this cycle — hide every cursor so nothing
    // lingers on screen from the previous pass
    welcomeEl.textContent = '';
    if (titleO) titleO.textContent = '';
    if (titleFM) titleFM.textContent = '';
    subEl.textContent = '';
    if (welcomeCursor) welcomeCursor.classList.remove('show');
    if (titleCursor) titleCursor.classList.remove('show');
    if (subCursor) subCursor.classList.remove('show');
    _setLogoMode(logoWrap, null);
    await _sleep(150);
    if (_authLoopToken !== myToken) return;

    // 1) type "Selamat datang" (cursor visible only while this field is active)
    if (welcomeCursor) welcomeCursor.classList.add('show');
    await _typeInto(welcomeEl, 'Selamat datang', 60);
    if (_authLoopToken !== myToken) return;
    await _sleep(900);
    if (_authLoopToken !== myToken) return;
    // ...then delete it, like the cursor erasing it
    await _deleteFrom(welcomeEl, 38);
    if (_authLoopToken !== myToken) return;
    if (welcomeCursor) welcomeCursor.classList.remove('show');
    await _sleep(200);

    // 2) logo forms piece by piece
    await _playLogoForm(logoWrap);
    if (_authLoopToken !== myToken) return;

    // 3) title types in — "O" then "FM" (teal), same cursor mechanic
    if (titleCursor) titleCursor.classList.add('show');
    await _typeInto(titleO, 'O', 90);
    if (_authLoopToken !== myToken) return;
    await _typeInto(titleFM, 'FM', 90);
    if (_authLoopToken !== myToken) return;
    if (titleCursor) titleCursor.classList.remove('show');
    await _sleep(150);
    if (_authLoopToken !== myToken) return;

    // 4) subtitle types in
    if (subCursor) subCursor.classList.add('show');
    await _typeInto(subEl, 'Orias Financial Management', 32);
    if (_authLoopToken !== myToken) return;

    // hold everything on screen
    await _sleep(1300);
    if (_authLoopToken !== myToken) return;

    // reveal the login form once — after that it stays, even as this
    // welcome sequence keeps looping behind/around it
    if (firstCycle) {
      firstCycle = false;
      if (card) card.classList.add('revealed');
    }

    // 5) delete subtitle, then title (FM, then O), cursor erasing both, logo falls apart
    await _deleteFrom(subEl, 22);
    if (_authLoopToken !== myToken) return;
    if (subCursor) subCursor.classList.remove('show');
    await _sleep(150);
    if (_authLoopToken !== myToken) return;
    if (titleCursor) titleCursor.classList.add('show');
    await _deleteFrom(titleFM, 55);
    if (_authLoopToken !== myToken) return;
    await _deleteFrom(titleO, 55);
    if (_authLoopToken !== myToken) return;
    if (titleCursor) titleCursor.classList.remove('show');
    await _sleep(250);
    if (_authLoopToken !== myToken) return;
    await _playLogoDisassemble(logoWrap);
    if (_authLoopToken !== myToken) return;
    await _sleep(250);
  }
}

function stopAuthWelcomeLoop() {
  _authLoopToken++;
}

// Shows the auth overlay, resets the form's reveal state and (re)starts the
// looping welcome sequence — the form appears again only after the first
// full cycle completes.
function showAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (!overlay) return;
  const card = document.getElementById('authCard');
  if (card) card.classList.remove('revealed');
  overlay.classList.remove('show');
  void overlay.offsetWidth; // force reflow
  overlay.classList.add('show');
  runAuthWelcomeLoop();
}

function hideAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('show');
  stopAuthWelcomeLoop();
  // clean up so the next open starts from a blank slate (no stray cursor/text)
  const welcomeEl     = document.getElementById('authWelcomeText');
  const welcomeCursor = document.getElementById('authWelcomeCursor');
  const subEl         = document.getElementById('authSubtitleText');
  const subCursor     = document.getElementById('authSubtitleCursor');
  const titleO        = document.getElementById('authTitleO');
  const titleFM       = document.getElementById('authTitleFM');
  const titleCursor   = document.getElementById('authTitleCursor');
  const logoWrap      = document.getElementById('authLogoShatter');
  if (welcomeEl) welcomeEl.textContent = '';
  if (subEl) subEl.textContent = '';
  if (titleO) titleO.textContent = '';
  if (titleFM) titleFM.textContent = '';
  if (welcomeCursor) welcomeCursor.classList.remove('show');
  if (subCursor) subCursor.classList.remove('show');
  if (titleCursor) titleCursor.classList.remove('show');
  if (logoWrap) _setLogoMode(logoWrap, null);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function doEmailAuth() {
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl    = document.getElementById('authError');
  const btn      = document.getElementById('authBtn');
  errEl.style.color = '#FF6B84';

  if (!email || !password) { errEl.textContent = 'Isi email dan password dulu'; return; }
  if (!isValidEmail(email)) { errEl.textContent = 'Format email tidak valid'; return; }
  if (_authMode === 'register' && password.length < 6) {
    errEl.textContent = 'Password minimal 6 karakter';
    return;
  }
  if (_authMode === 'register' && !document.getElementById('authName').value.trim()) {
    errEl.textContent = 'Nama kamu wajib diisi';
    return;
  }

  btn.textContent = '...';
  btn.disabled    = true;
  try {
    if (_authMode === 'login') {
      await window._fbFns.signInWithEmailAndPassword(window._fbAuth, email, password);
    } else {
      const name = document.getElementById('authName').value.trim();
      const cred = await window._fbFns.createUserWithEmailAndPassword(window._fbAuth, email, password);
      // Update display name
      if (name) await cred.user.updateProfile({ displayName: name }).catch(()=>{});
    }
    errEl.textContent = '';
  } catch(e) {
    const msgs = {
      'auth/user-not-found':     'Akun tidak ditemukan',
      'auth/wrong-password':     'Password salah',
      'auth/email-already-in-use': 'Email sudah terdaftar',
      'auth/weak-password':      'Password minimal 6 karakter',
      'auth/invalid-email':      'Format email tidak valid',
      'auth/invalid-credential': 'Email atau password salah',
      'auth/too-many-requests':  'Terlalu banyak percobaan, coba lagi nanti',
      'auth/network-request-failed': 'Tidak ada koneksi internet',
    };
    errEl.textContent = msgs[e.code] || 'Terjadi kesalahan, coba lagi';
    btn.textContent   = _authMode === 'login' ? 'Masuk' : 'Daftar';
    btn.disabled      = false;
  }
}

async function doForgotPassword() {
  const email = document.getElementById('authEmail').value.trim();
  const errEl = document.getElementById('authError');
  if (!email || !isValidEmail(email)) {
    errEl.style.color = '#FF6B84';
    errEl.textContent = 'Masukkan email yang valid dulu, lalu klik lupa password';
    return;
  }
  try {
    await window._fbFns.sendPasswordResetEmail(window._fbAuth, email);
    errEl.style.color = 'var(--teal)';
    errEl.textContent = 'Link reset password sudah dikirim ke email kamu';
  } catch(e) {
    const msgs = {
      'auth/user-not-found': 'Akun dengan email ini tidak ditemukan',
      'auth/invalid-email':  'Format email tidak valid',
      'auth/network-request-failed': 'Tidak ada koneksi internet',
    };
    errEl.style.color = '#FF6B84';
    errEl.textContent = msgs[e.code] || 'Gagal mengirim email reset, coba lagi';
  }
}

// ── Guest mode ──────────────────────────────────────────
window._isGuest = false;

function continueAsGuest() {
  window._isGuest = true;
  hideAuthOverlay();
  document.getElementById('app').style.display = 'block';
  _initApp();
  hideLoadingScreen();

  updateProfileHeroUI();
  updateBrandTitle();
}

// Keeps the "Mode Tamu" / profile box in Settings in sync with auth state:
// shows a Masuk (login) button for guests, and username + edit pencil + Keluar (logout) button once logged in.
function updateProfileHeroUI() {
  const nameEl   = document.getElementById('profileName');
  const emailEl  = document.getElementById('profileEmail');
  const avatarEl = document.getElementById('profileAvatar');
  const editBtn  = document.getElementById('profileEditBtn');
  const authBtn  = document.getElementById('profileAuthBtn');
  const loggedIn = !window._isGuest && !!window._currentUser;

  if (loggedIn) {
    const user = window._currentUser;
    const displayName = window._customUsername || user.displayName || (user.email ? user.email.split('@')[0] : 'Pengguna OFM');
    if (nameEl)   nameEl.textContent  = displayName;
    if (emailEl)  emailEl.textContent = user.email || '';
    if (avatarEl) { avatarEl.textContent = (displayName || 'U')[0].toUpperCase(); avatarEl.style.display = 'flex'; }
    if (editBtn)  editBtn.style.display = 'flex';
    if (authBtn) {
      authBtn.textContent = 'Keluar';
      authBtn.classList.add('danger');
      authBtn.setAttribute('onclick', 'doLogout()');
    }
  } else {
    if (nameEl)   nameEl.textContent  = 'Mode Tamu';
    if (emailEl)  emailEl.textContent = 'Data tidak tersimpan';
    if (avatarEl) avatarEl.style.display = 'none';
    if (editBtn)  editBtn.style.display = 'none';
    if (authBtn) {
      authBtn.textContent = 'Masuk';
      authBtn.classList.remove('danger');
      authBtn.setAttribute('onclick', 'exitGuestToLogin()');
    }
  }
}

window.addEventListener('beforeunload', e => {
  if (window._isGuest && S.transactions.length > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ── PWA install prompt ──────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const installItem = document.getElementById('installAppItem');
  if (installItem) installItem.style.display = 'flex';
});
function installApp() {
  if (!deferredInstallPrompt) { showToast('Aplikasi sudah terpasang atau tidak didukung perangkat ini', 'info'); return; }
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') showToast('Aplikasi berhasil dipasang', 'success');
    deferredInstallPrompt = null;
    const installItem = document.getElementById('installAppItem');
    if (installItem) installItem.style.display = 'none';
  });
}
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const installItem = document.getElementById('installAppItem');
  if (installItem) installItem.style.display = 'none';
  showToast('OFM berhasil dipasang di perangkatmu', 'success');
});

window.addEventListener('offline', () => {
  showToast('Koneksi internet terputus', 'warning');
});
window.addEventListener('online', () => {
  showToast('Koneksi internet tersambung kembali', 'success');
  if (window._currentUser) _saveNow();
});

function exitGuestToLogin() {
  window._isGuest = false;
  document.getElementById('app').style.display = 'none';
  showAuthOverlay();
}

async function doGoogleAuth() {
  try {
    await window._fbFns.signInWithPopup(window._fbAuth, window._fbProvider);
  } catch(e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      document.getElementById('authError').textContent = 'Login Google gagal, coba lagi';
    }
  }
}

async function doLogout() {
  showConfirm('Keluar dari OFM?', 'Lo harus login lagi untuk mengakses data.', async () => {
    await window._fbFns.signOut(window._fbAuth);
  }, 'logout');
}

window.addEventListener('resize',()=>{ if(S.currentPage==='dashboard')drawRiver(); if(S.currentPage==='analytics')renderAnalytics(); });
/* ══════════════════════════════════════════
   UNIVERSAL PICKER MODAL SYSTEM
══════════════════════════════════════════ */

// Registry: fieldId → { title, options: [{value, text, icon}] }
const PICKER_REGISTRY = {
  txAccount: {
    title: 'Pilih Akun',
    getOpts: () => WALLETS.map(w => ({ value: w.id, text: w.name })),
    labelId: 'txAccountLabel',
  },
  txCategory: {
    title: 'Pilih Kategori',
    getOpts: () => (CATS[S.currentType] || []).map(c => ({ value: c.id, text: c.label, icon: catIcon(c.id) })),
    labelId: 'txCategoryLabel',
  },
  walletTypeInput: {
    title: 'Tipe Akun',
    getOpts: () => [
      { value: 'bank',    text: 'Rekening', icon: 'bank' },
      { value: 'ewallet', text: 'E-Wallet', icon: 'smartphone' },
      { value: 'tunai',   text: 'Tunai',    icon: 'cash' },
      { value: 'invest',  text: 'Investasi', icon: 'trendUp' },
    ],
    labelId: 'walletTypeLbl',
  },
  editWalletTypeInput: {
    title: 'Tipe Akun',
    getOpts: () => [
      { value: 'bank',    text: 'Rekening', icon: 'bank' },
      { value: 'ewallet', text: 'E-Wallet', icon: 'smartphone' },
      { value: 'tunai',   text: 'Tunai',    icon: 'cash' },
      { value: 'invest',  text: 'Investasi', icon: 'trendUp' },
    ],
    labelId: 'editWalletTypeLbl',
  },
  walletCurrencyInput: {
    title: 'Mata Uang',
    getOpts: () => Object.keys(CURRENCIES).map(code => ({ value: code, text: currencyLabelText(code) })),
    labelId: 'walletCurrencyLbl',
  },
  editWalletCurrencyInput: {
    title: 'Mata Uang',
    getOpts: () => Object.keys(CURRENCIES).map(code => ({ value: code, text: currencyLabelText(code) })),
    labelId: 'editWalletCurrencyLbl',
  },
  newBudgetCatCurrency: {
    title: 'Mata Uang',
    getOpts: () => Object.keys(CURRENCIES).map(code => ({ value: code, text: currencyLabelText(code) })),
    labelId: 'newBudgetCatCurrencyLbl',
  },
  recurFreq: {
    title: 'Frekuensi',
    getOpts: () => [
      { value: 'monthly', text: 'Bulanan' },
      { value: 'weekly',  text: 'Mingguan' },
      { value: 'yearly',  text: 'Tahunan' },
    ],
    labelId: 'recurFreqLabel',
  },
  recurCat: {
    title: 'Kategori',
    getOpts: () => [
      { value: 'bill',   text: 'Tagihan',   icon: 'bill' },
      { value: 'food',   text: 'Makan',     icon: 'utensils' },
      { value: 'trans',  text: 'Transport', icon: 'car' },
      { value: 'ent',    text: 'Hiburan',   icon: 'gamepad' },
      { value: 'salary', text: 'Gaji',      icon: 'briefcase' },
      { value: 'other',  text: 'Lainnya',   icon: 'package' },
    ],
    labelId: 'recurCatLabel',
  },
  recurAccount: {
    title: 'Pilih Akun',
    getOpts: () => WALLETS.map(w => ({ value: w.id, text: w.name })),
    labelId: 'recurAccountLabel',
  },
  goalIcon: {
    title: 'Ikon Goal',
    getOpts: () => [
      { value: 'laptop',  text: 'Laptop',        icon: 'laptop' },
      { value: 'home',    text: 'Rumah',         icon: 'home' },
      { value: 'car',     text: 'Kendaraan',     icon: 'car' },
      { value: 'plane',   text: 'Liburan',       icon: 'plane' },
      { value: 'gem',     text: 'Menikah',       icon: 'gem' },
      { value: 'smartphone', text: 'Gadget',     icon: 'smartphone' },
      { value: 'graduationCap', text: 'Pendidikan', icon: 'graduationCap' },
      { value: 'wallet',  text: 'Dana Darurat',  icon: 'wallet' },
      { value: 'target',  text: 'Lainnya',       icon: 'target' },
    ],
    labelId: 'goalIconLabel',
  },
};

let _pickerActiveField = null;
let _pickerActiveOpts  = [];

/* ══════════════════════════════════════════
   DROPDOWN ANCHORING
   Positions a floating glass panel (the option picker, a date picker, the
   currency filter, ...) right under the field/button that opened it —
   flipping above and clamping to the viewport edges when there isn't
   enough room — instead of the old behaviour of popping up centered on
   screen like a full modal.
══════════════════════════════════════════ */
function anchorDropdown(panel, trigger) {
  if (!panel || !trigger) return;
  const gap = 8, margin = 12;
  const vw = window.innerWidth, vh = window.innerHeight;
  const t  = trigger.getBoundingClientRect();

  // Reset so we measure the panel's natural size for this content.
  panel.style.left = margin + 'px';
  panel.style.top  = margin + 'px';
  panel.style.maxHeight = '';
  panel.style.minWidth = t.width + 'px';
  const pRect = panel.getBoundingClientRect();
  const pw = pRect.width, ph = pRect.height;

  let left = Math.min(Math.max(t.left, margin), vw - pw - margin);
  if (left < margin) left = margin;

  const spaceBelow = vh - t.bottom - gap - margin;
  const spaceAbove = t.top - gap - margin;
  let top, origin, ty;
  if (spaceBelow >= Math.min(ph, 160) || spaceBelow >= spaceAbove) {
    top = t.bottom + gap;
    origin = 'top center'; ty = '-8px';
    if (ph > spaceBelow) panel.style.maxHeight = spaceBelow + 'px';
  } else {
    origin = 'bottom center'; ty = '8px';
    const h = Math.min(ph, spaceAbove);
    top = t.top - gap - h;
    if (ph > spaceAbove) panel.style.maxHeight = spaceAbove + 'px';
  }
  if (top < margin) top = margin;

  panel.style.left = left + 'px';
  panel.style.top  = top + 'px';
  panel.style.setProperty('--dd-origin', origin);
  panel.style.setProperty('--dd-ty', ty);
}

function openPicker(trigger, fieldId, title) {
  const reg = PICKER_REGISTRY[fieldId];
  if (!reg) return;
  _pickerActiveField = fieldId;
  const hidden   = document.getElementById(fieldId);
  const curVal   = hidden ? hidden.value : '';
  const opts     = reg.getOpts();
  _pickerActiveOpts = opts;
  document.getElementById('pickerTitle').textContent = title || reg.title;
  document.getElementById('pickerOpts').innerHTML = opts.map((o, i) => `
    <div class="picker-opt ${o.value === curVal ? 'selected' : ''}" data-idx="${i}">
      ${o.icon ? ICON[o.icon]||'' : ''}<span>${escapeHtml(o.text)}</span>
    </div>`).join('');
  document.querySelectorAll('#pickerOpts .picker-opt').forEach(el => {
    el.addEventListener('click', () => {
      const o = _pickerActiveOpts[+el.dataset.idx];
      pickOpt(fieldId, o);
    });
  });
  const overlay = document.getElementById('pickerOverlay');
  overlay.classList.add('open');
  if (trigger) anchorDropdown(overlay.querySelector('.picker-modal'), trigger);
}

function pickOpt(fieldId, o) {
  const reg    = PICKER_REGISTRY[fieldId];
  const hidden = document.getElementById(fieldId);
  const lbl    = reg ? document.getElementById(reg.labelId) : null;
  if (hidden) hidden.value = o.value;
  if (lbl)    lbl.innerHTML = (o.icon ? ICON[o.icon]||'' : '') + ' ' + escapeHtml(o.text);
  if (fieldId === 'txAccount' && typeof updateTxAmountCurrency === 'function') updateTxAmountCurrency();
  if (fieldId === 'txAccount' && typeof renderBudgetCatPicker === 'function') renderBudgetCatPicker();
  if (fieldId === 'txCategory') S.selectedCat = o.value;
  closePicker();
}

function closePicker() {
  document.getElementById('pickerOverlay').classList.remove('open');
  _pickerActiveField = null;
}

/* ══════════════════════════════════════════
   CONFIRM MODAL SYSTEM
══════════════════════════════════════════ */
let _confirmCallback = null;

function showConfirm(title, sub, callback, icon = 'trash') {
  _confirmCallback = callback;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmSub').textContent   = sub;
  document.getElementById('confirmIcon').innerHTML    = ICON[icon] || ICON.trash;
  document.getElementById('confirmOverlay').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open');
  _confirmCallback = null;
}

function executeConfirm() {
  if (_confirmCallback) _confirmCallback();
  closeConfirm();
}

/* ══════════════════════════════════════════
   RIWAYAT DATE PICKER
══════════════════════════════════════════ */
const RIWAYAT_DP = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  rangeStart: null,
  rangeEnd: null,
  selecting: false, // true = waiting for end date
};

const RIWAYAT_FILTER = {
  type: 'all',
  dateFrom: null,
  dateTo: null,
  currency: 'all',
};

function toggleCurrencyFilter() {
  const panel   = document.getElementById('riwayatCurrencyPanel');
  const isOpen  = isDpOpen(panel);
  document.querySelectorAll('.dp-overlay.open .date-picker-panel').forEach(p => closeDp(p));
  if (isOpen) { closeDp(panel); return; }
  renderCurrencyFilterPanel();
  openDp(panel);
}

function renderCurrencyFilterPanel() {
  const panel = document.getElementById('riwayatCurrencyPanel');
  if (!panel) return;
  // Only offer currencies actually in use across the user's wallets
  const codesInUse = [...new Set(WALLETS.map(w => w.currency || 'IDR'))];
  if (!codesInUse.length) codesInUse.push('IDR');
  const opts = ['all', ...codesInUse];
  panel.innerHTML = opts.map(code => {
    const label = code === 'all' ? 'Semua Mata Uang' : currencyLabelText(code);
    const sel   = RIWAYAT_FILTER.currency === code;
    return `<div class="currency-opt ${sel?'selected':''}" onclick="setRiwayatCurrency('${code}')">${escapeHtml(label)}</div>`;
  }).join('');
}

function setRiwayatCurrency(code) {
  RIWAYAT_FILTER.currency = code;
  const lbl = document.getElementById('riwayatCurrencyLabel');
  const trigger = document.getElementById('riwayatCurrencyTrigger');
  if (lbl) lbl.textContent = code === 'all' ? 'Semua' : code;
  if (trigger) trigger.classList.toggle('active', code !== 'all');
  closeDp(document.getElementById('riwayatCurrencyPanel'));
  renderRiwayat();
}

// Locks/unlocks scrolling on the active page while a fixed + backdrop-filter
// overlay panel (date picker / currency filter) is open. Android Chrome/
// WebView can fail to recompute backdrop-filter for a position:fixed layer
// while the content underneath is actively scrolling (mid-gesture, before
// any 'scroll' event handler even gets a chance to run) — the panel then
// renders as a flat, barely-blurred "ghost" instead of properly blurred.
// The only fully reliable fix is to not let the page scroll at all while
// the panel is visible.
let _dpScrollLockPage = null;
function lockDpScroll() {
  const pg = document.querySelector('.page.active');
  if (!pg || _dpScrollLockPage) return;
  _dpScrollLockPage = pg;
  pg.style.overflow = 'hidden';
  pg.style.touchAction = 'none';
}
function unlockDpScroll() {
  if (!_dpScrollLockPage) return;
  _dpScrollLockPage.style.overflow = '';
  _dpScrollLockPage.style.touchAction = '';
  _dpScrollLockPage = null;
}
function anyOverlayPanelOpen() {
  return !!document.querySelector('.dp-overlay.open');
}

// Closes a date-picker/currency panel by closing its centered overlay
// (letting the normal fade/scale-down CSS transition play, same as every
// other modal), then — only after that transition has had time to finish —
// forces the browser to actually drop the overlay's composited layer.
// Without that deferred step, Android Chrome/WebView can leave a stale,
// un-blurred "ghost" frame on screen briefly the next time it opens.
function closeDp(panel) {
  if (!panel) return;
  const overlay = panel.closest('.dp-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => {
    if (overlay.classList.contains('open')) return; // reopened before this fired
    overlay.style.display = 'none';
    void overlay.offsetHeight;
    overlay.style.display = '';
  }, 280);
  if (!anyOverlayPanelOpen()) unlockDpScroll();
}

// Shows a date-picker/currency panel by opening its centered overlay. First
// tears down and rebuilds the overlay's compositing layer (guards against a
// stale layer from an earlier open — same Android backdrop-filter issue as
// closeDp), then forces a second reflow so that "hidden" state actually
// commits as a render frame *before* the 'open' class is added — otherwise
// the browser can collapse both style changes into one and skip the
// fade/scale-in transition entirely, making the panel just snap open.
function openDp(panel) {
  if (!panel) return;
  const overlay = panel.closest('.dp-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  void overlay.offsetHeight; // discard any stale compositing layer
  overlay.style.display = '';
  void overlay.offsetHeight; // commit the pre-open frame so the transition below actually plays
  overlay.classList.add('open');
  const triggerId = overlay.dataset.trigger;
  const trigger = triggerId && document.getElementById(triggerId);
  if (trigger) anchorDropdown(panel, trigger);
  lockDpScroll();
}

function isDpOpen(panel) {
  const overlay = panel && panel.closest('.dp-overlay');
  return !!overlay && overlay.classList.contains('open');
}

function toggleRiwayatDatePicker() {
  const panel   = document.getElementById('riwayatDatePicker');
  const isOpen  = isDpOpen(panel);
  if (isOpen) {
    closeDp(panel);
    return;
  }
  RIWAYAT_DP.year  = new Date().getFullYear();
  RIWAYAT_DP.month = new Date().getMonth();
  renderRiwayatDp();
  openDp(panel);
}

function riwayatDpNav(dir) {
  RIWAYAT_DP.month += dir;
  if (RIWAYAT_DP.month > 11) { RIWAYAT_DP.month = 0; RIWAYAT_DP.year++; }
  if (RIWAYAT_DP.month < 0)  { RIWAYAT_DP.month = 11; RIWAYAT_DP.year--; }
  renderRiwayatDp();
}

function renderRiwayatDp() {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('riwayatDpLabel').textContent = months[RIWAYAT_DP.month] + ' ' + RIWAYAT_DP.year;

  const firstDay = new Date(RIWAYAT_DP.year, RIWAYAT_DP.month, 1).getDay();
  const daysInMonth = new Date(RIWAYAT_DP.year, RIWAYAT_DP.month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().split('T')[0];

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="dp-day dp-blank"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${RIWAYAT_DP.year}-${String(RIWAYAT_DP.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let cls = 'dp-day';
    if (dateStr === todayStr) cls += ' today';
    if (dateStr === RIWAYAT_DP.rangeStart) cls += ' selected';
    html += `<div class="${cls}" onclick="riwayatDpClick('${dateStr}')">${d}</div>`;
  }
  document.getElementById('riwayatDpDays').innerHTML = html;

  // Update range info
  const info = document.getElementById('riwayatDpRangeInfo');
  if (info) info.textContent = RIWAYAT_DP.rangeStart ? fmtDateShort(RIWAYAT_DP.rangeStart) : 'Pilih tanggal';
}

function fmtDateShort(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short' });
}

function riwayatDpClick(dateStr) {
  // Single click = filter that specific day
  RIWAYAT_DP.rangeStart = dateStr;
  RIWAYAT_DP.rangeEnd   = dateStr;
  RIWAYAT_FILTER.dateFrom = dateStr;
  RIWAYAT_FILTER.dateTo   = dateStr;
  const lbl = document.getElementById('riwayatDateLabel');
  if (lbl) lbl.textContent = fmtDateShort(dateStr);
  const trigger = document.getElementById('riwayatDateTrigger');
  if (trigger) trigger.classList.add('active');
  closeDp(document.getElementById('riwayatDatePicker'));
  renderRiwayat();
}

function riwayatDpPreset(preset) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().split('T')[0];
  let from = null, to = null, label = 'Semua';

  if (preset === 'today') {
    from = to = todayStr; label = 'Hari Ini';
  } else if (preset === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 6);
    from = d.toISOString().split('T')[0]; to = todayStr; label = '7 Hari';
  } else if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    from = d.toISOString().split('T')[0]; to = todayStr; label = 'Bulan Ini';
  } else if (preset === 'last3') {
    const d = new Date(today); d.setMonth(d.getMonth() - 3);
    from = d.toISOString().split('T')[0]; to = todayStr; label = '3 Bulan';
  } else {
    from = null; to = null; label = 'Semua';
  }

  RIWAYAT_FILTER.dateFrom = from;
  RIWAYAT_FILTER.dateTo   = to;
  RIWAYAT_DP.rangeStart   = from;
  RIWAYAT_DP.rangeEnd     = to;

  const lbl = document.getElementById('riwayatDateLabel');
  if (lbl) lbl.textContent = label;
  const trigger = document.getElementById('riwayatDateTrigger');
  if (trigger) trigger.classList.toggle('active', preset !== 'all');

  closeDp(document.getElementById('riwayatDatePicker'));
  renderRiwayat();
}

function updateRiwayatDateLabel() {
  const lbl = document.getElementById('riwayatDateLabel');
  const trigger = document.getElementById('riwayatDateTrigger');
  if (!RIWAYAT_FILTER.dateFrom) {
    if (lbl) lbl.textContent = 'Semua';
    if (trigger) trigger.classList.remove('active');
  } else if (RIWAYAT_FILTER.dateFrom === RIWAYAT_FILTER.dateTo) {
    if (lbl) lbl.textContent = fmtDateShort(RIWAYAT_FILTER.dateFrom);
    if (trigger) trigger.classList.add('active');
  } else {
    if (lbl) lbl.textContent = fmtDateShort(RIWAYAT_FILTER.dateFrom) + ' – ' + fmtDateShort(RIWAYAT_FILTER.dateTo);
    if (trigger) trigger.classList.add('active');
  }
}

// Close date/currency pickers when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.date-filter-wrap') && !e.target.closest('.date-picker-panel')) {
    document.querySelectorAll('.dp-overlay.open .date-picker-panel').forEach(p => closeDp(p));
  }
  if (!e.target.closest('.currency-filter-wrap')) {
    document.querySelectorAll('.dp-overlay.open .currency-filter-panel').forEach(p => closeDp(p));
  }
  // Close the notification panel when tapping outside it (and outside the buttons that open it)
  const notifPanel = document.getElementById('notifPanel');
  if (notifPanel && notifPanel.classList.contains('open') && !e.target.closest('.notif-panel') && !e.target.closest('.bell-wrap') && !e.target.closest('#settingsNotifTrigger')) {
    notifPanel.classList.remove('open');
  }
});

function setRiwayatType(type) {
  RIWAYAT_FILTER.type = type;
  ['all','expense','income','transfer'].forEach(t => {
    const el = document.getElementById('rchip-' + t);
    if (el) el.classList.toggle('active', t === type);
  });
  renderRiwayat();
}

/* ══════════════════════════════════════════
   RIWAYAT RENDER
══════════════════════════════════════════ */
function renderRiwayat() {
  const search  = (document.getElementById('riwayatSearch')?.value || '').toLowerCase();
  const type    = RIWAYAT_FILTER.type;
  const from    = RIWAYAT_FILTER.dateFrom;
  const to      = RIWAYAT_FILTER.dateTo;
  const curr    = RIWAYAT_FILTER.currency;

  let txs = [...S.transactions];

  // Type filter
  if (type !== 'all') txs = txs.filter(t => t.type === type);

  // Date filter
  if (from) txs = txs.filter(t => t.date >= from);
  if (to)   txs = txs.filter(t => t.date <= to);

  // Currency filter — based on the wallet each transaction belongs to
  if (curr !== 'all') txs = txs.filter(t => walletCurrencyCode(t.account) === curr);

  // Search filter
  if (search) txs = txs.filter(t =>
    (t.note || '').toLowerCase().includes(search) ||
    (t.cat  || '').toLowerCase().includes(search) ||
    (t.account || '').toLowerCase().includes(search)
  );

  // Sort newest first
  txs.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);

  // Summary
  const sumInc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const sumExp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const net    = sumInc - sumExp;
  document.getElementById('rwSumIncome').textContent  = 'Rp ' + fmtK(sumInc);
  document.getElementById('rwSumExpense').textContent = 'Rp ' + fmtK(sumExp);
  const netEl = document.getElementById('rwSumNet');
  netEl.textContent = (net >= 0 ? '+' : '') + 'Rp ' + fmtK(Math.abs(net));
  netEl.style.color = net >= 0 ? 'var(--teal)' : 'var(--red)';

  const list  = document.getElementById('riwayatList');
  const empty = document.getElementById('riwayatEmpty');

  if (!txs.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Group by date
  const groups = {};
  txs.forEach(t => { if (!groups[t.date]) groups[t.date] = []; groups[t.date].push(t); });

  list.innerHTML = Object.entries(groups).sort((a,b) => b[0].localeCompare(a[0])).map(([date, items]) => `
    <div class="date-chip">${fmtDate(date)}</div>
    ${items.map(t => `
      <div class="tx-item-wrap" id="rwwrap-${t.id}">
        <div class="tx-delete-bg">${ICON.trash}</div>
        <div class="tx-item glass-sm" id="rwitem-${t.id}">
          ${t.receipt ? `<div class="receipt-badge" onclick="event.stopPropagation();openReceiptLightbox('${t.receipt}')" title="Lihat struk"><svg class="ic" viewBox="0 0 24 24"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></svg></div>` : ''}
          <div class="tx-icon" style="background:${t.catColor}22">${ICON[catIcon(t.catId)]||''}</div>
          <div class="tx-info">
            <div class="tx-name">${escapeHtml(t.note)}</div>
            <div class="tx-meta">${escapeHtml(t.cat)} · ${escapeHtml(walletName(t.account))}</div>
          </div>
          <div class="tx-amt ${t.type}">${t.type==='income'?'+':'-'}${currencyInfo(walletCurrencyCode(t.account)).symbol} ${t.amount.toLocaleString(currencyInfo(walletCurrencyCode(t.account)).locale)}</div>
        </div>
      </div>
    `).join('')}
  `).join('');

  // Swipe to delete
  txs.forEach(t => {
    const wrap = document.getElementById('rwwrap-' + t.id);
    const item = document.getElementById('rwitem-' + t.id);
    if (!wrap || !item) return;
    let startX = 0, dx = 0, swiping = false;
    item.addEventListener('touchstart', e => { startX = e.touches[0].clientX; dx = 0; swiping = false; }, {passive:true});
    item.addEventListener('touchmove', e => {
      dx = e.touches[0].clientX - startX;
      if (dx < -10) { swiping = true; wrap.classList.add('swiping'); }
      if (swiping && dx < 0) item.style.transform = `translateX(${Math.max(dx,-80)}px)`;
    }, {passive:true});
    item.addEventListener('touchend', () => {
      if (dx < -60) {
        showConfirm('Hapus transaksi ini?', t.note + ' — Rp ' + t.amount.toLocaleString('id-ID'), () => {
          item.style.transition = 'transform 0.25s, opacity 0.25s';
          item.style.transform  = 'translateX(-100%)';
          item.style.opacity    = '0';
          setTimeout(() => { deleteTx(t.id); renderRiwayat(); }, 250);
        });
        item.style.transform = ''; wrap.classList.remove('swiping');
      } else {
        item.style.transform = ''; wrap.classList.remove('swiping');
      }
      swiping = false;
    });
  });
}


/* ══════════════════════════════════════════
   GLOBAL QUICK-ADD SHORTCUT
   Press "N" from anywhere in the app to jump straight into "Catat
   Transaksi" — no menus, no taps. Ignored while typing in a field or while
   any overlay/panel is already open, and never fires with a modifier key
   held (so it doesn't clash with the browser's own shortcuts).
══════════════════════════════════════════ */
function _qaIsTypingContext() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
function _qaIsOverlayOpen() {
  const auth = document.getElementById('authOverlay');
  if (auth && auth.classList.contains('show')) return true;
  return !!document.querySelector(
    '.modal-overlay.open, .goal-modal-overlay.open, .picker-overlay.open, ' +
    '.dp-overlay.open, .confirm-overlay.open, .receipt-lightbox-overlay.open, .notif-panel.open'
  );
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'n' && e.key !== 'N') return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (_qaIsTypingContext() || _qaIsOverlayOpen()) return;
  e.preventDefault();
  openModal();
});

/* Every dropdown-style popup (option picker, date pickers, currency
   filter) is `position:fixed` and anchored to its trigger via
   anchorDropdown(). That only works reliably if nothing between them and
   <body> ever gets a transform/filter/backdrop-filter/will-change —
   any of those turn an ancestor into the fixed element's containing
   block instead of the viewport (e.g. .topbar picks up backdrop-filter
   once scrolled), which silently breaks the positioning math. Moving
   every .dp-overlay/.picker-overlay to be a direct child of <body> once,
   on load, sidesteps that whole class of bugs for good — nothing in the
   CSS targets them by ancestor, so relocating them is safe.
*/
function relocateDropdownsToBody() {
  document.querySelectorAll('.dp-overlay, .picker-overlay').forEach(el => {
    if (el.parentElement !== document.body) document.body.appendChild(el);
  });
}

window.addEventListener('DOMContentLoaded',()=>{ relocateDropdownsToBody(); setTimeout(init,80); });
