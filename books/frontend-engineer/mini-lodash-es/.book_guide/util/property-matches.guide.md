# 章节写作指导：属性访问工具

## 1. 章节信息
- **章节标题**: 属性访问工具：property、matchesProperty
- **文件名**: util/property-matches.md
- **所属部分**: 第九部分 - 工具方法
- **章节序号**: 53
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 property 的属性访问机制
- 掌握 matches 和 matchesProperty 的匹配规则
- 了解 method 的方法调用机制

### 技能目标
- 能够使用这些方法创建访问器和匹配器
- 理解在 iteratee 简写中的应用

## 3. 内容要点

### 核心函数

#### property / propertyOf
```javascript
// property - 创建属性访问器
function property(path) {
  return isKey(path)
    ? baseProperty(toKey(path))
    : basePropertyDeep(path)
}

// baseProperty - 浅层访问
function baseProperty(key) {
  return object => object == null ? undefined : object[key]
}

// basePropertyDeep - 深层访问
function basePropertyDeep(path) {
  return object => baseGet(object, path)
}

// propertyOf - 反向版本
function propertyOf(object) {
  return path => object == null ? undefined : baseGet(object, path)
}
```

#### matches / matchesProperty
```javascript
// matches - 创建匹配器
function matches(source) {
  return baseMatches(source)
}

// baseMatches
function baseMatches(source) {
  const matchData = getMatchData(source)
  
  return object => {
    if (object === source) return true
    if (object == null) return false
    
    return matchData.every(([key, value, isStrictMatch]) => {
      if (isStrictMatch) {
        return object[key] === value
      }
      return key in Object(object) && baseIsEqual(object[key], value, PARTIAL_COMPARE)
    })
  }
}

// matchesProperty - 属性匹配器
function matchesProperty(path, srcValue) {
  return baseMatchesProperty(path, srcValue)
}
```

#### method / methodOf
```javascript
// method - 创建方法调用器
function method(path, ...args) {
  return object => invoke(object, path, args)
}

// methodOf - 反向版本
function methodOf(object, ...args) {
  return path => invoke(object, path, args)
}
```

### 使用示例
```javascript
// property - 创建属性访问器
const getName = _.property('name')
getName({ name: 'John' })  // => 'John'

const getDeep = _.property('a.b.c')
getDeep({ a: { b: { c: 1 } } })  // => 1

// 在 map 中使用
const users = [{ name: 'John' }, { name: 'Jane' }]
_.map(users, _.property('name'))  // => ['John', 'Jane']
// 简写形式
_.map(users, 'name')  // => ['John', 'Jane']

// propertyOf - 反向
const object = { a: 1, b: 2 }
const getProp = _.propertyOf(object)
getProp('a')  // => 1

// matches - 对象匹配
const isActive = _.matches({ active: true })
isActive({ name: 'John', active: true })  // => true

// 在 filter 中使用
_.filter(users, _.matches({ age: 30 }))
// 简写形式
_.filter(users, { age: 30 })

// matchesProperty - 属性匹配
const isJohn = _.matchesProperty('name', 'John')
isJohn({ name: 'John' })  // => true

// 简写形式
_.filter(users, ['name', 'John'])

// method - 方法调用
const callToString = _.method('toString')
callToString(123)  // => '123'
```

### iteratee 简写对照
| 简写形式 | 等价调用 | 说明 |
|---------|---------|------|
| `'name'` | `_.property('name')` | 属性访问 |
| `{ age: 30 }` | `_.matches({ age: 30 })` | 对象匹配 |
| `['name', 'John']` | `_.matchesProperty('name', 'John')` | 属性匹配 |

## 4. 写作要求

### 开篇方式
从 "iteratee 简写的原理" 引入

### 结构组织
```
1. 属性访问工具概述（300字）
   - 方法分类
   - 与 iteratee 简写的关系
   
2. property 源码解析（400字）
   - baseProperty
   - basePropertyDeep
   - 路径处理
   
3. matches 源码解析（500字）
   - getMatchData
   - 部分匹配规则
   
4. matchesProperty 源码解析（300字）
   - 属性值匹配
   
5. method 源码解析（300字）
   - 方法调用
   
6. 小结
```

### 代码示例
- 各方法基本用法
- iteratee 简写对照
- 在集合方法中的应用

### 图表需求
- iteratee 简写对照表
- 匹配规则流程图

## 5. 技术细节

### 源码参考
- `property.js`, `propertyOf.js`
- `matches.js`, `matchesProperty.js`
- `method.js`, `methodOf.js`
- `.internal/baseProperty.js`
- `.internal/baseMatches.js`

### 实现要点
- property 区分浅层和深层访问
- matches 使用部分匹配（PARTIAL_COMPARE）
- matchesProperty 是 path + value 的组合
- method 使用 invoke 执行方法

### 常见问题
- Q: _.map(users, 'name') 是怎么工作的？
- A: baseIteratee 将 'name' 转换为 property('name')

- Q: matches 是完全匹配还是部分匹配？
- A: 部分匹配，只要 source 中的属性匹配即可

## 6. 风格指导

### 语气语调
原理讲解，揭示简写机制

### 类比方向
- 将 property 比作"地址"
- 将 matches 比作"模板匹配"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
