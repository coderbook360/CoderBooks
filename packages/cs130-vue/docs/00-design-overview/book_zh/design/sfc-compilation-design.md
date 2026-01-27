# SFC 单文件组件编译

单文件组件（Single-File Component，SFC）是 Vue 的标志性特性。`.vue` 文件将模板、脚本、样式组织在一起，提供了出色的开发体验。SFC 的编译是一个复杂的过程，涉及多个编译器的协作和多种优化策略。

## SFC 的结构

一个典型的 SFC 包含三个部分：

```vue
<template>
  <div class="greeting">
    <h1>{{ message }}</h1>
    <button @click="greet">Say Hello</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const message = ref('Hello, Vue!')

function greet() {
  alert(message.value)
}
</script>

<style scoped>
.greeting {
  padding: 20px;
  background: #f0f0f0;
}
</style>
```

每个部分都需要专门的编译处理，最终合成可执行的组件。

## 编译流程概览

SFC 编译分为几个阶段：

```
.vue 文件
    ↓
1. 解析（@vue/compiler-sfc）
    ↓
├── template → 模板 AST
├── script → JavaScript AST
└── style → CSS AST
    ↓
2. 转换
    ↓
├── template → 渲染函数代码
├── script → 处理后的 JS 代码
└── style → 处理后的 CSS 代码
    ↓
3. 合成
    ↓
最终的 JavaScript 模块
```

## 模板块编译

模板编译是 SFC 编译的核心。`@vue/compiler-sfc` 调用 `@vue/compiler-dom` 进行模板编译：

```javascript
import { compileTemplate } from '@vue/compiler-sfc'

const { code, map } = compileTemplate({
  source: templateContent,
  filename: 'MyComponent.vue',
  id: scopeId,
  scoped: hasScoped,
  // 编译选项
  compilerOptions: {
    hoistStatic: true,
    cacheHandlers: true
  }
})
```

编译结果：

```javascript
import { createVNode as _createVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createBlock as _createBlock } from "vue"

export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", { class: "greeting" }, [
    _createVNode("h1", null, _toDisplayString(_ctx.message), 1 /* TEXT */),
    _createVNode("button", {
      onClick: _cache[0] || (_cache[0] = (...args) => _ctx.greet(...args))
    }, "Say Hello")
  ]))
}
```

## Script Setup 编译

`<script setup>` 是 Vue3 的语法糖，需要特殊的编译处理：

```vue
<script setup>
import { ref, computed } from 'vue'
import MyComponent from './MyComponent.vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>
```

编译后：

```javascript
import { ref, computed, defineComponent } from 'vue'
import MyComponent from './MyComponent.vue'

export default defineComponent({
  components: { MyComponent },
  setup(__props, { expose }) {
    const count = ref(0)
    const doubled = computed(() => count.value * 2)

    function increment() {
      count.value++
    }

    // 自动暴露给模板
    return { count, doubled, increment, MyComponent }
  }
})
```

编译器做了几件事：

1. **自动导入收集**：识别导入的组件，注册到 `components` 选项
2. **变量暴露**：分析顶层绑定，生成返回对象
3. **宏展开**：处理 `defineProps`、`defineEmits` 等编译时宏

## 编译时宏处理

`<script setup>` 支持编译时宏，这些宏在运行时不存在：

```vue
<script setup>
const props = defineProps<{
  title: string
  count?: number
}>()

const emit = defineEmits<{
  (e: 'update', value: number): void
  (e: 'close'): void
}>()

defineExpose({
  reset() { /* ... */ }
})
</script>
```

编译器将这些宏转换为运行时代码：

```javascript
export default defineComponent({
  props: {
    title: { type: String, required: true },
    count: { type: Number, required: false }
  },
  emits: ['update', 'close'],
  setup(__props, { expose, emit }) {
    const props = __props
    
    expose({
      reset() { /* ... */ }
    })
    
    return { /* ... */ }
  }
})
```

## 样式块编译

样式编译处理多种情况：

**Scoped 样式**：

```vue
<style scoped>
.greeting { color: red; }
</style>
```

编译后添加属性选择器实现作用域隔离：

```css
.greeting[data-v-7ba5bd90] { color: red; }
```

