# 符号导航：函数与类的快速定位

在大型文件中，快速定位到某个函数或类是高频需求。VSCode 的符号导航功能配合 Vim 键位，可以极大提升代码定位效率。

## 什么是符号

"符号"是代码中的命名实体：

- 函数 / 方法
- 类 / 接口 / 类型
- 变量 / 常量
- 模块 / 命名空间

语言服务器会解析这些符号，让你能够搜索和跳转。

## 当前文件符号

| 命令 | VSCode 快捷键 | 效果 |
|------|---------------|------|
| `Ctrl+Shift+O` | 原生 | 打开当前文件符号列表 |

输入 `@` 后可以直接搜索符号名称。输入 `@:` 按类别分组显示。

但这个快捷键太长了。配置一个更顺手的 Vim 键位：

```json
{
  "before": ["<leader>", "o"],
  "commands": ["workbench.action.gotoSymbol"]
}
```

现在 `\o` 就能打开当前文件的符号列表。

### 实战演示

假设在一个 500 行的 React 组件中：

```
1. \o 打开符号列表
2. 输入 "hand" 过滤
3. 看到 handleClick, handleSubmit, handleChange
4. 回车选择目标函数
```

**耗时**：约 1 秒

**鼠标操作**：滚动寻找，可能需要 5-10 秒。

## 工作区符号

当你想找某个函数但不知道在哪个文件时，用工作区符号搜索：

| 命令 | VSCode 快捷键 | 效果 |
|------|---------------|------|
| `Ctrl+T` | 原生 | 打开工作区符号搜索 |

这会在整个项目中搜索符号。

配置 Vim 键位：

```json
{
  "before": ["<leader>", "s"],
  "commands": ["workbench.action.showAllSymbols"]
}
```

### 实战演示

要找项目中的 `useAuth` Hook：

```
1. \s 打开工作区符号搜索
2. 输入 "useAuth"
3. 看到所有匹配的符号和所在文件
4. 回车跳转
```

比 `Ctrl+P` 文件搜索更精确，因为它直接搜索代码符号，而不是文件名。

## 与其他搜索的区别

| 方式 | 搜索对象 | 适用场景 |
|------|----------|----------|
| `Ctrl+P` | 文件名 | 知道文件名 |
| `Ctrl+Shift+F` | 文本内容 | 全文搜索 |
| `Ctrl+Shift+O` | 当前文件符号 | 在当前文件定位 |
| `Ctrl+T` | 工作区符号 | 找函数/类，不知道文件 |

符号搜索的优势：
- 只搜索有意义的代码实体
- 结果更精确，噪音更少
- 直接显示符号类型（函数、类、变量等）

## 大纲视图

侧边栏的大纲（Outline）视图显示当前文件的符号结构：

```json
{
  "before": ["<leader>", "l"],
  "commands": ["outline.focus"]
}
```

`\l` 聚焦到大纲视图，然后用 `j/k` 浏览，回车跳转。

大纲视图的优势：
- 常驻显示，一目了然
- 能看到符号层级结构
- 支持折叠/展开

## 符号导航的语言支持

符号导航的效果取决于语言服务器的支持：

**支持良好**：
- TypeScript / JavaScript
- Python
- Go
- Java / Kotlin
- C# / C++

**支持有限**：
- 纯 CSS（只有选择器）
- Markdown（只有标题）
- JSON（只有顶级键）

## 配置优化

### 符号过滤

在 settings.json 中可以配置符号过滤：

```json
{
  "workbench.quickOpen.showAllSymbols": true
}
```

### 搜索行为

```json
{
  "search.quickOpen.includeSymbols": true
}
```

这让 `Ctrl+P` 也能搜索符号。

## 配合其他导航使用

### 1. 符号导航 + 定义跳转

```
1. \s 搜索 "UserService"
2. 回车跳转到类定义
3. gd 跳转到某个方法的实现细节
4. Ctrl+O 返回
```

### 2. 符号导航 + 引用查找

```
1. \o 找到 handleSubmit
2. gr 查看谁调用了它
3. 分析调用关系
```

## 面包屑导航

VSCode 顶部的面包屑显示当前位置的层级：

```
文件名 > 类名 > 方法名
```

点击任意层级可以展开同级符号。不过用键盘操作更快：

```json
{
  "before": ["<leader>", "b"],
  "commands": ["breadcrumbs.focusAndSelect"]
}
```

`\b` 聚焦面包屑，用方向键导航。

面包屑的优势：
- 显示当前位置的上下文
- 快速在同级符号间切换

## 完整配置

将所有符号导航快捷键汇总：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "o"],
      "commands": ["workbench.action.gotoSymbol"]
    },
    {
      "before": ["<leader>", "s"],
      "commands": ["workbench.action.showAllSymbols"]
    },
    {
      "before": ["<leader>", "l"],
      "commands": ["outline.focus"]
    },
    {
      "before": ["<leader>", "b"],
      "commands": ["breadcrumbs.focusAndSelect"]
    }
  ]
}
```

## 助记

- `\o`：**O**utline of current file
- `\s`：**S**ymbol in workspace
- `\l`：Outline **L**ist (侧边栏)
- `\b`：**B**readcrumbs

---

**本章收获**：
- ✅ 区分文件符号和工作区符号
- ✅ 配置 Leader 快捷键
- ✅ 理解符号导航与其他搜索的区别
- ✅ 掌握大纲和面包屑导航

**效率提升**：不再需要在大文件中滚动寻找函数，1 秒内定位到目标。
