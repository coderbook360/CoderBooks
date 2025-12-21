# 底部面板与输出视图

底部面板包含问题、输出、调试控制台、终端等视图，掌握键盘操作可快速访问各类信息。

## 面板基础操作

### 切换面板显示

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "p"],
      "commands": ["workbench.action.togglePanel"]
    }
  ]
}
```

默认快捷键：`Ctrl+J`

### 最大化面板

```json
{
  "before": ["<leader>", "P"],
  "commands": ["workbench.action.toggleMaximizedPanel"]
}
```

## 切换面板视图

### 问题面板

```json
{
  "before": ["<leader>", "d", "d"],
  "commands": ["workbench.actions.view.problems"]
}
```

### 输出面板

```json
{
  "before": ["<leader>", "o", "o"],
  "commands": ["workbench.action.output.toggleOutput"]
}
```

### 调试控制台

```json
{
  "before": ["<leader>", "d", "c"],
  "commands": ["workbench.debug.action.toggleRepl"]
}
```

### 终端面板

```json
{
  "before": ["<leader>", "t", "t"],
  "commands": ["workbench.action.terminal.toggleTerminal"]
}
```

## 输出视图管理

### 切换输出通道

输出视图可以显示不同扩展的输出：

- Git
- TypeScript
- ESLint
- 扩展主机
- 任务

### 选择输出通道

```json
{
  "before": ["<leader>", "o", "s"],
  "commands": ["workbench.action.showOutputChannels"]
}
```

### 清除输出

```json
{
  "before": ["<leader>", "o", "c"],
  "commands": ["workbench.output.action.clearOutput"]
}
```

## 问题面板导航

### 在问题间跳转

```json
{
  "before": ["]", "d"],
  "commands": ["editor.action.marker.next"]
},
{
  "before": ["[", "d"],
  "commands": ["editor.action.marker.prev"]
}
```

### 筛选问题

问题面板支持按以下方式筛选：
- 错误
- 警告
- 信息
- 文件

## 调试控制台使用

### 打开调试控制台

```json
{
  "before": ["<leader>", "d", "t"],
  "commands": ["workbench.debug.action.toggleRepl"]
}
```

### 控制台功能

- 执行表达式
- 查看变量值
- 调用函数

## 面板布局

### 移动面板位置

可以将面板移动到：
- 底部（默认）
- 右侧
- 左侧

```json
{
  "workbench.panel.defaultLocation": "bottom"
}
```

### 调整面板大小

```json
{
  "before": ["<leader>", "+"],
  "commands": ["workbench.action.increaseViewSize"]
},
{
  "before": ["<leader>", "-"],
  "commands": ["workbench.action.decreaseViewSize"]
}
```

## 工作流示例

### 场景 1：查看构建输出

```
\oo         打开输出面板
\os         选择 "Tasks" 通道
            查看构建输出
```

### 场景 2：调试时查看日志

```
\ds         启动调试
\dt         打开调试控制台
            查看日志输出
            输入表达式检查值
```

### 场景 3：处理问题

```
\dd         打开问题面板
j/k         浏览问题
Enter       跳转到问题
\ca         快速修复
```

## 面板快捷键汇总

| 键位 | 操作 |
|------|------|
| `\p` | 切换面板 |
| `\P` | 最大化面板 |
| `\dd` | 问题面板 |
| `\oo` | 输出面板 |
| `\os` | 选择输出通道 |
| `\oc` | 清除输出 |
| `\dt` | 调试控制台 |
| `\tt` | 终端面板 |
| `]d` | 下一个问题 |
| `[d` | 上一个问题 |

## 配置优化

```json
{
  // 面板位置
  "workbench.panel.defaultLocation": "bottom",
  
  // 自动隐藏面板
  "workbench.panel.opensMaximized": "never",
  
  // 输出视图配置
  "output.smartScroll.enabled": true
}
```

---

**效率提升**：底部面板键盘化操作，问题、输出、调试信息快速访问，无需鼠标点击。
