# 路径解析与参数提取

基于上一章的原理，本章实现完整的路径解析器和参数提取器。

## 完整的路径解析器

```typescript
interface PathParser {
  regex: RegExp;
  keys: PathParserKey[];
  score: number[][];
}

interface PathParserKey {
  name: string;
  optional: boolean;
  repeatable: boolean;
  pattern?: string;
}

export function parsePathToRegex(path: string): PathParser {
  const keys: PathParserKey[] = [];
  let pattern = '';
  let score: number[][] = [];
  
  // 分段处理
  const segments = path.split('/').filter(Boolean);
  
  for (const segment of segments) {
    // 静态段
    if (!segment.startsWith(':') && !segment.startsWith('*')) {
      pattern += `\\/${segment}`;
      score.push([40]);  // 静态段高分
    }
    // 动态参数
    else if (segment.startsWith(':')) {
      const match = segment.match(/^:([^(]+)(\([^)]+\))?([+*?])?$/);
      const name = match[1];
      const customRegex = match[2]?.slice(1, -1);
      const modifier = match[3];
      
      const key: PathParserKey = {
        name,
        optional: modifier === '?' || modifier === '*',
        repeatable: modifier === '+' || modifier === '*',
        pattern: customRegex
      };
      
      keys.push(key);
      
      const regex = customRegex || '[^/]+';
      
      if (key.optional) {
        pattern += `(?:\\/(${regex}))?`;
        score.push([1]);  // 可选参数低分
      } else {
        pattern += `\\/(${regex})`;
        score.push([30]);  // 必选参数中分
      }
    }
    // 通配符
    else if (segment.startsWith('*')) {
      pattern += '\\/(.*)';
      keys.push({ name: 'pathMatch', optional: true, repeatable: true });
      score.push([0]);  // 通配符最低分
    }
  }
  
  return {
    regex: new RegExp(`^${pattern}$`),
    keys,
    score
  };
}

// 测试
parsePathToRegex('/user/:id(\\d+)');
// {
//   regex: /^\/user\/(\d+)$/,
//   keys: [{ name: 'id', optional: false, repeatable: false, pattern: '\\d+' }],
//   score: [[40], [30]]
// }
```

## 参数提取

```typescript
export function extractParams(
  match: RegExpMatchArray,
  keys: PathParserKey[]
): Record<string, string | string[]> {
  const params: Record<string, any> = {};
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = match[i + 1];
    
    if (value === undefined) {
      continue;
    }
    
    // 可重复参数返回数组
    if (key.repeatable) {
      params[key.name] = value.split('/');
    } else {
      params[key.name] = value;
    }
  }
  
  return params;
}
```

## 查询参数解析

```typescript
export function parseQuery(search: string): Record<string, string | string[]> {
  const query: Record<string, any> = {};
  
  if (!search || search === '?') {
    return query;
  }
  
  const params = new URLSearchParams(search.slice(1));
  
  for (const [key, value] of params.entries()) {
    if (query[key]) {
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }
  
  return query;
}

// 测试
parseQuery('?name=John&age=30&tag=vue&tag=router');
// { name: 'John', age: '30', tag: ['vue', 'router'] }
```

## 总结

实现了完整的路径解析、参数提取和查询参数解析，支持：
- 动态参数
- 自定义正则
- 可选参数
- 可重复参数
- 通配符
- 查询参数

下一章实现动态路由与正则匹配的完整功能。
