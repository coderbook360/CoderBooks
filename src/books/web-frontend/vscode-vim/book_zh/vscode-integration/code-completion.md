# 代码补全：与 Vim 的协同

代码补全是编辑器的核心功能之一。VSCode 的 IntelliSense 非常强大，但在 Vim 模式下需要一些配置才能顺畅使用。

## 默认的补全体验

VSCode 默认在你输入时自动显示补全建议。在 Vim 模式下：

- Normal 模式不触发补全
- Insert 模式正常触发
- 用 `Ctrl+Space` 手动触发

## 接受补全

| 按键 | 效果 |
|------|------|
| `Tab` | 接受建议（默认） |
| `Enter` | 接受建议 |
| `Ctrl+Y` | 接受建议（Vim 习惯） |
| `Escape` | 关闭建议 |

如果你习惯 Vim 的 `Ctrl+Y`，它已经可用。

## 导航补全列表

| 按键 | 效果 |
|------|------|
| `Ctrl+N` 或 `↓` | 下一项 |
| `Ctrl+P` 或 `↑` | 上一项 |

`Ctrl+N` 和 `Ctrl+P` 是 Vim 的补全导航键，在 VSCode 中同样有效。

## Tab 补全 vs Enter 补全

这是一个个人偏好问题：

- **Tab 派**：Tab 接受，Enter 换行
- **Enter 派**：Enter 接受，Tab 缩进

配置 Tab 作为主要接受键：

```json
{
  "editor.tabCompletion": "on",
  "editor.acceptSuggestionOnEnter": "off"
}
```

配置 Enter 作为接受键：

```json
{
  "editor.acceptSuggestionOnEnter": "on"
}
```

## 补全触发

### 自动触发

```json
{
  "editor.quickSuggestions": {
    "other": true,
    "comments": false,
    "strings": false
  },
  "editor.suggestOnTriggerCharacters": true
}
```

这让编辑器在代码中自动触发建议，但在注释和字符串中不触发。

### 触发字符

某些字符会触发特殊补全：

- `.` → 对象成员补全
- `/` → 路径补全
- `<` → HTML/JSX 标签补全

### 手动触发

```
Ctrl+Space    触发补全
```

当自动补全没出现，或者你想看看有什么选项时使用。

## 代码片段

VSCode 的代码片段功能强大。输入触发词，选择片段，然后用 Tab 在占位符之间跳转。

### 常见片段

| 触发词 | 片段 |
|--------|------|
| `log` | `console.log()` |
| `for` | for 循环 |
| `if` | if 语句 |
| `fn` | 函数定义（取决于扩展） |

### 片段导航

接受片段后：
- `Tab`：跳转到下一个占位符
- `Shift+Tab`：跳转到上一个占位符
- `Escape`：退出片段模式

### 在 Insert 模式中使用片段

片段展开后，你仍在 Insert 模式。填完所有占位符后按 `Escape` 回到 Normal 模式。

## IntelliSense 配置

### 补全预选

```json
{
  "editor.suggestSelection": "first"
}
```

选项：
- `first`：总是预选第一项
- `recentlyUsed`：预选最近使用的
- `recentlyUsedByPrefix`：根据前缀预选最近使用的

### 补全详情

```json
{
  "editor.suggest.showDetails": true,
  "editor.suggest.maxVisibleSuggestions": 12
}
```

显示更多建议和详细信息。

### 导入建议

```json
{
  "editor.suggest.showImports": true,
  "javascript.suggest.autoImports": true,
  "typescript.suggest.autoImports": true
}
```

选择一个未导入的符号时，自动添加导入语句。

## Vim 模式下的冲突处理

### Escape 问题

在补全列表打开时，`Escape` 既关闭补全又退出 Insert 模式。

如果你想让 `Escape` 只关闭补全而不退出 Insert 模式：

```json
{
  "key": "escape",
  "command": "hideSuggestWidget",
  "when": "suggestWidgetVisible"
}
```

但这会导致按两次 `Escape` 才能回到 Normal 模式。通常接受默认行为更好。

### Ctrl+C 作为 Escape

Vim 中 `Ctrl+C` 是另一个退出 Insert 模式的方式。确保它在补全时也能工作：

```json
{
  "vim.handleKeys": {
    "<C-c>": true
  }
}
```

## 签名帮助

函数调用时显示参数提示：

```
Ctrl+Shift+Space    显示参数提示
```

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "a"],
  "commands": ["editor.action.triggerParameterHints"]
}
```

## 补全策略

### 策略 1：快速接受

大多数时候，第一个建议就是你想要的。快速接受：

```
输入几个字符 → Tab → 继续
```

### 策略 2：浏览选择

不确定时，浏览列表：

```
Ctrl+Space → Ctrl+N/P 浏览 → Tab 接受
```

### 策略 3：片段优先

利用片段快速生成代码骨架：

```
log → Tab → 输入内容 → Escape
```

## 配置汇总

```json
{
  "editor.quickSuggestions": {
    "other": true,
    "comments": false,
    "strings": false
  },
  "editor.suggestOnTriggerCharacters": true,
  "editor.acceptSuggestionOnEnter": "on",
  "editor.tabCompletion": "on",
  "editor.suggest.showDetails": true,
  "editor.suggestSelection": "first",
  "javascript.suggest.autoImports": true,
  "typescript.suggest.autoImports": true
}
```

Vim 配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "a"],
      "commands": ["editor.action.triggerParameterHints"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 理解 Vim 模式下的补全触发和接受
- ✅ 掌握 Ctrl+N/P 导航和 Tab 接受
- ✅ 学会配置补全行为
- ✅ 了解代码片段的使用

**效率提升**：补全是 IDE 的核心优势，配合 Vim 键位可以流畅地输入代码。
