# 运行时辅助函数的调用生成

render 函数中调用的 `_createElementVNode`、`_toDisplayString` 等函数从哪里来？**编译器如何知道需要导入哪些辅助函数？**

**这是编译器与运行时协作的关键点。** 本章将分析运行时辅助函数的收集与生成机制。

## 辅助函数的分类

Vue 3 的运行时辅助函数分为几类：

### VNode 创建类

```javascript
const vnodeHelpers = {
  FRAGMENT: Symbol('Fragment'),
  TELEPORT: Symbol('Teleport'),
  OPEN_BLOCK: Symbol('openBlock'),
  CREATE_BLOCK: Symbol('createBlock'),
  CREATE_ELEMENT_BLOCK: Symbol('createElementBlock'),
  CREATE_VNODE: Symbol('createVNode'),
  CREATE_ELEMENT_VNODE: Symbol('createElementVNode'),
  CREATE_COMMENT: Symbol('createCommentVNode'),
  CREATE_TEXT: Symbol('createTextVNode'),
  CREATE_STATIC: Symbol('createStaticVNode')
}
```

### 解析类

```javascript
const resolveHelpers = {
  RESOLVE_COMPONENT: Symbol('resolveComponent'),
  RESOLVE_DYNAMIC_COMPONENT: Symbol('resolveDynamicComponent'),
  RESOLVE_DIRECTIVE: Symbol('resolveDirective')
}
```

### 渲染辅助类

```javascript
const renderHelpers = {
  RENDER_LIST: Symbol('renderList'),
  RENDER_SLOT: Symbol('renderSlot'),
  CREATE_SLOTS: Symbol('createSlots'),
  WITH_CTX: Symbol('withCtx')
}
```

### 数据处理类

```javascript
const dataHelpers = {
  TO_DISPLAY_STRING: Symbol('toDisplayString'),
  MERGE_PROPS: Symbol('mergeProps'),
  NORMALIZE_CLASS: Symbol('normalizeClass'),
  NORMALIZE_STYLE: Symbol('normalizeStyle'),
  NORMALIZE_PROPS: Symbol('normalizeProps')
}
```

## 符号到名称的映射

```javascript
const helperNameMap = {
  [FRAGMENT]: 'Fragment',
  [OPEN_BLOCK]: 'openBlock',
  [CREATE_BLOCK]: 'createBlock',
  [CREATE_ELEMENT_BLOCK]: 'createElementBlock',
  [CREATE_VNODE]: 'createVNode',
  [CREATE_ELEMENT_VNODE]: 'createElementVNode',
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [RENDER_LIST]: 'renderList',
  // ...
}
```

## 辅助函数收集

在 Transform 阶段，遇到需要辅助函数的场景时调用 `context.helper()`：

```javascript
// Transform 上下文
interface TransformContext {
  helpers: Map<symbol, number>  // helper -> 使用次数
  
  helper(name) {
    const count = this.helpers.get(name) || 0
    this.helpers.set(name, count + 1)
    return name
  }
}
```

收集时机：

```javascript
// 插值表达式需要 toDisplayString
function transformInterpolation(node, context) {
  context.helper(TO_DISPLAY_STRING)
}

// v-for 需要 renderList
function transformFor(node, context) {
  context.helper(RENDER_LIST)
  context.helper(FRAGMENT)
}

// Block 需要 openBlock 和 createBlock
function transformElement(node, context) {
  if (node.isBlock) {
    context.helper(OPEN_BLOCK)
    context.helper(CREATE_ELEMENT_BLOCK)
  }
}
```

## 导入语句生成

Transform 结束后，`ast.helpers` 包含所有需要的辅助函数。Codegen 阶段生成导入：

```javascript
function genModulePreamble(ast, context) {
  const { push, newline } = context
  const helpers = [...ast.helpers]
  
  if (helpers.length > 0) {
    push(genHelperImport(helpers, context.runtimeModuleName))
    newline()
  }
}

function genHelperImport(helpers, moduleName) {
  const imports = helpers
    .map(h => {
      const name = helperNameMap[h]
      return `${name} as _${name}`
    })
    .join(', ')
  
  return `import { ${imports} } from ${JSON.stringify(moduleName)}`
}
```

输出：

```javascript
import { 
  createElementVNode as _createElementVNode,
  toDisplayString as _toDisplayString,
  openBlock as _openBlock,
  createElementBlock as _createElementBlock
} from "vue"
```

## helper 方法使用

在代码生成时，通过 `context.helper()` 获取辅助函数名称：

```javascript
function genVNodeCall(node, context) {
  const { helper } = context
  
  push(helper(OPEN_BLOCK) + '(), ')  // _openBlock()
  push(helper(CREATE_ELEMENT_BLOCK) + '(')  // _createElementBlock(
  // ...
}

function genInterpolation(node, context) {
  const { helper } = context
  
  push(helper(TO_DISPLAY_STRING) + '(')  // _toDisplayString(
  genNode(node.content, context)
  push(')')
}
```

`_` 前缀是为了避免与用户代码中的变量名冲突。

## function 模式

非模块模式下，辅助函数从全局变量获取：

```javascript
function genFunctionPreamble(ast, context) {
  const { push, runtimeGlobalName } = context
  const helpers = [...ast.helpers]
  
  if (helpers.length > 0) {
    push(`const { ${helpers.map(h => 
      `${helperNameMap[h]}: _${helperNameMap[h]}`
    ).join(', ')} } = ${runtimeGlobalName}`)
  }
}
```

输出：

```javascript
const { 
  createElementVNode: _createElementVNode,
  toDisplayString: _toDisplayString
} = Vue

return function render(_ctx, _cache) {
  // ...
}
```

## 按需导入的优势

只导入实际使用的辅助函数，有利于 Tree-shaking：

```javascript
// 简单模板只导入少量辅助函数
import { createElementVNode, toDisplayString } from "vue"

// 复杂模板导入更多
import { 
  createElementVNode,
  toDisplayString,
  renderList,
  openBlock,
  createElementBlock,
  Fragment
} from "vue"
```

打包工具可以根据导入关系，移除未使用的代码。

## PURE 注释

对于可以被 Tree-shake 的函数调用，生成 `/*#__PURE__*/` 注释：

```javascript
function genCallExpression(node, context) {
  if (node.pure) {
    context.push('/*#__PURE__*/')
  }
  // ...
}
```

输出：

```javascript
const _hoisted_1 = /*#__PURE__*/_createElementVNode("div", null, "static")
```

打包工具看到这个注释，知道这个调用没有副作用，如果结果未被使用可以安全移除。

## 本章小结

本章分析了运行时辅助函数的机制：

- **分类**：VNode 创建、解析、渲染辅助、数据处理
- **符号映射**：Symbol → 函数名
- **收集**：Transform 阶段通过 context.helper() 收集
- **生成**：Codegen 阶段生成 import 或解构语句
- **Tree-shaking**：按需导入 + PURE 注释

下一章将分析 JavaScript AST 节点的代码生成。
