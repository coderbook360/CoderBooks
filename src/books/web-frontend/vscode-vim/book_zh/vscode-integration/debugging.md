# 调试集成：Debug 的键盘操作

调试是开发的重要环节。VSCode 的调试器功能强大，配合 Vim 键位可以完全脱离鼠标进行调试。

## 启动调试

| 快捷键 | 效果 |
|--------|------|
| `F5` | 启动调试 / 继续执行 |
| `Ctrl+F5` | 无调试运行 |
| `Shift+F5` | 停止调试 |
| `Ctrl+Shift+F5` | 重启调试 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "d", "c"],
  "commands": ["workbench.action.debug.continue"]
},
{
  "before": ["<leader>", "d", "s"],
  "commands": ["workbench.action.debug.stop"]
},
{
  "before": ["<leader>", "d", "r"],
  "commands": ["workbench.action.debug.restart"]
}
```

- `\dc`：继续执行（Continue）
- `\ds`：停止调试（Stop）
- `\dr`：重启调试（Restart）

## 断点操作

### 切换断点

| 快捷键 | 效果 |
|--------|------|
| `F9` | 切换断点 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "d", "b"],
  "commands": ["editor.debug.action.toggleBreakpoint"]
}
```

`\db` 在当前行切换断点（toggle Breakpoint）。

### 条件断点

右键断点可以设置条件。或者命令：

```
> Debug: Add Conditional Breakpoint
```

输入条件表达式，只有条件满足时才会暂停。

### 日志点

日志点不会暂停执行，只是输出日志：

```
> Debug: Add Logpoint
```

输入日志表达式，如 `User: {user.name}`。

### 管理断点

```json
{
  "before": ["<leader>", "d", "a"],
  "commands": ["workbench.debug.action.toggleBreakpointsActivatedAction"]
}
```

`\da` 激活/禁用所有断点。

## 单步执行

| 快捷键 | 效果 |
|--------|------|
| `F10` | Step Over（单步跳过） |
| `F11` | Step Into（单步进入） |
| `Shift+F11` | Step Out（单步跳出） |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "d", "n"],
  "commands": ["workbench.action.debug.stepOver"]
},
{
  "before": ["<leader>", "d", "i"],
  "commands": ["workbench.action.debug.stepInto"]
},
{
  "before": ["<leader>", "d", "o"],
  "commands": ["workbench.action.debug.stepOut"]
}
```

- `\dn`：Step Over（Next）
- `\di`：Step Into
- `\do`：Step Out

### 运行到光标

```json
{
  "before": ["<leader>", "d", "l"],
  "commands": ["editor.debug.action.runToCursor"]
}
```

`\dl` 运行到光标位置，不需要设置临时断点。

## 调试视图

### 打开调试侧边栏

```json
{
  "before": ["<leader>", "d", "v"],
  "commands": ["workbench.view.debug"]
}
```

`\dv` 打开调试视图。

调试视图包含：
- **变量**：当前作用域的变量
- **监视**：自定义监视表达式
- **调用堆栈**：函数调用链
- **断点**：所有断点列表

### 在视图中导航

打开调试视图后，用 `j/k` 上下移动，`Enter` 展开/折叠。

## 调试控制台

调试控制台（Debug Console）可以在断点暂停时执行表达式：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+Y` | 打开调试控制台 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "d", "e"],
  "commands": ["workbench.debug.action.toggleRepl"]
}
```

`\de` 打开调试控制台（Evaluate）。

在控制台中输入表达式，查看当前上下文中的值。

## 悬浮查看变量

调试暂停时，把光标移到变量上，会显示变量值。

或者用快捷键：

```json
{
  "before": ["g", "h"],
  "commands": ["editor.action.showHover"]
}
```

`gh` 显示悬浮信息（与非调试时一样）。

## 监视表达式

在调试视图的"监视"区域添加表达式：

```
> Debug: Add to Watch
```

监视表达式在每次暂停时更新。

## 调试配置

调试配置在 `.vscode/launch.json` 中。

### 常见配置

**Node.js 项目**：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/index.js"
    }
  ]
}
```

**Chrome 调试前端**：

```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Launch Chrome",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/src"
}
```

### 快速创建配置

```
> Debug: Add Configuration
```

VSCode 会提供模板选择。

## 实战场景

### 场景 1：调试 API 请求

```
1. 在请求处理函数设置断点 \db
2. 发送请求触发断点
3. F10 单步执行，观察变量
4. 调试控制台输入表达式验证
5. F5 继续执行
```

### 场景 2：追踪 bug

```
1. 在可疑代码附近设置断点
2. F5 启动调试
3. 触发 bug 场景
4. 检查调用堆栈
5. 逐步 Step Into 找到问题根源
```

### 场景 3：测试边界条件

使用条件断点：

```
1. \db 设置断点
2. 右键断点 → 编辑条件
3. 输入条件：items.length > 100
4. 只有满足条件时才暂停
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "d", "b"],
      "commands": ["editor.debug.action.toggleBreakpoint"]
    },
    {
      "before": ["<leader>", "d", "c"],
      "commands": ["workbench.action.debug.continue"]
    },
    {
      "before": ["<leader>", "d", "s"],
      "commands": ["workbench.action.debug.stop"]
    },
    {
      "before": ["<leader>", "d", "r"],
      "commands": ["workbench.action.debug.restart"]
    },
    {
      "before": ["<leader>", "d", "n"],
      "commands": ["workbench.action.debug.stepOver"]
    },
    {
      "before": ["<leader>", "d", "i"],
      "commands": ["workbench.action.debug.stepInto"]
    },
    {
      "before": ["<leader>", "d", "o"],
      "commands": ["workbench.action.debug.stepOut"]
    },
    {
      "before": ["<leader>", "d", "l"],
      "commands": ["editor.debug.action.runToCursor"]
    },
    {
      "before": ["<leader>", "d", "v"],
      "commands": ["workbench.view.debug"]
    },
    {
      "before": ["<leader>", "d", "e"],
      "commands": ["workbench.debug.action.toggleRepl"]
    },
    {
      "before": ["<leader>", "d", "a"],
      "commands": ["workbench.debug.action.toggleBreakpointsActivatedAction"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 掌握断点的键盘操作
- ✅ 学会单步执行命令
- ✅ 了解调试视图和控制台
- ✅ 配置完整的调试快捷键

**效率提升**：调试全程键盘操作，专注于代码逻辑而非鼠标点击。
