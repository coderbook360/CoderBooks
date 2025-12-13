# script setup 的编译处理

`<script setup>` 是如何让我们省去 `export default { setup() { return { ... } } }` 这样的样板代码的？

**本章将揭开 `<script setup>` 背后的编译原理。** 理解它，你就能更好地使用这个语法糖，避免常见坑点。

## 编译目标

源码：

```html
<script setup>
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

const count = ref(0)
const increment = () => count.value++
</script>
```

编译为：

```javascript
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

const __sfc__ = {
  __name: 'MyComponent',
  setup(__props, { expose: __expose }) {
    __expose()
    
    const count = ref(0)
    const increment = () => count.value++
    
    return { count, increment, MyComponent }
  }
}

export default __sfc__
```

编译器做了什么？

1. 将顶层代码放入 `setup()` 函数
2. 自动收集需要暴露的变量
3. 自动注册导入的组件

## compileScript 函数

```javascript
function compileScript(sfc, options) {
  const { script, scriptSetup, source, filename } = sfc
  
  // 没有 script setup，处理普通 script
  if (!scriptSetup) {
    if (script) {
      return processNormalScript(script, options)
    }
    return { content: 'export default {}' }
  }
  
  // 解析 script setup AST
  const scriptSetupAst = babelParse(scriptSetup.content, {
    sourceType: 'module',
    plugins: ['typescript']
  })
  
  // 编译上下文
  const ctx = new ScriptCompileContext(sfc, options)
  
  // 1. 分析导入
  for (const stmt of scriptSetupAst.body) {
    if (stmt.type === 'ImportDeclaration') {
      processImport(stmt, ctx)
    }
  }
  
  // 2. 处理编译器宏
  for (const stmt of scriptSetupAst.body) {
    processScriptSetupStatement(stmt, ctx)
  }
  
  // 3. 分析变量绑定
  analyzeBindings(ctx)
  
  // 4. 生成输出代码
  return generateOutput(ctx)
}
```

## 变量绑定分析

**这是 script setup 编译的核心问题**：编译器需要知道每个变量的类型，以生成正确的模板访问代码。

**为什么需要区分变量类型？** 看这个例子：

```javascript
const count = ref(0)
const state = reactive({ x: 1 })
const PI = 3.14
```

在模板中访问时，编译器需要知道：
- `count` 是 ref，模板中使用时需要自动解包（`.value`）
- `state` 是 reactive，直接访问即可
- `PI` 是字面量常量，可以内联优化

```javascript
const BindingTypes = {
  DATA: 'data',                      // Options API 的 data 属性
  PROPS: 'props',                    // 组件 props
  SETUP_LET: 'setup-let',            // let 声明，可能被重新赋值
  SETUP_CONST: 'setup-const',        // const 声明，类型未知
  SETUP_REACTIVE_CONST: 'setup-reactive-const',  // reactive() 返回值
  SETUP_REF: 'setup-ref',            // ref() 返回值，模板需要解包
  SETUP_MAYBE_REF: 'setup-maybe-ref', // 可能是 ref（如函数返回值）
  LITERAL_CONST: 'literal-const'     // 字面量常量，可内联
}
```

分析逻辑：

```javascript
function analyzeBindings(ctx) {
  for (const stmt of ctx.scriptSetupAst.body) {
    if (stmt.type === 'VariableDeclaration') {
      const isConst = stmt.kind === 'const'
      
      for (const decl of stmt.declarations) {
        const name = decl.id.name
        const init = decl.init
        
        if (isConst) {
          // 判断是否是 ref
          if (isCallOf(init, 'ref') || isCallOf(init, 'shallowRef')) {
            ctx.bindings[name] = BindingTypes.SETUP_REF
          }
          // 判断是否是 reactive
          else if (isCallOf(init, 'reactive')) {
            ctx.bindings[name] = BindingTypes.SETUP_REACTIVE_CONST
          }
          // 字面量常量
          else if (isLiteralType(init)) {
            ctx.bindings[name] = BindingTypes.LITERAL_CONST
          }
          else {
            ctx.bindings[name] = BindingTypes.SETUP_MAYBE_REF
          }
        } else {
          ctx.bindings[name] = BindingTypes.SETUP_LET
        }
      }
    }
  }
}
```

