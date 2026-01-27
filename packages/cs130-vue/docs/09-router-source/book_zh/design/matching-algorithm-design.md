# 路由匹配算法设计

当用户访问一个 URL，路由器需要确定渲染哪个组件。这个"确定"的过程就是路由匹配。看起来简单——不就是比较字符串吗？但当你考虑动态参数、嵌套路由、通配符、正则约束等特性时，匹配算法的设计就变得有趣起来。

## 最简单的匹配：精确匹配

最朴素的思路是精确匹配——路径完全相等才算匹配：

```javascript
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/contact', component: Contact }
]

function match(path) {
  return routes.find(route => route.path === path)
}
```

这对静态路由有效，但现实中我们需要动态路由。`/users/123` 和 `/users/456` 应该匹配同一个路由，同时提取出 `123` 或 `456` 作为参数。

## 参数路由的挑战

动态参数让问题复杂起来。考虑这个路由配置：

```javascript
const routes = [
  { path: '/users', component: UserList },
  { path: '/users/:id', component: UserDetail },
  { path: '/users/new', component: UserCreate }
]
```

现在访问 `/users/new`，应该匹配哪个路由？按顺序匹配的话，`/users/:id` 会先匹配（new 被当作 id）。但通常我们期望静态路径 `/users/new` 优先于动态参数 `:id`。

这引出了路由匹配的一个核心问题：优先级。不同的路由框架有不同的策略。Vue Router 选择了一种基于路径"特异性"的排序策略。

## 路径的特异性

Vue Router 给每个路由路径计算一个"分数"，分数越高，特异性越强，优先级越高。规则大致如下：

静态段得分最高。`/users` 比 `/:entity` 更特异，因为它只能匹配确定的路径。

参数段次之。`:id` 比通配符更特异，因为它限制了这一段必须存在。

通配符最低。`*` 或 `(.*)` 可以匹配任何内容，特异性最低。

段数也影响分数。`/users/:id` 比 `/:id` 更特异，因为前者限制了第一段必须是 `users`。

有了这个分数系统，路由器可以自动排序：

```javascript
// 按特异性排序后的匹配顺序
'/users/new'     // 静态路径，最高优先级
'/users/:id'     // 一个静态段 + 一个参数段
'/users'         // 较短，但完全静态
'/:entity/:id'   // 全是参数
'/:pathMatch(.*)*' // 通配符，兜底
```

这种自动排序让开发者不需要操心路由的定义顺序——只要路径设计合理，匹配就会按预期工作。

## 正则表达式：匹配的引擎

实现动态匹配最直接的方式是将路由路径转换为正则表达式。`/users/:id` 变成 `/users/([^/]+)`，其中 `([^/]+)` 匹配一个或多个非斜杠字符。

```javascript
function pathToRegexp(path) {
  // 收集参数名
  const paramNames = []
  
  // 替换参数为捕获组
  const pattern = path.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name)
    return '([^/]+)'
  })
  
  return {
    regexp: new RegExp(`^${pattern}$`),
    paramNames
  }
}

// 使用
const { regexp, paramNames } = pathToRegexp('/users/:id')
const match = '/users/123'.match(regexp)
// match = ['/users/123', '123']
// paramNames = ['id']
// 所以参数是 { id: '123' }
```

这个基础版本已经能处理简单的参数路由。但实际实现需要考虑更多：

参数可以有自定义正则约束。`:id(\\d+)` 表示 id 必须是数字。

可选参数需要处理。`:id?` 表示这个参数可以不存在。

重复参数用于匹配多段。`:chapters+` 可以匹配 `/docs/a/b/c`，参数值为 `['a', 'b', 'c']`。

通配符需要特殊处理。`:pathMatch(.*)` 匹配剩余的所有路径。

Vue Router 使用了一个经过优化的路径解析器来处理这些情况，生成的正则表达式既要正确匹配，又要高效执行。

