# 章节写作指导：键值获取

## 1. 章节信息
- **章节标题**: 键值获取：keys、values、entries
- **文件名**: object/keys-values.md
- **所属部分**: 第五部分 - 对象方法
- **章节序号**: 29
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 keys 与 keysIn 的区别
- 掌握 values 与 valuesIn 的区别
- 了解 toPairs 与 toPairsIn 的用途

### 技能目标
- 能够根据需求选择合适的键值获取方法
- 理解自身属性与继承属性的处理

## 3. 内容要点

### 核心函数

#### keys / keysIn
```javascript
// keys - 获取自身可枚举属性键
function keys(object) {
  return isArrayLike(object)
    ? arrayLikeKeys(object)
    : baseKeys(object)
}

// baseKeys - 使用 Object.keys
function baseKeys(object) {
  if (!isPrototype(object)) {
    return Object.keys(object)
  }
  // 处理原型对象
  const result = []
  for (const key in object) {
    if (hasOwnProperty.call(object, key) && key !== 'constructor') {
      result.push(key)
    }
  }
  return result
}

// keysIn - 获取所有可枚举属性键（包括继承）
function keysIn(object) {
  return isArrayLike(object)
    ? arrayLikeKeys(object, true)
    : baseKeysIn(object)
}

// baseKeysIn - 使用 for...in
function baseKeysIn(object) {
  if (!isObject(object)) {
    return nativeKeysIn(object)
  }
  const result = []
  for (const key in object) {
    result.push(key)
  }
  return result
}
```

#### values / valuesIn
```javascript
// values - 获取自身可枚举属性值
function values(object) {
  return object == null ? [] : baseValues(object, keys(object))
}

// baseValues
function baseValues(object, props) {
  return props.map(key => object[key])
}

// valuesIn - 获取所有可枚举属性值（包括继承）
function valuesIn(object) {
  return object == null ? [] : baseValues(object, keysIn(object))
}
```

#### toPairs / toPairsIn
```javascript
// toPairs (entries) - 获取自身可枚举键值对
function toPairs(object) {
  return baseToPairs(object, keys(object))
}

// baseToPairs
function baseToPairs(object, props) {
  return props.map(key => [key, object[key]])
}

// toPairsIn (entriesIn) - 获取所有可枚举键值对
function toPairsIn(object) {
  return baseToPairs(object, keysIn(object))
}

// 别名
const entries = toPairs
const entriesIn = toPairsIn
```

### 使用示例
```javascript
function Foo() {
  this.a = 1
  this.b = 2
}
Foo.prototype.c = 3

const foo = new Foo()

// keys - 只有自身属性
_.keys(foo)
// => ['a', 'b']

// keysIn - 包括继承属性
_.keysIn(foo)
// => ['a', 'b', 'c']

// values
_.values({ a: 1, b: 2 })
// => [1, 2]

// toPairs / entries
_.toPairs({ a: 1, b: 2 })
// => [['a', 1], ['b', 2]]

// 处理数组
_.keys([1, 2, 3])
// => ['0', '1', '2']
```

### 方法对比
| 方法 | 包含继承 | 返回值类型 |
|------|---------|-----------|
| keys | 否 | 键数组 |
| keysIn | 是 | 键数组 |
| values | 否 | 值数组 |
| valuesIn | 是 | 值数组 |
| toPairs | 否 | 键值对数组 |
| toPairsIn | 是 | 键值对数组 |

## 4. 写作要求

### 开篇方式
从 Object.keys/values/entries 的局限性引入

### 结构组织
```
1. 键值获取概述（300字）
   - 自身 vs 继承属性
   - 与原生方法的关系
   
2. keys/keysIn 源码解析（500字）
   - baseKeys 实现
   - baseKeysIn 实现
   - isPrototype 处理
   
3. values/valuesIn 源码解析（300字）
   - 基于 keys 实现
   
4. toPairs/toPairsIn 源码解析（300字）
   - 键值对转换
   
5. 类数组处理（300字）
   - arrayLikeKeys 实现
   
6. 小结
```

### 代码示例
- 自身 vs 继承属性对比
- 类数组处理
- 与原生方法对比

### 图表需求
- 方法对比表
- 继承属性示意图

## 5. 技术细节

### 源码参考
- `keys.js`, `keysIn.js`
- `values.js`, `valuesIn.js`
- `toPairs.js`, `toPairsIn.js`
- `.internal/baseKeys.js`, `.internal/baseKeysIn.js`
- `.internal/arrayLikeKeys.js`

### 实现要点
- keys 使用 Object.keys，keysIn 使用 for...in
- 对原型对象有特殊处理（isPrototype 检查）
- 类数组对象返回索引字符串作为键
- toPairs 是 entries 的别名

### 常见问题
- Q: keys 和 Object.keys 有什么区别？
- A: Lodash keys 对类数组有特殊处理，且对 null 返回空数组

## 6. 风格指导

### 语气语调
对比讲解，强调差异

### 类比方向
- 将继承属性比作"家族传承"
- 将自身属性比作"个人财产"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
