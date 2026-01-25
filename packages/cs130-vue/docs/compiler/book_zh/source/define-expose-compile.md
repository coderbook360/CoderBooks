# defineExpose 宏编译

defineExpose 控制组件实例向父组件暴露的属性。

## 基本用法

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
const increment = () => count.value++

// 只暴露 increment 方法
defineExpose({ increment })
</script>
```

## 编译识别

```typescript
function processDefineExpose(ctx: ScriptCompileContext) {
  for (const node of ctx.scriptSetupAst!) {
    if (node.type === 'ExpressionStatement') {
      if (isCallOf(node.expression, 'defineExpose')) {
        ctx.hasDefineExposeCall = true
        ctx.exposeCall = node.expression
      }
    }
  }
}
```

## 编译结果

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
const privateData = ref('secret')
const increment = () => count.value++

defineExpose({ count, increment })
</script>
```

```typescript
export default {
  setup(__props, { expose: __expose }) {
    const count = ref(0)
    const privateData = ref('secret')
    const increment = () => count.value++

    __expose({ count, increment })

    return { count, privateData, increment }
  }
}
```

## expose 函数

```typescript
function genSetupContext(ctx: ScriptCompileContext): string {
  const items: string[] = []

  // 有 defineExpose 调用时添加 expose
  if (ctx.hasDefineExposeCall) {
    items.push('expose: __expose')
  }

  if (items.length === 0) {
    return ''
  }

  return `{ ${items.join(', ')} }`
}
```

## 代码转换

```typescript
function rewriteDefineExpose(ctx: ScriptCompileContext) {
  if (!ctx.exposeCall) return

  // defineExpose({ ... }) -> __expose({ ... })
  const start = ctx.exposeCall.callee.start
  const end = ctx.exposeCall.callee.end

  ctx.s.overwrite(start, end, '__expose')
}
```

## 无参数调用

```vue
<script setup>
// 不暴露任何内容
defineExpose()
</script>
```

```typescript
export default {
  setup(__props, { expose: __expose }) {
    __expose()  // 暴露空对象
    return { }
  }
}
```

## 动态暴露

```vue
<script setup>
import { ref, computed } from 'vue'

const internalState = ref(0)

const publicApi = computed(() => ({
  value: internalState.value,
  reset: () => { internalState.value = 0 }
}))

defineExpose(publicApi.value)
</script>
```

## 运行时实现

```typescript
// 组件实例创建时
function setupStatefulComponent(instance: ComponentInternalInstance) {
  // expose 函数
  function expose(exposed?: Record<string, any>) {
    instance.exposed = exposed || {}
  }

  // 传递给 setup
  const setupContext = { expose, ... }
  const setupResult = setup(props, setupContext)
}

// 父组件访问
function getExposeProxy(instance: ComponentInternalInstance) {
  if (instance.exposed) {
    return (
      instance.exposeProxy ||
      (instance.exposeProxy = new Proxy(proxyRefs(instance.exposed), {
        get(target, key) {
          if (key in target) {
            return target[key]
          }
          // 不允许访问未暴露的属性
          return undefined
        },
        has(target, key) {
          return key in target
        }
      }))
    )
  }
}
```

## 模板 ref 访问

```vue
<!-- 父组件 -->
<template>
  <Child ref="childRef" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Child from './Child.vue'

const childRef = ref()

onMounted(() => {
  // 只能访问 Child 暴露的属性
  childRef.value.increment()  // ✓
  childRef.value.count        // ✓
  childRef.value.privateData  // undefined
})
</script>
```

## 默认行为

```vue
<script setup>
// 没有 defineExpose：默认暴露所有顶层绑定
const a = ref(0)
const b = ref(1)
// 父组件可以访问 a 和 b
</script>
```

注意：这是早期行为，Vue 3.2+ 推荐显式使用 defineExpose。

## TypeScript 支持

```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const increment = () => count.value++

defineExpose({
  count,
  increment
})
</script>
```

```typescript
// 类型推导
interface ExposedType {
  count: Ref<number>
  increment: () => void
}
```

## 小结

defineExpose 编译的关键点：

1. **宏识别**：检测 defineExpose 调用
2. **上下文注入**：添加 expose 到 setup 参数
3. **调用重写**：替换为 __expose
4. **运行时隔离**：通过 Proxy 控制访问

下一章将分析模板编译与绑定元数据的交互。
