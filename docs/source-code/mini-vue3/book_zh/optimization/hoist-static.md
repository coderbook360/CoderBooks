# 静态提升：hoistStatic 的实现

每次渲染都会执行 render 函数，创建新的 VNode 树。**对于静态内容，每次创建的 VNode 完全相同——这是不必要的开销。**

**静态提升将这些内容提升到 render 函数外部，只创建一次。** 这是一个简单但效果显著的优化。

## 问题场景

```javascript
// 未优化：每次渲染都创建
function render() {
  return createVNode('div', null, [
    createVNode('h1', null, '欢迎'),      // 每次都创建
    createVNode('p', null, '这是介绍'),   // 每次都创建
    createVNode('span', null, ctx.msg)    // 必须每次创建
  ])
}
```

假设 render 执行 1000 次：
- 创建 3000 个 VNode 对象
- 其中 2000 个是完全相同的静态节点

## 静态提升后

```javascript
// 提升到模块顶层
const _hoisted_1 = createVNode('h1', null, '欢迎', -1 /* HOISTED */)
const _hoisted_2 = createVNode('p', null, '这是介绍', -1 /* HOISTED */)

function render() {
  return createVNode('div', null, [
    _hoisted_1,  // 复用
    _hoisted_2,  // 复用
    createVNode('span', null, ctx.msg)
  ])
}
```

1000 次渲染只创建 1002 个 VNode（2 个静态 + 1000 个动态）。

## 常量类型分类

不是所有节点都能提升。Vue 3 使用 `ConstantType` 分类：

```javascript
const ConstantTypes = {
  NOT_CONSTANT: 0,    // 不是常量，不能提升
  CAN_SKIP_PATCH: 1,  // 可以跳过 patch，但不能提升
  CAN_HOIST: 2,       // 可以提升
  CAN_STRINGIFY: 3    // 可以字符串化
}
```

判定规则：

```javascript
function getConstantType(node, context) {
  switch (node.type) {
    case NodeTypes.ELEMENT:
      // 组件不能提升
      if (node.tagType !== ElementTypes.ELEMENT) {
        return ConstantTypes.NOT_CONSTANT
      }
      
      // 有动态绑定不能提升
      const flag = getPatchFlag(node)
      if (flag !== undefined && flag !== PatchFlags.HOISTED) {
        return ConstantTypes.NOT_CONSTANT
      }
      
      // 检查属性是否都是静态的
      for (const prop of node.props) {
        if (!isStaticProp(prop)) {
          return ConstantTypes.NOT_CONSTANT
        }
      }
      
      // 递归检查子节点
      let returnType = ConstantTypes.CAN_STRINGIFY
      for (const child of node.children) {
        const childType = getConstantType(child, context)
        if (childType === ConstantTypes.NOT_CONSTANT) {
          return ConstantTypes.NOT_CONSTANT
        }
        if (childType < returnType) {
          returnType = childType
        }
      }
      
      return returnType
      
    case NodeTypes.TEXT:
      return ConstantTypes.CAN_STRINGIFY
      
    case NodeTypes.INTERPOLATION:
      // 插值表达式是动态的
      return ConstantTypes.NOT_CONSTANT
      
    // ...
  }
}
```

## hoistStatic 实现

```javascript
function hoistStatic(root, context) {
  walk(root, context)
}

function walk(node, context) {
  const { children } = node
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (child.type === NodeTypes.ELEMENT) {
      const constantType = getConstantType(child, context)
      
      if (constantType >= ConstantTypes.CAN_HOIST) {
        // 可以提升
        // 标记 PatchFlag 为 HOISTED
        child.codegenNode.patchFlag = PatchFlags.HOISTED
        
        // 添加到提升列表
        child.codegenNode = context.hoist(child.codegenNode)
      } else if (constantType === ConstantTypes.CAN_SKIP_PATCH) {
        // 不能提升但可以跳过 patch
        child.codegenNode.patchFlag = PatchFlags.HOISTED
      }
    }
    
    // 递归处理子节点
    if (child.type === NodeTypes.ELEMENT && 
        child.codegenNode?.type === NodeTypes.VNODE_CALL) {
      walk(child, context)
    }
  }
}
```

## context.hoist

```javascript
function createTransformContext(root, options) {
  const hoists = []
  
  return {
    hoists,
    
    hoist(exp) {
      // 添加到提升列表
      hoists.push(exp)
      
      // 返回对提升变量的引用
      const identifier = createSimpleExpression(
        `_hoisted_${hoists.length}`,
        false,
        exp.loc,
        ConstantTypes.CAN_HOIST
      )
      identifier.hoisted = exp
      return identifier
    }
  }
}
```

## 代码生成

```javascript
function generate(ast, context) {
  const { hoists } = ast
  
  // 生成提升变量
  if (hoists.length) {
    for (let i = 0; i < hoists.length; i++) {
      push(`const _hoisted_${i + 1} = `)
      genNode(hoists[i], context)
      push('\n')
    }
  }
  
  // 生成 render 函数
  push(`function render(_ctx) {\n`)
  // ...
}
```

## 静态属性提升

不仅整个节点可以提升，静态属性对象也可以：

```html
<div class="container" id="main">
  {{ content }}
</div>
```

```javascript
// 属性对象提升
const _hoisted_1 = { class: "container", id: "main" }

function render(_ctx) {
  return createElementVNode("div", _hoisted_1, 
    _toDisplayString(_ctx.content), 
    1 /* TEXT */
  )
}
```

## 不能提升的情况

**组件**

```html
<MyComponent />
```

组件可能有副作用，不能提升。

**动态属性**

```html
<div :class="cls">static</div>
```

有动态绑定，整个节点不能提升。

**带 ref 的元素**

```html
<div ref="myDiv">static</div>
```

ref 需要在每次渲染时处理。

## 内存与 GC

静态提升有轻微的内存代价——提升的节点在模块生命周期内一直存在。

但收益远大于代价：
- 减少了每次渲染的对象分配
- 减少了 GC 压力
- 提升的节点可以被多个组件实例共享

## 本章小结

本章分析了静态提升的实现：

- **ConstantType 分类**：判断节点是否可提升
- **hoistStatic 转换**：遍历 AST，标记可提升节点
- **context.hoist**：收集提升节点，返回引用
- **代码生成**：在模块顶层生成提升变量

静态提升解决了"重复创建"的问题。下一章我们将分析预字符串化——将静态内容进一步优化为字符串。
