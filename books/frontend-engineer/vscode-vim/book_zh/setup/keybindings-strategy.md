# keybindings.json 自定义键位策略

如果说 settings.json 是配置 Vim 的行为，那么 keybindings.json 就是定义 Vim 的灵魂——你的个性化键位体系。

本章将深入讲解 keybindings.json 的语法和设计策略，帮你打造真正属于自己的高效键位系统。

## 文件位置与编辑

keybindings.json 是 VSCode 的键位配置文件。打开方式：

按 `Ctrl+Shift+P`，输入 `Preferences: Open Keyboard Shortcuts (JSON)`

文件是一个 JSON 数组，每个元素代表一条键位规则。

## 基础语法

每条键位规则包含三个核心属性：

```json
{
  "key": "ctrl+shift+k",
  "command": "editor.action.deleteLines",
  "when": "editorTextFocus"
}
```

- **key**：触发的按键组合
- **command**：执行的命令
- **when**：生效条件（可选）

### 禁用键位

在命令前加 `-` 可以禁用某个键位：

```json
{
  "key": "ctrl+w",
  "command": "-workbench.action.closeActiveEditor"
}
```

这条规则禁用了 `Ctrl+W` 关闭标签的功能，为 Vim 的窗口命令让路。

### 命令参数

某些命令需要参数：

```json
{
  "key": "ctrl+k ctrl+1",
  "command": "editor.foldLevel1",
  "args": { "levels": 1 }
}
```

## when 条件完全指南

`when` 条件是 keybindings.json 最强大的特性，它让同一个键在不同场景下执行不同命令。

### 常用条件

| 条件 | 含义 |
|------|------|
| `editorTextFocus` | 编辑器获得焦点 |
| `editorHasSelection` | 有选中文本 |
| `vim.active` | Vim 插件激活 |
| `vim.mode == 'Normal'` | 在 Normal 模式 |
| `vim.mode == 'Insert'` | 在 Insert 模式 |
| `vim.mode == 'Visual'` | 在 Visual 模式 |
| `explorerViewletFocus` | 文件树获得焦点 |
| `!inputFocus` | 不在输入框中 |
| `inQuickOpen` | 在快速打开面板中 |
| `suggestWidgetVisible` | 自动补全菜单可见 |

### 条件组合

使用 `&&`（与）和 `||`（或）组合多个条件：

```json
{
  "key": "j",
  "command": "list.focusDown",
  "when": "explorerViewletFocus && !inputFocus"
}
```

这条规则只在"文件树获得焦点"且"不在输入框"时生效。

### 取反条件

使用 `!` 取反：

```json
{
  "key": "escape",
  "command": "workbench.action.closeQuickOpen",
  "when": "inQuickOpen && !vim.active"
}
```

## 文件树 Vim 导航

这是一组非常实用的配置，让文件树支持 `hjkl` 导航：

```json
[
  {
    "key": "j",
    "command": "list.focusDown",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "k",
    "command": "list.focusUp",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "h",
    "command": "list.collapse",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "l",
    "command": "list.expand",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "enter",
    "command": "list.select",
    "when": "explorerViewletFocus && !inputFocus"
  }
]
```

配置后：
- `j/k`：上下移动
- `h`：折叠目录
- `l`：展开目录/打开文件
- `Enter`：打开文件

## 文件操作快捷键

继续增强文件树的键盘操作：

```json
[
  {
    "key": "a",
    "command": "explorer.newFile",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "shift+a",
    "command": "explorer.newFolder",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "r",
    "command": "renameFile",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "d",
    "command": "moveFileToTrash",
    "when": "explorerViewletFocus && !inputFocus"
  }
]
```

- `a`：新建文件
- `Shift+A`：新建文件夹
- `r`：重命名
- `d`：删除（移动到回收站）

## Leader 键系统设计

Leader 键是构建个人快捷键体系的核心。在 settings.json 中我们已经设置 `<space>` 为 Leader，现在在 keybindings.json 中定义具体功能。

### 设计理念

好的 Leader 键系统应该：
1. **分类清晰**：相关功能使用同一前缀
2. **容易记忆**：键位有语义关联（如 `f` 代表 file）
3. **常用优先**：高频操作使用更短的键序列

### 推荐布局

```json
[
  // ===== 文件操作 (f = file) =====
  {
    "key": "space f f",
    "command": "workbench.action.quickOpen",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space f s",
    "command": "workbench.action.files.save",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space f S",
    "command": "workbench.action.files.saveAll",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  
  // ===== Buffer/Tab 操作 (b = buffer) =====
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
  },
  
  // ===== 窗口操作 (w = window) =====
  {
    "key": "space w v",
    "command": "workbench.action.splitEditor",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space w s",
    "command": "workbench.action.splitEditorDown",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space w h",
    "command": "workbench.action.focusLeftGroup",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space w l",
    "command": "workbench.action.focusRightGroup",
    "when": "vim.mode == 'Normal'"
  },
  
  // ===== 搜索操作 (s = search) =====
  {
    "key": "space s s",
    "command": "workbench.action.findInFiles",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space s p",
    "command": "workbench.action.showAllSymbols",
    "when": "vim.mode == 'Normal'"
  },
  
  // ===== Git 操作 (g = git) =====
  {
    "key": "space g g",
    "command": "workbench.view.scm",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space g s",
    "command": "git.stageAll",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space g c",
    "command": "git.commit",
    "when": "vim.mode == 'Normal'"
  },
  
  // ===== 代码操作 (c = code) =====
  {
    "key": "space c a",
    "command": "editor.action.quickFix",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space c r",
    "command": "editor.action.rename",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space c f",
    "command": "editor.action.formatDocument",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  }
]
```

