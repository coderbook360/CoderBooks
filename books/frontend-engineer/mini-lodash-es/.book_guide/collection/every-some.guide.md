# 章节写作指导：集合判断

## 1. 章节信息
- **章节标题**: 集合判断：every 与 some
- **文件名**: collection/every-some.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 26
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 every 的全量匹配机制
- 掌握 some 的存在性匹配机制
- 了解短路求值的性能优势

### 技能目标
- 能够使用判断方法进行条件检查
- 理解 iteratee 简写在判断中的应用

## 3. 内容要点

### 核心函数

#### every
```javascript
function every(collection, predicate) {
  const func = isArray(collection) ? arrayEvery : baseEvery
  return func(collection, baseIteratee(predicate))
}

// arrayEvery - 数组判断
function arrayEvery(array, predicate) {
  let index = -1
  const length = array == null ? 0 : array.length
  
  while (++index < length) {
    if (!predicate(array[index], index, array)) {
      return false  // 短路：发现不满足立即返回
    }
  }
  return true
}

// baseEvery - 通用判断
function baseEvery(collection, predicate) {
  let result = true
  baseEach(collection, (value, key, collection) => {
    result = !!predicate(value, key, collection)
    return result  // false 时中断遍历
  })
  return result
}
```

#### some
```javascript
function some(collection, predicate) {
  const func = isArray(collection) ? arraySome : baseSome
  return func(collection, baseIteratee(predicate))
}

// arraySome - 数组判断
function arraySome(array, predicate) {
  let index = -1
  const length = array == null ? 0 : array.length
  
  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true  // 短路：发现满足立即返回
    }
  }
  return false
}

// baseSome - 通用判断
function baseSome(collection, predicate) {
  let result = false
  baseEach(collection, (value, key, collection) => {
    result = predicate(value, key, collection)
    return !result  // true 时中断遍历
  })
  return !!result
}
```

### 使用示例
```javascript
// every 基本用法
_.every([true, 1, 'yes'], Boolean)
// => true

_.every([true, 0, 'yes'], Boolean)
// => false (0 为 falsy)

// every 对象匹配简写
const users = [
  { name: 'John', active: true },
  { name: 'Jane', active: true }
]
_.every(users, { active: true })
// => true

// every 属性简写
_.every(users, 'active')
// => true

// some 基本用法
_.some([null, 0, 'yes', false], Boolean)
// => true ('yes' 为 truthy)

// some 对象匹配
_.some(users, { name: 'John' })
// => true

// 空集合处理
_.every([], Boolean) // => true (vacuous truth)
_.some([], Boolean)  // => false
```

### every vs some
| 方法 | 语义 | 空集合 | 短路条件 |
|------|------|--------|---------|
| every | 全部满足 | true | 发现 false |
| some | 至少一个 | false | 发现 true |

## 4. 写作要求

### 开篇方式
从"检查数组中是否所有/某些元素满足条件"引入

### 结构组织
```
1. 判断方法概述（300字）
   - every vs some
   - 与原生方法的区别
   
2. every 源码解析（400字）
   - arrayEvery 实现
   - baseEvery 实现
   - 短路机制
   
3. some 源码解析（400字）
   - arraySome 实现
   - baseSome 实现
   - 短路机制
   
4. 空集合与边界情况（300字）
   - vacuous truth
   - null/undefined 处理
   
5. 小结
```

### 代码示例
- 基本用法
- 对象匹配简写
- 空集合处理
- 短路验证

### 图表需求
- every vs some 对比表
- 短路流程图

## 5. 技术细节

### 源码参考
- `every.js`
- `some.js`
- `.internal/arrayEvery.js`
- `.internal/arraySome.js`
- `.internal/baseEvery.js`
- `.internal/baseSome.js`

### 实现要点
- every 使用 && 语义：一个 false 即返回 false
- some 使用 || 语义：一个 true 即返回 true
- 空集合的 every 返回 true（数学逻辑中的 vacuous truth）
- 使用 !! 确保返回布尔值

### 常见问题
- Q: 为什么空数组的 every 返回 true？
- A: 这是数学逻辑中的"空真"(vacuous truth)概念

- Q: every 和 some 支持对象吗？
- A: 支持，会遍历对象的值

## 6. 风格指导

### 语气语调
概念清晰，强调短路优化

### 类比方向
- 将 every 比作"全票通过"
- 将 some 比作"至少一票赞成"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
