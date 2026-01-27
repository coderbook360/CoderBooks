# 渲染器与编译器的协作

Vue3 的高性能很大程度上来自于编译器与渲染器的深度协作。这种协作不是简单的模块拼接，而是一种精心设计的跨阶段优化策略。编译器提前完成静态分析，将优化信息编码到渲染函数中；渲染器利用这些信息进行靶向更新。两者的协作使 Vue3 在保持虚拟 DOM 灵活性的同时，获得了接近手写命令式代码的性能。

## 协作的本质

传统的虚拟 DOM 框架中，编译器只负责将模板转换为渲染函数，渲染器独立进行 Diff 和更新。这种分工清晰但存在信息损失——编译器知道的静态信息无法传递给渲染器。

Vue3 重新思考了这种关系。编译器不仅生成渲染函数，还生成优化提示；渲染器识别这些提示，采用不同的更新策略。这种协作通过几个关键机制实现：

```javascript
// 编译器生成的渲染函数包含优化信息
function render(_ctx) {
  return (openBlock(), createBlock('div', null, [
    // 静态节点被提升
    _hoisted_1,
    // 动态节点带有 patchFlag
    createVNode('span', null, _ctx.msg, 1 /* TEXT */),
    // Block 收集动态子节点
  ]))
}
```

## 信息传递的载体

编译器与渲染器之间的信息传递主要通过以下载体：

**PatchFlags**：标记节点的动态部分类型

```javascript
// 编译器：分析后生成标记
createVNode('div', { class: _ctx.cls }, null, 2 /* CLASS */)

// 渲染器：根据标记进行靶向更新
if (patchFlag & PatchFlags.CLASS) {
  if (oldProps.class !== newProps.class) {
    hostPatchProp(el, 'class', newProps.class)
  }
}
```

**dynamicChildren**：Block 内动态节点的扁平列表

```javascript
// 编译器：使用 openBlock/createBlock 收集动态节点
function render(_ctx) {
  return (openBlock(), createBlock('div', null, [
    createVNode('p', null, 'Static'),
    createVNode('p', null, _ctx.msg, 1)
  ]))
}

// 渲染器：只遍历 dynamicChildren
function patchBlock(n1, n2) {
  for (let i = 0; i < n2.dynamicChildren.length; i++) {
    patch(n1.dynamicChildren[i], n2.dynamicChildren[i])
  }
}
```

**dynamicProps**：具体的动态属性列表

```javascript
// 编译器：记录哪些 props 是动态的
createVNode('div', props, null, 8 /* PROPS */, ['id', 'title'])

// 渲染器：只检查标记的属性
for (const key of dynamicProps) {
  if (oldProps[key] !== newProps[key]) {
    hostPatchProp(el, key, newProps[key])
  }
}
```

## 静态提升的协作

静态提升是编译器与渲染器协作的典型案例。编译器识别出静态节点，将它们提升到渲染函数外部；渲染器识别提升的节点，跳过对它们的处理。

```javascript
// 编译器：提升静态节点
const _hoisted_1 = createVNode('div', { class: 'static' }, 'Hello')
const _hoisted_2 = createStaticVNode('<span>...</span>', 1)

function render(_ctx) {
  return (openBlock(), createBlock('div', null, [
    _hoisted_1,  // 复用静态 VNode
    _hoisted_2,  // 静态 HTML 字符串
    createVNode('span', null, _ctx.msg, 1)
  ]))
}
```

静态 VNode 的 `patchFlag` 为 -1（HOISTED），渲染器遇到这种节点会直接跳过：

```javascript
function patch(n1, n2) {
  if (n2.patchFlag === PatchFlags.HOISTED) {
    // 静态节点，无需处理
    return
  }
  // ...
}
```

## 事件处理的缓存

编译器还会优化事件处理器的创建。在渲染函数中，每次重新创建事件处理器会导致不必要的子组件更新。

```javascript
// 未优化：每次渲染创建新函数
render() {
  return h('button', {
    onClick: () => this.handleClick()
  })
}

// 编译器优化：缓存事件处理器
render(_ctx, _cache) {
  return h('button', {
    onClick: _cache[0] || (_cache[0] = ($event) => _ctx.handleClick($event))
  })
}
```

渲染器配合这种优化，在比较 props 时能够正确识别缓存的处理器：

```javascript
function patchProps(el, oldProps, newProps) {
  for (const key in newProps) {
    const prev = oldProps[key]
    const next = newProps[key]
    
    // 缓存的函数引用相同，跳过更新
    if (prev !== next) {
      hostPatchProp(el, key, next, prev)
    }
  }
}
```

