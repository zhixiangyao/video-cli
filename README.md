# video-cli

> 终端视频工具箱，基于 [Ink](https://github.com/vadimdemedes/ink) 构建的交互式 CLI 工具。

## 功能

- **无损裁剪视频** — 使用 ffmpeg 无损切割 MP4 视频片段
- **硬件转码至 H265** — 通过 VAAPI 硬件加速将视频转码为 H.265/HEVC 格式
- **批量添加编码后缀** — 自动检测视频编码并将编码名追加到文件名
- **批量移除编码后缀** — 移除文件名中的编码后缀（如 `-H264`、`-H265`）
- **同步文件夹名与视频名** — 将目录名与目录内唯一 MP4 文件的文件名同步

## 环境要求

- [Node.js](https://nodejs.org/) >= 26.5.0
- [pnpm](https://pnpm.io/) >= 11.12.0
- [ffmpeg](https://ffmpeg.org/) & ffprobe（裁剪和转码功能需要）

```bash
# Ubuntu/Debian
sudo apt install ffmpeg
# MacOS(homebrew)
brew install ffmpeg
```

## 安装

```bash
pnpm install
pnpm build
```

## 使用

```bash
# 开发模式直接运行
pnpm dev

# 构建后运行
pnpm build
node dist/cli.js
```

运行后会显示交互式菜单，选择对应功能即可。

## 菜单

```
🛠️ 欢迎使用视频工具箱
---------------------------------
1) 无损裁剪视频 (cut-video)
2) 硬件转码至 H265 (to-h265)
3) 批量添加编码后缀 (add-codec-suffix)
4) 批量移除编码后缀 (remove-codec-suffix)
5) 同步文件夹名与视频名 (sync-folder-name)
6) 退出
```

## 脚本

| 命令              | 说明                |
| ----------------- | ------------------- |
| `pnpm dev`        | 开发模式运行        |
| `pnpm build`      | TypeScript 编译     |
| `pnpm typecheck`  | 类型检查            |
| `pnpm lint`       | Lint 检查并自动修复 |
| `pnpm lint:check` | 仅 Lint 检查        |
| `pnpm fmt`        | 格式化代码          |
| `pnpm fmt:check`  | 检查代码格式        |

## 技术栈

- [TypeScript](https://www.typescriptlang.org/)
- [Ink](https://github.com/vadimdemedes/ink) — React for CLI
- [React](https://react.dev/)
- [meow](https://github.com/sindresorhus/meow) — CLI helper
- [oxlint](https://oxc.rs/) / [oxfmt](https://oxc.rs/) — Lint & 格式化
