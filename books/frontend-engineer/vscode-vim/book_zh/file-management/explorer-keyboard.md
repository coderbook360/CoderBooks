# 文件树完全键盘操作：导航、创建、删除

你有多少次这样操作：写完代码，手移到鼠标，点击文件树，右键，新建文件，输入文件名，再点击打开？整个流程可能要花 10 秒。

如果用键盘，只需要 2 秒。

本章将把文件树的所有操作转化为键盘流程，让你完全脱离鼠标管理文件。

## 聚焦文件树

首先要解决的问题是：如何快速切换到文件树？

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+E` | 聚焦到资源管理器（文件树） |
| `Ctrl+0` | 聚焦到侧边栏（如果已打开） |

从编辑器切换到文件树只需要一个快捷键。

返回编辑器：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+1` | 聚焦到第一个编辑器组 |
| `Esc` | 返回编辑器（某些配置下） |

## 默认导航键位

VSCode 文件树默认支持方向键导航：

| 按键 | 效果 |
|------|------|
| `↑/↓` | 上下移动 |
| `→` | 展开文件夹或打开文件 |
| `←` | 折叠文件夹或返回上级 |
| `Enter` | 打开文件 |
| `Space` | 预览文件（不会占用编辑器） |

但方向键需要手离开主键区。我们来配置 Vim 风格的导航。

## 配置 Vim 风格导航

在 keybindings.json 中添加：

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

现在文件树支持：
- `j/k`：上下移动
- `h`：折叠文件夹
- `l`：展开文件夹或打开文件
- `Enter`：打开文件

### when 条件解释

`explorerViewletFocus && !inputFocus` 确保这些键位只在以下情况生效：
- 文件树获得焦点
- 没有在输入状态（比如正在重命名文件）

这避免了与编辑器中的 Vim 键位冲突。

## 文件操作快捷键

导航只是第一步。更重要的是用键盘完成文件操作。

### 新建文件

添加键位：

```json
{
  "key": "a",
  "command": "explorer.newFile",
  "when": "explorerViewletFocus && !inputFocus"
}
```

现在在文件树中按 `a`：
1. 弹出输入框
2. 输入文件名
3. 按 `Enter` 创建
4. 文件自动打开

### 新建文件夹

```json
{
  "key": "shift+a",
  "command": "explorer.newFolder",
  "when": "explorerViewletFocus && !inputFocus"
}
```

`Shift+A` 新建文件夹。

### 重命名

```json
{
  "key": "r",
  "command": "renameFile",
  "when": "explorerViewletFocus && !inputFocus"
}
```

或者使用默认的 `F2`。

### 删除

```json
{
  "key": "d",
  "command": "moveFileToTrash",
  "when": "explorerViewletFocus && !inputFocus"
}
```

使用 `moveFileToTrash` 而非 `deleteFile`，更安全——文件移动到回收站而非永久删除。

### 复制、剪切、粘贴

```json
[
  {
    "key": "y",
    "command": "filesExplorer.copy",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "x",
    "command": "filesExplorer.cut",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "p",
    "command": "filesExplorer.paste",
    "when": "explorerViewletFocus && !inputFocus"
  }
]
```

这套键位与 Vim 的复制粘贴一致：
- `y`：复制
- `x`：剪切
- `p`：粘贴

## 完整配置

综合以上所有键位：

```json
[
  // 导航
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
  
  // 文件操作
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
  {
    "key": "y",
    "command": "filesExplorer.copy",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "x",
    "command": "filesExplorer.cut",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "p",
    "command": "filesExplorer.paste",
    "when": "explorerViewletFocus && !inputFocus"
  },
  
  // 焦点切换
  {
    "key": "ctrl+0",
    "command": "workbench.files.action.focusFilesExplorer"
  },
  {
    "key": "ctrl+1",
    "command": "workbench.action.focusFirstEditorGroup"
  }
]
```

## 实战：创建项目结构

**任务：在 src 目录下创建 components 文件夹，并创建 Button.tsx 和 Input.tsx**

键盘流程：

```
1. Ctrl+Shift+E     # 聚焦文件树
2. j/k             # 导航到 src 目录
3. l               # 展开 src
4. Shift+A         # 新建文件夹
5. 输入 components
6. Enter           # 确认
7. l               # 进入 components
8. a               # 新建文件
9. 输入 Button.tsx
10. Enter          # 确认并打开文件
11. Ctrl+Shift+E   # 回到文件树
12. a              # 新建文件
13. 输入 Input.tsx
14. Enter          # 确认
```

整个过程约 15 秒，手完全不离开键盘。

鼠标方式需要：点击文件树 → 右键 → 新建文件夹 → 输入 → 右键 → 新建文件... 约 40 秒。

## 文件搜索

当文件树很深时，导航效率下降。这时应该用搜索：

在文件树聚焦时直接输入字符，会触发过滤：

1. `Ctrl+Shift+E` → 聚焦文件树
2. 直接输入 `button` → 文件树过滤，只显示包含 "button" 的项
3. `Enter` → 选择

这比逐级导航快得多。

不过，更快的方式是使用 `Ctrl+P`（Quick Open），下一章会详细讲解。

## Leader 键集成

把常用文件操作集成到 Leader 键系统：

在 settings.json 的 `vim.normalModeKeyBindingsNonRecursive` 中添加：

```json
{
  "before": ["<Leader>", "e"],
  "commands": ["workbench.files.action.focusFilesExplorer"]
}
```

现在 `<Space>e` 可以快速切换到文件树。

配合第 4 章的 Leader 键设计：

| 键位 | 效果 |
|------|------|
| `<Space>e` | 聚焦文件树 |
| `<Space>ff` | Quick Open（打开文件） |
| `<Space>fr` | 最近文件 |

## 边界情况

有些操作目前仍需要鼠标：

- **拖拽排序**：调整文件/文件夹顺序
- **拖拽移动**：将文件拖到另一个目录
- **多选不连续文件**：按住 Ctrl 点击多个文件

不过，这些操作相对少见。日常 90%+ 的文件操作可以用键盘完成。

对于移动文件，可以用键盘替代方案：
1. 选中文件，按 `x`（剪切）
2. 导航到目标目录
3. 按 `p`（粘贴）

## 效率对比

| 操作 | 鼠标时间 | 键盘时间 |
|------|----------|----------|
| 聚焦文件树 | 2-3 秒 | 0.5 秒 |
| 导航到目标文件 | 3-5 秒 | 1-2 秒 |
| 新建文件 | 5-8 秒 | 2-3 秒 |
| 重命名文件 | 3-5 秒 | 1-2 秒 |
| 删除文件 | 3-5 秒 | 1-2 秒 |

总体而言，文件管理效率提升 **3-5 倍**。

---

**本章收获**：
- ✅ 配置文件树 Vim 风格导航
- ✅ 配置文件操作快捷键
- ✅ 掌握完整的键盘文件管理流程
- ✅ 集成到 Leader 键系统

**效率提升**：文件管理效率提升 **3-5 倍**，90% 的文件操作可以完全用键盘完成。
