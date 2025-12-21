# 编译优化概述

传统虚拟 DOM 框架在每次更新时都需要遍历整棵 VNode 树进行 Diff。**这种“运行时全量比对”在大型应用中会成为性能瓶颈。**

Vue 3 采用了不同的策略：**编译时分析，运行时跳过。** 这是 Vue 3 性能大幅提升的关键。本章将介绍 Vue 3 编译优化的整体设计。

## 编译时优化的核心思想

模板是静态的代码文本。编译器可以在编译时分析模板结构，识别哪些部分是静态的、哪些部分是动态的，然后生成带有"提示"的渲染函数。

运行时根据这些提示，跳过静态内容的比对，只处理真正会变化的部分。

```html
<div>
  <p>静态文本</p>
  <p>{{ dynamic }}</p>
  <p>另一段静态</p>
</div>
```

传统 Diff：比对所有 3 个 `<p>` 节点。

Vue 3：只比对第二个 `<p>`，其他两个直接跳过。

## 核心优化策略

Vue 3 编译优化包含几个关键策略：

### 1. PatchFlags

位掩码标记，告诉运行时节点的哪部分是动态的：

```javascript
const PatchFlags = {
  TEXT: 1,        // 动态文本
  CLASS: 2,       // 动态 class
  STYLE: 4,       // 动态 style
  PROPS: 8,       // 动态属性
  FULL_PROPS: 16, // 动态 key
  // ...
}
```

```javascript
// 只有 class 是动态的
createElementVNode("div", { class: cls }, null, 2 /* CLASS */)
```

运行时看到 `2`，只比对 class，跳过其他属性。

### 2. 静态提升

将静态节点提升到渲染函数外部：

```javascript
// 未提升：每次渲染都创建
function render() {
  return createVNode('div', null, [
    createVNode('p', null, '静态内容'),
    createVNode('p', null, ctx.msg)
  ])
}

// 提升后：只创建一次
const _hoisted_1 = createVNode('p', null, '静态内容')
function render() {
  return createVNode('div', null, [
    _hoisted_1,  // 复用
    createVNode('p', null, ctx.msg)
  ])
}
```

### 3. Block Tree

收集动态节点到扁平数组，避免遍历整棵树：

```javascript
const block = {
  type: 'div',
  children: [...],  // 完整子节点
  dynamicChildren: [  // 只有动态节点
    { type: 'span', patchFlag: 1 }
  ]
}
```

更新时只遍历 `dynamicChildren`，复杂度从 O(树节点数) 变为 O(动态节点数)。

### 4. 预字符串化

大量连续静态节点转为 HTML 字符串：

```javascript
// 20 个静态段落 → 一个字符串
const _hoisted_1 = createStaticVNode("<p>1</p><p>2</p>...<p>20</p>", 20)
```

通过 `innerHTML` 一次性渲染，比创建 20 个 VNode 更高效。

### 5. 事件缓存

缓存事件处理函数，避免每次渲染创建新函数：

```javascript
// 未缓存：每次都是新函数
onClick: () => handleClick(item)

// 缓存后：复用同一函数
onClick: _cache[0] || (_cache[0] = () => handleClick(item))
```

## 优化流程

```
模板 AST
    │
    ▼
Transform 阶段
    ├── 分析静态/动态节点
    ├── 打 PatchFlags
    ├── 静态提升分析
    └── Block 边界标记
    │
    ▼
Codegen 阶段
    ├── 生成提升变量
    ├── 生成 openBlock/createBlock
    └── 嵌入 PatchFlags
    │
    ▼
优化后的渲染函数
```

## 优化效果

以一个包含 100 个节点、5 个动态节点的组件为例：

- **传统 Diff**：每次更新比对 100 个节点
- **Vue 3**：每次更新只比对 5 个动态节点

更新性能提升约 **20 倍**。

## 优化退化场景

某些情况下优化会退化：

**动态组件**

```html
<component :is="dynamicComp" />
```

编译器不知道会渲染什么，无法优化。

**手写 render 函数**

```javascript
render() {
  return h('div', {}, this.content)
}
```

没有经过模板编译，没有优化提示。

**BAIL flag**

某些复杂场景会标记 `BAIL = -2`，表示退出优化模式，进行完整 Diff。

## 本章小结

本章介绍了 Vue 3 编译优化的整体设计：

- **核心思想**：编译时分析，运行时跳过
- **PatchFlags**：标记动态部分
- **静态提升**：避免重复创建
- **Block Tree**：扁平化动态节点
- **预字符串化**：大量静态节点优化
- **事件缓存**：稳定函数引用

接下来几章将逐一深入分析每个优化策略的实现细节。
