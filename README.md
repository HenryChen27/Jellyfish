# 合成大水母

基于 HTML、Canvas 和 Matter.js 的水母合成小游戏，包含水母内部动画、气泡开场过场、音效和音量设置。

## 启动

在项目目录运行：

```sh
python -m http.server 8000
```

打开 http://localhost:8000 。无需安装 Node.js 依赖或构建。

## 操作

- 鼠标或触摸移动抓手，松开后投放水母。
- 键盘左右方向键移动抓手，Enter 或下方向键投放。
- 左上角退出按钮保存当前进度并回到初始化界面；再次开始可选择继续存档或新开一把。
- 投放、合成及进入危险状态时保存，连续合成合并为一次存储写入，每 10 秒兜底存档；页面隐藏或关闭时立即保存。危险截止时间保留，继续时已超时则进入结算。
- 地图右下角齿轮可调节背景音乐、音效音量并重新开始。
- 浏览器限制自动播放时，首次点击或按键后开始播放背景音乐。
- 游戏结束后显示本局得分和个人前三名；完整排行榜最多保留 50 条最高分记录及日期。
- 记录保存在当前浏览器的本地存储中，清除网站数据会删除记录。

## 目录

- `index.html`：游戏入口。
- `js/`、`css/`：游戏逻辑与样式。
- `assets/`：图片、音频、字体及素材说明。
- `tests/animation-preview.html`：水母动画预览。
- `tests/`：验证脚本、录制脚本及效果预览。

素材和字体的说明见 `assets/assets.txt`、`assets/fonts/README.txt` 和 `assets/audio/SOURCES.md`。

## 安全保存并退出接口

```js
const result = await window.JellyfishGame.safeSaveAndExit();
// { saved: boolean, closed: boolean, reason: null | 'not_ready' | 'save_failed' | 'close_blocked' }
```

保存失败时不关闭、不暂停游戏。保存成功后暂停游戏并尝试 `window.close()`。
浏览器通常只允许关闭由脚本打开的窗口；关闭受限时显示“已安全保存，可以关闭此页”，返回 `close_blocked`。
左上角退出按钮仍保留存档并返回初始化界面的行为。
