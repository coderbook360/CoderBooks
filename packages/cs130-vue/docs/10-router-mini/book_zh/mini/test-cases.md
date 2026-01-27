# 测试用例实现

本章实现完整的测试用例，覆盖组件渲染、导航场景、边界情况等。

## 组件测试

使用 Vue Test Utils 测试 RouterView 和 RouterLink：

```typescript
// tests/components/RouterView.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createRouter, createWebHistory, RouterView } from '../../src'

describe('RouterView', () => {
  function createTestRouter(routes: any[]) {
    return createRouter({
      history: createWebHistory(),
      routes
    })
  }
  
  it('渲染匹配的组件', async () => {
    const Home = defineComponent({
      template: '<div>Home</div>'
    })
    
    const router = createTestRouter([
      { path: '/', component: Home }
    ])
    
    const wrapper = mount(RouterView, {
      global: {
        plugins: [router]
      }
    })
    
    await router.isReady()
    
    expect(wrapper.text()).toBe('Home')
  })
  
  it('路由变化时更新组件', async () => {
    const Home = defineComponent({
      template: '<div>Home</div>'
    })
    const About = defineComponent({
      template: '<div>About</div>'
    })
    
    const router = createTestRouter([
      { path: '/', component: Home },
      { path: '/about', component: About }
    ])
    
    const wrapper = mount(RouterView, {
      global: {
        plugins: [router]
      }
    })
    
    await router.isReady()
    expect(wrapper.text()).toBe('Home')
    
    await router.push('/about')
    await nextTick()
    
    expect(wrapper.text()).toBe('About')
  })
  
  it('渲染嵌套路由', async () => {
    const Parent = defineComponent({
      template: '<div>Parent <RouterView /></div>'
    })
    const Child = defineComponent({
      template: '<span>Child</span>'
    })
    
    const router = createTestRouter([
      {
        path: '/parent',
        component: Parent,
        children: [
          { path: 'child', component: Child }
        ]
      }
    ])
    
    const wrapper = mount(RouterView, {
      global: {
        plugins: [router]
      }
    })
    
    await router.push('/parent/child')
    await nextTick()
    
    expect(wrapper.text()).toBe('Parent Child')
  })
  
  it('渲染命名视图', async () => {
    const Header = defineComponent({
      template: '<header>Header</header>'
    })
    const Main = defineComponent({
      template: '<main>Main</main>'
    })
    
    const router = createTestRouter([
      {
        path: '/',
        components: {
          header: Header,
          default: Main
        }
      }
    ])
    
    const App = defineComponent({
      template: `
        <div>
          <RouterView name="header" />
          <RouterView />
        </div>
      `
    })
    
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })
    
    await router.isReady()
    
    expect(wrapper.find('header').text()).toBe('Header')
    expect(wrapper.find('main').text()).toBe('Main')
  })
  
  it('支持作用域插槽', async () => {
    const Home = defineComponent({
      template: '<div>Home</div>'
    })
    
    const router = createTestRouter([
      { path: '/', component: Home }
    ])
    
    const App = defineComponent({
      template: `
        <RouterView v-slot="{ Component, route }">
          <div class="wrapper">
            <component :is="Component" />
            <span class="path">{{ route.path }}</span>
          </div>
        </RouterView>
      `
    })
    
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })
    
    await router.isReady()
    
    expect(wrapper.find('.wrapper').exists()).toBe(true)
    expect(wrapper.find('.path').text()).toBe('/')
  })
})
```

## RouterLink 测试

