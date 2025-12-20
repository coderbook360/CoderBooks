# 文件快速切换：Buffer 与最近文件

在大型项目中，你经常需要在多个文件间跳转。文件树导航太慢，Tab 太多又找不到。本章介绍更高效的文件切换方式。

## Quick Open：最快的文件打开方式

按 `Ctrl+P` 打开 Quick Open，这是 VSCode 最强大的文件导航工具。

### 基本用法

1. `Ctrl+P` → 打开 Quick Open
2. 输入文件名的一部分 → 实时过滤
3. `Enter` → 打开选中文件
4. `Ctrl+Enter` → 在新分屏打开

### 模糊匹配

Quick Open 支持模糊匹配：

- 输入 `btn` 可以匹配 `Button.tsx`
- 输入 `usf` 可以匹配 `useFetch.ts`
- 输入 `svc user` 可以匹配 `src/services/user.ts`

你不需要输入完整文件名，输入几个关键字符就能快速定位。

### 路径过滤

当多个文件名相同（如多个 `index.ts`），可以加上路径：

- 输入 `components/index` → 匹配 `src/components/index.ts`
- 输入 `hooks index` → 匹配 `src/hooks/index.ts`

### 配置到 Leader 键

```json
{
  "before": ["<Leader>", "f", "f"],
  "commands": ["workbench.action.quickOpen"]
}
```

`<Space>ff`（file find）快速打开 Quick Open。

## 最近文件

### Ctrl+Tab

按住 `Ctrl` 再按 `Tab`，可以看到最近访问的文件列表。继续按 `Tab` 选择，松开 `Ctrl` 确认。

这是在两三个文件间来回切换的最快方式。

### 最近文件列表

`Ctrl+E` 或 `Ctrl+P` 后输入空格，可以看到最近打开的文件列表。

配置到 Leader 键：

```json
{
  "before": ["<Leader>", "f", "r"],
  "commands": ["workbench.action.openRecent"]
}
```

`<Space>fr`（file recent）打开最近文件。

## Vim Buffer 命令

VSCode Vim 支持部分 Vim Buffer 命令：

| 命令 | 效果 |
|------|------|
| `:e {file}` | 打开文件 |
| `:e!` | 重新加载当前文件 |
| `:bn` | 下一个 Buffer |
| `:bp` | 上一个 Buffer |
| `:b {name}` | 切换到名称匹配的 Buffer |
| `:bd` | 关闭当前 Buffer |

`:b` 命令支持 Tab 补全，输入 `:b But<Tab>` 可以补全为 `:b Button.tsx`。

## 跳转列表

Vim 维护一个跳转列表，记录你的移动历史。

| 命令 | 效果 |
|------|------|
| `Ctrl+O` | 跳转到上一个位置 |
| `Ctrl+I` | 跳转到下一个位置 |

这在**跨文件跳转**后特别有用：

1. 你在 `App.tsx` 编辑
2. 用 `gd` 跳转到 `Button.tsx` 查看定义
3. 按 `Ctrl+O` → 立即返回 `App.tsx` 原来的位置

跳转列表将在代码导航章节详细讲解。

## 上一个文件

快速在两个文件间切换：

| 命令 | 效果 |
|------|------|
| `Ctrl+^` 或 `Ctrl+6` | 切换到上一个文件 |

这等价于 `Ctrl+Tab` 然后 `Enter`，但更快。

如果 `Ctrl+^` 不生效，可以配置：

```json
{
  "before": ["<Leader>", "<Leader>"],
  "commands": ["workbench.action.openPreviousRecentlyUsedEditor"]
}
```

`<Space><Space>` 双击 Leader 键切换到上一个文件。

## Go to Symbol

除了按文件名搜索，还可以按符号（函数、类、变量）搜索。

### 当前文件

`Ctrl+Shift+O` → 列出当前文件的所有符号

输入 `:` 可以按类型分组（函数、变量、类等）。

### 整个项目

`Ctrl+T` → 在整个项目中搜索符号

输入函数名可以直接跳转到定义位置。

配置到 Leader 键：

```json
[
  {
    "before": ["<Leader>", "s", "o"],
    "commands": ["workbench.action.gotoSymbol"]
  },
  {
    "before": ["<Leader>", "s", "s"],
    "commands": ["workbench.action.showAllSymbols"]
  }
]
```

- `<Space>so`：当前文件符号
- `<Space>ss`：全项目符号

## 工作流整合

不同场景使用不同方式：

| 场景 | 推荐方式 |
|------|----------|
| 打开已知文件名的文件 | `Ctrl+P` + 输入文件名 |
| 在两个文件间来回切换 | `Ctrl+^` 或 `<Space><Space>` |
| 跳转后返回 | `Ctrl+O` |
| 回到最近编辑的文件 | `Ctrl+Tab` |
| 查找某个函数的定义 | `Ctrl+T` + 函数名 |

## 完整 Leader 键配置

```json
[
  // 文件导航
  { "before": ["<Leader>", "f", "f"], "commands": ["workbench.action.quickOpen"] },
  { "before": ["<Leader>", "f", "r"], "commands": ["workbench.action.openRecent"] },
  { "before": ["<Leader>", "<Leader>"], "commands": ["workbench.action.openPreviousRecentlyUsedEditor"] },
  
  // 符号导航
  { "before": ["<Leader>", "s", "o"], "commands": ["workbench.action.gotoSymbol"] },
  { "before": ["<Leader>", "s", "s"], "commands": ["workbench.action.showAllSymbols"] }
]
```

## 实战：在组件和测试间切换

**场景**：你在编辑 `Button.tsx`，需要查看对应的测试文件 `Button.test.tsx`

**方法 1：Quick Open**

1. `Ctrl+P`
2. 输入 `btn test` 或 `button.test`
3. `Enter`

**方法 2：使用相关文件插件**

安装 "Related Files" 类的扩展，可以一键切换源文件和测试文件。

**方法 3：配置快捷键**

VSCode 有内置命令 `workbench.action.gotoRelatedFile`，可以跳转到相关文件。

## 效率对比

| 场景 | 鼠标/Tab 点击 | 键盘 |
|------|---------------|------|
| 打开项目中某个文件 | 10-20 秒（导航文件树） | 2-3 秒（Ctrl+P） |
| 切换到上一个文件 | 1-2 秒 | 0.3 秒（Ctrl+^） |
| 跳转后返回 | 无法快速返回 | 0.3 秒（Ctrl+O） |
| 找某个函数定义 | 10+ 秒 | 2 秒（Ctrl+T） |

---

**本章收获**：
- ✅ 掌握 Quick Open 的高效使用
- ✅ 学会使用跳转列表
- ✅ 配置文件切换快捷键
- ✅ 理解不同场景的最优切换方式

**效率提升**：文件切换效率提升 **5-10 倍**，真正实现"想到哪个文件就到哪个文件"。
