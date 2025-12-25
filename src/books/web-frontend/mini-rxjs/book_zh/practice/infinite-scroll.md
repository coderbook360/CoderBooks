---
sidebar_position: 96
title: "无限滚动加载"
---

# 无限滚动加载

本章实现无限滚动加载功能。

## 需求分析

无限滚动的核心挑战：

1. **滚动检测**：判断是否接近底部
2. **防抖节流**：避免频繁触发
3. **加载状态**：防止重复加载
4. **分页管理**：追踪当前页码
5. **数据累积**：追加而非替换
6. **结束检测**：没有更多数据时停止

## 基础实现

### 滚动检测

```javascript
import { fromEvent } from 'rxjs'
import { 
  map, 
  filter, 
  distinctUntilChanged,
  throttleTime 
} from 'rxjs/operators'

// 计算滚动位置
function getScrollPosition(element = document.documentElement) {
  const scrollTop = element.scrollTop
  const scrollHeight = element.scrollHeight
  const clientHeight = element.clientHeight
  
  return {
    scrollTop,
    scrollHeight,
    clientHeight,
    scrollPercentage: scrollTop / (scrollHeight - clientHeight),
    distanceToBottom: scrollHeight - scrollTop - clientHeight
  }
}

// 创建滚动流
function createScroll$(element = window, threshold = 200) {
  return fromEvent(element, 'scroll').pipe(
    throttleTime(100),
    map(() => getScrollPosition(
      element === window ? document.documentElement : element
    )),
    map(pos => pos.distanceToBottom < threshold),
    distinctUntilChanged(),
    filter(nearBottom => nearBottom)
  )
}
```

### 基础无限滚动

```javascript
const container = document.getElementById('list')
let page = 1
let loading = false
let hasMore = true

const scroll$ = createScroll$(window, 300)

scroll$.pipe(
  filter(() => !loading && hasMore),
  tap(() => {
    loading = true
    showLoading()
  }),
  switchMap(() => 
    fetchData(page).pipe(
      catchError(err => {
        console.error(err)
        return of({ items: [], hasMore: false })
      })
    )
  ),
  tap(response => {
    loading = false
    hideLoading()
    hasMore = response.hasMore
    page++
  })
).subscribe(response => {
  appendItems(response.items)
})

function appendItems(items) {
  items.forEach(item => {
    const el = document.createElement('div')
    el.className = 'item'
    el.textContent = item.name
    container.appendChild(el)
  })
}
```

## 响应式状态管理

### 无限滚动 Store

```javascript
function createInfiniteScrollStore(fetchFn) {
  const state$ = new BehaviorSubject({
    items: [],
    page: 1,
    loading: false,
    hasMore: true,
    error: null
  })
  
  const loadMore$ = new Subject()
  
  // 加载逻辑
  const load$ = loadMore$.pipe(
    withLatestFrom(state$),
    filter(([_, state]) => !state.loading && state.hasMore),
    tap(() => {
      state$.next({
        ...state$.getValue(),
        loading: true,
        error: null
      })
    }),
    switchMap(([_, state]) => 
      fetchFn(state.page).pipe(
        catchError(err => of({ items: [], hasMore: true, error: err.message }))
      )
    ),
    tap(response => {
      const current = state$.getValue()
      state$.next({
        items: [...current.items, ...response.items],
        page: current.page + 1,
        loading: false,
        hasMore: response.hasMore ?? true,
        error: response.error || null
      })
    })
  )
  
  // 启动加载流
  load$.subscribe()
  
  return {
    state$: state$.asObservable(),
    loadMore: () => loadMore$.next(),
    reset: () => {
      state$.next({
        items: [],
        page: 1,
        loading: false,
        hasMore: true,
        error: null
      })
    },
    destroy: () => {
      loadMore$.complete()
      state$.complete()
    }
  }
}
```

### 使用 Store

```javascript
// 创建 store
const store = createInfiniteScrollStore(page => 
  fetchData(page).pipe(
    map(data => ({
      items: data.items,
      hasMore: data.page < data.totalPages
    }))
  )
)

// 滚动触发加载
createScroll$(window, 300).pipe(
  withLatestFrom(store.state$),
  filter(([_, state]) => !state.loading && state.hasMore)
).subscribe(() => {
  store.loadMore()
})

// 渲染
store.state$.subscribe(state => {
  if (state.loading) {
    showLoading()
  } else {
    hideLoading()
  }
  
  if (state.error) {
    showError(state.error)
  }
  
  renderItems(state.items)
  
  if (!state.hasMore) {
    showEndMessage()
  }
})

// 初始加载
store.loadMore()
```

