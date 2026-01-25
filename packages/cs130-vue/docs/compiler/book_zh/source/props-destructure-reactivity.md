# Props 解构响应式

Vue 3.5 引入了 props 解构的响应式支持，解决了解构后丢失响应性的问题。

## 问题背景

```vue
<script setup>
// Vue 3.4 之前：解构会丢失响应式
const { count } = defineProps(['count'])

watchEffect(() => {
  console.log(count)  // 不会在 count 变化时触发
})
</script>
```

## 新的解构语法

```vue
<script setup>
// Vue 3.5+：保持响应式
const { count, msg = 'hello' } = defineProps(['count', 'msg'])

watchEffect(() => {
  console.log(count)  // 正确响应变化
})
</script>
```

## 编译识别

```typescript
function processPropsDestructure(ctx: ScriptCompileContext) {
  if (!ctx.propsIdentifier) return
  if (ctx.propsIdentifier.type !== 'ObjectPattern') return

  ctx.propsDestructured = true

  // 收集解构的变量
  for (const prop of ctx.propsIdentifier.properties) {
    if (prop.type === 'ObjectProperty') {
      const key = getId(prop.key)
      const value = prop.value

      if (value.type === 'Identifier') {
        ctx.propsDestructureMap[value.name] = {
          key,
          local: value.name,
          default: undefined
        }
      } else if (value.type === 'AssignmentPattern') {
        // 带默认值
        ctx.propsDestructureMap[value.left.name] = {
          key,
          local: value.left.name,
          default: value.right
        }
      }
    }
  }
}
```

## 编译转换

```vue
<script setup>
const { count, msg = 'default' } = defineProps(['count', 'msg'])
console.log(count, msg)
</script>
```

```typescript
export default {
  props: {
    count: null,
    msg: { default: 'default' }
  },
  setup(__props) {
    // 访问时自动替换为 __props.xxx
    console.log(__props.count, __props.msg)

    return { }
  }
}
```

## 变量引用重写

```typescript
function rewritePropsReference(
  node: Identifier,
  ctx: ScriptCompileContext
) {
  const prop = ctx.propsDestructureMap[node.name]
  if (!prop) return

  // 替换为 __props.key
  ctx.s.overwrite(
    node.start,
    node.end,
    `__props.${prop.key}`
  )
}
```

## 模板访问

```vue
<template>
  <!-- 模板中直接使用解构变量 -->
  <div>{{ count }} - {{ msg }}</div>
</template>
```

模板编译器同样需要处理这些变量。

## 绑定元数据

```typescript
// 解构的 props 标记为别名
for (const [local, prop] of Object.entries(ctx.propsDestructureMap)) {
  if (local !== prop.key) {
    ctx.bindingMetadata[local] = BindingTypes.PROPS_ALIASED
    ctx.bindingMetadata.__propsAliases[local] = prop.key
  } else {
    ctx.bindingMetadata[local] = BindingTypes.PROPS
  }
}
```

## 别名处理

```vue
<script setup>
const { count: localCount } = defineProps(['count'])
</script>
```

```typescript
// localCount 映射到 __props.count
ctx.propsDestructureMap = {
  localCount: { key: 'count', local: 'localCount' }
}

// 使用时
console.log(localCount)
// 转换为
console.log(__props.count)
```

## Rest 解构

```vue
<script setup>
const { a, ...rest } = defineProps(['a', 'b', 'c'])
</script>
```

```typescript
// rest 需要特殊处理
import { createPropsRestProxy } from 'vue'

export default {
  props: ['a', 'b', 'c'],
  setup(__props) {
    const rest = createPropsRestProxy(__props, ['a'])
    return { rest }
  }
}
```

## createPropsRestProxy

```typescript
export function createPropsRestProxy(
  props: Record<string, any>,
  excludedKeys: string[]
) {
  const ret: Record<string, any> = {}

  for (const key in props) {
    if (!excludedKeys.includes(key)) {
      Object.defineProperty(ret, key, {
        enumerable: true,
        get: () => props[key]
      })
    }
  }

  return ret
}
```

## Watch 中使用

```vue
<script setup>
const { count } = defineProps(['count'])

watch(
  () => count,  // 需要包装为 getter
  (newVal) => {
    console.log(newVal)
  }
)
</script>
```

## 小结

Props 解构响应式的关键点：

1. **编译时转换**：解构变量替换为属性访问
2. **默认值处理**：提升到 props 定义
3. **别名支持**：维护映射关系
4. **Rest 解构**：createPropsRestProxy 实现

这是本书源码分析部分的最后一章。