## 编译器宏

`defineProps`、`defineEmits` 等是编译时宏，不是真正的函数：

```html
<script setup>
const props = defineProps<{ msg: string }>()
const emit = defineEmits<{ (e: 'update'): void }>()
</script>
```

处理宏：

```javascript
function processScriptSetupStatement(stmt, ctx) {
  if (stmt.type === 'VariableDeclaration') {
    const init = stmt.declarations[0].init
    
    if (isCallOf(init, 'defineProps')) {
      processDefineProps(stmt, ctx)
      // 标记为已处理，后续移除
      stmt._processed = true
    }
    
    if (isCallOf(init, 'defineEmits')) {
      processDefineEmits(stmt, ctx)
      stmt._processed = true
    }
  }
  
  // withDefaults
  if (isCallOf(stmt.expression, 'withDefaults')) {
    processWithDefaults(stmt, ctx)
  }
}
```

`defineProps` 处理：

```javascript
function processDefineProps(stmt, ctx) {
  const call = stmt.declarations[0].init
  
  // 运行时声明
  if (call.arguments.length > 0) {
    ctx.propsRuntimeDecl = call.arguments[0]
  }
  
  // TypeScript 类型声明
  if (call.typeParameters) {
    ctx.propsTypeDecl = call.typeParameters.params[0]
    // 从类型中提取 props 定义
    ctx.propsKeys = extractPropsFromType(ctx.propsTypeDecl)
  }
  
  // 记录 props 变量名
  const propsId = stmt.declarations[0].id
  if (propsId.type === 'Identifier') {
    ctx.propsIdentifier = propsId.name
  }
}
```

## withDefaults 处理

**首先要问的是**：使用 TypeScript 类型定义 props 时，如何设置默认值？

```typescript
// 运行时声明可以直接设置默认值
const props = defineProps({
  msg: { type: String, default: 'hello' }
})

// 但纯类型声明无法表达默认值
const props = defineProps<{ msg?: string }>()  // 默认值在哪里？
```

**答案是 `withDefaults`**：

```typescript
const props = withDefaults(defineProps<{
  msg?: string
  count?: number
}>(), {
  msg: 'hello',
  count: 0
})
```

编译器如何处理 `withDefaults`？

```javascript
function processWithDefaults(node, ctx) {
  // withDefaults(defineProps<T>(), defaults)
  const call = node.expression
  const [propsCall, defaultsArg] = call.arguments
  
  // 1. 先处理内部的 defineProps
  processDefineProps(propsCall, ctx)
  
  // 2. 记录默认值对象
  if (defaultsArg && defaultsArg.type === 'ObjectExpression') {
    ctx.propsDefaults = defaultsArg
  }
}
```

**编译结果**：

```javascript
// 源码
const props = withDefaults(defineProps<{
  msg?: string
  count?: number
}>(), {
  msg: 'hello',
  count: 0
})

// 编译为
const __sfc__ = {
  props: {
    msg: { type: String, required: false, default: 'hello' },
    count: { type: Number, required: false, default: 0 }
  },
  setup(__props) {
    // props 可直接使用
  }
}
```

**注意**：`withDefaults` 只能与纯类型声明配合使用，不能与运行时声明混用。

## 代码生成

```javascript
function generateOutput(ctx) {
  const { bindings, propsRuntimeDecl, emitsRuntimeDecl } = ctx
  
  let code = ''
  
  // 1. 保留导入语句
  code += ctx.imports.join('\n')
  
  // 2. 生成组件对象
  code += '\nconst __sfc__ = {\n'
  code += `  __name: '${ctx.filename}',\n`
  
  // 3. props 定义
  if (propsRuntimeDecl) {
    code += `  props: ${ctx.getString(propsRuntimeDecl)},\n`
  }
  
  // 4. emits 定义
  if (emitsRuntimeDecl) {
    code += `  emits: ${ctx.getString(emitsRuntimeDecl)},\n`
  }
  
  // 5. setup 函数
  code += '  setup(__props, { expose: __expose }) {\n'
  code += '    __expose()\n'
  
  // 6. setup 内容（去除已处理的宏）
  code += ctx.setupCode
  
  // 7. 返回绑定
  code += `    return { ${Object.keys(bindings).join(', ')} }\n`
  code += '  }\n'
  
  code += '}\n'
  code += 'export default __sfc__'
  
  return { content: code, bindings }
}
```

