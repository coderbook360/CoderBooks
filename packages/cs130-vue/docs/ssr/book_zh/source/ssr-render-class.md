# ssrRenderClass 类名渲染

CSS class 是 HTML 属性中最灵活的一个。Vue 支持字符串、对象、数组等多种格式，`ssrRenderClass` 负责将这些格式统一序列化为空格分隔的类名字符串。

## Class 的多种形态

在 Vue 模板中，class 可以用多种方式指定：

```html
<!-- 静态类名 -->
<div class="container">

<!-- 动态绑定：字符串 -->
<div :class="className">

<!-- 动态绑定：对象语法 -->
<div :class="{ active: isActive, 'text-danger': hasError }">

<!-- 动态绑定：数组语法 -->
<div :class="[activeClass, errorClass]">

<!-- 混合使用 -->
<div class="static" :class="{ dynamic: condition }">

<!-- 数组中嵌套对象 -->
<div :class="[{ active: isActive }, errorClass]">
```

所有这些最终都要转换为 `class="..."` 形式的 HTML 属性。

## 函数签名

```typescript
function ssrRenderClass(raw: unknown): string
```

函数接收任意类型的输入，返回空格分隔的类名字符串。

## 核心实现

```typescript
function ssrRenderClass(raw: unknown): string {
  if (raw == null || raw === false) {
    return ''
  }
  
  if (typeof raw === 'string') {
    return raw
  }
  
  if (Array.isArray(raw)) {
    return raw.map(ssrRenderClass).filter(Boolean).join(' ')
  }
  
  if (typeof raw === 'object') {
    let result = ''
    for (const key in raw as Record<string, boolean>) {
      if ((raw as Record<string, boolean>)[key]) {
        if (result) result += ' '
        result += key
      }
    }
    return result
  }
  
  return ''
}
```

逻辑清晰：根据输入类型分别处理，最终产出字符串。

## 字符串类型

最简单的情况，直接返回：

```typescript
if (typeof raw === 'string') {
  return raw
}
```

使用场景：

```javascript
ssrRenderClass('btn btn-primary')  // 'btn btn-primary'
ssrRenderClass('')                 // ''
```

字符串可以包含多个空格分隔的类名，Vue 不会对其进行额外处理。

## 对象类型

对象语法允许条件性地添加类名：

```typescript
if (typeof raw === 'object') {
  let result = ''
  for (const key in raw as Record<string, boolean>) {
    if ((raw as Record<string, boolean>)[key]) {
      if (result) result += ' '
      result += key
    }
  }
  return result
}
```

对象的键是类名，值决定是否包含该类名：

```javascript
ssrRenderClass({ active: true, disabled: false })
// 'active'

ssrRenderClass({ 'btn': true, 'btn-primary': true, 'btn-disabled': false })
// 'btn btn-primary'

ssrRenderClass({ active: 1, disabled: 0 })  // 真值判断
// 'active'
```

注意对象属性的遍历顺序在现代 JavaScript 中是确定的，但不应该依赖顺序。

## 数组类型

数组可以包含字符串、对象或嵌套数组：

```typescript
if (Array.isArray(raw)) {
  return raw.map(ssrRenderClass).filter(Boolean).join(' ')
}
```

递归调用处理每个元素：

```javascript
ssrRenderClass(['btn', 'primary'])
// 'btn primary'

ssrRenderClass(['btn', { active: true }])
// 'btn active'

ssrRenderClass(['btn', null, { active: true }, undefined])
// 'btn active'  (null/undefined 被过滤)

ssrRenderClass([['a', 'b'], 'c'])
// 'a b c'  (嵌套数组被展平)
```

`filter(Boolean)` 过滤掉空字符串，避免多余的空格。

## Null 和 False

null、undefined 和 false 表示"无类名"：

```typescript
if (raw == null || raw === false) {
  return ''
}
```

这让条件渲染变得方便：

```javascript
<div :class="condition ? 'active' : false">

// condition 为 true: class="active"
// condition 为 false: class=""  (或不渲染 class 属性)
```

