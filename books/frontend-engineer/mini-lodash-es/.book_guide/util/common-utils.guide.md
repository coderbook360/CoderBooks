# 章节写作指导：常用工具

## 1. 章节信息
- **章节标题**: 常用工具：uniqueId、defaultTo
- **文件名**: util/common-utils.md
- **所属部分**: 第九部分 - 工具方法
- **章节序号**: 55
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 uniqueId 的 ID 生成机制
- 掌握 defaultTo 与 || 的区别
- 了解 conforms 的约束验证

### 技能目标
- 能够正确使用这些常用工具
- 理解在实际开发中的应用场景

## 3. 内容要点

### 核心函数

#### uniqueId
```javascript
// uniqueId - 生成唯一 ID
let idCounter = 0

function uniqueId(prefix = '') {
  const id = ++idCounter
  return `${prefix}${id}`
}
```

#### defaultTo
```javascript
// defaultTo - 提供默认值
function defaultTo(value, defaultValue) {
  return (value == null || value !== value) ? defaultValue : value
}
```

#### conforms / conformsTo
```javascript
// conforms - 创建验证器
function conforms(source) {
  const props = keys(source)
  
  return object => {
    return props.every(key => {
      const predicate = source[key]
      const value = object[key]
      return value !== undefined || key in object
        ? predicate(value)
        : false
    })
  }
}

// conformsTo - 直接验证
function conformsTo(object, source) {
  return conforms(source)(object)
}
```

#### tap / thru
```javascript
// tap - 拦截并执行（返回原值）
function tap(value, interceptor) {
  interceptor(value)
  return value
}

// thru - 拦截并转换（返回转换后的值）
function thru(value, interceptor) {
  return interceptor(value)
}
```

### 使用示例
```javascript
// uniqueId - 生成唯一 ID
_.uniqueId()           // => '1'
_.uniqueId()           // => '2'
_.uniqueId('user_')    // => 'user_3'
_.uniqueId('contact_') // => 'contact_4'

// 实际场景：React key
const items = data.map(item => ({
  ...item,
  key: _.uniqueId('item_')
}))

// defaultTo - 默认值处理
_.defaultTo(1, 10)         // => 1
_.defaultTo(undefined, 10) // => 10
_.defaultTo(null, 10)      // => 10
_.defaultTo(NaN, 10)       // => 10 ✓
_.defaultTo(0, 10)         // => 0 ✓
_.defaultTo('', 10)        // => '' ✓
_.defaultTo(false, 10)     // => false ✓

// 对比 ||
1 || 10           // => 1
undefined || 10   // => 10
NaN || 10         // => 10 ✓
0 || 10           // => 10 ✗ (0 是 falsy)
'' || 10          // => 10 ✗ ('' 是 falsy)

// conforms - 约束验证
const isValidUser = _.conforms({
  name: _.isString,
  age: n => n > 0 && n < 150,
  email: s => s.includes('@')
})

isValidUser({ name: 'John', age: 30, email: 'john@example.com' })
// => true

// conformsTo - 直接验证
_.conformsTo({ a: 1, b: 2 }, { a: n => n > 0 })
// => true

// tap - 拦截调试
_.chain(data)
  .filter(isValid)
  .tap(console.log)  // 打印中间结果
  .map(transform)
  .value()

// thru - 拦截转换
_.thru([1, 2, 3], arr => arr.length)
// => 3
```

### defaultTo vs || vs ??
| 值 | defaultTo | `\|\|` | `??` |
|---|-----------|--------|------|
| undefined | 默认值 | 默认值 | 默认值 |
| null | 默认值 | 默认值 | 默认值 |
| NaN | 默认值 | 默认值 | NaN |
| 0 | 0 | 默认值 | 0 |
| '' | '' | 默认值 | '' |
| false | false | 默认值 | false |

## 4. 写作要求

### 开篇方式
从"开发中的常见需求"引入

### 结构组织
```
1. 常用工具概述（300字）
   - 解决的问题
   
2. uniqueId 源码解析（300字）
   - 计数器实现
   - 前缀支持
   
3. defaultTo 源码解析（400字）
   - 与 || 和 ?? 的对比
   - NaN 的处理
   
4. conforms 源码解析（400字）
   - 约束验证
   - 实际应用
   
5. tap/thru 源码解析（300字）
   - 在链式调用中的作用
   
6. 小结
```

### 代码示例
- uniqueId 生成 ID
- defaultTo 与其他方式对比
- conforms 验证对象
- tap/thru 调试

### 图表需求
- defaultTo 对比表

## 5. 技术细节

### 源码参考
- `uniqueId.js`
- `defaultTo.js`
- `conforms.js`, `conformsTo.js`
- `tap.js`, `thru.js`

### 实现要点
- uniqueId 使用模块级计数器
- defaultTo 使用 value !== value 检测 NaN
- conforms 返回验证函数
- tap 返回原值，thru 返回转换值

### 常见问题
- Q: uniqueId 是全局唯一的吗？
- A: 在当前 Lodash 实例中唯一，不同实例可能冲突

- Q: defaultTo 和 ?? 有什么区别？
- A: defaultTo 还会处理 NaN，?? 不会

## 6. 风格指导

### 语气语调
实用导向，强调场景

### 类比方向
- 将 uniqueId 比作"自增 ID"
- 将 defaultTo 比作"备选方案"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