```typescript
// tests/components/RouterLink.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { createRouter, createWebHistory, RouterLink, RouterView } from '../../src'

describe('RouterLink', () => {
  function createTestRouter(routes: any[]) {
    return createRouter({
      history: createWebHistory(),
      routes
    })
  }
  
  it('渲染为 a 标签', async () => {
    const router = createTestRouter([
      { path: '/', component: {} as any },
      { path: '/about', component: {} as any }
    ])
    
    const wrapper = mount(RouterLink, {
      props: { to: '/about' },
      slots: { default: 'About' },
      global: { plugins: [router] }
    })
    
    expect(wrapper.find('a').exists()).toBe(true)
    expect(wrapper.find('a').attributes('href')).toBe('/about')
    expect(wrapper.text()).toBe('About')
  })
  
  it('点击触发导航', async () => {
    const router = createTestRouter([
      { path: '/', component: {} as any },
      { path: '/about', component: {} as any }
    ])
    
    const wrapper = mount(RouterLink, {
      props: { to: '/about' },
      slots: { default: 'About' },
      global: { plugins: [router] }
    })
    
    await wrapper.find('a').trigger('click')
    
    expect(router.currentRoute.value.path).toBe('/about')
  })
  
  it('应用活动状态类', async () => {
    const router = createTestRouter([
      { path: '/', component: {} as any },
      { path: '/about', component: {} as any }
    ])
    
    await router.push('/about')
    
    const wrapper = mount(RouterLink, {
      props: { to: '/about' },
      slots: { default: 'About' },
      global: { plugins: [router] }
    })
    
    expect(wrapper.find('a').classes()).toContain('router-link-active')
    expect(wrapper.find('a').classes()).toContain('router-link-exact-active')
  })
  
  it('包含匹配时只应用 active 类', async () => {
    const router = createTestRouter([
      { path: '/users', component: {} as any },
      { path: '/users/123', component: {} as any }
    ])
    
    await router.push('/users/123')
    
    const wrapper = mount(RouterLink, {
      props: { to: '/users' },
      slots: { default: 'Users' },
      global: { plugins: [router] }
    })
    
    expect(wrapper.find('a').classes()).toContain('router-link-active')
    expect(wrapper.find('a').classes()).not.toContain('router-link-exact-active')
  })
  
  it('replace 模式不添加历史记录', async () => {
    const router = createTestRouter([
      { path: '/', component: {} as any },
      { path: '/about', component: {} as any }
    ])
    
    const replaceSpy = vi.spyOn(router, 'replace')
    
    const wrapper = mount(RouterLink, {
      props: { to: '/about', replace: true },
      slots: { default: 'About' },
      global: { plugins: [router] }
    })
    
    await wrapper.find('a').trigger('click')
    
    expect(replaceSpy).toHaveBeenCalled()
  })
  
  it('custom 模式使用作用域插槽', async () => {
    const router = createTestRouter([
      { path: '/', component: {} as any },
      { path: '/about', component: {} as any }
    ])
    
    const wrapper = mount(RouterLink, {
      props: { to: '/about', custom: true },
      slots: {
        default: ({ navigate, isActive }) => 
          `<button @click="navigate">Go ${isActive}</button>`
      },
      global: { plugins: [router] }
    })
    
    // custom 模式下不渲染 a 标签
    expect(wrapper.find('a').exists()).toBe(false)
  })
  
  it('不处理带修饰键的点击', async () => {
    const router = createTestRouter([
      { path: '/', component: {} as any },
      { path: '/about', component: {} as any }
    ])
    
    const wrapper = mount(RouterLink, {
      props: { to: '/about' },
      slots: { default: 'About' },
      global: { plugins: [router] }
    })
    
    await wrapper.find('a').trigger('click', { ctrlKey: true })
    
    // 带 Ctrl 的点击不应该触发导航
    expect(router.currentRoute.value.path).toBe('/')
  })
})
```

## 导航场景测试

