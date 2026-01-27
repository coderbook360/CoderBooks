# defineModel 编译

defineModel 是 Vue 3.4 引入的宏，简化双向绑定的实现。

## 传统方式

```vue
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

// 手动实现双向绑定
const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>
```

## defineModel 方式

```vue
<script setup>
const modelValue = defineModel()
// modelValue 是一个 ref，自动同步
</script>
```

## 编译识别

```typescript
function processDefineModel(ctx: ScriptCompileContext) {
  for (const node of ctx.scriptSetupAst!) {
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (isCallOf(decl.init, 'defineModel')) {
          const name = getModelName(decl.init)
          const options = getModelOptions(decl.init)

          ctx.modelDecls.push({
            identifier: decl.id,
            name,
            options
          })
        }
      }
    }
  }
}

function getModelName(call: CallExpression): string {
  const firstArg = call.arguments[0]
  if (firstArg?.type === 'StringLiteral') {
    return firstArg.value
  }
  return 'modelValue'  // 默认名称
}
```

## 编译结果

```vue
<script setup>
const count = defineModel('count', { default: 0 })
</script>
```

```typescript
import { useModel as _useModel } from 'vue'

export default {
  props: {
    count: { default: 0 }
  },
  emits: ['update:count'],
  setup(__props) {
    const count = _useModel(__props, 'count')
    return { count }
  }
}
```

## 类型声明

```vue
<script setup lang="ts">
const modelValue = defineModel<string>()
const count = defineModel<number>('count', { required: true })
</script>
```

```typescript
export default {
  props: {
    modelValue: { type: String },
    count: { type: Number, required: true }
  },
  emits: ['update:modelValue', 'update:count'],
  setup(__props) {
    const modelValue = _useModel(__props, 'modelValue')
    const count = _useModel(__props, 'count')
    return { modelValue, count }
  }
}
```

## useModel 运行时

```typescript
export function useModel<T>(
  props: Record<string, any>,
  name: string,
  options?: { local?: boolean }
): Ref<T> {
  const i = getCurrentInstance()!

  if (options?.local) {
    // 本地模式：不触发 emit
    const proxy = ref(props[name]) as Ref<T>
    watch(() => props[name], v => proxy.value = v)
    return proxy
  }

  return customRef((track, trigger) => ({
    get() {
      track()
      return props[name]
    },
    set(value) {
      // 比较变化
      if (value !== props[name]) {
        i.emit(`update:${name}`, value)
      }
      trigger()
    }
  }))
}
```

## Props 生成

```typescript
function genModelProps(ctx: ScriptCompileContext): string {
  const entries: string[] = []

  for (const model of ctx.modelDecls) {
    const { name, options, typeArg } = model

    let propDef = ''
    if (typeArg) {
      propDef = genPropFromType(typeArg)
    }
    if (options) {
      propDef = mergeOptions(propDef, options)
    }

    entries.push(`${name}: ${propDef || '{}'}`)
  }

  return entries.join(',\n')
}
```

## Emits 生成

```typescript
function genModelEmits(ctx: ScriptCompileContext): string[] {
  return ctx.modelDecls.map(
    model => `update:${model.name}`
  )
}
```

## 修饰符支持

```vue
<!-- 父组件 -->
<Child v-model.trim="text" />
```

```vue
<!-- 子组件 -->
<script setup>
const [model, modifiers] = defineModel({
  set(value) {
    if (modifiers.trim) {
      return value.trim()
    }
    return value
  }
})
</script>
```

```typescript
// 编译结果
export default {
  props: {
    modelValue: {},
    modelModifiers: { default: () => ({}) }
  },
  emits: ['update:modelValue'],
  setup(__props) {
    const [model, modifiers] = _useModel(__props, 'modelValue', {
      set(value) {
        if (modifiers.trim) {
          return value.trim()
        }
        return value
      }
    })
    return { model, modifiers }
  }
}
```

## Local 模式

```vue
<script setup>
// 本地状态，不触发 emit
const count = defineModel('count', { local: true })
</script>
```

用于需要本地缓冲的场景。

## 小结

defineModel 编译的关键点：

1. **宏识别**：检测 defineModel 调用
2. **Props/Emits 生成**：自动生成声明
3. **useModel 运行时**：customRef 实现
4. **修饰符支持**：modifiers 对象

下一章将分析 defineOptions 宏的编译。
