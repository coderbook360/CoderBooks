---
sidebar_position: 95
title: "自动补全搜索"
---

# 自动补全搜索

本章实现一个经典的自动补全搜索功能。

## 需求分析

自动补全搜索的核心挑战：

1. **防抖**：用户停止输入后再搜索
2. **取消过期请求**：新请求取消旧请求
3. **最小长度**：输入太短不搜索
4. **去重**：相同关键词不重复搜索
5. **错误处理**：搜索失败优雅降级
6. **加载状态**：显示搜索中状态

## 基础实现

### HTML 结构

```html
<div class="autocomplete">
  <input type="text" id="search" placeholder="搜索...">
  <div id="loading" class="hidden">搜索中...</div>
  <ul id="results"></ul>
</div>
```

### 核心逻辑

```javascript
import { 
  fromEvent, 
  of, 
  EMPTY 
} from 'rxjs'
import { 
  debounceTime, 
  distinctUntilChanged, 
  switchMap, 
  map, 
  filter, 
  catchError,
  tap,
  startWith
} from 'rxjs/operators'

// 模拟 API
function searchApi(term) {
  return new Observable(subscriber => {
    const controller = new AbortController()
    
    fetch(`/api/search?q=${term}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        subscriber.next(data)
        subscriber.complete()
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          subscriber.error(err)
        }
      })
    
    return () => controller.abort()
  })
}

// 获取元素
const input = document.getElementById('search')
const loading = document.getElementById('loading')
const results = document.getElementById('results')

// 创建搜索流
const search$ = fromEvent(input, 'input').pipe(
  // 提取输入值
  map(event => event.target.value.trim()),
  
  // 防抖 300ms
  debounceTime(300),
  
  // 去重
  distinctUntilChanged(),
  
  // 最小长度
  filter(term => term.length >= 2),
  
  // 显示加载状态
  tap(() => loading.classList.remove('hidden')),
  
  // 切换到搜索请求，自动取消旧请求
  switchMap(term => 
    searchApi(term).pipe(
      catchError(err => {
        console.error('Search failed:', err)
        return of([])  // 返回空结果
      })
    )
  ),
  
  // 隐藏加载状态
  tap(() => loading.classList.add('hidden'))
)

// 订阅并渲染结果
search$.subscribe(items => {
  results.innerHTML = items
    .map(item => `<li>${item.name}</li>`)
    .join('')
})
```

## 增强版实现

### 搜索状态管理

```javascript
// 状态类型
const SearchState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
}

function createSearchStore(searchFn) {
  const state$ = new BehaviorSubject({
    status: SearchState.IDLE,
    term: '',
    results: [],
    error: null
  })
  
  return {
    state$: state$.asObservable(),
    
    search(term) {
      if (term.length < 2) {
        state$.next({
          status: SearchState.IDLE,
          term: '',
          results: [],
          error: null
        })
        return EMPTY
      }
      
      state$.next({
        ...state$.getValue(),
        status: SearchState.LOADING,
        term
      })
      
      return searchFn(term).pipe(
        tap(results => {
          state$.next({
            status: SearchState.SUCCESS,
            term,
            results,
            error: null
          })
        }),
        catchError(err => {
          state$.next({
            status: SearchState.ERROR,
            term,
            results: [],
            error: err.message
          })
          return EMPTY
        })
      )
    },
    
    clear() {
      state$.next({
        status: SearchState.IDLE,
        term: '',
        results: [],
        error: null
      })
    }
  }
}
```

### 使用搜索 Store

```javascript
const searchStore = createSearchStore(searchApi)

// 输入流
const input$ = fromEvent(input, 'input').pipe(
  map(e => e.target.value.trim()),
  debounceTime(300),
  distinctUntilChanged()
)

// 搜索流
input$.pipe(
  switchMap(term => searchStore.search(term))
).subscribe()

