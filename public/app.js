document.addEventListener('DOMContentLoaded', () => {

  let searchTimeout = null;

  // --- Terminal cycle ---
  const cycleEl = document.getElementById('cycle-text');
  if (cycleEl) {
    const scripts = ['nginx', 'docker', 'mysql', 'pterodactyl', 'minecraft?'];
    let idx = 0;
    function typeNext() {
      const target = scripts[idx];
      let pos = 0;
      cycleEl.textContent = '';
      const typeInterval = setInterval(() => {
        if (pos < target.length) {
          pos++;
          cycleEl.textContent = target.slice(0, pos);
        } else {
          clearInterval(typeInterval);
          setTimeout(erase, 3000);
        }
      }, 100);
    }
    function erase() {
      const target = cycleEl.textContent;
      let pos = target.length;
      const eraseInterval = setInterval(() => {
        if (pos > 0) {
          pos--;
          cycleEl.textContent = target.slice(0, pos);
        } else {
          clearInterval(eraseInterval);
          idx = (idx + 1) % scripts.length;
          setTimeout(typeNext, 300);
        }
      }, 50);
    }
    setTimeout(typeNext, 2500);
  }

  // --- Confetti system ---
  function burstConfetti(x, y, colors) {
    const particles = [];
    const count = 24;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 200;
      const size = 4 + Math.random() * 6;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.012 + Math.random() * 0.015,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }

    let frame;
    function animate() {
      let alive = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.vy += 300 * (1 / 60);
        p.x += p.vx * (1 / 60);
        p.y += p.vy * (1 / 60);
        p.life -= p.decay;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size * 0.6, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive) {
        frame = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(frame);
        canvas.remove();
      }
    }
    frame = requestAnimationFrame(animate);
  }

  // --- Radial ring wave ---
  function burstRing(x, y) {
    const count = 2;
    for (let i = 0; i < count; i++) {
      const ring = document.createElement('div');
      ring.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;border-radius:50%;border:2px solid #4FC3F7;pointer-events:none;z-index:9999;transform:translate(-50%,-50%)`;
      document.body.appendChild(ring);
      const size = 40 + i * 20;
      ring.animate([
        { width: '0', height: '0', opacity: 1, borderWidth: '3px' },
        { width: size + 'px', height: size + 'px', opacity: 0, borderWidth: '1px' }
      ], { duration: 500 + i * 100, easing: 'ease-out' }).onfinish = () => ring.remove();
    }
  }

  // --- Ripple effect ---
  document.addEventListener('click', e => {
    const btn = e.target.closest('.filled-button, .tonal-button, .text-button, .segment, .chip[data-distro], .mini-fab, .dropdown-item');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  // --- Copy to clipboard ---
  document.addEventListener('click', e => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const text = btn.dataset.copy;
    if (!text) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    burstConfetti(cx, cy, ['#4285F4','#EA4335','#FBBC05','#34A853']);

    const icon = btn.querySelector('.fa-copy');
    if (icon) icon.className = 'fa-solid fa-check';
    navigator.clipboard.writeText(text).then(() => {
      showSnackbar('Copied!');
      if (icon) setTimeout(() => icon.className = 'fa-solid fa-copy', 1200);
    }).catch(() => {
      showSnackbar('Failed to copy');
      if (icon) setTimeout(() => icon.className = 'fa-solid fa-copy', 1200);
    });
  });

  // --- Snackbar ---
  function showSnackbar(msg) {
    const el = document.getElementById('snackbar');
    if (!el) return;
    el.innerHTML = msg;
    el.classList.add('visible');
    clearTimeout(el._hide);
    el._hide = setTimeout(() => el.classList.remove('visible'), 2000);
  }

  // --- Per-browser token for hearts ---
  let heartToken = localStorage.getItem('heart_token');
  if (!heartToken) {
    heartToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('heart_token', heartToken);
  }

  // --- Heart button ---
  const heartBtn = document.getElementById('heart-btn');
  if (heartBtn) {
    function setHeartIcon(liked) {
      const icon = heartBtn.querySelector('.heart-icon');
      if (!icon) return;
      if (liked) {
        icon.className = 'fa-solid fa-heart heart-icon';
      } else {
        icon.className = 'fa-regular fa-heart heart-icon';
      }
    }

    (async () => {
      try {
        const res = await fetch(`/api/hearts/${heartBtn.dataset.slug}/status`, {
          headers: { 'X-Heart-Token': heartToken }
        });
        const data = await res.json();
        if (data.liked) {
          heartBtn.classList.add('liked');
          setHeartIcon(true);
        }
      } catch (_) {}
    })();

    heartBtn.addEventListener('click', async () => {
      const slug = heartBtn.dataset.slug;
      try {
        const res = await fetch(`/api/hearts/${slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Heart-Token': heartToken },
          body: '{}',
        });
        const data = await res.json();
        const countEl = document.getElementById('heart-count');
        if (countEl) {
          countEl.textContent = data.hearts;
          countEl.classList.remove('bump');
          void countEl.offsetWidth;
          countEl.classList.add('bump');
        }
        if (data.action === 'added') {
          heartBtn.classList.add('liked');
          setHeartIcon(true);
          const rect = heartBtn.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          burstRing(cx, cy);
          const icon = heartBtn.querySelector('.heart-icon');
          if (icon) {
            icon.classList.add('pulse');
            setTimeout(() => icon.classList.remove('pulse'), 300);
          }
        } else if (data.action === 'removed') {
          heartBtn.classList.remove('liked');
          setHeartIcon(false);
        }
      } catch (err) {
        showSnackbar('Error');
      }
    });
  }

  // --- Curl / Wget / PS toggle ---
  const installToggle = document.getElementById('install-toggle');
  const installCmd = document.getElementById('install-cmd');
  const copyBtn = document.getElementById('copy-btn');
  if (installToggle && installCmd) {
    installToggle.addEventListener('click', e => {
      const seg = e.target.closest('.segment');
      if (!seg || seg.classList.contains('active')) return;
      document.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      const tool = seg.dataset.tool;
      const curl = installCmd.dataset.curl;
      const wget = installCmd.dataset.wget;
      const ps1 = installCmd.dataset.ps1;
      let newCmd;
      if (tool === 'curl') newCmd = curl;
      else if (tool === 'wget') newCmd = wget;
      else if (tool === 'ps1') newCmd = ps1;
      if (newCmd) {
        installCmd.textContent = newCmd;
        if (copyBtn) copyBtn.dataset.copy = newCmd;
      }
    });
  }

  // --- Search functionality ---
  const searchInput = document.getElementById('search-input');
  const resultsList = document.getElementById('results-list');
  const emptyState = document.getElementById('empty-state');
  const clearBtn = document.getElementById('clear-btn');
  const clearFiltersBtn = document.getElementById('clear-filters');
  let distroIconMap = {};

  fetch('/api/distros').then(r => r.json()).then(m => distroIconMap = m).catch(() => {});

  function distroIcon(name) {
    return distroIconMap[name] || 'fa-solid fa-terminal';
  }

  function distroChip(distroStr) {
    var parts = distroStr.split(',').filter(Boolean);
    var first = parts[0].trim();
    var icon = distroIcon(first);
    var extra = parts.length > 1 ? ' +' + (parts.length - 1) : '';
    return '<span class="chip"><i class="' + icon + '" style="margin-right:4px"></i> ' + first + extra + '</span>';
  }

  function getSearchParams() {
    const q = document.getElementById('search-input')?.value || '';
    const distro = document.querySelector('.chip[data-distro].active')?.dataset.distro || 'All';
    const sort = document.querySelector('.dropdown-item.active')?.dataset.sort || 'popular';
    return { q, distro, sort };
  }

  function updateUrl() {
    const { q, distro, sort } = getSearchParams();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (distro && distro !== 'All') params.set('distro', distro);
    if (sort && sort !== 'popular') params.set('sort', sort);
    const url = `/search${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', url);
  }

  async function performSearch() {
    const { q, distro, sort } = getSearchParams();
    updateUrl();
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({ q, distro, sort });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();

      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 120 - elapsed);

      setTimeout(() => {
        if (resultsList) {
          if (data.length === 0) {
            resultsList.innerHTML = '';
            if (emptyState) {
              emptyState.style.display = 'flex';
              emptyState.style.animation = 'none';
              void emptyState.offsetWidth;
              emptyState.style.animation = 'fadeUp 0.3s ease-out';
            }
          } else {
            if (emptyState) emptyState.style.display = 'none';
            resultsList.innerHTML = data.map((s, i) => `
              <a href="/script/${s.slug}" class="list-item result-enter" style="--i:${i}; animation-delay:${i * 0.04}s">
                <span class="list-leading">
                  <span class="avatar">${s.name.charAt(0).toUpperCase()}</span>
                </span>
                <span class="list-content">
                  <span class="list-title">${escHtml(s.name)}</span>
                  <span class="list-supporting">${escHtml(s.description)}</span>
                </span>
                  <span class="list-trailing">
                    ${distroChip(s.distro)}
                  <span class="list-meta">
                    <span class="stat"><i class="fa-solid fa-heart"></i>${s.hearts}</span>
                    <span class="stat"><i class="fa-solid fa-download"></i>${s.downloads}</span>
                  </span>
                </span>
              </a>
            `).join('');
          }
        }
      }, delay);
    } catch (err) {
      showSnackbar('Search failed');
    }
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(performSearch, 300);
    });
    performSearch();
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      performSearch();
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('.chip[data-distro]').forEach(c => c.classList.toggle('active', c.dataset.distro === 'All'));
      document.querySelectorAll('.dropdown-item').forEach(i => i.classList.toggle('active', i.dataset.sort === 'popular'));
      document.getElementById('sort-label').textContent = 'Most popular';
      performSearch();
    });
  }

  // --- Distro chips ---
  document.querySelectorAll('.chip[data-distro]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-distro]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      performSearch();
    });
  });

  // --- Sort dropdown ---
  const sortDropdown = document.getElementById('sort-dropdown');
  if (sortDropdown) {
    sortDropdown.querySelector('.dropdown-trigger')?.addEventListener('click', e => {
      e.stopPropagation();
      sortDropdown.classList.toggle('open');
    });

    sortDropdown.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        sortDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('sort-label').textContent = item.textContent;
        sortDropdown.classList.remove('open');
        performSearch();
      });
    });

    document.addEventListener('click', () => sortDropdown.classList.remove('open'));
  }

});