同时模板编译会为元素添加对应的 data 属性：

```javascript
createVNode('div', { 
  class: 'greeting',
  'data-v-7ba5bd90': '' 
})
```

**CSS Modules**：

```vue
<style module>
.greeting { color: red; }
</style>
```

生成类名映射对象，可在模板中使用：

```javascript
const $style = {
  greeting: '_greeting_7ba5bd90'
}

// 模板中
<div :class="$style.greeting">
```

**v-bind 动态样式**：

```vue
<script setup>
const color = ref('red')
</script>

<style>
.text {
  color: v-bind(color);
}
</style>
```

编译为 CSS 变量：

```css
.text {
  color: var(--7ba5bd90-color);
}
```

并在运行时动态更新：

```javascript
// 生成的代码
useCssVars((_ctx) => ({
  '7ba5bd90-color': _ctx.color
}))
```

## 热更新支持

SFC 编译支持热模块替换（HMR）：

```javascript
// 编译器生成 HMR 代码
if (__DEV__) {
  __VUE_HMR_RUNTIME__.createRecord(id, component)
  
  module.hot.accept(() => {
    // 接受模板更新
    __VUE_HMR_RUNTIME__.rerender(id, render)
    
    // 接受样式更新
    __VUE_HMR_RUNTIME__.updateStyle(id, styles)
  })
}
```

这使得开发时可以实时预览变更，而无需刷新页面。

## 类型支持

`<script setup>` 与 TypeScript 深度集成：

```vue
<script setup lang="ts">
interface Props {
  title: string
  items: string[]
}

const props = defineProps<Props>()

// 类型自动推断
props.title  // string
props.items  // string[]
</script>
```

编译器能够从 TypeScript 类型定义生成运行时 props 验证代码。

## 多块支持

SFC 支持多个相同类型的块：

```vue
<script>
// 普通 script，在 setup 之前执行
export const metadata = { version: '1.0' }
</script>

<script setup>
// setup script
import { ref } from 'vue'
</script>

<style>
/* 全局样式 */
</style>

<style scoped>
/* 作用域样式 */
</style>
```

编译器正确处理每个块，合成最终组件。

## 自定义块

SFC 支持自定义块，由构建工具插件处理：

```vue
<docs>
# My Component

This is the documentation for my component.
</docs>

<i18n>
{
  "en": { "hello": "Hello" },
  "zh": { "hello": "你好" }
}
</i18n>
```

编译器提供 API 让插件访问自定义块：

```javascript
const { customBlocks } = parse(source)

for (const block of customBlocks) {
  if (block.type === 'docs') {
    // 处理文档块
  }
}
```

## 源码映射

SFC 编译生成源码映射（Source Map），支持调试：

```javascript
const { code, map } = compileTemplate({
  source: template,
  filename: 'MyComponent.vue',
  sourceMap: true
})

// map 包含从编译后代码到原始模板的映射
// 使调试器能够在 .vue 文件中设置断点
```

源码映射需要处理跨块的行号偏移，确保 template、script、style 各块的位置正确映射。

## 构建工具集成

SFC 编译通过构建工具插件集成：

**Vite 插件**：

```javascript
// vite.config.js
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [vue()]
}
```

**Webpack Loader**：

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  }
}
```

这些工具内部调用 `@vue/compiler-sfc` 进行编译。

## 性能考量

SFC 编译的性能优化包括：

**按需编译**：开发时只编译变化的块。

```javascript
// 只有 template 变化时
if (templateChanged) {
  recompileTemplate()
} else {
  reuseCompiledTemplate()
}
```

**缓存**：缓存编译结果，避免重复编译。

**并行处理**：多个 SFC 可以并行编译。

## 设计理念

SFC 编译器的设计体现了几个理念：

**关注点分离**：template、script、style 各有专门的编译流程，但最终无缝整合。

**渐进增强**：从简单的 Options API 到 `<script setup>`，编译器都能处理。

**开发体验优先**：HMR、类型支持、源码映射都是为了提升开发体验。

**生产优化**：最终输出高度优化的代码，包含所有运行时优化。

SFC 编译是 Vue 工程化能力的核心体现，它让开发者可以使用优雅的单文件组件格式，同时获得最佳的开发体验和生产性能。