// 渲染状态
searchStore.state$.subscribe(state => {
  switch (state.status) {
    case SearchState.LOADING:
      loading.classList.remove('hidden')
      results.innerHTML = ''
      break
      
    case SearchState.SUCCESS:
      loading.classList.add('hidden')
      results.innerHTML = state.results
        .map(item => `<li>${item.name}</li>`)
        .join('')
      break
      
    case SearchState.ERROR:
      loading.classList.add('hidden')
      results.innerHTML = `<li class="error">${state.error}</li>`
      break
      
    case SearchState.IDLE:
      loading.classList.add('hidden')
      results.innerHTML = ''
      break
  }
})
```

## 高级功能

### 键盘导航

```javascript
function createKeyboardNavigation(results$) {
  const selectedIndex$ = new BehaviorSubject(-1)
  
  const keydown$ = fromEvent(document, 'keydown').pipe(
    filter(e => ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key))
  )
  
  return combineLatest([results$, keydown$]).pipe(
    withLatestFrom(selectedIndex$),
    tap(([[results, event], currentIndex]) => {
      const maxIndex = results.length - 1
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          selectedIndex$.next(Math.min(currentIndex + 1, maxIndex))
          break
          
        case 'ArrowUp':
          event.preventDefault()
          selectedIndex$.next(Math.max(currentIndex - 1, -1))
          break
          
        case 'Enter':
          if (currentIndex >= 0 && results[currentIndex]) {
            selectItem(results[currentIndex])
          }
          break
          
        case 'Escape':
          selectedIndex$.next(-1)
          clearResults()
          break
      }
    }),
    map(() => selectedIndex$.getValue())
  )
}
```

### 搜索历史

```javascript
function createSearchHistory(maxItems = 10) {
  const history$ = new BehaviorSubject(
    JSON.parse(localStorage.getItem('searchHistory') || '[]')
  )
  
  return {
    history$: history$.asObservable(),
    
    add(term) {
      const current = history$.getValue()
      const updated = [term, ...current.filter(t => t !== term)]
        .slice(0, maxItems)
      
      history$.next(updated)
      localStorage.setItem('searchHistory', JSON.stringify(updated))
    },
    
    remove(term) {
      const updated = history$.getValue().filter(t => t !== term)
      history$.next(updated)
      localStorage.setItem('searchHistory', JSON.stringify(updated))
    },
    
    clear() {
      history$.next([])
      localStorage.removeItem('searchHistory')
    }
  }
}

// 集成到搜索
const history = createSearchHistory()

search$.pipe(
  filter(state => state.status === SearchState.SUCCESS),
  map(state => state.term)
).subscribe(term => history.add(term))
```

### 热门搜索

```javascript
function createHotSearches(refreshInterval = 60000) {
  return timer(0, refreshInterval).pipe(
    switchMap(() => fetch('/api/hot-searches').then(r => r.json())),
    shareReplay(1),
    catchError(() => of([]))
  )
}

const hotSearches$ = createHotSearches()

// 显示热门搜索
hotSearches$.subscribe(items => {
  hotContainer.innerHTML = items
    .map(item => `<span class="hot-tag">${item}</span>`)
    .join('')
})
```

## 完整组件实现

```javascript
class AutocompleteSearch {
  constructor(options) {
    this.options = {
      minLength: 2,
      debounceMs: 300,
      maxResults: 10,
      ...options
    }
    
    this.state$ = new BehaviorSubject({
      status: 'idle',
      term: '',
      results: [],
      selectedIndex: -1,
      error: null
    })
    
    this.subscriptions = []
    this.init()
  }
  
  init() {
    const { input, searchFn } = this.options
    
    // 输入流
    const input$ = fromEvent(input, 'input').pipe(
      map(e => e.target.value.trim()),
      debounceTime(this.options.debounceMs),
      distinctUntilChanged()
    )
    
    // 搜索流
    const search$ = input$.pipe(
      tap(term => {
        if (term.length < this.options.minLength) {
          this.updateState({ status: 'idle', results: [], selectedIndex: -1 })
        } else {
          this.updateState({ status: 'loading', term })
        }
      }),
      filter(term => term.length >= this.options.minLength),
      switchMap(term => 
        searchFn(term).pipe(
          map(results => results.slice(0, this.options.maxResults)),
          tap(results => {
            this.updateState({
              status: 'success',
              results,
              selectedIndex: -1
            })
          }),
          catchError(err => {
            this.updateState({
              status: 'error',
              error: err.message,
              results: []
            })
            return EMPTY
          })
        )
      )
    )
    
    // 键盘导航
    const keyboard$ = fromEvent(input, 'keydown').pipe(
      filter(e => ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)),
      tap(e => this.handleKeydown(e))
    )
    
