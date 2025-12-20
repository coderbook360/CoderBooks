# 章节写作指导：参数预设

## 1. 章节信息
- **章节标题**: 参数预设：partial 与 partialRight
- **文件名**: function/partial.md
- **所属部分**: 第六部分 - 函数方法
- **章节序号**: 39
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 partial application 的概念
- 掌握 partial 和 partialRight 的区别
- 了解占位符的使用

### 技能目标
- 能够使用 partial 创建预设参数的函数
- 理解 partial 与 bind 的区别

## 3. 内容要点

### 核心函数

#### partial
```javascript
// partial - 左侧参数预设
function partial(func, ...partials) {
  const holders = replaceHolders(partials, getHolder(partial))
  return createWrap(func, WRAP_PARTIAL_FLAG, undefined, partials, holders)
}

// 简化实现
function partialSimple(func, ...partials) {
  return function(...args) {
    // 处理占位符
    const finalArgs = partials.map(arg => 
      arg === _ ? args.shift() : arg
    )
    // 追加剩余参数
    return func.apply(this, [...finalArgs, ...args])
  }
}
```

#### partialRight
```javascript
// partialRight - 右侧参数预设
function partialRight(func, ...partials) {
  const holders = replaceHolders(partials, getHolder(partialRight))
  return createWrap(func, WRAP_PARTIAL_RIGHT_FLAG, undefined, partials, holders)
}

// 简化实现
function partialRightSimple(func, ...partials) {
  return function(...args) {
    // 处理占位符
    const finalArgs = partials.map(arg => 
      arg === _ ? args.pop() : arg
    )
    // 前置剩余参数
    return func.apply(this, [...args, ...finalArgs])
  }
}
```

### 使用示例
```javascript
// partial - 左侧预设
function greet(greeting, name) {
  return `${greeting}, ${name}!`
}

const sayHello = _.partial(greet, 'Hello')
sayHello('John')  // => 'Hello, John!'

// partialRight - 右侧预设
const greetJohn = _.partialRight(greet, 'John')
greetJohn('Hi')   // => 'Hi, John!'

// 使用占位符
const sayToJohn = _.partial(greet, _, 'John')
sayToJohn('Hello')  // => 'Hello, John!'

// 实际场景：API 请求
const api = (method, url, data) => fetch(url, { method, body: data })
const get = _.partial(api, 'GET')
const post = _.partial(api, 'POST')

get('/users')
post('/users', { name: 'John' })
```

### partial vs bind
```javascript
// bind - 绑定 this 和参数
const obj = { name: 'John' }
const bound = greet.bind(obj, 'Hello')
// this 被固定为 obj

// partial - 只预设参数
const partialed = _.partial(greet, 'Hello')
// this 保持动态
```

### 占位符使用
```javascript
// 使用 _ 作为占位符
const greet = (greeting, punctuation, name) => 
  `${greeting}${punctuation} ${name}`

// 预设第一个和第三个参数
const sayHi = _.partial(greet, 'Hi', _, 'there')
sayHi('!')  // => 'Hi! there'
sayHi('..') // => 'Hi.. there'
```

## 4. 写作要求

### 开篇方式
从"复用函数但固定部分参数"的需求引入

### 结构组织
```
1. Partial Application 概念（400字）
   - 什么是部分应用
   - 与柯里化的区别
   
2. partial 源码解析（400字）
   - 基本实现
   - 占位符处理
   
3. partialRight 源码解析（300字）
   - 右侧预设
   - 参数合并顺序
   
4. 占位符机制（400字）
   - 如何使用
   - 实现原理
   
5. partial vs bind（300字）
   - 区别对比
   - 各自适用场景
   
6. 实际应用场景（300字）

7. 小结
```

### 代码示例
- 基本用法
- 占位符使用
- API 请求场景
- 与 bind 对比

### 图表需求
- 参数合并流程图
- partial vs partialRight 对比图

## 5. 技术细节

### 源码参考
- `partial.js`
- `partialRight.js`
- `.internal/createWrap.js`
- `.internal/replaceHolders.js`

### 实现要点
- 使用 createWrap 统一包装逻辑
- 占位符由 _.partial.placeholder 定义
- partialRight 将预设参数追加到右侧
- 保持 this 的动态绑定

### 常见问题
- Q: partial 和 curry 有什么区别？
- A: partial 一次预设多个参数，curry 每次接收一个参数

- Q: 占位符是什么？
- A: 用 _ 表示的特殊值，调用时由实际参数填充

## 6. 风格指导

### 语气语调
概念讲解结合实用示例

### 类比方向
- 将 partial 比作"预填表格"
- 将占位符比作"待填空格"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
