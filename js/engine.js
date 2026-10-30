/* ============================================================
   三小时 · 游戏引擎
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SPEEDS = { slow: 24, mid: 50, fast: 95, instant: 1e9 };
  const DEFAULT_SETTINGS = { speed: 'mid', vol: 55, fx: 'on', auto: 'off' };
  const MAX_STAT = 10;

  /* ================= 存档工具 ================= */
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
      catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* file:// 下可能不可用 */ }
    },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  let settings = Object.assign({}, DEFAULT_SETTINGS, store.get('sh_settings', {}));
  let gallery = store.get('sh_gallery', {});
  ['A', 'B', 'C'].forEach((k) => {
    gallery[k] = Object.assign({ good: false, bad: false }, gallery[k] || {});
  });

  /* ================= 全局状态 ================= */
  let state = { chi: 0, qian: 0, time: 180, flags: {} };
  let idx = 0;
  let currentNode = null;
  let currentScene = null;
  let chapterNow = null;
  let playing = false;
  let log = [];

  let typing = false, fullText = '', shownChars = 0, typeAcc = 0, typeLast = 0, typeRaf = 0;
  let dialogueReady = false;
  let autoTimer = 0;
  let cardResolve = null, cardTimer = 0;
  let clockRaf = 0, clockFrom = 180, clockTo = 180;

  const IDX = {};
  STORY.forEach((n, i) => { if (n.id) IDX[n.id] = i; });

  const MOOD_MAP = {
    corridor: 'dread', street: 'dread', truck: 'warm', cafeteria: 'warm',
    riot: 'fight', rooftop: 'silver', zero: 'silver', burger: 'warm',
    parley: 'silver', fight: 'fight', silver: 'ending', blank: 'dread'
  };

  /* ================= 场景层 ================= */
  function setScene(name, force) {
    if (!name) return;
    if (name === currentScene && !force) return;
    currentScene = name;
    const layer = $('sceneLayer');
    const meta = ART.meta(name);
    $('lightLayer').style.background =
      `radial-gradient(120% 80% at 50% 22%, ${meta.tint}, transparent 62%)`;
    if (AUDIO.ready) AUDIO.mood(MOOD_MAP[name] || 'dread');
    layer.classList.remove('in');
    const token = (setScene._t = (setScene._t || 0) + 1);
    setTimeout(() => {
      if (token !== setScene._t) return;
      const html = ART.render(name);
      layer.innerHTML = html;
      const bg = $('sceneBg');
      if (bg && window.innerHeight > window.innerWidth) bg.innerHTML = html;
      void layer.offsetWidth;
      layer.classList.add('in');
    }, 380);
    FX.setMeta(meta);
  }

  /* ================= HUD ================= */
  function fmtTime(min) {
    const m = Math.max(0, Math.round(min));
    const hh = Math.floor(m / 60), mm = m % 60;
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':00';
  }
  function setClock(min, animate) {
    clockFrom = clockTo;
    clockTo = Math.max(0, min);
    $('clockValue').classList.toggle('warn', clockTo < 60);
    $('clockValue').classList.toggle('crit', clockTo < 20);
    if (!animate || settings.fx === 'off') {
      $('clockValue').textContent = fmtTime(clockTo);
      return;
    }
    cancelAnimationFrame(clockRaf);
    const t0 = performance.now(), dur = 1100;
    const el = $('clockValue');
    function step(t) {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmtTime(clockFrom + (clockTo - clockFrom) * e);
      if (k < 1) clockRaf = requestAnimationFrame(step);
      else el.textContent = fmtTime(clockTo);
    }
    clockRaf = requestAnimationFrame(step);
  }
  function updateStats() {
    $('barChi').style.width = Math.min(100, state.chi / MAX_STAT * 100) + '%';
    $('barQian').style.width = Math.min(100, state.qian / MAX_STAT * 100) + '%';
  }
  function updateHUD() {
    $('chapterTag').textContent = chapterNow || '序章';
    updateStats();
  }

  /* ================= 打字机 ================= */
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function balance(s) {
    if (((s.match(/\*\*/g) || []).length) % 2) s += '**';
    if (((s.match(/__/g) || []).length) % 2) s += '__';
    return s;
  }
  function buildHtml(raw, caret) {
    let s = esc(balance(raw));
    s = s.replace(/\*\*([\s\S]+?)\*\*/g, '<em class="em">$1</em>');
    s = s.replace(/__([\s\S]+?)__/g, '<span class="silver">$1</span>');
    let html = s.split('\n').map(p => '<p>' + (p || '<br>') + '</p>').join('');
    if (caret) html = html.replace(/<\/p>$/, '<span class="cur"></span></p>');
    return html;
  }
  function typeText(text) {
    fullText = text;
    shownChars = 0;
    typing = true;
    dialogueReady = false;
    $('text').innerHTML = '<p><span class="cur"></span></p>';
    $('nextHint').classList.remove('on');
    const cps = SPEEDS[settings.speed] || SPEEDS.mid;
    if (cps > 5000) { finishTyping(); return; }
    typeLast = performance.now(); typeAcc = 0;
    cancelAnimationFrame(typeRaf);
    function loop(t) {
      if (!typing) return;
      const dt = t - typeLast; typeLast = t;
      typeAcc += dt * cps / 1000;
      const n = Math.floor(typeAcc);
      if (n > 0) {
        typeAcc -= n;
        shownChars = Math.min(fullText.length, shownChars + n);
        $('text').innerHTML = buildHtml(fullText.slice(0, shownChars), shownChars < fullText.length);
        if (shownChars >= fullText.length) { finishTyping(); return; }
      }
      typeRaf = requestAnimationFrame(loop);
    }
    typeRaf = requestAnimationFrame(loop);
  }
  function finishTyping() {
    typing = false;
    cancelAnimationFrame(typeRaf);
    $('text').innerHTML = buildHtml(fullText);
    dialogueReady = true;
    $('nextHint').classList.toggle('on', !(currentNode && currentNode.choices));
    if (currentNode && currentNode.choices) showChoices(currentNode.choices);
    else if (settings.auto === 'on') {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => { if (dialogueReady && !typing) advance(); }, 2100);
    }
  }

  /* ================= 选项 ================= */
  function showChoices(list) {
    const box = $('choices');
    box.innerHTML = '';
    list.forEach((c, i) => {
      if (c.if && !c.if(stateObj())) return;
      const b = document.createElement('button');
      b.className = 'choice';
      const tag = c.tag || c.sub;
      b.innerHTML =
        '<span class="num">' + (i + 1) + '</span>' +
        '<span class="label">' + esc(c.label) + '</span>' +
        (tag ? '<span class="tag">' + esc(tag) + '</span>' : '') +
        (c.cost ? '<span class="cost">−' + c.cost + ' 分钟</span>' : '');
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        pickChoice(c);
      });
      box.appendChild(b);
    });
    requestAnimationFrame(() => box.classList.add('on'));
    $('nextHint').classList.remove('on');
  }
  function hideChoices() {
    const box = $('choices');
    box.classList.remove('on');
    box.innerHTML = '';
  }
  function pickChoice(c) {
    if (!c) return;
    hideChoices();
    AUDIO.sfx('click');
    if (c.cost) state.time -= c.cost;
    if (c.stat) { state.chi += (c.stat.chi || 0); state.qian += (c.stat.qian || 0); }
    if (c.set) Object.assign(state.flags, c.set);
    log.push({ who: '选择', text: c.label, choice: true });
    setClock(state.time, true);
    updateStats();
    dialogueReady = false;
    go(c.to);
  }
  function chooseByIndex(i) {
    if (!currentNode || !currentNode.choices) return;
    const btns = $('choices').querySelectorAll('.choice');
    if (btns[i]) btns[i].click();
  }

  /* ================= 章节卡 ================= */
  function showChapterCard(title, sub) {
    return new Promise((resolve) => {
      const card = $('chapterCard');
      card.querySelector('.chapter-num').textContent = '';
      card.querySelector('.chapter-title').textContent = title.replace(/^.*?·\s*/, '');
      card.querySelector('.chapter-sub').textContent = sub || '';
      const numTxt = (title.match(/^(序章|第.+?章)/) || [''])[0]
        .replace('序章', 'P R O L O G U E')
        .replace(/第(.+?)章/, (m, c) => 'C H A P T E R  ' + ({ '一': 'I', '二': 'II', '三': 'III', '四': 'IV' }[c] || c));
      card.querySelector('.chapter-num').textContent = numTxt;
      card.classList.add('show');
      AUDIO.sfx('chapter');
      cardResolve = () => {
        clearTimeout(cardTimer);
        cardResolve = null;
        card.classList.remove('show');
        setTimeout(resolve, 320);
      };
      cardTimer = setTimeout(() => { if (cardResolve) cardResolve(); }, 2600);
    });
  }

  /* ================= 节点 ================= */
  function stateObj() { return { chi: state.chi, qian: state.qian, time: state.time, flags: state.flags }; }

  function applyEffects(node) {
    if (node.time != null) { state.time = node.time; setClock(state.time, false); }
    if (node.cost) { state.time -= node.cost; setClock(state.time, true); }
    if (node.stat) { state.chi += (node.stat.chi || 0); state.qian += (node.stat.qian || 0); }
    if (node.set) Object.assign(state.flags, node.set);
    updateStats();
    if (node.fx) {
      if (node.fx.shake && settings.fx === 'on') {
        document.body.classList.remove('shake');
        void document.body.offsetWidth;
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 560);
      }
      if (node.fx.flash && settings.fx === 'on') {
        const f = $('flash');
        f.classList.remove('on');
        void f.offsetWidth;
        f.classList.add('on');
      }
    }
    if (node.sfx) AUDIO.sfx(node.sfx);
  }

  function go(target, opts) {
    opts = opts || {};
    let i = (typeof target === 'string') ? IDX[target] : target;
    if (i == null || i < 0) return;
    let guard = 0;
    while (STORY[i] && STORY[i].if && !STORY[i].if(stateObj()) && guard++ < 500) i++;
    if (!STORY[i]) return;
    idx = i;
    showNode(STORY[i], opts);
  }

  function showNode(node, opts) {
    currentNode = node;
    clearTimeout(autoTimer);
    if (!opts.skipEffects) applyEffects(node);
    if (node.scene) setScene(node.scene);
    updateHUD();
    saveGame();
    if (node.ending) {
      blackout(900, () => finishEnding(node.ending));
      return;
    }
    const doText = () => {
      $('dialogueWrap').classList.add('on');
      renderText(node);
    };
    if (node.chapter && node.chapter !== chapterNow) {
      chapterNow = node.chapter;
      updateHUD();
      showChapterCard(node.chapter, node.chapterSub).then(doText);
    } else {
      doText();
    }
  }

  function renderText(node) {
    hideChoices();
    const np = $('nameplate');
    if (node.who) {
      $('speaker').textContent = node.who;
      np.className = 'on ' + (node.tone === 'silver' ? 'silver' : node.tone === 'red' ? 'red' : '');
    } else {
      np.className = '';
      $('speaker').textContent = '';
    }
    $('text').classList.toggle('thought', !node.who);
    log.push({ who: node.who || '', text: node.text });
    typeText(node.text);
  }

  /* ================= 推进 ================= */
  function advance() {
    if (!playing) return;
    if (cardResolve) { cardResolve(); return; }
    if (typing) { finishTyping(); return; }
    if (!currentNode) return;
    if (currentNode.choices) return;
    if (!dialogueReady) return;
    AUDIO.sfx('blip');
    const t = currentNode.to != null ? currentNode.to : idx + 1;
    go(t);
  }

  /* ================= 黑场 ================= */
  function blackout(ms, cb) {
    const el = $('fadeBlack');
    el.classList.add('on');
    setTimeout(() => { cb && cb(); }, ms);
  }
  function fadeIn() {
    $('fadeBlack').classList.remove('on');
  }

  /* ================= 结局 ================= */
  const CHECKS = {
    A: (s) => s.chi >= 6,
    B: (s) => s.chi >= 4 && s.qian >= 4,
    C: (s) => s.qian >= 6
  };

  function finishEnding(key) {
    playing = false;
    $('dialogueWrap').classList.remove('on');
    $('hud').classList.remove('on');
    const good = !!CHECKS[key](stateObj());
    gallery[key][good ? 'good' : 'bad'] = true;
    store.set('sh_gallery', gallery);
    store.del('sh_save');
    AUDIO.mood('ending');
    AUDIO.sfx('ending');

    const E = ENDINGS[key];
    const bgKey = { A: 'silver', B: 'parley', C: 'fight' }[key] || 'silver';
    const bg = $('endingBg');
    if (bg) bg.innerHTML = ART.render(bgKey);
    $('endingScreen').querySelector('.ending-no').textContent = E.no;
    $('endingScreen').querySelector('.ending-title').textContent = E.title;
    $('endingScreen').querySelector('.ending-quote').textContent = E.quote;
    const stats = $('endingScreen').querySelector('.ending-stats');
    stats.innerHTML =
      '<span>路线 <b>' + E.sub + '</b></span>' +
      '<span>执念 <b>' + state.chi + '</b></span>' +
      '<span>牵挂 <b>' + state.qian + '</b></span>' +
      '<span>剩余 <b>' + Math.max(0, Math.round(state.time)) + '</b> 分钟</span>' +
      '<span class="badge">' + (good ? '完整结局' : '残缺结局') + '</span>';
    $('endingScreen').classList.add('show');
  }

  /* ================= 存档 ================= */
  function saveGame() {
    store.set('sh_save', {
      v: 1, idx: idx, chi: state.chi, qian: state.qian, time: state.time,
      flags: state.flags, chapter: chapterNow, scene: currentScene, log: log.slice(-200)
    });
    refreshContinue();
  }
  function refreshContinue() {
    const s = store.get('sh_save', null);
    $('btnContinue').disabled = !s;
  }
  function loadGame() {
    const s = store.get('sh_save', null);
    if (!s) return false;
    state = { chi: s.chi || 0, qian: s.qian || 0, time: s.time != null ? s.time : 180, flags: s.flags || {} };
    chapterNow = s.chapter || null;
    currentScene = null;
    log = s.log || [];
    playing = true;
    if (s.scene) setScene(s.scene, true);
    setClock(state.time, false);
    updateHUD();
    $('dialogueWrap').classList.add('on');
    go(s.idx, { skipEffects: true });
    return true;
  }

  /* ================= 回顾 ================= */
  function renderLog() {
    const box = $('logBody');
    box.innerHTML = log.map((l) => {
      if (l.choice) return '<div class="log-item"><div class="who">选择</div><div class="what" style="color:#ffcf9a">▸ ' + esc(l.text) + '</div></div>';
      return '<div class="log-item' + (l.who ? '' : ' narr') + '"><div class="who">' +
        (l.who || '——') + '</div><div class="what">' + esc(l.text).replace(/\n/g, '<br>') + '</div></div>';
    }).join('') || '<div class="log-item narr"><div class="what">还没有回顾的内容。</div></div>';
    box.parentElement.scrollTop = 0;
  }

  /* ================= 图鉴 ================= */
  function renderGallery() {
    const box = $('galleryBody');
    let total = 0, got = 0;
    box.innerHTML = '<div class="gallery-grid">' + ['A', 'B', 'C'].map((k) => {
      const E = ENDINGS[k], g = gallery[k] || {};
      const unlocked = g.good || g.bad;
      total += 2;
      if (g.good) got++;
      if (g.bad) got++;
      return '<div class="ending-card ' + (unlocked ? 'unlocked' : 'locked') + '">' +
        '<div class="idx">' + E.no + '</div>' +
        '<div class="ttl">' + (unlocked ? E.title : '？ ？ ？') + '</div>' +
        '<div class="dsc">' + (unlocked ? E.desc : '尚未抵达的结局。') + '</div>' +
        '<div class="states">' +
        '<span class="chip' + (g.bad ? ' got' : '') + '">残缺</span>' +
        '<span class="chip' + (g.good ? ' got' : '') + '">完整</span>' +
        '</div></div>';
    }).join('') + '</div>' +
      '<div class="gallery-hint">已收集 ' + got + ' / ' + total + ' 张结局卡</div>';
  }

  /* ================= 覆盖层 ================= */
  function openOverlay(id) {
    $(id).classList.add('show');
    if (id === 'galleryScreen') renderGallery();
    if (id === 'logScreen') renderLog();
  }
  function closeOverlay(id) { $(id).classList.remove('show'); }
  function closeAllPanels() {
    ['galleryScreen', 'logScreen', 'menuScreen', 'settingsScreen', 'helpScreen'].forEach(closeOverlay);
  }

  /* ================= 设置界面 ================= */
  function syncSettingsUI() {
    ['#segSpeed', '#segFx', '#segAuto'].forEach(() => { });
    const map = { segSpeed: 'speed', segFx: 'fx', segAuto: 'auto' };
    Object.keys(map).forEach((id) => {
      const el = $(id); if (!el) return;
      el.querySelectorAll('button').forEach((b) =>
        b.classList.toggle('on', b.dataset.v === settings[map[id]]));
    });
    $('volRange').value = settings.vol;
    AUDIO.setVolume(settings.vol);
  }

  /* ================= 粒子特效 ================= */
  const FX = (function () {
    const cv = $('fxCanvas'), ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let meta = ART.meta('blank');
    let parts = [];
    let raf = 0;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.width = Math.floor(innerWidth * dpr);
      H = cv.height = Math.floor(innerHeight * dpr);
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
    }
    function make() {
      const type = meta.particle;
      const n = Math.round((meta.count || 0) * (innerWidth < 800 ? 0.5 : 1));
      parts = [];
      for (let i = 0; i < n; i++) parts.push(spawn(type, true));
    }
    function spawn(type, anywhere) {
      const p = {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : (type === 'ember' ? H + 20 : -20),
        s: 0,
        a: 0.2 + Math.random() * 0.8,
        ph: Math.random() * Math.PI * 2,
        sp: 0.6 + Math.random() * 0.8
      };
      switch (type) {
        case 'dust': p.s = (0.6 + Math.random() * 1.8) * dpr; p.vy = -(0.05 + Math.random() * 0.18) * dpr; p.vx = (Math.random() - .5) * 0.12 * dpr; break;
        case 'ash': p.s = (0.8 + Math.random() * 2.0) * dpr; p.vy = (0.16 + Math.random() * 0.45) * dpr; p.vx = (Math.random() - .5) * 0.3 * dpr; break;
        case 'ember': p.s = (0.8 + Math.random() * 1.8) * dpr; p.vy = -(0.3 + Math.random() * 1.1) * dpr; p.vx = (Math.random() - .5) * 0.5 * dpr; break;
        case 'snow': p.s = (1.0 + Math.random() * 2.2) * dpr; p.vy = (0.12 + Math.random() * 0.35) * dpr; p.vx = (Math.random() - .5) * 0.25 * dpr; break;
        case 'rain': p.s = (10 + Math.random() * 26) * dpr; p.vy = (5 + Math.random() * 9) * dpr; p.vx = -1.4 * dpr; break;
        default: p.s = 0;
      }
      return p;
    }
    const COLORS = {
      dust: '200,222,255', ash: '205,200,190', ember: '255,186,110',
      snow: '220,238,255', rain: '232,246,255'
    };
    function color() { return COLORS[meta.particle] || '255,255,255'; }

    function step(t) {
      raf = requestAnimationFrame(step);
      if (!W) resize();
      ctx.clearRect(0, 0, W, H);
      if (!parts.length) return;
      const type = meta.particle;
      const c = color();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.ph += 0.006 * p.sp;
        p.x += p.vx + Math.sin(p.ph) * (type === 'rain' ? 0 : 0.14) * dpr;
        p.y += p.vy;
        if (p.y < -60) { p.y = H + 40; p.x = Math.random() * W; }
        if (p.y > H + 60) { p.y = -40; p.x = Math.random() * W; }
        if (p.x < -40) p.x = W + 20;
        if (p.x > W + 40) p.x = -20;
        const a = p.a * (0.35 + 0.65 * Math.abs(Math.sin(p.ph * 1.7)));
        if (type === 'rain') {
          ctx.strokeStyle = 'rgba(' + c + ',' + (a * 0.5).toFixed(3) + ')';
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + p.s);
          ctx.stroke();
        } else {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 3.2);
          g.addColorStop(0, 'rgba(' + c + ',' + (a * 0.9).toFixed(3) + ')');
          g.addColorStop(0.4, 'rgba(' + c + ',' + (a * 0.35).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + c + ',0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    return {
      init() { resize(); window.addEventListener('resize', () => { resize(); make(); }); raf = requestAnimationFrame(step); },
      setMeta(m) { meta = m || ART.meta('blank'); make(); },
      clear() { parts = []; }
    };
  })();

  /* ================= 交互绑定 ================= */
  function bind() {
    /* 舞台点击推进 */
    document.addEventListener('click', (e) => {
      if (e.target.closest('.overlay')) return;
      if (e.target.closest('.choice')) return;
      if (e.target.closest('button')) return;
      advance();
    });

    /* 章节卡跳过 */
    $('chapterCard').addEventListener('click', () => { if (cardResolve) cardResolve(); });

    /* 标题 */
    $('btnStart').addEventListener('click', () => { AUDIO.init(); AUDIO.mood('dread'); newGame(); });
    $('btnContinue').addEventListener('click', () => { AUDIO.init(); startFromSave(); });
    $('btnGallery').addEventListener('click', () => { AUDIO.init(); openOverlay('galleryScreen'); });
    $('btnHelp').addEventListener('click', () => openOverlay('helpScreen'));

    /* 菜单 */
    $('btnMenu').addEventListener('click', (e) => { e.stopPropagation(); openOverlay('menuScreen'); });
    document.querySelectorAll('[data-close]').forEach((b) => {
      b.addEventListener('click', () => closeOverlay(b.dataset.close));
    });
    document.querySelectorAll('#menuScreen .menu-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        closeOverlay('menuScreen');
        if (act === 'resume') { }
        if (act === 'log') openOverlay('logScreen');
        if (act === 'settings') openOverlay('settingsScreen');
        if (act === 'gallery') openOverlay('galleryScreen');
        if (act === 'restart') { if (confirm('重新开始？当前进度会被覆盖。')) { newGame(); } }
        if (act === 'title') { toTitle(); }
      });
    });

    /* 设置 */
    $('segSpeed').querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => { settings.speed = b.dataset.v; persist(); }));
    $('segFx').querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => { settings.fx = b.dataset.v; persist(); }));
    $('segAuto').querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => { settings.auto = b.dataset.v; persist(); if (settings.auto === 'on') advance(); }));
    $('volRange').addEventListener('input', (e) => {
      settings.vol = +e.target.value; AUDIO.setVolume(settings.vol); persist();
    });

    /* 结局界面 */
    $('btnEndGallery').addEventListener('click', () => { closeOverlay('endingScreen'); openOverlay('galleryScreen'); });
    $('btnEndAgain').addEventListener('click', () => { closeOverlay('endingScreen'); toTitle(); });

    /* 键盘 */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const open = ['galleryScreen', 'logScreen', 'menuScreen', 'settingsScreen', 'helpScreen']
          .filter((id) => $(id).classList.contains('show'));
        if (open.length) { closeOverlay(open[open.length - 1]); return; }
        if (playing) { openOverlay('menuScreen'); return; }
        return;
      }
      if (!playing) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); return; }
      if (/^[1-4]$/.test(e.key)) { chooseByIndex(+e.key - 1); }
    });

    /* 视差 */
    window.addEventListener('mousemove', (e) => {
      if (settings.fx === 'off') return;
      const x = (e.clientX / innerWidth - .5) * 14;
      const y = (e.clientY / innerHeight - .5) * 10;
      $('sceneLayer').style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`;
    });

    window.addEventListener('resize', () => { });
  }

  function persist() {
    store.set('sh_settings', settings);
    syncSettingsUI();
  }

  /* ================= 流程 ================= */
  function newGame() {
    closeAllPanels();
    closeOverlay('titleScreen');
    closeOverlay('endingScreen');
    fadeIn();
    state = { chi: 0, qian: 0, time: 180, flags: {} };
    log = []; chapterNow = null; currentScene = null; idx = 0;
    playing = true;
    $('hud').classList.add('on');
    $('dialogueWrap').classList.add('on');
    updateHUD();
    setClock(180, false);
    setScene('corridor', true);
    go(0);
  }
  function startFromSave() {
    closeAllPanels();
    closeOverlay('titleScreen');
    closeOverlay('endingScreen');
    fadeIn();
    $('hud').classList.add('on');
    if (!loadGame()) newGame();
  }
  function toTitle() {
    playing = false;
    closeAllPanels();
    fadeIn();
    $('dialogueWrap').classList.remove('on');
    $('hud').classList.remove('on');
    $('titleScreen').classList.add('show');
    AUDIO.mood('title');
    refreshContinue();
    hideChoices();
  }

  /* ================= 启动 ================= */
  function boot() {
    // 标题背景
    const bg = document.querySelector('.title-bg');
    if (bg) bg.innerHTML = ART.render('truck');
    syncSettingsUI();
    refreshContinue();
    bind();
    FX.init();
    FX.setMeta(ART.meta('truck'));
    AUDIO.setVolume(settings.vol);
    setClock(180, false);
    // 演示：标题右上角小彩蛋
    window.SH = { STORY, ENDINGS, state: () => state, go, gallery: () => gallery };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
