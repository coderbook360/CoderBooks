# 章节写作指导：执行次数控制

## 1. 章节信息
- **章节标题**: 执行次数控制：once、before、after
- **文件名**: function/once-before-after.md
- **所属部分**: 第六部分 - 函数方法
- **章节序号**: 38
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解执行次数控制的设计理念
- 掌握 once、before、after 的区别
- 了解闭包计数器的实现

### 技能目标
- 能够使用这些方法控制函数执行
- 理解初始化、限制执行等场景

## 3. 内容要点

### 核心函数

#### once
```javascript
// once - 只执行一次
function once(func) {
  return before(2, func)
}
```

#### before
```javascript
// before - 在第 n 次调用前执行
function before(n, func) {
  let result
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }
  
  return function(...args) {
    if (--n > 0) {
      result = func.apply(this, args)
    }
    if (n <= 1) {
      func = undefined  // 释放函数引用
    }
    return result
  }
}
```

#### after
```javascript
// after - 在第 n 次调用后才执行
function after(n, func) {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }
  
  n = toInteger(n)
  return function(...args) {
    if (--n < 1) {
      return func.apply(this, args)
    }
  }
}
```

### 使用示例
```javascript
// once - 初始化函数
const initialize = _.once(() => {
  console.log('Initializing...')
  return { ready: true }
})

initialize() // 'Initializing...'  => { ready: true }
initialize() // 没有输出          => { ready: true }
initialize() // 没有输出          => { ready: true }

// before - 限制调用次数
const greet = _.before(3, () => console.log('Hello'))
greet() // 'Hello'
greet() // 'Hello'
greet() // 没有输出（第3次开始不执行）

// after - 延迟执行
const done = _.after(3, () => console.log('Done!'))
done() // 没有输出
done() // 没有输出
done() // 'Done!'
done() // 'Done!'

// 实际场景：所有异步完成后执行
const onAllComplete = _.after(3, () => {
  console.log('All tasks completed')
})
asyncTask1.then(onAllComplete)
asyncTask2.then(onAllComplete)
asyncTask3.then(onAllComplete)
```

### 方法对比
| 方法 | 执行条件 | 返回值 |
|------|---------|--------|
| once | 只执行第1次 | 第1次的结果 |
| before(n) | 执行前n-1次 | 最后一次的结果 |
| after(n) | 第n次及之后执行 | 每次执行的结果 |

## 4. 写作要求

### 开篇方式
从"如何确保函数只执行一次"引入

### 结构组织
```
1. 执行次数控制概述（300字）
   - 三种方法的关系
   - 应用场景
   
2. once 源码解析（300字）
   - 基于 before 实现
   - 为什么是 before(2, func)
   
3. before 源码解析（400字）
   - 计数器逻辑
   - 函数引用释放
   
4. after 源码解析（400字）
   - 计数器逻辑
   - 达到次数后的行为
   
5. 实际应用场景（400字）
   - 初始化
   - 事件监听
   - 异步协调
   
6. 小结
```

### 代码示例
- 三种方法的基本用法
- 计数器变化演示
- 实际场景应用

### 图表需求
- 三种方法执行时机对比图
- 计数器变化示意图

## 5. 技术细节

### 源码参考
- `once.js`
- `before.js`
- `after.js`

### 实现要点
- once = before(2, func)，只执行一次
- before 使用 --n > 0 判断，n=2 时只执行1次
- after 使用 --n < 1 判断，n=3 时从第3次开始执行
- before 执行完后设置 func = undefined 释放引用

### 常见问题
- Q: once 后还能获取结果吗？
- A: 可以，每次调用都返回第一次的结果

- Q: before(3) 实际执行几次？
- A: 执行2次（第1次和第2次）

## 6. 风格指导

### 语气语调
简洁明了，对比讲解

### 类比方向
- 将 once 比作"一次性开关"
- 将 after 比作"倒计时后启动"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
