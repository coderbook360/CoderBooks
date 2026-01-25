# ssrRenderAttrs 属性渲染入口

属性渲染是 SSR 中的重要环节。`ssrRenderAttrs` 函数将 VNode 的 props 对象转换为 HTML 属性字符串。

## 属性的复杂性

HTML 属性看似简单，实际上有很多细节需要处理：

```html
<!-- 普通属性 -->
<div id="app" data-value="123">

<!-- class 可以是字符串、对象或数组 -->
<div class="btn btn-primary">
<div :class="{ active: isActive }">
<div :class="['btn', variant]">

<!-- style 也有多种形式 -->
<div style="color: red; font-size: 14px">
<div :style="{ color: textColor }">

<!-- 布尔属性 -->
<button disabled>
<input checked>

<!-- 值为 false 或 null 时不渲染 -->
<input :disabled="false">  <!-- 不渲染 disabled -->
```

`ssrRenderAttrs` 需要统一处理这些情况。

## 函数签名

```typescript
function ssrRenderAttrs(
  props: Record<string, unknown>,
  tag?: string
): string
```

函数返回属性字符串，包含前导空格。`tag` 参数用于某些标签特定的处理。

## 核心实现

```typescript
function ssrRenderAttrs(
  props: Record<string, unknown>,
  tag?: string
): string {
  let result = ''
  
  for (const key in props) {
    // 跳过需要特殊处理或不应渲染的属性
    if (shouldSkip(key)) {
      continue
    }
    
    const value = props[key]
    
    if (key === 'class') {
      result += ` class="${ssrRenderClass(value)}"`
    } else if (key === 'style') {
      result += ` style="${ssrRenderStyle(value)}"`
    } else {
      result += ssrRenderAttr(key, value)
    }
  }
  
  return result
}
```

函数遍历 props，根据属性类型调用不同的处理函数。

## 需要跳过的属性

有些属性不应该出现在 HTML 中：

```typescript
function shouldSkip(key: string): boolean {
  return (
    // Vue 内部属性
    key === 'key' ||
    key === 'ref' ||
    // 事件处理器（以 on 开头）
    key.startsWith('on') ||
    // innerHTML 和 textContent 由其他逻辑处理
    key === 'innerHTML' ||
    key === 'textContent'
  )
}
```

**key 和 ref**是 Vue 的内部属性，用于 diff 和模板引用，不是 HTML 属性。

**事件处理器**在服务端没有意义，它们只在客户端水合时附加：

```javascript
// 虚拟节点
{ 
  type: 'button',
  props: { 
    onClick: handleClick,  // 跳过，不渲染
    class: 'btn'           // 渲染
  }
}

// 输出
<button class="btn">
```

**innerHTML 和 textContent**会替代子节点内容，由元素渲染逻辑单独处理。

## 普通属性渲染

`ssrRenderAttr` 处理单个普通属性：

```typescript
function ssrRenderAttr(key: string, value: unknown): string {
  // 值为 false、null、undefined 时不渲染
  if (value === false || value == null) {
    return ''
  }
  
  // 值为 true 时渲染为布尔属性
  if (value === true) {
    return ` ${key}`
  }
  
  // 其他值转换为字符串并转义
  return ` ${key}="${escapeHtmlAttr(String(value))}"`
}
```

这里有几个细节：

**false、null、undefined**不渲染。这让条件属性变得很方便：

```html
<button :disabled="isLoading">
<!-- isLoading 为 true: <button disabled> -->
<!-- isLoading 为 false: <button> -->
```

**true**渲染为布尔属性（没有值）：

```html
<input :checked="true">
<!-- 输出：<input checked> -->
```

**其他值**转换为字符串并转义：

```javascript
ssrRenderAttr('data-id', 123)     // ' data-id="123"'
ssrRenderAttr('title', 'A & B')   // ' title="A &amp; B"'
```

## 属性值转义

属性值需要转义，但规则与文本内容不同：

```typescript
function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    // 换行符在属性中也需要转义
    .replace(/\n/g, '&#10;')
}
```

属性值使用双引号包裹，所以只需要转义 `&`、`"` 和换行符。

## class 属性

`ssrRenderClass` 处理各种 class 格式：

```typescript
function ssrRenderClass(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(ssrRenderClass).filter(Boolean).join(' ')
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value)
      .filter(key => value[key])
      .join(' ')
  }
  return ''
}
```

支持三种格式：

