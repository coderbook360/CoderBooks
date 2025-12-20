# 章节写作指导：函数方法概览

## 1. 章节信息
- **章节标题**: 函数方法概览与设计
- **文件名**: function/overview.md
- **所属部分**: 第六部分 - 函数方法
- **章节序号**: 34
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Lodash 函数方法的设计理念
- 掌握高阶函数的核心概念
- 了解函数包装器的实现模式

### 技能目标
- 能够理解函数方法的统一设计模式
- 掌握闭包在函数方法中的应用

## 3. 内容要点

### 核心概念

#### 高阶函数定义
```javascript
// 高阶函数：接收函数作为参数，或返回函数
function higherOrderFunction(func) {
  return function(...args) {
    // 对 func 进行包装、增强或控制
    return func.apply(this, args)
  }
}
```

#### 函数方法分类
| 类别 | 方法 | 说明 |
|------|------|------|
| 调用控制 | debounce, throttle | 控制调用频率 |
| 参数处理 | partial, curry | 参数预设和柯里化 |
| 执行次数 | once, before, after | 限制执行次数 |
| 结果缓存 | memoize | 缓存函数结果 |
| 延迟执行 | defer, delay | 延迟执行函数 |
| 逻辑组合 | negate, flip | 修改函数行为 |

### 核心设计模式

#### 包装器模式
```javascript
// 典型的函数包装器结构
function wrapper(func, option) {
  // 1. 参数验证
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }
  
  // 2. 闭包状态
  let state = initializeState(option)
  
  // 3. 返回包装函数
  function wrapped(...args) {
    // 在调用前后执行额外逻辑
    preProcess(state, args)
    const result = func.apply(this, args)
    postProcess(state, result)
    return result
  }
  
  // 4. 附加方法（可选）
  wrapped.cancel = () => { /* 取消逻辑 */ }
  wrapped.flush = () => { /* 立即执行逻辑 */ }
  
  return wrapped
}
```

#### 闭包状态管理
```javascript
// debounce 中的闭包状态
function debounce(func, wait) {
  let timerId,      // 定时器 ID
      lastArgs,     // 最后一次调用的参数
      lastThis,     // 最后一次调用的 this
      result,       // 函数执行结果
      lastCallTime  // 最后一次调用时间
  
  // 内部函数可以访问和修改这些闭包变量
  function invokeFunc(time) {
    const args = lastArgs
    const thisArg = lastThis
    lastArgs = lastThis = undefined
    result = func.apply(thisArg, args)
    return result
  }
  
  // ...
}
```

### 设计原则
1. **不修改原函数**：返回新的包装函数
2. **保持 this 绑定**：使用 apply 正确传递上下文
3. **透明传递参数**：使用 rest 参数收集所有参数
4. **可取消/可控制**：提供 cancel、flush 等辅助方法

## 4. 写作要求

### 开篇方式
从"如何增强或控制函数行为"引入

### 结构组织
```
1. 函数方法概述（400字）
   - 高阶函数概念
   - 方法分类
   
2. 包装器设计模式（500字）
   - 基本结构
   - 典型实现
   
3. 闭包状态管理（400字）
   - 闭包变量的作用
   - 状态生命周期
   
4. 设计原则（300字）
   - 不修改原函数
   - this 和参数处理
   
5. 小结
```

### 代码示例
- 包装器基本结构
- 闭包状态示例
- 各类方法预览

### 图表需求
- 函数方法分类表
- 包装器结构图

## 5. 技术细节

### 源码参考
- `debounce.js` (典型的包装器实现)
- `memoize.js` (缓存模式)
- `once.js` (执行次数控制)
- `partial.js` (参数预设)

### 实现要点
- 所有函数方法都返回新函数
- 使用闭包保存状态
- 正确处理 this 绑定
- 提供取消/控制接口

### 常见问题
- Q: 为什么需要函数包装？
- A: 在不修改原函数的前提下增强功能

## 6. 风格指导

### 语气语调
概念性讲解，为后续章节铺垫

### 类比方向
- 将包装器比作"礼品包装"
- 将闭包比作"私有仓库"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
