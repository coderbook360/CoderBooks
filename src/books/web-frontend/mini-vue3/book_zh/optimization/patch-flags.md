# PatchFlags：精确的更新提示

PatchFlags 是 Vue 3 编译优化的基石。**它用位掩码告诉运行时：这个节点的哪部分是动态的。**

**理解 PatchFlags，你就能明白 Vue 3 为什么比 Vue 2 更快。** 本章将深入分析 PatchFlags 的设计与实现。

## 设计动机

传统 Diff 的问题：

```html
<div :class="cls">
  {{ message }}
  <span>静态内容</span>
</div>
```

即使只有 `class` 是动态的，Diff 算法也会比对所有属性和所有子节点。

PatchFlags 的解决方案：在编译时标记动态部分，运行时只比对标记的部分。

## PatchFlags 定义

```javascript
const PatchFlags = {
  // 动态内容
  TEXT: 1,           // 动态 textContent
  CLASS: 1 << 1,     // 动态 class（2）
  STYLE: 1 << 2,     // 动态 style（4）
  PROPS: 1 << 3,     // 动态非 class/style 属性（8）
  FULL_PROPS: 1 << 4, // 属性 key 是动态的（16）
  
  // 事件相关
  NEED_HYDRATION: 1 << 5,  // 需要 hydration（32）
  
  // Fragment 相关
  STABLE_FRAGMENT: 1 << 6,   // 稳定的 Fragment（64）
  KEYED_FRAGMENT: 1 << 7,    // 带 key 的 Fragment（128）
  UNKEYED_FRAGMENT: 1 << 8,  // 无 key 的 Fragment（256）
  
  // 其他
  NEED_PATCH: 1 << 9,     // 需要 patch（ref/directives）（512）
  DYNAMIC_SLOTS: 1 << 10, // 动态插槽（1024）
  
  // 特殊值
  HOISTED: -1,  // 静态提升的节点
  BAIL: -2      // 退出优化模式
}
```

## 位掩码的优势

使用位掩码可以组合多个标记：

```javascript
// class 和 style 都是动态的
const flag = PatchFlags.CLASS | PatchFlags.STYLE  // 2 | 4 = 6

// 检查是否包含某个标记
if (flag & PatchFlags.CLASS) {
  // 比对 class
}
if (flag & PatchFlags.STYLE) {
  // 比对 style
}
```

位运算比对象属性访问更快，内存占用更小。

## 编译时的 PatchFlag 推断

### 属性分析

```javascript
function analyzePatchFlag(props) {
  let patchFlag = 0
  const dynamicProps = []
  
  for (const prop of props) {
    const { key, value } = prop
    
    // 静态值不需要标记
    if (isStaticExp(value)) continue
    
    // 动态绑定
    if (key === 'class') {
      patchFlag |= PatchFlags.CLASS
    } else if (key === 'style') {
      patchFlag |= PatchFlags.STYLE
    } else if (key !== 'key' && key !== 'ref') {
      dynamicProps.push(key)
    }
    
    // 动态 key
    if (!isStaticExp(key)) {
      patchFlag |= PatchFlags.FULL_PROPS
    }
  }
  
  if (dynamicProps.length) {
    patchFlag |= PatchFlags.PROPS
  }
  
  return { patchFlag, dynamicProps }
}
```

### 文本节点分析

```javascript
function analyzeTextPatchFlag(children) {
  let hasText = false
  let hasDynamicText = false
  
  for (const child of children) {
    if (child.type === NodeTypes.TEXT) {
      hasText = true
    } else if (child.type === NodeTypes.INTERPOLATION) {
      hasText = true
      hasDynamicText = true
    }
  }
  
  if (hasDynamicText) {
    return PatchFlags.TEXT
  }
  return 0
}
```

## 编译输出

```html
<div :class="cls" :id="id" title="static">
  {{ message }}
</div>
```

```javascript
createElementVNode("div", {
  class: _normalizeClass(_ctx.cls),
  id: _ctx.id,
  title: "static"
}, _toDisplayString(_ctx.message), 11 /* TEXT, CLASS, PROPS */, ["id"])
```

- `11` = 1 + 2 + 8 = TEXT + CLASS + PROPS
- `["id"]` 是 dynamicProps 数组，告诉运行时哪些属性需要比对

## 运行时的利用

```javascript
function patchElement(n1, n2) {
  const el = n2.el = n1.el
  const { patchFlag, dynamicProps } = n2
  
  if (patchFlag > 0) {
    // 有优化标记，精确比对
    if (patchFlag & PatchFlags.CLASS) {
      if (n1.props.class !== n2.props.class) {
        hostSetElementClass(el, n2.props.class)
      }
    }
    
    if (patchFlag & PatchFlags.STYLE) {
      patchStyle(el, n1.props.style, n2.props.style)
    }
    
    if (patchFlag & PatchFlags.PROPS) {
      // 只比对 dynamicProps 中的属性
      for (const key of dynamicProps) {
        if (n1.props[key] !== n2.props[key]) {
          hostPatchProp(el, key, n1.props[key], n2.props[key])
        }
      }
    }
    
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        hostSetElementText(el, n2.children)
      }
    }
  } else if (patchFlag === PatchFlags.FULL_PROPS) {
    // 动态 key，需要完整比对
    patchProps(el, n1.props, n2.props)
  }
  // patchFlag <= 0 或 HOISTED，跳过
}
```

## 特殊 PatchFlag

### HOISTED (-1)

静态提升的节点：

```javascript
const _hoisted_1 = createElementVNode("div", null, "static", -1)
```

运行时看到 `-1`，直接跳过比对。

### BAIL (-2)

退出优化模式：

```javascript
createElementVNode("div", dynamicProps, children, -2)
```

需要进行完整 Diff，通常是因为无法在编译时确定结构。

### STABLE_FRAGMENT (64)

Fragment 的子节点结构稳定：

```html
<template v-if="show">
  <span>A</span>
  <span>B</span>
</template>
```

子节点数量和顺序不会变，可以按索引直接比对。

## 开发模式提示

编译输出在开发模式包含注释：

```javascript
createElementVNode("div", { ... }, "...", 
  11 /* TEXT, CLASS, PROPS */, 
  ["id"]
)
```

`/* TEXT, CLASS, PROPS */` 帮助开发者理解优化情况。

## 本章小结

本章分析了 PatchFlags 的设计与实现：

- **位掩码设计**：高效组合多个标记
- **编译时推断**：分析属性和子节点的动态性
- **dynamicProps**：精确指定需要比对的属性
- **运行时利用**：根据标记跳过不必要的比对
- **特殊值**：HOISTED、BAIL、STABLE_FRAGMENT

PatchFlags 回答了"比什么"的问题，下一章我们将分析静态提升——避免重复创建静态内容。
