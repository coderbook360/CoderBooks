---
sidebar_position: 107
title: "Marble 图语法"
---

# Marble 图语法

本章介绍 Marble 图的语法规范和使用方法。

## 基础语法

### 字符含义

| 字符 | 含义 | 示例 |
|------|------|------|
| `-` | 时间帧（10ms） | `---` = 30ms |
| `a-z` | 发射值 | `a` = 值 'a' |
| `0-9` | 数字值 | `1` = 值 1 |
| `\|` | 完成 | `a-b-\|` |
| `#` | 错误 | `a-b-#` |
| `()` | 同步分组 | `(ab)` = 同时发射 |
| `^` | 订阅点 | `^---` |
| `!` | 取消订阅点 | `---!` |
| ` ` | 可视分隔（忽略） | `a - b` = `a-b` |

### 时间单位

```
默认一个 - 代表 1 帧 = 10ms

'-'     = 10ms
'--'    = 20ms  
'---'   = 30ms
'a'     = 发射值，占用 0ms
'a-'    = 发射值，然后 10ms
'-a-'   = 10ms，发射值，10ms
```

## 基础示例

### 值发射

```
of(1, 2, 3)
输出: (123|)
解读: 同步发射 1, 2, 3 然后完成

interval(10).pipe(take(3))
输出: -0-1-2|
解读: 每 10ms 发射一个数字，共 3 个
```

### 完成和错误

```
// 正常完成
a-b-c|
   ^发射 a
      ^发射 b  
         ^发射 c
            ^完成

// 错误终止
a-b-#
   ^发射 a
      ^发射 b
         ^错误
```

### 同步分组

```
// 同步发射多个值
(abc|)
^同时发射 a, b, c 并完成

// 混合同步和异步
(ab)-c-|
^同时发射 a, b
    ^10ms 后发射 c
       ^完成
```

## 操作符示例

### map

```
source:   -1-2-3|
map(x => x * 2)
output:   -2-4-6|
```

### filter

```
source:   -1-2-3-4|
filter(x => x % 2 === 0)
output:   ---2---4|
```

### take

```
source:   -a-b-c-d-e-f|
take(3)
output:   -a-b-c|
              ^第 3 个值后完成
```

### skip

```
source:   -a-b-c-d-e|
skip(2)
output:   -----c-d-e|
              ^跳过前 2 个
```

### debounceTime

```
source:   -a-b------c-|
debounceTime(20)
output:   ------b------c|
               ^b 后静默 20ms 才发射
```

### throttleTime

```
source:   -a-b-c------d-|
throttleTime(20)
output:   -a----------d-|
          ^第一个立即发射，然后节流 20ms
```

### delay

```
source:   -a-b-|
delay(20)
output:   ---a-b-|
              ^延迟 20ms
```

### distinctUntilChanged

```
source:   -a-a-b-b-a|
distinctUntilChanged()
output:   -a---b---a|
              ^过滤连续重复
```

## 组合操作符

### merge

```
a$:     -a---b-|
b$:     --1---2|
merge(a$, b$)
output: -a1--b2|
```

### concat

```
a$:     -a-b|
b$:         -1-2|
concat(a$, b$)
output: -a-b-1-2|
            ^a$ 完成后开始 b$
```

### combineLatest

```
a$:     -a----b-|
b$:     --1-2---|
combineLatest([a$, b$])
output: --A-BC--|
          ^[a,1]
            ^[a,2]
              ^[b,2]
```

### zip

```
a$:     -a---b---|
b$:     --1----2-|
zip(a$, b$)
output: --A----B-|
          ^[a,1]
               ^[b,2]
```

### forkJoin

```
a$:     -a-b-|
b$:     --1-2--|
forkJoin([a$, b$])
output: -------X|
               ^[b, 2] 全部完成时发射
```

### withLatestFrom

