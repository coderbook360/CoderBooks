# 搜索替换：跨文件处理

项目级别的搜索替换是重构的基础。VSCode 的搜索功能强大，配合 Vim 的批量编辑能力可以高效处理跨文件修改。

## 打开搜索

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+F` | 打开搜索面板 |
| `Ctrl+Shift+H` | 打开搜索替换面板 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "f", "f"],
  "commands": ["workbench.action.findInFiles"]
},
{
  "before": ["<leader>", "f", "r"],
  "commands": ["workbench.action.replaceInFiles"]
}
```

- `\ff`：搜索文件（Find in Files）
- `\fr`：搜索替换（Find and Replace）

## 搜索面板

### 基本搜索

1. `Ctrl+Shift+F` 打开搜索
2. 输入搜索词
3. 按 Enter 开始搜索
4. 结果显示在下方

### 搜索选项

搜索框右侧的图标：

| 图标 | 功能 | 快捷键 |
|------|------|--------|
| Aa | 区分大小写 | `Alt+C` |
| ab | 全词匹配 | `Alt+W` |
| .* | 正则表达式 | `Alt+R` |

### 限定搜索范围

在"要包含的文件"中输入 glob 模式：

```
*.ts           只搜索 ts 文件
src/**         只搜索 src 目录
!node_modules  排除 node_modules
```

多个模式用逗号分隔：

```
*.ts, *.tsx, !*.test.ts
```

## 搜索结果导航

结果列表中：

| 快捷键 | 效果 |
|--------|------|
| `Enter` | 打开文件并跳转到匹配位置 |
| `↑/↓` | 在结果间移动 |
| `←/→` | 折叠/展开文件 |
| `F4` | 下一个匹配 |
| `Shift+F4` | 上一个匹配 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "n"],
  "commands": ["search.action.focusNextSearchResult"]
},
{
  "before": ["<leader>", "N"],
  "commands": ["search.action.focusPreviousSearchResult"]
}
```

## 替换操作

### 单个替换

1. `Ctrl+Shift+H` 打开搜索替换
2. 输入搜索词和替换词
3. 点击结果旁的替换图标，或按相应快捷键

### 全部替换

| 按钮 | 效果 |
|------|------|
| 替换 | 替换当前匹配 |
| 全部替换 | 替换所有匹配 |

**全部替换前务必检查**——这会修改所有文件！

### 保留大小写

替换时保留原文的大小写：

搜索 `user`，替换为 `account`：
- `User` → `Account`
- `user` → `account`
- `USER` → `ACCOUNT`

启用"保留大小写"选项（AB 图标）。

## 正则表达式搜索

### 基础语法

| 模式 | 含义 |
|------|------|
| `.` | 任意字符 |
| `\d` | 数字 |
| `\w` | 单词字符 |
| `\s` | 空白字符 |
| `^` | 行首 |
| `$` | 行尾 |
| `*` | 零个或多个 |
| `+` | 一个或多个 |
| `?` | 零个或一个 |
| `()` | 捕获组 |
| `|` | 或 |

### 捕获组替换

使用 `$1`、`$2` 引用捕获组：

**搜索**：`console\.log\((.+)\)`

**替换**：`logger.debug($1)`

效果：
```javascript
// 之前
console.log(message)

// 之后
logger.debug(message)
```

### 常用正则示例

**查找所有 TODO 注释**：
```
// TODO.*$
```

**查找导入语句**：
```
^import .+ from .+$
```

**查找函数定义**：
```
function \w+\(
```

## 搜索编辑器

VSCode 有一个"搜索编辑器"，把搜索结果显示在编辑器中：

```
> Search: New Search Editor
```

在搜索编辑器中，你可以用 Vim 命令编辑结果，然后保存到原文件。

## 文件内搜索

在当前文件内搜索：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+F` | 在当前文件搜索 |
| `Ctrl+H` | 在当前文件搜索替换 |

但作为 Vim 用户，你更可能使用 `/` 搜索。

## Vim 替换命令

Vim 的替换命令也可用：

```
:s/old/new/g        当前行替换
:%s/old/new/g       全文件替换
:%s/old/new/gc      全文件替换，逐个确认
```

### cgn 工作流

Vim 的 `cgn` 是一个强大的替换技巧：

```
1. /pattern    搜索目标
2. cgn         修改当前匹配
3. 输入新内容
4. Escape
5. .           重复（对下一个匹配执行相同修改）
6. n           跳过当前，查看下一个
```

这比 `:%s` 更可控——你可以决定每个匹配是否替换。

## 实战场景

### 场景 1：批量重命名函数调用

旧 API `fetchData` 改为 `getData`：

```
1. Ctrl+Shift+H 打开搜索替换
2. 搜索：fetchData
3. 替换：getData
4. 检查结果
5. 全部替换
```

### 场景 2：正则批量修改

将 `console.log` 改为带文件名前缀：

```
搜索：console\.log\(
替换：console.log('[FILE]', 
```

### 场景 3：特定文件类型

只在测试文件中搜索：

```
1. 搜索：describe(
2. 要包含的文件：*.test.ts, *.spec.ts
3. 搜索
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "f", "f"],
      "commands": ["workbench.action.findInFiles"]
    },
    {
      "before": ["<leader>", "f", "r"],
      "commands": ["workbench.action.replaceInFiles"]
    },
    {
      "before": ["<leader>", "n"],
      "commands": ["search.action.focusNextSearchResult"]
    },
    {
      "before": ["<leader>", "N"],
      "commands": ["search.action.focusPreviousSearchResult"]
    }
  ]
}
```

搜索设置：

```json
{
  "search.useIgnoreFiles": true,
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

---

**本章收获**：
- ✅ 掌握跨文件搜索和替换
- ✅ 学会正则表达式搜索
- ✅ 了解 cgn 工作流
- ✅ 配置搜索排除规则

**效率提升**：项目级别的重构不再需要逐个文件修改，一次搜索替换搞定。
