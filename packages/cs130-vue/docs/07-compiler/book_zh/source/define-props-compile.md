# defineProps 宏编译

defineProps 是 script setup 中声明 props 的编译时宏。

## 基本用法

```vue
<script setup>
// 运行时声明
const props = defineProps({
  title: String,
  count: { type: Number, default: 0 }
})

// 或类型声明
const props = defineProps<{
  title: string
  count?: number
}>()
</script>
```

## 编译识别

```typescript
function processDefineProps(ctx: ScriptCompileContext) {
  for (const node of ctx.scriptSetupAst!) {
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (isCallOf(decl.init, 'defineProps')) {
          ctx.propsCall = decl.init
          ctx.propsIdentifier = decl.id

          // 处理参数
          const arg = decl.init.arguments[0]
          if (arg) {
            ctx.propsRuntimeDecl = arg
          }

          // 处理类型参数
          const typeArg = decl.init.typeParameters?.params[0]
          if (typeArg) {
            ctx.propsTypeDecl = typeArg
          }
        }
      }
    }
  }
}
```

## 运行时声明编译

```vue
<script setup>
const props = defineProps({
  msg: String,
  count: { type: Number, required: true }
})
</script>
```

```typescript
export default {
  props: {
    msg: String,
    count: { type: Number, required: true }
  },
  setup(__props) {
    const props = __props
    return { }
  }
}
```

## 类型声明编译

```vue
<script setup lang="ts">
interface Props {
  msg: string
  count: number
}
const props = defineProps<Props>()
</script>
```

```typescript
export default {
  props: {
    msg: { type: String, required: true },
    count: { type: Number, required: true }
  },
  setup(__props) {
    const props = __props
    return { }
  }
}
```

## 类型到运行时转换

```typescript
function extractPropsFromType(
  ctx: ScriptCompileContext,
  typeNode: TSTypeLiteral
): Record<string, PropTypeData> {
  const props: Record<string, PropTypeData> = {}

  for (const member of typeNode.members) {
    if (member.type === 'TSPropertySignature') {
      const name = getId(member.key)
      const optional = !!member.optional
      const type = resolveType(member.typeAnnotation)

      props[name] = {
        type: inferRuntimeType(type),
        required: !optional
      }
    }
  }

  return props
}

function inferRuntimeType(type: TSType): string[] {
  switch (type.type) {
    case 'TSStringKeyword':
      return ['String']
    case 'TSNumberKeyword':
      return ['Number']
    case 'TSBooleanKeyword':
      return ['Boolean']
    case 'TSArrayType':
      return ['Array']
    case 'TSFunctionType':
      return ['Function']
    case 'TSObjectKeyword':
      return ['Object']
    case 'TSUnionType':
      return type.types.flatMap(t => inferRuntimeType(t))
    default:
      return ['null']
  }
}
```

## withDefaults

```vue
<script setup lang="ts">
interface Props {
  msg?: string
  count?: number
}
const props = withDefaults(defineProps<Props>(), {
  msg: 'hello',
  count: 0
})
</script>
```

```typescript
export default {
  props: {
    msg: { type: String, required: false, default: 'hello' },
    count: { type: Number, required: false, default: 0 }
  },
  setup(__props) {
    const props = __props
    return { }
  }
}
```

## 默认值处理

```typescript
function processWithDefaults(ctx: ScriptCompileContext) {
  const call = ctx.propsCall
  if (!isCallOf(call.callee, 'withDefaults')) return

  const defaultsArg = call.arguments[1]
  if (defaultsArg?.type !== 'ObjectExpression') return

  for (const prop of defaultsArg.properties) {
    if (prop.type !== 'Property') continue
    const name = getId(prop.key)
    const value = prop.value

    // 合并到 props 定义
    ctx.propsDefaults[name] = generateCode(value)
  }
}
```

## 生成 props 选项

```typescript
function genRuntimeProps(ctx: ScriptCompileContext): string {
  const props = ctx.propsRuntimeDecl
    ? generateCode(ctx.propsRuntimeDecl)
    : genPropsFromType(ctx)

  return `props: ${props}`
}

function genPropsFromType(ctx: ScriptCompileContext): string {
  const entries: string[] = []

  for (const [name, prop] of Object.entries(ctx.propsTypeData)) {
    const options: string[] = []

    // type
    if (prop.type.length === 1) {
      options.push(`type: ${prop.type[0]}`)
    } else {
      options.push(`type: [${prop.type.join(', ')}]`)
    }

    // required
    if (prop.required) {
      options.push(`required: true`)
    }

    // default
    if (ctx.propsDefaults[name]) {
      options.push(`default: ${ctx.propsDefaults[name]}`)
    }

    entries.push(`${name}: { ${options.join(', ')} }`)
  }

  return `{ ${entries.join(',\n')} }`
}
```

## 绑定元数据

```typescript
// props 绑定
for (const name of Object.keys(ctx.propsTypeData)) {
  ctx.bindingMetadata[name] = BindingTypes.PROPS
}

// 模板访问
// {{ msg }} -> __props.msg
```

## 小结

defineProps 编译的关键点：

1. **宏识别**：检测 defineProps 调用
2. **类型提取**：从 TypeScript 类型生成运行时声明
3. **默认值合并**：withDefaults 处理
4. **绑定注册**：标记为 PROPS 类型

下一章将分析 defineEmits 宏的编译。
