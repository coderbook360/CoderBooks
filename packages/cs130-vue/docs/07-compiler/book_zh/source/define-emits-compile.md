# defineEmits 宏编译

defineEmits 是 script setup 中声明事件的编译时宏。

## 基本用法

```vue
<script setup>
// 运行时声明
const emit = defineEmits(['update', 'delete'])

// 或类型声明
const emit = defineEmits<{
  (e: 'update', id: number): void
  (e: 'delete', id: number): void
}>()

// Vue 3.3+ 简化语法
const emit = defineEmits<{
  update: [id: number]
  delete: [id: number]
}>()
</script>
```

## 编译识别

```typescript
function processDefineEmits(ctx: ScriptCompileContext) {
  for (const node of ctx.scriptSetupAst!) {
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (isCallOf(decl.init, 'defineEmits')) {
          ctx.emitsCall = decl.init
          ctx.emitsIdentifier = decl.id

          // 运行时参数
          const arg = decl.init.arguments[0]
          if (arg) {
            ctx.emitsRuntimeDecl = arg
          }

          // 类型参数
          const typeArg = decl.init.typeParameters?.params[0]
          if (typeArg) {
            ctx.emitsTypeDecl = typeArg
          }
        }
      }
    }
  }
}
```

## 数组声明编译

```vue
<script setup>
const emit = defineEmits(['change', 'update:modelValue'])
</script>
```

```typescript
export default {
  emits: ['change', 'update:modelValue'],
  setup(__props, { emit }) {
    return { }
  }
}
```

## 对象声明编译

```vue
<script setup>
const emit = defineEmits({
  change: (value) => typeof value === 'string',
  submit: null
})
</script>
```

```typescript
export default {
  emits: {
    change: (value) => typeof value === 'string',
    submit: null
  },
  setup(__props, { emit }) {
    return { }
  }
}
```

## 类型声明编译

```vue
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'change', value: string): void
  (e: 'update', id: number, data: object): void
}>()
</script>
```

```typescript
export default {
  emits: ['change', 'update'],
  setup(__props, { emit }) {
    return { }
  }
}
```

## 类型提取

```typescript
function extractEmitsFromType(
  ctx: ScriptCompileContext,
  typeNode: TSType
): string[] {
  const emits: string[] = []

  if (typeNode.type === 'TSFunctionType') {
    // 单个事件签名
    const eventName = extractEventName(typeNode)
    if (eventName) emits.push(eventName)
  } else if (typeNode.type === 'TSTypeLiteral') {
    // 多个调用签名
    for (const member of typeNode.members) {
      if (member.type === 'TSCallSignatureDeclaration') {
        const eventName = extractEventName(member)
        if (eventName) emits.push(eventName)
      } else if (member.type === 'TSPropertySignature') {
        // Vue 3.3+ 简化语法
        emits.push(getId(member.key))
      }
    }
  }

  return emits
}

function extractEventName(signature: TSFunctionType): string | null {
  const firstParam = signature.parameters[0]
  if (!firstParam) return null

  const typeAnnotation = firstParam.typeAnnotation?.typeAnnotation
  if (typeAnnotation?.type === 'TSLiteralType') {
    const literal = typeAnnotation.literal
    if (literal.type === 'StringLiteral') {
      return literal.value
    }
  }

  return null
}
```

## Vue 3.3+ 简化语法

```vue
<script setup lang="ts">
// 更简洁的声明方式
const emit = defineEmits<{
  change: [value: string]
  update: [id: number, data: object]
}>()
</script>
```

```typescript
// 类型定义
interface ShortEmits {
  [event: string]: [...args: any[]]
}
```

## emit 函数处理

```typescript
function genSetupContext(ctx: ScriptCompileContext): string {
  const contextItems: string[] = []

  // emit
  if (ctx.emitsIdentifier) {
    contextItems.push(`emit: ${ctx.emitsIdentifier.name}`)
  }

  // expose
  if (ctx.hasExpose) {
    contextItems.push('expose: __expose')
  }

  if (contextItems.length === 0) {
    return ''
  }

  return `{ ${contextItems.join(', ')} }`
}
```

## 生成 emits 选项

```typescript
function genRuntimeEmits(ctx: ScriptCompileContext): string {
  if (ctx.emitsRuntimeDecl) {
    return `emits: ${generateCode(ctx.emitsRuntimeDecl)}`
  }

  if (ctx.emitsTypeDecl) {
    const emits = extractEmitsFromType(ctx, ctx.emitsTypeDecl)
    return `emits: ${JSON.stringify(emits)}`
  }

  return ''
}
```

## 事件验证

```vue
<script setup>
const emit = defineEmits({
  submit: (payload) => {
    if (!payload.email) {
      console.warn('Email required')
      return false
    }
    return true
  }
})
</script>
```

验证函数在运行时调用，返回 false 会触发警告。

## 类型安全

```typescript
// 编译后的类型定义
const emit: {
  (e: 'change', value: string): void
  (e: 'update', id: number): void
}

// 使用时有完整类型检查
emit('change', 'new value')  // ✓
emit('change', 123)          // ✗ 类型错误
emit('unknown')              // ✗ 事件不存在
```

## 小结

defineEmits 编译的关键点：

1. **宏识别**：检测 defineEmits 调用
2. **类型提取**：从签名提取事件名
3. **简化语法**：Vue 3.3+ 支持对象形式
4. **代码生成**：生成 emits 选项

下一章将分析 defineExpose 宏的编译。
