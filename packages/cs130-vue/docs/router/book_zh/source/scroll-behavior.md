# 滚动行为实现

Vue Router 支持自定义导航时的滚动行为，可以在路由切换时控制页面滚动位置。

## 基本配置

```typescript
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 返回滚动位置
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})
```

## 调用时机

在 `finalizeNavigation` 中调用：

```typescript
function finalizeNavigation(
  toLocation: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  isPush: boolean,
  replace?: boolean
) {
  // 更新 URL
  if (isPush) {
    routerHistory.push(toLocation.fullPath, state)
  }

  // 更新 currentRoute
  currentRoute.value = toLocation

  // 处理滚动
  handleScroll(toLocation, from, isPush, isFirstNavigation)
}
```

## handleScroll 实现

```typescript
function handleScroll(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  isPush: boolean,
  isFirstNavigation: boolean
): Promise<any> {
  const { scrollBehavior } = options
  
  if (!isBrowser || !scrollBehavior) {
    return Promise.resolve()
  }

  // 获取保存的位置
  const scrollPosition: _ScrollPositionNormalized | null =
    (!isPush && getSavedScrollPosition(getScrollKey(to.fullPath, 0))) ||
    null

  // 等待 DOM 更新
  return nextTick()
    .then(() => scrollBehavior(to, from, scrollPosition))
    .then(position => {
      if (position) {
        scrollToPosition(position)
      }
    })
}
```

## 保存滚动位置

```typescript
// 保存位置的 Map
const scrollPositions = new Map<string, ScrollPosition>()

function saveScrollPosition(key: string, position: ScrollPosition) {
  scrollPositions.set(key, position)
}

function getSavedScrollPosition(key: string): ScrollPosition | undefined {
  return scrollPositions.get(key)
}
```

在离开页面前保存：

```typescript
// popstate 处理中
function popStateHandler({ state }: PopStateEvent) {
  // 保存当前位置
  saveScrollPosition(
    getScrollKey(currentLocation.value, 0),
    computeScrollPosition()
  )
  
  // ... 处理导航
}
```

## scrollBehavior 返回值

```typescript
interface ScrollPosition {
  top?: number
  left?: number
  el?: string | Element  // CSS 选择器或元素
  behavior?: 'auto' | 'smooth'
}
```

**滚动到顶部**：

```typescript
scrollBehavior() {
  return { top: 0 }
}
```

**恢复位置**：

```typescript
scrollBehavior(to, from, savedPosition) {
  if (savedPosition) {
    return savedPosition
  }
  return { top: 0 }
}
```

**滚动到锚点**：

```typescript
scrollBehavior(to) {
  if (to.hash) {
    return { el: to.hash }
  }
  return { top: 0 }
}
```

**平滑滚动**：

```typescript
scrollBehavior() {
  return {
    top: 0,
    behavior: 'smooth'
  }
}
```

**异步滚动**：

```typescript
scrollBehavior(to) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ top: 0 })
    }, 500)  // 等待过渡动画
  })
}
```

## scrollToPosition

```typescript
function scrollToPosition(position: ScrollPosition) {
  const scrollOptions: ScrollToOptions = {
    left: position.left,
    top: position.top,
    behavior: position.behavior
  }

  if ('el' in position) {
    // 滚动到元素
    const el = typeof position.el === 'string'
      ? document.querySelector(position.el)
      : position.el
    
    if (!el) {
      console.warn(`Could not find element ${position.el}`)
      return
    }

    const rect = el.getBoundingClientRect()
    scrollOptions.left = rect.left + window.scrollX + (position.left || 0)
    scrollOptions.top = rect.top + window.scrollY + (position.top || 0)
  }

  window.scrollTo(scrollOptions)
}
```

## 滚动键计算

```typescript
function getScrollKey(path: string, delta: number): string {
  return (history.state?.position ?? 0) + delta + path
}
```

结合 `history.state.position` 确保同一路由在不同历史位置有不同的滚动键。

## 与 KeepAlive 配合

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    // 缓存的页面恢复位置
    if (savedPosition) {
      return savedPosition
    }
    // 其他情况滚动到顶部
    return { top: 0 }
  }
})
```

## 条件滚动

```typescript
scrollBehavior(to, from, savedPosition) {
  // 后退/前进时恢复位置
  if (savedPosition) {
    return savedPosition
  }
  
  // 锚点跳转
  if (to.hash) {
    return { el: to.hash, behavior: 'smooth' }
  }
  
  // 同一页面不滚动
  if (to.path === from.path) {
    return false
  }
  
  // 默认滚动到顶部
  return { top: 0 }
}
```

## 本章小结

滚动行为实现的关键：

1. **调用时机**：在 `finalizeNavigation` 中，DOM 更新后
2. **位置保存**：使用 Map 保存每个历史位置的滚动坐标
3. **返回值**：支持坐标、元素选择器、平滑滚动
4. **异步支持**：可以返回 Promise
5. **条件处理**：根据导航类型决定滚动行为

理解滚动行为实现，有助于实现复杂的滚动交互。
