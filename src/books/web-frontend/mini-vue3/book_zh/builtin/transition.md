# Transition 实现

元素显示和隐藏时如何添加平滑的过渡效果？**Transition 组件是如何知道 CSS 动画何时结束的？**

**这些问题的答案揭示了 Transition 的精妙设计。** 本章将分析 Transition 的工作原理，包括类名管理和 JavaScript 钩子。

## 基本用法

```vue-html
<Transition name="fade">
  <div v-if="show">内容</div>
</Transition>
```

```css
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

## 过渡类名的生命周期

进入过渡（Enter）：

```
帧 0              帧 1             动画结束
  │                 │                 │
  ▼                 ▼                 ▼
v-enter-from     v-enter-active    移除所有类
v-enter-active   v-enter-to
                 (移除 v-enter-from)
```

离开过渡（Leave）：

```
帧 0              帧 1             动画结束
  │                 │                 │
  ▼                 ▼                 ▼
v-leave-from     v-leave-active    元素移除
v-leave-active   v-leave-to
                 (移除 v-leave-from)
```

## Transition 组件结构

```javascript
const Transition = {
  name: 'Transition',
  
  props: {
    name: { type: String, default: 'v' },
    mode: String,  // 'in-out' | 'out-in'
    appear: Boolean,
    css: { type: Boolean, default: true },
    type: String,  // 'transition' | 'animation'
    duration: [Number, Object],
    
    // 类名覆盖
    enterFromClass: String,
    enterActiveClass: String,
    enterToClass: String,
    leaveFromClass: String,
    leaveActiveClass: String,
    leaveToClass: String,
    appearFromClass: String,
    appearActiveClass: String,
    appearToClass: String
  },
  
  setup(props, { slots }) {
    // ...
  }
}
```

## 核心实现

Transition 的核心是给子元素添加过渡钩子：

```javascript
setup(props, { slots }) {
  return () => {
    const children = slots.default()
    const child = children[0]
    
    if (!child) return
    
    // 解析过渡配置
    const {
      name = 'v',
      type,
      css = true,
      duration,
      // 类名
      enterFromClass = `${name}-enter-from`,
      enterActiveClass = `${name}-enter-active`,
      enterToClass = `${name}-enter-to`,
      leaveFromClass = `${name}-leave-from`,
      leaveActiveClass = `${name}-leave-active`,
      leaveToClass = `${name}-leave-to`,
      // 钩子
      onBeforeEnter,
      onEnter,
      onAfterEnter,
      onEnterCancelled,
      onBeforeLeave,
      onLeave,
      onAfterLeave,
      onLeaveCancelled
    } = props
    
    // 为子元素添加 transition 属性
    child.transition = {
      mode: props.mode,
      
      beforeEnter(el) {
        onBeforeEnter?.(el)
        if (css) {
          el.classList.add(enterFromClass, enterActiveClass)
        }
      },
      
      enter(el, done) {
        onEnter?.(el, done)
        
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (css) {
              el.classList.remove(enterFromClass)
              el.classList.add(enterToClass)
            }
            
            if (!onEnter || onEnter.length <= 1) {
              whenTransitionEnds(el, type, done)
            }
          })
        })
      },
      
      afterEnter(el) {
        if (css) {
          el.classList.remove(enterActiveClass, enterToClass)
        }
        onAfterEnter?.(el)
      },
      
      beforeLeave(el) {
        onBeforeLeave?.(el)
        if (css) {
          el.classList.add(leaveFromClass, leaveActiveClass)
        }
      },
      
      leave(el, done) {
        onLeave?.(el, done)
        
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (css) {
              el.classList.remove(leaveFromClass)
              el.classList.add(leaveToClass)
            }
            
            if (!onLeave || onLeave.length <= 1) {
              whenTransitionEnds(el, type, done)
            }
          })
        })
      },
      
      afterLeave(el) {
        if (css) {
          el.classList.remove(leaveActiveClass, leaveToClass)
        }
        onAfterLeave?.(el)
      }
    }
    
    return child
  }
}
```

## 渲染器集成

渲染器在挂载/卸载时调用过渡钩子：

```javascript
// 挂载元素
function mountElement(vnode, container, anchor) {
  const el = vnode.el = createElement(vnode.type)
  
  // 处理属性、子节点...
  
  const { transition } = vnode
  
  if (transition) {
    // 调用 beforeEnter
    transition.beforeEnter(el)
  }
  
  insert(el, container, anchor)
  
  if (transition) {
    // 调用 enter
    transition.enter(el, () => {
      transition.afterEnter(el)
    })
  }
}

