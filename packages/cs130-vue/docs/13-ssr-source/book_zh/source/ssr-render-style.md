# ssrRenderStyle 样式渲染

样式属性的处理比类名更复杂。Vue 支持字符串和对象两种形式，而对象形式涉及到属性名转换、单位处理、浏览器前缀等问题。

## Style 的多种形态

```html
<!-- 字符串形式 -->
<div style="color: red; font-size: 14px">

<!-- 对象形式（推荐） -->
<div :style="{ color: 'red', fontSize: '14px' }">

<!-- 数组形式（多个样式对象合并） -->
<div :style="[baseStyles, overrideStyles]">

<!-- 混合使用 -->
<div style="color: red" :style="{ fontSize: '14px' }">
```

最终都要转换为 `style="..."` 形式的 HTML 属性。

## 函数签名

```typescript
function ssrRenderStyle(raw: unknown): string
```

接收任意类型，返回 CSS 样式字符串。

## 核心实现

```typescript
function ssrRenderStyle(raw: unknown): string {
  if (raw == null) {
    return ''
  }
  
  if (typeof raw === 'string') {
    return raw
  }
  
  if (Array.isArray(raw)) {
    // 合并多个样式对象
    const merged = {}
    for (const style of raw) {
      const normalized = normalizeStyle(style)
      if (normalized) {
        Object.assign(merged, normalized)
      }
    }
    return styleObjectToString(merged)
  }
  
  if (typeof raw === 'object') {
    return styleObjectToString(raw as Record<string, string>)
  }
  
  return ''
}
```

## 字符串形式

字符串形式直接返回，不做处理：

```typescript
if (typeof raw === 'string') {
  return raw
}
```

```javascript
ssrRenderStyle('color: red; font-size: 14px')
// 'color: red; font-size: 14px'
```

字符串形式不会被验证或规范化，开发者需要确保格式正确。

## 对象形式

对象是更推荐的方式，Vue 会处理属性名转换：

```typescript
function styleObjectToString(obj: Record<string, string>): string {
  let result = ''
  for (const key in obj) {
    const value = obj[key]
    if (value != null && value !== '') {
      const cssKey = hyphenate(key)
      result += `${result ? '; ' : ''}${cssKey}: ${value}`
    }
  }
  return result
}

function hyphenate(str: string): string {
  return str.replace(/\B([A-Z])/g, '-$1').toLowerCase()
}
```

camelCase 转换为 kebab-case：

```javascript
ssrRenderStyle({
  fontSize: '14px',
  backgroundColor: '#fff',
  WebkitTransform: 'rotate(45deg)'  // 注意 W 大写
})
// 'font-size: 14px; background-color: #fff; -webkit-transform: rotate(45deg)'
```

## 属性名规则

CSS 属性名在 JavaScript 中有特殊的书写规则：

**标准属性**使用 camelCase：

```javascript
{
  fontSize: '14px',      // font-size
  lineHeight: '1.5',     // line-height
  marginTop: '10px',     // margin-top
  borderBottomWidth: '1px' // border-bottom-width
}
```

**浏览器前缀**以大写字母开头：

```javascript
{
  WebkitTransition: 'all 0.3s',  // -webkit-transition
  MozUserSelect: 'none',         // -moz-user-select
  msFlexDirection: 'column'      // -ms-flex-direction
}
```

注意 `ms` 前缀比较特殊，通常用小写开头。

**自定义属性**（CSS 变量）直接使用原始名称：

```javascript
{
  '--primary-color': 'blue',
  '--spacing': '16px'
}
```

## 值的处理

某些值需要特殊处理。

**null 和空字符串**会被跳过：

```javascript
ssrRenderStyle({
  color: 'red',
  backgroundColor: null,
  fontSize: ''
})
// 'color: red'
```

**数值自动添加单位**。Vue 会为某些属性自动添加 `px`：

```javascript
// 注意：这是 normalizeStyle 的行为，不是 ssrRenderStyle
{
  width: 100,    // '100px'
  height: 50,    // '50px'
  zIndex: 10,    // '10'（无单位属性）
  opacity: 0.5   // '0.5'（无单位属性）
}
```

无单位的属性列表包括：`zIndex`、`opacity`、`flexGrow` 等。

## 数组形式

数组用于合并多个样式对象：

