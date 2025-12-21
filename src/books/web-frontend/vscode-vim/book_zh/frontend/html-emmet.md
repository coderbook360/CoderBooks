# HTML 与 Emmet 技巧

HTML 编辑的核心是快速生成结构。Emmet 是 HTML 编写的加速器。

## Emmet 基础

### 什么是 Emmet

Emmet 是一个快速生成 HTML/CSS 的缩写系统。输入缩写，按 Tab 展开。

### 基本元素

```
div      → <div></div>
p        → <p></p>
span     → <span></span>
a        → <a href=""></a>
img      → <img src="" alt="">
```

### 类和 ID

```
div.container   → <div class="container"></div>
div#main        → <div id="main"></div>
div.box.active  → <div class="box active"></div>
div#main.box    → <div id="main" class="box"></div>
```

### 属性

```
a[href=#]           → <a href="#"></a>
input[type=text]    → <input type="text">
img[src=img.jpg]    → <img src="img.jpg" alt="">
```

### 文本内容

```
p{Hello}     → <p>Hello</p>
a{Click me}  → <a href="">Click me</a>
```

## Emmet 进阶

### 子元素 >

```
ul>li         → <ul><li></li></ul>
nav>ul>li     → <nav><ul><li></li></ul></nav>
```

### 兄弟元素 +

```
div+p+span    → <div></div><p></p><span></span>
header+main+footer → ...
```

### 上级 ^

```
div>p>span^p  → <div><p><span></span></p><p></p></div>
```

### 分组 ()

```
(header>nav)+main+footer
→
<header><nav></nav></header>
<main></main>
<footer></footer>
```

### 乘法 *

```
ul>li*5       → <ul><li></li>×5</ul>
div.item*3    → <div class="item"></div>×3
```

### 编号 $

```
ul>li.item$*3
→
<ul>
  <li class="item1"></li>
  <li class="item2"></li>
  <li class="item3"></li>
</ul>
```

补零：

```
li.item$$*3
→
<li class="item01"></li>
<li class="item02"></li>
<li class="item03"></li>
```

## 常用 Emmet 模板

### HTML 骨架

```
!
→
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>

</body>
</html>
```

### 导航结构

```
nav>ul>li*5>a[href=#]{Item $}
→
<nav>
  <ul>
    <li><a href="#">Item 1</a></li>
    <li><a href="#">Item 2</a></li>
    ...
  </ul>
</nav>
```

### 表单

```
form>input[type=text]+input[type=email]+button{Submit}
```

### 列表

```
ul.list>li.item*5>{Item $}
```

### 表格

```
table>tr>th*3^tr*3>td*3
```

## Vim 结合 Emmet

### 工作流

```
1. i 进入插入模式
2. 输入 Emmet 缩写
3. Tab 展开
4. Esc 回到普通模式
5. 使用 cit/dit 编辑标签内容
```

### 快速填充内容

```
1. Emmet 生成结构
2. cit 改变第一个标签内容
3. 移到下一个标签
4. . 重复（如果操作相同）
```

### 多光标 + Emmet

```
1. 多光标选中多行
2. 每行输入 Emmet
3. Tab 展开
```

## HTML 标签操作

### 使用 t 文本对象

vim-surround 的标签支持：

| 命令 | 效果 |
|------|------|
| `cit` | 改变标签内容 |
| `dit` | 删除标签内容 |
| `vit` | 选中标签内容 |
| `vat` | 选中整个标签 |

### 包裹内容

```
1. 选中内容
2. S<div> 用 div 包裹
```

在 VSCode Vim 中：

```
1. ysiw<span> 给单词加 span 标签
2. yss<div> 给整行加 div 标签
```

### 修改标签名

```html
<div class="box">content</div>
```

改 div 为 section：

```
1. 光标在标签名上
2. ciw 改变单词
3. 输入 section
4. 搜索 </div>
5. ciw 改变结束标签
```

或者一次改两个：

```
1. /<div 搜索开始标签
2. cgn<section 替换
3. /<\/div 搜索结束标签
4. cgn</section 替换
```

## 常用编辑场景

### 场景 1：添加包裹元素

```html
<!-- 之前 -->
<p>text</p>

<!-- 之后 -->
<div class="wrapper">
  <p>text</p>
</div>
```

操作：

```
1. V 选中行
2. O 上方新建行，输入 <div class="wrapper">
3. o 下方新建行，输入 </div>
4. 选中中间行，> 缩进
```

### 场景 2：提取公共结构

识别重复的 HTML 结构，考虑使用模板或组件。

### 场景 3：批量添加属性

```html
<a>Link 1</a>
<a>Link 2</a>
<a>Link 3</a>
```

添加 href：

```
1. /<a 搜索
2. ea href="#" 添加属性
3. n. 下一个，重复
```

### 场景 4：转换列表类型

```html
<!-- 之前 -->
<ul>
  <li>Item</li>
</ul>

<!-- 之后 -->
<ol>
  <li>Item</li>
</ol>
```

```
1. /ul 搜索
2. cgn ol 替换
3. /<\/ul 搜索
4. cgn </ol 替换
```

## VSCode HTML 设置

### 自动闭合标签

```json
{
  "html.autoClosingTags": true
}
```

### 自动更新配对标签

```json
{
  "editor.linkedEditing": true
}
```

启用后，修改开始标签会自动更新结束标签。

### Emmet 设置

```json
{
  "emmet.triggerExpansionOnTab": true,
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "vue-html": "html"
  }
}
```

## 键位映射

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 快速跳转到配对标签
    {
      "before": ["g", "t"],
      "after": ["%"]
    },
    // 选中标签内容
    {
      "before": ["<leader>", "i", "t"],
      "after": ["v", "i", "t"]
    }
  ]
}
```

## Emmet 自定义

### 自定义代码片段

`.vscode/settings.json`:

```json
{
  "emmet.extensionsPath": [".vscode"]
}
```

`.vscode/snippets.json`:

```json
{
  "html": {
    "snippets": {
      "card": "div.card>div.card-header+div.card-body+div.card-footer"
    }
  }
}
```

现在输入 `card` + Tab 会展开为完整的卡片结构。

## 实用技巧

### 快速注释

```
gcc     注释当前行
gc{motion}  注释指定范围
```

### 格式化 HTML

```
= 格式化选中区域
gg=G 格式化整个文件
```

或者 `Shift+Alt+F` 使用 VSCode 格式化。

### Lorem 文本

```
lorem → Lorem ipsum dolor sit amet...
lorem10 → 10 个单词的 Lorem 文本
p*3>lorem → 3 个带 Lorem 文本的段落
```

---

**本章收获**：
- ✅ 掌握 Emmet 核心语法
- ✅ 学会快速生成 HTML 结构
- ✅ 熟练使用标签文本对象
- ✅ 配置高效的 HTML 编辑环境

**效率提升**：HTML 结构生成从逐字输入变成一行缩写，效率提升数倍。
