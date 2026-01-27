# PatchFlag 实现

PatchFlag 是 Vue 3 编译时优化的核心，标记节点的动态部分以优化运行时 diff。

## PatchFlags 枚举

```typescript
export const enum PatchFlags {
  TEXT = 1,                   // 动态文本
  CLASS = 1 << 1,             // 动态 class
  STYLE = 1 << 2,             // 动态 style
  PROPS = 1 << 3,             // 动态非 class/style 属性
  FULL_PROPS = 1 << 4,        // 需要完整 props diff
  NEED_HYDRATION = 1 << 5,    // 需要 hydration 监听器
  STABLE_FRAGMENT = 1 << 6,   // 子节点顺序稳定的 Fragment
  KEYED_FRAGMENT = 1 << 7,    // 带 key 的 Fragment
  UNKEYED_FRAGMENT = 1 << 8,  // 无 key 的 Fragment
  NEED_PATCH = 1 << 9,        // 非 props 但需要 patch（如 ref）
  DYNAMIC_SLOTS = 1 << 10,    // 动态插槽
  DEV_ROOT_FRAGMENT = 1 << 11,// 开发环境根 Fragment
  HOISTED = -1,               // 静态提升节点
  BAIL = -2                   // 退出优化模式
}
```

## 编译时分析

```typescript
function buildProps(
  node: ElementNode,
  context: TransformContext
): PropsExpression | undefined {
  let patchFlag = 0
  let hasClassBinding = false
  let hasStyleBinding = false
  let hasDynamicKeys = false
  const dynamicPropNames: string[] = []

  for (let i = 0; i < props.length; i++) {
    const prop = props[i]

    if (prop.type === NodeTypes.DIRECTIVE) {
      const { name, arg, exp } = prop

      if (name === 'bind') {
        if (arg) {
          const propName = arg.content
          if (propName === 'class') {
            hasClassBinding = true
          } else if (propName === 'style') {
            hasStyleBinding = true
          } else if (propName !== 'key') {
            dynamicPropNames.push(propName)
          }
        } else {
          // v-bind="obj" 动态 key
          hasDynamicKeys = true
        }
      }
    }
  }

  // 设置 patchFlag
  if (hasClassBinding) {
    patchFlag |= PatchFlags.CLASS
  }
  if (hasStyleBinding) {
    patchFlag |= PatchFlags.STYLE
  }
  if (dynamicPropNames.length) {
    patchFlag |= PatchFlags.PROPS
  }
  if (hasDynamicKeys) {
    patchFlag |= PatchFlags.FULL_PROPS
  }

  return { props, patchFlag, dynamicPropNames }
}
```

## 文本 PatchFlag

```typescript
function buildTextNode(node: TextCallNode, context: TransformContext) {
  // 包含插值的文本节点
  if (hasInterpolation) {
    return {
      type: NodeTypes.TEXT_CALL,
      codegenNode: createCallExpression(CREATE_TEXT, [
        content,
        '1 /* TEXT */'  // PatchFlag.TEXT
      ])
    }
  }
}
```

## 运行时使用

```typescript
function patchElement(n1: VNode, n2: VNode) {
  const { patchFlag, dynamicProps } = n2

  if (patchFlag > 0) {
    // 按 flag 精确更新
    if (patchFlag & PatchFlags.CLASS) {
      if (oldProps.class !== newProps.class) {
        hostPatchProp(el, 'class', null, newProps.class)
      }
    }

    if (patchFlag & PatchFlags.STYLE) {
      hostPatchProp(el, 'style', oldProps.style, newProps.style)
    }

    if (patchFlag & PatchFlags.PROPS) {
      // 只检查动态属性
      for (const key of dynamicProps!) {
        if (oldProps[key] !== newProps[key]) {
          hostPatchProp(el, key, oldProps[key], newProps[key])
        }
      }
    }

    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        hostSetElementText(el, n2.children as string)
      }
    }
  } else if (patchFlag === PatchFlags.FULL_PROPS) {
    // 完整 diff props
    patchProps(el, n2, oldProps, newProps)
  }
}
```

## 代码生成

```typescript
// 生成带 patchFlag 的 VNode
_createElementVNode("div", {
  class: _ctx.dynamicClass
}, null, 2 /* CLASS */)

// 多个 flag 组合
_createElementVNode("div", {
  class: _ctx.cls,
  id: _ctx.id
}, _toDisplayString(_ctx.text), 11 /* TEXT, CLASS, PROPS */, ["id"])
```

## dynamicProps 数组

```typescript
// 标记哪些 props 是动态的
_createElementVNode("div", {
  id: _ctx.dynamicId,
  "data-static": "fixed"
}, null, 8 /* PROPS */, ["id"])
```

只有 id 是动态的，data-static 是静态的。

## Fragment PatchFlag

```typescript
// 有 key 的 v-for
(_openBlock(true), _createElementBlock(_Fragment, null,
  _renderList(_ctx.items, (item) => ...)
, 128 /* KEYED_FRAGMENT */))

// 无 key 的 v-for
(_openBlock(true), _createElementBlock(_Fragment, null,
  _renderList(_ctx.items, (item) => ...)
, 256 /* UNKEYED_FRAGMENT */))

// 稳定的子节点
(_openBlock(), _createElementBlock(_Fragment, null, [
  _createElementVNode("div"),
  _createElementVNode("span")
], 64 /* STABLE_FRAGMENT */))
```

## BAIL 标记

```typescript
// 某些情况退出优化
if (hasDynamicSlots) {
  patchFlag |= PatchFlags.BAIL
}
```

BAIL 表示无法进行优化的 diff，需要完整比较。

## 小结

PatchFlag 的关键点：

1. **位掩码设计**：支持多个标记组合
2. **编译时分析**：静态分析动态绑定
3. **运行时跳过**：按 flag 精确更新
4. **dynamicProps**：记录动态属性名

下一章将分析事件缓存的实现。
