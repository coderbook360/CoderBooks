# Marble 图解：可视化 Observable

Marble 图是可视化 Observable 的标准方式，用于理解和测试异步数据流。

## 什么是 Marble 图？

Marble 图使用 ASCII 字符表示 Observable 的时间线：

```
--a--b--c--|
```

- `-`：时间流逝
- `a`, `b`, `c`：发射的值
- `|`：完成
- `#`：错误
- `^`：订阅点

## 基本语法

### 发射值

```
--a--b--c--
```

每个字符代表一个时间单位，字母代表发射的值。

### 完成

```
--a--b--c--|
```

`|` 表示流完成。

### 错误

```
--a--b--#
```

`#` 表示发生错误。

### 同步值

```
(abc)--d--
```

括号内的值同步发射。

### 分组

```
--a--(bc)--d--|
```

`(bc)` 在同一时刻发射。

## 操作符示例

### map

```
源:   --1--2--3--|
map(x => x * 2):
结果: --2--4--6--|
```

### filter

```
源:   --1--2--3--4--|
filter(x => x % 2 === 0):
结果: -----2-----4--|
```

### merge

```
a$:   --1--2--3--|
b$:   ---a--b--c--|
merge(a$, b$):
结果: --1a-2b-3c--|
```

### switchMap

```
源:   --a-----b-----c-|
switchMap(() => --1--2--3|):
结果: --1--2--1--2--1--2--3-|
      └取消  └取消
```

## RxJS 测试语法

```typescript
import { TestScheduler } from 'rxjs/testing'

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected)
})

scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--a--b--c--|')
  const expected =    '--a--b--c--|'
  
  expectObservable(source).toBe(expected)
})
```

### 时间进度

```typescript
cold('--a--b 500ms c--|')
```

可以使用时间单位：
- `ms`：毫秒
- `s`：秒
- `m`：分钟

### 值映射

```typescript
const source = cold('--a--b--c--|', {
  a: 1,
  b: 2,
  c: 3
})
```

## 实战示例

### debounceTime

```
源:       --a-b-c--d---e---|
debounce(20ms):
结果:     -------c-----e---|
```

### throttleTime

```
源:       --a-b-c--d---e---|
throttle(20ms):
结果:     --a-----c----e---|
```

### combineLatest

```
a$:       --1--2--3--|
b$:       ---a--b--c--|
combineLatest([a$, b$]):
结果:     ---1a-2a-2b-3b-3c-|
```

## 调试技巧

### 打印 Marble 图

```typescript
source$.pipe(
  tap(value => console.log(`-${value}`))
).subscribe()
```

### 可视化工具

使用在线工具：
- RxViz: rxviz.com
- RxMarbles: rxmarbles.com

## 总结

- Marble 图是 Observable 的可视化表示
- 使用 ASCII 字符表示时间和值
- 标准语法：`-` 时间，`a` 值，`|` 完成，`#` 错误
- RxJS 提供 TestScheduler 进行 Marble 测试
- 适合理解操作符和编写测试
