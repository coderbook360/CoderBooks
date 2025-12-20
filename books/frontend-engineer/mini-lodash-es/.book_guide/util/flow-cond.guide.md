# 章节写作指导：函数流程工具

## 1. 章节信息
- **章节标题**: 函数流程工具：flow、cond、attempt
- **文件名**: util/flow-cond.md
- **所属部分**: 第九部分 - 工具方法
- **章节序号**: 54
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 flow 的函数组合机制
- 掌握 cond 的条件分支处理
- 了解 attempt 的错误处理

### 技能目标
- 能够使用 flow 创建数据处理管道
- 能够使用 cond 替代复杂的 if-else

## 3. 内容要点

### 核心函数

#### flow / flowRight
```javascript
// flow - 从左到右组合函数
function flow(...funcs) {
  const length = funcs.length
  let index = length
  
  // 验证所有参数都是函数
  while (index--) {
    if (typeof funcs[index] !== 'function') {
      throw new TypeError('Expected a function')
    }
  }
  
  return function(...args) {
    let index = 0
    let result = length ? funcs[index].apply(this, args) : args[0]
    
    while (++index < length) {
      result = funcs[index].call(this, result)
    }
    
    return result
  }
}

// flowRight - 从右到左组合（compose）
function flowRight(...funcs) {
  return flow(...funcs.reverse())
}

// 别名
const pipe = flow
const compose = flowRight
```

#### cond
```javascript
// cond - 条件分支
function cond(pairs) {
  const length = pairs == null ? 0 : pairs.length
  
  pairs = pairs.map(pair => {
    if (typeof pair[1] !== 'function') {
      throw new TypeError('Expected a function')
    }
    return [baseIteratee(pair[0]), pair[1]]
  })
  
  return function(...args) {
    for (const [predicate, transform] of pairs) {
      if (predicate.apply(this, args)) {
        return transform.apply(this, args)
      }
    }
  }
}
```

#### over / overEvery / overSome
```javascript
// over - 调用多个函数，返回结果数组
function over(...iteratees) {
  iteratees = iteratees.map(baseIteratee)
  return function(...args) {
    return iteratees.map(iteratee => iteratee.apply(this, args))
  }
}

// overEvery - 所有函数都返回真值
function overEvery(...iteratees) {
  iteratees = iteratees.map(baseIteratee)
  return function(...args) {
    return iteratees.every(iteratee => iteratee.apply(this, args))
  }
}

// overSome - 任一函数返回真值
function overSome(...iteratees) {
  iteratees = iteratees.map(baseIteratee)
  return function(...args) {
    return iteratees.some(iteratee => iteratee.apply(this, args))
  }
}
```

#### attempt
```javascript
// attempt - 尝试执行函数，捕获错误
function attempt(func, ...args) {
  try {
    return func.apply(undefined, args)
  } catch (e) {
    return isError(e) ? e : new Error(e)
  }
}
```

### 使用示例
```javascript
// flow - 函数管道
const processData = _.flow([
  JSON.parse,
  _.property('data'),
  _.filter({ active: true }),
  _.sortBy('name')
])

processData('{"data":[...]}')

// flowRight - 数学风格组合
const add10 = x => x + 10
const multiply2 = x => x * 2
const subtract5 = x => x - 5

const calculate = _.flowRight([subtract5, multiply2, add10])
calculate(5)  // => 25 ((5 + 10) * 2 - 5)

// cond - 条件分支
const getType = _.cond([
  [_.isArray, _.constant('array')],
  [_.isObject, _.constant('object')],
  [_.isString, _.constant('string')],
  [_.stubTrue, _.constant('other')]
])

getType([])      // => 'array'
getType({})      // => 'object'
getType('hello') // => 'string'
getType(123)     // => 'other'

// over - 多函数调用
const getStats = _.over([Math.min, Math.max, _.sum])
getStats([1, 2, 3, 4, 5])  // => [1, 5, 15]

// overEvery - 组合谓词（AND）
const isValidUser = _.overEvery([
  _.matches({ active: true }),
  _.conforms({ age: n => n >= 18 })
])

// overSome - 组合谓词（OR）
const isSpecialUser = _.overSome([
  _.matches({ role: 'admin' }),
  _.matches({ role: 'moderator' })
])

// attempt - 安全执行
const result = _.attempt(JSON.parse, '{ invalid json }')
if (_.isError(result)) {
  console.log('Parse failed')
}
```

## 4. 写作要求

### 开篇方式
从"函数式编程中的数据管道"引入

### 结构组织
```
1. 函数流程工具概述（300字）
   - 组合与控制流
   
2. flow/flowRight 源码解析（500字）
   - 函数组合原理
   - 执行顺序
   
3. cond 源码解析（400字）
   - 条件-结果对
   - 替代复杂 if-else
   
4. over 系列源码解析（400字）
   - over
   - overEvery/overSome
   
5. attempt 源码解析（300字）
   - 错误捕获
   
6. 小结
```

### 代码示例
- flow 数据管道
- cond 条件分支
- over 系列使用
- attempt 错误处理

### 图表需求
- flow 执行流程图
- cond 分支决策图

## 5. 技术细节

### 源码参考
- `flow.js`, `flowRight.js`
- `cond.js`
- `over.js`, `overEvery.js`, `overSome.js`
- `attempt.js`

### 实现要点
- flow 链式调用，每个函数接收上一个的结果
- flowRight 是 flow 的参数反转版本
- cond 按顺序检查条件，返回第一个匹配的结果
- attempt 将异常转换为 Error 对象返回

### 常见问题
- Q: flow 和 flowRight 有什么区别？
- A: 执行顺序相反，flow 从左到右，flowRight 从右到左

- Q: cond 没有匹配返回什么？
- A: 返回 undefined

## 6. 风格指导

### 语气语调
函数式编程讲解，强调组合思想

### 类比方向
- 将 flow 比作"流水线"
- 将 cond 比作"switch 语句"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
