# VNode PatchFlags 补丁标记

PatchFlags 是编译时优化的核心。编译器分析模板，标记节点的哪些部分是动态的，渲染器据此选择性更新。

## 枚举定义

```typescript
export const enum PatchFlags {
  TEXT = 1,              // 1       动态文本内容
  CLASS = 1 << 1,        // 2       动态 class
  STYLE = 1 << 2,        // 4       动态 style
  PROPS = 1 << 3,        // 8       动态 props（不含 class/style）
  FULL_PROPS = 1 << 4,   // 16      props 的 key 是动态的
  HYDRATE_EVENTS = 1 << 5, // 32    需要水合事件
  STABLE_FRAGMENT = 1 << 6, // 64   子节点顺序不变的 Fragment
  KEYED_FRAGMENT = 1 << 7,  // 128  带 key 的 Fragment
  UNKEYED_FRAGMENT = 1 << 8, // 256 无 key 的 Fragment
  NEED_PATCH = 1 << 9,   // 512     非 props 的需要 patch（ref、指令）
  DYNAMIC_SLOTS = 1 << 10, // 1024  动态插槽
  DEV_ROOT_FRAGMENT = 1 << 11, // 2048 开发模式根节点 Fragment
  HOISTED = -1,          // 静态提升的节点
  BAIL = -2              // 跳出优化，完整 Diff
}
```

## 编译器生成

编译器分析模板生成 PatchFlags：

```html
<div :class="cls">{{ msg }}</div>
```

编译为：

```javascript
createVNode('div', { class: _ctx.cls }, 
  toDisplayString(_ctx.msg), 
  3 /* TEXT | CLASS */
)
```

`3 = 1 (TEXT) | 2 (CLASS)`，表示文本内容和 class 是动态的。

## 各标记含义

### TEXT (1)

子节点是动态文本：

```html
<p>{{ message }}</p>
<!-- patchFlag = 1 -->
```

渲染器只需对比文本：

```typescript
if (patchFlag & PatchFlags.TEXT) {
  if (n1.children !== n2.children) {
    hostSetElementText(el, n2.children)
  }
}
```

### CLASS (2)

动态绑定 class：

```html
<div :class="dynamicClass"></div>
<!-- patchFlag = 2 -->
```

```typescript
if (patchFlag & PatchFlags.CLASS) {
  if (n1.props.class !== n2.props.class) {
    hostPatchProp(el, 'class', null, n2.props.class)
  }
}
```

### STYLE (4)

动态绑定 style：

```html
<div :style="dynamicStyle"></div>
<!-- patchFlag = 4 -->
```

### PROPS (8)

有动态 props（不含 class/style）：

```html
<input :value="val" :disabled="isDisabled">
<!-- patchFlag = 8, dynamicProps = ['value', 'disabled'] -->
```

```typescript
if (patchFlag & PatchFlags.PROPS) {
  const propsToUpdate = n2.dynamicProps!
  for (const key of propsToUpdate) {
    const prev = n1.props[key]
    const next = n2.props[key]
    if (prev !== next) {
      hostPatchProp(el, key, prev, next)
    }
  }
}
```

### FULL_PROPS (16)

props 的 key 是动态的（如 v-bind="obj"）：

```html
<div v-bind="dynamicAttrs"></div>
<!-- patchFlag = 16 -->
```

需要完整遍历 props：

```typescript
if (patchFlag & PatchFlags.FULL_PROPS) {
  patchProps(el, n2, n1.props, n2.props)
}
```

### HYDRATE_EVENTS (32)

SSR 水合时需要附加事件：

```html
<button @click="handler">Click</button>
<!-- patchFlag = 32 (仅水合时) -->
```

### STABLE_FRAGMENT (64)

Fragment 的子节点顺序不会变化：

```html
<template v-if="show">
  <p>a</p>
  <p>b</p>
</template>
<!-- patchFlag = 64 -->
```

可以按索引一一对应 Diff。

### KEYED_FRAGMENT (128)

v-for 带 key：

