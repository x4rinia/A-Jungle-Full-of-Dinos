// ==========================================================================
// A Jungle Full of Dinos 🦕 - Game Engine (v5)
// 22 Dino Targets + Magnifying Glass Cooldown Timer
// ==========================================================================

class DinoGame {
  constructor() {
    this.container = document.getElementById('game-container');
    this.viewport = document.getElementById('world-viewport');
    this.svg = document.getElementById('game-svg');

    // Pan & Zoom
    this.scale = 1;
    this.minScale = 0.65;
    this.maxScale = 3.2;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.isDragging = false;

    // Counters (22 hand-drawn Sauropod Dinos)
    this.totalDinos = 22;
    this.remainingDinos = 22;
    this.foundDinos = new Set();

    // Hint Cooldown State
    this.hintCooldown = false;
    this.cooldownSeconds = 5;
    this.cooldownTimer = null;

    // Elements
    this.counterEl = document.getElementById('dino-count');
    this.hintBtn = document.getElementById('hint-btn');
    this.cooldownTextEl = document.getElementById('hint-cooldown-text');
    this.victoryModal = document.getElementById('victory-modal');
    this.confettiCanvas = document.getElementById('confetti-canvas');
    this.toastEl = document.getElementById('toast-msg');

    this.confettiActive = false;
    this.confettiParticles = [];

    this.init();
  }

  init() {
    this.fitInitialView();
    this.setupPanZoom();
    this.bindDinos();
    this.bindUI();
    this.loadSavedProgress();
    this.updateCounters();

    window.addEventListener('resize', () => this.handleResize());
  }

  fitInitialView() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    const sw = 1376;
    const sh = 768;

    const scaleX = cw / sw;
    const scaleY = ch / sh;
    this.scale = Math.max(scaleX, scaleY);
    this.minScale = Math.min(scaleX, scaleY) * 0.85;

    this.panX = (cw - sw * this.scale) / 2;
    this.panY = (ch - sh * this.scale) / 2;