```typescript
if (Array.isArray(raw)) {
  const merged = {}
  for (const style of raw) {
    const normalized = normalizeStyle(style)
    if (normalized) {
      Object.assign(merged, normalized)
    }
  }
  return styleObjectToString(merged)
}
```

后面的样式会覆盖前面的：

```javascript
ssrRenderStyle([
  { color: 'red', fontSize: '14px' },
  { color: 'blue' }  // 覆盖 color
])
// 'color: blue; font-size: 14px'
```

数组中可以混合字符串和对象：

```javascript
ssrRenderStyle([
  'color: red',
  { fontSize: '14px' }
])
// 需要先将字符串解析为对象，然后合并
```

## 静态和动态样式合并

与 class 类似，静态和动态样式需要合并：

```html
<div style="color: red" :style="{ fontSize: '14px' }">
```

编译后：

```javascript
ssrRenderStyle(normalizeStyle([
  parseStyle('color: red'),
  { fontSize: '14px' }
]))
// 'color: red; font-size: 14px'
```

## 样式字符串解析

将字符串形式解析为对象：

```typescript
function parseStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {}
  style.split(';').forEach(item => {
    const [key, value] = item.split(':')
    if (key && value) {
      result[key.trim()] = value.trim()
    }
  })
  return result
}
```

这个解析比较简单，不处理所有边界情况（如值中包含 `:` 的情况）。

## 安全性考虑

样式值可能包含恶意代码：

```javascript
// 危险！
{
  background: 'url(javascript:alert(1))'
}
```

现代浏览器会阻止这类攻击，但 SSR 时仍需注意：

```typescript
function isSafeStyleValue(value: string): boolean {
  // 检测潜在的危险模式
  return !/expression|url\s*\(|javascript:/i.test(value)
}
```

Vue 在开发模式下会警告可疑的样式值。

## 转义处理

样式值中的特殊字符需要注意：

```javascript
ssrRenderStyle({
  content: '"Hello"',      // 引号
  fontFamily: 'Arial, "Helvetica Neue"'
})
// 'content: "Hello"; font-family: Arial, "Helvetica Neue"'
```

由于样式字符串最终会放在 HTML 属性中，需要确保不会破坏属性引号：

```typescript
function escapeStyleValue(value: string): string {
  // 样式值通常不需要额外转义，因为会被属性转义处理
  return value
}
```

## 性能优化

样式渲染的性能优化：

**静态样式内联**。编译器将静态样式直接写入：

```javascript
// 模板
<div style="color: red">

// 编译后
_push('<div style="color: red">')
```

**样式对象缓存**。如果样式对象是响应式的且未变化，缓存序列化结果：

```javascript
// 使用 computed 缓存样式对象
const computedStyle = computed(() => ({
  color: theme.value.primaryColor,
  fontSize: `${fontSize.value}px`
}))
```

**避免频繁创建对象**。每次渲染都创建新对象会增加 GC 压力：

```javascript
// 不好
<div :style="{ color: textColor }">

// 更好
const textStyle = computed(() => ({ color: textColor.value }))
<div :style="textStyle">
```

## 完整示例

```javascript
// 复杂场景
const baseStyles = {
  padding: '10px',
  margin: '5px'
}

const themeStyles = {
  color: 'blue',
  backgroundColor: 'white'
}

const conditionalStyles = {
  fontWeight: isBold ? 'bold' : null,
  textDecoration: isUnderline ? 'underline' : null
}

ssrRenderStyle([baseStyles, themeStyles, conditionalStyles])
// 假设 isBold = true, isUnderline = false
// 'padding: 10px; margin: 5px; color: blue; background-color: white; font-weight: bold'
```

## 与客户端一致性

与 class 一样，服务端和客户端的样式序列化必须一致：

```javascript
// 服务端
ssrRenderStyle({ fontSize: '14px', color: 'red' })
// 应该输出 'font-size: 14px; color: red'

// 客户端
// 元素的 style 属性也应该是相同的值
```

不一致会导致水合失败。Vue 共享序列化逻辑来确保一致性。

## 小结

`ssrRenderStyle` 将样式值序列化为 CSS 字符串：

1. 字符串直接返回
2. 对象转换属性名并格式化
3. 数组合并后处理
4. null 和空值被过滤
5. camelCase 转换为 kebab-case

样式处理涉及很多细节，但 Vue 在框架层面处理了这些复杂性，让开发者可以用舒适的 JavaScript 对象语法来写样式。
