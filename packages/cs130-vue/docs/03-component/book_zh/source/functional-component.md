# 函数式组件

函数式组件是无状态的纯函数组件。它没有响应式数据、没有生命周期、也没有组件实例，只是接收 props 并返回 VNode。

## 基本定义

```typescript
import { h, FunctionalComponent } from 'vue'

const FunctionalButton: FunctionalComponent<{ text: string }> = (props, { slots, emit, attrs }) => {
  return h('button', { 
    class: 'btn',
    onClick: () => emit('click')
  }, slots.default?.() || props.text)
}

FunctionalButton.props = ['text']
FunctionalButton.emits = ['click']
```

## 类型定义

```typescript
export interface FunctionalComponent<
  P = {},
  E extends EmitsOptions = {},
  S extends Record<string, any> = any
> extends ComponentInternalOptions {
  (
    props: P,
    ctx: Omit<SetupContext<E, IfAny<S, {}, SlotsType<S>>>, 'expose'>
  ): any
  props?: ComponentPropsOptions<P>
  emits?: E
  inheritAttrs?: boolean
  displayName?: string
  compatConfig?: CompatConfig
}
```

## 函数式组件的识别

```typescript
export function isFunctionalComponent(type: unknown): type is FunctionalComponent {
  return isFunction(type) && !(type as any).__vccOpts
}
```

普通函数被视为函数式组件，而通过 defineComponent 定义的组件会有 __vccOpts 标记。

## 渲染处理

函数式组件的渲染很直接：

```typescript
const mountComponent = (
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  optimized: boolean
) => {
  const instance: ComponentInternalInstance = (initialVNode.component = createComponentInstance(
    initialVNode,
    parentComponent,
    parentSuspense
  ))

  // ...
  
  setupComponent(instance)
  
  // ...
}
```

## setupComponent 中的处理

```typescript
export function setupComponent(
  instance: ComponentInternalInstance,
  isSSR = false
) {
  isInSSRComponentSetup = isSSR

  const { props, children } = instance.vnode
  const isStateful = isStatefulComponent(instance)
  
  initProps(instance, props, isStateful, isSSR)
  initSlots(instance, children)

  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined  // 函数式组件不需要额外设置
    
  isInSSRComponentSetup = false
  return setupResult
}

export function isStatefulComponent(instance: ComponentInternalInstance) {
  return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}
```

## 函数式组件的 renderComponentRoot

```typescript
export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  const {
    type: Component,
    vnode,
    proxy,
    withProxy,
    props,
    propsOptions: [propsOptions],
    slots,
    attrs,
    emit,
    render,
    renderCache,
    data,
    setupState,
    ctx,
    inheritAttrs
  } = instance

  let result
  
  try {
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      // 有状态组件
      const proxyToUse = withProxy || proxy
      result = normalizeVNode(
        render!.call(proxyToUse, proxyToUse!, renderCache, props, setupState, data, ctx)
      )
    } else {
      // 函数式组件
      const render = Component as FunctionalComponent
      result = normalizeVNode(
        render.length > 1
          ? render(props, { attrs, slots, emit })
          : render(props, null as any)
      )
    }
  } catch (err) {
    handleError(err, instance, ErrorCodes.RENDER_FUNCTION)
    result = createVNode(Comment)
  }

  // 继承属性处理
  if (attrs && inheritAttrs !== false) {
    // ...
  }

  return result
}
```

## 函数式组件 vs 有状态组件

```typescript
// 有状态组件
export default {
  data() {
    return { count: 0 }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  render() {
    return h('button', { onClick: this.increment }, this.count)
  }
}

// 函数式组件
const Counter: FunctionalComponent = (props) => {
  // 没有状态，每次都是新的
  return h('div', props.count)
}
```

## 函数式组件的上下文

```typescript
// 第二个参数是简化的 context
const MyComponent: FunctionalComponent = (props, { slots, emit, attrs }) => {
  // slots: 插槽
  // emit: 事件发射
  // attrs: 未声明的属性
  // 注意：没有 expose，因为没有实例
}
```

## 声明 props 和 emits

```typescript
const MyButton: FunctionalComponent<
  { label: string },
  { click: (value: string) => void }
> = (props, { emit }) => {
  return h('button', {
    onClick: () => emit('click', props.label)
  }, props.label)
}

// 运行时声明
MyButton.props = {
  label: {
    type: String,
    required: true
  }
}

MyButton.emits = {
  click: (value: string) => typeof value === 'string'
}
```

## inheritAttrs

```typescript
const Wrapper: FunctionalComponent = (props, { attrs, slots }) => {
  return h('div', { class: 'wrapper' }, [
    h('input', attrs)  // 手动传递 attrs
  ])
}

Wrapper.inheritAttrs = false
```

## displayName

```typescript
const MyComponent: FunctionalComponent = (props) => {
  return h('div', props.content)
}

MyComponent.displayName = 'MyComponent'
```

用于 devtools 和错误信息。

## 与 SFC 结合

```html
<script lang="ts">
import { h, FunctionalComponent } from 'vue'

interface Props {
  level: 1 | 2 | 3 | 4 | 5 | 6
}

const DynamicHeading: FunctionalComponent<Props> = (props, { slots }) => {
  return h(`h${props.level}`, {}, slots.default?.())
}

DynamicHeading.props = {
  level: {
    type: Number,
    required: true,
    validator: (v: number) => v >= 1 && v <= 6
  }
}

export default DynamicHeading
</script>
```

## 性能特点

函数式组件的开销：

```typescript
// Vue 3 中，函数式组件仍然创建组件实例
// 但跳过了很多状态初始化
const setupResult = isStateful
  ? setupStatefulComponent(instance, isSSR)
  : undefined
```

Vue 3 中函数式组件的性能优势已经不明显，因为有状态组件的渲染也非常快。

## 使用场景

适合函数式组件的场景：

```typescript
// 1. 纯展示组件
const Avatar: FunctionalComponent<{ src: string; size: number }> = ({ src, size }) => {
  return h('img', {
    src,
    width: size,
    height: size,
    class: 'avatar'
  })
}

// 2. 高阶组件
function withLogging<P>(Component: FunctionalComponent<P>): FunctionalComponent<P> {
  const Wrapped: FunctionalComponent<P> = (props, ctx) => {
    console.log('Rendering with props:', props)
    return h(Component, props, ctx.slots)
  }
  return Wrapped
}

// 3. 渲染代理
const RenderSlot: FunctionalComponent<{ name: string }> = (props, { slots }) => {
  return slots[props.name]?.() || null
}
```

## 与 Composition API 对比

```typescript
// 如果需要状态，使用 Composition API
import { ref, h } from 'vue'

const Counter = {
  setup() {
    const count = ref(0)
    return () => h('button', {
      onClick: () => count.value++
    }, count.value)
  }
}

// 无状态时可以用函数式组件
const Display: FunctionalComponent<{ value: number }> = (props) => {
  return h('span', props.value)
}
```

## 小结

函数式组件的核心特点：

1. **无实例**：没有 this，没有响应式状态
2. **纯函数**：输入 props，输出 VNode
3. **简化上下文**：只有 attrs、slots、emit
4. **类型友好**：FunctionalComponent 泛型支持
5. **声明式配置**：props、emits、inheritAttrs、displayName

在 Vue 3 中，函数式组件的使用场景变少了，大多数情况下 Composition API 更灵活。

下一章将分析组件更新流程。