## 高级功能

### 虚拟滚动

处理大量数据时，只渲染可见区域：

```javascript
function createVirtualScroll(options) {
  const {
    container,
    itemHeight,
    bufferSize = 5,
    items$
  } = options
  
  const containerHeight = container.clientHeight
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  
  const scroll$ = fromEvent(container, 'scroll').pipe(
    throttleTime(16),
    map(() => container.scrollTop),
    startWith(0)
  )
  
  return combineLatest([scroll$, items$]).pipe(
    map(([scrollTop, items]) => {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize)
      const endIndex = Math.min(
        items.length,
        startIndex + visibleCount + bufferSize * 2
      )
      
      return {
        items: items.slice(startIndex, endIndex),
        startIndex,
        totalHeight: items.length * itemHeight,
        offsetY: startIndex * itemHeight
      }
    }),
    distinctUntilChanged((a, b) => 
      a.startIndex === b.startIndex && a.items.length === b.items.length
    )
  )
}

// 使用
const virtualScroll$ = createVirtualScroll({
  container: document.getElementById('virtual-container'),
  itemHeight: 50,
  items$: store.state$.pipe(map(s => s.items))
})

virtualScroll$.subscribe(({ items, totalHeight, offsetY }) => {
  // 设置总高度
  spacer.style.height = `${totalHeight}px`
  
  // 设置偏移
  content.style.transform = `translateY(${offsetY}px)`
  
  // 只渲染可见项
  content.innerHTML = items
    .map(item => `<div class="item" style="height: 50px">${item.name}</div>`)
    .join('')
})
```

### 下拉刷新

```javascript
function createPullToRefresh(element, threshold = 80) {
  let startY = 0
  let pulling = false
  
  const touchStart$ = fromEvent(element, 'touchstart').pipe(
    tap(e => {
      if (element.scrollTop === 0) {
        startY = e.touches[0].clientY
        pulling = true
      }
    })
  )
  
  const touchMove$ = fromEvent(element, 'touchmove').pipe(
    filter(() => pulling),
    map(e => {
      const deltaY = e.touches[0].clientY - startY
      return Math.max(0, Math.min(deltaY, threshold * 1.5))
    }),
    tap(distance => {
      element.style.transform = `translateY(${distance}px)`
    })
  )
  
  const touchEnd$ = fromEvent(element, 'touchend').pipe(
    filter(() => pulling),
    tap(() => {
      element.style.transform = ''
      pulling = false
    })
  )
  
  return touchMove$.pipe(
    takeUntil(touchEnd$),
    last(),
    filter(distance => distance >= threshold),
    repeat()
  )
}

// 使用
const refresh$ = createPullToRefresh(container)

refresh$.subscribe(() => {
  store.reset()
  store.loadMore()
})
```

### 加载更多按钮

备用方案：手动触发加载

```javascript
function createLoadMoreButton(button$, store) {
  return button$.pipe(
    withLatestFrom(store.state$),
    filter(([_, state]) => !state.loading && state.hasMore),
    tap(() => store.loadMore())
  )
}

const loadMoreBtn = document.getElementById('load-more')
const loadMore$ = fromEvent(loadMoreBtn, 'click')

createLoadMoreButton(loadMore$, store).subscribe()

// 动态显示/隐藏按钮
store.state$.subscribe(state => {
  loadMoreBtn.style.display = state.hasMore ? 'block' : 'none'
  loadMoreBtn.disabled = state.loading
  loadMoreBtn.textContent = state.loading ? '加载中...' : '加载更多'
})
```

## 完整组件实现

