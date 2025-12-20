# 选择扩展：融合 VSCode 与 Vim 选择

VSCode 的智能选择扩展功能与 Vim 可视模式的结合，提供了强大的文本选择能力。

## 选择扩展基础

### VSCode 扩展选择

- `Ctrl+Shift+→` - 扩展选择单词
- `Ctrl+Shift+←` - 收缩选择
- `Shift+Alt+→` - 扩展选择（语法感知）
- `Shift+Alt+←` - 收缩选择（语法感知）

### Vim 可视选择

- `v` - 字符选择
- `V` - 行选择
- `Ctrl+v` - 块选择

## 融合配置

### 智能扩展选择

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 扩展选择
    {
      "before": ["<leader>", "v"],
      "commands": ["editor.action.smartSelect.expand"]
    },
    // 收缩选择
    {
      "before": ["<leader>", "V"],
      "commands": ["editor.action.smartSelect.shrink"]
    }
  ],
  "vim.visualModeKeyBindingsNonRecursive": [
    // 可视模式下扩展
    {
      "before": ["v"],
      "commands": ["editor.action.smartSelect.expand"]
    },
    // 收缩
    {
      "before": ["V"],
      "commands": ["editor.action.smartSelect.shrink"]
    }
  ]
}
```

## 使用场景

### 场景 1：选择函数调用

```typescript
console.log(user.getName())
//              ^光标在这里
```

操作：`v` → `v` → `v` → `v`

选择进程：
1. `getName` - 方法名
2. `getName()` - 方法调用
3. `user.getName()` - 完整表达式
4. `console.log(user.getName())` - 整个语句

### 场景 2：选择 JSX 元素

```jsx
<div className="container">
  <span>Hello</span>
</div>
```

光标在 `Hello` 上：`v` 多次扩展：
1. `Hello` - 文本
2. `<span>Hello</span>` - 整个标签
3. 整个 div 内容

### 场景 3：选择函数体

```typescript
function processData(data: Data[]) {
  const filtered = data.filter(x => x.active)
  const mapped = filtered.map(x => x.value)
  return mapped.reduce((a, b) => a + b, 0)
}
```

光标在函数内部，连续 `v` 扩展到整个函数。

## Vim 文本对象 vs 智能选择

### Vim 文本对象

精确控制，需要知道目标类型：

```
viw  - 选择单词
vi"  - 选择引号内
vi{  - 选择大括号内
vit  - 选择标签内
vap  - 选择段落
```

### 智能选择

语法感知，渐进扩展：

```
v    - 开始选择
v    - 扩展到更大范围
v    - 继续扩展
V    - 收缩回上一范围
```

### 何时使用哪个？

| 场景 | 推荐方式 |
|------|----------|
| 已知目标范围 | Vim 文本对象 |
| 探索性选择 | 智能扩展 |
| 复杂嵌套结构 | 智能扩展 |
| 简单文本操作 | Vim 文本对象 |

## 高级配置

### 结合两种选择方式

```json
{
  "vim.visualModeKeyBindingsNonRecursive": [
    // v 智能扩展
    { "before": ["v"], "commands": ["editor.action.smartSelect.expand"] },
    // 保留原始 Vim 选择
    { "before": ["<C-v>"], "after": ["<C-v>"] },
    // 文本对象仍可用
    { "before": ["i", "w"], "after": ["i", "w"] },
    { "before": ["a", "w"], "after": ["a", "w"] }
  ]
}
```

### 选择后操作

选择完成后，可直接使用 Vim 操作符：

```
v v v     扩展选择到目标
d         删除
c         修改
y         复制
>         缩进
```

## 工作流示例

### 重构表达式

```typescript
const result = items.filter(x => x.active).map(x => x.value)
```

```
1. 光标在 filter 上
2. v v 选择到 filter(...)
3. y 复制
4. O 上方新建行
5. const filtered = p 粘贴
```

### 包装代码块

```typescript
doSomething()
doAnotherThing()
```

```
1. v v v 选择两行
2. S{ 用 surround 包装
```

结果：
```typescript
{
  doSomething()
  doAnotherThing()
}
```

---

**效率提升**：智能选择配合 Vim 操作符，选择任意复杂度的代码块都轻而易举。