    // 点击外部关闭
    const clickOutside$ = fromEvent(document, 'click').pipe(
      filter(e => !this.options.container.contains(e.target)),
      tap(() => this.close())
    )
    
    this.subscriptions.push(
      search$.subscribe(),
      keyboard$.subscribe(),
      clickOutside$.subscribe()
    )
  }
  
  updateState(partial) {
    this.state$.next({
      ...this.state$.getValue(),
      ...partial
    })
  }
  
  handleKeydown(event) {
    const { results, selectedIndex } = this.state$.getValue()
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.updateState({
          selectedIndex: Math.min(selectedIndex + 1, results.length - 1)
        })
        break
        
      case 'ArrowUp':
        event.preventDefault()
        this.updateState({
          selectedIndex: Math.max(selectedIndex - 1, -1)
        })
        break
        
      case 'Enter':
        if (selectedIndex >= 0 && results[selectedIndex]) {
          this.select(results[selectedIndex])
        }
        break
        
      case 'Escape':
        this.close()
        break
    }
  }
  
  select(item) {
    this.options.onSelect?.(item)
    this.options.input.value = item.name || item
    this.close()
  }
  
  close() {
    this.updateState({
      status: 'idle',
      results: [],
      selectedIndex: -1
    })
  }
  
  destroy() {
    this.subscriptions.forEach(s => s.unsubscribe())
    this.state$.complete()
  }
}

// 使用
const autocomplete = new AutocompleteSearch({
  input: document.getElementById('search'),
  container: document.querySelector('.autocomplete'),
  searchFn: term => searchApi(term),
  onSelect: item => console.log('Selected:', item)
})

// 渲染
autocomplete.state$.subscribe(state => {
  renderResults(state)
})
```

## TypeScript 类型

```typescript
interface SearchState<T> {
  status: 'idle' | 'loading' | 'success' | 'error'
  term: string
  results: T[]
  selectedIndex: number
  error: string | null
}

interface AutocompleteOptions<T> {
  input: HTMLInputElement
  container: HTMLElement
  searchFn: (term: string) => Observable<T[]>
  minLength?: number
  debounceMs?: number
  maxResults?: number
  onSelect?: (item: T) => void
}

class AutocompleteSearch<T> {
  state$: BehaviorSubject<SearchState<T>>
  
  constructor(options: AutocompleteOptions<T>)
  
  select(item: T): void
  close(): void
  destroy(): void
}
```

## 测试用例

```javascript
describe('AutocompleteSearch', () => {
  it('should debounce input', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const input$ = cold('a-b-c------', { a: 'a', b: 'ab', c: 'abc' })
      const expected =    '------c----'
      
      const result$ = input$.pipe(
        debounceTime(3),
        filter(t => t.length >= 2)
      )
      
      expectObservable(result$).toBe(expected, { c: 'abc' })
    })
  })
  
  it('should cancel previous request', async () => {
    const requests = []
    
    const mockSearch = term => {
      requests.push(term)
      return timer(100).pipe(mapTo([{ name: term }]))
    }
    
    const input$ = new Subject()
    const results = []
    
    input$.pipe(
      debounceTime(50),
      switchMap(term => mockSearch(term))
    ).subscribe(r => results.push(r))
    
    input$.next('a')
    await delay(30)
    input$.next('ab')
    await delay(30)
    input$.next('abc')
    await delay(200)
    
    // 只有最后一个请求的结果
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual([{ name: 'abc' }])
  })
})
```

## 本章小结

- 使用 `debounceTime` 防止频繁请求
- 使用 `switchMap` 自动取消过期请求
- 使用 `distinctUntilChanged` 避免重复搜索
- 状态管理使搜索逻辑清晰可测
- 键盘导航提升用户体验

下一章实现无限滚动加载。
