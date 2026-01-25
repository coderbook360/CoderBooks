# 自定义渲染器设计

Vue 3 的渲染器与平台解耦，可以创建自定义渲染器，将 Vue 组件渲染到 DOM 以外的目标——Canvas、WebGL、终端、原生移动应用等。

## 为什么需要自定义渲染器

Vue 的核心价值在于响应式系统和组件模型，而不是 DOM 操作。将渲染逻辑抽象出来，让这些能力可以用于任何渲染目标：

1. **跨平台**：同一套组件代码，不同平台渲染
2. **特殊场景**：游戏 UI、数据可视化、原生应用
3. **测试**：无需真实 DOM 即可测试组件逻辑

## createRenderer API

Vue 3 暴露 `createRenderer` 函数：

```javascript
import { createRenderer } from '@vue/runtime-core'

const renderer = createRenderer({
  // 平台特定的 DOM 操作
  createElement(type) { /* ... */ },
  insert(el, parent, anchor) { /* ... */ },
  remove(el) { /* ... */ },
  // ...更多方法
})
```

返回的 `renderer` 包含 `createApp` 和 `render` 方法。

## 渲染器选项

需要实现的接口：

```typescript
interface RendererOptions<HostNode, HostElement> {
  // 创建元素
  createElement(type: string): HostElement
  
  // 创建文本节点
  createText(text: string): HostNode
  
  // 创建注释节点
  createComment(text: string): HostNode
  
  // 设置文本内容
  setText(node: HostNode, text: string): void
  
  // 设置元素文本内容
  setElementText(el: HostElement, text: string): void
  
  // 插入节点
  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
  
  // 移除节点
  remove(el: HostNode): void
  
  // 获取父节点
  parentNode(node: HostNode): HostElement | null
  
  // 获取下一个兄弟节点
  nextSibling(node: HostNode): HostNode | null
  
  // 查询选择器
  querySelector(selector: string): HostElement | null
  
  // 设置属性
  patchProp(
    el: HostElement,
    key: string,
    prevValue: any,
    nextValue: any
  ): void
  
  // 克隆节点（可选，用于优化）
  cloneNode?(node: HostNode): HostNode
  
  // 插入静态内容（可选，用于优化）
  insertStaticContent?(
    content: string,
    parent: HostElement,
    anchor: HostNode | null
  ): [HostNode, HostNode]
}
```

## 浏览器 DOM 渲染器

Vue 的 `@vue/runtime-dom` 就是基于 `createRenderer` 实现的：

```javascript
// 简化版
const nodeOps = {
  createElement(tag) {
    return document.createElement(tag)
  },
  
  createText(text) {
    return document.createTextNode(text)
  },
  
  createComment(text) {
    return document.createComment(text)
  },
  
  setText(node, text) {
    node.nodeValue = text
  },
  
  setElementText(el, text) {
    el.textContent = text
  },
  
  insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor)
  },
  
  remove(child) {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  
  parentNode(node) {
    return node.parentNode
  },
  
  nextSibling(node) {
    return node.nextSibling
  },
  
  querySelector(selector) {
    return document.querySelector(selector)
  }
}

const patchProp = (el, key, prevValue, nextValue) => {
  if (key.startsWith('on')) {
    // 事件处理
    const eventName = key.slice(2).toLowerCase()
    if (prevValue) {
      el.removeEventListener(eventName, prevValue)
    }
    if (nextValue) {
      el.addEventListener(eventName, nextValue)
    }
  } else if (key === 'class') {
    el.className = nextValue || ''
  } else if (key === 'style') {
    // 处理 style...
  } else {
    el.setAttribute(key, nextValue)
  }
}

const renderer = createRenderer({
  ...nodeOps,
  patchProp
})

export const createApp = renderer.createApp
```

## Canvas 渲染器示例

假设我们要将 Vue 组件渲染到 Canvas：

```javascript
class CanvasElement {
  constructor(type) {
    this.type = type
    this.props = {}
    this.children = []
    this.parent = null
  }
}

const canvasRenderer = createRenderer({
  createElement(type) {
    return new CanvasElement(type)
  },
  
  createText(text) {
    const el = new CanvasElement('text')
    el.text = text
    return el
  },
  
  createComment() {
    return new CanvasElement('comment')
  },
  
  setText(node, text) {
    node.text = text
    scheduleRedraw()
  },
  
  setElementText(el, text) {
    el.text = text
    scheduleRedraw()
  },
  
  insert(child, parent, anchor) {
    child.parent = parent
    const index = anchor 
      ? parent.children.indexOf(anchor)
      : parent.children.length
    parent.children.splice(index, 0, child)
    scheduleRedraw()
  },
  
  remove(child) {
    const parent = child.parent
    if (parent) {
      const index = parent.children.indexOf(child)
      parent.children.splice(index, 1)
      scheduleRedraw()
    }
  },
  
  parentNode(node) {
    return node.parent
  },
  
  nextSibling(node) {
    if (!node.parent) return null
    const siblings = node.parent.children
    const index = siblings.indexOf(node)
    return siblings[index + 1] || null
  },
  
  patchProp(el, key, prevValue, nextValue) {
    el.props[key] = nextValue
    scheduleRedraw()
  }
})

// 根据元素树绘制 Canvas
function draw(ctx, element, x = 0, y = 0) {
  if (element.type === 'rect') {
    ctx.fillStyle = element.props.fill || 'black'
    ctx.fillRect(
      x + (element.props.x || 0),
      y + (element.props.y || 0),
      element.props.width || 100,
      element.props.height || 100
    )
  } else if (element.type === 'text') {
    ctx.fillText(element.text, x, y)
  }
  
  // 递归绘制子元素
  element.children.forEach(child => {
    draw(ctx, child, x, y)
  })
}
```