## 静态和动态类名合并

当元素同时有静态 `class` 和动态 `:class` 时，需要合并：

```html
<div class="static" :class="{ dynamic: true }">
```

编译器会处理这种情况：

```javascript
// 编译后
ssrRenderAttrs({
  class: normalizeClass(['static', { dynamic: true }])
})
```

`normalizeClass` 是 Vue 的工具函数，将多个 class 值合并：

```typescript
function normalizeClass(value: unknown): string {
  // 与 ssrRenderClass 类似的逻辑
  return ssrRenderClass(value)
}
```

## 类名的规范化

Vue 不会对类名进行额外的规范化：

```javascript
ssrRenderClass('  btn   primary  ')
// '  btn   primary  '  (保留原始空格)

ssrRenderClass({ '  spaced  ': true })
// '  spaced  '  (保留键中的空格)
```

这意味着开发者需要确保类名的正确性。多余的空格虽然在浏览器中通常无害，但会增加 HTML 体积。

## 特殊值处理

一些边界情况的处理：

```javascript
ssrRenderClass(0)       // ''  (0 是假值)
ssrRenderClass(true)    // ''  (布尔值不是有效的类名)
ssrRenderClass(123)     // ''  (数字不是有效的类名)
ssrRenderClass(() => {}) // '' (函数不是有效的类名)
```

只有字符串、对象和数组会产生有效输出。

## 性能优化

类名渲染在 SSR 中非常频繁。几个优化点：

**静态类名提升**。编译器将静态类名直接内联：

```javascript
// 模板
<div class="container">

// 编译后
_push('<div class="container">')  // 直接写入，不调用 ssrRenderClass
```

**避免不必要的数组创建**。编译器尽量避免创建临时数组：

```javascript
// 优化前
ssrRenderClass([staticClass, dynamicClass])

// 优化后（如果可以确定类型）
`${staticClass} ${ssrRenderClass(dynamicClass)}`
```

**缓存对象类名**。如果对象是响应式的且未变化，可以缓存结果。

## 完整示例

```javascript
// 复杂场景
const props = {
  static: 'btn',
  dynamic: { primary: true, disabled: false },
  list: ['hover', { active: true }]
}

ssrRenderClass([props.static, props.dynamic, props.list])
// 1. 处理 'btn' -> 'btn'
// 2. 处理 { primary: true, disabled: false } -> 'primary'
// 3. 处理 ['hover', { active: true }]
//    - 处理 'hover' -> 'hover'
//    - 处理 { active: true } -> 'active'
//    -> 'hover active'
// 4. 合并 -> 'btn primary hover active'
```

## 与客户端的一致性

`ssrRenderClass` 的输出必须与客户端 `normalizeClass` 一致，否则会导致水合不匹配：

```javascript
// 服务端
ssrRenderClass({ a: true, b: true })  // 'a b'

// 客户端
normalizeClass({ a: true, b: true })  // 必须也是 'a b'

// 如果不一致，水合时会报错或产生 bug
```

Vue 通过共享相同的实现逻辑来确保一致性。

## 空 class 属性的处理

当所有类名都不满足条件时：

```javascript
ssrRenderClass({ active: false, disabled: false })
// ''
```

`ssrRenderAttrs` 会处理这种情况：

```typescript
if (key === 'class') {
  const classStr = ssrRenderClass(value)
  if (classStr) {
    result += ` class="${classStr}"`
  }
  // 空字符串时不渲染 class 属性
}
```

这样可以避免产生 `class=""` 这样的空属性。

## 小结

`ssrRenderClass` 将多种形式的 class 值序列化为字符串：

1. 字符串直接返回
2. 对象根据值的真假筛选键名
3. 数组递归处理后合并
4. null、undefined、false 返回空字符串
5. 结果用空格连接

这个函数体现了 Vue 的设计哲学：提供灵活的 API，在底层统一处理。开发者可以用最方便的方式表达意图，框架负责将其转换为标准的 HTML。
