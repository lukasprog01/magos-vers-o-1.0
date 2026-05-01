// =============================================
// MAGOS - Core Utilities & App State (API V2)
// js/app.js
// =============================================

const MagosApp = {
  version: '2.0.0',
  apiUrl: 'api.php',

  // BADGE DEFINITIONS (usadas no painel)
  BADGE_DEFS: {
    first_answer:  { icon: '👣', name: 'Primeiro Passo', desc: 'Respondeu a primeira charada' },
    ten_answers:   { icon: '🪄', name: 'Decifrador',     desc: 'Respondeu 10 charadas' },
    ten_created:   { icon: '📜', name: 'Criador',        desc: 'Criou 10 charadas' },
    week_streak:   { icon: '🔥', name: 'Sete Dias',      desc: 'Jogou 7 dias seguidos' },
    level_5:       { icon: '⚡', name: 'Ascensão',       desc: 'Chegou ao nível 5' }
  },
  currentUser: null,

  init() {
    this.loadSession();
    this.initParticles();
    this.initScrollEffects();
    this.initToastContainer();
  },

  // ---- HELPER DE REQUISIÇÕES (API) ----
  async apiCall(action, data = null) {
    try {
      let url = `${this.apiUrl}?action=${action}`;
      let options = { method: 'GET' };

      if (data) {
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...data })
        };
      }

      const res = await fetch(url, options);
      const json = await res.json();
      return json;
    } catch (e) {
      console.error(`Erro na API (${action}):`, e);
      return { success: false, error: 'Erro de comunicação com o servidor.' };
    }
  },

  // ---- SESSION ----
  loadSession() {
    try {
      const sess = localStorage.getItem('magos_session');
      if (sess) {
        this.currentUser = JSON.parse(sess).user;
      }
    } catch(e) {}
  },

  saveSession(user) {
    localStorage.setItem('magos_session', JSON.stringify({ user, at: Date.now() }));
    this.currentUser = user;
  },

  clearSession() {
    localStorage.removeItem('magos_session');
    this.currentUser = null;
  },

  isLoggedIn() { return !!this.currentUser; },
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  // ---- AUTH ----
  async login(email, password) {
    const res = await this.apiCall('login', { email, password });
    if (res.success && res.user) {
      this.saveSession(res.user);
    }
    return res;
  },

  async register(data) {
    const res = await this.apiCall('register', data);
    if (res.success && res.user) {
      this.saveSession(res.user);
    }
    return res;
  },

  logout() {
    this.clearSession();
    window.location.href = 'login.html';
  },

  // ---- RIDDLES ----
  async createRiddle(data) {
    const payload = {
      authorId: this.currentUser.id,
      question: data.question,
      answer: data.answer,
      hint: data.hint || '',
      category: data.category || 'geral',
      difficulty: parseInt(data.difficulty) || 2,
      tags: data.tags
    };
    return await this.apiCall('createRiddle', payload);
  },

  async getRiddle(id) {
    return await this.apiCall(`getRiddle&id=${id}`);
  },

  async getMyRiddles() {
    if (!this.currentUser) return [];
    const res = await this.apiCall(`getMyRiddles&userId=${this.currentUser.id}`);
    return res.success ? res.data : [];
  },

  async getPublicRiddles(filters = {}) {
    let query = 'getPublicRiddles';
    if (filters.category) query += `&category=${encodeURIComponent(filters.category)}`;
    if (filters.search) query += `&search=${encodeURIComponent(filters.search)}`;
    const res = await this.apiCall(query);
    return res.success ? res.data : [];
  },

  async hasAnswered(riddleId) {
    if (!this.currentUser) return false;
    const res = await this.apiCall(`hasAnswered&userId=${this.currentUser.id}&riddleId=${riddleId}`);
    return res.success ? res.answered : false;
  },

  async answerRiddle(riddleId, attempt) {
    if (!this.currentUser) return { success: false, error: 'Faça login para responder.' };
    return await this.apiCall('answerRiddle', {
      userId: this.currentUser.id,
      riddleId,
      attempt
    });
  },

  // ---- LEADERBOARD ----
  async getLeaderboard() {
    const res = await this.apiCall('getLeaderboard');
    return res.success ? res.data : [];
  },

  // ---- LEVEL HELPERS (FRONTEND) ----
  getLevelTitle(level) {
    const titles = [
      'Aprendiz', 'Novato', 'Iniciado', 'Explorador', 'Aventureiro',
      'Enigmista', 'Decifrador', 'Feiticeiro', 'Arquimago', 'Sábio',
      'Lendário', 'Mítico', 'Oráculo', 'Transcendente', 'Mago Supremo'
    ];
    return titles[Math.min(level - 1, titles.length - 1)] || 'Mago Supremo';
  },

  getLevelEmoji(level) {
    if (level <= 3) return '⭐';
    if (level <= 6) return '🌟';
    if (level <= 9) return '💫';
    if (level <= 12) return '✨';
    return '🌠';
  },

  // ---- QR CODE ----
  getRiddleURL(riddleId) {
    return `${location.origin}${location.pathname.replace(/\/[^/]*$/, '')}/charada.html?id=${riddleId}`;
  },

  generateQRDataURL(text, size = 200) {
    const qrObj = window.QRCode || window.qrcode;
    if (!qrObj) return Promise.resolve(null);
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      qrObj.toCanvas(canvas, text, { width: size, margin: 2, color: { dark: '#1a0533', light: '#ffffff' } }, (err) => {
        if (err) { resolve(null); return; }
        resolve(canvas.toDataURL('image/png'));
      });
    });
  },

  // ---- WHATSAPP SHARE ----
  shareOnWhatsApp(riddleId, question) {
    const url = this.getRiddleURL(riddleId);
    const text = `🧙‍♂️ *MAGOS - Charada Mágica* ✨\n\n"${question}"\n\n🔗 Tente resolver: ${url}\n\n_Ganhe pontos e suba no ranking!_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  },

  // ---- PARTICLES ----
  initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let W, H;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const COLORS = ['rgba(179,71,255,', 'rgba(255,215,0,', 'rgba(0,229,255,', 'rgba(124,58,237,'];
    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * W; this.y = Math.random() * H;
        this.r = Math.random() * 1.8 + 0.4;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.alpha = Math.random() * 0.5 + 0.1;
        this.vx = (Math.random() - 0.5) * 0.3; this.vy = -(Math.random() * 0.5 + 0.1);
        this.life = 1; this.decay = Math.random() * 0.003 + 0.001;
      }
      draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color + this.alpha * this.life + ')'; ctx.fill();
      }
      update() {
        this.x += this.vx; this.y += this.vy; this.life -= this.decay;
        if (this.life <= 0) this.reset();
      }
    }
    for (let i = 0; i < 80; i++) particles.push(new Particle());
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(loop);
    };
    loop();
  },

  // ---- SCROLL EFFECTS ----
  initScrollEffects() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      window.addEventListener('scroll', () => { navbar.classList.toggle('scrolled', window.scrollY > 20); });
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          e.target.style.animationPlayState = 'running';
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.style.animationPlayState = 'paused'; observer.observe(el);
    });
  },

  // ---- TOAST ----
  initToastContainer() {
    if (!document.getElementById('toast-container')) {
      const div = document.createElement('div');
      div.id = 'toast-container'; div.className = 'toast-container';
      document.body.appendChild(div);
    }
  },
  toast(msg, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️', magic: '✨' };
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing'); setTimeout(() => el.remove(), 300);
    }, duration);
  },

  // ---- FORMAT HELPERS ----
  difficultyLabel(d) { return ['', '⭐ Fácil', '⭐⭐ Médio', '⭐⭐⭐ Difícil', '⭐⭐⭐⭐ Expert', '⭐⭐⭐⭐⭐ Lendário'][d] || 'Médio'; },
  difficultyColor(d) { return ['', '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa'][d] || '#60a5fa'; },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    } catch(e) { return dateStr; }
  },

  countdown(deadlineStr, el) {
    function tick() {
      const diff = new Date(deadlineStr) - Date.now();
      if (diff <= 0) { el.textContent = 'Encerrado!'; return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
      setTimeout(tick, 1000);
    }
    tick();
  }
};

document.addEventListener('DOMContentLoaded', () => MagosApp.init());
