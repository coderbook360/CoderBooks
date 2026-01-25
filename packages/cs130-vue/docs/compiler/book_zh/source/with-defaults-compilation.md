# withDefaults 编译处理

withDefaults 用于为 TypeScript 类型声明的 props 提供默认值。

## 基本用法

```vue
<script setup lang="ts">
interface Props {
  msg?: string
  count?: number
  items?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  msg: 'hello',
  count: 0,
  items: () => []
})
</script>
```

## 编译识别

```typescript
function processWithDefaults(ctx: ScriptCompileContext) {
  for (const node of ctx.scriptSetupAst!) {
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        const init = decl.init
        if (isCallOf(init, 'withDefaults')) {
          // 验证参数
          const definePropsCall = init.arguments[0]
          if (!isCallOf(definePropsCall, 'defineProps')) {
            throw new Error(
              'withDefaults first argument must be defineProps()'
            )
          }

          // 提取默认值对象
          const defaultsArg = init.arguments[1]
          if (defaultsArg?.type === 'ObjectExpression') {
            ctx.propsDefaults = parseDefaultsObject(defaultsArg)
          }

          // 处理 defineProps
          processDefineProps(ctx, definePropsCall)
        }
      }
    }
  }
}
```

## 默认值提取

```typescript
function parseDefaultsObject(
  node: ObjectExpression
): Record<string, string> {
  const defaults: Record<string, string> = {}

  for (const prop of node.properties) {
    if (prop.type !== 'Property') continue

    const key = getId(prop.key)
    const value = prop.value

    // 函数形式的默认值（用于引用类型）
    if (value.type === 'ArrowFunctionExpression') {
      defaults[key] = generateCode(value)
    } else {
      defaults[key] = generateCode(value)
    }
  }

  return defaults
}
```

## 编译结果

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  msg?: string
  list?: string[]
}>(), {
  msg: 'hello',
  list: () => ['a', 'b']
})
</script>
```

```typescript
export default {
  props: {
    msg: { type: String, required: false, default: 'hello' },
    list: { type: Array, required: false, default: () => ['a', 'b'] }
  },
  setup(__props) {
    return { }
  }
}
```

## 引用类型默认值

```typescript
// 数组和对象必须使用工厂函数
withDefaults(defineProps<{
  items?: Item[]
  config?: Config
}>(), {
  items: () => [],       // 工厂函数
  config: () => ({})     // 工厂函数
})

// 编译时验证
function validateDefault(value: Node, propType: string) {
  if (
    (propType === 'Array' || propType === 'Object') &&
    value.type !== 'ArrowFunctionExpression' &&
    value.type !== 'FunctionExpression'
  ) {
    warn('Object/Array defaults must use factory function')
  }
}
```

## Props 定义合并

```typescript
function genPropsFromTypeWithDefaults(
  ctx: ScriptCompileContext
): string {
  const entries: string[] = []

  for (const [name, prop] of Object.entries(ctx.propsTypeData)) {
    const options: string[] = []

    // type
    options.push(`type: ${prop.type.join(' | ')}`)

    // required（有默认值时为 false）
    if (ctx.propsDefaults[name]) {
      options.push(`required: false`)
      options.push(`default: ${ctx.propsDefaults[name]}`)
    } else if (prop.required) {
      options.push(`required: true`)
    }

    entries.push(`${name}: { ${options.join(', ')} }`)
  }

  return `{ ${entries.join(',\n')} }`
}
```

## 类型推断

```typescript
// withDefaults 返回类型自动推断
const props = withDefaults(defineProps<{
  msg?: string
}>(), {
  msg: 'hello'
})

// props.msg 类型是 string（非 string | undefined）
```

## 与运行时声明对比

```vue
<!-- 使用 withDefaults（类型优先） -->
<script setup lang="ts">
const props = withDefaults(defineProps<Props>(), {
  count: 0
})
</script>

<!-- 使用运行时声明 -->
<script setup>
const props = defineProps({
  count: { type: Number, default: 0 }
})
</script>
```

两种方式编译结果相同，withDefaults 提供更好的类型支持。

## 错误检测

```typescript
// 编译时错误检测
function validateWithDefaults(ctx: ScriptCompileContext) {
  // 检查默认值是否对应已声明的 prop
  for (const key of Object.keys(ctx.propsDefaults)) {
    if (!ctx.propsTypeData[key]) {
      throw new Error(
        `Property "${key}" in withDefaults() ` +
        `has no corresponding prop declaration`
      )
    }
  }
}
```

## 小结

withDefaults 编译的关键点：

1. **参数验证**：第一个参数必须是 defineProps
2. **默认值提取**：解析对象字面量
3. **工厂函数**：引用类型需要工厂函数
4. **类型合并**：生成完整的 props 定义

下一章将分析 v-pre 指令的编译处理。