```html
<div v-for="item in list" :key="item.id">{{ item.name }}</div>
<!-- patchFlag = 128 -->
```

使用 keyed Diff 算法。

### UNKEYED_FRAGMENT (256)

v-for 无 key：

```html
<div v-for="item in list">{{ item.name }}</div>
<!-- patchFlag = 256 -->
```

使用简单的索引对比。

### NEED_PATCH (512)

有 ref 或指令需要更新：

```html
<div ref="divRef" v-custom></div>
<!-- patchFlag = 512 -->
```

### DYNAMIC_SLOTS (1024)

组件有动态插槽：

```html
<MyComponent>
  <template #[dynamicSlotName]>...</template>
</MyComponent>
<!-- patchFlag = 1024 -->
```

## 特殊值

### HOISTED (-1)

静态提升的节点：

```typescript
const _hoisted_1 = createVNode('div', null, 'static', -1 /* HOISTED */)
```

渲染器跳过这类节点的 Diff。

### BAIL (-2)

需要完整 Diff：

```typescript
if (patchFlag === PatchFlags.BAIL) {
  optimized = false  // 禁用优化
}
```

## 组合使用

多个动态属性时组合标记：

```html
<div :class="cls" :style="stl">{{ text }}</div>
<!-- patchFlag = 1 | 2 | 4 = 7 -->
```

渲染器逐个检查：

```typescript
if (patchFlag & PatchFlags.TEXT) { /* 更新文本 */ }
if (patchFlag & PatchFlags.CLASS) { /* 更新 class */ }
if (patchFlag & PatchFlags.STYLE) { /* 更新 style */ }
```

## dynamicProps 数组

PROPS 标记配合 `dynamicProps` 数组使用：

```typescript
createVNode('input', 
  { type: 'text', value: _ctx.val, placeholder: 'Enter...' },
  null,
  8, /* PROPS */
  ['value']  /* 只有 value 是动态的 */
)
```

只 Diff `value` 属性，`type` 和 `placeholder` 被跳过。

## patchElement 实现

```typescript
function patchElement(n1, n2, parentComponent) {
  const el = (n2.el = n1.el!)
  const patchFlag = n2.patchFlag
  const oldProps = n1.props || EMPTY_OBJ
  const newProps = n2.props || EMPTY_OBJ
  
  if (patchFlag > 0) {
    // 有优化标记
    if (patchFlag & PatchFlags.FULL_PROPS) {
      patchProps(el, n2, oldProps, newProps)
    } else {
      if (patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          hostPatchProp(el, 'class', null, newProps.class)
        }
      }
      if (patchFlag & PatchFlags.STYLE) {
        hostPatchProp(el, 'style', oldProps.style, newProps.style)
      }
      if (patchFlag & PatchFlags.PROPS) {
        const propsToUpdate = n2.dynamicProps!
        for (let i = 0; i < propsToUpdate.length; i++) {
          const key = propsToUpdate[i]
          const prev = oldProps[key]
          const next = newProps[key]
          if (next !== prev) {
            hostPatchProp(el, key, prev, next)
          }
        }
      }
    }
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        hostSetElementText(el, n2.children as string)
      }
    }
  } else if (!optimized && dynamicChildren == null) {
    // 无优化：完整 Diff props
    patchProps(el, n2, oldProps, newProps)
  }
  
  // 处理 children...
}
```

## 性能对比

假设节点有 10 个属性，其中 1 个是动态的：

| 模式 | 比较次数 |
|------|----------|
| 无 PatchFlag | 10 |
| 有 PatchFlag | 1 |

## 开发模式注释

开发构建中，PatchFlags 会生成注释便于调试：

```javascript
createVNode('div', { class: _ctx.cls }, 
  toDisplayString(_ctx.msg), 
  3 /* TEXT, CLASS */
)
```

## 小结

PatchFlags 是编译器传递给渲染器的优化信息。编译器在构建时分析哪些部分是动态的，渲染器在运行时根据这些标记选择性更新，避免不必要的比较。这是 Vue 3 性能优化的关键机制。
