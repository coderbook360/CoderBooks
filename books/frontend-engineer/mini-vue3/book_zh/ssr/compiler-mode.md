# SSR 编译模式：优化的服务端代码生成

Vue 编译器可以生成 SSR 专用代码，**跳过虚拟 DOM，直接生成字符串**。

**这是 SSR 性能优化的关键。** 本章将分析 SSR 编译模式的优化策略。

## 为什么需要 SSR 编译模式

CSR 渲染流程：

```
模板 → 编译 → render 函数 → 创建 VNode → Diff → Patch
                              |__________开销__________|
```

SSR 场景只需生成 HTML 字符串，VNode 的创建和 Diff 是不必要的开销。

SSR 编译模式：

```
模板 → 编译 → ssrRender 函数 → 直接拼接字符串
                                |___无 VNode 开销___|
```

## 编译输出对比

CSR 编译输出：

```javascript
function render(_ctx) {
  return h('div', { class: 'app' }, [
    h('h1', null, _ctx.title),
    h('p', null, _ctx.content)
  ])
}
// 运行时：创建 VNode → Diff → DOM 操作
```

SSR 编译输出：

```javascript
function ssrRender(_ctx, _push) {
  _push('<div class="app">')
  _push(`<h1>${_ctx.title}</h1>`)
  _push(`<p>${_ctx.content}</p>`)
  _push('</div>')
}
// 运行时：直接拼接字符串
```

## ssrRender 函数结构

函数签名：

```javascript
function ssrRender(
  _ctx,      // 组件实例代理
  _push,     // 输出函数
  _parent,   // 父组件实例
  _attrs     // 继承的属性
) {
  // ...
}
```

示例：

```html
<template>
  <div class="user-card">
    <img :src="avatar" :alt="name">
    <h2>{{ name }}</h2>
    <p>{{ bio }}</p>
  </div>
</template>
```

编译输出：

```javascript
import { ssrRenderAttr, ssrInterpolate } from 'vue/server-renderer'

function ssrRender(_ctx, _push, _parent, _attrs) {
  _push(`<div class="user-card"${ssrRenderAttrs(_attrs)}>`)
  _push(`<img${ssrRenderAttr("src", _ctx.avatar)}${ssrRenderAttr("alt", _ctx.name)}>`)
  _push(`<h2>${ssrInterpolate(_ctx.name)}</h2>`)
  _push(`<p>${ssrInterpolate(_ctx.bio)}</p>`)
  _push(`</div>`)
}
```

## SSR 辅助函数

### ssrInterpolate

安全的文本输出：

```javascript
function ssrInterpolate(value) {
  return escapeHtml(toDisplayString(value))
}

// 防止 XSS
// ssrInterpolate('<script>alert(1)</script>')
// → '&lt;script&gt;alert(1)&lt;/script&gt;'
```

### ssrRenderAttr

单个属性渲染：

```javascript
function ssrRenderAttr(key, value) {
  if (value == null || value === false) {
    return ''
  }
  if (value === true) {
    return ' ' + key
  }
  return ` ${key}="${escapeHtml(String(value))}"`
}

// ssrRenderAttr('disabled', true) → ' disabled'
// ssrRenderAttr('value', 'hello') → ' value="hello"'
// ssrRenderAttr('hidden', false) → ''
```

### ssrRenderClass

合并 class：

```javascript
function ssrRenderClass(raw) {
  return escapeHtml(normalizeClass(raw))
}

// ssrRenderClass(['a', { b: true, c: false }]) → 'a b'
```

### ssrRenderStyle

合并 style：

```javascript
function ssrRenderStyle(raw) {
  if (!raw) return ''
  if (typeof raw === 'string') return escapeHtml(raw)
  return escapeHtml(stringifyStyle(normalizeStyle(raw)))
}

// ssrRenderStyle({ color: 'red', fontSize: '14px' })
// → 'color:red;font-size:14px'
```

## 组件渲染

子组件使用 `ssrRenderComponent`：

```html
<template>
  <div>
    <Header :title="title" />
    <Content />
  </div>
</template>
```

编译输出：

```javascript
import { ssrRenderComponent } from 'vue/server-renderer'

function ssrRender(_ctx, _push, _parent) {
  const _component_Header = resolveComponent('Header')
  const _component_Content = resolveComponent('Content')
  
  _push('<div>')
  _push(ssrRenderComponent(_component_Header, { title: _ctx.title }, null, _parent))
  _push(ssrRenderComponent(_component_Content, null, null, _parent))
  _push('</div>')
}
```

`ssrRenderComponent` 实现：

```javascript
function ssrRenderComponent(comp, props, children, parent) {
  // 创建组件实例
  const instance = createComponentInstance(...)
  setupComponent(instance)
  
  // 调用 ssrRender 或回退到 render
  if (comp.ssrRender) {
    const buffer = createBuffer()
    comp.ssrRender(instance.proxy, buffer.push, parent)
    return buffer.getContent()
  } else {
    const vnode = instance.render()
    return renderVNode(vnode)
  }
}
```

## 插槽渲染

```html
<template>
  <Card>
    <template #header>
      <h1>{{ title }}</h1>
    </template>
    <p>Content</p>
  </Card>
</template>
```

编译输出：

```javascript
function ssrRender(_ctx, _push, _parent) {
  _push(ssrRenderComponent(_component_Card, null, {
    header: () => {
      _push(`<h1>${ssrInterpolate(_ctx.title)}</h1>`)
    },
    default: () => {
      _push('<p>Content</p>')
    }
  }, _parent))
}
```

Card 组件内部：

```javascript
function ssrRender(_ctx, _push, _parent, _attrs) {
  _push('<div class="card">')
  _push('<div class="card-header">')
  ssrRenderSlot(_ctx.$slots, 'header', {}, null, _push)
  _push('</div>')
  _push('<div class="card-body">')
  ssrRenderSlot(_ctx.$slots, 'default', {}, null, _push)
  _push('</div>')
  _push('</div>')
}
```

## v-if/v-for 处理

```html
<template>
  <div>
    <span v-if="show">Visible</span>
    <ul>
      <li v-for="item in items">{{ item }}</li>
    </ul>
  </div>
</template>
```

编译输出：

```javascript
function ssrRender(_ctx, _push) {
  _push('<div>')
  
  // v-if 直接使用 if 语句
  if (_ctx.show) {
    _push('<span>Visible</span>')
  }
  
  _push('<ul>')
  // v-for 直接使用 for 循环
  for (const item of _ctx.items) {
    _push(`<li>${ssrInterpolate(item)}</li>`)
  }
  _push('</ul>')
  
  _push('</div>')
}
```

没有 VNode 开销，没有 Diff，直接生成字符串。

## 本章小结

本章分析了 SSR 编译模式：

- **核心优化**：跳过 VNode，直接字符串拼接
- **ssrRender**：SSR 专用渲染函数
- **辅助函数**：ssrInterpolate、ssrRenderAttr 等
- **组件/插槽**：ssrRenderComponent、ssrRenderSlot
- **v-if/v-for**：直接编译为 if/for 语句

至此，SSR 部分完成。我们了解了服务端渲染的完整流程和优化策略。下一部分将分析性能优化。
