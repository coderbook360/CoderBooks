# 动态路由与参数

动态路由是现代 Web 应用的标配。你不可能为每个用户、每篇文章、每个商品都定义一个静态路由。`/users/:id` 这样的模式让一个路由配置可以匹配无数个具体路径，同时将变化的部分作为参数传递给组件。

## 参数的语法

Vue Router 使用冒号 `:` 来标记路径中的动态部分：

```javascript
const routes = [
  { path: '/users/:id', component: UserDetail },
  { path: '/posts/:year/:month/:slug', component: BlogPost },
  { path: '/files/:path+', component: FileViewer }
]
```

`:id` 是最简单的参数，匹配单个路径段（斜杠之间的部分）。`:year/:month/:slug` 展示了一个路径可以有多个参数。`:path+` 是可重复参数，可以匹配多个路径段。

参数名遵循 JavaScript 标识符的规则——字母、数字、下划线，不能以数字开头。这样参数就可以作为对象的键来访问。

## 在组件中访问参数

参数会成为路由对象的一部分，可以通过多种方式访问：

```vue
<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
console.log(route.params.id)  // '123' for /users/123
</script>

<template>
  <div>User ID: {{ $route.params.id }}</div>
</template>
```

参数值始终是字符串。即使 URL 是 `/users/123`，`route.params.id` 也是 `'123'` 而不是 `123`。需要数字的话，你得自己转换：

```javascript
const userId = Number(route.params.id)
// 或者使用 parseInt
const userId = parseInt(route.params.id, 10)
```

## 使用 Props 解耦组件与路由

直接在组件中使用 `$route.params` 会让组件与路由耦合。组件只能在路由上下文中使用，也更难测试。Vue Router 提供了 props 选项来解耦：

```javascript
const routes = [
  { 
    path: '/users/:id', 
    component: UserDetail,
    props: true  // 将 params 作为 props 传递
  }
]
```

现在组件可以这样写：

```vue
<script setup>
defineProps({
  id: String
})
</script>
```

组件不再需要知道参数来自路由——它只是接收一个 `id` prop。这让组件可以在非路由场景下复用，测试也更简单：

```javascript
// 测试时直接传递 props
mount(UserDetail, { props: { id: '123' } })
```

props 选项有三种形式：

```javascript
// 布尔值：将所有 params 作为 props
props: true

// 对象：静态 props
props: { newsletter: true }

// 函数：动态计算 props
props: route => ({ 
  id: parseInt(route.params.id),
  query: route.query.q
})
```

函数形式最灵活，可以做类型转换、合并 query 参数等。

## 参数的正则约束

有时候你需要限制参数的格式。比如用户 ID 必须是数字：

```javascript
const routes = [
  // 只匹配数字 ID
  { path: '/users/:id(\\d+)', component: UserDetail },
  
  // 只匹配特定值
  { path: '/posts/:type(draft|published)', component: PostList }
]
```

圆括号里是正则表达式。注意反斜杠需要转义——在 JavaScript 字符串中，`\d` 需要写成 `\\d`。

这个特性可以解决路由冲突问题：

```javascript
const routes = [
  { path: '/users/new', component: UserCreate },      // 静态路径
  { path: '/users/:id(\\d+)', component: UserDetail } // 只匹配数字
]
```

现在 `/users/new` 不会被 `:id` 捕获，因为 `new` 不是数字。

## 可选参数

在参数名后面加 `?` 表示这个参数是可选的：

```javascript
const routes = [
  { path: '/users/:id?', component: UserList }
]
```

这个路由匹配 `/users`（id 为 undefined）和 `/users/123`（id 为 '123'）。

可选参数在分页等场景很有用：

```javascript
// /posts 和 /posts/page/2 都匹配
{ path: '/posts/:page?', component: PostList }
```

组件需要处理参数不存在的情况：

```javascript
const page = parseInt(route.params.page || '1', 10)
```

## 重复参数

`+` 后缀表示参数可以匹配多个路径段：

```javascript
const routes = [
  { path: '/files/:path+', component: FileExplorer }
]

// /files/documents/work/report.pdf
// route.params.path = ['documents', 'work', 'report.pdf']
```

参数值是一个数组，包含所有匹配的段。

`*` 后缀类似，但可以匹配零个或多个段（相当于可选的重复）：

```javascript
{ path: '/files/:path*', component: FileExplorer }

// /files → params.path = []
// /files/a/b/c → params.path = ['a', 'b', 'c']
```

这在实现文件浏览器或面包屑导航时很有用。

## 捕获所有路由（404）

一个常见需求是处理不匹配任何已定义路由的 URL——404 页面：

```javascript
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  // 放在最后，捕获所有未匹配的路由
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound }
]
```

`:pathMatch(.*)* ` 使用正则 `(.*)` 匹配任何字符，`*` 表示可以匹配多段。`pathMatch` 参数会包含完整的未匹配路径：

```javascript
// 访问 /some/random/path
route.params.pathMatch // ['some', 'random', 'path']
```

注意这个路由必须放在最后，否则它会匹配所有 URL，其他路由永远不会被匹配。

## 参数变化的响应

当从 `/users/1` 导航到 `/users/2` 时，组件实例会被复用而不是销毁重建。这是一个性能优化，但也意味着生命周期钩子（如 `onMounted`）不会重新执行。

如果组件需要响应参数变化，有几种方式：

使用 watch 监听 `$route.params`：

```javascript
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(() => route.params.id, (newId, oldId) => {
  // 加载新用户的数据
  fetchUser(newId)
})
```

使用导航守卫：

```javascript
import { onBeforeRouteUpdate } from 'vue-router'

onBeforeRouteUpdate((to, from) => {
  if (to.params.id !== from.params.id) {
    fetchUser(to.params.id)
  }
})
```

使用 `key` 强制重建组件（牺牲性能换取简单性）：

```vue
<RouterView :key="$route.fullPath" />
```

选择哪种方式取决于你的需求。watch 是最通用的，守卫可以在导航完成前执行异步操作，key 最简单但有性能代价。

## 编程式导航与参数

使用 `router.push` 导航时，可以通过多种方式传递参数：

```javascript
// 直接使用路径
router.push('/users/123')

// 使用命名路由 + params
router.push({ name: 'user', params: { id: 123 } })

// 使用路径 + query（注意：path 和 params 不能同时使用）
router.push({ path: '/users', query: { id: 123 } })
```

params 会成为路径的一部分（`/users/123`），query 会成为查询字符串（`/users?id=123`）。选择哪种取决于你的 URL 设计。

一个常见的错误是同时使用 `path` 和 `params`——这是不允许的：

```javascript
// 错误！params 会被忽略
router.push({ path: '/users', params: { id: 123 } })

// 正确：使用 name
router.push({ name: 'user', params: { id: 123 } })

// 或者直接构建完整路径
router.push(`/users/${id}`)
```

## 本章小结

动态路由通过参数让一个路由定义匹配多个 URL。参数可以是简单的单段匹配，也可以有正则约束、可选标记、重复标记。

在组件中，参数可以通过 `$route.params` 访问，但使用 `props: true` 可以让组件与路由解耦，更易于测试和复用。

当组件需要响应参数变化时，由于组件复用的优化，需要使用 watch、导航守卫或 key 来处理。

动态路由是构建数据驱动应用的基础。用户详情页、文章页、商品页——这些都依赖动态路由来根据 URL 加载对应的数据。
