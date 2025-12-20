# Tab 管理：切换、关闭、重排

当你同时打开 10+ 个文件，如何快速找到目标文件？鼠标点击 Tab？那你可能要花 3-5 秒。用键盘？只需 0.5 秒。

本章将让你完全掌控 VSCode 的 Tab 管理，实现毫秒级切换。

## Tab vs Buffer

在 Vim 术语中，打开的文件叫 Buffer，而 Tab 是视图的组织方式。在 VSCode Vim 中，可以把它们等同理解——每个打开的文件就是一个 Tab。

## 基础切换

### Vim 风格切换

| 命令 | 效果 |
|------|------|
| `gt` | 下一个 Tab |
| `gT` | 上一个 Tab |
| `{n}gt` | 跳到第 n 个 Tab |

这是 Vim 原生的 Tab 切换方式。`3gt` 直接跳到第 3 个 Tab。

### VSCode 原生快捷键

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Tab` | 切换到上一个访问的 Tab |
| `Ctrl+Shift+Tab` | 反向切换 |
| `Ctrl+PageDown` | 下一个 Tab（按顺序） |
| `Ctrl+PageUp` | 上一个 Tab（按顺序） |
| `Alt+1` ~ `Alt+9` | 跳到第 1-9 个 Tab |

`Ctrl+Tab` 按**访问顺序**切换，而非 Tab 排列顺序。这很实用——你经常在两三个文件间来回切换，`Ctrl+Tab` 可以快速回到上一个文件。

## 关闭 Tab

| 命令/快捷键 | 效果 |
|------------|------|
| `:q` | 关闭当前 Tab |
| `:q!` | 强制关闭（不保存） |
| `Ctrl+W` | 关闭当前 Tab（如果你保留了这个快捷键） |
| `:qa` | 关闭所有 Tab |

如果你在第 2 章配置了 `Ctrl+W` 给 Vim 窗口命令，可以用 `Alt+W` 关闭 Tab：

```json
{
  "key": "alt+w",
  "command": "workbench.action.closeActiveEditor"
}
```

### 批量关闭

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+K W` | 关闭所有 Tab |
| `Ctrl+K U` | 关闭已保存的 Tab |

或者配置到 Leader 键：

```json
{
  "before": ["<Leader>", "b", "o"],
  "commands": ["workbench.action.closeOtherEditors"]
}
```

`<Space>bo`（buffer only）关闭其他所有 Tab，只保留当前。

## 配置数字快速切换

原生的 `Alt+1` ~ `Alt+9` 需要手指移动较远。配置 Leader + 数字更方便：

```json
[
  {
    "key": "space 1",
    "command": "workbench.action.openEditorAtIndex1",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space 2",
    "command": "workbench.action.openEditorAtIndex2",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space 3",
    "command": "workbench.action.openEditorAtIndex3",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space 4",
    "command": "workbench.action.openEditorAtIndex4",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space 5",
    "command": "workbench.action.openEditorAtIndex5",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space 6",
    "command": "workbench.action.openEditorAtIndex6",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space 7",
    "command": "workbench.action.openEditorAtIndex7",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space 8",
    "command": "workbench.action.openEditorAtIndex8",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space 9",
    "command": "workbench.action.openEditorAtIndex9",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  }
]
```

现在 `<Space>1` 到 `<Space>9` 可以直接跳转到对应 Tab。

## Tab 列表

当打开的文件太多，需要快速浏览所有 Tab：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Tab`（保持按住） | 显示 Tab 列表 |
| `:ls` 或 `:buffers` | 列出所有 Buffer（VSCode Vim 支持有限） |

更实用的是使用 VSCode 命令：

```json
{
  "before": ["<Leader>", "b", "b"],
  "commands": ["workbench.action.showAllEditors"]
}
```

`<Space>bb` 打开编辑器列表，可以搜索和选择。

## Tab 重排

有时你想调整 Tab 的顺序。

### 使用快捷键

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+PageUp` | 当前 Tab 左移 |
| `Ctrl+Shift+PageDown` | 当前 Tab 右移 |

