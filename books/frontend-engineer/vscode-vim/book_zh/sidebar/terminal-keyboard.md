# Terminal 完全键盘管理

集成终端是开发工作流的重要组成部分，完全键盘化的终端管理可大幅提升效率。

## 终端基础操作

### 切换终端

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "t", "t"],
      "commands": ["workbench.action.terminal.toggleTerminal"]
    }
  ]
}
```

默认快捷键：`` Ctrl+` ``

### 新建终端

```json
{
  "before": ["<leader>", "t", "n"],
  "commands": ["workbench.action.terminal.new"]
}
```

### 关闭终端

```json
{
  "before": ["<leader>", "t", "x"],
  "commands": ["workbench.action.terminal.kill"]
}
```

## 终端导航

### 在终端间切换

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 下一个终端
    {
      "before": ["<leader>", "t", "j"],
      "commands": ["workbench.action.terminal.focusNext"]
    },
    // 上一个终端
    {
      "before": ["<leader>", "t", "k"],
      "commands": ["workbench.action.terminal.focusPrevious"]
    }
  ]
}
```

### 聚焦特定终端

```json
{
  "before": ["<leader>", "t", "1"],
  "commands": ["workbench.action.terminal.focusAtIndex1"]
},
{
  "before": ["<leader>", "t", "2"],
  "commands": ["workbench.action.terminal.focusAtIndex2"]
}
```

## 终端分屏

### 水平分屏

```json
{
  "before": ["<leader>", "t", "s"],
  "commands": ["workbench.action.terminal.split"]
}
```

### 切换分屏终端

```json
{
  "before": ["<leader>", "t", "h"],
  "commands": ["workbench.action.terminal.focusPreviousPane"]
},
{
  "before": ["<leader>", "t", "l"],
  "commands": ["workbench.action.terminal.focusNextPane"]
}
```

## 终端与编辑器切换

### 从编辑器到终端

```json
{
  "before": ["<leader>", "t", "t"],
  "commands": ["workbench.action.terminal.focus"]
}
```

### 从终端到编辑器

在终端中：
- `Ctrl+1` 聚焦第一个编辑器组
- 或配置 `jk` 退出（见下文）

### 配置 jk 从终端返回

```json
// keybindings.json
{
  "key": "j k",
  "command": "workbench.action.focusActiveEditorGroup",
  "when": "terminalFocus"
}
```

## 终端内 Vim 模式

### 发送 Escape 键

在终端中使用 `jk` 发送 Escape：

```json
{
  "key": "j k",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b" },
  "when": "terminalFocus"
}
```

## 运行命令

### 快速运行脚本

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 运行 npm dev
    {
      "before": ["<leader>", "r", "d"],
      "commands": [
        "workbench.action.terminal.focus",
        {
          "command": "workbench.action.terminal.sendSequence",
          "args": { "text": "npm run dev\n" }
        }
      ]
    },
    // 运行 npm test
    {
      "before": ["<leader>", "r", "t"],
      "commands": [
        "workbench.action.terminal.focus",
        {
          "command": "workbench.action.terminal.sendSequence",
          "args": { "text": "npm test\n" }
        }
      ]
    }
  ]
}
```

### 运行当前文件

```json
{
  "before": ["<leader>", "r", "f"],
  "commands": ["workbench.action.terminal.runActiveFile"]
}
```

## 终端管理工作流

### 场景 1：开发服务器

```
\tn         新建终端
            输入 npm run dev
\tt         切换回编辑器
            ...开发...
\tt         查看终端输出
```

### 场景 2：多终端工作

```
\tn         终端 1: 开发服务器
\tn         终端 2: 测试
\tn         终端 3: Git 操作
\t1/2/3     快速切换
```

### 场景 3：分屏终端

```
\tn         新建终端
\ts         分屏
            左边运行服务器
\tl         切换到右边
            右边运行测试
```

## 终端配置优化

```json
{
  // 终端字体
  "terminal.integrated.fontFamily": "JetBrains Mono",
  "terminal.integrated.fontSize": 14,
  
  // 滚动缓冲区
  "terminal.integrated.scrollback": 10000,
  
  // 光标样式
  "terminal.integrated.cursorStyle": "line",
  "terminal.integrated.cursorBlinking": true
}
```

## 键位总结

| 键位 | 操作 |
|------|------|
| `\tt` | 切换/聚焦终端 |
| `\tn` | 新建终端 |
| `\tx` | 关闭终端 |
| `\ts` | 分屏终端 |
| `\tj` | 下一个终端 |
| `\tk` | 上一个终端 |
| `\t1/2/3` | 聚焦特定终端 |
| `\rd` | 运行开发服务器 |
| `\rt` | 运行测试 |

---

**效率提升**：终端管理全键盘化，开发、测试、Git 操作多终端并行无缝切换。
