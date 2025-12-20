# 章节写作指导：集合映射

## 1. 章节信息
- **章节标题**: 集合映射：map、flatMap、flatMapDeep
- **文件名**: collection/map.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 20
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Lodash map 与原生 map 的区别
- 掌握 flatMap 的映射+扁平化机制
- 了解不同深度扁平化的实现

### 技能目标
- 能够使用 map 处理数组和对象
- 掌握 iteratee 简写语法的使用

## 3. 内容要点

### 核心函数

#### map
```javascript
function map(collection, iteratee) {
  const func = isArray(collection) ? arrayMap : baseMap
  return func(collection, baseIteratee(iteratee))
}

// arrayMap - 数组映射
function arrayMap(array, iteratee) {
  const length = array == null ? 0 : array.length
  const result = new Array(length)
  
  let index = -1
  while (++index < length) {
    result[index] = iteratee(array[index], index, array)
  }
  return result
}

// baseMap - 通用映射
function baseMap(collection, iteratee) {
  const result = []
  baseEach(collection, (value, key, collection) => {
    result.push(iteratee(value, key, collection))
  })
  return result
}
```

#### flatMap / flatMapDeep / flatMapDepth
```javascript
// flatMap - 映射后扁平化一层
function flatMap(collection, iteratee) {
  return baseFlatten(map(collection, iteratee), 1)
}

// flatMapDeep - 映射后完全扁平化
function flatMapDeep(collection, iteratee) {
  return baseFlatten(map(collection, iteratee), INFINITY)
}

// flatMapDepth - 映射后指定深度扁平化
function flatMapDepth(collection, iteratee, depth) {
  depth = depth === undefined ? 1 : +depth
  return baseFlatten(map(collection, iteratee), depth)
}
```

### 使用示例
```javascript
// map 基本用法
_.map([1, 2, 3], n => n * 2)
// => [2, 4, 6]

// map 遍历对象
_.map({ a: 1, b: 2 }, (v, k) => k + v)
// => ['a1', 'b2']

// map 属性简写
const users = [{ name: 'John' }, { name: 'Jane' }]
_.map(users, 'name')
// => ['John', 'Jane']

// flatMap
_.flatMap([1, 2], n => [n, n])
// => [1, 1, 2, 2]

// flatMapDeep
_.flatMapDeep([1, 2], n => [[n, n]])
// => [1, 1, 2, 2]
```

### iteratee 简写
```javascript
// 属性名简写
_.map(users, 'name')
// 等同于
_.map(users, user => user.name)

// 路径简写
_.map(users, 'address.city')
// 等同于
_.map(users, user => user.address?.city)
```

## 4. 写作要求

### 开篇方式
从原生 map 只能处理数组的限制引入

### 结构组织
```
1. map 概述（300字）
   - 与原生 map 的区别
   - 支持对象映射
   
2. map 源码解析（500字）
   - arrayMap 数组路径
   - baseMap 通用路径
   
3. iteratee 简写机制（400字）
   - baseIteratee 的处理
   - 各种简写形式
   
4. flatMap 系列（500字）
   - flatMap 源码
   - flatMapDeep 源码
   - 与 map + flatten 的关系
   
5. 实际应用场景（300字）

6. 小结
```

### 代码示例
- 基本映射
- 对象映射
- 属性简写
- flatMap 用法

### 图表需求
- map 与 flatMap 对比图
- iteratee 简写对照表

## 5. 技术细节

### 源码参考
- `map.js`
- `flatMap.js`, `flatMapDeep.js`, `flatMapDepth.js`
- `.internal/arrayMap.js`
- `.internal/baseMap.js`
- `.internal/baseFlatten.js`

### 实现要点
- arrayMap 预分配数组长度，性能更好
- baseMap 使用 push，适用于对象
- flatMap = map + baseFlatten(result, 1)
- baseIteratee 处理各种 iteratee 简写

### 常见问题
- Q: map 能处理 null/undefined 吗？
- A: 可以，返回空数组

## 6. 风格指导

### 语气语调
功能讲解结合性能分析

### 类比方向
- 将 map 比作"批量加工"
- 将 flatMap 比作"加工后展平"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
