# 自定义命令与任务

把常用操作封装成命令和任务，进一步提升效率。

## VSCode 命令

### 什么是命令

VSCode 中几乎所有操作都是命令（Command）。通过命令面板（Ctrl+Shift+P）可以执行任何命令。

### 在 Vim 映射中使用命令

```json
{
  "before": ["<leader>", "x"],
  "commands": ["commandId"]
}
```

### 查找命令 ID

```
1. Ctrl+Shift+P 打开命令面板
2. 输入想要的功能
3. 点击右侧齿轮 → "Copy Command ID"
```

或在 `keybindings.json` 中按 Ctrl+K Ctrl+K 录制快捷键。

## 常用命令映射

### 编辑器操作

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 格式化
    { "before": ["<leader>", "="], "commands": ["editor.action.formatDocument"] },
    
    // 注释
    { "before": ["<leader>", "/"], "commands": ["editor.action.commentLine"] },
    
    // 折叠
    { "before": ["z", "c"], "commands": ["editor.fold"] },
    { "before": ["z", "o"], "commands": ["editor.unfold"] },
    { "before": ["z", "M"], "commands": ["editor.foldAll"] },
    { "before": ["z", "R"], "commands": ["editor.unfoldAll"] },
    
    // 排序行
    { "before": ["<leader>", "s", "l"], "commands": ["editor.action.sortLinesAscending"] }
  ]
}
```

### 文件操作

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 新建文件
    { "before": ["<leader>", "n", "f"], "commands": ["workbench.action.files.newUntitledFile"] },
    
    // 另存为
    { "before": ["<leader>", "s", "a"], "commands": ["workbench.action.files.saveAs"] },
    
    // 在浏览器中打开文件夹
    { "before": ["<leader>", "o", "f"], "commands": ["revealFileInOS"] },
    
    // 复制文件路径
    { "before": ["<leader>", "y", "p"], "commands": ["copyFilePath"] }
  ]
}
```

### 重构操作

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 重命名符号
    { "before": ["<leader>", "r", "n"], "commands": ["editor.action.rename"] },
    
    // 提取函数
    { "before": ["<leader>", "r", "f"], "commands": ["editor.action.refactor", { "kind": "refactor.extract.function" }] },
    
    // 提取变量
    { "before": ["<leader>", "r", "v"], "commands": ["editor.action.refactor", { "kind": "refactor.extract.constant" }] }
  ]
}
```

## 带参数的命令

### 命令参数

某些命令接受参数：

```json
{
  "before": ["<leader>", "snippet"],
  "commands": [
    {
      "command": "editor.action.insertSnippet",
      "args": { "snippet": "console.log('$1');" }
    }
  ]
}
```

### 组合命令

执行多个命令：

```json
{
  "before": ["<leader>", "w", "q"],
  "commands": [
    "workbench.action.files.save",
    "workbench.action.closeActiveEditor"
  ]
}
```

## VSCode Tasks

### 什么是任务

任务是可执行的外部命令，通常用于构建、测试、运行等。

### 创建任务

`.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: dev",
      "type": "npm",
      "script": "dev",
      "group": "build"
    },
    {
      "label": "npm: test",
      "type": "npm",
      "script": "test",
      "group": "test"
    }
  ]
}
```

### 运行任务

```
Ctrl+Shift+P → "Tasks: Run Task"
```

### 映射任务

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "r", "b"],
      "commands": ["workbench.action.tasks.build"]
    },
    {
      "before": ["<leader>", "r", "t"],
      "commands": ["workbench.action.tasks.test"]
    }
  ]
}
```

## 自定义任务

### Shell 任务

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "运行当前文件",
      "type": "shell",
      "command": "node ${file}",
      "group": "none"
    },
    {
      "label": "Git 状态",
      "type": "shell",
      "command": "git status"
    }
  ]
}
```

### 任务变量

| 变量 | 含义 |
|------|------|
| `${file}` | 当前文件路径 |
| `${fileBasename}` | 文件名 |
| `${fileDirname}` | 文件目录 |
| `${workspaceFolder}` | 工作区路径 |
| `${lineNumber}` | 当前行号 |

### 复杂任务示例

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "TypeScript: 监视编译",
      "type": "shell",
      "command": "npx tsc --watch",
      "isBackground": true,
      "problemMatcher": "$tsc-watch"
    },
    {
      "label": "运行测试（当前文件）",
      "type": "shell",
      "command": "npx jest ${fileBasename}",
      "group": "test"
    }
  ]
}
```

