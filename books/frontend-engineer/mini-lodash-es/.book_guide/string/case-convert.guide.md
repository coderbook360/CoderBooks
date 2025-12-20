# 章节写作指导：大小写转换

## 1. 章节信息
- **章节标题**: 大小写转换：camelCase、kebabCase、snakeCase
- **文件名**: string/case-convert.md
- **所属部分**: 第七部分 - 字符串方法
- **章节序号**: 43
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解各种命名风格的规则
- 掌握大小写转换的实现原理
- 了解 words 在转换中的核心作用

### 技能目标
- 能够使用各种 case 方法转换命名风格
- 理解如何自定义转换逻辑

## 3. 内容要点

### 核心函数

#### camelCase
```javascript
// camelCase - 驼峰命名
const camelCase = string => 
  words(string.replace(/['\u2019]/g, '')).reduce((result, word, index) => {
    word = word.toLowerCase()
    return result + (index ? upperFirst(word) : word)
  }, '')
```

#### kebabCase
```javascript
// kebabCase - 短横线命名
const kebabCase = string =>
  words(string.replace(/['\u2019]/g, ''))
    .reduce((result, word, index) => 
      result + (index ? '-' : '') + word.toLowerCase()
    , '')
```

#### snakeCase
```javascript
// snakeCase - 下划线命名
const snakeCase = string =>
  words(string.replace(/['\u2019]/g, ''))
    .reduce((result, word, index) => 
      result + (index ? '_' : '') + word.toLowerCase()
    , '')
```

#### 其他 case 方法
```javascript
// lowerCase - 空格分隔小写
const lowerCase = string =>
  words(string.replace(/['\u2019]/g, ''))
    .reduce((result, word, index) => 
      result + (index ? ' ' : '') + word.toLowerCase()
    , '')

// upperCase - 空格分隔大写
const upperCase = string =>
  words(string.replace(/['\u2019]/g, ''))
    .reduce((result, word, index) => 
      result + (index ? ' ' : '') + word.toUpperCase()
    , '')

// startCase - 首字母大写空格分隔
const startCase = string =>
  words(string.replace(/['\u2019]/g, ''))
    .reduce((result, word, index) => 
      result + (index ? ' ' : '') + upperFirst(word.toLowerCase())
    , '')
```

### 使用示例
```javascript
// camelCase
_.camelCase('Foo Bar')     // => 'fooBar'
_.camelCase('--foo-bar--') // => 'fooBar'
_.camelCase('__FOO_BAR__') // => 'fooBar'

// kebabCase
_.kebabCase('Foo Bar')     // => 'foo-bar'
_.kebabCase('fooBar')      // => 'foo-bar'
_.kebabCase('__FOO_BAR__') // => 'foo-bar'

// snakeCase
_.snakeCase('Foo Bar')     // => 'foo_bar'
_.snakeCase('fooBar')      // => 'foo_bar'
_.snakeCase('--FOO-BAR--') // => 'foo_bar'

// 其他
_.lowerCase('--Foo-Bar--') // => 'foo bar'
_.upperCase('--foo-bar')   // => 'FOO BAR'
_.startCase('fooBar')      // => 'Foo Bar'
```

### 命名风格对照
| 风格 | 方法 | 示例 |
|------|------|------|
| 驼峰式 | camelCase | fooBar |
| 帕斯卡式 | upperFirst(camelCase) | FooBar |
| 短横线式 | kebabCase | foo-bar |
| 下划线式 | snakeCase | foo_bar |
| 空格式小写 | lowerCase | foo bar |
| 空格式大写 | upperCase | FOO BAR |
| 首字母大写 | startCase | Foo Bar |

## 4. 写作要求

### 开篇方式
从"CSS 类名、JavaScript 变量、API 字段"等不同命名规范的需求引入

### 结构组织
```
1. 命名风格概述（400字）
   - 各种命名风格介绍
   - 为什么需要转换
   
2. words 核心作用（400字）
   - 如何识别单词边界
   - 处理各种输入格式
   
3. camelCase 源码解析（400字）
   - reduce 累积
   - 首词小写，后续首字母大写
   
4. kebabCase/snakeCase 源码解析（400字）
   - 相同的模式
   - 不同的连接符
   
5. 其他 case 方法（300字）
   - lowerCase, upperCase
   - startCase
   
6. 小结
```

### 代码示例
- 各种 case 方法的用法
- 各种输入格式的处理
- 命名风格对照

### 图表需求
- 命名风格对照表
- 转换流程图

## 5. 技术细节

### 源码参考
- `camelCase.js`
- `kebabCase.js`
- `snakeCase.js`
- `lowerCase.js`, `upperCase.js`
- `startCase.js`
- `upperFirst.js`, `lowerFirst.js`

### 实现要点
- 所有 case 方法都使用 words 拆分
- reduce 累积构建结果字符串
- 去除撇号后再处理
- 统一使用 toLowerCase() 再按需转换

### 常见问题
- Q: 如何获得 PascalCase？
- A: 使用 upperFirst(_.camelCase(str))

- Q: 如何处理中文？
- A: 中文字符会被当作一个单词

## 6. 风格指导

### 语气语调
实用导向，对比各种风格

### 类比方向
- 将 case 转换比作"翻译成不同语言"
- 将 words 比作"理解原意"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
