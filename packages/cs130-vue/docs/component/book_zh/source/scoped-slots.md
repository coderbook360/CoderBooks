# 作用域插槽实现

作用域插槽是 Vue 中最强大的内容分发机制。它允许子组件向父组件的插槽内容传递数据，实现了真正的"子向父"数据流。

## 作用域插槽的使用

先看典型用法：

```vue
<!-- 子组件 List.vue -->
<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot :item="item" :index="index"></slot>
    </li>
  </ul>
</template>

<!-- 父组件 -->
<template>
  <List :items="users">
    <template #default="{ item, index }">
      <span>{{ index }}. {{ item.name }}</span>
    </template>
  </List>
</template>
```

父组件定义内容结构，子组件提供数据，这种模式在列表、表格、表单等场景非常常见。

## 编译分析

父组件模板编译后：

```javascript
_createVNode(List, { items: users }, {
  default: _withCtx(({ item, index }) => [
    _createElementVNode("span", null, index + ". " + item.name)
  ]),
  _: 1
})
```

注意插槽函数接收参数 `({ item, index })`，这就是作用域参数。

子组件的 `<slot>` 编译为：

```javascript
_renderSlot(_ctx.$slots, "default", {
  item: item,
  index: index
})
```

## renderSlot

`renderSlot` 是核心函数：

```typescript
export function renderSlot(
  slots: Slots,
  name: string,
  props: Data = {},
  fallback?: () => VNodeArrayChildren,
  noSlotted?: boolean
): VNode {
  // 检查是否需要 block 优化
  if (currentRenderingInstance!.isCE ||
      (currentRenderingInstance!.parent &&
       isAsyncWrapper(currentRenderingInstance!.parent) &&
       currentRenderingInstance!.parent.isCE)) {
    if (name !== 'default') props.name = name
    return createVNode('slot', props, fallback && fallback())
  }

  let slot = slots[name]

  // 开发环境警告
  if (__DEV__ && slot && slot.length > 1) {
    warn(
      `SSR-optimized slot function detected in a non-SSR-optimized render ` +
        `function. You need to mark this component with $dynamic-slots in the ` +
        `parent template.`
    )
    slot = () => []
  }

  // 打开 block
  openBlock()
  const validSlotContent = slot && ensureValidVNode(slot(props))
  const rendered = createBlock(
    Fragment,
    {
      key:
        props.key ||
        (validSlotContent && (validSlotContent as any).key) ||
        `_${name}`
    },
    validSlotContent || (fallback ? fallback() : []),
    validSlotContent && (slots as RawSlots)._ === SlotFlags.STABLE
      ? PatchFlags.STABLE_FRAGMENT
      : PatchFlags.BAIL
  )
  
  // 标记为 slotted
  if (!noSlotted && rendered.scopeId) {
    rendered.slotScopeIds = [rendered.scopeId + '-s']
  }
  
  return rendered
}
```

## 作用域传递的实现

关键在于 `slot(props)` 这一步：

```typescript
const validSlotContent = slot && ensureValidVNode(slot(props))
```

子组件把作用域数据作为参数传给插槽函数，父组件定义的函数接收这些参数：

```javascript
// 父组件提供的插槽函数
({ item, index }) => [
  _createElementVNode("span", null, index + ". " + item.name)
]

// 子组件调用时传入数据
slot({ item: currentItem, index: i })
```

## ensureValidVNode

确保插槽内容有效：

```typescript
function ensureValidVNode(vnodes: VNodeArrayChildren) {
  return vnodes.some(child => {
    if (!isVNode(child)) return true
    if (child.type === Comment) return false
    if (
      child.type === Fragment &&
      !ensureValidVNode(child.children as VNodeArrayChildren)
    )
      return false
    return true
  })
    ? vnodes
    : null
}
```

过滤掉只有注释节点的情况。

## 默认内容

当没有提供插槽时使用默认内容：

```vue
<slot :item="item">
  <!-- 默认内容 -->
  <span>{{ item.name }}</span>
</slot>
```

编译为：

```javascript
_renderSlot(_ctx.$slots, "default", { item: item }, () => [
  _createElementVNode("span", null, item.name)
])
```

`fallback` 参数就是默认内容的渲染函数。

## 多个作用域插槽

一个组件可以有多个作用域插槽：

```vue
<!-- Table 组件 -->
<template>
  <table>
    <thead>
      <tr>
        <th v-for="col in columns" :key="col.key">
          <slot name="header" :column="col">{{ col.title }}</slot>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in data" :key="row.id">
        <td v-for="col in columns" :key="col.key">
          <slot name="cell" :row="row" :column="col">
            {{ row[col.key] }}
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<!-- 使用 -->
<Table :data="users" :columns="columns">
  <template #header="{ column }">
    <strong>{{ column.title }}</strong>
  </template>
  <template #cell="{ row, column }">
    <template v-if="column.key === 'status'">
      <Badge :type="row.status">{{ row.status }}</Badge>
    </template>
    <template v-else>{{ row[column.key] }}</template>
  </template>
</Table>
```

