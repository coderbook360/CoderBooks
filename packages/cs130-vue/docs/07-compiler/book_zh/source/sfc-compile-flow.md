# SFC 编译流程

单文件组件（SFC）编译由 @vue/compiler-sfc 处理，将 .vue 文件转换为 JavaScript 模块。

## 编译入口

```typescript
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc'

// 1. 解析 SFC
const { descriptor } = parse(source, { filename })

// 2. 编译 script
const script = compileScript(descriptor, { id })

// 3. 编译 template
const template = compileTemplate({
  source: descriptor.template!.content,
  filename,
  id,
  compilerOptions: { bindingMetadata: script.bindings }
})

// 4. 编译 style
const styles = descriptor.styles.map(style =>
  compileStyle({
    source: style.content,
    filename,
    id,
    scoped: style.scoped
  })
)
```

## parse 函数

```typescript
export function parse(
  source: string,
  options: SFCParseOptions = {}
): SFCParseResult {
  const descriptor: SFCDescriptor = {
    filename: options.filename || 'anonymous.vue',
    source,
    template: null,
    script: null,
    scriptSetup: null,
    styles: [],
    customBlocks: [],
    cssVars: [],
    slotted: false
  }

  const errors: CompilerError[] = []
  const ast = baseParse(source, {
    parseMode: 'sfc',
    onError: e => errors.push(e)
  })

  ast.children.forEach(node => {
    if (node.type !== NodeTypes.ELEMENT) return

    switch (node.tag) {
      case 'template':
        descriptor.template = createBlock(node, source)
        break
      case 'script':
        const block = createBlock(node, source)
        if (hasSetupAttr(node)) {
          descriptor.scriptSetup = block
        } else {
          descriptor.script = block
        }
        break
      case 'style':
        descriptor.styles.push(createBlock(node, source))
        break
      default:
        descriptor.customBlocks.push(createBlock(node, source))
    }
  })

  return { descriptor, errors }
}
```

## SFCDescriptor

```typescript
interface SFCDescriptor {
  filename: string
  source: string
  template: SFCTemplateBlock | null
  script: SFCScriptBlock | null
  scriptSetup: SFCScriptBlock | null
  styles: SFCStyleBlock[]
  customBlocks: SFCBlock[]
  cssVars: string[]
  slotted: boolean
}

interface SFCBlock {
  type: string
  content: string
  attrs: Record<string, string | true>
  loc: SourceLocation
  lang?: string
  src?: string
}
```

## 构建工具集成

```typescript
// Vite 插件示例
function vuePlugin(): Plugin {
  return {
    name: 'vite:vue',

    async transform(code, id) {
      if (!id.endsWith('.vue')) return

      const { descriptor } = parse(code, { filename: id })

      // 生成模块代码
      let output = ''

      // script
      if (descriptor.script || descriptor.scriptSetup) {
        const script = compileScript(descriptor, { id })
        output += script.content
      }

      // template
      if (descriptor.template) {
        const template = compileTemplate({ ... })
        output += template.code
      }

      // styles
      for (const style of descriptor.styles) {
        // 注入 style
      }

      return output
    }
  }
}
```

## 模块输出结构

```typescript
// App.vue 编译后
import { defineComponent } from 'vue'

// script 部分
const _sfc_main = defineComponent({
  name: 'App',
  setup() { ... }
})

// template 部分
import { createElementVNode as _createElementVNode } from 'vue'
function render(_ctx, _cache) {
  return _createElementVNode("div", null, "Hello")
}

// 组合
_sfc_main.render = render
_sfc_main.__scopeId = "data-v-7ba5bd90"
_sfc_main.__file = "src/App.vue"
export default _sfc_main
```

## HMR 支持

```typescript
// 开发模式注入 HMR
if (import.meta.hot) {
  _sfc_main.__hmrId = "7ba5bd90"
  __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main)
  import.meta.hot.accept(mod => {
    if (!mod) return
    const { default: updated } = mod
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated)
  })
}
```

## SourceMap

```typescript
const template = compileTemplate({
  source: descriptor.template.content,
  filename,
  id,
  sourceMap: true  // 启用 sourcemap
})

// template.map 包含映射信息
```

## 小结

SFC 编译流程的关键点：

1. **parse**：解析 .vue 文件结构
2. **compileScript**：处理 script/script setup
3. **compileTemplate**：编译模板
4. **compileStyle**：处理样式和 scoped

下一章将分析 script setup 的编译细节。
