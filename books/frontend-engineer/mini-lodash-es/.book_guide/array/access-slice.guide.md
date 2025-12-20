# 章节写作指导：数组取值与切片

## 1. 章节信息
- **章节标题**: 数组取值：head、last、nth、take、drop
- **文件名**: array/access-slice.md
- **所属部分**: 第三部分 - 数组方法
- **章节序号**: 15
- **预计阅读时间**: 18分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解数组访问方法的设计
- 掌握 take/drop 系列方法的切片逻辑
- 了解 While 变体的条件切片

### 技能目标
- 能够高效地获取数组子集
- 能够实现条件切片功能

## 3. 内容要点

### 核心函数

#### 元素访问
```javascript
// head - 获取第一个元素
function head(array) {
  return (array != null && array.length) ? array[0] : undefined
}

// last - 获取最后一个元素
function last(array) {
  const length = array == null ? 0 : array.length
  return length ? array[length - 1] : undefined
}

// nth - 获取第 n 个元素（支持负索引）
function nth(array, n = 0) {
  const length = array == null ? 0 : array.length
  if (!length) return undefined
  n = toInteger(n)
  return n < 0 ? array[length + n] : array[n]
}
```

#### 切片方法
```javascript
// take - 从开头取 n 个元素
function take(array, n = 1) {
  if (!(array != null && array.length)) return []
  n = toInteger(n)
  return n < 1 ? [] : slice(array, 0, n)
}

// drop - 从开头跳过 n 个元素
function drop(array, n = 1) {
  const length = array == null ? 0 : array.length
  n = toInteger(n)
  return n < 1 ? slice(array, 0) : slice(array, n, length)
}

// initial - 除最后一个外的所有元素
function initial(array) {
  const length = array == null ? 0 : array.length
  return length ? slice(array, 0, -1) : []
}

// tail - 除第一个外的所有元素
function tail(array) {
  const length = array == null ? 0 : array.length
  return length ? slice(array, 1) : []
}
```

### 方法对照表
| 方法 | 作用 | 示例 |
|------|------|------|
| head / first | 第一个元素 | `head([1,2,3])` → `1` |
| last | 最后一个元素 | `last([1,2,3])` → `3` |
| nth | 第 n 个元素 | `nth([1,2,3], -1)` → `3` |
| initial | 除最后一个 | `initial([1,2,3])` → `[1,2]` |
| tail | 除第一个 | `tail([1,2,3])` → `[2,3]` |
| take | 前 n 个 | `take([1,2,3], 2)` → `[1,2]` |
| takeRight | 后 n 个 | `takeRight([1,2,3], 2)` → `[2,3]` |
| drop | 跳过前 n 个 | `drop([1,2,3], 1)` → `[2,3]` |
| dropRight | 跳过后 n 个 | `dropRight([1,2,3], 1)` → `[1,2]` |

## 4. 写作要求

### 开篇方式
以 "获取数组头尾元素是最基础的操作" 引入

### 结构组织
```
1. 元素访问方法（400字）
   - head / last
   - nth 与负索引
   
2. 切片方法（500字）
   - take / takeRight
   - drop / dropRight
   - initial / tail
   
3. While 条件切片（400字）
   - takeWhile / takeRightWhile
   - dropWhile / dropRightWhile
   
4. slice 内部实现（300字）
   - 与原生 slice 的关系
   
5. 与原生方法对比（300字）
   - 安全性处理
   
6. 小结
```

### 代码示例
- 各方法的简洁实现
- 负索引的处理
- While 变体的使用

### 图表需求
- 数组切片示意图
- 方法对照表

## 5. 技术细节

### 源码参考
- `head.js`, `last.js`, `nth.js`
- `take.js`, `takeRight.js`, `takeWhile.js`, `takeRightWhile.js`
- `drop.js`, `dropRight.js`, `dropWhile.js`, `dropRightWhile.js`
- `initial.js`, `tail.js`
- `.internal/slice.js`

### 实现要点
- 所有方法都处理 null/undefined 输入
- nth 支持负索引
- While 变体使用 baseWhile 内部函数

### 常见问题
- Q: head([]) 返回什么？
- A: 返回 undefined，不会报错

## 6. 风格指导

### 语气语调
简洁明了，列表式介绍

### 类比方向
- 将 take/drop 比作 "从牌堆顶部拿牌/弃牌"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
