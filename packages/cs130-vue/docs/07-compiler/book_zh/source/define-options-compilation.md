# defineOptions 编译

defineOptions 是 Vue 3.3 引入的宏，用于在 script setup 中声明组件选项。

## 使用场景

```vue
<script setup>
// 声明无法通过其他宏表达的选项
defineOptions({
  name: 'CustomName',
  inheritAttrs: false
})
</script>
```

## 编译识别

```typescript
function processDefineOptions(ctx: ScriptCompileContext) {
  for (const node of ctx.scriptSetupAst!) {
    if (node.type === 'ExpressionStatement') {
      if (isCallOf(node.expression, 'defineOptions')) {
        if (ctx.hasDefineOptionsCall) {
          throw new Error('defineOptions() can only be called once')
        }

        ctx.hasDefineOptionsCall = true
        ctx.optionsCall = node.expression

        // 提取选项对象
        const arg = node.expression.arguments[0]
        if (arg?.type === 'ObjectExpression') {
          ctx.optionsArg = arg
        }
      }
    }
  }
}
```

## 选项验证

```typescript
const FORBIDDEN_OPTIONS = [
  'props',
  'emits',
  'expose',
  'slots',
  'setup'
]

function validateOptions(options: ObjectExpression) {
  for (const prop of options.properties) {
    if (prop.type !== 'Property') continue

    const key = getId(prop.key)
    if (FORBIDDEN_OPTIONS.includes(key)) {
      throw new Error(
        `defineOptions() cannot be used to declare ${key}. ` +
        `Use ${getAlternative(key)} instead.`
      )
    }
  }
}

function getAlternative(option: string): string {
  switch (option) {
    case 'props': return 'defineProps()'
    case 'emits': return 'defineEmits()'
    case 'expose': return 'defineExpose()'
    case 'slots': return 'defineSlots()'
    default: return 'the appropriate macro'
  }
}
```

## 编译结果

```vue
<script setup>
defineOptions({
  name: 'MyComponent',
  inheritAttrs: false,
  customOption: 'value'
})

const msg = ref('hello')
</script>
```

```typescript
export default {
  name: 'MyComponent',
  inheritAttrs: false,
  customOption: 'value',
  setup(__props) {
    const msg = ref('hello')
    return { msg }
  }
}
```

## 选项合并

```typescript
function generateScriptSetup(ctx: ScriptCompileContext): string {
  let code = 'export default {\n'

  // 合并 defineOptions 的选项
  if (ctx.optionsArg) {
    const options = generateCode(ctx.optionsArg)
    // 移除外层大括号
    code += options.slice(1, -1) + ',\n'
  }

  // 添加 props
  if (ctx.propsRuntimeDecl) {
    code += `props: ${generateCode(ctx.propsRuntimeDecl)},\n`
  }

  // 添加 emits
  if (ctx.emitsRuntimeDecl) {
    code += `emits: ${generateCode(ctx.emitsRuntimeDecl)},\n`
  }

  // 添加 setup
  code += genSetupFunction(ctx)

  code += '}'
  return code
}
```

## 常见选项

```vue
<script setup>
defineOptions({
  // 组件名称（用于调试和递归组件）
  name: 'RecursiveTree',

  // 禁用属性透传
  inheritAttrs: false,

  // 自定义选项（用于插件）
  customOption: someValue
})
</script>
```

## 与 script 标签配合

```vue
<script>
// 普通 script 中也可以声明选项
export default {
  name: 'MyComponent',
  inheritAttrs: false
}
</script>

<script setup>
// setup 逻辑
const count = ref(0)
</script>
```

这种方式也可以，但 defineOptions 更简洁。

## 移除宏调用

```typescript
function rewriteDefineOptions(ctx: ScriptCompileContext) {
  if (!ctx.optionsCall) return

  // 从输出中移除 defineOptions 调用
  const { start, end } = ctx.optionsCall
  ctx.s.remove(start, end)
}
```

## TypeScript 类型

```typescript
// vue/macros.d.ts
declare function defineOptions<
  RawBindings = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin
>(
  options?: ComponentOptionsWithoutProps<
    {},
    RawBindings,
    D,
    C,
    M,
    Mixin,
    Extends
  > & { name?: string; inheritAttrs?: boolean }
): void
```

## 小结

defineOptions 编译的关键点：

1. **单次调用**：只允许调用一次
2. **选项验证**：禁止特定选项
3. **代码合并**：合并到组件定义
4. **调用移除**：从输出代码中删除

下一章将分析 defineSlots 宏的编译。
