# v-for 的转换实现

`v-for` 是列表渲染的核心指令。**它需要将模板中的循环声明转换为 `renderList` 调用。**

**理解 v-for 的转换原理，能帮你更好地优化列表渲染性能。** 本章将分析 v-for 转换器的实现。

## 转换目标

```html
<!-- 原始模板 -->
<div v-for="(item, index) in list" :key="item.id">
  {{ item.name }} - {{ index }}
</div>
```

```javascript
// 转换后的渲染函数
function render(_ctx) {
  return (_openBlock(true), _createElementBlock(_Fragment, null,
    _renderList(_ctx.list, (item, index) => {
      return (_openBlock(), _createElementBlock("div", {
        key: item.id
      }, _toDisplayString(item.name) + " - " + _toDisplayString(index), 1))
    }), 128 /* KEYED_FRAGMENT */))
}
```

## ForNode 结构

v-for 转换后生成 `ForNode`：

```javascript
interface ForNode extends Node {
  type: NodeTypes.FOR
  source: ExpressionNode       // 数据源：list
  valueAlias: ExpressionNode | undefined   // item
  keyAlias: ExpressionNode | undefined     // index
  objectIndexAlias: ExpressionNode | undefined  // 对象遍历的第三个参数
  children: TemplateChildNode[]
  codegenNode?: ForCodegenNode
}
```

示例 AST：

```javascript
{
  type: NodeTypes.FOR,
  source: { content: 'list' },
  valueAlias: { content: 'item' },
  keyAlias: { content: 'index' },
  objectIndexAlias: undefined,
  children: [{
    type: NodeTypes.ELEMENT,
    tag: 'div',
    // ...
  }]
}
```

## 表达式解析

v-for 支持多种语法：

```javascript
// 数组
item in list
(item) in list
(item, index) in list

// 对象
(value, key) in object
(value, key, index) in object

// 使用 of 代替 in
item of list
```

**首先要问的是**：如何用正则表达式解析这些不同的语法？

让我们逐步拆解：

```javascript
// 正则 1：分离左右两侧
const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
//                  ─────────    ─────────    ─────────
//                  左侧(item)   in 或 of    右侧(list)

// 示例："(item, index) in list"
// 匹配结果：
//   捕获组1 (LHS): "(item, index)"
//   捕获组2 (RHS): "list"

// 正则 2：从左侧提取多个变量
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
//                     ─ ─────────  ─────────────────
//                     逗号 第二个变量  可选的第三个变量

// 示例："item, index" 
// 匹配结果：
//   捕获组1: " index"

// 示例："value, key, index"
// 匹配结果：
//   捕获组1: " key"
//   捕获组2: " index"

// 正则 3：去除括号
const stripParensRE = /^\(|\)$/g
// "(item, index)" -> "item, index"
```

解析实现：

```javascript
function parseForExpression(input, context) {
  const exp = input.content
  
  // 第一步：用 in/of 分割左右两侧
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) return
  
  const [, LHS, RHS] = inMatch
  
  const result = {
    source: createAliasExpression(RHS.trim()),  // 数据源：list
    value: undefined,
    key: undefined,
    index: undefined
  }
  
  // 第二步：处理左侧，去除括号
  let valueContent = LHS.trim().replace(stripParensRE, '').trim()
  
  // 第三步：检查是否有多个变量
  const iteratorMatch = valueContent.match(forIteratorRE)
  
  if (iteratorMatch) {
    // 多个变量：(item, index) 或 (value, key, index)
    valueContent = valueContent.replace(forIteratorRE, '').trim()
    
    const keyContent = iteratorMatch[1].trim()
    if (keyContent) {
      result.key = createAliasExpression(keyContent)
    }
    
    if (iteratorMatch[2]) {
      const indexContent = iteratorMatch[2].trim()
      if (indexContent) {
        result.index = createAliasExpression(indexContent)
      }
    }
  }
  
  if (valueContent) {
    result.value = createAliasExpression(valueContent)
  }
  
  return result
}
```

## transformFor 实现

