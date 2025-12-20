# CSS 工作流优化

CSS 编辑有其独特的模式。掌握这些技巧，让样式编写更高效。

## 属性值操作

### 快速修改数值

CSS 中大量操作是修改数值：

```css
.box {
  width: 100px;
  padding: 16px;
  margin: 24px;
}
```

修改数值的技巧：

```
1. /100 搜索数字
2. ciw 改变数字
3. 输入新值
```

或者直接：

```
1. 光标在数字上
2. Ctrl+a 增加数字（VSCode Vim 默认关闭）
3. Ctrl+x 减少数字
```

### 启用数字增减

```json
{
  "vim.handleKeys": {
    "<C-a>": true,
    "<C-x>": true
  }
}
```

现在可以用 `Ctrl+a` / `Ctrl+x` 快速调整数值。

### 批量修改相同值

```css
.box {
  padding: 16px;
  margin: 16px;
  gap: 16px;
}
```

全部改成 20px：

```
1. /16px 搜索
2. cgn20px<Esc> 替换
3. .. 重复
```

## 选择器操作

### 修改选择器

```css
.old-class-name {
  /* styles */
}
```

改类名：

```
1. 0 跳到行首
2. w 跳到类名
3. cw 改变单词
4. 输入新类名
```

### 复制选择器

```
1. yy 复制整行
2. p 粘贴
3. 修改类名
```

### 快速添加伪类

```css
.button {
  color: blue;
}
```

添加 hover：

```
1. yy 复制选择器块
2. p 粘贴
3. f. 跳到点
4. ea:hover 追加伪类
5. 修改属性值
```

## 代码块操作

### 复制整个规则集

```css
.box {
  width: 100px;
  height: 100px;
}
```

复制整个规则：

```
1. 光标在 { 行
2. V 进入行可视
3. % 跳到匹配的 }
4. y 复制
5. p 粘贴
```

或者使用文本对象：

```
1. 光标在块内
2. yaB 复制整个块
3. p 粘贴
```

### 删除规则集

```
1. 光标在选择器行
2. V% 选到匹配括号
3. d 删除
```

## 常用编辑场景

### 场景 1：添加浏览器前缀

```css
/* 之前 */
.box {
  transform: rotate(45deg);
}

/* 之后 */
.box {
  -webkit-transform: rotate(45deg);
  transform: rotate(45deg);
}
```

操作：

```
1. yy 复制行
2. P 上方粘贴
3. I-webkit- 行首加前缀
```

实际开发中应该用 Autoprefixer 自动处理。

### 场景 2：展开简写属性

```css
/* 之前 */
.box {
  margin: 10px 20px;
}

/* 之后 */
.box {
  margin-top: 10px;
  margin-right: 20px;
  margin-bottom: 10px;
  margin-left: 20px;
}
```

这种场景手动比较繁琐，可以用 CSS 扩展或手动编写。

### 场景 3：颜色值操作

修改颜色：

```css
.text {
  color: #333333;
}
```

```
1. f# 跳到 #
2. ci; 改变到分号前的内容
3. 输入新颜色值
```

### 场景 4：创建变量

```css
/* 之前 */
.box {
  color: #3498db;
}

/* 之后 */
:root {
  --primary-color: #3498db;
}
.box {
  color: var(--primary-color);
}
```

操作：

```
1. yi; 复制颜色值
2. 移到 :root
3. 添加变量定义
4. 回到原位置，替换为 var(...)
```

## CSS 代码片段

### 常用 snippets

```json
{
  "Flexbox Center": {
    "prefix": "flexc",
    "body": [
      "display: flex;",
      "justify-content: center;",
      "align-items: center;"
    ]
  },
  "Grid Template": {
    "prefix": "gridt",
    "body": [
      "display: grid;",
      "grid-template-columns: ${1:repeat(3, 1fr)};",
      "gap: ${2:16px};"
    ]
  },
  "Position Absolute": {
    "prefix": "posa",
    "body": [
      "position: absolute;",
      "top: ${1:0};",
      "left: ${2:0};"
    ]
  },
  "Transition": {
    "prefix": "trans",
    "body": "transition: ${1:all} ${2:0.3s} ${3:ease};"
  }
}
```

### 使用

```
1. 输入 flexc
2. Tab 展开
```

## Emmet 在 CSS 中

Emmet 对 CSS 有强大的缩写支持：

| 缩写 | 展开结果 |
|------|----------|
| `m10` | `margin: 10px;` |
| `p20` | `padding: 20px;` |
| `w100` | `width: 100px;` |
| `h50p` | `height: 50%;` |
| `fz16` | `font-size: 16px;` |
| `c#333` | `color: #333;` |
| `df` | `display: flex;` |
| `dg` | `display: grid;` |
| `jcc` | `justify-content: center;` |
| `aic` | `align-items: center;` |

### 组合使用

```
m10-20   → margin: 10px 20px;
p10-20-30-40 → padding: 10px 20px 30px 40px;
bd1#ccc  → border: 1px solid #ccc;
```

## 格式化

### Prettier 配置

```json
{
  "prettier.singleQuote": true,
  "editor.formatOnSave": true,
  "[css]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Stylelint 配置

安装 Stylelint 扩展，配置 `.stylelintrc`:

```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "declaration-block-no-duplicate-properties": true,
    "color-no-invalid-hex": true
  }
}
```

## 键位映射

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 快速注释 CSS 属性
    {
      "before": ["<leader>", "/"],
      "commands": ["editor.action.commentLine"]
    },
    // 复制属性值
    {
      "before": ["<leader>", "y", "v"],
      "after": ["f", ":", "l", "y", "t", ";"]
    }
  ]
}
```

## CSS-in-JS

### styled-components 编辑

```javascript
const Button = styled.button`
  background: blue;
  color: white;
`;
```

在模板字符串内部，可以使用同样的 CSS 编辑技巧。

### Tailwind CSS

Tailwind 主要是类名操作：

```jsx
<div className="flex items-center justify-center p-4">
```

编辑技巧：

```
1. ci" 改变整个 className
2. /p-4 搜索定位
3. ciw 改变单个类名
```

### Tailwind 扩展

安装 "Tailwind CSS IntelliSense" 扩展，提供：

- 类名自动完成
- 悬浮显示实际 CSS
- 颜色预览

## 实用工作流

### 调试样式

```
1. 在浏览器调整好样式
2. 复制属性
3. 回到编辑器粘贴
```

### 响应式开发

```css
.box {
  width: 100%;
}

@media (min-width: 768px) {
  .box {
    width: 50%;
  }
}
```

快速添加媒体查询：

```
1. 复制原规则
2. 添加 @media 包裹
3. 修改属性值
```

---

**本章收获**：
- ✅ 掌握 CSS 属性值快速修改
- ✅ 学会使用 Emmet CSS 缩写
- ✅ 配置实用的 CSS snippets
- ✅ 理解 CSS-in-JS 编辑技巧

**效率提升**：样式编写更流畅，减少重复输入。
