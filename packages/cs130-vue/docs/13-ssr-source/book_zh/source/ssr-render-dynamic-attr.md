# ssrRenderDynamicAttr 动态属性渲染

在 Vue 模板中，属性名也可以是动态的。`ssrRenderDynamicAttr` 处理这种情况，它需要在运行时确定属性名，并根据属性类型选择正确的渲染方式。

## 动态属性的使用场景

```html
<!-- 动态属性名 -->
<div :[attrName]="attrValue">

<!-- 常见于封装组件 -->
<input :type="inputType" :[validationAttr]="validationValue">

<!-- 动态 data 属性 -->
<div :['data-' + dataKey]="dataValue">
```

编译器无法在编译时确定属性类型，需要运行时处理。

## 函数签名

```typescript
function ssrRenderDynamicAttr(
  key: string,
  value: unknown,
  tag?: string
): string
```

接收属性名、属性值和可选的标签名，返回格式化的属性字符串。

## 与静态属性的区别

静态属性在编译时可以优化：

```javascript
// 静态属性：编译器知道这是 class
<div class="container">
// 编译为
_push('<div class="container">')

// 动态属性：编译器不知道属性类型
<div :[attr]="value">
// 编译为
_push(`<div${ssrRenderDynamicAttr(attr, value)}>`)
```

动态属性必须在运行时判断类型并选择处理方式。

## 核心实现

```typescript
function ssrRenderDynamicAttr(
  key: string,
  value: unknown,
  tag?: string
): string {
  // 1. 处理 null/undefined 键
  if (key == null) {
    return ''
  }
  
  // 2. 转换为小写进行类型判断
  const keyLower = key.toLowerCase()
  
  // 3. 根据属性名分派到不同处理函数
  if (keyLower === 'class') {
    return ` class="${ssrRenderClass(value)}"`
  }
  
  if (keyLower === 'style') {
    return ` style="${ssrRenderStyle(value)}"`
  }
  
  // 4. 检查是否应该跳过
  if (shouldSkipAttr(key)) {
    return ''
  }
  
  // 5. 普通属性处理
  return ssrRenderAttr(key, value)
}
```

## 属性名规范化

属性名需要处理大小写：

```typescript
const keyLower = key.toLowerCase()
```

HTML 属性名是大小写不敏感的：

```html
<!-- 以下两种写法等价 -->
<div CLASS="container">
<div class="container">
```

但 Vue 的 props 通常使用 camelCase，需要适当处理：

```javascript
// 动态属性
const attrName = 'onClick'

ssrRenderDynamicAttr(attrName, handler)
// 应该识别为事件处理器并跳过
```

## Class 和 Style 的特殊处理

当动态属性名是 `class` 或 `style` 时，需要使用专门的渲染函数：

```typescript
if (keyLower === 'class') {
  const classStr = ssrRenderClass(value)
  return classStr ? ` class="${classStr}"` : ''
}

if (keyLower === 'style') {
  const styleStr = ssrRenderStyle(value)
  return styleStr ? ` style="${styleStr}"` : ''
}
```

因为这两个属性支持对象和数组语法：

```javascript
const attrName = 'class'
const attrValue = { active: true, disabled: false }

ssrRenderDynamicAttr(attrName, attrValue)
// ' class="active"'
```

## 需要跳过的属性

某些属性不应该渲染：

```typescript
function shouldSkipAttr(key: string): boolean {
  // Vue 内部属性
  if (key === 'key' || key === 'ref') {
    return true
  }
  
  // 事件处理器
  if (key.startsWith('on') || key.startsWith('v-')) {
    return true
  }
  
  // innerHTML 和 textContent
  if (key === 'innerHTML' || key === 'textContent') {
    return true
  }
  
  return false
}
```

动态属性名可能是事件处理器：

```javascript
const handlers = {
  onClick: handleClick,
  onMouseover: handleHover
}

// 遍历并渲染
Object.entries(handlers).forEach(([key, value]) => {
  result += ssrRenderDynamicAttr(key, value)  // 都应该返回 ''
})
```

## 标签特定处理

某些属性在特定标签上有特殊含义：