```typescript
// tests/navigation/scenarios.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createRouter, createWebHistory } from '../../src'

describe('导航场景', () => {
  describe('重定向', () => {
    it('路由配置重定向', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', redirect: '/home' },
          { path: '/home', component: {} as any }
        ]
      })
      
      await router.push('/')
      
      expect(router.currentRoute.value.path).toBe('/home')
    })
    
    it('守卫重定向', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', component: {} as any },
          { path: '/login', component: {} as any },
          { path: '/dashboard', component: {} as any }
        ]
      })
      
      router.beforeEach((to) => {
        if (to.path === '/dashboard') {
          return '/login'
        }
      })
      
      await router.push('/dashboard')
      
      expect(router.currentRoute.value.path).toBe('/login')
    })
  })
  
  describe('取消导航', () => {
    it('守卫返回 false 取消导航', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', component: {} as any },
          { path: '/about', component: {} as any }
        ]
      })
      
      router.beforeEach(() => false)
      
      const result = await router.push('/about')
      
      expect(result?.type).toBe('aborted')
      expect(router.currentRoute.value.path).toBe('/')
    })
    
    it('新导航取消进行中的导航', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', component: {} as any },
          { path: '/a', component: {} as any },
          { path: '/b', component: {} as any }
        ]
      })
      
      // 模拟慢速守卫
      let resolveGuard: () => void
      router.beforeEach(async () => {
        await new Promise<void>(r => { resolveGuard = r })
      })
      
      const nav1 = router.push('/a')
      const nav2 = router.push('/b')
      
      // 让两个导航都完成
      resolveGuard!()
      resolveGuard!()
      
      const [result1] = await Promise.all([nav1, nav2])
      
      expect(result1?.type).toBe('cancelled')
    })
  })
  
  describe('错误处理', () => {
    it('守卫抛出错误', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', component: {} as any },
          { path: '/error', component: {} as any }
        ]
      })
      
      const error = new Error('Navigation error')
      router.beforeEach(() => { throw error })
      
      const errorHandler = vi.fn()
      router.onError(errorHandler)
      
      await expect(router.push('/error')).rejects.toThrow('Navigation error')
      expect(errorHandler).toHaveBeenCalledWith(error)
    })
  })
  
  describe('动态路由', () => {
    it('运行时添加路由', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: []
      })
      
      router.addRoute({ path: '/new', component: {} as any })
      
      await router.push('/new')
      
      expect(router.currentRoute.value.path).toBe('/new')
    })
    
    it('添加子路由', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/parent', name: 'parent', component: {} as any }
        ]
      })
      
      router.addRoute('parent', { path: 'child', component: {} as any })
      
      await router.push('/parent/child')
      
      expect(router.currentRoute.value.matched).toHaveLength(2)
    })
  })
})
```

## 边界情况测试

```typescript
// tests/edge-cases.test.ts
import { describe, it, expect } from 'vitest'
import { createRouter, createWebHistory } from '../src'

describe('边界情况', () => {
  it('空路由配置', () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: []
    })
    
    expect(router.getRoutes()).toHaveLength(0)
  })
  
  it('未找到路由', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: {} as any }
      ]
    })
    
    await router.push('/not-found')
    
    expect(router.currentRoute.value.matched).toHaveLength(0)
  })
  
  it('特殊字符路径', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/users/:id', component: {} as any }
      ]
    })
    
    await router.push('/users/hello%20world')
    
    expect(router.currentRoute.value.params.id).toBe('hello world')
  })
  
  it('查询字符串保留', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/search', component: {} as any }
      ]
    })
    
    await router.push('/search?q=test&page=1')
    
    expect(router.currentRoute.value.query).toEqual({
      q: 'test',
      page: '1'
    })
  })
  
  it('hash 保留', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/docs', component: {} as any }
      ]
    })
    
    await router.push('/docs#section-1')
    
    expect(router.currentRoute.value.hash).toBe('#section-1')
  })
  
  it('同名参数多次出现', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/filter', component: {} as any }
      ]
    })
    
    await router.push('/filter?tag=a&tag=b')
    
    expect(router.currentRoute.value.query.tag).toEqual(['a', 'b'])
  })
  
  it('连续快速导航', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/a', component: {} as any },
        { path: '/b', component: {} as any },
        { path: '/c', component: {} as any }
      ]
    })
    
    // 快速连续导航
    router.push('/a')
    router.push('/b')
    await router.push('/c')
    
    expect(router.currentRoute.value.path).toBe('/c')
  })
})
```

## 运行测试

```bash
# 运行所有测试
npx vitest

# 运行特定测试文件
npx vitest tests/matcher

# 监视模式
npx vitest --watch

# 生成覆盖率报告
npx vitest --coverage
```

## 本章小结

测试用例的设计原则：

1. **隔离性**：每个测试独立，不依赖其他测试的状态
2. **可读性**：测试名称清晰描述测试意图
3. **边界覆盖**：测试正常情况和异常情况
4. **真实场景**：模拟实际使用中的场景
5. **快速反馈**：测试应该快速执行

完善的测试是代码质量的保障，也是重构的安全网。