// 卸载元素
function unmount(vnode) {
  const { el, transition } = vnode
  
  const remove = () => {
    hostRemove(el)
  }
  
  if (transition) {
    transition.beforeLeave(el)
    transition.leave(el, () => {
      transition.afterLeave(el)
      remove()
    })
  } else {
    remove()
  }
}
```

关键点：离开过渡需要等待动画结束后再移除元素。

## 检测动画结束

```javascript
function whenTransitionEnds(el, expectedType, done) {
  // 获取计算样式
  const styles = window.getComputedStyle(el)
  
  // 获取 transition 和 animation 信息
  const transitionDuration = parseFloat(styles.transitionDuration) || 0
  const transitionDelay = parseFloat(styles.transitionDelay) || 0
  const animationDuration = parseFloat(styles.animationDuration) || 0
  const animationDelay = parseFloat(styles.animationDelay) || 0
  
  // 确定类型和持续时间
  let type, timeout
  
  if (expectedType) {
    type = expectedType
  } else if (transitionDuration > 0) {
    type = 'transition'
  } else if (animationDuration > 0) {
    type = 'animation'
  }
  
  if (type === 'transition') {
    timeout = (transitionDuration + transitionDelay) * 1000
  } else if (type === 'animation') {
    timeout = (animationDuration + animationDelay) * 1000
  }
  
  if (timeout) {
    const event = type === 'transition' ? 'transitionend' : 'animationend'
    
    const onEnd = () => {
      el.removeEventListener(event, onEnd)
      done()
    }
    
    el.addEventListener(event, onEnd)
    
    // 兜底超时
    setTimeout(() => {
      el.removeEventListener(event, onEnd)
      done()
    }, timeout + 1)
  } else {
    done()
  }
}
```

检测逻辑：
1. 读取 `getComputedStyle` 获取动画信息
2. 监听 `transitionend` 或 `animationend` 事件
3. 设置超时兜底，防止事件未触发

## 双 requestAnimationFrame

为什么要调用两次 `requestAnimationFrame`？

```javascript
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    el.classList.remove(enterFromClass)
    el.classList.add(enterToClass)
  })
})
```

原因：确保浏览器已经渲染了初始状态。

1. 添加 `enterFromClass`（初始状态）
2. 第一个 rAF：浏览器准备渲染
3. 第二个 rAF：确保初始状态已渲染
4. 移除 `enterFromClass`，添加 `enterToClass`，触发过渡

如果只用一个 rAF，初始状态可能还没渲染就被改变了，过渡不会生效。

## mode 属性

控制切换时的过渡顺序：

```vue-html
<!-- 默认：同时进行 -->
<Transition>

<!-- 先出后进 -->
<Transition mode="out-in">

<!-- 先进后出 -->
<Transition mode="in-out">
```

实现思路：

```javascript
// out-in 模式
if (mode === 'out-in' && oldVNode) {
  // 等待离开过渡完成
  return oldVNode.transition.leave(oldEl, () => {
    // 完成后再挂载新元素
    mountElement(newVNode, container, anchor)
  })
}

// in-out 模式
if (mode === 'in-out') {
  // 先挂载新元素
  mountElement(newVNode, container, anchor)
  // 新元素过渡完成后再卸载旧元素
  newVNode.transition.enter(newEl, () => {
    unmount(oldVNode)
  })
}
```

## JavaScript 钩子

完全使用 JavaScript 控制动画：

```vue-html
<Transition
  :css="false"
  @before-enter="onBeforeEnter"
  @enter="onEnter"
  @after-enter="onAfterEnter"
  @before-leave="onBeforeLeave"
  @leave="onLeave"
  @after-leave="onAfterLeave"
>
  <div v-if="show">内容</div>
</Transition>
```

```javascript
function onEnter(el, done) {
  // 使用 GSAP 或其他动画库
  gsap.to(el, {
    opacity: 1,
    duration: 0.5,
    onComplete: done
  })
}
```

注意：`@enter` 和 `@leave` 的回调函数需要调用 `done()` 通知过渡完成。

## 本章小结

本章分析了 Transition 的实现：

- **类名生命周期**：from → active + to → 移除所有
- **双 rAF 技巧**：确保初始状态已渲染
- **动画检测**：监听 transitionend/animationend 事件
- **渲染器集成**：在挂载/卸载时调用过渡钩子
- **mode 属性**：控制 in/out 的顺序
- **JavaScript 钩子**：完全自定义动画

Transition 是 Vue 3 动画系统的基础，它将 CSS 过渡与组件生命周期完美结合。

下一章，我们将分析 TransitionGroup 如何处理列表动画。
