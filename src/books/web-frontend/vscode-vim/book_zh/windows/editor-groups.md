# 编辑器组：多窗口管理

编辑器组是 VSCode 中组织文件的方式。理解编辑器组可以让你更高效地管理多个打开的文件。

## 什么是编辑器组

每个分屏区域就是一个"编辑器组"。每个组可以包含多个 Tab（文件）。

```
+-------------------+-------------------+
|  编辑器组 1       |  编辑器组 2       |
|  [Tab1] [Tab2]    |  [Tab3] [Tab4]    |
|                   |                   |
|  文件内容         |  文件内容         |
+-------------------+-------------------+
```

## 创建编辑器组

### 分割创建

分割编辑器时会创建新组：

```json
{
  "before": ["<leader>", "v"],
  "commands": ["workbench.action.splitEditor"]
}
```

### 新建空组

```json
{
  "before": ["<leader>", "w", "n"],
  "commands": ["workbench.action.newGroupRight"]
}
```

`\wn` 在右侧创建新的空编辑器组。

## 在组间移动文件

### 移动到指定组

```json
{
  "before": ["<leader>", "w", "1"],
  "commands": ["workbench.action.moveEditorToFirstGroup"]
},
{
  "before": ["<leader>", "w", "2"],
  "commands": ["workbench.action.moveEditorToSecondGroup"]
},
{
  "before": ["<leader>", "w", "3"],
  "commands": ["workbench.action.moveEditorToThirdGroup"]
}
```

### 移动到新组

```json
{
  "before": ["<leader>", "w", "m"],
  "commands": ["workbench.action.moveEditorToNewWindow"]
}
```

`\wm` 将当前文件移动到新窗口。

## 复制文件到另一组

有时候想在两个分屏中打开同一文件的不同位置：

```json
{
  "before": ["<leader>", "w", "c"],
  "commands": ["workbench.action.splitEditorInGroup"]
}
```

这会在当前组内创建同一文件的两个视图。

或者复制到另一组：

```json
{
  "before": ["<leader>", "w", "C"],
  "commands": ["workbench.action.splitEditorRight"]
}
```

## 锁定编辑器组

锁定组后，在该组中打开新文件会替换当前文件，而不是新建 Tab：

```
> View: Lock Editor Group
```

适合用于"参考窗口"——只显示一个参考文件，点击其他链接时自动替换。

## 编辑器组选项

### 限制每组 Tab 数量

```json
{
  "workbench.editor.limit.enabled": true,
  "workbench.editor.limit.perEditorGroup": true,
  "workbench.editor.limit.value": 5
}
```

每组最多 5 个 Tab，超出时关闭最旧的。

### 显示完整路径

当多个组打开同名文件时，显示完整路径区分：

```json
{
  "workbench.editor.labelFormat": "short"
}
```

选项：
- `short`：只显示文件名，重复时显示目录
- `medium`：显示文件名 + 父目录
- `long`：显示完整路径

## 编辑器组布局

### 预设布局切换

```
> View: Two Columns Editor Layout
> View: Three Columns Editor Layout
> View: Grid Editor Layout (2x2)
> View: Single Editor Layout
```

### 保存和恢复布局

VSCode 没有内置的布局保存功能，但可以通过工作区设置实现部分效果。

## 多窗口管理

### 新建窗口

```
> File: New Window
```

或快捷键 `Ctrl+Shift+N`。

### 在新窗口打开文件

```json
{
  "before": ["<leader>", "w", "W"],
  "commands": ["workbench.action.moveEditorToNewWindow"]
}
```

### 窗口间移动文件

可以拖拽 Tab 到另一个 VSCode 窗口。

## 聚焦管理

### 聚焦特定组

```json
{
  "before": ["<leader>", "1"],
  "commands": ["workbench.action.focusFirstEditorGroup"]
},
{
  "before": ["<leader>", "2"],
  "commands": ["workbench.action.focusSecondEditorGroup"]
},
{
  "before": ["<leader>", "3"],
  "commands": ["workbench.action.focusThirdEditorGroup"]
}
```

注意：这会与之前的侧边栏快捷键冲突。选择一种你更常用的方式。

### 循环聚焦

```json
{
  "before": ["<C-w>", "<C-w>"],
  "commands": ["workbench.action.focusNextGroup"]
}
```

`Ctrl+W Ctrl+W` 循环聚焦下一个组，与 Vim 一致。

## 实战场景

### 场景 1：代码 + 测试 + 终端

```
+-------------------+-------------------+
|  源代码           |  测试文件         |
|                   |                   |
+-------------------+-------------------+
|  终端                                 |
+---------------------------------------+
```

```
1. 打开源文件
2. \v 垂直分割
3. 打开测试文件
4. Ctrl+` 打开终端
5. 拖动调整大小
```

### 场景 2：阅读代码

```
+-------------------+-------------------+
|  定义/接口        |  实现             |
|                   |                   |
+-------------------+-------------------+
```

左边看接口定义，右边看实现。

### 场景 3：比较两个版本

```
+-------------------+-------------------+
|  版本 A           |  版本 B           |
|                   |                   |
+-------------------+-------------------+
```

对比同一文件的两个版本，或两个相似文件。

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "w", "n"],
      "commands": ["workbench.action.newGroupRight"]
    },
    {
      "before": ["<leader>", "w", "c"],
      "commands": ["workbench.action.splitEditorInGroup"]
    },
    {
      "before": ["<leader>", "w", "1"],
      "commands": ["workbench.action.moveEditorToFirstGroup"]
    },
    {
      "before": ["<leader>", "w", "2"],
      "commands": ["workbench.action.moveEditorToSecondGroup"]
    },
    {
      "before": ["<C-w>", "<C-w>"],
      "commands": ["workbench.action.focusNextGroup"]
    }
  ]
}
```

settings.json：

```json
{
  "workbench.editor.limit.enabled": true,
  "workbench.editor.limit.perEditorGroup": true,
  "workbench.editor.limit.value": 10,
  "workbench.editor.labelFormat": "short"
}
```

---

**本章收获**：
- ✅ 理解编辑器组的概念
- ✅ 掌握在组间移动和复制文件
- ✅ 学会管理多窗口布局
- ✅ 建立适合自己的工作流布局

**效率提升**：合理组织编辑器组，让相关文件触手可及。
