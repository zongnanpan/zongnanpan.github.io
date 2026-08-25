# PWA Lite 能力验证 Demo

## 验证目的

跟 `../android` + `../web` 那套 TWA demo 是同一个方法论——**不靠理论描述，靠真机点击拿实测结果**。这次验证的是纯 PWA（没有原生宿主）能用到什么程度，对应《BBLite瘦身方案之PWA.md》里"A 类系统能力"那部分结论。

## 目录结构

```
pwa-lite/
├── index.html        入口页面，link 了 manifest.json
├── manifest.json      Web App Manifest，决定能不能安装/图标/启动方式
├── sw.js              Service Worker，离线缓存策略（cache-first + 后台更新）
├── icons/             192/512 两个尺寸图标（manifest 硬性要求）
├── src/app.js         每个按钮对应一个 A 类能力的实测代码
└── README.md
```

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
| 加到主屏幕 | `beforeinstallprompt` 事件 | 只有 Android Chrome 系有这个事件，iOS Safari 没有，需要用户手动操作 |
| 检查离线缓存命中 | `caches` API | 验证 Service Worker 是否真的把资源缓存下来了 |

页面顶部的状态条会显示当前是"浏览器打开"还是"已加到主屏幕独立打开"（`display-mode: standalone`）——这两种状态下部分能力表现可能不同，测试时两种状态都要过一遍。

## 这个 demo 刻意没做的事（跟 TWA demo 保持同一个纪律）

不会去尝试调用任何第三方原生 SDK（广告 SDK、MMKV 真实库、归因 SDK）——这些是 B 类能力，纯 PWA 架构上摸不到，不需要用代码"证明摸不到"，这本身就是浏览器沙箱的设计前提，没有反例可能。这个 demo 只负责把 A 类能力的边界实测清楚。