## Block 边界的处理

编译器负责在正确的位置创建 Block 边界，渲染器根据边界调整 Diff 策略。

```javascript
// 编译器：v-if 创建新的 Block
function render(_ctx) {
  return (openBlock(), createBlock('div', null, [
    _ctx.show
      ? (openBlock(), createBlock('span', { key: 0 }, 'Yes'))
      : (openBlock(), createBlock('span', { key: 1 }, 'No'))
  ]))
}
```

渲染器处理 Block 时，知道 dynamicChildren 的收集范围止于 Block 边界：

```javascript
function patchBlock(n1, n2) {
  // 只处理当前 Block 的 dynamicChildren
  // 嵌套的 Block 有自己的 dynamicChildren
  const dynamicChildren = n2.dynamicChildren
  for (let i = 0; i < dynamicChildren.length; i++) {
    patch(n1.dynamicChildren[i], dynamicChildren[i])
  }
}
```

## 插槽的协作优化

插槽是编译器与渲染器协作的复杂场景。编译器需要识别插槽内容是否是动态的，渲染器需要正确处理插槽的更新。

```javascript
// 父组件模板
<Child>
  <template #default>{{ msg }}</template>
</Child>

// 编译后：插槽被标记为动态
createVNode(Child, null, {
  default: withCtx(() => [
    createVNode('span', null, _ctx.msg, 1)
  ]),
  _: 1 /* STABLE */
})
```

`_: 1` 是一个特殊的插槽标记，表示插槽结构稳定。渲染器根据这个标记决定是否需要强制更新子组件：

```javascript
function updateComponent(n1, n2) {
  const instance = n2.component = n1.component
  
  // 检查是否需要更新
  if (shouldUpdateComponent(n1, n2)) {
    instance.next = n2
    invalidateJob(instance.update)
    instance.update()
  } else {
    n2.el = n1.el
    instance.vnode = n2
  }
}

function shouldUpdateComponent(n1, n2) {
  const { props: oldProps, children: oldChildren } = n1
  const { props: newProps, children: newChildren } = n2
  
  // 动态插槽需要更新
  if (oldChildren || newChildren) {
    if (newChildren && newChildren._ !== SlotFlags.STABLE) {
      return true
    }
  }
  
  // 检查 props 变化
  return hasPropsChanged(oldProps, newProps)
}
```

## SSR 水合的协作

在服务端渲染场景，编译器与渲染器的协作更加复杂。编译器生成 SSR 专用的渲染函数，同时生成客户端水合需要的代码。

```javascript
// SSR 渲染函数
function ssrRender(_ctx, _push) {
  _push(`<div class="container">`)
  _push(`<span>Static</span>`)
  _push(`<span>${escapeHtml(_ctx.msg)}</span>`)
  _push(`</div>`)
}

// 客户端水合函数
function render(_ctx) {
  return (openBlock(), createBlock('div', { class: 'container' }, [
    createVNode('span', null, 'Static'),
    createVNode('span', null, _ctx.msg, 1)
  ]))
}
```

水合时，渲染器需要将已存在的 DOM 与 VNode 关联：

```javascript
function hydrateElement(el, vnode) {
  vnode.el = el
  
  // 静态节点跳过深度水合
  if (vnode.patchFlag === PatchFlags.HOISTED) {
    return
  }
  
  // 水合子节点
  if (vnode.children) {
    hydrateChildren(el.childNodes, vnode.children)
  }
}
```

## 协作模式的设计原则

Vue3 的编译器-渲染器协作遵循几个关键原则：

**编译器做尽可能多的工作**：静态分析、优化提示生成、代码转换都在编译时完成。

**渲染器保持兼容性**：即使没有编译器优化（如手写渲染函数），渲染器也能正确工作。

**优化是渐进的**：从完整 Diff 到靶向更新是优化路径，不是必须路径。

**信息传递是显式的**：通过 PatchFlags 等明确的标记传递信息，而不是隐式约定。

这种协作模式让 Vue3 获得了两个世界的优势：编译型框架的性能和运行时框架的灵活性。对于使用模板的开发者，能够自动获得各种优化；对于需要手写渲染函数的高级用户，仍然可以使用完整的虚拟 DOM 能力。

## 演进的空间

编译器与渲染器的协作模式还有继续优化的空间。例如，Vapor Mode 探索了更激进的编译策略，可以在某些场景下完全绑过虚拟 DOM。这种演进之所以可能，正是因为 Vue3 建立了良好的编译器-渲染器协作架构，为未来的优化留下了接口。