```javascript
const transformFor = createStructuralDirectiveTransform(
  'for',
  (node, dir, context) => {
    return processFor(node, dir, context, (forNode) => {
      // 创建 renderList 调用
      const renderExp = createCallExpression(
        context.helper(RENDER_LIST),
        [forNode.source]
      )
      
      // 获取 key 属性
      const memo = findDir(node, 'memo')
      const keyProp = findProp(node, 'key')
      const keyExp = keyProp
        ? keyProp.type === NodeTypes.ATTRIBUTE
          ? createSimpleExpression(keyProp.value.content, true)
          : keyProp.exp
        : undefined
      
      // 设置 Fragment 的 PatchFlag
      const fragmentFlag = keyExp
        ? PatchFlags.KEYED_FRAGMENT
        : PatchFlags.UNKEYED_FRAGMENT
      
      // codegenNode 暂时为占位
      forNode.codegenNode = createVNodeCall(
        context,
        context.helper(FRAGMENT),
        undefined,
        renderExp,
        fragmentFlag
      )
      
      // 返回退出函数
      return () => {
        // 子节点处理完毕，生成回调函数
        let childBlock
        const { children } = forNode
        
        // 是否需要 Fragment 包装
        const needFragmentWrapper = children.length !== 1 ||
          children[0].type !== NodeTypes.ELEMENT
        
        if (needFragmentWrapper) {
          childBlock = createVNodeCall(
            context,
            context.helper(FRAGMENT),
            keyExp ? createObjectExpression([
              createObjectProperty('key', keyExp)
            ]) : undefined,
            children
          )
        } else {
          // 单个元素
          childBlock = children[0].codegenNode
          if (keyExp) {
            // 注入 key
            injectProp(childBlock, 'key', keyExp)
          }
          // 标记 Block
          childBlock.isBlock = true
          context.helper(OPEN_BLOCK)
          context.helper(CREATE_ELEMENT_BLOCK)
        }
        
        // 构建回调函数参数
        const params = createForLoopParams(forNode.parseResult)
        
        // 设置 renderList 的回调
        renderExp.arguments.push(
          createFunctionExpression(params, childBlock, true)
        )
      }
    })
  }
)
```

## processFor 核心逻辑

```javascript
function processFor(node, dir, context, processCodegen) {
  // 验证表达式
  if (!dir.exp) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_FOR_NO_EXPRESSION)
    )
    return
  }
  
  // 解析表达式
  const parseResult = parseForExpression(dir.exp, context)
  
  if (!parseResult) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION)
    )
    return
  }
  
  const { source, value, key, index } = parseResult
  
  // 创建 ForNode
  const forNode = {
    type: NodeTypes.FOR,
    loc: dir.loc,
    source,
    valueAlias: value,
    keyAlias: key,
    objectIndexAlias: index,
    parseResult,
    children: node.tagType === ElementTypes.TEMPLATE
      ? node.children
      : [node]
  }
  
  // 替换原节点
  context.replaceNode(forNode)
  
  // 进入 v-for 作用域
  context.scopes.vFor++
  
  // 添加循环变量到标识符
  if (value) context.addIdentifiers(value)
  if (key) context.addIdentifiers(key)
  if (index) context.addIdentifiers(index)
  
  const onExit = processCodegen?.(forNode)
  
  return () => {
    // 退出时清理
    context.scopes.vFor--
    if (value) context.removeIdentifiers(value)
    if (key) context.removeIdentifiers(key)
    if (index) context.removeIdentifiers(index)
    
    if (onExit) onExit()
  }
}
```

## 作用域处理

v-for 引入的变量只在循环内有效：

```html
<div v-for="item in list">
  {{ item }}  <!-- 不加 _ctx. -->
</div>
{{ item }}  <!-- 加 _ctx. -->
```

通过 `addIdentifiers` 和 `removeIdentifiers` 实现：

```javascript
// 进入循环前
context.addIdentifiers(value)  // item

// 处理循环体...

// 退出循环后
context.removeIdentifiers(value)
```

## 回调参数构建

```javascript
function createForLoopParams(parseResult) {
  const params = []
  
  if (parseResult.value) {
    params.push(parseResult.value)
  }
  
  if (parseResult.key) {
    if (!parseResult.value) {
      // key 存在但 value 不存在，需要占位
      params.push(createSimpleExpression('_', false))
    }
    params.push(parseResult.key)
  }
  
  if (parseResult.index) {
    if (!parseResult.key) {
      // index 存在但 key 不存在，需要占位
      if (!parseResult.value) {
        params.push(createSimpleExpression('_', false))
      }
      params.push(createSimpleExpression('__', false))
    }
    params.push(parseResult.index)
  }
  
  return params
}
```

生成的回调：

```javascript
// (item, index) in list
(item, index) => { ... }

// (value, key, index) in object
(value, key, index) => { ... }

// item in list (只有 value)
(item) => { ... }
```

## KEYED_FRAGMENT vs UNKEYED_FRAGMENT

PatchFlag 影响 Diff 算法的行为：

```javascript
// 有 key
_createElementBlock(_Fragment, null, 
  _renderList(list, ...), 
  128 /* KEYED_FRAGMENT */)

// 无 key
_createElementBlock(_Fragment, null, 
  _renderList(list, ...), 
  256 /* UNKEYED_FRAGMENT */)
```

有 key 时使用带 key 的 Diff 算法，可以更高效地复用节点。

## 本章小结

本章分析了 v-for 转换器的实现：

- **ForNode 结构**：存储 source、value、key、index
- **表达式解析**：正则解析多种 v-for 语法
- **作用域管理**：循环变量只在循环内有效
- **renderList 调用**：生成列表渲染的运行时代码
- **PatchFlag**：区分有 key 和无 key 的 Fragment

掌握了结构指令的转换模式后，下一章我们将分析指令转换器——v-on 事件绑定。
