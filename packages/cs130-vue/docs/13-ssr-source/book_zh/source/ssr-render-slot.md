# ssrRenderSlot 插槽渲染

插槽是 Vue 组件化的核心机制之一。在 SSR 中，`ssrRenderSlot` 负责将插槽内容渲染为 HTML 字符串。

## 插槽的本质

插槽本质上是父组件传递给子组件的一段模板。在运行时，插槽被编译为返回虚拟节点的函数：

```html
<!-- 父组件 -->
<MyComponent>
  <template #default="{ user }">
    <span>{{ user.name }}</span>
  </template>
</MyComponent>

<!-- 编译后 -->
{
  default: ({ user }) => [
    h('span', user.name)
  ]
}
```

子组件调用这个函数，获取虚拟节点，然后渲染。

## 函数签名

```typescript
function ssrRenderSlot(
  slots: Slots,
  slotName: string,
  slotProps: Record<string, unknown>,
  fallbackRenderFn: (() => void) | null,
  push: PushFn,
  parentComponent: ComponentInternalInstance | null,
  slotScopeId?: string
): void
```

参数较多，我们逐一分析。

## 参数解析

**slots**是插槽对象，包含所有具名插槽：

```typescript
interface Slots {
  [name: string]: (props: any) => VNode[]
}
```

**slotName**是要渲染的插槽名称，默认插槽是 `'default'`。

**slotProps**是传递给插槽的数据，用于作用域插槽：

```html
<slot :user="currentUser" :isActive="true">
```

**fallbackRenderFn**是后备内容的渲染函数，当插槽没有被提供时使用：

```html
<slot>默认内容</slot>
```

**push**是输出函数。

**parentComponent**是父组件实例。

**slotScopeId**用于 scoped CSS。

## 核心实现

```typescript
function ssrRenderSlot(
  slots: Slots,
  slotName: string,
  slotProps: Record<string, unknown>,
  fallbackRenderFn: (() => void) | null,
  push: PushFn,
  parentComponent: ComponentInternalInstance | null,
  slotScopeId?: string
) {
  // 获取插槽函数
  const slotFn = slots[slotName]
  
  if (slotFn) {
    // 调用插槽函数获取内容
    const slotContent = slotFn(slotProps)
    
    // 处理 scope ID
    if (slotScopeId) {
      push(`<!--[-->`)  // Fragment 开始标记
    }
    
    // 渲染插槽内容
    for (let i = 0; i < slotContent.length; i++) {
      renderVNode(push, slotContent[i], parentComponent, slotScopeId)
    }
    
    if (slotScopeId) {
      push(`<!--]-->`)  // Fragment 结束标记
    }
  } else if (fallbackRenderFn) {
    // 渲染后备内容
    fallbackRenderFn()
  }
}
```

## 作用域插槽

作用域插槽让子组件向父组件的插槽传递数据：

```html
<!-- 子组件 UserList.vue -->
<template>
  <ul>
    <li v-for="user in users">
      <slot :user="user" :index="index">
        {{ user.name }}
      </slot>
    </li>
  </ul>
</template>

<!-- 父组件 -->
<UserList>
  <template #default="{ user, index }">
    <strong>{{ index + 1 }}. {{ user.name }}</strong>
  </template>
</UserList>
```

`slotProps` 包含子组件传递的数据：

```javascript
ssrRenderSlot(
  slots,
  'default',
  { user: currentUser, index: i },  // slotProps
  null,
  push,
  parentComponent
)
```

## 具名插槽

除了默认插槽，还可以有多个具名插槽：

```html
<!-- 子组件 Card.vue -->
<template>
  <div class="card">
    <header><slot name="header"></slot></header>
    <main><slot></slot></main>
    <footer><slot name="footer"></slot></footer>
  </div>
</template>

<!-- 父组件 -->
<Card>
  <template #header>标题</template>
  <template #default>内容</template>
  <template #footer>页脚</template>
</Card>
```

每个插槽独立渲染：

```javascript
// 渲染 header 插槽
ssrRenderSlot(slots, 'header', {}, null, push, ...)

// 渲染 default 插槽
ssrRenderSlot(slots, 'default', {}, null, push, ...)

// 渲染 footer 插槽
ssrRenderSlot(slots, 'footer', {}, null, push, ...)
```

## 后备内容

当插槽没有被提供时，渲染后备内容：

```html
<slot>如果没有提供内容，显示这段文字</slot>
```

```typescript
if (slotFn) {
  // 渲染插槽内容
} else if (fallbackRenderFn) {
  fallbackRenderFn()
}
```

后备内容的渲染函数在编译时生成：

```javascript
ssrRenderSlot(
  slots,
  'default',
  {},
  () => {
    push('如果没有提供内容，显示这段文字')
  },
  push,
  parentComponent
)
```