```javascript
class InfiniteScroll {
  constructor(options) {
    this.options = {
      container: window,
      threshold: 300,
      pageSize: 20,
      ...options
    }
    
    this.state$ = new BehaviorSubject({
      items: [],
      page: 1,
      loading: false,
      hasMore: true,
      error: null
    })
    
    this.loadTrigger$ = new Subject()
    this.subscriptions = []
    
    this.init()
  }
  
  init() {
    // 滚动检测
    const scroll$ = this.createScrollObservable()
    
    // 加载触发（滚动或手动）
    const trigger$ = merge(
      scroll$,
      this.loadTrigger$
    ).pipe(
      withLatestFrom(this.state$),
      filter(([_, state]) => !state.loading && state.hasMore)
    )
    
    // 加载逻辑
    const load$ = trigger$.pipe(
      tap(() => this.updateState({ loading: true, error: null })),
      switchMap(([_, state]) => 
        this.options.fetchFn(state.page, this.options.pageSize).pipe(
          map(response => ({ success: true, ...response })),
          catchError(err => of({ 
            success: false, 
            items: [], 
            hasMore: true,
            error: err.message 
          }))
        )
      ),
      tap(response => {
        const current = this.state$.getValue()
        
        if (response.success) {
          this.updateState({
            items: [...current.items, ...response.items],
            page: current.page + 1,
            loading: false,
            hasMore: response.hasMore
          })
        } else {
          this.updateState({
            loading: false,
            error: response.error
          })
        }
      })
    )
    
    this.subscriptions.push(load$.subscribe())
  }
  
  createScrollObservable() {
    const { container, threshold } = this.options
    
    return fromEvent(container, 'scroll').pipe(
      throttleTime(100),
      map(() => {
        if (container === window) {
          const doc = document.documentElement
          return doc.scrollHeight - doc.scrollTop - doc.clientHeight
        }
        return container.scrollHeight - container.scrollTop - container.clientHeight
      }),
      map(distance => distance < threshold),
      distinctUntilChanged(),
      filter(nearBottom => nearBottom)
    )
  }
  
  updateState(partial) {
    this.state$.next({
      ...this.state$.getValue(),
      ...partial
    })
  }
  
  loadMore() {
    this.loadTrigger$.next()
  }
  
  reset() {
    this.updateState({
      items: [],
      page: 1,
      loading: false,
      hasMore: true,
      error: null
    })
  }
  
  refresh() {
    this.reset()
    this.loadMore()
  }
  
  destroy() {
    this.subscriptions.forEach(s => s.unsubscribe())
    this.state$.complete()
    this.loadTrigger$.complete()
  }
}

// 使用
const infiniteScroll = new InfiniteScroll({
  container: window,
  threshold: 300,
  pageSize: 20,
  fetchFn: (page, size) => fetchApi(page, size)
})

// 渲染
infiniteScroll.state$.subscribe(state => {
  renderList(state)
})

// 初始加载
infiniteScroll.loadMore()
```

## TypeScript 类型

```typescript
interface InfiniteScrollState<T> {
  items: T[]
  page: number
  loading: boolean
  hasMore: boolean
  error: string | null
}

interface InfiniteScrollOptions<T> {
  container: HTMLElement | Window
  threshold?: number
  pageSize?: number
  fetchFn: (page: number, size: number) => Observable<{
    items: T[]
    hasMore: boolean
  }>
}

class InfiniteScroll<T> {
  state$: Observable<InfiniteScrollState<T>>
  
  constructor(options: InfiniteScrollOptions<T>)
  
  loadMore(): void
  reset(): void
  refresh(): void
  destroy(): void
}
```

## 测试

```javascript
describe('InfiniteScroll', () => {
  it('should load more on scroll', async () => {
    const mockFetch = jest.fn()
      .mockReturnValueOnce(of({ items: [1, 2], hasMore: true }))
      .mockReturnValueOnce(of({ items: [3, 4], hasMore: false }))
    
    const scroll = new InfiniteScroll({
      fetchFn: mockFetch
    })
    
    // 初始加载
    scroll.loadMore()
    await delay(0)
    
    expect(scroll.state$.getValue().items).toEqual([1, 2])
    expect(scroll.state$.getValue().hasMore).toBe(true)
    
    // 再次加载
    scroll.loadMore()
    await delay(0)
    
    expect(scroll.state$.getValue().items).toEqual([1, 2, 3, 4])
    expect(scroll.state$.getValue().hasMore).toBe(false)
  })
  
  it('should not load when loading', async () => {
    const mockFetch = jest.fn(() => timer(100).pipe(
      mapTo({ items: [1], hasMore: true })
    ))
    
    const scroll = new InfiniteScroll({ fetchFn: mockFetch })
    
    scroll.loadMore()
    scroll.loadMore()
    scroll.loadMore()
    
    await delay(150)
    
    // 只调用一次
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
```

## 本章小结

- 滚动检测使用 `throttleTime` 优化性能
- 状态管理追踪加载状态和分页
- `filter` 防止重复加载
- 虚拟滚动处理大量数据
- 下拉刷新增强移动端体验

下一章实现实时数据流。
