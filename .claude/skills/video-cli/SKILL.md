---
name: video-cli
description: video-cli 项目规范与开发经验. 当任务涉及修改/扩展本项目的界面, 命令, 组件, hooks, 测试与验证时使用. Ink 通用 API 参考见 ink skill.
---

# video-cli 项目规范与经验

终端视频工具箱, 基于 Ink 构建的交互式 CLI. 技术栈: `ink@7.1.1` + `react@19.2.8` + `meow`, ESM 模式, `tsx` 开发 / `vite` 构建.

## 架构与目录

```
src/cli.tsx          meow 解析子命令 -> render(<App initialScreen={...}/>, {alternateScreen, concurrent})
src/app.tsx          顶层: useScreenRouter 路由 + useDependencies 依赖检查 + useWindowSize 撑满终端
src/components/       通用组件 (Menu / TextInput / BackToMenu)
src/hooks/            通用 hooks (useScreenRouter / useValidatedInput / useYnConfirm / useMp4Files / useDependencies)
src/commands/<cmd>/   每个命令一个目录: index.tsx (纯渲染) + use<Cmd>.ts (状态机逻辑)
src/lib/              ffmpeg / disk / files / deps 等与界面无关的逻辑
```

- 每个命令页面是 **step 状态机**: `loading -> select-file -> checking-codec -> choose-mode -> confirm-overwrite -> running -> done/error`. `use<Cmd>()` hook 持有状态, `index.tsx` 按 `step.type` 分支渲染纯展示, 不跑副作用.
- 页面组件 props 只有 `{ onBack }` (回菜单); 映射在 `app.tsx` 的 `screenComponentMap`.
- 新增子命令需同步注册**三处**: `cli.tsx` 的 `COMMANDS`, `app.tsx` 的 `screenComponentMap`, `useScreenRouter.ts` 的 `SCREEN_KEYS`.
- 文件后缀显式导入 (`./xxx.ts` / `.tsx`), ESM 风格.

## 核心模式

### 输入处理 (项目关键模式)
- **TextInput** (`src/components/TextInput.tsx`): 用 `useInput` + `useState` 自研, `submitted` 状态锁住后续输入; `key.return` 提交, `key.backspace || key.delete` 退格, 非 ctrl/meta 字符追加; `isActive: !submitted`. 渲染用 `{value}█` 光标, placeholder 仅空值时显示.
- **useValidatedInput** (`src/hooks/useValidatedInput.ts`): `reject(msg)` 显示错误并 `inputKey + 1` 重置输入框; `accept()` 清错误并**递增 `key` 强制 TextInput 重新挂载** - 否则 React 复用同位置实例, 新输入框继承 `submitted=true` 和旧值, 导致无法继续输入 (历史上出现过"输入框卡死"bug). **任何"下一步新输入框"都必须带 `key={inputKey}`**.
- **useYnConfirm** (`src/hooks/useYnConfirm.ts`): 基于 useValidatedInput 的 y/n 校验, 合法则回调 onConfirm/onCancel, 否则 reject 提示.
- **Menu** (`src/components/Menu.tsx`): 数字选择, `VALID_KEYS` 白名单校验, 非法输入 reject 提示; 菜单退出键 '4' 在 `useScreenRouter` 里 `process.exit(0)`.

### 全局按键
- `app.tsx` 有全局 `useInput`: 按 `q` 随时退出进程. 测试脚本常依赖此键结束.

## 界面风格约定

- 界面文案为**中文**, 所有标点用**半角** (用户明确要求, 项目最近提交也统一过: `请输入序号: `).
- 颜色语义: `magenta` 标题, `cyan` 信息/引导, `yellow` 警告, `red` 错误, `green` 成功, `gray` 占位/光标.
- 流程提示带 emoji (🎵 🔍 ⚠️ 🚀 ℹ️ ❌), 结束页用 `<BackToMenu message=... color=.../>`.
- 顶层 Box 统一 `borderStyle="classic"` 经典边框 + `padding={1}`, 尺寸撑满 `columns/rows` (useWindowSize).
- 文案中英文混排时按现有风格书写, 不加多余空格.

## 测试与验证

- **验证顺序**: 先 `pnpm typecheck && pnpm lint:check && pnpm fmt:check`; oxfmt 会重排 import 且校验严格, 先 `pnpm fmt` 再 check. 最后做 pty 交互冒烟.
- **交互测试必须用 pty** (stdin 直通管道会报 "Raw mode is not supported"): 用 `script` 包一层, 按键带延迟确保落在对应屏幕:
  ```bash
  ( sleep 1; printf '3'; sleep 0.4; printf '\r'; sleep 1.5; printf 'q' ) | timeout 15 script -qec "pnpm dev" /dev/null
  ```
  输出先 `tr -d '\r'` 再 grep 关键行; 结束用 'q'.
- **容器环境坑**: df 能解析出 `/dev/xxx` (来自 /proc/mounts) 但 lsblk 看不到块设备 ("not a block device"), 路径多为 overlay (返回 not-disk). fail-closed 分支可测, 完整 happy path 需真实 Linux 桌面验证.
- **工具探测**: dd/df/lsblk/ionice 用 `--version` 探测, ffmpeg/ffprobe 用 `-version`; GNU df 的 `--output=source` 与 `-P` 互斥.
- 运行: `pnpm dev` (tsx 直跑), `pnpm build && pnpm preview` (产物 dist/cli.mjs, 入口 `bin` 字段).
- 重命名文件用 `git mv` 保留历史.

## 常见坑清单

1. 忘记给下一步输入框递增 `key` -> 输入框"卡死"无法继续输入 (见 useValidatedInput 注释).
2. 用 `process.stdout.write` 而非 `useStdout().write` 写界面 -> 与 Ink 输出冲突错乱.
3. 中文/emoji 字符宽度: 布局用 `useWindowSize`, 不要硬编码宽度.
4. `useEffect` 里更新状态导致无限重渲染 - Ink 每帧重绘, 状态更新要谨慎.
5. 新增子命令遗漏 `cli.tsx` / `app.tsx` / `useScreenRouter.ts` 三处注册.
6. ffmpeg 长任务期间保持 `step.type === 'running'` 渲染, 不要在渲染层跑副作用.
7. 界面文案出现全角标点 (会被用户拒收, 半角是明确要求).
