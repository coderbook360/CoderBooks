# RouterLink 活动状态

RouterLink 提供 `isActive` 和 `isExactActive` 两种活动状态，用于导航菜单高亮。

## 两种状态的区别

```typescript
// 当前路由: /admin/users

// RouterLink to="/admin"
isActive: true       // 是当前路由的父级
isExactActive: false // 不是精确匹配

// RouterLink to="/admin/users"
isActive: true       // 就是当前路由
isExactActive: true  // 精确匹配
```

## 判断逻辑

**activeRecordIndex**：

```typescript
const activeRecordIndex = computed(() => {
  const { matched } = route.value  // 目标路由的匹配记录
  const { length } = matched
  const routeMatched = matched[length - 1]  // 目标的最后一个匹配
  const currentMatched = currentRoute.matched  // 当前路由的匹配记录
  
  if (!routeMatched || !currentMatched.length) return -1
  
  // 在当前匹配中查找目标
  const index = currentMatched.findIndex(
    isSameRouteRecord.bind(null, routeMatched)
  )
  
  return index
})
```

**isActive**：

```typescript
const isActive = computed(() => {
  // 在匹配链中找到了
  return activeRecordIndex.value > -1 &&
    // 参数也包含
    includesParams(currentRoute.params, route.value.params)
})
```

**isExactActive**：

```typescript
const isExactActive = computed(() => {
  // 是最后一个匹配记录
  return activeRecordIndex.value === currentRoute.matched.length - 1 &&
    // 参数完全相同
    isSameRouteLocationParams(currentRoute.params, route.value.params)
})
```

## isSameRouteRecord

判断两个路由记录是否相同：

```typescript
function isSameRouteRecord(
  a: RouteRecordNormalized,
  b: RouteRecordNormalized
): boolean {
  // 相同记录或互为别名
  return a === b || a.aliasOf === b || b.aliasOf === a
}
```

## includesParams

检查参数包含关系：

```typescript
function includesParams(
  outer: RouteParams,
  inner: RouteParams
): boolean {
  for (const key in inner) {
    const innerValue = inner[key]
    const outerValue = outer[key]
    
    if (typeof innerValue === 'string') {
      if (innerValue !== outerValue) return false
    } else {
      // 数组参数
      if (!Array.isArray(outerValue) ||
        outerValue.length !== innerValue.length ||
        innerValue.some((value, i) => value !== outerValue[i])
      ) {
        return false
      }
    }
  }
  
  return true
}
```

## 示例分析

```typescript
// 路由配置
{
  path: '/admin',
  children: [
    { path: 'users', component: Users },
    { path: 'users/:id', component: UserDetail }
  ]
}

// 当前路由: /admin/users/123
// currentRoute.matched = [Admin, Users, UserDetail]
```

| RouterLink to | activeRecordIndex | isActive | isExactActive |
|---------------|------------------|----------|---------------|
| /admin | 0 | ✅ | ❌ |
| /admin/users | 1 | ✅ | ❌ |
| /admin/users/123 | 2 | ✅ | ✅ |
| /admin/users/456 | 2 | ❌ (params不同) | ❌ |
| /profile | -1 | ❌ | ❌ |

## 类名应用

```typescript
const elClass = computed(() => ({
  // 活动时添加
  [activeClass]: isActive.value,
  // 精确活动时添加
  [exactActiveClass]: isExactActive.value
}))
```

默认类名：
- `router-link-active`
- `router-link-exact-active`

## 自定义类名

全局配置：

```typescript
const router = createRouter({
  linkActiveClass: 'is-active',
  linkExactActiveClass: 'is-current'
})
```

单独配置：

```html
<RouterLink 
  to="/about" 
  activeClass="menu-item-active"
  exactActiveClass="menu-item-current"
>
  About
</RouterLink>
```

## 作用域插槽中使用

```html
<RouterLink to="/admin" v-slot="{ isActive, isExactActive }">
  <li :class="{
    'nav-item': true,
    'nav-item--active': isActive,
    'nav-item--current': isExactActive
  }">
    Admin
  </li>
</RouterLink>
```

## 嵌套菜单示例

```html
<template>
  <nav>
    <RouterLink to="/admin" v-slot="{ isActive }">
      <div :class="{ 'expanded': isActive }">
        Admin
        <ul v-if="isActive">
          <li>
            <RouterLink to="/admin/users" v-slot="{ isExactActive }">
              <a :class="{ 'current': isExactActive }">Users</a>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/admin/settings" v-slot="{ isExactActive }">
              <a :class="{ 'current': isExactActive }">Settings</a>
            </RouterLink>
          </li>
        </ul>
      </div>
    </RouterLink>
  </nav>
</template>
```

## 别名处理

别名路由正确识别为相同记录：

```typescript
{
  path: '/users',
  alias: '/people',
  component: Users
}

// 当前: /users
// RouterLink to="/people"
isActive: true  // 因为 aliasOf 相同
```

## 本章小结

RouterLink 活动状态的要点：

1. **isActive**：目标在当前路由的匹配链中
2. **isExactActive**：目标就是当前路由
3. **参数匹配**：`includesParams` vs `isSameRouteLocationParams`
4. **别名支持**：通过 `aliasOf` 识别
5. **类名配置**：支持全局和单独配置

理解活动状态判断逻辑，有助于实现正确的导航菜单高亮。
