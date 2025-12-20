# 侧边栏完全键盘操作：文件、搜索、Git

侧边栏是 VSCode 的核心界面组件，掌握键盘操作可大幅提升工作效率。

## 侧边栏切换

### 基础切换

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 切换侧边栏显示
    {
      "before": ["<leader>", "b"],
      "commands": ["workbench.action.toggleSidebarVisibility"]
    },
    // 聚焦侧边栏
    {
      "before": ["<leader>", "0"],
      "commands": ["workbench.action.focusSideBar"]
    }
  ]
}
```

### 切换到特定视图

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 资源管理器
    {
      "before": ["<leader>", "e"],
      "commands": ["workbench.view.explorer"]
    },
    // 搜索
    {
      "before": ["<leader>", "f", "g"],
      "commands": ["workbench.view.search"]
    },
    // 源代码管理
    {
      "before": ["<leader>", "g", "s"],
      "commands": ["workbench.view.scm"]
    },
    // 扩展
    {
      "before": ["<leader>", "x"],
      "commands": ["workbench.view.extensions"]
    }
  ]
}
```

## 文件资源管理器

### 导航操作

在资源管理器中（需要先配置）：

```json
// keybindings.json
{
  "key": "j",
  "command": "list.focusDown",
  "when": "listFocus && !inputFocus"
},
{
  "key": "k",
  "command": "list.focusUp",
  "when": "listFocus && !inputFocus"
},
{
  "key": "l",
  "command": "list.select",
  "when": "listFocus && !inputFocus"
},
{
  "key": "h",
  "command": "list.collapse",
  "when": "listFocus && !inputFocus"
}
```

### 文件操作

```json
{
  "key": "a",
  "command": "explorer.newFile",
  "when": "filesExplorerFocus && !inputFocus"
},
{
  "key": "shift+a",
  "command": "explorer.newFolder",
  "when": "filesExplorerFocus && !inputFocus"
},
{
  "key": "r",
  "command": "renameFile",
  "when": "filesExplorerFocus && !inputFocus"
},
{
  "key": "d",
  "command": "deleteFile",
  "when": "filesExplorerFocus && !inputFocus"
},
{
  "key": "y",
  "command": "filesExplorer.copy",
  "when": "filesExplorerFocus && !inputFocus"
},
{
  "key": "x",
  "command": "filesExplorer.cut",
  "when": "filesExplorerFocus && !inputFocus"
},
{
  "key": "p",
  "command": "filesExplorer.paste",
  "when": "filesExplorerFocus && !inputFocus"
}
```

### 资源管理器工作流

```
\e          打开资源管理器
j/k         上下导航
l           展开文件夹/打开文件
h           折叠文件夹
a           新建文件
A           新建文件夹
r           重命名
d           删除
y           复制
p           粘贴
Esc         返回编辑器
```

## 搜索视图

### 打开搜索

```json
{
  "before": ["<leader>", "f", "g"],
  "commands": ["workbench.action.findInFiles"]
}
```

### 搜索结果导航

```json
// keybindings.json
{
  "key": "j",
  "command": "search.action.focusNextSearchResult",
  "when": "hasSearchResult && searchViewletFocus"
},
{
  "key": "k",
  "command": "search.action.focusPreviousSearchResult",
  "when": "hasSearchResult && searchViewletFocus"
}
```

### 搜索工作流

```
\fg         打开搜索
            输入搜索词
Enter       开始搜索
j/k         导航结果
Enter       跳转到结果
Esc         返回编辑器
```

## Git 源代码管理

### 打开 Git 视图

```json
{
  "before": ["<leader>", "g", "s"],
  "commands": ["workbench.view.scm"]
}
```

### Git 视图操作

```json
// keybindings.json
{
  "key": "j",
  "command": "list.focusDown",
  "when": "scmRepositoryFocus"
},
{
  "key": "k",
  "command": "list.focusUp",
  "when": "scmRepositoryFocus"
},
{
  "key": "o",
  "command": "list.select",
  "when": "scmRepositoryFocus"
}
```

### Git 快捷操作

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 暂存文件
    { "before": ["<leader>", "g", "a"], "commands": ["git.stage"] },
    // 提交
    { "before": ["<leader>", "g", "c"], "commands": ["git.commit"] },
    // 推送
    { "before": ["<leader>", "g", "p"], "commands": ["git.push"] },
    // 拉取
    { "before": ["<leader>", "g", "l"], "commands": ["git.pull"] }
  ]
}
```

### Git 工作流

```
\gs         打开 Git 视图
j/k         导航文件列表
Enter       打开差异视图
\ga         暂存当前文件
\gc         提交
\gp         推送
```

## 返回编辑器

从侧边栏返回编辑器：

```json
{
  "key": "escape",
  "command": "workbench.action.focusActiveEditorGroup",
  "when": "sideBarFocus"
}
```

或使用 `Ctrl+1` 聚焦第一个编辑器组。

## 键位总结

| 键位 | 操作 |
|------|------|
| `\b` | 切换侧边栏 |
| `\e` | 资源管理器 |
| `\fg` | 搜索视图 |
| `\gs` | Git 视图 |
| `\x` | 扩展视图 |
| `j/k` | 列表导航 |
| `l/h` | 展开/折叠 |
| `a` | 新建文件 |
| `r` | 重命名 |
| `d` | 删除 |
| `Esc` | 返回编辑器 |

---

**效率提升**：侧边栏操作全键盘化，文件管理、搜索、Git 操作无需鼠标。