    this.applyTransform();
  }

  handleResize() {
    this.applyTransform();
  }

  applyTransform(smooth = false) {
    if (smooth) {
      this.viewport.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => {
        this.viewport.style.transition = 'none';
      }, 450);
    } else {
      this.viewport.style.transition = 'none';
    }
    this.viewport.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  setupPanZoom() {
    let dragStartX = 0;
    let dragStartY = 0;

    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.dino-target, .hud-top-left, .hud-top-right, .zoom-controls, .hud-btn')) {
        return;
      }

      this.isPanning = true;
      this.isDragging = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      this.container.classList.add('panning');
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      if (Math.hypot(dx, dy) > 5) {
        this.isDragging = true;
        this.panX = e.clientX - this.startX;
        this.panY = e.clientY - this.startY;
        this.applyTransform();
      }
    });

    const endPan = () => {
      if (!this.isPanning) return;
      this.isPanning = false;
      this.container.classList.remove('panning');
      setTimeout(() => {
        this.isDragging = false;
      }, 50);
    };

    window.addEventListener('mouseup', endPan);

    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      this.zoomAtPoint(e.clientX, e.clientY, zoomFactor);
    }, { passive: false });
  }

  zoomAtPoint(clientX, clientY, factor) {
    const oldScale = this.scale;
    const newScale = Math.min(Math.max(this.minScale, oldScale * factor), this.maxScale);
    if (newScale === oldScale) return;

    const mouseX = clientX - this.panX;
    const mouseY = clientY - this.panY;

    this.panX = clientX - mouseX * (newScale / oldScale);
    this.panY = clientY - mouseY * (newScale / oldScale);
    this.scale = newScale;

    this.applyTransform();
  }

  focusOnCoordinate(svgX, svgY, targetZoom = 1.85) {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;

    this.scale = targetZoom;
    this.panX = cw / 2 - svgX * this.scale;
    this.panY = ch / 2 - svgY * this.scale;

    this.applyTransform(true);
  }

  bindDinos() {
    const dinos = document.querySelectorAll('.dino-target');

    dinos.forEach(dino => {
      dino.addEventListener('click', (e) => {
        if (this.isDragging) return;
        e.stopPropagation();
        e.preventDefault();

        const dinoId = dino.getAttribute('data-dino-id');
        this.discoverDino(dino, dinoId, e);
      });
    });
  }

  discoverDino(dino, dinoId, event) {
    if (this.foundDinos.has(dinoId)) return;

    this.foundDinos.add(dinoId);
    dino.classList.add('discovered');

    this.remainingDinos = Math.max(0, this.remainingDinos - 1);

    const pitch = 0.82 + (this.totalDinos - this.remainingDinos) * 0.035;
    window.jungleAudio.playDinoPop(pitch);

    const clientX = event ? (event.clientX || window.innerWidth / 2) : window.innerWidth / 2;
    const clientY = event ? (event.clientY || window.innerHeight / 2) : window.innerHeight / 2;
    this.spawnParticle(clientX, clientY, '🦕');

    this.updateCounters();
    this.saveProgress();

    if (this.remainingDinos === 0) {
      setTimeout(() => this.triggerVictory(), 700);
    }
  }

  bindUI() {
    // Hint Button with Cooldown
    this.hintBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.useHint();
    });

    // Reset
    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Möchtest du das Spiel neu starten?')) {
        this.resetGame();
      }
    });

    // Audio Toggle
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.addEventListener('click', () => {
      const isMuted = window.jungleAudio.toggleMute();
      muteBtn.textContent = isMuted ? '🔇' : '🔊';
      this.showToast(isMuted ? 'Ton ausgeschaltet' : 'Ton eingeschaltet');
    });

    // Zoom buttons
    document.getElementById('zoom-in-btn').addEventListener('click', () => {
      this.zoomAtPoint(window.innerWidth / 2, window.innerHeight / 2, 1.25);
    });

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
      this.zoomAtPoint(window.innerWidth / 2, window.innerHeight / 2, 0.8);
    });

    document.getElementById('zoom-reset-btn').addEventListener('click', () => {
      this.fitInitialView();
    });

    // Victory play again
    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.victoryModal.classList.remove('active');
      this.stopConfetti();
      this.resetGame();
    });
  }

  useHint() {
    if (this.hintCooldown) {
      this.showToast('⏳ Die Lupe lädt sich noch auf!');
      return;
    }

    const unfound = Array.from(document.querySelectorAll('.dino-target'))
      .filter(node => !this.foundDinos.has(node.getAttribute('data-dino-id')));

    if (unfound.length === 0) {
      this.showToast('🎉 Du hast bereits alle Dinos gefunden!');
      return;
    }

    // Play Hint Sound
    window.jungleAudio.playHintSound();

    // Start Cooldown (5 seconds)
    this.startHintCooldown(5);

    const target = unfound[Math.floor(Math.random() * unfound.length)];
    const targetX = parseFloat(target.getAttribute('data-x'));
    const targetY = parseFloat(target.getAttribute('data-y'));

    this.focusOnCoordinate(targetX, targetY, 1.85);
    this.showToast('🔍 Hier versteckt sich ein Dino!');

    setTimeout(() => {
      this.createRadarPing(targetX, targetY);
    }, 450);
  }

  startHintCooldown(seconds = 5) {
    this.hintCooldown = true;
    this.hintBtn.classList.add('on-cooldown');
    let remaining = seconds;
    this.cooldownTextEl.textContent = `${remaining}s`;

    clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(this.cooldownTimer);
        this.hintCooldown = false;
        this.hintBtn.classList.remove('on-cooldown');
      } else {
        this.cooldownTextEl.textContent = `${remaining}s`;
      }
    }, 1000);
  }

  createRadarPing(svgX, svgY) {
    const radar = document.createElement('div');
    radar.className = 'hint-radar';

    const screenX = this.panX + svgX * this.scale;
    const screenY = this.panY + svgY * this.scale;

    radar.style.left = `${screenX}px`;
    radar.style.top = `${screenY}px`;

    this.container.appendChild(radar);

    setTimeout(() => {
      radar.remove();
    }, 1800);
  }

  spawnParticle(x, y, char = '✨') {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = char;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    document.body.appendChild(p);

    setTimeout(() => p.remove(), 900);
  }

  showToast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 2400);
  }

  updateCounters() {
    this.counterEl.textContent = this.remainingDinos;

    const badge = document.querySelector('.counter-badge');
    badge.style.transform = 'scale(1.08)';
    setTimeout(() => badge.style.transform = 'scale(1)', 150);
  }

  triggerVictory() {
    window.jungleAudio.playVictory();
    this.victoryModal.classList.add('active');
    this.startConfetti();
  }

  startConfetti() {
    const canvas = this.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#22c55e', '#16a34a', '#4ade80', '#fbbf24', '#f97316', '#38bdf8'];
    this.confettiParticles = [];

    for (let i = 0; i < 150; i++) {
      this.confettiParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height * 0.5,
        w: Math.random() * 12 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        velX: (Math.random() - 0.5) * 4,
        velY: Math.random() * 4 + 3,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8
      });
    }

    this.confettiActive = true;

    const render = () => {
      if (!this.confettiActive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      this.confettiParticles.forEach(p => {
        p.x += p.velX;
        p.y += p.velY;
        p.rot += p.rotSpeed;

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      requestAnimationFrame(render);
    };

    render();
  }

  stopConfetti() {
    this.confettiActive = false;
    const ctx = this.confettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
  }

  saveProgress() {
    try {
      localStorage.setItem('dino_v9_save', JSON.stringify(Array.from(this.foundDinos)));
    } catch (e) {}
  }

  loadSavedProgress() {
    try {
      const saved = localStorage.getItem('dino_v9_save');
      if (!saved) return;
      const ids = JSON.parse(saved);

      ids.forEach(id => {
        const node = document.querySelector(`[data-dino-id="${id}"]`);
        if (node) {
          this.foundDinos.add(id);
          node.classList.add('discovered');
          this.remainingDinos = Math.max(0, this.remainingDinos - 1);
        }
      });
    } catch (e) {}
  }

  resetGame() {
    try {
      localStorage.removeItem('dino_v9_save');
    } catch (e) {}

    this.foundDinos.clear();
    this.remainingDinos = this.totalDinos;

    document.querySelectorAll('.dino-target').forEach(node => {
      node.classList.remove('discovered');
    });

    this.updateCounters();
    this.fitInitialView();
    this.showToast('🌿 Alle Dinos wurden wieder im Zimmer versteckt!');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new DinoGame();
});
