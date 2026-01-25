# 滚动行为设计

当用户在 Web 应用中导航时，滚动位置的处理是用户体验的一个关键细节。传统多页面应用中，浏览器会自动处理这件事——前进时滚动到顶部，后退时恢复之前的滚动位置。但 SPA 中，页面不真正刷新，这个行为需要路由器来模拟。

## 为什么需要自定义滚动行为

SPA 使用 History API 或 hash 模式导航时，浏览器不会自动重置滚动位置。用户在长列表页面滚动到中间，点击进入详情页，再返回时，可能发现自己还在列表中间——这看起来正常。但如果点击进入详情页时，详情页也从中间位置开始显示，体验就很奇怪了。

Vue Router 提供 `scrollBehavior` 函数，让开发者完全控制导航时的滚动行为。

## 基本配置

`scrollBehavior` 在创建 router 实例时配置：

```javascript
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 返回期望的滚动位置
  }
})
```

这个函数接收三个参数：

`to` 是目标路由对象
`from` 是来源路由对象
`savedPosition` 只在浏览器前进/后退时存在，包含之前的滚动位置

函数需要返回一个描述滚动位置的对象，或者一个返回该对象的 Promise（用于等待页面渲染）。

## 常见滚动策略

最简单的策略是始终滚动到顶部：

```javascript
scrollBehavior(to, from, savedPosition) {
  return { top: 0 }
}
```

这适合大多数场景，确保用户看到新页面时从顶部开始。

更好的策略是：后退时恢复位置，前进时滚动到顶部：

```javascript
scrollBehavior(to, from, savedPosition) {
  if (savedPosition) {
    return savedPosition
  } else {
    return { top: 0 }
  }
}
```

`savedPosition` 只在使用浏览器前进/后退按钮时存在。当用户从列表页进入详情页再返回时，会恢复到之前的滚动位置；当用户点击链接导航时，会滚动到顶部。

## 锚点导航

如果 URL 包含 hash（如 `/page#section`），可以滚动到对应元素：

```javascript
scrollBehavior(to, from, savedPosition) {
  if (to.hash) {
    return {
      el: to.hash,
      behavior: 'smooth'
    }
  }
  
  if (savedPosition) {
    return savedPosition
  }
  
  return { top: 0 }
}
```

`el` 可以是 CSS 选择器（会用 `document.querySelector` 查找），也可以是 DOM 元素。`behavior: 'smooth'` 会产生平滑滚动效果。

可以添加偏移量，比如页面有固定头部时：

```javascript
scrollBehavior(to, from, savedPosition) {
  if (to.hash) {
    return {
      el: to.hash,
      top: 80,  // 偏移 80px，避免被固定头部遮挡
      behavior: 'smooth'
    }
  }
  // ...
}
```

## 延迟滚动

有时目标元素在页面渲染完成后才出现（比如异步加载的内容）。可以返回一个 Promise 来延迟滚动：

```javascript
scrollBehavior(to, from, savedPosition) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ top: 0 })
    }, 500)
  })
}
```

更优雅的方式是等待特定条件：

```javascript
scrollBehavior(to, from, savedPosition) {
  return new Promise((resolve) => {
    // 等待页面过渡动画完成
    router.isReady().then(() => {
      resolve(savedPosition || { top: 0 })
    })
  })
}
```

对于等待 DOM 元素出现，可以使用 MutationObserver 或配合 nextTick：

```javascript
scrollBehavior(to, from, savedPosition) {
  if (to.hash) {
    return new Promise((resolve) => {
      // 使用 requestAnimationFrame 确保 DOM 更新
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve({ el: to.hash, behavior: 'smooth' })
        })
      })
    })
  }
  return savedPosition || { top: 0 }
}
```

## 基于路由元信息的滚动控制

可以使用路由 `meta` 来细粒度控制滚动行为：

```javascript
const routes = [
  { path: '/', component: Home },
  { 
    path: '/list', 
    component: List, 
    meta: { scrollToTop: false }  // 保持滚动位置
  },
  { 
    path: '/modal', 
    component: Modal, 
    meta: { scrollToTop: false }  // 模态框不滚动
  }
]

scrollBehavior(to, from, savedPosition) {
  if (to.meta.scrollToTop === false) {
    return false  // 不改变滚动位置
  }
  
  if (savedPosition) {
    return savedPosition
  }
  
  return { top: 0 }
}
```

