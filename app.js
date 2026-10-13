(function () {
  var DATA = window.DATA || [];
  var PAGES = window.PAGES || {};
  var LS_STAR = 'yuki810.star', LS_WRONG = 'yuki810.wrong', LS_DONE = 'yuki810.done', LS_ANS = 'yuki810.ans';

  function load(k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var star = load(LS_STAR), wrong = load(LS_WRONG), done = load(LS_DONE);
  var ansPref = load(LS_ANS);
  var showAns = ansPref.on === undefined ? true : !!ansPref.on;   // 默认展开解析

  // 展平
  var all = [];
  DATA.forEach(function (p) {
    (p.questions || []).forEach(function (q, i) {
      all.push({ year: p.year, idx: i, q: q, total: p.questions.length });
    });
  });

  var cur = -1;           // all 中的下标
  var filterYear = null;
  var listOnly = null;    // 'wrong' | 'star' | null

  var $ = function (id) { return document.getElementById(id); };
  var yearList = $('yearList'), qList = $('qList'), qimg = $('qimg'),
      empty = $('empty'), canvas = $('canvas'), lightbox = $('lightbox'),
      lbimg = $('lbimg'), lbpages = $('lbpages'),
      sidebar = $('sidebar'), backdrop = $('backdrop');

  $('statTotal').textContent = '· 共 ' + all.length + ' 题 · ' + DATA.length + ' 套';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 手机端抽屉 ---------- */
  function isNarrow() { return window.innerWidth <= 820; }
  function openDrawer() {
    if (!isNarrow()) return;
    sidebar.classList.add('open');
    backdrop.classList.add('on');
  }
  function closeDrawer() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('on');
  }
  function toggleDrawer() {
    if (sidebar.classList.contains('open')) closeDrawer(); else openDrawer();
  }

  function renderYears() {
    yearList.innerHTML = '';
    var btn = document.createElement('button');
    btn.className = 'yr' + (filterYear === null && !listOnly ? ' on' : '');
    btn.textContent = '全部';
    btn.onclick = function () { filterYear = null; listOnly = null; renderYears(); renderList(); closeDrawer(); };
    yearList.appendChild(btn);
    DATA.forEach(function (p) {
      var b = document.createElement('button');
      b.className = 'yr' + (filterYear === p.year ? ' on' : '');
      b.textContent = p.year;
      b.onclick = function () { filterYear = p.year; listOnly = null; renderYears(); renderList(); closeDrawer(); };
      yearList.appendChild(b);
    });
  }

  function currentList() {
    if (listOnly === 'wrong') return all.filter(function (o) { return wrong[o.q.id]; });
    if (listOnly === 'star') return all.filter(function (o) { return star[o.q.id]; });
    return all.filter(function (o) { return !filterYear || o.year === filterYear; });
  }

  function renderList() {
    var list = currentList();
    $('qlistTitle').textContent = listOnly === 'wrong' ? '错题本' :
      listOnly === 'star' ? '我的收藏' :
      (filterYear ? filterYear + ' 年题目' : '全部题目');
    qList.innerHTML = '';
    if (!list.length) {
      qList.innerHTML = '<div class="item"><span class="tx" style="color:#9aa2b1">这里还是空的哦～</span></div>';
      return;
    }
    var showYear = (filterYear === null);
    list.forEach(function (o) {
      var d = document.createElement('div');
      var isCur = cur > -1 && all[cur] && all[cur].q.id === o.q.id;
      d.className = 'item' + (isCur ? ' on' : '');
      var dot = star[o.q.id] ? 'dot fav' : (done[o.q.id] ? 'dot' : (wrong[o.q.id] ? 'dot bad' : ''));
      d.innerHTML = '<span class="no">' + esc((showYear ? o.year.slice(2) + '·' : '') + o.q.label) + '</span>' +
        '<span class="tx">' + esc(o.q.head || ('第 ' + (o.idx + 1) + ' 题')) + '</span>' +
        (o.q.ans ? '<span class="ansdot" title="有解析">解</span>' : '') +
        (dot ? '<span class="' + dot + '"></span>' : '');
      d.onclick = function () { goToAllIndex(all.indexOf(o)); };
      qList.appendChild(d);
    });
    var on = qList.querySelector('.item.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
  }

  // 单文件版会把图片内联在 window.IMGS 里；多文件版直接用相对路径
  function srcOf(p) {
    var m = window.IMGS;
    return (m && (m[p] || m['site/' + p])) || p;
  }

  function showCrop() {
    lbpages.innerHTML = '';
    lbimg.style.display = 'block';
  }

  function goToAllIndex(i, keepScroll) {
    if (i < 0 || i >= all.length) return;
    cur = i;
    var o = all[i], q = o.q;
    empty.style.display = 'none';
    qimg.classList.add('show');
    qimg.src = srcOf(q.img);
    qimg.alt = o.year + ' 年第 ' + q.label + ' 题';
    $('vYear').textContent = o.year + ' 年';
    $('vYear').style.display = '';
    $('vNo').textContent = '第 ' + q.label + ' 题 / 共 ' + o.total + ' 题';
    $('vNo').style.display = '';
    var sc = $('vScore');
    if (q.score) { sc.textContent = q.score + ' 分'; sc.style.display = ''; }
    else { sc.style.display = 'none'; }
    var pgs = q.pages || [];
    $('vPage').textContent = pgs.length ? ('原卷第 ' + pgs.join('、') + ' 页') : '';
    $('vPage').style.display = pgs.length ? '' : 'none';
    $('btnFav').textContent = star[q.id] ? '★ 已收藏' : '☆ 收藏';
    $('btnFav').classList.toggle('on', !!star[q.id]);
    $('btnMark').textContent = done[q.id] ? '✓ 已掌握' : '标记已掌握';
    $('btnMark').classList.toggle('on', !!done[q.id]);
    $('btnAddWrong').textContent = wrong[q.id] ? '✓ 已在错题本' : '加入错题';
    $('btnAddWrong').classList.toggle('on', !!wrong[q.id]);
    // 解析：有答案的年份才显示按钮
    var hasAns = !!q.ans;
    var ab = $('btnAns');
    ab.style.display = hasAns ? '' : 'none';
    ab.textContent = showAns ? '收起解析' : '看解析';
    ab.classList.toggle('on', showAns);
    renderAns(o, hasAns);
    var bAns = $('vAns');
    bAns.textContent = hasAns ? '有解析' : '暂无解析';
    bAns.className = 'badge light ' + (hasAns ? 'ans' : 'noans');
    bAns.style.display = '';
    var pct = ((o.idx + 1) / o.total) * 100;
    $('progText').textContent = (o.idx + 1) + '/' + o.total;
    var barEl = $('bar');
    if (barEl.firstChild) barEl.firstChild.style.width = pct + '%';
    if (!keepScroll) canvas.scrollTop = 0;
    renderList();
    closeDrawer();
    preload(i);
    try { history.replaceState(null, '', '#' + q.id); } catch (e) {}
  }

  // ---- 解析区 ----

  var ansYears = {};
  DATA.forEach(function (p) {
    (p.questions || []).forEach(function (q) { if (q.ans) ansYears[p.year] = 1; });
  });

  function renderAns(o, hasAns) {
    var box = $('ansbox'), img = $('ansimg'), tip = $('ansTip');
    box.classList.remove('missing');
    if (!hasAns) {
      if (!ansYears[o.year]) {           // 整年都没有解析：不显示解析区
        box.classList.remove('show');
        img.removeAttribute('src');
        img.style.display = 'none';
        return;
      }
      box.classList.add('missing');
      box.classList.add('show');
      tip.textContent = '本题解析缺失（该年份其余题目有解析）';
      img.removeAttribute('src');
      img.style.display = 'none';
      return;
    }
    tip.textContent = o.year + ' 年 · 第 ' + o.q.label + ' 题';
    if (showAns) {
      img.style.display = 'block';
      img.src = srcOf(o.q.ans);
      img.alt = o.year + ' 年第 ' + o.q.label + ' 题 解析';
      box.classList.add('show');
    } else {
      box.classList.remove('show');
      img.removeAttribute('src');
    }
  }

  // 把解析区滚到视口顶部（直接设 scrollTop，最可靠）
  function scrollToAns() {
    var b = $('ansbox');
    if (!b || !b.classList.contains('show')) return;
    var delta = b.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 8;
    canvas.scrollTop = Math.max(0, canvas.scrollTop + delta);
  }

  function toggleAns() {
    if (cur < 0) return;
    showAns = !showAns;
    save(LS_ANS, { on: showAns ? 1 : 0 });
    goToAllIndex(cur, true);
    if (showAns) setTimeout(scrollToAns, 50);
  }

  // 预取相邻题目图片，手机上翻题更顺
  var preloaded = {};
  function preload(i) {
    [i + 1, i + 2, i - 1].forEach(function (k) {
      if (k < 0 || k >= all.length) return;
      var u = srcOf(all[k].q.img);
      if (preloaded[u]) return;
      preloaded[u] = 1;
      var im = new Image();
      im.src = u;
    });
  }

  function step(d) {
    var list = currentList();
    if (!list.length) return;
    var curId = cur > -1 ? all[cur].q.id : null;
    var pos = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].q.id === curId) { pos = i; break; } }
    var np = pos + d;
    if (np < 0) np = list.length - 1;
    if (np >= list.length) np = 0;
    goToAllIndex(all.indexOf(list[np]));
  }

  $('btnPrev').onclick = function () { step(-1); };
  $('btnNext').onclick = function () { step(1); };
  $('btnRandom').onclick = function () {
    var list = currentList();
    if (!list.length) list = all;
    if (!list.length) return;
    goToAllIndex(all.indexOf(list[Math.floor(Math.random() * list.length)]));
  };
  $('btnAll').onclick = function () { filterYear = null; listOnly = null; renderYears(); renderList(); closeDrawer(); };
  $('btnWrong').onclick = function () { listOnly = 'wrong'; filterYear = null; renderYears(); renderList(); closeDrawer(); };
  $('btnStar').onclick = function () { listOnly = 'star'; filterYear = null; renderYears(); renderList(); closeDrawer(); };
  $('btnMenu').onclick = toggleDrawer;
  $('btnAns').onclick = toggleAns;
  backdrop.onclick = closeDrawer;
  window.addEventListener('resize', function () { if (!isNarrow()) closeDrawer(); });
  $('btnFav').onclick = function () {
    if (cur < 0) return;
    var id = all[cur].q.id;
    if (star[id]) delete star[id]; else star[id] = 1;
    save(LS_STAR, star); updateCounts(); goToAllIndex(cur);
  };
  $('btnMark').onclick = function () {
    if (cur < 0) return;
    var id = all[cur].q.id;
    if (done[id]) delete done[id]; else done[id] = 1;
    save(LS_DONE, done); goToAllIndex(cur);
  };
  $('btnAddWrong').onclick = function () {
    if (cur < 0) return;
    var id = all[cur].q.id;
    if (wrong[id]) delete wrong[id]; else wrong[id] = 1;
    save(LS_WRONG, wrong); updateCounts(); goToAllIndex(cur);
  };
  $('btnZoom').onclick = function () {
    canvas.classList.toggle('zoomed');
    $('btnZoom').classList.toggle('on', canvas.classList.contains('zoomed'));
  };
  // 手机上点题目图 = 全屏看（放大了才看得清扫描件）
  qimg.onclick = function () { if (cur > -1) $('btnFull').click(); };
  $('btnFull').onclick = function () {
    if (cur < 0) return;
    showCrop();
    lbimg.src = srcOf(all[cur].q.img);
    lightbox.classList.add('on');
    lightbox.scrollTop = 0;
  };
  // 看原卷：把该题所在的原卷整页显示出来，便于核对
  $('btnSrc').onclick = function () {
    if (cur < 0) return;
    var o = all[cur], pg = PAGES[o.year] || {}, pgs = o.q.pages || [];
    lbimg.removeAttribute('src');
    lbimg.style.display = 'none';
    lbpages.innerHTML = '';
    if (!pgs.length) { lbpages.innerHTML = '<p class="tip">没有原卷页信息</p>'; }
    pgs.forEach(function (n) {
      if (!pg[n]) return;
      var wrap = document.createElement('div');
      wrap.className = 'pgwrap';
      var cap = document.createElement('div');
      cap.className = 'pgcap';
      cap.textContent = o.year + ' 年 · 原卷 第 ' + n + ' 页' + (pgs.length > 1 ? '（本题跨页，共 ' + pgs.length + ' 页）' : '');
      var im = document.createElement('img');
      im.src = srcOf(pg[n]);
      im.alt = o.year + ' 年第 ' + n + ' 页';
      wrap.appendChild(cap); wrap.appendChild(im);
      lbpages.appendChild(wrap);
    });
    lightbox.classList.add('on');
    lightbox.scrollTop = 0;
  };
  // 点击图片以外的空白处关闭
  lightbox.onclick = function (e) {
    if (e.target && e.target.tagName === 'IMG') return;
    lightbox.classList.remove('on');
  };

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('on')) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') step(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') step(-1);
      else if (e.key === 'f' || e.key === 'F') $('btnFull').click();
      else if (e.key === 'o' || e.key === 'O') $('btnSrc').click();
      else if (e.key === 'm' || e.key === 'M') toggleDrawer();
      else if (e.key === 'a' || e.key === 'A') toggleAns();
    } else if (e.key === 'Escape') {
      lightbox.classList.remove('on');
    }
  });

  var sx = 0, sy = 0;
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    if (e.changedTouches.length !== 1) return;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  // 大图里左右滑动也能翻题
  var lx = 0, ly = 0;
  lightbox.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    lx = e.touches[0].clientX; ly = e.touches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', function (e) {
    if (e.changedTouches.length !== 1) return;
    var dx = e.changedTouches[0].clientX - lx;
    var dy = e.changedTouches[0].clientY - ly;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  function updateCounts() {
    $('starCount').textContent = Object.keys(star).length;
    $('wrongCount').textContent = Object.keys(wrong).length;
  }

  // 窄屏把提示语换成触屏说法
  if (isNarrow()) {
    var em = empty.querySelector('p');
    if (em) em.textContent = '点左上角「☰ 目录」选一套卷子，或者点「随机一题」开始吧～';
  }

  renderYears(); renderList(); updateCounts();
  var hash = decodeURIComponent(location.hash.replace('#', ''));
  if (hash) {
    for (var i = 0; i < all.length; i++) { if (all[i].q.id === hash) { cur = i; break; } }
    if (cur > -1) goToAllIndex(cur);
  } else if (isNarrow()) {
    openDrawer();   // 手机上先把目录亮出来
  }
})();