```
source: -a---b---c|
other:  --1----2--|
source.pipe(withLatestFrom(other))
output: -----B---C|
             ^[b,1]
                 ^[c,2]
```

## 高阶操作符

### switchMap

```
source: -a----b---|
inner:     -1-2|
             -1-2|
switchMap(x => inner)
output: --1-2--1-2|
          ^^^取消旧的，切换到新的
```

### mergeMap

```
source: -a----b---|
inner:     -1-2|
             -1-2|
mergeMap(x => inner)
output: --1-21-2-2|
          ^^^并发执行
```

### concatMap

```
source: -a----b---|
inner:     -1-2|
             -1-2|
concatMap(x => inner)
output: --1-2--1-2|
          ^^^顺序执行
```

### exhaustMap

```
source: -a-b------c|
inner:     -1-2|
exhaustMap(x => inner)
output: --1-2-----1-2|
          ^^^忽略 b（正在执行）
```

## 错误处理

### catchError

```
source: -a-b-#
catchError(() => of('x'))
output: -a-b-(x|)
             ^错误后发射 x 并完成
```

### retry

```
source: -a-#
retry(2)
output: -a--a--a-#
            ^^^^重试 2 次后仍失败
```

## 多播操作符

### share

```
source: -a-b-c|
shared = source.pipe(share())

订阅1: -a-b-c|
订阅2:   -b-c|  (晚 10ms 订阅)
         ^错过 a
```

### shareReplay(1)

```
source: -a-b-c|
shared = source.pipe(shareReplay(1))

订阅1: -a-b-c|
订阅2:   (a)b-c|  (晚 10ms 订阅)
          ^立即收到缓存的 a
```

## Subject 类型

### Subject

```
subject = new Subject()

subject.next('a')  // 无人接收
sub1 = subject.subscribe()
subject.next('b')  // sub1 收到
sub2 = subject.subscribe()
subject.next('c')  // sub1, sub2 都收到

sub1: -b-c
sub2: ---c
```

### BehaviorSubject

```
subject = new BehaviorSubject('init')

sub1 = subject.subscribe()  // 立即收到 'init'
subject.next('a')
sub2 = subject.subscribe()  // 立即收到 'a'
subject.next('b')

sub1: (init)-a-b
sub2: ------(a)b
```

### ReplaySubject(2)

```
subject = new ReplaySubject(2)

subject.next('a')
subject.next('b')
subject.next('c')
sub = subject.subscribe()  // 收到 'b', 'c'
subject.next('d')

sub: (bc)d
     ^^重放最近 2 个
```

## TestScheduler 使用

```typescript
import { TestScheduler } from '../src/testing'

const testScheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected)
})

testScheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
  // cold - 冷 Observable（订阅时开始）
  const source = cold('a-b-c|')
  
  // hot - 热 Observable（有 ^ 订阅点）
  const hot$ = hot('--^-a-b-|')
  
  // 验证输出
  expectObservable(source.pipe(map(x => x.toUpperCase()))).toBe('A-B-C|')
  
  // 验证订阅
  const expected = '^----!'
  expectSubscriptions(source.subscriptions).toBe(expected)
})
```

## Marble 图读写技巧

### 阅读技巧

1. **从左到右**：时间从左向右流动
2. **对齐比较**：上下对齐看输入输出关系
3. **注意括号**：括号内是同步发射
4. **找关键点**：完成 `|`、错误 `#`、订阅 `^`

### 编写技巧

1. **先画输入**：确定源流的时间线
2. **标注关键**：标记重要时间点
3. **推导输出**：根据操作符逻辑推导
4. **验证一致**：检查时间对齐

## 本章小结

- Marble 图是可视化 Observable 时间线的标准语法
- 基础字符：`-`（时间）、值、`|`（完成）、`#`（错误）
- `()` 表示同步分组
- 不同操作符有典型的 Marble 图模式
- TestScheduler 支持 Marble 图测试

下一章：最佳实践总结。