## Fragment 标记

插槽内容可能包含多个根节点，需要用 Fragment 标记包裹：

```html
<slot>
  <span>A</span>
  <span>B</span>
</slot>
```

```typescript
if (slotScopeId) {
  push(`<!--[-->`)  // Fragment 开始
  // 渲染内容
  push(`<!--]-->`)  // Fragment 结束
}
```

这些注释帮助客户端水合时识别 Fragment 边界。

## Scoped CSS 处理

当组件使用 scoped CSS 时，插槽内容需要正确的 scope ID：

```typescript
function ssrRenderSlot(
  slots, slotName, slotProps, fallbackRenderFn,
  push, parentComponent, slotScopeId
) {
  const slotContent = slotFn(slotProps)
  
  for (const vnode of slotContent) {
    // 传递 slotScopeId 给子节点渲染
    renderVNode(push, vnode, parentComponent, slotScopeId)
  }
}
```

`slotScopeId` 会被添加到插槽内容的元素上：

```html
<!-- 假设 scope ID 是 data-v-abc123 -->
<div class="card" data-v-abc123>
  <header data-v-abc123>
    <!-- 插槽内容也需要 scope ID -->
    <span data-v-abc123>标题</span>
  </header>
</div>
```

## 插槽编译

了解插槽的编译结果有助于理解 SSR 渲染：

```html
<!-- 模板 -->
<MyComponent>
  <template #header="{ title }">
    <h1>{{ title }}</h1>
  </template>
</MyComponent>
```

```javascript
// 编译后的 SSR 渲染函数
function ssrRender(_ctx, _push, _parent) {
  _push(ssrRenderComponent(_component_MyComponent, null, {
    header: withCtx(({ title }) => [
      _push(`<h1>${ssrInterpolate(title)}</h1>`)
    ]),
    _: 1
  }, _parent))
}
```

`withCtx` 确保插槽函数在正确的组件上下文中执行。

## 动态插槽名

插槽名也可以是动态的：

```html
<template #[dynamicSlotName]="slotProps">
  ...
</template>
```

`ssrRenderSlot` 直接使用字符串参数，不需要特殊处理：

```javascript
ssrRenderSlot(slots, dynamicSlotName, slotProps, null, push, ...)
```

## 条件插槽

有时需要检查插槽是否存在：

```javascript
if (slots.header) {
  push('<header>')
  ssrRenderSlot(slots, 'header', {}, null, push, ...)
  push('</header>')
}
```

这比总是渲染空的 header 容器更高效。

## 性能优化

插槽渲染的优化点：

**避免不必要的插槽调用**。如果插槽内容是静态的，编译器会提升：

```javascript
// 静态插槽内容
const _slot_header = () => [
  createStaticVNode('<h1>Static Title</h1>')
]
```

**最小化 slotProps**。只传递插槽实际需要的数据：

```javascript
// 不好：传递整个对象
<slot :data="hugeObject">

// 好：只传递需要的字段
<slot :name="hugeObject.name" :id="hugeObject.id">
```

## 完整示例

```html
<!-- Layout.vue -->
<template>
  <div class="layout">
    <header>
      <slot name="header" :user="currentUser">
        默认标题
      </slot>
    </header>
    <main>
      <slot></slot>
    </main>
    <footer>
      <slot name="footer">
        版权信息
      </slot>
    </footer>
  </div>
</template>
```

```javascript
// SSR 编译后
function ssrRender(_ctx, _push, _parent, _attrs) {
  _push(`<div class="layout">`)
  
  // header 插槽
  _push(`<header>`)
  ssrRenderSlot(
    _ctx.$slots,
    'header',
    { user: _ctx.currentUser },
    () => _push('默认标题'),
    _push,
    _parent
  )
  _push(`</header>`)
  
  // default 插槽
  _push(`<main>`)
  ssrRenderSlot(
    _ctx.$slots,
    'default',
    {},
    null,
    _push,
    _parent
  )
  _push(`</main>`)
  
  // footer 插槽
  _push(`<footer>`)
  ssrRenderSlot(
    _ctx.$slots,
    'footer',
    {},
    () => _push('版权信息'),
    _push,
    _parent
  )
  _push(`</footer>`)
  
  _push(`</div>`)
}
```

## 小结

`ssrRenderSlot` 处理插槽的 SSR 渲染：

1. 从 slots 对象获取插槽函数
2. 调用插槽函数，传入 slotProps
3. 渲染返回的虚拟节点数组
4. 处理 Fragment 标记和 scope ID
5. 无插槽时渲染后备内容

插槽机制让组件更加灵活和可复用。理解插槽的 SSR 渲染，有助于我们写出更高效的服务端渲染代码。
