# 命令面板：万能入口

VSCode 的命令面板（Command Palette）是控制一切的中心。几乎所有功能都可以通过命令面板访问。配合 Vim 键位，你可以告别鼠标点击菜单。

## 打开命令面板

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+P` 或 `F1` | 打开命令面板 |

在 Vim 配置中添加 Leader 快捷键：

```json
{
  "before": ["<leader>", "p"],
  "commands": ["workbench.action.showCommands"]
}
```

现在 `\p` 也能打开命令面板。

## 命令面板的语法

命令面板支持模糊搜索。只需要输入关键词：

```
format    → 找到格式化相关命令
git       → 找到 Git 相关命令
rename    → 找到重命名命令
```

不需要记住完整命令名，输入你能想到的关键词就行。

## 高频命令

以下命令值得记住：

### 文件操作

```
> Revert File              撤销所有未保存的修改
> Close All Editors        关闭所有编辑器
> Close Saved              只关闭已保存的文件
> Compare Active File      与另一个文件对比
```

### 编辑器操作

```
> Sort Lines Ascending     排序（升序）
> Sort Lines Descending    排序（降序）
> Join Lines               合并行
> Toggle Word Wrap         切换自动换行
> Transform to Uppercase   转大写
> Transform to Lowercase   转小写
```

### 视图操作

```
> Toggle Sidebar           切换侧边栏
> Toggle Panel             切换底部面板
> Toggle Zen Mode          禅模式
> Focus on Explorer        聚焦到文件树
```

### 开发相关

```
> Restart Extension Host   重启扩展
> Reload Window            重新加载窗口
> Developer: Toggle Developer Tools   打开开发者工具
```

## 配置常用命令的快捷键

命令面板的命令都可以绑定快捷键。通过 Vim 配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "r", "f"],
      "commands": ["workbench.action.files.revert"]
    },
    {
      "before": ["<leader>", "c", "a"],
      "commands": ["workbench.action.closeAllEditors"]
    },
    {
      "before": ["<leader>", "z"],
      "commands": ["workbench.action.toggleZenMode"]
    }
  ]
}
```

## Quick Open 系列

命令面板有几个变体：

| 快捷键 | 前缀 | 功能 |
|--------|------|------|
| `Ctrl+P` | (无) | 快速打开文件 |
| `Ctrl+Shift+P` | `>` | 执行命令 |
| `Ctrl+G` | `:` | 跳转到行 |
| `Ctrl+Shift+O` | `@` | 当前文件符号 |
| `Ctrl+T` | `#` | 工作区符号 |

你可以在 `Ctrl+P` 打开后，输入前缀切换模式：

```
Ctrl+P 打开
输入 >    切换到命令模式
输入 @    切换到符号模式
输入 :    切换到行号模式
```

## 在 Vim 中执行 Ex 命令

Vim 也有自己的命令模式，按 `:` 进入：

```
:w          保存
:q          退出
:wq         保存并退出
:e {file}   打开文件
:vs         垂直分屏
:sp         水平分屏
:%s/old/new/g   全局替换
```

VSCode Vim 支持部分 Ex 命令。完整列表可以在 VSCode Vim 文档中查看。

### Vim 命令 vs VSCode 命令

- Vim 的 `:` 命令是 Vim 内部的
- VSCode 的命令面板是 VSCode 的

建议：
- 简单操作（保存、退出）用 Vim 命令
- 复杂操作（Git、调试、扩展功能）用 VSCode 命令面板

## 最近命令

命令面板会记住你最近使用的命令，显示在顶部。常用命令会自动浮到前面。

## 任务运行

`Ctrl+Shift+P` → `Tasks: Run Task` 可以运行 VSCode 任务：

```json
{
  "before": ["<leader>", "t", "r"],
  "commands": ["workbench.action.tasks.runTask"]
}
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "p"],
      "commands": ["workbench.action.showCommands"]
    },
    {
      "before": ["<leader>", "r", "f"],
      "commands": ["workbench.action.files.revert"]
    },
    {
      "before": ["<leader>", "c", "a"],
      "commands": ["workbench.action.closeAllEditors"]
    },
    {
      "before": ["<leader>", "z"],
      "commands": ["workbench.action.toggleZenMode"]
    },
    {
      "before": ["<leader>", "t", "r"],
      "commands": ["workbench.action.tasks.runTask"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 掌握命令面板的使用方法
- ✅ 了解 Quick Open 的不同模式
- ✅ 学会绑定常用命令到 Leader 快捷键
- ✅ 理解 Vim 命令与 VSCode 命令的关系

**效率提升**：所有功能一键可达，再也不用记忆复杂的菜单路径。
