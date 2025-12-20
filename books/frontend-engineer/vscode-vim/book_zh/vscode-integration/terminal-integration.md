# 终端集成：Terminal 的 Vim 化

前端开发离不开终端——运行构建、启动服务、执行测试。VSCode 集成终端方便，但鼠标操作效率不高。本章介绍如何用键盘高效操作终端。

## 打开终端

| 快捷键 | 效果 |
|--------|------|
| `` Ctrl+` `` | 切换终端面板 |
| `` Ctrl+Shift+` `` | 新建终端 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "`"],
  "commands": ["workbench.action.terminal.toggleTerminal"]
}
```

`` \` `` 切换终端面板。

## 终端聚焦切换

在编辑器和终端之间切换：

| 快捷键 | 效果 |
|--------|------|
| `` Ctrl+` `` | 聚焦终端（或切换） |
| `Ctrl+1` | 聚焦第一个编辑器组 |

更精细的控制：

```json
{
  "before": ["<leader>", "t", "f"],
  "commands": ["workbench.action.terminal.focus"]
},
{
  "before": ["<leader>", "t", "t"],
  "commands": ["workbench.action.terminal.toggleTerminal"]
}
```

- `\tf`：聚焦终端
- `\tt`：切换终端显示

## 多终端管理

### 创建和切换

| 快捷键 | 效果 |
|--------|------|
| `` Ctrl+Shift+` `` | 新建终端 |
| `Ctrl+PageDown` | 下一个终端 |
| `Ctrl+PageUp` | 上一个终端 |

配置更顺手的键位：

```json
{
  "before": ["<leader>", "t", "n"],
  "commands": ["workbench.action.terminal.new"]
},
{
  "before": ["<leader>", "t", "j"],
  "commands": ["workbench.action.terminal.focusNext"]
},
{
  "before": ["<leader>", "t", "k"],
  "commands": ["workbench.action.terminal.focusPrevious"]
}
```

- `\tn`：新建终端
- `\tj`：下一个终端
- `\tk`：上一个终端

### 关闭终端

```json
{
  "before": ["<leader>", "t", "x"],
  "commands": ["workbench.action.terminal.kill"]
}
```

`\tx`：关闭当前终端。

### 重命名终端

右键终端标签可以重命名。或者使用命令：

```
> Terminal: Rename
```

给终端起有意义的名字：`dev-server`、`test`、`build`。

## 分屏终端

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+5` | 分割终端 |

分割后可以同时运行多个命令，比如一边跑服务器，一边执行测试。

在分割终端之间切换：

```json
{
  "key": "ctrl+shift+h",
  "command": "workbench.action.terminal.focusPreviousPane",
  "when": "terminalFocus"
},
{
  "key": "ctrl+shift+l",
  "command": "workbench.action.terminal.focusNextPane",
  "when": "terminalFocus"
}
```

## 终端内文本操作

### 复制粘贴

在终端内：

| 操作 | 快捷键 |
|------|--------|
| 复制 | `Ctrl+Shift+C` |
| 粘贴 | `Ctrl+Shift+V` |

注意不是 `Ctrl+C`（那是发送中断信号）。

### 滚动

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+↑` | 向上滚动 |
| `Ctrl+Shift+↓` | 向下滚动 |
| `Shift+PageUp` | 向上翻页 |
| `Shift+PageDown` | 向下翻页 |

### 清屏

```
Ctrl+L    或命令行输入 clear
```

```json
{
  "key": "ctrl+k",
  "command": "workbench.action.terminal.clear",
  "when": "terminalFocus"
}
```

## 运行编辑器中的命令

### 运行选中的代码

选中终端命令，直接发送执行：

```json
{
  "before": ["<leader>", "t", "s"],
  "commands": ["workbench.action.terminal.runSelectedText"]
}
```

在编辑器中选中一段 shell 命令，`\ts` 发送到终端执行。

### 运行当前行

```json
{
  "before": ["<leader>", "t", "l"],
  "commands": ["workbench.action.terminal.runActiveFile"]
}
```

## 终端配置

### 默认 Shell

```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.defaultProfile.linux": "bash",
  "terminal.integrated.defaultProfile.osx": "zsh"
}
```

### 字体和大小

```json
{
  "terminal.integrated.fontSize": 14,
  "terminal.integrated.fontFamily": "Fira Code, monospace",
  "terminal.integrated.lineHeight": 1.2
}
```

### 光标样式

```json
{
  "terminal.integrated.cursorStyle": "line",
  "terminal.integrated.cursorBlinking": true
}
```

## 任务运行器

VSCode 任务可以替代手动在终端输入命令。

### 定义任务

在 `.vscode/tasks.json` 中：

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev",
      "type": "shell",
      "command": "npm run dev",
      "problemMatcher": []
    },
    {
      "label": "build",
      "type": "shell",
      "command": "npm run build",
      "problemMatcher": []
    },
    {
      "label": "test",
      "type": "shell",
      "command": "npm test",
      "problemMatcher": []
    }
  ]
}
```

### 运行任务

```
Ctrl+Shift+P → Tasks: Run Task → 选择任务
```

配置快捷键：

```json
{
  "before": ["<leader>", "r", "t"],
  "commands": ["workbench.action.tasks.runTask"]
}
```

`\rt` 打开任务列表。

## 配置汇总

settings.json：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "`"],
      "commands": ["workbench.action.terminal.toggleTerminal"]
    },
    {
      "before": ["<leader>", "t", "f"],
      "commands": ["workbench.action.terminal.focus"]
    },
    {
      "before": ["<leader>", "t", "n"],
      "commands": ["workbench.action.terminal.new"]
    },
    {
      "before": ["<leader>", "t", "j"],
      "commands": ["workbench.action.terminal.focusNext"]
    },
    {
      "before": ["<leader>", "t", "k"],
      "commands": ["workbench.action.terminal.focusPrevious"]
    },
    {
      "before": ["<leader>", "t", "x"],
      "commands": ["workbench.action.terminal.kill"]
    },
    {
      "before": ["<leader>", "r", "t"],
      "commands": ["workbench.action.tasks.runTask"]
    }
  ]
}
```

keybindings.json：

```json
{
  "key": "ctrl+shift+h",
  "command": "workbench.action.terminal.focusPreviousPane",
  "when": "terminalFocus"
},
{
  "key": "ctrl+shift+l",
  "command": "workbench.action.terminal.focusNextPane",
  "when": "terminalFocus"
}
```

---

**本章收获**：
- ✅ 掌握终端的快速打开和切换
- ✅ 学会多终端和分屏管理
- ✅ 了解终端内的文本操作
- ✅ 配置任务运行器

**效率提升**：终端操作全键盘化，开发-测试-调试的切换更加流畅。
