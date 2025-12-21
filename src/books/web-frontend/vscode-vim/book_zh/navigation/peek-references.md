# Peek 引用：不跳转的代码预览

"跳转-查看-返回"是常见的代码阅读模式。但有时候，你只想快速瞥一眼定义或引用，不想打断当前的编辑流。Peek 功能为此而生。

## Peek 是什么

Peek 在当前编辑器内打开一个内嵌窗口，显示目标代码。你可以查看、甚至编辑，然后按 `Escape` 关闭，光标仍在原位。

## Peek Definition

预览定义，不离开当前位置：

```json
{
  "before": ["<leader>", "p", "d"],
  "commands": ["editor.action.peekDefinition"]
}
```

### 使用场景

```typescript
const user = getUserById(id);
//           ↑ \pd 预览 getUserById 的实现
```

Peek 窗口打开后：
- 可以查看完整的函数实现
- 可以用 `j/k` 滚动
- 按 `Escape` 关闭

## Peek References

预览所有引用：

```json
{
  "before": ["<leader>", "p", "r"],
  "commands": ["editor.action.referenceSearch.trigger"]
}
```

这比 `gr` 更直观——在内嵌窗口中显示所有引用，可以逐个浏览。

### 使用场景

想知道一个函数被哪些地方调用：

```
1. 光标在函数名上
2. \pr 打开引用预览
3. 左侧列表显示所有调用位置
4. 点击列表项在右侧预览
5. 按 Escape 关闭
```

## Peek Type Definition

预览类型定义：

```json
{
  "before": ["<leader>", "p", "t"],
  "commands": ["editor.action.peekTypeDefinition"]
}
```

对于类型推断的变量特别有用：

```typescript
const config = getConfig();
//    ↑ \pt 看看 config 是什么类型
```

## Peek Implementation

预览接口的实现：

```json
{
  "before": ["<leader>", "p", "i"],
  "commands": ["editor.action.peekImplementation"]
}
```

```typescript
interface Logger {
  log(message: string): void;
}
// ↑ \pi 查看所有实现了 Logger 接口的类
```

## Peek vs 跳转

| 操作 | 命令 | 效果 |
|------|------|------|
| 跳转到定义 | `gd` | 离开当前文件，跳转过去 |
| Peek 定义 | `\pd` | 在当前位置内嵌预览 |
| 跳转到引用 | `gr` | 打开引用面板 |
| Peek 引用 | `\pr` | 在当前位置内嵌预览 |

**什么时候用跳转**：
- 需要在目标位置进行修改
- 需要深入阅读，可能继续跳转

**什么时候用 Peek**：
- 只是快速确认一下
- 查看函数签名或类型
- 不想打断当前编辑流

## Peek 窗口内的操作

Peek 窗口打开后，它就是一个迷你编辑器：

- `j/k`：上下滚动
- `/`：搜索
- `i`：进入 Insert 模式（可以编辑！）
- `Escape`：关闭 Peek 窗口
- `Enter`：跳转到该位置（关闭 Peek 并跳转）

**在 Peek 窗口中编辑**是一个强大的技巧。你可以预览定义，发现需要小改动，直接改完，然后关闭。

## 引用列表导航

在 Peek 引用窗口中，左侧有引用列表：

- `Ctrl+Shift+]`：跳转到下一个引用
- `Ctrl+Shift+[`：跳转到上一个引用

或者配置更顺手的快捷键：

```json
{
  "key": "ctrl+j",
  "command": "goToNextReference",
  "when": "referenceSearchVisible"
},
{
  "key": "ctrl+k",
  "command": "goToPreviousReference",
  "when": "referenceSearchVisible"
}
```

现在可以用 `Ctrl+J/K` 在引用之间导航。

## 实战工作流

### 工作流 1：审查函数调用

```
1. 在函数定义上 \pr
2. 浏览左侧引用列表
3. 点击感兴趣的调用
4. 在右侧预览上下文
5. Escape 关闭
```

### 工作流 2：快速确认类型

```
1. 在变量上 \pt
2. 看到类型定义
3. Escape 关闭
4. 继续编辑
```

### 工作流 3：Peek 中修改

```
1. 在函数调用上 \pd
2. 发现函数需要加个参数
3. 在 Peek 窗口中 i 进入编辑
4. 修改函数签名
5. Escape 关闭
6. 回到原位继续
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "p", "d"],
      "commands": ["editor.action.peekDefinition"]
    },
    {
      "before": ["<leader>", "p", "r"],
      "commands": ["editor.action.referenceSearch.trigger"]
    },
    {
      "before": ["<leader>", "p", "t"],
      "commands": ["editor.action.peekTypeDefinition"]
    },
    {
      "before": ["<leader>", "p", "i"],
      "commands": ["editor.action.peekImplementation"]
    }
  ]
}
```

在 keybindings.json 中添加引用导航：

```json
{
  "key": "ctrl+j",
  "command": "goToNextReference",
  "when": "referenceSearchVisible"
},
{
  "key": "ctrl+k",
  "command": "goToPreviousReference",
  "when": "referenceSearchVisible"
}
```

## 助记

所有 Peek 命令都以 `\p` 开头：

- `\pd`：Peek **D**efinition
- `\pr`：Peek **R**eferences
- `\pt`：Peek **T**ype
- `\pi`：Peek **I**mplementation

---

**本章收获**：
- ✅ 理解 Peek 与跳转的区别
- ✅ 掌握四种 Peek 操作
- ✅ 学会在 Peek 窗口中导航和编辑
- ✅ 配置完整的 Peek 快捷键

**效率提升**：快速预览不打断编辑流，保持专注的同时获取需要的信息。
