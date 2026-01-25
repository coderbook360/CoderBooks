# Tree Shaking 支持

Tree Shaking 是现代 JavaScript 打包工具的核心优化技术。它移除未使用的代码，减小最终打包体积。Vue 3 从架构层面考虑了 Tree Shaking 的支持，让编译器生成的代码能够充分利用这项优化。

## 什么是 Tree Shaking

Tree Shaking 的比喻来自"摇树"：摇动一棵树，枯枝（未使用的代码）就会掉落。打包工具分析代码的依赖关系，识别出从入口点可达的所有代码，移除不可达的部分。

它依赖 ES Modules 的静态特性。import 和 export 在编译时就能确定依赖关系，不需要执行代码。这让打包工具可以安全地判断哪些导出未被使用。

```javascript
// math.js
export function add(a, b) { return a + b }
export function multiply(a, b) { return a * b }

// main.js
import { add } from './math.js'
console.log(add(1, 2))

// 打包后：multiply 被移除
```

## Vue 2 的问题

Vue 2 将所有功能挂载在全局 Vue 对象上：

```javascript
import Vue from 'vue'

Vue.component('MyComponent', {...})
Vue.directive('focus', {...})
Vue.mixin({...})
```

这种设计让 Tree Shaking 无能为力。打包工具不知道你用了 Vue 的哪些功能——它们都在同一个对象上，只要你 import Vue，所有功能都被包含。

即使你从不使用 Transition 组件，它的代码也在打包结果中。对于追求极致体积的应用，这是不可接受的。

## Vue 3 的模块化设计

Vue 3 将各个功能作为独立的导出：

```javascript
import { 
  createApp, 
  ref, 
  reactive, 
  computed,
  Transition,
  KeepAlive 
} from 'vue'
```

现在打包工具可以分析你实际使用了哪些功能。如果没有 import Transition，它的代码就不会出现在最终打包中。

这种设计被称为 "Tree-Shakable" 或 "Dead Code Elimination Friendly"。

## 编译器的配合

Vue 编译器生成的代码同样是 Tree-Shakable 的。编译结果只 import 实际用到的运行时辅助函数：

```javascript
// 模板只有简单元素和文本
import { createVNode, toDisplayString } from 'vue'

// 使用了 Transition
import { createVNode, Transition } from 'vue'

// 使用了 v-model
import { createVNode, vModelText, withDirectives } from 'vue'
```

编译器追踪模板用到了哪些功能，只生成必要的 import。

## helpers 收集

编译过程中，每用到一个运行时辅助函数就加入 helpers 集合：

```typescript
interface TransformContext {
  helpers: Set<symbol>
  helper(name: symbol): symbol
}

// 转换时
function transformElement(node, context) {
  // 需要 createVNode
  context.helper(CREATE_VNODE)
  
  if (hasDynamicText) {
    // 需要 toDisplayString
    context.helper(TO_DISPLAY_STRING)
  }
}
```

代码生成时，根据 helpers 集合生成 import 语句：

```typescript
function generate(ast, options) {
  const helpers = ast.helpers
  
  // 生成 import
  const imports = helpers.map(h => 
    `${helperNameMap[h]} as _${helperNameMap[h]}`
  ).join(', ')
  
  code += `import { ${imports} } from 'vue'\n`
}
```

## 内置组件的处理

Vue 内置组件（Transition、KeepAlive、Teleport、Suspense）同样是按需引入：

```vue
<template>
  <Transition>
    <div v-if="show">Content</div>
  </Transition>
</template>
```

编译后：

```javascript
import { Transition, createVNode, openBlock, createBlock } from 'vue'

function render(_ctx) {
  return createVNode(Transition, null, {
    default: () => _ctx.show ? createVNode('div', null, 'Content') : null
  })
}
```

如果模板不使用 Transition，就不会 import 它。

## 内置指令的处理

v-show、v-model 等内置指令也是可 Tree-Shake 的：

```vue
<input v-model="text" />
```

编译后：

```javascript
import { vModelText, createVNode, withDirectives } from 'vue'

function render(_ctx) {
  return withDirectives(
    createVNode('input', { /* ... */ }),
    [[vModelText, _ctx.text]]
  )
}
```

不使用 v-model 的应用不会包含 vModelText 的代码。

## 与运行时的协调

这种设计需要编译器和运行时协调一致。运行时将各个功能作为独立导出，编译器知道每个功能对应的导出名称。

```typescript
// 运行时导出
export { 
  createVNode,
  createBlock,
  Transition,
  vModelText,
  // ...
}

// 编译器知道的映射
const helperNameMap = {
  [CREATE_VNODE]: 'createVNode',
  [CREATE_BLOCK]: 'createBlock',
  // ...
}
```

如果运行时改变了导出名称，编译器也需要相应更新。

## 副作用声明

Tree Shaking 需要知道哪些代码有副作用。有副作用的代码不能安全移除，即使看起来未被使用。

Vue 在 package.json 中声明：

```json
{
  "sideEffects": false
}
```

这告诉打包工具：Vue 的所有模块都没有顶层副作用，可以安全地 Tree Shake。

对于确实有副作用的代码，使用 `/*#__PURE__*/` 注释标记其创建是纯粹的：

```javascript
const _hoisted_1 = /*#__PURE__*/ createVNode('div', null, 'Static')
```

打包工具看到这个注释，知道如果 `_hoisted_1` 未被使用，整个表达式可以移除。

## 实际效果

Tree Shaking 让 Vue 3 应用的最小打包体积显著减小。

一个只用到响应式核心和基本渲染的应用，可能只有不到 10KB gzipped。完整功能的应用也因为只包含使用的部分而更小。

与 Vue 2 相比，这是质的飞跃。Vue 2 的最小体积就包含了所有功能，约 23KB gzipped。

## 开发者注意事项

为了充分利用 Tree Shaking，开发者需要注意几点：

使用 ES Modules 语法。CommonJS 的 require 不支持 Tree Shaking。

从 'vue' 具名导入。不要 `import Vue from 'vue'` 然后用 `Vue.h`。

使用现代打包工具。Vite、Rollup、Webpack 5+ 都有良好的 Tree Shaking 支持。

## 小结

Tree Shaking 支持是 Vue 3 架构设计的重要考量。通过将功能模块化、让编译器只引入必要的辅助函数、使用副作用注释，Vue 确保了应用打包体积的最小化。开发者无需额外配置就能享受这种优化——只要使用标准的 ES Modules 语法，打包工具会自动移除未使用的代码。这种"只付你用的"理念贯穿了 Vue 3 的设计。
