# 面包屑与大纲：代码结构导航

大文件中，知道"我在哪里"和"怎么快速到达"同样重要。面包屑和大纲视图提供了代码结构的全局视角。

## 面包屑导航

面包屑（Breadcrumbs）显示在编辑器顶部，展示当前位置的层级结构：

```
src > components > Button.tsx > Button > render > handleClick
```

它告诉你：你在 `src/components/Button.tsx` 文件的 `Button` 组件的 `render` 方法的 `handleClick` 函数中。

### 启用面包屑

默认应该已启用。如果没有，在 settings.json 中：

```json
{
  "breadcrumbs.enabled": true
}
```

### 键盘操作面包屑

```json
{
  "before": ["<leader>", "b"],
  "commands": ["breadcrumbs.focusAndSelect"]
}
```

`\b` 聚焦到面包屑，然后：
- `h/l` 或 `←/→`：在层级间移动
- `j/k` 或 `↓/↑`：展开层级，显示同级元素
- `Enter`：跳转到选中位置
- `Escape`：退出面包屑

### 面包屑的妙用

**在同级符号间快速切换**：

```
1. \b 聚焦面包屑
2. 移动到方法层级
3. j 展开下拉
4. 看到同一个类的所有方法
5. 选择目标方法
6. Enter 跳转
```

这比滚动寻找或用 `Ctrl+Shift+O` 更直观。

**快速了解当前上下文**：

不用滚动到文件顶部，面包屑直接告诉你：这是哪个类的哪个方法。

## 大纲视图

大纲（Outline）视图在侧边栏，显示当前文件的符号树：

```
Button.tsx
├── imports
├── type Props
├── Button (function)
│   ├── state
│   ├── handleClick
│   └── render
└── export
```

### 打开大纲

大纲在侧边栏的 Explorer 下方。也可以单独聚焦：

```json
{
  "before": ["<leader>", "l"],
  "commands": ["outline.focus"]
}
```

`\l` 聚焦到大纲视图。

### 在大纲中导航

聚焦后：
- `j/k`：上下移动
- `h`：折叠当前项
- `l`：展开当前项
- `Enter`：跳转到符号位置
- `Space`：预览（不跳转）

### 大纲排序和过滤

右键大纲视图可以配置：

- **按位置排序**：按代码中的出现顺序
- **按名称排序**：字母顺序
- **按类型排序**：函数、类、变量分组

推荐"按位置排序"，与代码结构一致。

### 过滤大纲

在大纲视图聚焦时，直接输入文字可以过滤：

```
1. \l 聚焦大纲
2. 输入 "handle"
3. 只显示包含 "handle" 的符号
```

## 面包屑 vs 大纲

| 特性 | 面包屑 | 大纲 |
|------|--------|------|
| 位置 | 编辑器顶部 | 侧边栏 |
| 信息量 | 当前路径 | 完整结构 |
| 占用空间 | 很小 | 需要侧边栏空间 |
| 适用 | 快速切换同级符号 | 浏览整体结构 |

两者配合使用效果最佳。

## Go to Symbol

符号导航的另一种方式，上一章介绍过：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+O` 或 `\o` | 当前文件符号列表 |
| `Ctrl+T` 或 `\s` | 工作区符号搜索 |

这种方式更适合"我知道要找什么"的场景。

## 结构化代码阅读

阅读陌生代码时，结合使用这些工具：

```
1. 打开文件
2. \l 打开大纲，了解整体结构
3. 识别关键函数/类
4. Enter 跳转到感兴趣的符号
5. 阅读代码
6. \b 用面包屑确认当前位置
7. 在面包屑中切换到同级其他方法
```

## 代码折叠

大纲显示的是符号结构，而代码折叠操作的是代码块：

| 命令 | 效果 |
|------|------|
| `zc` | 折叠当前块 |
| `zo` | 展开当前块 |
| `za` | 切换折叠状态 |
| `zM` | 折叠所有 |
| `zR` | 展开所有 |
| `zC` | 递归折叠 |
| `zO` | 递归展开 |

代码折叠帮助你在大文件中聚焦于特定部分：

```
1. zM 折叠所有
2. 大纲中选择目标函数
3. zo 展开该函数
4. 专注阅读这个函数
```

## 配置优化

### 面包屑显示

```json
{
  "breadcrumbs.enabled": true,
  "breadcrumbs.filePath": "on",
  "breadcrumbs.symbolPath": "on",
  "breadcrumbs.icons": true
}
```

### 大纲设置

```json
{
  "outline.icons": true,
  "outline.showProperties": true,
  "outline.showVariables": true,
  "outline.showFunctions": true,
  "outline.showClasses": true
}
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "b"],
      "commands": ["breadcrumbs.focusAndSelect"]
    },
    {
      "before": ["<leader>", "l"],
      "commands": ["outline.focus"]
    },
    {
      "before": ["<leader>", "o"],
      "commands": ["workbench.action.gotoSymbol"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 掌握面包屑的键盘操作
- ✅ 学会使用大纲视图
- ✅ 理解代码折叠命令
- ✅ 建立结构化代码阅读流程

**效率提升**：在大文件中不再迷失，随时知道自己在哪，快速到达目的地。
