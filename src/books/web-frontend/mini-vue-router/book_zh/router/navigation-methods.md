# push 与 replace 导航

实现两个核心导航方法。

```typescript
async function push(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  return pushWithRedirect(to);
}

async function replace(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  return push({ ...to, replace: true });
}

async function pushWithRedirect(to: RouteLocationRaw) {
  const targetLocation = resolve(to);
  const from = currentRoute.value;
  
  try {
    await navigate(targetLocation, from);
    return;
  } catch (error) {
    if (error instanceof NavigationRedirect) {
      return pushWithRedirect(error.to);
    }
    throw error;
  }
}
```

**Promise 化**：返回 Promise，可以 `await` 等待导航完成。

下一章实现 go、back、forward 方法。
