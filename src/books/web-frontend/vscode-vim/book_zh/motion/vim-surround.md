# vim-surround：括号引号操作

vim-surround 是处理"成对符号"的利器。括号、引号、标签——添加、删除、修改，都只需要几个按键。

## 什么是 surround

代码中到处都是成对符号：

- `"hello"` → 双引号
- `'world'` → 单引号
- `(param)` → 圆括号
- `{object}` → 大括号
- `[array]` → 方括号
- `<div>content</div>` → HTML 标签

vim-surround 提供三种操作：

| 操作 | 命令 | 含义 |
|------|------|------|
| 添加 | `ys` | You Surround |
| 删除 | `ds` | Delete Surround |
| 修改 | `cs` | Change Surround |

## 启用 vim-surround

VSCode Vim 内置了 vim-surround。默认启用，确认配置：

```json
{
  "vim.surround": true
}
```

## 添加 surround (ys)

`ys` + 动作 + 符号 = 给范围添加符号

```
ysiw"    给当前单词加双引号
ysiw)    给当前单词加圆括号
ysiw}    给当前单词加大括号
yss"     给整行加双引号
ys$"     从光标到行尾加双引号
```

### 演示：添加引号

```javascript
// 之前
const name = hello;
//           ↑ 光标在 hello

// ysiw"
const name = "hello";
```

### 演示：添加括号

```javascript
// 之前
const result = value;
//              ↑ 光标在 value

// ysiw(
const result = (value);
```

### 空格差异

`(` 和 `)` 有区别：
- `ysiw)` → `(value)` 无空格
- `ysiw(` → `( value )` 有空格

同理，`{` vs `}` 和 `[` vs `]`。

一般用右边的版本（无空格更常见）。

## 删除 surround (ds)

`ds` + 符号 = 删除符号

```
ds"    删除双引号
ds)    删除圆括号
ds}    删除大括号
dst    删除 HTML 标签
```

### 演示：删除引号

```javascript
// 之前
const name = "hello";
//            ↑ 光标在引号内

// ds"
const name = hello;
```

### 演示：删除括号

```javascript
// 之前
const result = (a + b);
//              ↑ 光标在括号内

// ds)
const result = a + b;
```

## 修改 surround (cs)

`cs` + 旧符号 + 新符号 = 替换符号

```
cs"'    双引号改单引号
cs)'    圆括号改单引号
cs}]    大括号改方括号
cs"<div>    双引号改 div 标签
```

### 演示：修改引号

```javascript
// 之前
const name = "hello";
//            ↑ 光标在引号内

// cs"'
const name = 'hello';
```

### 演示：括号改括号

```javascript
// 之前
const arr = [1, 2, 3];
//           ↑ 光标在方括号内

// cs]{
const arr = {1, 2, 3};
```

## HTML 标签操作

vim-surround 对 HTML/JSX 特别友好。

### 添加标签

```
ysiw<div>    给单词包裹 div 标签
ysip<div>    给段落包裹 div 标签
```

输入 `<div>` 后，它会自动生成闭合标签。

### 修改标签

```
cst<span>    把当前标签改为 span
```

`t` 代表 "tag"，表示当前包裹的标签。

### 删除标签

```
dst    删除包裹的标签
```

### 演示

```jsx
// 之前
<div>content</div>

// cst<span>
<span>content</span>

// dst
content
```

## 可视模式中的 surround

在可视模式中选中后，`S` 添加 surround：

```
1. v   进入可视模式
2. iw  选中单词
3. S"  用双引号包裹
```

或者直接选中任意文本：

```
1. v       进入可视模式
2. 移动扩展选区
3. S)      用圆括号包裹
```

## 实战场景

### 场景 1：字符串转模板字符串

```javascript
// 之前
const msg = "Hello " + name + "!";
//           ↑ 光标在这

// cs"`
const msg = `Hello ` + name + `!`;
// 然后手动整理成模板
const msg = `Hello ${name}!`;
```

### 场景 2：添加函数调用

```javascript
// 之前
const value = data;
//             ↑ 光标在 data

// ysiw)
const value = (data);

// i 进入插入模式，添加函数名
const value = parse(data);
```

### 场景 3：JSX 包裹

```jsx
// 之前
<span>Hello</span>
<span>World</span>

// V 选中两行
// S<div>
<div>
<span>Hello</span>
<span>World</span>
</div>
```

### 场景 4：快速加括号

代码需要加括号改变优先级：

```javascript
// 之前
a + b * c
//    ↑ 光标在 b

// ysiw)
a + (b) * c

// 不对，需要扩大范围
// u 撤销
// ys2w) 或者 v 选择再 S)
a + (b * c)
```

## 常用组合速查

| 命令 | 效果 |
|------|------|
| `ysiw"` | 单词加双引号 |
| `ysiw'` | 单词加单引号 |
| `ysiw)` | 单词加圆括号 |
| `ysiw}` | 单词加大括号 |
| `ysiw]` | 单词加方括号 |
| `yss)` | 整行加圆括号 |
| `ds"` | 删除双引号 |
| `ds)` | 删除圆括号 |
| `cs"'` | 双引号改单引号 |
| `cs)]` | 圆括号改方括号 |
| `dst` | 删除 HTML 标签 |
| `cst<span>` | 修改 HTML 标签 |
| `VS<div>` | 行选择后加 div 标签 |

## 配置

vim-surround 默认已启用，无需额外配置：

```json
{
  "vim.surround": true
}
```

---

**本章收获**：
- ✅ 掌握 ys（添加）、ds（删除）、cs（修改）三板斧
- ✅ 学会 HTML 标签的快速操作
- ✅ 熟悉可视模式中的 S 命令
- ✅ 应用于实际编码场景

**效率提升**：括号、引号、标签操作从多次按键变成几个字符，代码编辑更流畅。
