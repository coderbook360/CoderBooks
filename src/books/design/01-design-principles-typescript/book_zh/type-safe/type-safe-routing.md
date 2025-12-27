# 类型安全的路由设计

路由是单页应用的骨架。类型安全的路由可以防止链接拼错、参数遗漏。

## 问题：不安全的路由

```typescript
// ❌ 字符串路由，容易出错
<Link to="/user/123/profile">Profile</Link>
<Link to="/users/123/profile">Profile</Link>  // 拼写不一致

navigate('/products?category=electronics&page=1');
// 参数名容易拼错，没有提示
```

## 定义路由类型

```typescript
// ✅ 路由配置
interface RouteDefinitions {
  home: '/';
  users: '/users';
  userDetail: '/users/:userId';
  userProfile: '/users/:userId/profile';
  products: '/products';
  productDetail: '/products/:productId';
  checkout: '/checkout';
}

// 提取路由参数类型
type ExtractParams<S extends string> = 
  S extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams<Rest>
    : S extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

type UserDetailParams = ExtractParams<RouteDefinitions['userDetail']>;
// { userId: string }
```

## 类型安全的路径生成

```typescript
// 路径生成函数
function createPath<K extends keyof RouteDefinitions>(
  route: K,
  params: ExtractParams<RouteDefinitions[K]>
): string {
  let path: string = routeDefinitions[route];
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, value);
  }
  return path;
}

// 使用
const userPath = createPath('userDetail', { userId: '123' });
// '/users/123'

const profilePath = createPath('userProfile', { userId: '456' });
// '/users/456/profile'

// ❌ 类型错误：缺少必要参数
// createPath('userDetail', {});
```

## 类型安全的 Link 组件

```typescript
// 定义 Props
type LinkProps<K extends keyof RouteDefinitions> = {
  to: K;
  params: ExtractParams<RouteDefinitions[K]>;
  children: React.ReactNode;
};

function TypedLink<K extends keyof RouteDefinitions>({
  to,
  params,
  children
}: LinkProps<K>) {
  const path = createPath(to, params);
  return <Link to={path}>{children}</Link>;
}

// 使用
<TypedLink to="userDetail" params={{ userId: '123' }}>
  View User
</TypedLink>

// 无参数路由的简化版
type SimpleLinkProps<K extends keyof RouteDefinitions> = 
  ExtractParams<RouteDefinitions[K]> extends Record<string, never>
    ? { to: K; children: React.ReactNode }
    : { to: K; params: ExtractParams<RouteDefinitions[K]>; children: React.ReactNode };
```

## 查询参数类型

```typescript
// 定义每个路由的查询参数
interface RouteQueries {
  products: {
    category?: string;
    page?: number;
    sort?: 'price' | 'name' | 'date';
  };
  users: {
    role?: 'admin' | 'user';
    status?: 'active' | 'inactive';
  };
}

// 带查询参数的路径生成
function createPathWithQuery<K extends keyof RouteDefinitions>(
  route: K,
  params: ExtractParams<RouteDefinitions[K]>,
  query?: K extends keyof RouteQueries ? RouteQueries[K] : never
): string {
  let path = createPath(route, params);
  if (query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      path += `?${queryString}`;
    }
  }
  return path;
}

// 使用
const path = createPathWithQuery(
  'products',
  {},
  { category: 'electronics', page: 1, sort: 'price' }
);
// '/products?category=electronics&page=1&sort=price'
```

## 类型安全的 useParams

```typescript
function useTypedParams<K extends keyof RouteDefinitions>(
  route: K
): ExtractParams<RouteDefinitions[K]> {
  const params = useParams();
  return params as ExtractParams<RouteDefinitions[K]>;
}

// 在 UserDetail 页面使用
function UserDetailPage() {
  const { userId } = useTypedParams('userDetail');
  // userId 类型是 string
  
  return <div>User: {userId}</div>;
}
```

## 类型安全的 useSearchParams

```typescript
function useTypedSearchParams<K extends keyof RouteQueries>(
  route: K
): [RouteQueries[K], (params: Partial<RouteQueries[K]>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const params: RouteQueries[K] = {} as RouteQueries[K];
  searchParams.forEach((value, key) => {
    (params as any)[key] = value;
  });
  
  const setParams = (newParams: Partial<RouteQueries[K]>) => {
    const merged = { ...params, ...newParams };
    const newSearchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined) {
        newSearchParams.append(key, String(value));
      }
    }
    setSearchParams(newSearchParams);
  };
  
  return [params, setParams];
}

// 使用
function ProductsPage() {
  const [query, setQuery] = useTypedSearchParams('products');
  
  // query.category 类型是 string | undefined
  // query.sort 类型是 'price' | 'name' | 'date' | undefined
  
  return (
    <button onClick={() => setQuery({ page: 2 })}>
      Next Page
    </button>
  );
}
```

## 路由守卫

```typescript
// 定义路由权限
interface RoutePermissions {
  home: 'public';
  users: 'admin';
  userDetail: 'user';
  checkout: 'user';
}

type PublicRoutes = {
  [K in keyof RoutePermissions]: RoutePermissions[K] extends 'public' ? K : never
}[keyof RoutePermissions];

type ProtectedRoutes = Exclude<keyof RoutePermissions, PublicRoutes>;

// 类型安全的守卫组件
function ProtectedRoute<K extends ProtectedRoutes>({
  route,
  children
}: {
  route: K;
  children: React.ReactNode;
}) {
  const permission = routePermissions[route];
  const user = useUser();
  
  if (permission === 'admin' && !user.isAdmin) {
    return <Navigate to="/" />;
  }
  if (permission === 'user' && !user.isLoggedIn) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}
```

## 完整示例

```typescript
// routes.ts
export const routes = {
  home: '/',
  users: '/users',
  userDetail: '/users/:userId',
  products: '/products',
  productDetail: '/products/:productId'
} as const;

export type Routes = typeof routes;

// 类型工具
export type RouteName = keyof Routes;
export type RoutePath<K extends RouteName> = Routes[K];
export type RouteParams<K extends RouteName> = ExtractParams<Routes[K]>;

// 导航 hook
export function useTypedNavigate() {
  const navigate = useNavigate();
  
  return function typedNavigate<K extends RouteName>(
    route: K,
    params: RouteParams<K>
  ) {
    navigate(createPath(route, params));
  };
}

// 使用
function UserCard({ userId }: { userId: string }) {
  const navigate = useTypedNavigate();
  
  return (
    <button onClick={() => navigate('userDetail', { userId })}>
      View User
    </button>
  );
}
```

## 总结

**类型安全路由要点**：

- **定义路由表**：所有路由路径集中管理
- **参数提取**：使用模板字面量类型
- **类型化组件**：Link、导航函数都类型安全
- **查询参数**：为每个路由定义查询参数类型

**好处**：
- 路由名自动补全
- 参数不会遗漏
- 重构时自动更新
- 编译时发现路由错误

**记住**：类型安全的路由让页面导航更可靠。
