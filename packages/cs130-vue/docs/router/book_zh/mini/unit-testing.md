# 单元测试设计

测试是保证代码质量的重要手段。本章设计 mini-router 的测试策略，覆盖核心功能的各个方面。

## 测试策略

路由器的测试可以分为几个层次：单元测试验证独立模块的正确性，集成测试验证模块间的协作，端到端测试验证完整的用户场景。

对于 mini-router，我们主要关注单元测试和集成测试。测试框架选择 Vitest，它与 Vue 生态集成良好，API 与 Jest 兼容。

## 测试环境配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts']
  }
})
```

```typescript
// tests/setup.ts
import { vi } from 'vitest'

// 模拟 window.scrollTo
window.scrollTo = vi.fn()

// 模拟 History API
const createMockHistory = () => {
  let state: any = null
  const states: any[] = []
  let index = -1
  
  return {
    get state() { return state },
    get length() { return states.length },
    pushState(s: any, title: string, url: string) {
      index++
      states.splice(index, states.length - index, { state: s, url })
      state = s
    },
    replaceState(s: any, title: string, url: string) {
      states[index] = { state: s, url }
      state = s
    },
    go(delta: number) {
      const newIndex = index + delta
      if (newIndex >= 0 && newIndex < states.length) {
        index = newIndex
        state = states[index].state
        window.dispatchEvent(new PopStateEvent('popstate', { state }))
      }
    }
  }
}

// @ts-ignore
delete window.history
// @ts-ignore
window.history = createMockHistory()
```

## 路径解析器测试

```typescript
// tests/matcher/pathParser.test.ts
import { describe, it, expect } from 'vitest'
import { createPathParser } from '../../src/matcher/pathParser'

describe('createPathParser', () => {
  describe('静态路径', () => {
    it('匹配根路径', () => {
      const parser = createPathParser('/')
      expect(parser.parse('/')).toEqual({})
      expect(parser.parse('/other')).toBeNull()
    })
    
    it('匹配静态路径', () => {
      const parser = createPathParser('/users')
      expect(parser.parse('/users')).toEqual({})
      expect(parser.parse('/users/')).toEqual({})
      expect(parser.parse('/posts')).toBeNull()
    })
    
    it('匹配多段静态路径', () => {
      const parser = createPathParser('/users/list')
      expect(parser.parse('/users/list')).toEqual({})
      expect(parser.parse('/users')).toBeNull()
    })
  })
  
  describe('动态参数', () => {
    it('匹配单个参数', () => {
      const parser = createPathParser('/users/:id')
      expect(parser.parse('/users/123')).toEqual({ id: '123' })
      expect(parser.parse('/users/abc')).toEqual({ id: 'abc' })
      expect(parser.parse('/users')).toBeNull()
    })
    
    it('匹配多个参数', () => {
      const parser = createPathParser('/users/:userId/posts/:postId')
      expect(parser.parse('/users/1/posts/2')).toEqual({
        userId: '1',
        postId: '2'
      })
    })
    
    it('参数带正则约束', () => {
      const parser = createPathParser('/users/:id(\\d+)')
      expect(parser.parse('/users/123')).toEqual({ id: '123' })
      expect(parser.parse('/users/abc')).toBeNull()
    })
  })
  
  describe('可选参数', () => {
    it('匹配可选参数', () => {
      const parser = createPathParser('/users/:id?')
      expect(parser.parse('/users')).toEqual({})
      expect(parser.parse('/users/123')).toEqual({ id: '123' })
    })
  })
  
  describe('路径生成', () => {
    it('生成静态路径', () => {
      const parser = createPathParser('/users')
      expect(parser.stringify({})).toBe('/users')
    })
    
    it('生成动态路径', () => {
      const parser = createPathParser('/users/:id')
      expect(parser.stringify({ id: '123' })).toBe('/users/123')
    })
    
    it('缺少参数抛出错误', () => {
      const parser = createPathParser('/users/:id')
      expect(() => parser.stringify({})).toThrow()
    })
  })
})
```

## 匹配器测试

```typescript
// tests/matcher/matcher.test.ts
import { describe, it, expect } from 'vitest'
import { createRouterMatcher } from '../../src/matcher'

describe('createRouterMatcher', () => {
  describe('addRoute', () => {
    it('添加简单路由', () => {
      const matcher = createRouterMatcher([])
      matcher.addRoute({ path: '/users', component: {} as any })
      
      expect(matcher.getRoutes()).toHaveLength(1)
      expect(matcher.getRoutes()[0].path).toBe('/users')
    })
    
    it('添加嵌套路由', () => {
      const matcher = createRouterMatcher([
        {
          path: '/users',
          component: {} as any,
          children: [
            { path: ':id', component: {} as any }
          ]
        }
      ])
      
      expect(matcher.getRoutes()).toHaveLength(2)
    })
    
    it('添加命名路由', () => {
      const matcher = createRouterMatcher([
        { path: '/users', name: 'users', component: {} as any }
      ])
      
      expect(matcher.getRecordMatcher('users')).toBeDefined()
    })
  })
  
  describe('removeRoute', () => {
    it('移除命名路由', () => {
      const matcher = createRouterMatcher([
        { path: '/users', name: 'users', component: {} as any }
      ])
      
      matcher.removeRoute('users')
      expect(matcher.getRoutes()).toHaveLength(0)
    })
  })
  
  describe('resolve', () => {
    it('解析路径', () => {
      const matcher = createRouterMatcher([
        { path: '/users/:id', name: 'user', component: {} as any }
      ])
      
      const result = matcher.resolve('/users/123', {} as any)
      
      expect(result.path).toBe('/users/123')
      expect(result.params).toEqual({ id: '123' })
    })
    
    it('解析命名路由', () => {
      const matcher = createRouterMatcher([
        { path: '/users/:id', name: 'user', component: {} as any }
      ])
      
      const result = matcher.resolve(
        { name: 'user', params: { id: '123' } },
        {} as any
      )
      
      expect(result.path).toBe('/users/123')
    })
    
    it('构建 matched 数组', () => {
      const matcher = createRouterMatcher([
        {
          path: '/users',
          component: {} as any,
          children: [
            { path: ':id', component: {} as any }
          ]
        }
      ])
      
      const result = matcher.resolve('/users/123', {} as any)
      
      expect(result.matched).toHaveLength(2)
      expect(result.matched[0].path).toBe('/users')
      expect(result.matched[1].path).toBe('/users/:id')
    })
  })
})
```

## History 测试

```typescript
// tests/history/html5.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWebHistory } from '../../src/history/html5'

