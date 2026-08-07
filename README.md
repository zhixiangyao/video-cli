# video-cli

> 终端视频工具箱, 基于 [Ink](https://github.com/vadimdemedes/ink) 构建的交互式 CLI 工具.

## 功能

- **裁剪视频片段(无损,不重新编码)** — 使用 ffmpeg 无损切割 MP4 视频片段
- **硬件转码为 H.265(体积更小)** — 通过 VAAPI 硬件加速将视频转码为 H.265/HEVC 格式
- **复制到机械硬盘(串行拷贝,保持轨道顺滑)** — 源可为单个文件或文件夹, 串行顺序拷贝至机械硬盘（自动校验目标为文件夹、可写且位于机械硬盘）, 大文件优先, 支持断点续传

## 环境要求

- [Node.js](https://nodejs.org/) >= 26.5.0
- [pnpm](https://pnpm.io/) >= 11.12.0
- [ffmpeg](https://ffmpeg.org/) & ffprobe（裁剪和转码功能需要）
- [ionice](https://man7.org/linux/man-pages/man1/ionice.1.html)（复制到机械硬盘功能需要, Linux 自带）

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
node dist/cli.mjs
```

运行后默认显示交互式菜单, 选择对应功能即可; 也可通过子命令直接进入对应页面：

```bash
video-cli              # 交互式菜单
video-cli cut-video    # 直接进入裁剪页面
video-cli to-h265      # 直接进入转码页面
video-cli copy-to-hdd  # 直接进入复制页面
video-cli -v           # 查看版本
video-cli -h           # 查看帮助
```

## 菜单

```
欢迎使用视频工具箱
---------------------------------
1) 裁剪视频片段(无损,不重新编码) (cut-video)
2) 硬件转码为 H.265(体积更小) (to-h265)
3) 复制到机械硬盘(串行拷贝,保持轨道顺滑) (copy-to-hdd)
4) 退出程序
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
