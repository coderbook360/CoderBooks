# 路由优先级与权重计算

当多个路由可能匹配同一 URL 时，需要确定优先级。本章实现路由排序算法。

## 优先级规则

```javascript
const routes = [
  { path: '/user/admin' },      // 1. 完全静态（最高）
  { path: '/user/:id(\\d+)' },  // 2. 带正则的动态
  { path: '/user/:id' },        // 3. 普通动态
  { path: '/user/:id?' },       // 4. 可选参数
  { path: '/:path*' }           // 5. 通配符（最低）
];
```

## 权重计算

每个段都有一个权重数组：

```typescript
const SCORE = {
  STATIC: 40,      // 静态段
  PARAM: 30,       // 必选参数
  CUSTOM_REGEX: 5, // 自定义正则
  OPTIONAL: 1,     // 可选参数
  WILDCARD: 0      // 通配符
};

function calculateScore(tokens: PathToken[]): number[][] {
  const score: number[][] = [];
  
  for (const token of tokens) {
    const segmentScore: number[] = [];
    
    if (token.type === 'static') {
      segmentScore.push(SCORE.STATIC);
    } else if (token.type === 'param') {
      segmentScore.push(SCORE.PARAM);
      if (token.pattern) {
        segmentScore.push(SCORE.CUSTOM_REGEX);
      }
      if (token.optional) {
        segmentScore.push(-SCORE.OPTIONAL);
      }
    } else if (token.type === 'wildcard') {
      segmentScore.push(SCORE.WILDCARD);
    }
    
    score.push(segmentScore);
  }
  
  return score;
}
```

## 路由排序

```typescript
function sortRoutes(routes: CompiledRoute[]) {
  routes.sort((a, b) => {
    // 比较 score
    for (let i = 0; i < Math.max(a.score.length, b.score.length); i++) {
      const scoreA = a.score[i] || [0];
      const scoreB = b.score[i] || [0];
      
      for (let j = 0; j < Math.max(scoreA.length, scoreB.length); j++) {
        const diff = (scoreB[j] || 0) - (scoreA[j] || 0);
        if (diff !== 0) return diff;
      }
    }
    
    // score 相同，比较路径长度
    return b.path.length - a.path.length;
  });
}

// 测试
const routes = [
  { path: '/:path*' },
  { path: '/user/:id' },
  { path: '/user/admin' }
].map(compileRoute);

sortRoutes(routes);
// 结果顺序：
// [
//   { path: '/user/admin' },   // 完全静态优先
//   { path: '/user/:id' },     // 动态其次
//   { path: '/:path*' }        // 通配符最后
// ]
```

## 总结

实现了路由优先级系统：
- 权重计算
- 多维度比较
- 自动排序

下一章整合所有功能，实现完整的 `createRouterMatcher`。
