# compileScript 脚本编译

compileScript 处理 SFC 的 script 和 script setup 块，输出编译后的 JavaScript 代码。它处理宏展开、绑定分析、类型提取等复杂任务。

## 核心功能

```typescript
export function compileScript(
  sfc: SFCDescriptor,
  options: SFCScriptCompileOptions
): SFCScriptBlock {
  const { script, scriptSetup, source, filename } = sfc
  
  // 只有普通 script
  if (!scriptSetup) {
    if (!script) {
      throw new Error('SFC must contain at least one <script> block')
    }
    return processNormalScript(script, options)
  }
  
  // 有 script setup
  return processScriptSetup(sfc, options)
}
```

## 输出结构

```typescript
interface SFCScriptBlock extends SFCBlock {
  content: string              // 编译后的代码
  bindings?: BindingMetadata   // 绑定元数据
  imports?: Record<string, ImportBinding>  // 导入信息
  scriptAst?: Statement[]      // script AST
  scriptSetupAst?: Statement[] // script setup AST
}
```

## BindingMetadata

绑定元数据告诉模板编译器如何处理变量：

```typescript
interface BindingMetadata {
  [key: string]: BindingTypes
}

enum BindingTypes {
  DATA = 'data',
  PROPS = 'props',
  PROPS_ALIASED = 'props-aliased',
  SETUP_LET = 'setup-let',
  SETUP_CONST = 'setup-const',
  SETUP_REACTIVE_CONST = 'setup-reactive-const',
  SETUP_MAYBE_REF = 'setup-maybe-ref',
  SETUP_REF = 'setup-ref',
  OPTIONS = 'options',
  LITERAL_CONST = 'literal-const'
}
```

## 处理流程

```typescript
function processScriptSetup(sfc: SFCDescriptor, options: SFCScriptCompileOptions) {
  const ctx = new ScriptCompileContext(sfc, options)
  
  // 1. 解析 AST
  const scriptAst = ctx.script ? parse(ctx.script.content) : null
  const scriptSetupAst = parse(ctx.scriptSetup.content)
  
  // 2. 分析绑定
  for (const node of scriptSetupAst.body) {
    // 处理导入
    if (node.type === 'ImportDeclaration') {
      processImport(ctx, node)
    }
    // 处理变量声明
    else if (node.type === 'VariableDeclaration') {
      processVariableDeclaration(ctx, node)
    }
    // 处理宏调用
    else if (isCallOf(node, DEFINE_PROPS)) {
      processDefineProps(ctx, node)
    }
    else if (isCallOf(node, DEFINE_EMITS)) {
      processDefineEmits(ctx, node)
    }
    // ...更多宏
  }
  
  // 3. 生成代码
  const output = generateScriptSetupOutput(ctx)
  
  return {
    ...ctx.scriptSetup,
    content: output,
    bindings: ctx.bindings
  }
}
```

## 导入处理

```typescript
import { ref, computed } from 'vue'
import MyComponent from './MyComponent.vue'
import { helper } from './utils'
```

处理：

```typescript
function processImport(ctx: ScriptCompileContext, node: ImportDeclaration) {
  const source = node.source.value
  
  for (const spec of node.specifiers) {
    const local = spec.local.name
    const imported = 
      spec.type === 'ImportDefaultSpecifier' ? 'default' :
      spec.type === 'ImportNamespaceSpecifier' ? '*' :
      spec.imported.name
    
    ctx.userImports[local] = {
      source,
      imported,
      local,
      isType: node.importKind === 'type',
      isFromSetup: true
    }
    
    // 检查是否是 Vue API
    if (source === 'vue') {
      if (imported === 'ref') {
        ctx.bindings[local] = BindingTypes.SETUP_REF
      } else if (imported === 'reactive') {
        ctx.bindings[local] = BindingTypes.SETUP_REACTIVE_CONST
      }
    }
  }
}
```

## 变量声明处理

```typescript
const count = ref(0)
const doubled = computed(() => count.value * 2)
let message = 'hello'
```

分析：

```typescript
function processVariableDeclaration(ctx, node) {
  const isConst = node.kind === 'const'
  
  for (const decl of node.declarations) {
    const name = decl.id.name
    
    if (isConst) {
      // 检查初始化表达式
      if (isCallOf(decl.init, 'ref')) {
        ctx.bindings[name] = BindingTypes.SETUP_REF
      } else if (isCallOf(decl.init, 'reactive')) {
        ctx.bindings[name] = BindingTypes.SETUP_REACTIVE_CONST
      } else if (isLiteralType(decl.init)) {
        ctx.bindings[name] = BindingTypes.LITERAL_CONST
      } else {
        ctx.bindings[name] = BindingTypes.SETUP_CONST
      }
    } else {
      // let 或 var
      ctx.bindings[name] = BindingTypes.SETUP_LET
    }
  }
}
```

## 代码生成

最终输出：

```typescript
function generateScriptSetupOutput(ctx) {
  const { helper } = ctx
  
  let code = ''
  
  // 导入
  code += `import { ${ctx.helpers.join(', ')} } from 'vue'\n`
  
  // 普通 script 内容
  if (ctx.script) {
    code += ctx.script.content + '\n'
  }
  
  // 默认导出
  code += `export default /*#__PURE__*/ _defineComponent({\n`
  
  // props
  if (ctx.propsRuntimeDecl) {
    code += `  props: ${ctx.propsRuntimeDecl},\n`
  }
  
  // emits
  if (ctx.emitsRuntimeDecl) {
    code += `  emits: ${ctx.emitsRuntimeDecl},\n`
  }
  
  // setup 函数
  code += `  setup(__props, { expose: __expose }) {\n`
  code += `    __expose()\n`
  code += ctx.scriptSetupContent
  code += `    return { ... }\n`
  code += `  }\n`
  
  code += `})\n`
  
  return code
}
```

## 输入输出示例

输入：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const increment = () => count.value++
</script>
```

输出：

```javascript
import { defineComponent as _defineComponent, ref } from 'vue'

export default /*#__PURE__*/ _defineComponent({
  setup(__props, { expose: __expose }) {
    __expose()
    
    const count = ref(0)
    const increment = () => count.value++
    
    return { count, increment }
  }
})
```

## TypeScript 处理

开启 TypeScript 时，类型信息被利用：

```typescript
const props = defineProps<{
  msg: string
  count?: number
}>()
```

提取类型信息用于运行时验证。

## 绑定元数据用途

模板编译器使用 bindings：

```typescript
// bindings = { count: 'setup-ref', increment: 'setup-const' }

// 模板中
{{ count }}  // 生成 count.value
increment()  // 直接调用，不加 .value
```

## 小结

compileScript 处理 SFC 的脚本块。它解析 AST，分析导入和变量声明，处理各种宏（defineProps、defineEmits 等），生成最终的 JavaScript 代码。绑定元数据告诉模板编译器如何正确引用变量。这是 script setup 语法糖背后的核心实现。
