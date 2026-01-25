# RouterView 深度匹配

在嵌套路由中，RouterView 通过深度机制确定应该渲染哪个组件。这是理解嵌套路由工作原理的关键。

## 深度的概念

```vue
<!-- 深度 0 -->
<RouterView />

<!-- 嵌套模板中 -->
<!-- 深度 1 -->
<RouterView />
```

每个 RouterView 渲染 `matched` 数组中对应深度的组件。

## 路由匹配示例

```typescript
const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      { path: 'users', component: AdminUsers },
      { path: 'settings', component: AdminSettings }
    ]
  }
]

// 访问 /admin/users
// matched = [AdminLayout, AdminUsers]
```

## 深度注入机制

```typescript
// RouterView.ts
setup(props) {
  // 获取父级深度，默认 0
  const depth = inject(viewDepthKey, 0)
  
  // 为子组件提供 +1 的深度
  provide(viewDepthKey, depth + 1)
  
  // 根据深度获取匹配记录
  const matchedRouteRef = computed(
    () => routeToDisplay.value.matched[depth]
  )
}
```

## 渲染流程

```
App.vue                     ← RouterView (depth=0)
    ↓
matched[0] = AdminLayout    ← 渲染 AdminLayout
    ↓
AdminLayout 内部            ← RouterView (depth=1)
    ↓
matched[1] = AdminUsers     ← 渲染 AdminUsers
```

## 代码实现

```typescript
return () => {
  const route = routeToDisplay.value
  const matchedRoute = matchedRouteRef.value
  
  // 根据深度获取组件
  const ViewComponent = matchedRoute?.components?.[props.name]
  
  if (!ViewComponent) {
    // 该深度没有匹配的组件
    return slots.default?.({ Component: null, route })
  }

  // 渲染组件
  return h(ViewComponent, componentProps)
}
```

## 动态深度变化

路由切换时，matched 数组可能变化：

```typescript
// /admin/users
matched = [AdminLayout, AdminUsers]

// /profile
matched = [ProfileLayout, ProfileInfo]
```

RouterView 是响应式的，自动重新渲染：

```typescript
const matchedRouteRef = computed(
  () => routeToDisplay.value.matched[depth]
)
```

当 `routeToDisplay` 变化，`matchedRouteRef` 重新计算，触发渲染。

## 命名视图与深度

命名视图在同一深度渲染不同组件：

```typescript
{
  path: '/admin',
  components: {
    default: AdminMain,
    sidebar: AdminSidebar
  }
}
```

```vue
<!-- 两个 RouterView 深度相同 -->
<RouterView />                  <!-- matched[0].components.default -->
<RouterView name="sidebar" />   <!-- matched[0].components.sidebar -->
```

## 深度不匹配的情况

如果深度超出 matched 长度：

```typescript
// matched = [AdminLayout]  // 只有一层
// depth = 1                // 尝试访问第二层

const matchedRoute = matched[1]  // undefined
const ViewComponent = undefined?.components?.[name]  // undefined

// 不渲染任何内容
```

## 提供匹配记录

RouterView 还为子组件提供匹配记录：

```typescript
provide(matchedRouteKey, matchedRouteRef)
```

组件内守卫使用这个信息：

```typescript
function onBeforeRouteLeave(guard: NavigationGuard) {
  const activeRecord = inject(matchedRouteKey)!.value
  
  if (activeRecord) {
    activeRecord.leaveGuards.add(guard)
  }
}
```

## 调试深度问题

```vue
<script setup>
import { inject } from 'vue'
import { viewDepthKey, matchedRouteKey } from 'vue-router'

const depth = inject(viewDepthKey)
const matchedRoute = inject(matchedRouteKey)

console.log('Current depth:', depth)
console.log('Matched route:', matchedRoute.value)
</script>
```

## 常见问题

**组件不渲染**：

```typescript
// 可能原因：
// 1. matched 数组为空（路由未匹配）
// 2. 深度超出 matched 长度
// 3. 命名视图名称不匹配
```

**组件渲染错误**：

```typescript
// 检查 matched 数组
console.log(router.currentRoute.value.matched)
```

## 本章小结

RouterView 深度匹配机制：

1. **深度注入**：通过 `viewDepthKey` 传递和递增深度
2. **matched 索引**：使用深度作为 matched 数组索引
3. **响应式**：matched 变化自动触发重新渲染
4. **命名视图**：同深度可渲染多个组件
5. **提供记录**：为子组件提供 `matchedRouteKey`

理解深度机制是理解嵌套路由的基础。
