# 调试断点与 Vim 协作

调试是开发过程中的重要环节，将断点管理和调试操作与 Vim 键位结合，可实现流畅的调试体验。

## 断点管理

### 切换断点

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "d", "b"],
      "commands": ["editor.debug.action.toggleBreakpoint"]
    }
  ]
}
```

使用：光标在目标行 → `\db` → 切换断点。

### 条件断点

```json
{
  "before": ["<leader>", "d", "c"],
  "commands": ["editor.debug.action.conditionalBreakpoint"]
}
```

添加带条件的断点，只在条件满足时暂停。

### 日志断点

```json
{
  "before": ["<leader>", "d", "l"],
  "commands": ["editor.debug.action.toggleLogPoint"]
}
```

不暂停程序，只输出日志信息。

## 调试控制

### 启动调试

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 启动调试
    {
      "before": ["<leader>", "d", "s"],
      "commands": ["workbench.action.debug.start"]
    },
    // 停止调试
    {
      "before": ["<leader>", "d", "x"],
      "commands": ["workbench.action.debug.stop"]
    },
    // 重启调试
    {
      "before": ["<leader>", "d", "r"],
      "commands": ["workbench.action.debug.restart"]
    }
  ]
}
```

### 执行控制

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 继续执行
    {
      "before": ["<leader>", "d", "c"],
      "commands": ["workbench.action.debug.continue"]
    },
    // 单步跳过
    {
      "before": ["<leader>", "d", "n"],
      "commands": ["workbench.action.debug.stepOver"]
    },
    // 单步进入
    {
      "before": ["<leader>", "d", "i"],
      "commands": ["workbench.action.debug.stepInto"]
    },
    // 单步跳出
    {
      "before": ["<leader>", "d", "o"],
      "commands": ["workbench.action.debug.stepOut"]
    }
  ]
}
```

## 调试视图

### 打开调试视图

```json
{
  "before": ["<leader>", "d", "v"],
  "commands": ["workbench.view.debug"]
}
```

### 调试控制台

```json
{
  "before": ["<leader>", "d", "t"],
  "commands": ["workbench.debug.action.toggleRepl"]
}
```

## 断点导航

### 在断点间跳转

```json
{
  "before": ["]", "b"],
  "commands": ["editor.debug.action.goToNextBreakpoint"]
},
{
  "before": ["[", "b"],
  "commands": ["editor.debug.action.goToPreviousBreakpoint"]
}
```

### 查看所有断点

```json
{
  "before": ["<leader>", "d", "B"],
  "commands": ["workbench.debug.action.focusBreakpointsView"]
}
```

## 调试工作流

### 场景 1：快速调试

```
\db         在当前行设置断点
\ds         启动调试
            程序暂停
\dn         单步跳过
\di         单步进入
\do         单步跳出
\dc         继续执行
\dx         停止调试
```

### 场景 2：条件调试

```
\dc         设置条件断点
            输入条件：i > 10
\ds         启动调试
            只在条件满足时暂停
```

### 场景 3：问题排查

```
1. 在可疑代码处 \db 设置断点
2. \ds 启动调试
3. 检查变量值
4. \dn 单步执行观察
5. 找到问题后 \db 移除断点
```

## 变量检查

### 悬停查看变量

调试暂停时，将光标移到变量上可查看值。

### 添加监视

在调试视图的监视面板中添加表达式。

### 调试控制台求值

在调试控制台中输入表达式查看结果。

## 调试配置

`launch.json` 示例：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Current File",
      "type": "node",
      "request": "launch",
      "program": "${file}",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

## 键位总结

| 键位 | 操作 |
|------|------|
| `\db` | 切换断点 |
| `\dc` | 条件断点 |
| `\dl` | 日志断点 |
| `\ds` | 启动调试 |
| `\dx` | 停止调试 |
| `\dr` | 重启调试 |
| `\dn` | 单步跳过 |
| `\di` | 单步进入 |
| `\do` | 单步跳出 |
| `\dv` | 调试视图 |
| `]b` | 下一个断点 |
| `[b` | 上一个断点 |

---

**效率提升**：调试操作全键盘化，断点管理和执行控制一气呵成。
