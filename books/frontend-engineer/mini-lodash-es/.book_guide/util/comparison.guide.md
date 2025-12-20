# 章节写作指导：比较工具

## 1. 章节信息
- **章节标题**: 比较工具：eq、isEqual、isMatch
- **文件名**: util/comparison.md
- **所属部分**: 第九部分 - 工具方法
- **章节序号**: 56
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 SameValueZero 比较算法
- 掌握深度相等比较的实现原理
- 了解部分匹配与完全匹配的区别

### 技能目标
- 能够选择合适的比较方法
- 理解 isEqual 的递归比较机制

## 3. 内容要点

### 核心函数

#### eq
```javascript
// eq - SameValueZero 比较
function eq(value, other) {
  return value === other || (value !== value && other !== other)
}

// 解释：
// value === other：普通相等
// value !== value && other !== other：两个都是 NaN
```

#### isEqual / isEqualWith
```javascript
// isEqual - 深度相等比较
function isEqual(value, other) {
  return baseIsEqual(value, other)
}

// baseIsEqual - 核心实现
function baseIsEqual(value, other, bitmask, customizer, stack) {
  // 相同引用
  if (value === other) {
    return true
  }
  
  // 处理 null 和非对象
  if (value == null || other == null || 
      (!isObjectLike(value) && !isObjectLike(other))) {
    return value !== value && other !== other  // NaN 比较
  }
  
  return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack)
}

// baseIsEqualDeep - 深度比较
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
  const objTag = getTag(object)
  const othTag = getTag(other)
  
  // 类型不同
  if (objTag !== othTag) {
    return false
  }
  
  // 根据类型分别处理
  switch (objTag) {
    case '[object Array]':
      return equalArrays(object, other, bitmask, customizer, equalFunc, stack)
    case '[object Object]':
      return equalObjects(object, other, bitmask, customizer, equalFunc, stack)
    case '[object Map]':
      return equalMaps(object, other, bitmask, customizer, equalFunc, stack)
    case '[object Set]':
      return equalSets(object, other, bitmask, customizer, equalFunc, stack)
    // ... 其他类型
  }
}
```

#### isMatch / isMatchWith
```javascript
// isMatch - 部分匹配
function isMatch(object, source) {
  return object === source || baseIsMatch(object, source, getMatchData(source))
}

// baseIsMatch - 只检查 source 中的属性
function baseIsMatch(object, source, matchData) {
  const { length } = matchData
  
  if (object == null) {
    return !length
  }
  
  for (let index = 0; index < length; index++) {
    const [key, value, isStrict] = matchData[index]
    const objValue = object[key]
    
    if (isStrict) {
      if (objValue !== value) return false
    } else {
      if (!(key in object) || !baseIsEqual(objValue, value, PARTIAL_COMPARE)) {
        return false
      }
    }
  }
  
  return true
}
```

### 使用示例
```javascript
// eq - SameValueZero
_.eq('a', 'a')      // => true
_.eq(NaN, NaN)      // => true ✓ (不同于 ===)
_.eq('a', Object('a'))  // => false

// isEqual - 深度比较
const obj1 = { a: 1, b: { c: 2 } }
const obj2 = { a: 1, b: { c: 2 } }
_.isEqual(obj1, obj2)  // => true

_.isEqual([1, 2, 3], [1, 2, 3])  // => true
_.isEqual(new Date(2024, 1, 1), new Date(2024, 1, 1))  // => true
_.isEqual(/abc/g, /abc/g)  // => true

// isEqual 不同类型
_.isEqual({ a: 1 }, { a: '1' })  // => false

// isEqualWith - 自定义比较
_.isEqualWith(obj1, obj2, (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.001  // 数值近似比较
  }
})

// isMatch - 部分匹配
const object = { a: 1, b: 2, c: 3 }
_.isMatch(object, { a: 1, b: 2 })  // => true
_.isMatch(object, { a: 1, b: 3 })  // => false

// isMatch 嵌套
_.isMatch({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })  // => true
```

### 比较方法对照
| 方法 | 比较类型 | 说明 |
|------|---------|------|
| eq | SameValueZero | 类似 ===，但 NaN === NaN |
| isEqual | 深度相等 | 完全匹配所有属性 |
| isMatch | 部分匹配 | 只检查 source 的属性 |

## 4. 写作要求

### 开篇方式
从 JavaScript 中相等比较的复杂性引入

### 结构组织
```
1. 比较工具概述（300字）
   - === 的局限性
   - Lodash 的解决方案
   
2. eq 源码解析（300字）
   - SameValueZero 算法
   - NaN 的处理
   
3. isEqual 源码解析（600字）
   - baseIsEqual 入口
   - baseIsEqualDeep 类型分发
   - 循环引用处理
   
4. isMatch 源码解析（400字）
   - 部分匹配规则
   - getMatchData 优化
   
5. 实际应用场景（300字）

6. 小结
```

### 代码示例
- 各方法基本用法
- 各种类型的比较
- 自定义比较器

### 图表需求
- 比较方法对照表
- isEqual 类型分发流程图

## 5. 技术细节

### 源码参考
- `eq.js`
- `isEqual.js`, `isEqualWith.js`
- `isMatch.js`, `isMatchWith.js`
- `.internal/baseIsEqual.js`
- `.internal/baseIsEqualDeep.js`
- `.internal/equalArrays.js`
- `.internal/equalObjects.js`

### 实现要点
- eq 使用 NaN !== NaN 检测 NaN
- isEqual 使用 Stack 处理循环引用
- 不同类型使用不同的比较函数
- isMatch 是 isEqual 的部分匹配版本

### 常见问题
- Q: isEqual 能比较循环引用的对象吗？
- A: 能，使用 Stack 记录已比较的对象

- Q: isMatch 和 isEqual 有什么区别？
- A: isMatch 只检查 source 中的属性，isEqual 检查所有属性

## 6. 风格指导

### 语气语调
深入讲解，强调边界情况

### 类比方向
- 将 isEqual 比作"全面体检"
- 将 isMatch 比作"部分检查"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
