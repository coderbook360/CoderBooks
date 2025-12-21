# JSX 高效编辑

React 开发中，JSX 是主战场。掌握这些技巧，让组件编写行云流水。

## 标签操作

### 快速闭合标签

输入 `<div` 后：

- `>` 自动补全 `</div>`
- `/` 变成自闭合 `<div />`

### 标签文本对象

vim-surround 支持 HTML/JSX 标签：

| 命令 | 效果 |
|------|------|
| `cit` | 改变标签内的文本 |
| `dit` | 删除标签内的文本 |
| `yit` | 复制标签内的文本 |
| `cat` | 改变整个标签（含标签） |
| `dat` | 删除整个标签 |

### 示例

```jsx
<div className="box">
  <span>Hello World</span>
</div>
```

光标在 `span` 内：

- `cit` → 改变 "Hello World"
- `dat` → 删除整个 `<span>...</span>`
- `dst` → 删除 span 标签，保留 "Hello World"

## 属性操作

### 快速添加属性

在标签名后：

```
1. f> 跳到 >
2. i 空格className="..." 添加属性
```

更快：

```
1. ea 在标签名后追加
2. 空格className="..." 添加属性
```

### 修改属性值

```jsx
<Button variant="primary" size="large">
```

改变 variant 的值：

```
1. /variant 搜索
2. ci" 改变引号内容
3. 输入新值
```

### 删除属性

```
1. 光标在属性名上
2. daw 删除属性名
3. daw 删除属性值
```

或者更精准：

```
1. 找到属性开头
2. dt空格 或 dt> 删除到空格或标签结束
```

## 组件结构

### 快速包裹元素

选中内容，用标签包裹：

```jsx
// 之前
<span>text</span>

// 之后
<div className="wrapper">
  <span>text</span>
</div>
```

使用 vim-surround：

```
1. V 选中行
2. S<div> 或 S<div className="wrapper">
```

在 VSCode Vim 中，可能需要用其他方式：

```
1. O 上方新建行，输入 <div>
2. o 下方新建行，输入 </div>
3. 选中中间内容，> 缩进
```

### 提取组件

把 JSX 片段提取为组件：

```
1. 选中要提取的 JSX
2. d 剪切
3. 移到新文件或组件定义处
4. 创建新组件
5. 回到原位置，输入 <NewComponent />
```

VSCode 有重构功能可以自动完成。

## 常用编辑场景

### 场景 1：添加条件渲染

```jsx
// 之前
<Component />

// 之后
{condition && <Component />}
```

操作：

```
1. I{ 行首加 {
2. 输入 condition && 
3. A} 行尾加 }
```

### 场景 2：转换为三元表达式

```jsx
// 之前
<ComponentA />

// 之后
{condition ? <ComponentA /> : <ComponentB />}
```

操作：

```
1. I{condition ? 行首添加
2. A : <ComponentB />} 行尾添加
```

### 场景 3：添加 key 属性

```jsx
// 之前
{items.map(item => <Item />)}

// 之后
{items.map(item => <Item key={item.id} />)}
```

操作：

```
1. /Item 搜索
2. f> 跳到 >
3. i key={item.id} 添加属性
```

### 场景 4：转换为 Fragment

```jsx
// 之前
<div>
  <A />
  <B />
</div>

// 之后
<>
  <A />
  <B />
</>
```

操作：

```
1. /div 搜索
2. ciw 清空，直接 Esc（变成 <>）
3. /<\/div 搜索结束标签
4. ciw 清空（变成 </>）
```

## Props 操作

### 展开 props

```jsx
// 之前
<Button onClick={handleClick} disabled={isLoading} className="btn">

// 之后
<Button
  onClick={handleClick}
  disabled={isLoading}
  className="btn"
>
```

手动方式：

```
1. f空格 跳到空格
2. s回车<Tab> 替换为换行+缩进
3. 重复
```

自动方式：保存时 Prettier 格式化。

### 收缩 props

```jsx
// 之前（多行）
<Button
  onClick={handleClick}
>

// 之后（单行）
<Button onClick={handleClick}>
```

操作：

```
1. 选中多行 V...
2. J 合并行
3. 可能需要手动调整空格
```

## JSX 代码片段

### 常用 snippets

配置 VSCode snippets：

```json
{
  "React Function Component": {
    "prefix": "rfc",
    "body": [
      "export function ${1:Component}() {",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  );",
      "}"
    ]
  },
  "useState": {
    "prefix": "us",
    "body": "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState($2);"
  },
  "useEffect": {
    "prefix": "ue",
    "body": [
      "useEffect(() => {",
      "  $1",
      "}, [$2]);"
    ]
  }
}
```

### 使用 snippets

```
1. 输入 rfc
2. Tab 展开
3. 输入组件名
4. Tab 跳到下一个占位符
```

## Emmet 在 JSX 中

### 启用 JSX Emmet

```json
{
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  }
}
```

### 常用 Emmet

```
div.container       → <div className="container"></div>
ul>li*3            → <ul><li></li><li></li><li></li></ul>
button.btn.primary → <Button className="btn primary"></Button>
```

## 实用键位映射

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 快速添加 className
    {
      "before": ["<leader>", "c", "n"],
      "commands": [
        { "command": "editor.action.insertSnippet", "args": { "snippet": " className=\"$1\"" } }
      ]
    },
    // 在当前标签后添加兄弟标签
    {
      "before": ["<leader>", "a", "t"],
      "after": ["f", ">", "a"]
    }
  ]
}
```

## 高效工作流

### 新建组件

```
1. 新建文件 ComponentName.tsx
2. rfc<Tab> 展开模板
3. 输入组件名
4. 开始写 JSX
```

### 修改现有组件

```
1. gd 跳转到组件定义
2. 编辑
3. Ctrl+o 返回
```

### 重构 JSX

```
1. 识别重复模式
2. 选中提取为组件
3. 使用 props 传递数据
```

---

**本章收获**：
- ✅ 掌握 JSX 标签操作
- ✅ 学会高效编辑 props
- ✅ 熟练使用标签文本对象
- ✅ 配置实用的代码片段

**效率提升**：组件开发速度显著提升，减少重复的标签输入。
