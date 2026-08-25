# PWA Lite 能力验证 Demo

## 验证目的

跟 `../android` + `../web` 那套 TWA demo 是同一个方法论——**不靠理论描述，靠真机点击拿实测结果**。这次验证的是纯 PWA（没有原生宿主）能用到什么程度，对应《BBLite瘦身方案之PWA.md》里"A 类系统能力"那部分结论。

## 目录结构

```
pwa-lite/
├── index.html        真实游戏页面（Block Blast，1.3MB+），头部插入了 manifest 链接，
│                       body 里叠加了一个悬浮的能力测试面板（震动/通知/GPS/存储/安装/缓存检查）
├── manifest.json      Web App Manifest，决定能不能安装/图标/启动方式/屏幕方向
├── sw.js              Service Worker，离线缓存策略（cache-first + 后台更新）
├── icons/             192/512 两个尺寸图标（manifest 硬性要求）
├── src/app.js         能力测试面板的实测代码，不需要改，按钮 ID 已经跟 index.html 对上
└── README.md
```

> `index.html` 原本是一个精简的 API 测试页，现在换成了真实游戏文件（`Downloads/game-test.html`，Block Blast 的 LayaAir 页面），能力测试面板通过脚本插入到游戏页面里，跟游戏本体不冲突。目的是验证**真实游戏页面**（不是玩具测试页）作为可安装/离线 PWA 时的实测表现——首次安装要缓存 1.3MB+ 的页面，加载/离线体验跟简单页面会有明显差异。
>
> `manifest.json` 的 `orientation` 已经改成 `landscape`，跟游戏本身的 `screenorientation='landscape'` meta 标签保持一致，否则装成 standalone 后屏幕方向会跟游戏期望的不一样。

## 部署（必须 HTTPS，否则 Service Worker / 安装都不生效）

复用已经搭好的 `zongnanpan.github.io` 仓库，放到子路径下：

```bash
# 把整个 pwa-lite 目录拷进那个仓库
cp -r /Users/admin/work/pwa/pwa-lite <你的zongnanpan.github.io仓库路径>/pwa-lite
```

推上去之后访问：

```
https://zongnanpan.github.io/pwa-lite/
```

> `manifest.json` 里 `start_url`/`scope` 已经写成 `/pwa-lite/`，如果部署路径不同要同步改，否则安装后启动地址会不对。

## 测试项对照表

| 按钮 | 测什么 | 对应文档结论 |
|---|---|---|
| 震动测试 | `navigator.vibrate()` | A 类能力，Android Chrome 能用，iOS Safari 不支持 |
| 通知权限+发通知 | `Notification` API | A 类能力，但 iOS 上必须先"加到主屏幕"才能申请权限 |
| GPS 定位 | `Geolocation` API | A 类能力，仅前台，拿不到后台定位 |
| 本地存储读写 | `IndexedDB` | 对应 MMKV 的"功能替代"讨论——注意这只是能存能取，同步性/性能特征跟 MMKV 不同 |
| 加到主屏幕 | `beforeinstallprompt` 事件 | **Chromium 专有扩展，不是 W3C 标准**——iOS Safari/Firefox 都没有这个事件，安装动作在 Android 上实际是 Chrome + Google 后台 WebAPK 生成服务联合完成的 |
| 检查离线缓存命中 | `caches` API | 验证 Service Worker 是否真的把资源缓存下来了 |
| 锁横屏 | `screen.orientation.lock()` | 对应 `manifest.json` 里 `orientation: landscape` 的设置，测 JS 侧主动锁定是否也生效 |
| 全屏 | `Fullscreen API` | 跟 standalone 显示模式不是一回事，这个是彻底没有任何系统 UI 的真全屏 |
| 防息屏 | `WakeLock API` | 游戏场景常见需求；切到后台会自动失效，需要回前台重新申请 |
| 检测原生App | `getInstalledRelatedApps()` | 对应 Web2App 场景——检测原生 APK 是否已安装；仅 Android Chrome 支持，且要求 manifest.json 配置 `related_applications` |
| （被动记录，无按钮）前后台切换 | `visibilitychange` 事件 | 呼应 TWA demo 里"App 被系统回收状态丢失"的讨论，看纯 PWA 下切后台/回前台的真实表现 |
| （被动记录，无按钮）网络状态变化 | `online`/`offline` 事件 | 关联广告加载/排行榜同步这类需要判断网络的场景 |

页面顶部的状态条会显示当前是"浏览器打开"还是"已加到主屏幕独立打开"（`display-mode: standalone`）——这两种状态下部分能力表现可能不同，测试时两种状态都要过一遍。

## 这个 demo 刻意没做的事（跟 TWA demo 保持同一个纪律）

不会去尝试调用任何第三方原生 SDK（广告 SDK、MMKV 真实库、归因 SDK）——这些是 B 类能力，纯 PWA 架构上摸不到，不需要用代码"证明摸不到"，这本身就是浏览器沙箱的设计前提，没有反例可能。这个 demo 只负责把 A 类能力的边界实测清楚。