## 内联模式

当 `inlineTemplate: true` 时，render 函数内联到 setup 返回值：

```javascript
setup(__props) {
  const count = ref(0)
  
  // 直接返回 render 函数
  return (_ctx, _cache) => {
    return (openBlock(), createElementBlock("div", null,
      toDisplayString(count.value)))
  }
}
```

这种模式下：

1. render 函数可直接访问 setup 作用域变量
2. 不需要通过 `_ctx` 访问
3. 更好的性能（减少代理访问）

## 与普通 script 协同

可以同时使用两种 script：

```html
<script>
// 无法在 setup 中表达的内容
export const namedExport = 'value'

export default {
  inheritAttrs: false
}
</script>

<script setup>
const count = ref(0)
</script>
```

编译器会合并两者：

```javascript
const __default__ = {
  inheritAttrs: false
}

export const namedExport = 'value'

const __sfc__ = {
  ...__default__,
  __name: 'Component',
  setup(__props) {
    const count = ref(0)
    return { count }
  }
}

export default __sfc__
```

## 本章小结

本章分析了 `<script setup>` 的编译处理：

- **编译目标**：将顶层代码转换为 setup 函数
- **绑定分析**：识别变量类型（ref/reactive/const 等）
- **宏处理**：defineProps/defineEmits 编译时处理
- **代码生成**：生成组件对象
- **内联模式**：render 函数可直接访问 setup 变量
- **协同编译**：与普通 script 合并

下一章将分析 scoped CSS 的实现原理。

---

## 源码参考

本章涉及的 Vue 3 源码位置：

- **compileScript**：`packages/compiler-sfc/src/compileScript.ts`
- **ScriptCompileContext**：`packages/compiler-sfc/src/script/context.ts`
- **BindingTypes**：`packages/compiler-sfc/src/script/context.ts`
- **processDefineProps**：`packages/compiler-sfc/src/script/defineProps.ts`
- **processDefineEmits**：`packages/compiler-sfc/src/script/defineEmits.ts`
- **processWithDefaults**：`packages/compiler-sfc/src/script/defineProps.ts`

---

## 踩坑经验

**1. defineProps 泛型与运行时声明不能混用**

```javascript
// ❌ 错误：不能同时使用泛型和运行时声明
const props = defineProps<{ msg: string }>(['msg'])

// ✅ 正确：选择其中一种方式
// 方式1：纯类型声明
const props = defineProps<{ msg: string }>()

// 方式2：运行时声明
const props = defineProps({
  msg: { type: String, required: true }
})
```

**2. 顶层 await 需要 Suspense**

```javascript
// <script setup> 支持顶层 await
const data = await fetchData()

// 但是！使用了顶层 await 的组件必须被 <Suspense> 包裹
// 否则组件不会渲染
```

**3. 导入的组件与局部变量冲突**

```javascript
// ❌ 导入的组件名与变量名冲突
import Button from './Button.vue'
const Button = ref(null)  // 编译错误！

// ✅ 使用别名
import MyButton from './Button.vue'
const buttonRef = ref(null)
```

**4. 响应式解构丢失响应性**

```javascript
// ❌ 解构 props 会丢失响应性
const { msg } = defineProps<{ msg: string }>()

// ✅ 使用 toRefs 或直接访问
const props = defineProps<{ msg: string }>()
const { msg } = toRefs(props)
// 或者
props.msg
```

---

## 练习与思考

1. **代码分析**：以下代码编译后，`bindings` 对象中各变量的类型是什么？

   ```javascript
   const count = ref(0)
   const state = reactive({ x: 1 })
   const PI = 3.14
   let mutable = 'hello'
   ```

2. **思考题**：为什么 `defineProps` 是编译时宏而不是运行时函数？这种设计有什么优势？

3. **进阶探索**：查看 Vue 3.3 引入的 `defineModel` 宏的实现，理解它如何简化 v-model 的双向绑定。