### 使用命令

`:tabmove {n}` 在纯 Vim 中可以移动 Tab，但在 VSCode Vim 中支持有限。建议使用上面的快捷键。

## Tab 置顶（Pin）

置顶的 Tab 会固定在左侧，不会被关闭命令批量关闭。

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+K Shift+Enter` | 置顶/取消置顶当前 Tab |

或配置到 Leader 键：

```json
{
  "before": ["<Leader>", "b", "p"],
  "commands": ["workbench.action.pinEditor"]
}
```

`<Space>bp`（buffer pin）置顶当前 Tab。

## 分组管理

当 Tab 太多时，可以使用 Editor Group 分组：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+\` | 将当前文件分屏到右侧 |
| `Ctrl+1/2/3` | 聚焦到第 1/2/3 个编辑器组 |

Editor Group 将在后续章节详细讲解。

## Tab 管理策略

**策略 1：控制数量**

不要让 Tab 无限增长。经常清理不需要的文件：
- `<Space>bo`：只保留当前
- `Ctrl+K W`：全部关闭后重新打开需要的

**策略 2：置顶常用**

把频繁访问的文件置顶，它们会固定在左侧，永远可以用 `<Space>1` 或 `<Space>2` 访问。

**策略 3：使用 Quick Open**

当 Tab 太多时，不要在 Tab 间导航，直接用 `Ctrl+P`（Quick Open）按文件名打开。

## 完整 Leader 键配置

综合 Tab 管理的所有操作：

```json
// 在 settings.json 的 vim.normalModeKeyBindingsNonRecursive 中
[
  // Tab 切换
  { "before": ["<Leader>", "1"], "commands": ["workbench.action.openEditorAtIndex1"] },
  { "before": ["<Leader>", "2"], "commands": ["workbench.action.openEditorAtIndex2"] },
  { "before": ["<Leader>", "3"], "commands": ["workbench.action.openEditorAtIndex3"] },
  
  // Tab 管理
  { "before": ["<Leader>", "b", "b"], "commands": ["workbench.action.showAllEditors"] },
  { "before": ["<Leader>", "b", "d"], "commands": ["workbench.action.closeActiveEditor"] },
  { "before": ["<Leader>", "b", "o"], "commands": ["workbench.action.closeOtherEditors"] },
  { "before": ["<Leader>", "b", "p"], "commands": ["workbench.action.pinEditor"] },
  
  // Tab 导航
  { "before": ["<Leader>", "b", "n"], "commands": ["workbench.action.nextEditor"] },
  { "before": ["<Leader>", "b", "p"], "commands": ["workbench.action.previousEditor"] }
]
```

或者在 keybindings.json 中：

```json
[
  {
    "key": "space b b",
    "command": "workbench.action.showAllEditors",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space b d",
    "command": "workbench.action.closeActiveEditor",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space b o",
    "command": "workbench.action.closeOtherEditors",
    "when": "vim.mode == 'Normal'"
  }
]
```

## 效率对比

| 操作 | 鼠标 | 键盘 |
|------|------|------|
| 切换到相邻 Tab | 1-2 秒 | 0.3 秒（`gt/gT`） |
| 切换到第 5 个 Tab | 2-3 秒 | 0.5 秒（`<Space>5`） |
| 关闭当前 Tab | 1-2 秒 | 0.3 秒（`:q`） |
| 关闭其他 Tab | 5-10 秒 | 0.5 秒（`<Space>bo`） |

---

**本章收获**：
- ✅ 掌握 Vim 风格 Tab 切换
- ✅ 配置数字快速跳转
- ✅ 学会 Tab 管理命令
- ✅ 建立 Tab 管理策略

**效率提升**：Tab 切换速度提升 **5-10 倍**，完全脱离鼠标点击 Tab。
