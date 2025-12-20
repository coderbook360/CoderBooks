# CSS/SCSS 高效编辑

CSS/SCSS 编辑有其独特的模式，掌握这些技巧让样式编写更高效。

## CSS 值编辑

### 数值快速修改

| 操作 | 命令 | 示例 |
|------|------|------|
| 增加 1 | `Ctrl+a` | 10px → 11px |
| 减少 1 | `Ctrl+x` | 10px → 9px |
| 修改数值 | `ciw` | 修改整个数值 |

### 单位处理

```css
.element {
  width: 100px;
}
```

光标在 `100` 上：
- `ciw` → 修改数值
- `ea` → 在单位后追加
- `f;` → 跳转到行尾

## 属性操作

### 快速选择

```css
.button {
  padding: 10px 20px;
  background: #3498db;
  border-radius: 4px;
}
```

- `vi{` → 选中所有属性
- `ci{` → 修改所有属性
- `0f:w` → 跳转到属性值

### 属性行操作

| 操作 | 命令 |
|------|------|
| 删除当前属性 | `dd` |
| 复制当前属性 | `yy` |
| 复制到下方 | `yyp` |
| 向上移动 | `ddkP` |
| 向下移动 | `ddp` |

## 选择器编辑

### 快速修改选择器

```css
.old-class-name {
  /* ... */
}
```

- `ciw` → 修改类名
- `0f.` → 跳转到 `.`
- `ct{` → 修改到 `{`

### 嵌套选择器（SCSS）

```scss
.card {
  &-header { }
  &-body { }
  &-footer { }
}
```

- `f&` → 跳转到 `&`
- `ci-` → 修改后缀（需要定位）

## SCSS 特有操作

### 变量编辑

```scss
$primary-color: #3498db;
$secondary-color: #2ecc71;
```

- `f$` → 跳转到变量
- `ciw` → 修改变量名
- `f:w` → 跳转到值

### Mixin 操作

```scss
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

- `vi{` → 选中 mixin 内容
- `/flex-center` → 查找使用位置

## 颜色值编辑

### HEX 颜色

```css
color: #3498db;
```

- `f#` → 跳转到 `#`
- `c6l` → 修改 6 个字符
- `ci'` 或 `ci"` → 如果在引号内

### RGB/RGBA

```css
background: rgba(52, 152, 219, 0.8);
```

- `vi(` → 选中括号内容
- `ci(` → 修改颜色值
- `f,` → 跳转到下一个参数

## 多值属性

### padding/margin

```css
padding: 10px 20px 10px 20px;
```

- `f ` → 跳转到空格
- `ciw` → 修改单个值
- `dt;` → 删除到分号

### 简写展开

将简写展开为完整形式：

```css
/* 前 */
margin: 10px;

/* 后 */
margin-top: 10px;
margin-right: 10px;
margin-bottom: 10px;
margin-left: 10px;
```

操作：
1. 选中行
2. 使用 VSCode 命令或手动展开

## 媒体查询编辑

### 快速导航

```scss
@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 960px;
  }
}
```

- `/@media` → 搜索媒体查询
- `n/N` → 下一个/上一个
- `vi{` → 选中媒体查询内容

### 断点复制

1. `va{` → 选中整个媒体查询块
2. `y` → 复制
3. 导航到目标位置
4. `p` → 粘贴
5. 修改断点值

## 动画编辑

### keyframes

```css
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

- `vi{` → 选中帧内容
- `f%` → 跳转到百分比
- `ciw` → 修改百分比值

## 批量修改

### 统一修改颜色

场景：将所有 `#3498db` 改为 `#2980b9`

```
:%s/#3498db/#2980b9/g
```

### 修改类名前缀

```
:%s/\.old-prefix-/\.new-prefix-/g
```

### 统一单位

```
:%s/\d\+px/&rem/g  " 在所有 px 值后添加 rem（需要手动调整）
```

## Emmet CSS

### 快速输入

| 缩写 | 展开 |
|------|------|
| `m10` | `margin: 10px;` |
| `p10-20` | `padding: 10px 20px;` |
| `df` | `display: flex;` |
| `jcc` | `justify-content: center;` |
| `aic` | `align-items: center;` |
| `bgc#f` | `background-color: #fff;` |
| `w100%` | `width: 100%;` |

### 配置

```json
{
  "emmet.triggerExpansionOnTab": true,
  "emmet.includeLanguages": {
    "scss": "css"
  }
}
```

## CSS 排序

### 按字母排序

1. 选中属性块
2. 使用 VSCode 命令：Sort Lines Ascending

### 按类型排序（推荐）

使用 CSScomb 等工具按类型分组：
- 定位属性
- 盒模型
- 排版
- 视觉效果

## 常用配置

```json
{
  // CSS 自动补全
  "css.completion.completePropertyWithSemicolon": true,
  "css.completion.triggerPropertyValueCompletion": true,
  
  // SCSS 支持
  "scss.completion.completePropertyWithSemicolon": true,
  
  // 颜色预览
  "editor.colorDecorators": true,
  
  // Emmet CSS
  "emmet.syntaxProfiles": {
    "css": "css",
    "scss": "css"
  }
}
```

## 效率快捷键映射

```json
{
  "vim.normalModeKeyBindings": [
    // 快速添加分号并换行
    {
      "before": ["<leader>", ";"],
      "after": ["A", ";", "<Escape>"]
    },
    // 复制属性到下一行
    {
      "before": ["<leader>", "d"],
      "after": ["y", "y", "p"]
    }
  ]
}
```

## 效率技巧总结

| 任务 | 最快操作 |
|------|----------|
| 修改属性值 | `f:wciw` |
| 删除属性行 | `dd` |
| 复制属性 | `yyp` |
| 选中属性块 | `vi{` |
| 修改选择器 | `ct{` |
| 增加数值 | `Ctrl+a` |
| 减少数值 | `Ctrl+x` |
| 颜色编辑 | `f#c6l` |

## 总结

CSS/SCSS 高效编辑要点：

1. **数值操作**：`Ctrl+a/x` 快速增减
2. **属性块操作**：`vi{`/`ci{` 是核心
3. **行级操作**：`dd`/`yy`/`p` 处理属性
4. **Emmet**：快速输入常用属性
5. **搜索替换**：批量修改颜色、类名

---

**下一步**：学习 JavaScript/TypeScript 重构实战技巧。
