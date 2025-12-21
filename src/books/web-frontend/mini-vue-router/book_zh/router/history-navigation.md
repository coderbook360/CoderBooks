# go、back、forward 实现

实现历史导航方法。

```typescript
function go(delta: number) {
  history.go(delta);
}

function back() {
  go(-1);
}

function forward() {
  go(1);
}
```

**简单委托**：直接调用 History 的方法。

下一章实现 resolve 方法。
