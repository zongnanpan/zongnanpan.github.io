// PWA Lite 能力验证脚本
// 每个按钮对应一个 A 类系统能力的实测——不描述"理论上能不能"，只记录点击后的真实返回结果

const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');

function log(msg) {
  const time = new Date().toTimeString().slice(0, 8);
  logEl.textContent += `[${time}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
  console.log(msg);
}

function badge(label, value) {
  const el = document.createElement('span');
  el.className = 'badge';
  el.textContent = `${label}: ${value}`;
  statusEl.appendChild(el);
}

// ---------- 启动时的环境快照 ----------
(function envSnapshot() {
  const displayMode = window.matchMedia('(display-mode: standalone)').matches
    ? 'standalone（已加到主屏/独立窗口打开）'
    : 'browser（当前是浏览器标签页打开）';
  badge('显示模式', displayMode);
  badge('HTTPS', location.protocol === 'https:' ? '是' : '否（' + location.protocol + '，SW/安装可能不可用）');
  badge('UA', navigator.userAgent.includes('Chrome') ? 'Chrome系' : (navigator.userAgent.includes('Safari') ? 'Safari系' : '其他'));
  log('页面加载完成，环境信息见上方状态条');
})();

// ---------- 注册 Service Worker ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    log('✅ Service Worker 注册成功，scope=' + reg.scope);
  }).catch((err) => {
    log('❌ Service Worker 注册失败：' + err.message);
  });
} else {
  log('❌ 当前环境不支持 Service Worker');
}

// ---------- 震动 ----------
document.getElementById('btnVibrate').addEventListener('click', () => {
  if (!('vibrate' in navigator)) {
    log('❌ navigator.vibrate 不存在（iOS Safari 已知不支持）');
    return;
  }
  const ok = navigator.vibrate([100, 50, 100]);
  log(`震动 API 调用返回：${ok}（true 代表浏览器受理了请求，不代表设备一定振动——比如未声明权限、静音模式等场景可能受理了但实际不振动）`);
});

// ---------- 通知权限 + 发通知 ----------
document.getElementById('btnNotify').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    log('❌ Notification API 不存在');
    return;
  }
  log('当前通知权限：' + Notification.permission);
  const perm = await Notification.requestPermission();
  log('用户授权结果：' + perm);
  if (perm === 'granted') {
    new Notification('PWA Lite 测试通知', { body: '如果看到这条系统通知，说明 Web Notification 完整可用', icon: 'icons/icon-192.png' });
    log('✅ 已调用 new Notification()，检查系统通知栏');
  }
});

// ---------- GPS 定位 ----------
document.getElementById('btnGeo').addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    log('❌ Geolocation API 不存在');
    return;
  }
  log('请求定位权限中…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      log(`✅ 定位成功：纬度 ${pos.coords.latitude.toFixed(4)}, 经度 ${pos.coords.longitude.toFixed(4)}, 精度 ${pos.coords.accuracy}m`);
    },
    (err) => {
      log(`❌ 定位失败：code=${err.code} message=${err.message}`);
    },
    { timeout: 8000 }
  );
});

// ---------- IndexedDB 读写（对应文档里 MMKV 的"功能替代"讨论） ----------
document.getElementById('btnStorage').addEventListener('click', () => {
  const req = indexedDB.open('pwa-lite-test-db', 1);
  req.onupgradeneeded = (e) => {
    e.target.result.createObjectStore('kv');
  };
  req.onsuccess = (e) => {
    const db = e.target.result;
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const key = 'last_write_time';
    const value = new Date().toISOString();
    store.put(value, key);
    tx.oncomplete = () => {
      const readTx = db.transaction('kv', 'readonly');
      const readReq = readTx.objectStore('kv').get(key);
      readReq.onsuccess = () => {
        log(`✅ IndexedDB 写入并读回成功：${key} = ${readReq.result}`);
      };
    };
  };
  req.onerror = () => log('❌ IndexedDB 打开失败：' + req.error);
});

// ---------- 安装提示（beforeinstallprompt，仅 Android Chrome 系有） ----------
let deferredInstallPrompt = null;
const btnInstall = document.getElementById('btnInstall');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  btnInstall.disabled = false;
  log('✅ 收到 beforeinstallprompt 事件——浏览器认为满足安装条件了，"加到主屏幕"按钮已启用');
});

window.addEventListener('appinstalled', () => {
  log('✅ appinstalled 事件触发——用户已完成安装');
});

btnInstall.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  log('用户对安装提示的选择：' + choice.outcome);
  deferredInstallPrompt = null;
  btnInstall.disabled = true;
});

// 如果 8 秒内没收到 beforeinstallprompt，提示可能的原因（iOS Safari 天生没有这个事件）
setTimeout(() => {
  if (!deferredInstallPrompt) {
    log('⚠️ 8 秒内没有收到 beforeinstallprompt——iOS Safari 上这是正常的（没有这个事件，安装靠用户手动"分享→添加到主屏幕"）；Android Chrome 上没收到，检查 manifest.json 是否满足安装条件（图标/HTTPS/SW 是否都注册成功）');
  }
}, 8000);

// ---------- 离线缓存命中检查 ----------
document.getElementById('btnOfflineCheck').addEventListener('click', async () => {
  if (!('caches' in window)) {
    log('❌ Cache Storage API 不存在');
    return;
  }
  const keys = await caches.keys();
  log('当前缓存空间：' + keys.join(', '));
  for (const key of keys) {
    const cache = await caches.open(key);
    const reqs = await cache.keys();
    log(`  ${key} 缓存了 ${reqs.length} 个资源：` + reqs.map(r => r.url.split('/').pop()).join(', '));
  }
  log('提示：断网后刷新页面，如果还能正常打开，说明离线缓存生效');
});

// ---------- 屏幕方向锁定 ----------
document.getElementById('btnOrientation').addEventListener('click', async () => {
  if (!screen.orientation || !screen.orientation.lock) {
    log('❌ screen.orientation.lock 不存在');
    return;
  }
  try {
    await screen.orientation.lock('landscape');
    log('✅ 锁定横屏成功，当前 orientation.type=' + screen.orientation.type);
  } catch (err) {
    log(`❌ 锁定失败：${err.name}: ${err.message}（常见原因：非 standalone 模式下 Chrome 不允许调用，或系统开了"自动旋转"锁）`);
  }
});

// ---------- 全屏 ----------
document.getElementById('btnFullscreen').addEventListener('click', async () => {
  if (!document.documentElement.requestFullscreen) {
    log('❌ Fullscreen API 不存在');
    return;
  }
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      log('已退出全屏');
    } else {
      await document.documentElement.requestFullscreen();
      log('✅ 已进入全屏（跟 manifest 的 standalone 不是一回事，这个是彻底没有任何系统 UI）');
    }
  } catch (err) {
    log(`❌ 全屏请求失败：${err.name}: ${err.message}（常见原因：不是用户直接点击触发的调用会被拒绝）`);
  }
});

// ---------- 防息屏 WakeLock ----------
let wakeLock = null;
document.getElementById('btnWakeLock').addEventListener('click', async () => {
  if (!('wakeLock' in navigator)) {
    log('❌ WakeLock API 不存在');
    return;
  }
  try {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
      log('已释放 WakeLock，屏幕可以正常自动锁屏了');
    } else {
      wakeLock = await navigator.wakeLock.request('screen');
      log('✅ 已申请 WakeLock，屏幕不会自动息屏（切后台会自动失效，需要回到前台重新申请）');
      wakeLock.addEventListener('release', () => log('⚠️ WakeLock 被系统释放了（大概率是切到后台了）'));
    }
  } catch (err) {
    log(`❌ WakeLock 申请失败：${err.name}: ${err.message}`);
  }
});

// ---------- 前后台切换检测（被动记录，不需要按钮） ----------
document.addEventListener('visibilitychange', () => {
  log(`👀 visibilitychange -> ${document.visibilityState}（对应 TWA 讨论里"App 被系统回收"话题，纯 PWA 下切后台/回前台的行为在这里能看到真实记录）`);
});

// ---------- 网络状态变化（被动记录） ----------
log('当前网络状态：navigator.onLine = ' + navigator.onLine);
window.addEventListener('online', () => log('📶 online 事件：网络恢复'));
window.addEventListener('offline', () => log('📴 offline 事件：网络断开'));

// ---------- 检测原生 App 是否已安装（对应 Web2App 场景） ----------
document.getElementById('btnRelatedApps').addEventListener('click', async () => {
  if (!('getInstalledRelatedApps' in navigator)) {
    log('❌ getInstalledRelatedApps 不存在（这个 API 本身就要求 manifest.json 里配 related_applications 字段，且仅 Android Chrome 支持）');
    return;
  }
  const apps = await navigator.getInstalledRelatedApps();
  if (apps.length === 0) {
    log('未检测到已安装的关联原生 App（也可能是 manifest.json 没配 related_applications，不代表设备上真的没装）');
  } else {
    apps.forEach((app) => log(`✅ 检测到已安装：platform=${app.platform} id=${app.id} url=${app.url}`));
  }
});