```typescript
function ssrRenderDynamicAttr(
  key: string,
  value: unknown,
  tag?: string
): string {
  // ...
  
  // value 属性在 textarea 上是内容而非属性
  if (tag === 'textarea' && key === 'value') {
    return ''  // 由 renderElementVNode 单独处理
  }
  
  // checked/selected 等布尔属性
  if (isBooleanAttr(key)) {
    return value ? ` ${key}` : ''
  }
  
  // ...
}
```

## 完整实现

```typescript
function ssrRenderDynamicAttr(
  key: string,
  value: unknown,
  tag?: string
): string {
  if (key == null) {
    return ''
  }
  
  const keyLower = key.toLowerCase()
  
  // class 特殊处理
  if (keyLower === 'class') {
    const classStr = ssrRenderClass(value)
    return classStr ? ` class="${classStr}"` : ''
  }
  
  // style 特殊处理
  if (keyLower === 'style') {
    const styleStr = ssrRenderStyle(value)
    return styleStr ? ` style="${styleStr}"` : ''
  }
  
  // 跳过内部属性
  if (key === 'key' || key === 'ref') {
    return ''
  }
  
  // 跳过事件处理器
  if (
    key[0] === 'o' && key[1] === 'n' &&
    key.charCodeAt(2) > 96  // 第三个字符是小写字母
  ) {
    return ''
  }
  
  // innerHTML 和 textContent
  if (key === 'innerHTML' || key === 'textContent') {
    return ''
  }
  
  // textarea 的 value
  if (tag === 'textarea' && key === 'value') {
    return ''
  }
  
  // 普通属性
  return ssrRenderAttr(key, value)
}
```

## v-bind 对象语法

当使用 `v-bind` 绑定整个对象时，需要遍历处理：

```html
<div v-bind="attrs">
```

编译后：

```javascript
function ssrRender(_ctx, _push) {
  _push(`<div${ssrRenderAttrs(_ctx.attrs)}>`)
}
```

`ssrRenderAttrs` 内部使用 `ssrRenderDynamicAttr` 或类似逻辑处理每个属性。

## 属性合并

当有多个属性源时需要合并：

```html
<div class="static" v-bind="dynamicAttrs">
```

```javascript
// 使用 mergeProps 合并
ssrRenderAttrs(mergeProps(
  { class: 'static' },
  dynamicAttrs
))
```

`mergeProps` 会智能合并 class 和 style：

```javascript
mergeProps(
  { class: 'a', style: { color: 'red' } },
  { class: 'b', style: { fontSize: '14px' } }
)
// { class: 'a b', style: { color: 'red', fontSize: '14px' } }
```

## 安全性

动态属性名可能来自用户输入，需要验证：

```typescript
function isValidAttrName(name: string): boolean {
  // 属性名不能包含危险字符
  return /^[a-zA-Z_][\w\-:\.]*$/.test(name)
}

function ssrRenderDynamicAttr(key: string, value: unknown): string {
  if (!isValidAttrName(key)) {
    __DEV__ && warn(`Invalid attribute name: ${key}`)
    return ''
  }
  // ...
}
```

危险的属性名：

```javascript
// 这些会被拒绝
ssrRenderDynamicAttr('"><script>', 'value')
ssrRenderDynamicAttr('onclick', 'alert(1)')
```

## 性能考量

动态属性比静态属性开销更大：

```javascript
// 静态：编译时优化
<div class="container">
// 编译为常量字符串

// 动态：运行时判断
<div :[attr]="value">
// 需要类型检查和分派
```

应该尽量使用静态属性，只在必要时使用动态属性。

## 使用示例

```javascript
// 构建动态表单
const formFields = [
  { name: 'email', type: 'email', required: true },
  { name: 'age', type: 'number', min: 0, max: 120 }
]

function renderField(field) {
  let attrs = ''
  for (const [key, value] of Object.entries(field)) {
    if (key !== 'name') {
      attrs += ssrRenderDynamicAttr(key, value, 'input')
    }
  }
  return `<input name="${field.name}"${attrs}>`
}

// 渲染结果
// <input name="email" type="email" required>
// <input name="age" type="number" min="0" max="120">
```

## 小结

`ssrRenderDynamicAttr` 在运行时处理动态属性名：

1. 判断属性名类型（class、style 或普通属性）
2. 分派到相应的处理函数
3. 跳过内部属性和事件处理器
4. 验证属性名的合法性
5. 处理标签特定的属性

动态属性提供了灵活性，但也带来了运行时开销。在编写组件时，应该在灵活性和性能之间做出权衡。
