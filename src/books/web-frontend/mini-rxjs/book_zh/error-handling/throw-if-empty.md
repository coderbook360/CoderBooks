# throwIfEmpty：空值错误

`throwIfEmpty` 在 Observable 完成时如果没有发射任何值，则抛出错误。

## 基本用法

```typescript
of().pipe(
  throwIfEmpty(() => new Error('Observable 是空的'))
).subscribe(
  value => console.log(value),
  error => console.error(error) // Error: Observable 是空的
)
```

## 实现

```typescript
function throwIfEmpty<T>(
  errorFactory: () => any = () => new EmptyError()
) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      let hasValue = false
      
      return source.subscribe({
        next: value => {
          hasValue = true
          subscriber.next(value)
        },
        error: err => subscriber.error(err),
        complete: () => {
          if (hasValue) {
            subscriber.complete()
          } else {
            subscriber.error(errorFactory())
          }
        }
      })
    })
  }
}
```

## 实战场景

### API 验证

```typescript
ajax('/api/user/1').pipe(
  map(response => response.data),
  throwIfEmpty(() => new Error('用户不存在'))
).subscribe(
  user => displayUser(user),
  error => showError(error)
)
```

### 必需数据

```typescript
search(keyword).pipe(
  filter(results => results.length > 0),
  throwIfEmpty(() => new Error('没有找到结果'))
).subscribe()
```

### 配置验证

```typescript
loadConfig().pipe(
  throwIfEmpty(() => new Error('配置文件为空'))
).subscribe(config => applyConfig(config))
```

## 与 defaultIfEmpty 对比

```typescript
// throwIfEmpty: 抛出错误
empty().pipe(
  throwIfEmpty(() => new Error('空'))
)

// defaultIfEmpty: 提供默认值
empty().pipe(
  defaultIfEmpty('默认值')
)
```

## 总结

- 检测空 Observable
- 完成时如果没有值则抛出错误
- 适合验证必需数据
- 与 defaultIfEmpty 互补
