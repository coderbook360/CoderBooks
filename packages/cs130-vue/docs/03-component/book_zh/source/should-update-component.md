# shouldUpdateComponent 判断

shouldUpdateComponent 函数决定组件是否需要更新，通过比较新旧 props、children 等因素进行优化判断。

## 函数签名

```typescript
// packages/runtime-core/src/componentRenderUtils.ts
export function shouldUpdateComponent(
  prevVNode: VNode,
  nextVNode: VNode,
  optimized?: boolean
): boolean
```

## 完整实现

```typescript
export function shouldUpdateComponent(
  prevVNode: VNode,
  nextVNode: VNode,
  optimized?: boolean
): boolean {
  const { props: prevProps, children: prevChildren, component } = prevVNode
  const { props: nextProps, children: nextChildren, patchFlag } = nextVNode
  const emits = component!.emitsOptions

  // 开发环境热更新强制更新
  if (__DEV__ && (prevChildren || nextChildren) && isHmrUpdating) {
    return true
  }

  // 动态 slot 强制更新
  if (nextVNode.dirs || nextVNode.transition) {
    return true
  }

  // ⭐ 优化模式
  if (optimized && patchFlag >= 0) {
    if (patchFlag & PatchFlags.DYNAMIC_SLOTS) {
      // 动态 slot 需要更新
      return true
    }
    if (patchFlag & PatchFlags.FULL_PROPS) {
      if (!prevProps) {
        return !!nextProps
      }
      // 完整 props 比较
      return hasPropsChanged(prevProps, nextProps!, emits)
    } else if (patchFlag & PatchFlags.PROPS) {
      // 只比较动态 props
      const dynamicProps = nextVNode.dynamicProps!
      for (let i = 0; i < dynamicProps.length; i++) {
        const key = dynamicProps[i]
        if (
          nextProps![key] !== prevProps![key] &&
          !isEmitListener(emits, key)
        ) {
          return true
        }
      }
    }
  } else {
    // ⭐ 非优化模式，需要完整比较
    if (prevChildren || nextChildren) {
      if (!nextChildren || !(nextChildren as any).$stable) {
        return true
      }
    }
    if (prevProps === nextProps) {
      return false
    }
    if (!prevProps) {
      return !!nextProps
    }
    if (!nextProps) {
      return true
    }
    return hasPropsChanged(prevProps, nextProps, emits)
  }

  return false
}
```

## hasPropsChanged 比较函数

```typescript
function hasPropsChanged(
  prevProps: Data,
  nextProps: Data,
  emitsOptions: ComponentInternalInstance['emitsOptions']
): boolean {
  const nextKeys = Object.keys(nextProps)
  
  // 属性数量不同
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }
  
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (
      nextProps[key] !== prevProps[key] &&
      !isEmitListener(emitsOptions, key)
    ) {
      return true
    }
  }
  
  return false
}
```

## PatchFlags 优化

```typescript
export const enum PatchFlags {
  TEXT = 1,                    // 动态文本
  CLASS = 1 << 1,              // 动态 class
  STYLE = 1 << 2,              // 动态 style
  PROPS = 1 << 3,              // 动态非 class/style 属性
  FULL_PROPS = 1 << 4,         // 需要完整 props 比较
  HYDRATE_EVENTS = 1 << 5,     // 需要激活事件
  STABLE_FRAGMENT = 1 << 6,    // 稳定的 Fragment
  KEYED_FRAGMENT = 1 << 7,     // 带 key 的 Fragment
  UNKEYED_FRAGMENT = 1 << 8,   // 不带 key 的 Fragment
  NEED_PATCH = 1 << 9,         // 需要 patch
  DYNAMIC_SLOTS = 1 << 10,     // 动态 slots
  DEV_ROOT_FRAGMENT = 1 << 11, // 开发环境根 Fragment
  HOISTED = -1,                // 静态提升
  BAIL = -2                    // 退出优化
}
```

## DYNAMIC_SLOTS 处理

```typescript
if (patchFlag & PatchFlags.DYNAMIC_SLOTS) {
  // 动态 slot 无法静态分析，必须更新
  return true
}

// 动态 slot 示例
// <Comp>
//   <template v-for="item in items" #[item.name]>
//     {{ item.content }}
//   </template>
// </Comp>
```

## FULL_PROPS vs PROPS

```typescript
// FULL_PROPS: 需要完整比较
// 如 v-bind="obj" 展开
if (patchFlag & PatchFlags.FULL_PROPS) {
  return hasPropsChanged(prevProps, nextProps!, emits)
}

// PROPS: 只比较动态属性
// 如 :title="title"
if (patchFlag & PatchFlags.PROPS) {
  const dynamicProps = nextVNode.dynamicProps!
  for (let i = 0; i < dynamicProps.length; i++) {
    const key = dynamicProps[i]
    if (
      nextProps![key] !== prevProps![key] &&
      !isEmitListener(emits, key)
    ) {
      return true
    }
  }
}
```

## dynamicProps 数组

```typescript
// 编译器生成
const vnode = createVNode(Comp, { title, count }, null, PatchFlags.PROPS, ['title', 'count'])

// dynamicProps = ['title', 'count']
// 只需要检查这些属性
```

## isEmitListener 排除事件

```typescript
// 事件监听器不参与更新判断
if (!isEmitListener(emits, key)) {
  return true
}

// 因为事件是函数引用，每次渲染都可能不同
// 但功能相同，不应触发更新
```

## 稳定 slots

```typescript
if (!nextChildren || !(nextChildren as any).$stable) {
  return true
}

// 编译器对静态 slot 添加 $stable 标记
// <template #default>Static content</template>
// 被标记为 $stable
```

## 调用时机

```typescript
// updateComponent 中
const updateComponent = (n1: VNode, n2: VNode, optimized: boolean) => {
  const instance = (n2.component = n1.component)!
  
  if (shouldUpdateComponent(n1, n2, optimized)) {
    // 需要更新
    instance.next = n2
    invalidateJob(instance.update)
    instance.update()
  } else {
    // 不需要更新，复用
    n2.el = n1.el
    instance.vnode = n2
  }
}
```

## 使用示例

### 理解更新优化

```html
<!-- 静态 props，不会触发子组件更新 -->
<Child title="Static" />

<!-- 动态 props，值变化时触发更新 -->
<Child :title="dynamicTitle" />

<!-- 展开对象，需要完整比较 -->
<Child v-bind="propsObj" />
```

### 避免不必要的更新

```html
<template>
  <!-- 每次渲染都创建新对象，触发更新 -->
  <Child :style="{ color: 'red' }" />
  
  <!-- 使用计算属性或响应式对象 -->
  <Child :style="computedStyle" />
</template>

<script setup>
import { computed } from 'vue'

const computedStyle = computed(() => ({ color: 'red' }))
</script>
```

## 小结

shouldUpdateComponent 的核心要点：

1. **PatchFlags 优化**：利用编译器生成的标记
2. **DYNAMIC_SLOTS**：动态 slot 总是需要更新
3. **dynamicProps**：只比较动态属性
4. **isEmitListener**：排除事件监听器
5. **$stable**：静态 slot 标记

下一章将分析 updateComponent 更新逻辑。
