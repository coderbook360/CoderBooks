# transformVShow 指令转换

v-show 是 Vue 中用于控制元素显示/隐藏的指令，它通过操作 CSS display 属性实现，与 v-if 不同的是元素始终保留在 DOM 中。

## 核心实现

```typescript
export const transformShow: DirectiveTransform = (dir, node, context) => {
  const { exp, loc } = dir
  
  if (!exp) {
    context.onError(
      createDOMCompilerError(DOMErrorCodes.X_V_SHOW_NO_EXPRESSION, loc)
    )
  }

  // v-show 转换为运行时指令
  return {
    props: [],
    needRuntime: context.helper(V_SHOW)
  }
}
```

v-show 不需要编译时转换属性，它完全依赖运行时指令实现。

## 运行时指令

```typescript
export const vShow: ObjectDirective<VShowElement> = {
  beforeMount(el, { value }, { transition }) {
    el._vod = el.style.display === 'none' ? '' : el.style.display
    if (transition && value) {
      transition.beforeEnter(el)
    } else {
      setDisplay(el, value)
    }
  },
  
  mounted(el, { value }, { transition }) {
    if (transition && value) {
      transition.enter(el)
    }
  },
  
  updated(el, { value, oldValue }, { transition }) {
    if (!value === !oldValue) return
    
    if (transition) {
      if (value) {
        transition.beforeEnter(el)
        setDisplay(el, true)
        transition.enter(el)
      } else {
        transition.leave(el, () => {
          setDisplay(el, false)
        })
      }
    } else {
      setDisplay(el, value)
    }
  },
  
  beforeUnmount(el, { value }) {
    setDisplay(el, value)
  }
}

function setDisplay(el: VShowElement, value: unknown): void {
  el.style.display = value ? el._vod : 'none'
}
```

## 生成代码

```html
<div v-show="visible">Content</div>
```

```typescript
_withDirectives(
  _createElementVNode("div", null, "Content"),
  [[_vShow, visible]]
)
```

v-show 生成 withDirectives 包装，运行时将指令绑定到元素。

## 与 Transition 配合

```html
<Transition>
  <div v-show="visible">Content</div>
</Transition>
```

v-show 与 Transition 配合时，会触发过渡动画而不是直接切换 display。

```typescript
// 运行时检测 transition
updated(el, { value, oldValue }, { transition }) {
  if (transition) {
    // 有过渡，使用动画
    if (value) {
      transition.beforeEnter(el)
      setDisplay(el, true)
      transition.enter(el)
    } else {
      transition.leave(el, () => {
        setDisplay(el, false)
      })
    }
  } else {
    // 无过渡，直接切换
    setDisplay(el, value)
  }
}
```

## 保留原始 display

```typescript
// 保存原始 display 值
el._vod = el.style.display === 'none' ? '' : el.style.display

// 恢复时使用原始值
el.style.display = value ? el._vod : 'none'
```

这确保了 `display: flex` 等非默认值能正确恢复。

## 与 v-if 的区别

```typescript
// v-if - 条件渲染，节点被移除/添加
show ? _createVNode("div") : _createCommentVNode("v-if")

// v-show - 始终渲染，通过 CSS 控制
_withDirectives(_createVNode("div"), [[_vShow, visible]])
```

v-show 适合频繁切换的场景，v-if 适合条件较少变化的场景。

## 小结

transformVShow 的特点：

1. **编译时简单**：只标记需要运行时指令
2. **运行时处理**：通过指令操作 CSS display
3. **过渡支持**：与 Transition 组件协作
4. **值保留**：记住原始 display 值

下一章将分析 transformVOnce 一次性渲染转换。