### 快速记忆

| 前缀 | 含义 | 常用命令 |
|------|------|----------|
| `<space>f` | File（文件） | `ff` 打开, `fs` 保存 |
| `<space>b` | Buffer（标签） | `bb` 列表, `bd` 删除 |
| `<space>w` | Window（窗口） | `wv` 垂直分屏, `wh/wl` 左右移动 |
| `<space>s` | Search（搜索） | `ss` 全局搜索, `sp` 符号搜索 |
| `<space>g` | Git | `gg` Git面板, `gc` 提交 |
| `<space>c` | Code（代码） | `ca` 快速修复, `cr` 重命名 |

## Insert 模式快速退出

在 Insert 模式下快速返回 Normal 模式是高频操作。配置 `jj` 或 `jk` 作为退出键：

```json
[
  {
    "key": "j j",
    "command": "extension.vim_escape",
    "when": "vim.mode == 'Insert' && editorTextFocus"
  }
]
```

为什么用 `jj`？

1. `j` 在主键区，手指不用移动
2. 快速连按 `jj` 比移动到 `Esc` 快得多
3. 正常输入中很少连续出现 `jj`

如果你担心输入 `jj` 时误触发，可以改用 `jk`。

## 数字快速切换 Tab

配置数字键快速切换到对应 Tab：

```json
[
  {
    "key": "space 1",
    "command": "workbench.action.openEditorAtIndex1",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space 2",
    "command": "workbench.action.openEditorAtIndex2",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space 3",
    "command": "workbench.action.openEditorAtIndex3",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space 4",
    "command": "workbench.action.openEditorAtIndex4",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space 5",
    "command": "workbench.action.openEditorAtIndex5",
    "when": "vim.mode == 'Normal'"
  }
]
```

现在 `<space>1` 到 `<space>5` 可以直接跳转到对应位置的 Tab。

## 调试键位冲突

当某个键位不生效时，如何排查？

**方法一：查看键位冲突**

按 `Ctrl+Shift+P`，输入 `Open Keyboard Shortcuts`（不是 JSON），在搜索框输入你的键位，可以看到所有绑定到这个键的命令。

**方法二：使用开发者工具**

按 `Ctrl+Shift+P`，输入 `Developer: Toggle Keyboard Shortcuts Troubleshooting`

启用后，每次按键都会在"输出"面板显示详细信息，包括哪个命令被触发、为什么其他命令没有生效。

## 完整配置文件

综合本章所有内容，这是完整的 keybindings.json：

```json
[
  // ===== 禁用冲突键位 =====
  {
    "key": "ctrl+d",
    "command": "-editor.action.addSelectionToNextFindMatch"
  },
  {
    "key": "ctrl+w",
    "command": "-workbench.action.closeActiveEditor"
  },
  
  // ===== 文件树 Vim 导航 =====
  {
    "key": "j",
    "command": "list.focusDown",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "k",
    "command": "list.focusUp",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "h",
    "command": "list.collapse",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "l",
    "command": "list.expand",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "a",
    "command": "explorer.newFile",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "shift+a",
    "command": "explorer.newFolder",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "r",
    "command": "renameFile",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "d",
    "command": "moveFileToTrash",
    "when": "explorerViewletFocus && !inputFocus"
  },
  
  // ===== Insert 模式退出 =====
  {
    "key": "j j",
    "command": "extension.vim_escape",
    "when": "vim.mode == 'Insert' && editorTextFocus"
  },
  
  // ===== Leader 键系统 =====
  {
    "key": "space f f",
    "command": "workbench.action.quickOpen",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
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
    "key": "space w v",
    "command": "workbench.action.splitEditor",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space c a",
    "command": "editor.action.quickFix",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  {
    "key": "space c r",
    "command": "editor.action.rename",
    "when": "vim.mode == 'Normal' && editorTextFocus"
  },
  
  // ===== 数字切换 Tab =====
  {
    "key": "space 1",
    "command": "workbench.action.openEditorAtIndex1",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space 2",
    "command": "workbench.action.openEditorAtIndex2",
    "when": "vim.mode == 'Normal'"
  },
  {
    "key": "space 3",
    "command": "workbench.action.openEditorAtIndex3",
    "when": "vim.mode == 'Normal'"
  }
]
```

---

**本章收获**：
- ✅ 掌握 keybindings.json 的完整语法
- ✅ 理解 when 条件的使用方法
- ✅ 学会设计 Leader 键系统
- ✅ 获得完整的键位配置方案

**效率提升**：良好的键位设计可以让操作效率提升 **2-3 倍**，并且大大减少"想不起快捷键"的情况。
