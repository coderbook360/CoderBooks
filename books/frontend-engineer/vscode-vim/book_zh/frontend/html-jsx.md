# HTML/JSX 快速编辑技巧

HTML 和 JSX 是前端开发的基础，掌握高效编辑技巧让你事半功倍。

## HTML/JSX 中的文本对象

### 标签操作

| 操作 | 命令 | 说明 |
|------|------|------|
| 选中标签内容 | `vit` | 选中 inner tag |
| 选中整个标签 | `vat` | 选中 around tag |
| 删除标签内容 | `dit` | 删除标签内容 |
| 修改标签内容 | `cit` | 修改标签内容 |
| 复制标签内容 | `yit` | 复制标签内容 |

### 实际示例

```html
<div class="container">
  <p>Hello World</p>
</div>
```

光标在 `Hello World` 上：

- `cit` → 修改 `<p>` 内的文本
- `dat` → 删除整个 `<p>` 元素
- `vat` → 选中整个 `<p>` 元素

## Emmet 快速展开

### 基础展开

| 输入 | 展开结果 |
|------|----------|
| `div.container` + Tab | `<div class="container"></div>` |
| `ul>li*3` + Tab | 3 个 li 的 ul |
| `div#app.main` + Tab | `<div id="app" class="main"></div>` |
| `input:text` + Tab | `<input type="text">` |

### JSX 特殊处理

```jsx
// 输入 div.wrapper>div.item*3
// 展开后
<div className="wrapper">
  <div className="item"></div>
  <div className="item"></div>
  <div className="item"></div>
</div>
```

### VSCode 设置

```json
{
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "emmet.triggerExpansionOnTab": true
}
```

## JSX 特有操作

### className 快速编辑

光标在 `className="..."` 中：

- `ci"` → 修改类名内容
- `da"` → 删除整个属性值

### Props 操作

```jsx
<Button
  onClick={handleClick}
  disabled={isLoading}
  className="primary"
>
```

- `f=` → 跳转到下一个属性值
- `ci{` → 修改花括号内容
- `vi{` → 选中花括号内容

## 标签重命名

### 使用 Vim Surround

```html
<!-- 将 div 改为 section -->
<div class="content">...</div>
```

1. 光标移到开标签
2. `cst<section>` → 修改 surrounding tag

### 使用 VSCode 联动重命名

1. 光标放在标签名上
2. `F2` → 输入新标签名
3. 开闭标签同时更新

配置：

```json
{
  "editor.linkedEditing": true
}
```

## 属性快速添加

### 手动添加

1. 光标在标签内
2. `f>` → 找到 `>`
3. `i ` → 在 `>` 前插入空格
4. 输入属性

### 使用 Emmet

输入 `div[data-id="123"]` + Tab：

```html
<div data-id="123"></div>
```

## 多属性编辑

### 场景：添加相同属性

```jsx
// 前：
<Input />
<Input />
<Input />

// 后：添加 size="large"
<Input size="large" />
<Input size="large" />
<Input size="large" />
```

操作：
1. 搜索 `<Input`
2. `cgn` → 修改为 `<Input size="large"`
3. `.` 重复所有匹配

### 场景：修改属性值

```jsx
// 修改所有 variant="outlined" 为 variant="contained"
```

1. `:%s/variant="outlined"/variant="contained"/g`

## 嵌套结构编辑

### 快速包裹

选中内容后，使用 Vim Surround：

```html
<!-- 选中文本 Hello -->
Hello

<!-- 按 S<span class="highlight"> -->
<span class="highlight">Hello</span>
```

### 快速解包

```html
<div><span>Hello</span></div>
```

光标在 span 上：
- `dst` → 删除 span 标签，保留内容

## 条件渲染快速编辑

### 三元表达式

```jsx
{isLoading ? <Spinner /> : <Content />}
```

- `f?` → 跳转到 `?`
- `ci{` → 修改整个表达式

### 逻辑与渲染

```jsx
{isVisible && <Modal />}
```

- `vi{` → 选中整个表达式
- `c` → 修改

## 列表渲染编辑

### map 函数编辑

```jsx
{items.map(item => (
  <ListItem key={item.id}>
    {item.name}
  </ListItem>
))}
```

快速操作：
- `vi(` → 选中 map 回调内容
- `va(` → 选中包含括号
- `f>` + `a` → 在箭头后插入

## 组件提取

### 场景：提取重复 JSX

```jsx
// 前：内联 JSX
<div className="card">
  <h2>{title}</h2>
  <p>{description}</p>
</div>

// 后：提取为组件
<Card title={title} description={description} />
```

操作流程：
1. `vat` 选中整个 div
2. `d` 剪切
3. 创建新组件文件
4. `p` 粘贴
5. 添加 props 接口

## 常用配置

```json
{
  // Emmet 支持 JSX
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  
  // 标签联动编辑
  "editor.linkedEditing": true,
  
  // 自动闭合标签
  "html.autoClosingTags": true,
  "javascript.autoClosingTags": true,
  "typescript.autoClosingTags": true,
  
  // 属性自动补全
  "html.completion.attributeDefaultValue": "doublequotes"
}
```

## 效率技巧总结

| 任务 | 最快操作 |
|------|----------|
| 修改标签内容 | `cit` |
| 删除整个标签 | `dat` |
| 修改属性值 | `ci"` 或 `ci{` |
| 重命名标签 | `F2`（联动编辑）|
| 包裹元素 | Visual + `S<tag>` |
| 解包元素 | `dst` |
| 复制元素 | `yat` + `p` |

## 总结

HTML/JSX 编辑的核心技巧：

1. **熟练使用 `it`/`at` 文本对象**：标签操作的基础
2. **掌握 Emmet**：快速创建结构
3. **利用联动编辑**：标签重命名
4. **Vim Surround**：包裹和解包
5. **搜索替换**：批量修改属性

---

**下一步**：学习 CSS/SCSS 的高效编辑技巧。