## 嵌套路由的匹配

嵌套路由给匹配增加了一个维度。考虑这个配置：

```javascript
const routes = [
  {
    path: '/users',
    component: UsersLayout,
    children: [
      { path: '', component: UserList },      // /users
      { path: ':id', component: UserDetail }, // /users/123
      { path: ':id/posts', component: UserPosts } // /users/123/posts
    ]
  }
]
```

匹配 `/users/123/posts` 时，需要返回一个"匹配链"：`UsersLayout` → `UserPosts`。每一级都需要匹配对应的路径段。

嵌套路由的匹配可以看作是递归的过程：

```javascript
function matchRoute(routes, path, parentPath = '') {
  for (const route of routes) {
    const fullPath = parentPath + '/' + route.path
    const { regexp, paramNames } = pathToRegexp(fullPath)
    
    // 精确匹配
    if (regexp.test(path)) {
      return [{ route, params: extractParams(...) }]
    }
    
    // 前缀匹配 + 子路由匹配
    if (route.children && path.startsWith(fullPath)) {
      const childMatch = matchRoute(route.children, path, fullPath)
      if (childMatch) {
        return [{ route, params: extractParams(...) }, ...childMatch]
      }
    }
  }
  
  return null
}
```

实际实现会更复杂，需要处理路径规范化、参数合并、别名等问题。

## 命名路由与路径解析

除了从路径匹配到路由，还需要反向操作：从路由名和参数生成路径。这叫做路径解析或路由反解：

```javascript
// 路由配置
{ name: 'user', path: '/users/:id', component: UserDetail }

// 反解
router.resolve({ name: 'user', params: { id: 123 } })
// 返回 { path: '/users/123', ... }
```

这需要将参数值填回路径模板中：

```javascript
function resolve(route, params) {
  let path = route.path
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, value)
  }
  return path
}
```

反解需要处理的边界情况包括：参数缺失（应该报错还是用默认值？）、参数类型验证（如果路径要求数字参数但传了字符串？）、可选参数的处理等。

## 匹配结果的结构

匹配成功后，路由器需要返回足够的信息供后续使用。Vue Router 的匹配结果包括：

```typescript
interface RouteLocationMatched {
  path: string           // 匹配的路径
  name: string | null    // 路由名
  components: Record<string, Component>  // 组件（可能有多个命名视图）
  meta: Record<string, any>  // 元信息
  params: Record<string, string>  // 提取的参数
  matched: RouteRecordMatched[]  // 匹配链（包含父路由）
}
```

`matched` 数组特别重要——它包含了从根路由到当前路由的所有匹配记录，让嵌套的 `RouterView` 知道应该渲染哪些组件。

## 性能考虑

路由匹配是一个高频操作——每次导航都需要执行。在路由数量较多时，简单的线性搜索可能成为瓶颈。

Vue Router 采用了几种优化策略：

预编译正则。在路由器初始化时就将所有路径模式编译成正则表达式，而不是每次匹配时动态创建。

按特异性预排序。路由在初始化时就按优先级排序，匹配时从最高优先级开始，一旦找到匹配就返回。

缓存匹配结果。对于静态路由，可以缓存路径到路由的映射，避免重复的正则匹配。

对于有数百个路由的大型应用，这些优化可以显著减少匹配时间。

## 本章小结

路由匹配看似简单，实际上涉及多个设计决策：如何处理动态参数、如何决定优先级、如何支持嵌套路由、如何高效执行。

Vue Router 选择了基于特异性的自动排序策略，让开发者不需要操心路由定义顺序。它使用正则表达式作为匹配引擎，在初始化时预编译以优化性能。匹配结果包含完整的信息链，支持嵌套路由的渲染。

理解匹配算法有助于写出更好的路由配置——知道为什么某个路由会被匹配，知道如何组织路由避免冲突，知道如何利用参数约束实现更精确的匹配。