describe('createWebHistory', () => {
  beforeEach(() => {
    // 重置 location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', search: '', hash: '' },
      writable: true
    })
  })
  
  it('获取初始位置', () => {
    const history = createWebHistory()
    expect(history.location).toBe('/')
  })
  
  it('push 更新位置', () => {
    const history = createWebHistory()
    history.push('/users')
    
    expect(window.history.state.current).toBe('/users')
  })
  
  it('replace 更新位置', () => {
    const history = createWebHistory()
    history.replace('/users')
    
    expect(window.history.state.current).toBe('/users')
    expect(window.history.state.replaced).toBe(true)
  })
  
  it('监听 popstate', async () => {
    const history = createWebHistory()
    const callback = vi.fn()
    
    history.listen(callback)
    history.push('/users')
    history.go(-1)
    
    // 等待事件处理
    await new Promise(r => setTimeout(r, 0))
    
    expect(callback).toHaveBeenCalled()
  })
  
  it('取消监听', () => {
    const history = createWebHistory()
    const callback = vi.fn()
    
    const unsubscribe = history.listen(callback)
    unsubscribe()
    
    history.push('/users')
    history.go(-1)
    
    expect(callback).not.toHaveBeenCalled()
  })
})
```

## Router 测试

```typescript
// tests/router/router.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createRouter } from '../../src/router'
import { createWebHistory } from '../../src/history/html5'

describe('createRouter', () => {
  function createTestRouter(routes = []) {
    return createRouter({
      history: createWebHistory(),
      routes
    })
  }
  
  describe('导航', () => {
    it('push 导航', async () => {
      const router = createTestRouter([
        { path: '/', component: {} as any },
        { path: '/users', component: {} as any }
      ])
      
      await router.push('/users')
      
      expect(router.currentRoute.value.path).toBe('/users')
    })
    
    it('replace 导航', async () => {
      const router = createTestRouter([
        { path: '/', component: {} as any },
        { path: '/users', component: {} as any }
      ])
      
      await router.replace('/users')
      
      expect(router.currentRoute.value.path).toBe('/users')
    })
    
    it('重复导航返回 duplicated', async () => {
      const router = createTestRouter([
        { path: '/users', component: {} as any }
      ])
      
      await router.push('/users')
      const result = await router.push('/users')
      
      expect(result?.type).toBe('duplicated')
    })
  })
  
  describe('守卫', () => {
    it('beforeEach 可以阻止导航', async () => {
      const router = createTestRouter([
        { path: '/', component: {} as any },
        { path: '/users', component: {} as any }
      ])
      
      router.beforeEach(() => false)
      
      const result = await router.push('/users')
      
      expect(result?.type).toBe('aborted')
      expect(router.currentRoute.value.path).toBe('/')
    })
    
    it('beforeEach 可以重定向', async () => {
      const router = createTestRouter([
        { path: '/', component: {} as any },
        { path: '/login', component: {} as any },
        { path: '/users', component: {} as any }
      ])
      
      router.beforeEach((to) => {
        if (to.path === '/users') {
          return '/login'
        }
      })
      
      await router.push('/users')
      
      expect(router.currentRoute.value.path).toBe('/login')
    })
    
    it('afterEach 在导航后调用', async () => {
      const router = createTestRouter([
        { path: '/', component: {} as any },
        { path: '/users', component: {} as any }
      ])
      
      const afterEach = vi.fn()
      router.afterEach(afterEach)
      
      await router.push('/users')
      
      expect(afterEach).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/users' }),
        expect.objectContaining({ path: '/' }),
        undefined
      )
    })
  })
  
  describe('动态路由', () => {
    it('addRoute 添加路由', async () => {
      const router = createTestRouter([])
      
      router.addRoute({ path: '/users', component: {} as any })
      
      expect(router.hasRoute('users')).toBe(false)
      expect(router.getRoutes()).toHaveLength(1)
    })
    
    it('removeRoute 移除路由', async () => {
      const router = createTestRouter([
        { path: '/users', name: 'users', component: {} as any }
      ])
      
      router.removeRoute('users')
      
      expect(router.hasRoute('users')).toBe(false)
    })
  })
})
```

## 测试覆盖率目标

建议的测试覆盖率目标：

- 路径解析器：100%（核心算法，必须完全覆盖）
- 匹配器：95%（复杂逻辑，尽可能覆盖）
- History：90%（需要模拟浏览器环境）
- Router：85%（涉及异步和组件集成）
- 组件：80%（需要 Vue Test Utils）

## 本章小结

测试设计的要点：

1. **分层测试**：单元 → 集成 → 端到端
2. **环境模拟**：模拟 History API 和 window 对象
3. **边界覆盖**：测试正常情况和异常情况
4. **守卫测试**：验证阻止、重定向等行为
5. **异步处理**：正确处理 Promise 和事件

下一章实现具体的测试用例。
