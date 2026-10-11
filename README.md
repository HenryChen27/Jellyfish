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
- 左上角齿轮可调节背景音乐、音效音量并重新开始。
- 浏览器限制自动播放时，首次点击或按键后开始播放背景音乐。

## 目录

- `index.html`：游戏入口。
- `js/`、`css/`：游戏逻辑与样式。
- `assets/`：图片、音频、字体及素材说明。
- `tests/animation-preview.html`：水母动画预览。
- `tests/`：验证脚本、录制脚本及效果预览。

素材和字体的说明见 `assets/assets.txt`、`assets/fonts/README.txt` 和 `assets/audio/SOURCES.md`。
