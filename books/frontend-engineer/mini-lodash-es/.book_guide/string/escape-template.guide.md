# 章节写作指导：HTML 转义与模板

## 1. 章节信息
- **章节标题**: HTML 转义与模板：escape、template
- **文件名**: string/escape-template.md
- **所属部分**: 第七部分 - 字符串方法
- **章节序号**: 45
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 HTML 转义的安全重要性
- 掌握 escape/unescape 的字符映射
- 了解 template 模板引擎的实现原理

### 技能目标
- 能够正确使用转义方法防止 XSS
- 能够使用 template 创建动态内容

## 3. 内容要点

### 核心函数

#### escape / unescape
```javascript
// HTML 实体映射
const htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

const htmlUnescapes = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'"
}

// escape - 转义 HTML 特殊字符
function escape(string) {
  string = toString(string)
  return string && reUnescapedHtml.test(string)
    ? string.replace(reUnescapedHtml, chr => htmlEscapes[chr])
    : string
}

// unescape - 反转义
function unescape(string) {
  string = toString(string)
  return string && reEscapedHtml.test(string)
    ? string.replace(reEscapedHtml, entity => htmlUnescapes[entity])
    : string
}
```

#### escapeRegExp
```javascript
// 转义正则特殊字符
const reRegExpChar = /[\\^$.*+?()[\]{}|]/g
const reHasRegExpChar = RegExp(reRegExpChar.source)

function escapeRegExp(string) {
  string = toString(string)
  return string && reHasRegExpChar.test(string)
    ? string.replace(reRegExpChar, '\\$&')
    : string
}
```

#### template
```javascript
// template - 模板引擎
function template(string, options) {
  options = { ...templateSettings, ...options }
  
  const { escape, evaluate, interpolate, variable, imports } = options
  
  // 构建正则
  const reDelimiters = RegExp(
    (escape || noMatch).source + '|' +
    (interpolate || noMatch).source + '|' +
    (evaluate || noMatch).source + '|$'
  , 'g')
  
  // 构建函数体
  let index = 0
  let source = "__p += '"
  
  string.replace(reDelimiters, (match, escapeValue, interpolateValue, evaluateValue, offset) => {
    // 添加文本内容
    source += string.slice(index, offset).replace(reUnescaped, escapeStringChar)
    index = offset + match.length
    
    if (escapeValue) {
      source += "' +\n__e(" + escapeValue + ") +\n'"
    } else if (interpolateValue) {
      source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'"
    } else if (evaluateValue) {
      source += "';\n" + evaluateValue + ";\n__p += '"
    }
    return match
  })
  
  source += "';\n"
  
  // 编译函数
  const compiled = Function(importsKeys, 'return ' + source).apply(undefined, importsValues)
  
  return compiled
}
```

### 使用示例
```javascript
// escape - 防止 XSS
const userInput = '<script>alert("XSS")</script>'
_.escape(userInput)
// => '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'

// unescape - 反转义
_.unescape('&lt;script&gt;')
// => '<script>'

// escapeRegExp - 转义正则字符
_.escapeRegExp('[lodash](https://lodash.com/)')
// => '\\[lodash\\]\\(https://lodash\\.com/\\)'

// template - 基本用法
const compiled = _.template('hello <%= user %>!')
compiled({ user: 'fred' })
// => 'hello fred!'

// template - 转义插值
const compiled2 = _.template('<b><%- value %></b>')
compiled2({ value: '<script>' })
// => '<b>&lt;script&gt;</b>'

// template - 执行代码
const compiled3 = _.template('<% _.forEach(users, function(user) { %><li><%- user %></li><% }); %>')
compiled3({ users: ['fred', 'barney'] })
// => '<li>fred</li><li>barney</li>'
```

### template 语法
| 语法 | 说明 | 示例 |
|------|------|------|
| `<%= ... %>` | 插值（不转义） | `<%= name %>` |
| `<%- ... %>` | 插值（HTML转义） | `<%- userInput %>` |
| `<% ... %>` | 执行代码 | `<% if (show) { %>` |

## 4. 写作要求

### 开篇方式
从 XSS 攻击的安全问题引入

### 结构组织
```
1. HTML 转义的重要性（400字）
   - XSS 攻击原理
   - 需要转义的字符
   
2. escape/unescape 源码解析（400字）
   - 字符映射
   - 正则替换
   
3. escapeRegExp 源码解析（300字）
   - 正则特殊字符
   
4. template 模板引擎（700字）
   - 语法介绍
   - 编译原理
   - 安全考虑
   
5. 小结
```

### 代码示例
- 转义基本用法
- XSS 防护示例
- template 各种语法

### 图表需求
- HTML 字符映射表
- template 编译流程图

## 5. 技术细节

### 源码参考
- `escape.js`, `unescape.js`
- `escapeRegExp.js`
- `template.js`
- `templateSettings.js`

### 实现要点
- escape 只转义 5 个危险字符
- template 使用 Function 构造函数编译
- `<%-` 会自动调用 escape 转义
- 支持自定义分隔符

### 常见问题
- Q: 什么时候用 `<%=` 什么时候用 `<%-`？
- A: 用户输入用 `<%-` 转义，可信数据可用 `<%=`

- Q: template 安全吗？
- A: 使用 `<%-` 并避免执行用户代码是安全的

## 6. 风格指导

### 语气语调
安全导向，强调 XSS 防护

### 类比方向
- 将转义比作"消毒"
- 将 template 比作"填空作文"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
