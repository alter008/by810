// 离线缓存：首次打开后断网也能刷题；"添加到主屏幕"后可全屏使用
// 策略：数据/页面文件走「网络优先」（保证题库和解析更新能及时生效），
//       图片等静态资源走「缓存优先」（省流量、离线可用）
const CACHE = 'by810-v4';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'data.js', 'pages.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png'
];
// 这些文件每次先从网络取，失败再回退缓存
const NETWORK_FIRST = /(index\.html|data\.js|pages\.js|app\.js|style\.css|manifest\.webmanifest)$/;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isShell = NETWORK_FIRST.test(url.pathname) || url.pathname.endsWith('/');

  if (isShell) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      // 图片：刚从网络取时强制校验一次，避免浏览器 HTTP 缓存里的旧图被再次存进来
      return fetch(req, { cache: 'no-cache' }).then(res => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