返回 `false` 或不返回任何值（`undefined`）表示不改变当前滚动位置。

## 嵌套路由的滚动处理

嵌套路由带来复杂性：父路由不变、只有子路由变化时，可能不应该滚动到顶部。

```javascript
scrollBehavior(to, from, savedPosition) {
  // 如果只有子路由变化，不滚动
  if (to.matched[0] === from.matched[0]) {
    return false
  }
  
  return savedPosition || { top: 0 }
}
```

或者检查路径层级：

```javascript
scrollBehavior(to, from, savedPosition) {
  // 比较路径的第一段
  const toParent = to.path.split('/')[1]
  const fromParent = from.path.split('/')[1]
  
  if (toParent === fromParent) {
    return false
  }
  
  return savedPosition || { top: 0 }
}
```

## 多滚动区域

有时页面有多个可滚动区域（比如侧边栏和主内容区）。`scrollBehavior` 默认控制的是 `window` 的滚动。对于其他滚动容器，需要手动处理：

```javascript
// 在导航守卫或组件中
router.beforeEach((to, from) => {
  // 保存当前滚动位置
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    from.meta.scrollTop = mainContent.scrollTop
  }
})

router.afterEach((to, from) => {
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    if (to.meta.scrollTop !== undefined) {
      mainContent.scrollTop = to.meta.scrollTop
    } else {
      mainContent.scrollTop = 0
    }
  }
})
```

更健壮的方式是使用 `scrollBehavior` 配合 CSS：

```css
html {
  overflow: hidden;
  height: 100%;
}

body {
  overflow: auto;
  height: 100%;
}
```

这样 `scrollBehavior` 控制的就是 `body` 而不是 `window`。

## 滚动行为与过渡动画

当页面有过渡动画时，滚动和动画可能产生冲突。旧页面淡出时就滚动，会看到奇怪的跳动。

解决方案是延迟滚动到动画完成后：

```javascript
scrollBehavior(to, from, savedPosition) {
  return new Promise((resolve) => {
    // 假设过渡动画是 300ms
    setTimeout(() => {
      resolve(savedPosition || { top: 0 })
    }, 300)
  })
}
```

更好的方式是监听过渡完成事件，但这需要额外的协调机制。

一种实践是对不同路由使用不同策略：

```javascript
scrollBehavior(to, from, savedPosition) {
  // 模态框路由不滚动
  if (to.meta.modal) {
    return false
  }
  
  // 有过渡动画的路由延迟滚动
  if (to.meta.transition) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(savedPosition || { top: 0 })
      }, to.meta.transitionDuration || 300)
    })
  }
  
  return savedPosition || { top: 0 }
}
```

## 实现原理

Vue Router 在导航完成后调用 `scrollBehavior`，获取返回的位置对象，然后使用 `window.scrollTo()` 或 `element.scrollIntoView()` 来执行滚动。

对于 `savedPosition`，路由器使用 History API 的 `state` 来存储：

```javascript
// 导航前保存
history.replaceState(
  { ...history.state, scroll: { top: window.scrollY, left: window.scrollX } },
  ''
)

// 导航后恢复
const savedPosition = history.state?.scroll
```

这就是为什么 `savedPosition` 只在浏览器导航（前进/后退）时存在——`pushState` 不会触发 `popstate` 事件，也就没有已保存的位置。

## 本章小结

`scrollBehavior` 让你完全控制导航时的滚动行为。基本策略是后退恢复位置、前进滚动到顶。通过检查 `to.hash` 可以支持锚点导航，通过返回 Promise 可以延迟滚动到动画或异步内容完成后。

对于复杂场景，可以结合路由 `meta` 来细粒度控制，也可以使用导航守卫来处理多滚动区域。记住返回 `false` 表示不改变滚动位置，这对模态框和嵌套路由很有用。

好的滚动行为是无感的——用户不会注意到它的存在，但会在它缺失时感到不适。
