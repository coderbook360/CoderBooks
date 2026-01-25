# $attrs 继承机制详解

$attrs 包含组件接收的所有非 props 和非 emits 的属性，Vue 会自动将其继承到组件的根元素。

## attrs 的构成

```typescript
// 父组件传递的属性中
// - 声明为 props 的 → props
// - 声明为 emits 的 → 不在 attrs 中
// - 其他的 → attrs
```

## initProps 中的 attrs 分离

```typescript
export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  isStateful: number,
  isSSR = false
) {
  const props: Data = {}
  const attrs: Data = {}

  if (rawProps) {
    for (const key in rawProps) {
      // 保留属性跳过
      if (isReservedProp(key)) {
        continue
      }

      const value = rawProps[key]
      let camelKey
      
      // 检查是否是声明的 prop
      if (options && hasOwn(options, (camelKey = camelize(key)))) {
        // 是 prop
        props[camelKey] = value
      } else if (!isEmitListener(instance.emitsOptions, key)) {
        // 不是 emit 监听器，放入 attrs
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value
        }
      }
    }
  }

  instance.props = props
  instance.attrs = attrs
}
```

## isEmitListener 排除事件

```typescript
export function isEmitListener(
  options: ObjectEmitsOptions | null,
  key: string
): boolean {
  if (!options || !isOn(key)) {
    return false
  }

  key = key.slice(2).replace(/Once$/, '')
  return (
    hasOwn(options, key[0].toLowerCase() + key.slice(1)) ||
    hasOwn(options, hyphenate(key)) ||
    hasOwn(options, key)
  )
}
```

## 自动继承

```typescript
// renderComponentRoot 中
export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  const {
    type: Component,
    vnode,
    attrs,
    inheritAttrs
  } = instance

  let result = // 渲染结果

  // ⭐ 自动继承 attrs 到根元素
  if (inheritAttrs !== false && attrs) {
    const keys = Object.keys(attrs)
    const { shapeFlag } = result

    if (keys.length) {
      if (
        shapeFlag & (ShapeFlags.ELEMENT | ShapeFlags.COMPONENT)
      ) {
        // 合并 attrs 到根节点
        result = cloneVNode(result, attrs)
      }
    }
  }

  return result
}
```

## inheritAttrs 选项

```typescript
// 组件选项
export default {
  inheritAttrs: false,  // 禁用自动继承
  setup(props, { attrs }) {
    // 手动处理 attrs
  }
}

// <script setup> 中
defineOptions({
  inheritAttrs: false
})
```

## cloneVNode 合并 attrs

```typescript
export function cloneVNode<T, U>(
  vnode: VNode<T, U>,
  extraProps?: (Data & VNodeProps) | null,
  mergeRef = false
): VNode<T, U> {
  const { props, ref, patchFlag } = vnode
  
  // 合并 props
  const mergedProps = extraProps
    ? props
      ? mergeProps(props, extraProps)
      : extend({}, extraProps)
    : props

  const cloned: VNode<T, U> = {
    __v_isVNode: true,
    type: vnode.type,
    props: mergedProps,
    // ...
  }

  return cloned
}
```

## mergeProps 合并逻辑

```typescript
export function mergeProps(...args: (Data & VNodeProps)[]) {
  const ret: Data = {}
  
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i]
    for (const key in toMerge) {
      if (key === 'class') {
        // class 合并
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class])
        }
      } else if (key === 'style') {
        // style 合并
        ret.style = normalizeStyle([ret.style, toMerge.style])
      } else if (isOn(key)) {
        // 事件合并为数组
        const existing = ret[key]
        const incoming = toMerge[key]
        if (
          incoming &&
          existing !== incoming &&
          !(isArray(existing) && existing.includes(incoming))
        ) {
          ret[key] = existing
            ? [].concat(existing as any, incoming as any)
            : incoming
        }
      } else if (key !== '') {
        // 其他属性直接覆盖
        ret[key] = toMerge[key]
      }
    }
  }
  
  return ret
}
```

## class 和 style 的特殊处理

```typescript
// class 合并
normalizeClass(['foo', 'bar', { active: true }])
// → 'foo bar active'

// style 合并
normalizeStyle([{ color: 'red' }, { fontSize: '14px' }])
// → { color: 'red', fontSize: '14px' }
```

## 多根节点的 attrs

```html
<!-- 多根节点组件 -->
<template>
  <div>First</div>
  <div>Second</div>
</template>

<!-- 警告：需要手动绑定 -->
<!-- Extraneous non-emits event listeners were passed to component -->
```

需要手动指定：

```html
<template>
  <div v-bind="$attrs">First</div>
  <div>Second</div>
</template>
```

## attrs 的响应式

```typescript
// attrs 是响应式代理
export function getAttrsProxy(instance: ComponentInternalInstance): Data {
  return (
    instance.attrsProxy ||
    (instance.attrsProxy = new Proxy(
      instance.attrs,
      __DEV__
        ? {
            get(target, key: string) {
              track(instance, TrackOpTypes.GET, '$attrs')
              return target[key]
            },
            set() {
              warn(`setupContext.attrs is readonly.`)
              return false
            },
            deleteProperty() {
              warn(`setupContext.attrs is readonly.`)
              return false
            }
          }
        : {
            get(target, key: string) {
              track(instance, TrackOpTypes.GET, '$attrs')
              return target[key]
            }
          }
    ))
  )
}
```

## 使用示例

### 透传到内部元素

```html
<script setup>
defineOptions({
  inheritAttrs: false
})
</script>

<template>
  <div class="wrapper">
    <!-- 透传到 input -->
    <input v-bind="$attrs" />
  </div>
</template>
```

### 部分透传

```html
<script setup>
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()

const inputAttrs = computed(() => {
  const { class: _, style: __, ...rest } = attrs
  return rest
})
</script>

<template>
  <div :class="$attrs.class" :style="$attrs.style">
    <input v-bind="inputAttrs" />
  </div>
</template>
```

### 监听 attrs 变化

```html
<script setup>
import { useAttrs, watch } from 'vue'

const attrs = useAttrs()

watch(
  () => attrs.disabled,
  (disabled) => {
    console.log('disabled changed:', disabled)
  }
)
</script>
```

## 小结

$attrs 继承机制的核心要点：

1. **自动分离**：非 props、非 emits 进入 attrs
2. **自动继承**：默认合并到根元素
3. **inheritAttrs**：可禁用自动继承
4. **mergeProps**：智能合并 class、style、事件
5. **响应式代理**：attrs 访问会触发依赖收集

下一章将分析泛型组件与类型推导。
