# createRouterMatcher 实现

前面几章实现了路径解析、参数提取、嵌套路由、优先级排序。本章整合所有功能，实现完整的 `createRouterMatcher`。

## RouterMatcher 接口

```typescript
interface RouterMatcher {
  addRoute(route: RouteRecordRaw, parent?: RouteRecordNormalized): () => void;
  removeRoute(name: string): void;
  getRoutes(): RouteRecordNormalized[];
  resolve(location: string): RouteLocationMatched | null;
}

interface RouteLocationMatched {
  path: string;
  params: Record<string, string | string[]>;
  matched: RouteRecordNormalized[];
}
```

## 完整实现

```typescript
export function createRouterMatcher(routes: RouteRecordRaw[]): RouterMatcher {
  // 所有路由记录（扁平化）
  const matchers: RouteRecordNormalized[] = [];
  
  // 路由名称索引
  const matcherMap = new Map<string, RouteRecordNormalized>();
  
  // 添加路由
  function addRoute(
    route: RouteRecordRaw,
    parent?: RouteRecordNormalized
  ): () => void {
    const normalized = normalizeRouteRecord(route, parent);
    
    // 添加到列表
    matchers.push(normalized);
    
    // 添加到索引
    if (normalized.name) {
      matcherMap.set(normalized.name, normalized);
    }
    
    // 递归添加子路由
    if (route.children) {
      route.children.forEach(child => addRoute(child, normalized));
    }
    
    // 重新排序
    sortRoutes(matchers);
    
    // 返回删除函数
    return () => removeRoute(normalized.name);
  }
  
  // 删除路由
  function removeRoute(name: string) {
    const matcher = matcherMap.get(name);
    if (!matcher) return;
    
    const index = matchers.indexOf(matcher);
    if (index > -1) {
      matchers.splice(index, 1);
    }
    
    matcherMap.delete(name);
  }
  
  // 获取所有路由
  function getRoutes() {
    return matchers;
  }
  
  // 解析路径
  function resolve(location: string): RouteLocationMatched | null {
    // 分离路径和查询参数
    const [path, search = ''] = location.split('?');
    
    // 遍历路由，找到第一个匹配的
    for (const matcher of matchers) {
      const match = path.match(matcher.regex);
      
      if (match) {
        const params = extractParams(match, matcher.keys);
        const query = parseQuery(search);
        
        // 构建匹配链（包括父路由）
        const matched: RouteRecordNormalized[] = [];
        let current: RouteRecordNormalized | undefined = matcher;
        while (current) {
          matched.unshift(current);
          current = current.parent;
        }
        
        return {
          path,
          params,
          query,
          matched
        };
      }
    }
    
    return null;
  }
  
  // 初始化：添加所有路由
  routes.forEach(route => addRoute(route));
  
  return {
    addRoute,
    removeRoute,
    getRoutes,
    resolve
  };
}

// 规范化路由记录
function normalizeRouteRecord(
  route: RouteRecordRaw,
  parent?: RouteRecordNormalized
): RouteRecordNormalized {
  const path = parent
    ? joinPath(parent.path, route.path)
    : route.path;
  
  const { regex, keys, score } = parsePathToRegex(path);
  
  return {
    path,
    name: route.name,
    regex,
    keys,
    score,
    component: route.component,
    parent,
    children: []
  };
}
```

## 使用示例

```typescript
// 创建 Matcher
const matcher = createRouterMatcher([
  {
    path: '/user/:id',
    name: 'User',
    component: User,
    children: [
      {
        path: 'profile',
        name: 'UserProfile',
        component: UserProfile
      }
    ]
  },
  {
    path: '/post/:slug',
    name: 'Post',
    component: Post
  }
]);

// 解析路径
const result = matcher.resolve('/user/123/profile?tab=posts');
console.log(result);
// {
//   path: '/user/123/profile',
//   params: { id: '123' },
//   query: { tab: 'posts' },
//   matched: [
//     { path: '/user/:id', component: User },
//     { path: '/user/:id/profile', component: UserProfile }
//   ]
// }

// 动态添加路由
const removeRoute = matcher.addRoute({
  path: '/admin',
  component: Admin
});

// 删除路由
removeRoute();
```

## 总结

`createRouterMatcher` 整合了：
- ✅ 路径解析与编译
- ✅ 参数提取
- ✅ 嵌套路由
- ✅ 优先级排序
- ✅ 动态添加/删除路由
- ✅ 命名路由索引

这是 Vue Router 最复杂的模块，负责所有的路由匹配逻辑。

下一部分（第16-21章）将实现导航守卫系统。