## 用户代码片段扩展

### 使用扩展增强

安装 "multi-command" 扩展执行复杂操作：

```json
{
  "multiCommand.commands": [
    {
      "command": "multiCommand.saveAndFormat",
      "sequence": [
        "editor.action.formatDocument",
        "workbench.action.files.save"
      ]
    }
  ]
}
```

然后映射：

```json
{
  "before": ["<leader>", "w"],
  "commands": ["multiCommand.saveAndFormat"]
}
```

## 工作区特定配置

### .vscode/settings.json

项目特定的 Vim 配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "r"],
      "commands": ["workbench.action.tasks.runTask", { "args": "项目特定任务" }]
    }
  ]
}
```

### 不同项目不同配置

- React 项目：组件相关命令
- Node.js 项目：服务器相关命令
- Python 项目：虚拟环境相关命令

## 宏与录制

### VSCode 宏录制

使用 "macros" 扩展：

```json
{
  "macros": {
    "duplicateAndComment": [
      "editor.action.copyLinesDownAction",
      "cursorUp",
      "editor.action.commentLine"
    ]
  }
}
```

### Vim 宏 vs VSCode 宏

| 特性 | Vim 宏 | VSCode 宏 |
|------|--------|-----------|
| 录制 | qa...q | 预定义 |
| 内容 | 按键序列 | 命令序列 |
| 持久化 | 不持久 | 配置保存 |
| 灵活性 | 高 | 中 |

## 完整命令配置示例

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // === 文件操作 ===
    { "before": ["<leader>", "w"], "commands": ["workbench.action.files.save"] },
    { "before": ["<leader>", "q"], "commands": ["workbench.action.closeActiveEditor"] },
    { "before": ["<leader>", "n"], "commands": ["workbench.action.files.newUntitledFile"] },
    
    // === 编辑操作 ===
    { "before": ["<leader>", "="], "commands": ["editor.action.formatDocument"] },
    { "before": ["<leader>", "/"], "commands": ["editor.action.commentLine"] },
    
    // === 搜索 ===
    { "before": ["<leader>", "f", "f"], "commands": ["workbench.action.quickOpen"] },
    { "before": ["<leader>", "f", "g"], "commands": ["workbench.action.findInFiles"] },
    { "before": ["<leader>", "f", "s"], "commands": ["workbench.action.gotoSymbol"] },
    
    // === 构建/运行 ===
    { "before": ["<leader>", "r", "b"], "commands": ["workbench.action.tasks.build"] },
    { "before": ["<leader>", "r", "t"], "commands": ["workbench.action.tasks.test"] },
    { "before": ["<leader>", "r", "r"], "commands": ["workbench.action.tasks.runTask"] },
    
    // === 重构 ===
    { "before": ["<leader>", "r", "n"], "commands": ["editor.action.rename"] },
    { "before": ["<leader>", "a"], "commands": ["editor.action.quickFix"] },
    
    // === 折叠 ===
    { "before": ["z", "c"], "commands": ["editor.fold"] },
    { "before": ["z", "o"], "commands": ["editor.unfold"] },
    { "before": ["z", "M"], "commands": ["editor.foldAll"] },
    { "before": ["z", "R"], "commands": ["editor.unfoldAll"] },
    
    // === 工具 ===
    { "before": ["<leader>", "`"], "commands": ["workbench.action.terminal.toggleTerminal"] },
    { "before": ["<leader>", "e"], "commands": ["workbench.view.explorer"] },
    { "before": ["<leader>", "p"], "commands": ["workbench.action.showCommands"] }
  ],
  
  "vim.visualModeKeyBindingsNonRecursive": [
    // 可视模式下的命令
    { "before": ["<leader>", "/"], "commands": ["editor.action.commentLine"] },
    { "before": ["<leader>", "="], "commands": ["editor.action.formatSelection"] }
  ]
}
```

---

**本章收获**：
- ✅ 掌握 VSCode 命令系统
- ✅ 学会创建自定义任务
- ✅ 配置项目特定的命令
- ✅ 组合命令实现复杂操作

**效率提升**：把常用操作封装成一键触发，减少重复步骤。