```javascript
// 字符串
ssrRenderClass('btn primary')  // 'btn primary'

// 数组
ssrRenderClass(['btn', 'primary', null])  // 'btn primary'

// 对象
ssrRenderClass({ btn: true, primary: true, disabled: false })  // 'btn primary'

// 嵌套
ssrRenderClass(['btn', { primary: true }])  // 'btn primary'
```

## style 属性

`ssrRenderStyle` 处理 style 对象：

```typescript
function ssrRenderStyle(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${hyphenate(k)}: ${v}`)
      .join('; ')
  }
  return ''
}

function hyphenate(str: string): string {
  // camelCase -> kebab-case
  return str.replace(/\B([A-Z])/g, '-$1').toLowerCase()
}
```

style 对象的键从 camelCase 转换为 kebab-case：

```javascript
ssrRenderStyle({
  fontSize: '14px',
  backgroundColor: '#fff'
})
// 'font-size: 14px; background-color: #fff'
```

## 特殊属性处理

某些属性需要根据标签类型特殊处理。

**value 属性**在表单元素上的处理：

```typescript
if (tag === 'textarea' && key === 'value') {
  // textarea 的 value 应该作为内容而不是属性
  return ''  // 跳过，由 renderElementVNode 处理
}
```

**checked、selected 等布尔属性**：

```typescript
const isBooleanAttr = new Set([
  'checked', 'selected', 'disabled', 'readonly', 'required',
  'multiple', 'autofocus', 'autoplay', 'controls', 'loop', 'muted'
])

if (isBooleanAttr.has(key)) {
  // 即使值是空字符串，也渲染为布尔属性
  if (value) {
    return ` ${key}`
  }
  return ''
}
```

## 枚举属性

有些属性有特定的合法值：

```typescript
const enumAttr = {
  contenteditable: ['true', 'false', 'inherit'],
  draggable: ['true', 'false'],
  spellcheck: ['true', 'false']
}

function ssrRenderEnumAttr(key: string, value: unknown): string {
  if (value === true) {
    return ` ${key}="true"`
  }
  if (value === false) {
    return ` ${key}="false"`
  }
  return ` ${key}="${value}"`
}
```

注意 `contenteditable="true"` 和 `contenteditable`（无值）是不同的：

```html
<!-- 两者含义不同 -->
<div contenteditable>
<div contenteditable="true">
```

## 动态属性

有时属性名也是动态的：

```html
<div :[dynamicAttr]="value">
```

编译后：

```javascript
ssrRenderAttr(dynamicAttr, value)
```

`ssrRenderAttr` 需要处理任意属性名。属性名也需要验证，防止注入：

```typescript
function isValidAttrName(name: string): boolean {
  // 属性名只能包含字母、数字、连字符、下划线
  return /^[a-zA-Z_][\w-]*$/.test(name)
}
```

## 性能优化

属性渲染在 SSR 中非常频繁，有几个优化点。

**静态属性提升**。编译器将静态属性预计算：

```javascript
// 编译前
<div class="container" id="app">

// 编译后
const _hoisted_attrs = ' class="container" id="app"'

function ssrRender() {
  _push(`<div${_hoisted_attrs}>`)
}
```

**属性合并**。多个属性源需要合并时：

```javascript
// v-bind 合并
<div :class="baseClass" :class="extraClass">

// 编译后使用 mergeProps
ssrRenderAttrs(mergeProps({ class: baseClass }, { class: extraClass }))
```

**缓存 class 和 style**。对象形式的 class 和 style 可能在多次渲染中保持不变，可以缓存序列化结果。

## 完整示例

```javascript
const props = {
  id: 'myButton',
  class: ['btn', { primary: true, disabled: false }],
  style: { fontSize: '14px', color: 'blue' },
  disabled: true,
  onClick: () => {},  // 会被跳过
  'data-id': 123
}

ssrRenderAttrs(props)
// ' id="myButton" class="btn primary" style="font-size: 14px; color: blue" disabled data-id="123"'
```

## 小结

`ssrRenderAttrs` 将 props 对象转换为 HTML 属性字符串：

1. 遍历 props，跳过 key、ref、事件处理器等
2. class 调用 `ssrRenderClass` 处理多种格式
3. style 调用 `ssrRenderStyle` 处理对象格式
4. 其他属性调用 `ssrRenderAttr` 处理
5. 布尔值和 null 有特殊处理规则
6. 所有值都经过适当的转义

在接下来的几章中，我们会深入分析 `ssrRenderAttr`、`ssrRenderClass` 和 `ssrRenderStyle` 的具体实现。