## 动态插槽名

插槽名可以是动态的：

```vue
<template #[slotName]="slotProps">
  {{ slotProps.data }}
</template>
```

编译为：

```javascript
[_ctx.slotName]: _withCtx((slotProps) => [
  _createTextVNode(_toDisplayString(slotProps.data))
])
```

## 作用域插槽与普通插槽的区别

```typescript
// 普通插槽：不接收参数
default: _withCtx(() => [/* ... */])

// 作用域插槽：接收参数
default: _withCtx((props) => [/* ... */])
```

唯一区别是函数是否接收参数。在 Vue 3 中，所有插槽都是函数形式，作用域插槽只是使用了参数的插槽。

## 手写渲染函数中的作用域插槽

```javascript
// 子组件
export default {
  setup(props, { slots }) {
    return () => {
      return h('ul', 
        props.items.map((item, index) => 
          h('li', slots.default?.({ item, index }))
        )
      )
    }
  }
}

// 父组件
h(List, { items }, {
  default: ({ item, index }) => h('span', `${index}: ${item.name}`)
})
```

## 作用域的封装

作用域插槽实现了"子组件数据 + 父组件结构"的解耦：

```vue
<!-- 数据迭代器组件 -->
<script setup>
const props = defineProps(['data'])
</script>

<template>
  <div v-for="(item, i) in data" :key="i">
    <slot v-bind="item" :index="i"></slot>
  </div>
</template>

<!-- 使用 -->
<DataIterator :data="users">
  <template #default="user">
    <UserCard :user="user" />
  </template>
</DataIterator>
```

子组件负责迭代逻辑，父组件负责渲染逻辑。

## v-bind 展开

`v-bind` 可以展开对象作为作用域：

```vue
<slot v-bind="item"></slot>
```

编译为：

```javascript
_renderSlot(_ctx.$slots, "default", item)
```

直接把整个对象作为 props 传递。

## 插槽作用域的类型

TypeScript 类型定义：

```typescript
// defineSlots 定义类型
const slots = defineSlots<{
  default(props: { item: Item; index: number }): any
  header(props: { title: string }): any
}>()

// 子组件 renderSlot 调用类型安全
renderSlot(slots, 'default', { item, index })
```

## 响应式考虑

作用域中的数据如果是响应式的，插槽渲染会追踪依赖：

```javascript
// 子组件
const currentIndex = ref(0)

return () => h('div',
  slots.default?.({ index: currentIndex.value })
)
```

当 `currentIndex` 变化时，插槽内容会更新。

但要注意上下文问题：

```javascript
// 父组件
setup() {
  const highlight = ref(false)
  
  return () => h(List, { items }, {
    default: ({ item }) => h('div', {
      class: { highlight: highlight.value }  // 追踪 highlight
    }, item.name)
  })
}
```

父组件的响应式数据在插槽中使用，会触发父组件更新，进而更新子组件的插槽。

## 性能优化

作用域插槽的性能考虑：

```javascript
// 避免在每次渲染时创建新对象
// 不好
slots.default?.({ item: item, extra: {} })

// 好：复用对象
const slotProps = { item: item }
slots.default?.(slotProps)
```

编译器会自动优化：

```javascript
// 编译器可能生成
const _temp0 = { item: item, index: index }
_renderSlot(_ctx.$slots, "default", _temp0)
```

## 实际应用模式

**无渲染组件**（Renderless Component）：

```vue
<!-- MouseTracker.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const x = ref(0)
const y = ref(0)

function update(e) {
  x.value = e.pageX
  y.value = e.pageY
}

onMounted(() => window.addEventListener('mousemove', update))
onUnmounted(() => window.removeEventListener('mousemove', update))
</script>

<template>
  <slot :x="x" :y="y"></slot>
</template>

<!-- 使用 -->
<MouseTracker v-slot="{ x, y }">
  <div>鼠标位置: {{ x }}, {{ y }}</div>
</MouseTracker>
```

子组件只负责逻辑，UI 完全由父组件决定。

## 小结

作用域插槽的实现机制：

1. **父组件**：提供接收参数的插槽函数
2. **子组件**：调用 `renderSlot` 时传入作用域数据
3. **数据流**：子组件数据 → 插槽参数 → 父组件使用

这种模式实现了逻辑与视图的分离，是实现可复用组件的重要技术。

下一章我们将进入 Setup 与 Composition API 部分，分析 `setup` 函数的执行过程。
