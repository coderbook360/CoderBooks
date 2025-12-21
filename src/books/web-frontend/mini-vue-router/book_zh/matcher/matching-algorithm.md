# 路由匹配原理与算法

路由匹配是 Vue Router 的核心功能。如何将 `/user/123` 匹配到路由配置 `/user/:id`？本章深入解析匹配算法。

## 路由匹配的本质

**路由匹配** = 将动态 URL 映射到路由配置 + 提取参数

```javascript
// 路由配置
const route = { path: '/user/:id/post/:postId' };

// 输入
const url = '/user/123/post/456';

// 输出
{
  matched: [route],
  params: { id: '123', postId: '456' }
}
```

核心问题：如何高效地匹配和提取参数？

## 方案演进

### 方案1：字符串匹配（❌ 不可行）

```javascript
if (url === route.path) {
  // 匹配成功
}
```

问题：无法处理动态参数。

### 方案2：正则表达式

将路径模式编译为正则表达式：

```javascript
// /user/:id -> /^\/user\/([^\/]+)$/
const regex = /^\/user\/([^\/]+)$/;
const match = url.match(regex);

if (match) {
  const id = match[1];  // '123'
}
```

这是 Vue Router 采用的方案。

## 路径编译流程

**步骤1：解析路径**

```
/user/:id/post/:postId
  ↓
[
  { type: 'static', value: '/user/' },
  { type: 'param', value: 'id' },
  { type: 'static', value: '/post/' },
  { type: 'param', value: 'postId' }
]
```

**步骤2：生成正则表达式**

```
/^\/user\/([^\/]+)\/post\/([^\/]+)$/
```

**步骤3：匹配与提取**

```javascript
const match = url.match(regex);
const params = {
  id: match[1],
  postId: match[2]
};
```

## 实现路径解析器

```typescript
interface PathToken {
  type: 'static' | 'param' | 'wildcard';
  value: string;
  regex?: string;
}

function parsePath(path: string): PathToken[] {
  const tokens: PathToken[] = [];
  let i = 0;
  
  while (i < path.length) {
    // 处理参数
    if (path[i] === ':') {
      i++;
      let value = '';
      while (i < path.length && path[i] !== '/') {
        value += path[i++];
      }
      tokens.push({ type: 'param', value });
    }
    // 处理静态部分
    else {
      let value = '';
      while (i < path.length && path[i] !== ':') {
        value += path[i++];
      }
      if (value) {
        tokens.push({ type: 'static', value });
      }
    }
  }
  
  return tokens;
}

// 测试
parsePath('/user/:id/post/:postId');
// [
//   { type: 'static', value: '/user/' },
//   { type: 'param', value: 'id' },
//   { type: 'static', value: '/post/' },
//   { type: 'param', value: 'postId' }
// ]
```

## 生成正则表达式

```typescript
function tokensToRegex(tokens: PathToken[]): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  let pattern = '^';
  
  for (const token of tokens) {
    if (token.type === 'static') {
      // 转义特殊字符
      pattern += token.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } else if (token.type === 'param') {
      // 参数匹配：非 / 字符
      pattern += '([^/]+)';
      keys.push(token.value);
    }
  }
  
  pattern += '$';
  
  return {
    regex: new RegExp(pattern),
    keys
  };
}

// 测试
const { regex, keys } = tokensToRegex(parsePath('/user/:id'));
console.log(regex);  // /^\/user\/([^/]+)$/
console.log(keys);   // ['id']
```

## 匹配与提取

```typescript
function matchPath(url: string, route: CompiledRoute) {
  const match = url.match(route.regex);
  
  if (!match) {
    return null;
  }
  
  // 提取参数
  const params: Record<string, string> = {};
  for (let i = 0; i < route.keys.length; i++) {
    params[route.keys[i]] = match[i + 1];
  }
  
  return { params };
}

// 测试
const route = {
  path: '/user/:id',
  ...tokensToRegex(parsePath('/user/:id'))
};

matchPath('/user/123', route);  // { params: { id: '123' } }
matchPath('/post/456', route);  // null
```

## 高级特性

### 1. 自定义正则

```javascript
const route = {
  path: '/user/:id(\\d+)'  // 只匹配数字
};
```

### 2. 可选参数

```javascript
const route = {
  path: '/user/:id?'  // id 可选
};
```

### 3. 通配符

```javascript
const route = {
  path: '/docs/:path*'  // 匹配所有子路径
};
```

## 性能优化

### 1. 预编译

路由配置在创建时就编译为正则：

```typescript
const routes = [
  { path: '/user/:id', component: User }
];

// 立即编译
routes.forEach(route => {
  route.regex = compilePathToRegex(route.path);
});
```

### 2. 排序优先级

```typescript
// 静态路由优先
'/user' > '/user/:id' > '/:path*'
```

## 总结

路由匹配的核心：

**路径解析**：将路径字符串解析为 token 数组。

**正则编译**：将 token 编译为正则表达式。

**匹配提取**：用正则匹配 URL 并提取参数。

**优化策略**：预编译、排序、缓存。

下一章详细实现路径解析与参数提取。
