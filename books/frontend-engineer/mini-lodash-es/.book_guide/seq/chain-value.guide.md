# 章节写作指导：链式调用核心方法

## 1. 章节信息
- **章节标题**: 链式调用核心：chain、value、tap
- **文件名**: seq/chain-value.md
- **所属部分**: 第十部分 - 链式调用与序列
- **章节序号**: 58
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 chain 创建链式对象的机制
- 掌握 value 解包的实现原理
- 了解 tap 和 thru 在链中的作用

### 技能目标
- 能够正确使用链式调用的核心方法
- 理解方法混入的实现机制

## 3. 内容要点

### 核心函数

#### chain
```javascript
// chain - 创建显式链
function chain(value) {
  const result = lodash(value)
  result.__chain__ = true
  return result
}

// lodash - 包装函数
function lodash(value) {
  if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
    if (value instanceof LodashWrapper) {
      return value
    }
    if (hasOwnProperty.call(value, '__wrapped__')) {
      return wrapperClone(value)
    }
  }
  return new LodashWrapper(value)
}
```

#### value / wrapperValue
```javascript
// wrapperValue - 执行链并返回结果
function wrapperValue() {
  return baseWrapperValue(this.__wrapped__, this.__actions__)
}

// baseWrapperValue - 核心执行
function baseWrapperValue(value, actions) {
  let result = value
  
  for (const action of actions) {
    result = action.func.apply(action.thisArg, [result, ...action.args])
  }
  
  return result
}
```

#### tap / thru
```javascript
// tap - 拦截值（返回原值）
function tap(value, interceptor) {
  interceptor(value)
  return value
}

// wrapperTap - 链式版本
function wrapperTap(interceptor) {
  return this.thru(value => {
    interceptor(value)
    return value
  })
}

// thru - 转换值（返回新值）
function thru(value, interceptor) {
  return interceptor(value)
}

// wrapperThru - 链式版本
function wrapperThru(interceptor) {
  return this.__chain__
    ? new LodashWrapper(interceptor(this.value()), true)
    : interceptor(this.value())
}
```

#### commit / plant
```javascript
// commit - 执行链并返回新链
function wrapperCommit() {
  return new LodashWrapper(this.value(), this.__chain__)
}

// plant - 替换链中的值
function wrapperPlant(value) {
  const clone = wrapperClone(this)
  let wrapped = clone
  
  while (wrapped.__wrapped__ instanceof LodashWrapper) {
    wrapped = wrapped.__wrapped__
  }
  
  wrapped.__wrapped__ = value
  return clone
}
```

### 使用示例
```javascript
// chain 创建链
const wrapped = _.chain([1, 2, 3, 4, 5])
console.log(wrapped.__chain__)  // => true

// value 解包
const result = _.chain([1, 2, 3])
  .map(x => x * 2)
  .filter(x => x > 2)
  .value()
// => [4, 6]

// tap 调试
_.chain([1, 2, 3, 4, 5])
  .filter(n => n % 2 === 0)
  .tap(console.log)  // => [2, 4]
  .map(n => n * 2)
  .value()
// => [4, 8]

// thru 转换
_.chain(' hello world ')
  .thru(str => str.trim())
  .split(' ')
  .map(_.capitalize)
  .join(' ')
  .value()
// => 'Hello World'

// commit 执行后继续
const step1 = _.chain([1, 2, 3]).map(x => x * 2)
const step2 = step1.commit().filter(x => x > 2)
step2.value()  // => [4, 6]

// plant 复用链
const square = _.chain([]).map(x => x * x)
square.plant([1, 2, 3]).value()  // => [1, 4, 9]
square.plant([4, 5, 6]).value()  // => [16, 25, 36]
```

### 方法混入机制
```javascript
// mixin - 将方法添加到原型
function mixin(object, source, options = {}) {
  const methodNames = keys(source)
  
  methodNames.forEach(name => {
    const func = source[name]
    object[name] = func
    
    // 添加到 LodashWrapper 原型
    object.prototype[name] = function(...args) {
      const result = func.apply(lodash, [this.value(), ...args])
      
      if (options.chain) {
        return new LodashWrapper(result, this.__chain__)
      }
      
      return this.__chain__ ? chain(result) : result
    }
  })
}
```

## 4. 写作要求

### 开篇方式
从"链式调用的内部运作"引入

### 结构组织
```
1. 链式调用核心概述（300字）
   - 核心方法分类
   
2. chain 源码解析（400字）
   - 创建过程
   - __chain__ 标志
   
3. value 源码解析（400字）
   - 解包执行
   - __actions__ 处理
   
4. tap/thru 源码解析（400字）
   - 调试与转换
   - 在链中的应用
   
5. commit/plant 源码解析（300字）
   - 链的控制
   
6. 方法混入机制（400字）
   - mixin 实现
   
7. 小结
```

### 代码示例
- chain/value 基本用法
- tap 调试
- thru 转换
- plant 复用

### 图表需求
- 链式执行流程图
- 方法混入示意图

## 5. 技术细节

### 源码参考
- `chain.js`
- `wrapperValue.js`
- `tap.js`, `thru.js`
- `wrapperCommit.js`, `wrapperPlant.js`
- `mixin.js`
- `.internal/baseWrapperValue.js`

### 实现要点
- chain 设置 __chain__ 为 true
- value 依次执行 __actions__ 中的操作
- tap 返回原值，用于调试
- thru 返回转换后的值
- mixin 实现方法到原型的混入

### 常见问题
- Q: tap 和 thru 有什么区别？
- A: tap 返回原值，thru 返回转换后的值

- Q: plant 有什么用？
- A: 复用已定义的链逻辑，处理不同的数据

## 6. 风格指导

### 语气语调
实现原理讲解，强调内部机制

### 类比方向
- 将 value 比作"打开包装盒"
- 将 plant 比作"更换原料"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
