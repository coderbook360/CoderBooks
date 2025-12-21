# 编辑器分屏：窗口分割技巧

在大屏幕上，分屏可以同时查看和编辑多个文件。本章介绍如何用键盘高效管理分屏布局。

## 分割编辑器

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+\` | 垂直分割（左右） |
| `Ctrl+K Ctrl+\` | 水平分割（上下） |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "v"],
  "commands": ["workbench.action.splitEditor"]
},
{
  "before": ["<leader>", "s"],
  "commands": ["workbench.action.splitEditorDown"]
}
```

- `\v`：垂直分割（Vertical）
- `\s`：水平分割（Split horizontal）

## 在分屏间移动

### VSCode 原生

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+1` | 聚焦第一个编辑器组 |
| `Ctrl+2` | 聚焦第二个编辑器组 |
| `Ctrl+3` | 聚焦第三个编辑器组 |

### Vim 风格

配置类似 Vim 的 `Ctrl+W` 窗口命令：

```json
{
  "before": ["<C-w>", "h"],
  "commands": ["workbench.action.focusLeftGroup"]
},
{
  "before": ["<C-w>", "j"],
  "commands": ["workbench.action.focusBelowGroup"]
},
{
  "before": ["<C-w>", "k"],
  "commands": ["workbench.action.focusAboveGroup"]
},
{
  "before": ["<C-w>", "l"],
  "commands": ["workbench.action.focusRightGroup"]
}
```

现在可以用 `Ctrl+W h/j/k/l` 在分屏间移动，与 Vim 一致。

### Leader 风格

如果你更喜欢 Leader 键：

```json
{
  "before": ["<leader>", "w", "h"],
  "commands": ["workbench.action.focusLeftGroup"]
},
{
  "before": ["<leader>", "w", "j"],
  "commands": ["workbench.action.focusBelowGroup"]
},
{
  "before": ["<leader>", "w", "k"],
  "commands": ["workbench.action.focusAboveGroup"]
},
{
  "before": ["<leader>", "w", "l"],
  "commands": ["workbench.action.focusRightGroup"]
}
```

## 关闭分屏

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+W` | 关闭当前编辑器 |
| `Ctrl+K Ctrl+W` | 关闭所有编辑器 |

配置 Vim 风格：

```json
{
  "before": ["<C-w>", "c"],
  "commands": ["workbench.action.closeActiveEditor"]
},
{
  "before": ["<C-w>", "o"],
  "commands": ["workbench.action.closeOtherEditors"]
}
```

- `Ctrl+W c`：关闭当前编辑器（Close）
- `Ctrl+W o`：关闭其他编辑器（Only）

## 调整分屏大小

### 增大/减小宽度

```json
{
  "before": ["<C-w>", ">"],
  "commands": ["workbench.action.increaseViewWidth"]
},
{
  "before": ["<C-w>", "<"],
  "commands": ["workbench.action.decreaseViewWidth"]
}
```

### 增大/减小高度

```json
{
  "before": ["<C-w>", "+"],
  "commands": ["workbench.action.increaseViewHeight"]
},
{
  "before": ["<C-w>", "-"],
  "commands": ["workbench.action.decreaseViewHeight"]
}
```

### 均等分布

```json
{
  "before": ["<C-w>", "="],
  "commands": ["workbench.action.evenEditorWidths"]
}
```

`Ctrl+W =` 让所有分屏等宽。

## 移动文件到其他分屏

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+K ←` | 将当前文件移到左边分屏 |
| `Ctrl+K →` | 将当前文件移到右边分屏 |
| `Ctrl+K ↑` | 将当前文件移到上边分屏 |
| `Ctrl+K ↓` | 将当前文件移到下边分屏 |

配置 Vim 风格：

```json
{
  "before": ["<C-w>", "H"],
  "commands": ["workbench.action.moveEditorToLeftGroup"]
},
{
  "before": ["<C-w>", "L"],
  "commands": ["workbench.action.moveEditorToRightGroup"]
},
{
  "before": ["<C-w>", "K"],
  "commands": ["workbench.action.moveEditorToAboveGroup"]
},
{
  "before": ["<C-w>", "J"],
  "commands": ["workbench.action.moveEditorToBelowGroup"]
}
```

大写 `H/J/K/L` 移动文件，小写 `h/j/k/l` 移动焦点。

## 编辑器组布局

### 预设布局

VSCode 有几种预设布局：

```
> View: Two Columns Editor Layout
> View: Three Columns Editor Layout
> View: Grid Editor Layout (2x2)
```

### 切换布局方向

```json
{
  "before": ["<C-w>", "r"],
  "commands": ["workbench.action.toggleEditorGroupLayout"]
}
```

`Ctrl+W r` 在水平和垂直布局之间切换。

## 在同一文件中分屏

有时需要在同一文件的不同位置工作：

```json
{
  "before": ["<leader>", "v", "s"],
  "commands": ["workbench.action.splitEditorInGroup"]
}
```

`\vs` 在同一编辑器组内分割，显示同一文件的两个视图。

## 最大化当前分屏

临时最大化当前编辑器，查看完后恢复：

```json
{
  "before": ["<C-w>", "m"],
  "commands": ["workbench.action.toggleEditorWidths"]
}
```

或者使用禅模式：

```json
{
  "before": ["<C-w>", "z"],
  "commands": ["workbench.action.toggleZenMode"]
}
```

## 实战布局

### 布局 1：代码 + 测试

左边写代码，右边写测试：

```
1. 打开源文件
2. \v 垂直分割
3. Ctrl+P 打开对应的测试文件
4. Ctrl+W h/l 在两边切换
```

### 布局 2：对比两个文件

```
1. 打开文件 A
2. \v 垂直分割
3. 打开文件 B
4. 并排对比
```

### 布局 3：主文件 + 参考文件

```
1. 主文件占大部分空间
2. 右侧窄分屏放参考文件
3. Ctrl+W > 调整宽度
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "v"],
      "commands": ["workbench.action.splitEditor"]
    },
    {
      "before": ["<leader>", "s"],
      "commands": ["workbench.action.splitEditorDown"]
    },
    {
      "before": ["<C-w>", "h"],
      "commands": ["workbench.action.focusLeftGroup"]
    },
    {
      "before": ["<C-w>", "j"],
      "commands": ["workbench.action.focusBelowGroup"]
    },
    {
      "before": ["<C-w>", "k"],
      "commands": ["workbench.action.focusAboveGroup"]
    },
    {
      "before": ["<C-w>", "l"],
      "commands": ["workbench.action.focusRightGroup"]
    },
    {
      "before": ["<C-w>", "c"],
      "commands": ["workbench.action.closeActiveEditor"]
    },
    {
      "before": ["<C-w>", "o"],
      "commands": ["workbench.action.closeOtherEditors"]
    },
    {
      "before": ["<C-w>", "H"],
      "commands": ["workbench.action.moveEditorToLeftGroup"]
    },
    {
      "before": ["<C-w>", "L"],
      "commands": ["workbench.action.moveEditorToRightGroup"]
    },
    {
      "before": ["<C-w>", "="],
      "commands": ["workbench.action.evenEditorWidths"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 掌握分屏的创建和关闭
- ✅ 学会 Vim 风格的窗口导航
- ✅ 了解调整分屏大小的方法
- ✅ 建立适合自己的分屏布局

**效率提升**：充分利用屏幕空间，同时编辑多个相关文件。
