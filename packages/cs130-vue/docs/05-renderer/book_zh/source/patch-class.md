# patchClass 类名更新

patchClass 专门处理元素的 class 属性更新。由于 class 操作在前端开发中极其频繁，Vue 对它进行了专门的优化，确保即使大量类名变化也能高效处理。

## 函数实现

patchClass 的实现简洁而高效：

```typescript
export function patchClass(el: Element, value: string | null, isSVG: boolean) {
  // 过渡动画相关的 class
  const transitionClasses = (el as ElementWithTransition)._vtc
  
  if (transitionClasses) {
    value = (
      value ? [value, ...transitionClasses] : [...transitionClasses]
    ).join(' ')
  }
  
  if (value == null) {
    // 移除 class 属性
    el.removeAttribute('class')
  } else if (isSVG) {
    // SVG 使用 setAttribute
    el.setAttribute('class', value)
  } else {
    // HTML 使用 className，更快
    el.className = value
  }
}
```

这段代码展示了几个关键优化。首先是 Transition 类名的处理——Vue 的过渡动画会添加如 v-enter-active 这样的类名，它们需要与用户定义的类名合并。其次是 HTML 元素使用 className 属性而非 setAttribute，这是一个性能优化。

## 为什么 className 更快

在 HTML 元素上，className 是直接属性访问：

```typescript
// 快：直接属性访问
el.className = 'foo bar'

// 慢：涉及字符串解析和 DOM 更新
el.setAttribute('class', 'foo bar')
```

className 是 DOM Level 2 的标准属性，浏览器对它有高度优化。setAttribute 需要额外的字符串处理和属性规范化，略慢一些。

但 SVG 元素是例外，它们使用 XML 命名空间，必须通过 setAttribute 设置。

## Transition 类名处理

Vue 的过渡系统会在 `_vtc` 属性上存储过渡相关的类名：

```typescript
const transitionClasses = (el as ElementWithTransition)._vtc

if (transitionClasses) {
  value = (
    value ? [value, ...transitionClasses] : [...transitionClasses]
  ).join(' ')
}
```

这确保了用户设置的类名和 Transition 添加的类名能够共存。比如：

```html
<Transition name="fade">
  <div class="card">...</div>
</Transition>
```

在过渡过程中，元素的 class 可能是 `"card fade-enter-active fade-enter-to"`。

## 值的规范化

传入 patchClass 的值已经被规范化为字符串或 null：

```typescript
// 编译时或运行时规范化
function normalizeClass(value: unknown): string {
  let res = ''
  
  if (isString(value)) {
    res = value
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i])
      if (normalized) {
        res += normalized + ' '
      }
    }
  } else if (isObject(value)) {
    for (const name in value) {
      if (value[name]) {
        res += name + ' '
      }
    }
  }
  
  return res.trim()
}
```

Vue 支持多种 class 绑定语法：

```html
<!-- 字符串 -->
<div :class="'foo bar'">

<!-- 数组 -->
<div :class="['foo', 'bar', isActive ? 'active' : '']">

<!-- 对象 -->
<div :class="{ foo: true, bar: isBar, active: isActive }">

<!-- 混合 -->
<div :class="['foo', { bar: isBar }]">
```

normalizeClass 将所有形式统一为空格分隔的字符串。

## 静态类名合并

对于既有静态又有动态类名的元素，编译器会进行优化：

```html
<div class="static" :class="dynamic">
```

编译为：

```typescript
_createElementVNode("div", {
  class: _normalizeClass(["static", _ctx.dynamic])
}, null)
```

静态类名被包含在数组中一起规范化，最终得到合并后的字符串。

## 与 patchProp 的集成

patchClass 在 patchProp 中作为 class 分支被调用：

```typescript
export const patchProp: DOMRendererOptions['patchProp'] = (
  el,
  key,
  prevValue,
  nextValue,
  isSVG
) => {
  if (key === 'class') {
    patchClass(el, nextValue, isSVG)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else {
    // 其他属性处理...
  }
}
```

class 作为第一个检查项，因为它是最常见的属性操作之一。

## 空值处理

当值为 null 时移除整个 class 属性：

```typescript
if (value == null) {
  el.removeAttribute('class')
}
```

这比设置空字符串更干净——`<div>` 比 `<div class="">` 更简洁。在某些 CSS 选择器中，有无 class 属性可能有区别。

## 与 classList API 的比较

你可能注意到 Vue 没有使用 classList API：

```typescript
// Vue 不使用这种方式
el.classList.add('foo')
el.classList.remove('bar')
el.classList.toggle('active')
```

原因是 Vue 需要整体替换 class，而非增量修改。每次渲染时，class 的值都是完整计算后的结果。使用 classList 需要先清空再添加，不如直接赋值 className 高效。

## 性能优化场景

对于频繁的类名切换，Vue 的处理方式很高效：

```html
<div :class="{ active: isActive }">
```

当 isActive 在 true/false 之间切换时：
1. normalizeClass 计算新的 class 字符串
2. patchClass 用 className 一次性更新

相比手动操作 classList，这避免了多次 DOM 操作。

## 服务端渲染

在 SSR 场景中，class 会被序列化为 HTML 字符串：

```typescript
// SSR 渲染
function ssrRenderClass(raw: unknown): string {
  if (raw == null) {
    return ''
  }
  return escapeHtml(normalizeClass(raw))
}

// 输出
<div class="foo bar">
```

客户端水合时，patchClass 会确保客户端状态与服务端一致。

## 小结

patchClass 是 Vue 对 class 属性的专项优化。它使用 className 直接赋值而非 setAttribute 来提升性能，正确处理 SVG 的命名空间要求，与 Transition 系统集成确保过渡类名不丢失。配合编译时的 normalizeClass 调用，这套机制让 Vue 能够高效处理各种复杂的类名绑定场景。
