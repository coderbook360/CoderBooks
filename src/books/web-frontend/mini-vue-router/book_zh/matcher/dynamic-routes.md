# 动态路由与正则匹配

动态路由是前端路由的核心特性。本章实现支持各种动态匹配模式的路由系统。

## 动态路由类型

### 1. 基础动态参数

```javascript
{ path: '/user/:id', component: User }

// 匹配
'/user/123' -> { id: '123' }
'/user/abc' -> { id: 'abc' }
```

### 2. 自定义正则

```javascript
{ path: '/user/:id(\\d+)', component: User }

// 匹配
'/user/123' -> { id: '123' } ✅
'/user/abc' -> null ❌  (不是数字)
```

### 3. 可选参数

```javascript
{ path: '/user/:id?', component: User }

// 匹配
'/user/123' -> { id: '123' }
'/user' -> { id: undefined }
```

### 4. 可重复参数

```javascript
{ path: '/files/:path+', component: Files }

// 匹配
'/files/a' -> { path: ['a'] }
'/files/a/b/c' -> { path: ['a', 'b', 'c'] }
```

### 5. 通配符

```javascript
{ path: '/:pathMatch(.*)*', component: NotFound }

// 匹配所有未匹配的路径
```

## 实现动态匹配

```typescript
interface CompiledRoute {
  path: string;
  regex: RegExp;
  keys: PathParserKey[];
  score: number[][];
  component: Component;
}

function compileRoute(route: RouteRecordRaw): CompiledRoute {
  const { regex, keys, score } = parsePathToRegex(route.path);
  
  return {
    path: route.path,
    regex,
    keys,
    score,
    component: route.component
  };
}

function matchRoute(url: string, route: CompiledRoute) {
  const match = url.match(route.regex);
  
  if (!match) {
    return null;
  }
  
  return {
    route,
    params: extractParams(match, route.keys)
  };
}

// 使用
const routes = [
  { path: '/user/:id(\\d+)', component: User },
  { path: '/post/:slug', component: Post }
].map(compileRoute);

const result = matchRoute('/user/123', routes[0]);
// { route: {...}, params: { id: '123' } }
```

## 优先级排序

多个路由可能匹配同一 URL，需要确定优先级：

```typescript
function compareScore(a: number[][], b: number[][]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const scoreA = a[i] || [0];
    const scoreB = b[i] || [0];
    
    for (let j = 0; j < Math.max(scoreA.length, scoreB.length); j++) {
      const diff = (scoreB[j] || 0) - (scoreA[j] || 0);
      if (diff !== 0) return diff;
    }
  }
  return 0;
}

// 排序路由
routes.sort((a, b) => compareScore(a.score, b.score));
```

**优先级规则**：
1. 静态段 > 动态段 > 通配符
2. 必选参数 > 可选参数
3. 自定义正则 > 默认正则

## 总结

实现了完整的动态路由匹配：
- 支持各种参数模式
- 自定义正则验证
- 优先级排序

下一章实现嵌套路由。
