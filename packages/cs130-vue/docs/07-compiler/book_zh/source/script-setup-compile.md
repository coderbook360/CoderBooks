# script setup 编译

script setup 是 Vue 3.2 引入的编译时语法糖，简化组合式 API 的使用。

## 编译入口

```typescript
export function compileScript(
  sfc: SFCDescriptor,
  options: SFCScriptCompileOptions
): SFCScriptBlock {
  const ctx = new ScriptCompileContext(sfc, options)

  // 分析绑定
  const scriptBindings = analyzeScriptBindings(ctx)
  const setupBindings = analyzeSetupBindings(ctx)

  // 生成代码
  let content = generateScript(ctx)

  return {
    ...sfc.scriptSetup,
    content,
    bindings: { ...scriptBindings, ...setupBindings }
  }
}
```

## ScriptCompileContext

```typescript
class ScriptCompileContext {
  descriptor: SFCDescriptor
  options: SFCScriptCompileOptions

  // 解析后的 AST
  scriptAst: Statement[] | null
  scriptSetupAst: Statement[] | null

  // 绑定信息
  bindingMetadata: BindingMetadata = {}

  // 宏调用
  propsRuntimeDecl: Node | undefined
  propsTypeDecl: Node | undefined
  emitsRuntimeDecl: Node | undefined
  emitsTypeDecl: Node | undefined

  // 导入
  userImports: Record<string, ImportBinding> = {}

  constructor(descriptor: SFCDescriptor, options: SFCScriptCompileOptions) {
    this.descriptor = descriptor
    this.options = options

    // 解析 AST
    if (descriptor.script) {
      this.scriptAst = parse(descriptor.script.content)
    }
    if (descriptor.scriptSetup) {
      this.scriptSetupAst = parse(descriptor.scriptSetup.content)
    }
  }
}
```

## 编译转换

```vue
<script setup>
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

const count = ref(0)
const increment = () => count.value++
</script>
```

```typescript
// 编译结果
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

export default {
  __name: 'App',
  setup(__props, { expose: __expose }) {
    __expose()

    const count = ref(0)
    const increment = () => count.value++

    return { count, increment, MyComponent }
  }
}
```

## 导入分析

```typescript
function analyzeImports(ctx: ScriptCompileContext) {
  for (const node of ctx.scriptSetupAst!) {
    if (node.type === 'ImportDeclaration') {
      const source = node.source.value

      for (const specifier of node.specifiers) {
        const local = specifier.local.name
        const imported = getImportedName(specifier)

        ctx.userImports[local] = {
          isType: node.importKind === 'type',
          imported,
          source,
          isFromSetup: true
        }

        // 确定绑定类型
        if (isComponent(source)) {
          ctx.bindingMetadata[local] = BindingTypes.SETUP_CONST
        }
      }
    }
  }
}
```

## 绑定类型

```typescript
export const enum BindingTypes {
  DATA = 'data',
  PROPS = 'props',
  PROPS_ALIASED = 'props-aliased',
  SETUP_CONST = 'setup-const',
  SETUP_LET = 'setup-let',
  SETUP_REACTIVE_CONST = 'setup-reactive-const',
  SETUP_REF = 'setup-ref',
  SETUP_MAYBE_REF = 'setup-maybe-ref',
  LITERAL_CONST = 'literal-const',
  OPTIONS = 'options'
}
```

## 变量声明分析

```typescript
function analyzeBindings(ctx: ScriptCompileContext) {
  for (const node of ctx.scriptSetupAst!) {
    if (node.type === 'VariableDeclaration') {
      const isConst = node.kind === 'const'

      for (const decl of node.declarations) {
        const id = decl.id
        const init = decl.init

        if (id.type === 'Identifier') {
          let bindingType: BindingTypes

          if (isConst) {
            if (isCallOf(init, 'ref')) {
              bindingType = BindingTypes.SETUP_REF
            } else if (isCallOf(init, 'reactive')) {
              bindingType = BindingTypes.SETUP_REACTIVE_CONST
            } else if (isLiteralType(init)) {
              bindingType = BindingTypes.LITERAL_CONST
            } else {
              bindingType = BindingTypes.SETUP_CONST
            }
          } else {
            bindingType = BindingTypes.SETUP_LET
          }

          ctx.bindingMetadata[id.name] = bindingType
        }
      }
    }
  }
}
```

## 返回语句生成

```typescript
function generateReturn(ctx: ScriptCompileContext): string {
  const returns: string[] = []

  for (const [key, type] of Object.entries(ctx.bindingMetadata)) {
    // 跳过导入的类型
    if (ctx.userImports[key]?.isType) continue

    // 跳过 props
    if (type === BindingTypes.PROPS) continue

    returns.push(key)
  }

  return `return { ${returns.join(', ')} }`
}
```

## 顶层 await

```vue
<script setup>
const data = await fetchData()
</script>
```

```typescript
export default {
  async setup() {
    const data = await fetchData()
    return { data }
  }
}
```

顶层 await 自动将 setup 转换为 async 函数。

## 模板绑定元数据

```typescript
// 传递给模板编译器
compileTemplate({
  source: template.content,
  compilerOptions: {
    bindingMetadata: script.bindings
  }
})

// 模板中使用
// {{ count }} -> _ctx.count（带 .value 解包）
```

## 小结

script setup 编译的关键点：

1. **AST 分析**：解析导入和变量声明
2. **绑定类型推断**：ref、reactive、const 等
3. **代码生成**：包装为 setup 函数
4. **元数据传递**：指导模板编译

下一章将分析 defineProps 宏的编译。
