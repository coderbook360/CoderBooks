# 章节写作指导：按需引入与 Tree Shaking

## 1. 章节信息
- **章节标题**: 按需引入与 Tree Shaking 优化
- **文件名**: practice/tree-shaking.md
- **所属部分**: 第十一部分 - 实战与进阶
- **章节序号**: 62
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Tree Shaking 的工作原理
- 掌握 lodash-es 按需引入的方式
- 了解如何设计 Tree Shaking 友好的代码

### 技能目标
- 能够优化项目的 Lodash 引入方式
- 能够设计支持 Tree Shaking 的工具库

## 3. 内容要点

### 核心概念

#### Tree Shaking 原理
```javascript
// Tree Shaking 依赖静态分析
// 只有 ES Module 的 import/export 可以被静态分析

// ❌ CommonJS - 无法 Tree Shake
const _ = require('lodash')
_.map([1, 2, 3], x => x * 2)  // 打包整个 lodash

// ✅ ES Module - 可以 Tree Shake
import { map } from 'lodash-es'
map([1, 2, 3], x => x * 2)  // 只打包 map 及其依赖
```

#### Lodash 引入方式对比
```javascript
// 方式 1: 完整引入（最差）
import _ from 'lodash'
_.map([1, 2, 3], x => x * 2)
// 打包大小: ~70KB (gzipped)

// 方式 2: 解构引入（取决于构建工具）
import { map, filter } from 'lodash'
// 可能仍然打包完整 lodash

// 方式 3: 路径引入（手动 Tree Shake）
import map from 'lodash/map'
import filter from 'lodash/filter'
// 只打包使用的方法

// 方式 4: lodash-es（推荐）
import { map, filter } from 'lodash-es'
// 自动 Tree Shake，只打包使用的方法
// 打包大小: ~5KB (仅 map + filter)
```

### lodash vs lodash-es
| 特性 | lodash | lodash-es |
|------|--------|-----------|
| 模块格式 | CommonJS | ES Module |
| Tree Shaking | ❌ 不支持 | ✅ 支持 |
| 使用方式 | require 或路径引入 | import 解构 |
| 推荐场景 | Node.js 旧项目 | 现代前端项目 |

### 设计 Tree Shaking 友好的代码

#### 避免副作用
```javascript
// ❌ 有副作用 - 无法 Tree Shake
// 文件顶层执行代码
console.log('Module loaded')

let count = 0
export function increment() {
  return ++count  // 依赖外部状态
}

// ✅ 无副作用 - 可以安全 Tree Shake
export function add(a, b) {
  return a + b  // 纯函数
}
```

#### sideEffects 配置
```json
// package.json
{
  "name": "mini-lodash",
  "sideEffects": false  // 声明无副作用
}

// 或指定有副作用的文件
{
  "sideEffects": [
    "*.css",
    "./src/polyfill.js"
  ]
}
```

#### 模块导出方式
```javascript
// ✅ 命名导出 - Tree Shaking 友好
export function map() {}
export function filter() {}

// ❌ 默认导出对象 - 无法 Tree Shake
export default {
  map: function() {},
  filter: function() {}
}
```

### 打包分析

#### Webpack 配置
```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,    // 标记未使用的导出
    sideEffects: true,    // 启用副作用分析
    minimize: true        // 删除未使用的代码
  }
}
```

#### 打包大小分析
```bash
# 使用 webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# 分析打包结果
npx webpack --analyze
```

### 实践示例
```javascript
// 项目中的最佳实践

// 1. 使用 lodash-es
import { debounce, throttle, get } from 'lodash-es'

// 2. 只导入需要的方法
// 不要：import * as _ from 'lodash-es'

// 3. 考虑是否需要 lodash
// 有时原生方法就足够了
const doubled = [1, 2, 3].map(x => x * 2)  // 不需要 _.map
const first = arr[0]  // 不需要 _.head

// 4. 检查打包结果
// 定期分析打包大小，确保没有意外引入完整 lodash
```

## 4. 写作要求

### 开篇方式
从"为什么我的 bundle 这么大"引入

### 结构组织
```
1. Tree Shaking 原理（400字）
   - 静态分析
   - ES Module 要求
   
2. Lodash 引入方式对比（500字）
   - 四种引入方式
   - 打包大小对比
   
3. lodash vs lodash-es（400字）
   - 模块格式差异
   - 使用建议
   
4. 设计 Tree Shaking 友好的代码（500字）
   - 避免副作用
   - sideEffects 配置
   - 导出方式
   
5. 打包分析实践（400字）
   - Webpack 配置
   - 分析工具
   
6. 小结
```

### 代码示例
- 各种引入方式对比
- sideEffects 配置
- 打包分析命令

### 图表需求
- 引入方式打包大小对比图
- Tree Shaking 流程图

## 5. 技术细节

### 源码参考
- lodash-es 项目结构
- package.json 配置

### 实现要点
- Tree Shaking 依赖 ES Module 的静态特性
- sideEffects: false 是关键配置
- 命名导出比默认导出更友好
- 需要在 production 模式下才生效

### 常见问题
- Q: 为什么我用了 lodash-es 但 bundle 还是很大？
- A: 检查是否有动态导入或 side effects

- Q: lodash-es 和 lodash/es 有区别吗？
- A: lodash-es 是独立包，lodash/es 是 lodash 包的子目录

## 6. 风格指导

### 语气语调
优化指导，数据说话

### 类比方向
- 将 Tree Shaking 比作"修剪枯枝"
- 将打包分析比作"体检报告"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
