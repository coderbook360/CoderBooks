# 侧边栏导航：聚焦与切换

VSCode 的侧边栏（Sidebar）包含文件资源管理器、搜索、Git、调试等重要功能。掌握键盘操作可以显著提升导航效率。

## 切换侧边栏显示

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+B` | 切换侧边栏显示 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "e"],
  "commands": ["workbench.action.toggleSidebarVisibility"]
}
```

`\e` 切换侧边栏（Explorer）。

## 聚焦侧边栏视图

### 资源管理器

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+E` | 聚焦资源管理器 |

```json
{
  "before": ["<leader>", "1"],
  "commands": ["workbench.view.explorer"]
}
```

`\1` 聚焦文件资源管理器。

### 搜索

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+F` | 聚焦搜索 |

```json
{
  "before": ["<leader>", "2"],
  "commands": ["workbench.view.search"]
}
```

### Git / 源代码管理

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+G` | 聚焦 Git |

```json
{
  "before": ["<leader>", "3"],
  "commands": ["workbench.view.scm"]
}
```

### 调试

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+D` | 聚焦调试 |

```json
{
  "before": ["<leader>", "4"],
  "commands": ["workbench.view.debug"]
}
```

### 扩展

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+X` | 聚焦扩展 |

```json
{
  "before": ["<leader>", "5"],
  "commands": ["workbench.view.extensions"]
}
```

## 在侧边栏中导航

聚焦侧边栏后，可以用 Vim 键位导航：

| 按键 | 效果 |
|------|------|
| `j/k` | 上下移动 |
| `h` | 折叠目录 |
| `l` | 展开目录 / 打开文件 |
| `Enter` | 打开文件 / 切换展开 |
| `Space` | 预览文件（不完全打开） |

## 返回编辑器

在侧边栏操作完成后，返回编辑器：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+1` | 聚焦第一个编辑器组 |
| `Escape` | 返回编辑器（某些情况） |

```json
{
  "before": ["<leader>", "<leader>"],
  "commands": ["workbench.action.focusActiveEditorGroup"]
}
```

`\\` 快速返回编辑器。

## 侧边栏位置

侧边栏可以在左侧或右侧：

```json
{
  "workbench.sideBar.location": "left"  // 或 "right"
}
```

有些人喜欢放在右侧，这样打开/关闭侧边栏不会导致代码区域移动。

## 主侧边栏 vs 辅助侧边栏

VSCode 1.64+ 支持辅助侧边栏（Secondary Sidebar）：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Alt+B` | 切换辅助侧边栏 |

你可以把大纲放在右侧辅助侧边栏，文件树放在左侧主侧边栏。

## 配置侧边栏视图

### 隐藏不需要的视图

右键侧边栏标题，取消勾选不需要的视图。

### 调整视图顺序

拖拽视图标题可以调整顺序。

### 合并/分离视图

某些视图可以拖拽到其他区域。

## 活动栏

侧边栏左侧的图标条叫"活动栏"（Activity Bar）。

### 隐藏活动栏

如果你只用键盘，可以隐藏它节省空间：

```json
{
  "workbench.activityBar.visible": false
}
```

使用 `Ctrl+Shift+E/F/G/D/X` 或 Leader 快捷键切换视图。

### 自定义活动栏

右键活动栏可以隐藏/显示特定图标。

## 快速视图切换模式

建立一套一致的 Leader+数字 快捷键：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    { "before": ["<leader>", "1"], "commands": ["workbench.view.explorer"] },
    { "before": ["<leader>", "2"], "commands": ["workbench.view.search"] },
    { "before": ["<leader>", "3"], "commands": ["workbench.view.scm"] },
    { "before": ["<leader>", "4"], "commands": ["workbench.view.debug"] },
    { "before": ["<leader>", "5"], "commands": ["workbench.view.extensions"] },
    { "before": ["<leader>", "e"], "commands": ["workbench.action.toggleSidebarVisibility"] },
    { "before": ["<leader>", "<leader>"], "commands": ["workbench.action.focusActiveEditorGroup"] }
  ]
}
```

记忆方法：
- `\1` - 文件（最常用，排第一）
- `\2` - 搜索
- `\3` - Git
- `\4` - 调试
- `\5` - 扩展
- `\e` - 切换显示
- `\\` - 回到编辑器

## 面板（底部）

底部面板包含终端、问题、输出等。

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+J` | 切换面板 |
| `` Ctrl+` `` | 切换终端 |
| `Ctrl+Shift+M` | 切换问题面板 |

```json
{
  "before": ["<leader>", "j"],
  "commands": ["workbench.action.togglePanel"]
}
```

`\j` 切换底部面板。

## 最大化编辑器

需要专注时，隐藏所有边栏：

```json
{
  "before": ["<leader>", "z"],
  "commands": ["workbench.action.toggleZenMode"]
}
```

`\z` 进入/退出禅模式，隐藏所有 UI 元素。

或者只最大化编辑器区域：

```json
{
  "before": ["<leader>", "m"],
  "commands": ["workbench.action.toggleMaximizedPanel"]
}
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "1"],
      "commands": ["workbench.view.explorer"]
    },
    {
      "before": ["<leader>", "2"],
      "commands": ["workbench.view.search"]
    },
    {
      "before": ["<leader>", "3"],
      "commands": ["workbench.view.scm"]
    },
    {
      "before": ["<leader>", "4"],
      "commands": ["workbench.view.debug"]
    },
    {
      "before": ["<leader>", "5"],
      "commands": ["workbench.view.extensions"]
    },
    {
      "before": ["<leader>", "e"],
      "commands": ["workbench.action.toggleSidebarVisibility"]
    },
    {
      "before": ["<leader>", "j"],
      "commands": ["workbench.action.togglePanel"]
    },
    {
      "before": ["<leader>", "z"],
      "commands": ["workbench.action.toggleZenMode"]
    },
    {
      "before": ["<leader>", "<leader>"],
      "commands": ["workbench.action.focusActiveEditorGroup"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 掌握侧边栏的显示和切换
- ✅ 建立 Leader+数字 视图切换习惯
- ✅ 学会在侧边栏和编辑器之间快速切换
- ✅ 了解禅模式和面板控制

**效率提升**：视图切换全键盘化，手不离开主键盘区即可访问所有功能。
