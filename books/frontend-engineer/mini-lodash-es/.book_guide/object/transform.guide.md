# 章节写作指导：对象转换

## 1. 章节信息
- **章节标题**: 对象转换：mapKeys、mapValues、invert
- **文件名**: object/transform.md
- **所属部分**: 第五部分 - 对象方法
- **章节序号**: 33
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 mapKeys 和 mapValues 的转换机制
- 掌握 invert 的键值反转原理
- 了解 transform 的通用转换能力

### 技能目标
- 能够使用转换方法处理对象结构
- 理解各方法的实现模式

## 3. 内容要点

### 核心函数

#### mapKeys
```javascript
// mapKeys - 转换键名
function mapKeys(object, iteratee) {
  const result = {}
  iteratee = baseIteratee(iteratee)
  
  baseForOwn(object, (value, key, object) => {
    baseAssignValue(result, iteratee(value, key, object), value)
  })
  return result
}
```

#### mapValues
```javascript
// mapValues - 转换值
function mapValues(object, iteratee) {
  const result = {}
  iteratee = baseIteratee(iteratee)
  
  baseForOwn(object, (value, key, object) => {
    baseAssignValue(result, key, iteratee(value, key, object))
  })
  return result
}
```

#### invert / invertBy
```javascript
// invert - 键值反转
function invert(object) {
  const result = {}
  baseForOwn(object, (value, key) => {
    result[value] = key
  })
  return result
}

// invertBy - 带分组的键值反转
function invertBy(object, iteratee) {
  const result = {}
  iteratee = baseIteratee(iteratee)
  
  baseForOwn(object, (value, key) => {
    const invertedKey = iteratee(value)
    if (hasOwnProperty.call(result, invertedKey)) {
      result[invertedKey].push(key)
    } else {
      result[invertedKey] = [key]
    }
  })
  return result
}
```

#### transform
```javascript
// transform - 通用转换
function transform(object, iteratee, accumulator) {
  const isArr = isArray(object)
  const isArrLike = isArr || isBuffer(object) || isTypedArray(object)
  
  // 默认累积器
  if (accumulator == null) {
    if (isArrLike) {
      accumulator = isArr ? [] : new object.constructor(object.length)
    } else if (isObject(object)) {
      accumulator = isFunction(object.constructor) && !isPrototype(object)
        ? Object.create(getPrototype(object))
        : {}
    } else {
      accumulator = {}
    }
  }
  
  // 遍历并转换
  (isArrLike ? arrayEach : baseForOwn)(object, (value, key, object) => {
    return iteratee(accumulator, value, key, object)
  })
  
  return accumulator
}
```

### 使用示例
```javascript
// mapKeys - 转换键名
_.mapKeys({ a: 1, b: 2 }, (v, k) => k + v)
// => { a1: 1, b2: 2 }

// mapValues - 转换值
_.mapValues({ a: 1, b: 2 }, n => n * 2)
// => { a: 2, b: 4 }

// mapValues 属性简写
const users = { john: { age: 30 }, jane: { age: 25 } }
_.mapValues(users, 'age')
// => { john: 30, jane: 25 }

// invert - 键值反转
_.invert({ a: 1, b: 2 })
// => { 1: 'a', 2: 'b' }

// invertBy - 分组反转
_.invertBy({ a: 1, b: 2, c: 1 })
// => { 1: ['a', 'c'], 2: ['b'] }

// transform - 通用转换
_.transform({ a: 1, b: 2, c: 1 }, (result, value, key) => {
  (result[value] || (result[value] = [])).push(key)
}, {})
// => { 1: ['a', 'c'], 2: ['b'] }
```

### 方法对比
| 方法 | 操作 | 返回值 |
|------|------|--------|
| mapKeys | 转换键 | 新对象 |
| mapValues | 转换值 | 新对象 |
| invert | 键值互换 | 新对象 |
| transform | 自定义转换 | 累积器 |

## 4. 写作要求

### 开篇方式
从"如何批量转换对象的键或值"引入

### 结构组织
```
1. 对象转换概述（300字）
   - 各方法的用途
   - 应用场景
   
2. mapKeys 源码解析（300字）
   - 键名转换逻辑
   
3. mapValues 源码解析（400字）
   - 值转换逻辑
   - 属性简写支持
   
4. invert/invertBy 源码解析（400字）
   - 键值反转
   - 分组处理
   
5. transform 源码解析（500字）
   - 通用转换模式
   - 累积器初始化
   
6. 小结
```

### 代码示例
- 各方法基本用法
- 属性简写
- transform 实现其他方法

### 图表需求
- 方法操作对比图
- transform 流程图

## 5. 技术细节

### 源码参考
- `mapKeys.js`, `mapValues.js`
- `invert.js`, `invertBy.js`
- `transform.js`
- `.internal/baseForOwn.js`

### 实现要点
- mapKeys/mapValues 都使用 baseForOwn 遍历
- invert 遇到重复值后面会覆盖前面
- invertBy 使用数组收集重复值
- transform 支持返回 false 中断遍历

### 常见问题
- Q: invert 遇到重复值怎么办？
- A: 后面的覆盖前面的，用 invertBy 可以保留所有

## 6. 风格指导

### 语气语调
功能对比，实用导向

### 类比方向
- 将 mapValues 比作"批量加工"
- 将 invert 比作"镜像翻转"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