## Pixi.js 渲染器

Pixi.js 是一个 2D WebGL 渲染引擎。创建 Pixi 渲染器：

```javascript
import * as PIXI from 'pixi.js'
import { createRenderer } from '@vue/runtime-core'

const pixiRenderer = createRenderer({
  createElement(type) {
    switch (type) {
      case 'container':
        return new PIXI.Container()
      case 'sprite':
        return new PIXI.Sprite()
      case 'text':
        return new PIXI.Text()
      case 'graphics':
        return new PIXI.Graphics()
      default:
        return new PIXI.Container()
    }
  },
  
  insert(child, parent) {
    parent.addChild(child)
  },
  
  remove(child) {
    if (child.parent) {
      child.parent.removeChild(child)
    }
  },
  
  patchProp(el, key, prevValue, nextValue) {
    if (key === 'x') el.x = nextValue
    else if (key === 'y') el.y = nextValue
    else if (key === 'texture' && el instanceof PIXI.Sprite) {
      el.texture = PIXI.Texture.from(nextValue)
    }
    // ...更多属性映射
  },
  
  parentNode(node) {
    return node.parent
  },
  
  nextSibling(node) {
    if (!node.parent) return null
    const index = node.parent.getChildIndex(node)
    return node.parent.getChildAt(index + 1) || null
  }
})
```

使用：

```html
<template>
  <container>
    <sprite :texture="heroTexture" :x="hero.x" :y="hero.y" />
    <text :x="10" :y="10">Score: {{ score }}</text>
  </container>
</template>

<script setup>
import { ref } from 'vue'

const heroTexture = 'hero.png'
const hero = ref({ x: 100, y: 200 })
const score = ref(0)
</script>
```

## 终端渲染器

将 Vue 渲染到终端：

```javascript
import blessed from 'blessed'
import { createRenderer } from '@vue/runtime-core'

const terminalRenderer = createRenderer({
  createElement(type) {
    switch (type) {
      case 'box':
        return blessed.box({})
      case 'list':
        return blessed.list({})
      case 'input':
        return blessed.textbox({})
      default:
        return blessed.box({})
    }
  },
  
  insert(child, parent) {
    parent.append(child)
    screen.render()
  },
  
  patchProp(el, key, prev, next) {
    el[key] = next
    screen.render()
  },
  
  // ...其他方法
})
```

## 测试渲染器

用于单元测试，不依赖真实 DOM：

```javascript
import { createRenderer } from '@vue/runtime-core'

class TestElement {
  constructor(type) {
    this.type = type
    this.props = {}
    this.children = []
    this.eventListeners = {}
  }
  
  trigger(event, ...args) {
    const handlers = this.eventListeners[event]
    if (handlers) {
      handlers.forEach(fn => fn(...args))
    }
  }
}

const testRenderer = createRenderer({
  createElement(type) {
    return new TestElement(type)
  },
  
  patchProp(el, key, prev, next) {
    if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase()
      if (!el.eventListeners[event]) {
        el.eventListeners[event] = []
      }
      el.eventListeners[event].push(next)
    } else {
      el.props[key] = next
    }
  },
  
  // ...其他方法
})

// 使用
const root = new TestElement('root')
const app = testRenderer.createApp(MyComponent)
app.mount(root)

// 断言
expect(root.children[0].type).toBe('button')
root.children[0].trigger('click')
```

## 设计考量

**最小接口原则**：只暴露必需的方法，让自定义渲染器实现尽可能简单。

**一致的抽象**：所有平台操作都抽象为相同的接口，渲染器核心逻辑平台无关。

**性能优化钩子**：`cloneNode`、`insertStaticContent` 等可选方法允许平台特定优化。

**类型安全**：`HostNode` 和 `HostElement` 泛型让 TypeScript 能正确推断平台类型。

## 局限性

1. **事件系统**：需要自己处理事件，Vue 不提供抽象
2. **Transition**：动画需要平台特定实现
3. **指令**：自定义指令可能需要适配
4. **Teleport**：需要自己实现跨容器移动

## 小结

自定义渲染器让 Vue 的响应式和组件系统可以用于任何渲染目标。通过实现一组平台操作接口，就能获得完整的 Vue 能力。这是 Vue 3 架构解耦带来的强大扩展性。
