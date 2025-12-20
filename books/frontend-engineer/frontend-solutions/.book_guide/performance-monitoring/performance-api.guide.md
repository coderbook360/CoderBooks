# 章节写作指导：Performance API 与性能数据采集

## 1. 章节信息

- **章节标题**: Performance API 与性能数据采集
- **文件名**: performance-monitoring/performance-api.md
- **所属部分**: 第四部分：性能监控与可观测性
- **章节序号**: 23
- **预计阅读时间**: 35 分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Performance API 的整体架构
- 掌握各种 Performance Entry 类型
- 了解 PerformanceObserver 的使用方式
- 理解性能时间线的完整模型

### 技能目标
- 能够使用 Performance API 采集各类性能数据
- 能够分析 Navigation Timing 数据
- 能够监控资源加载性能
- 能够设计完整的性能数据采集方案

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|-----|---------|
| **Performance API** | 解释浏览器提供的性能测量接口集合 |
| **PerformanceEntry** | 解释性能条目的基类，各类型的共同属性 |
| **Navigation Timing** | 解释页面导航的完整时间线 |
| **Resource Timing** | 解释资源加载的时间数据 |
| **PerformanceObserver** | 解释异步监听性能条目的 API |

### 关键知识点

1. **Performance API 概览**
   - performance.now()
   - performance.timing (废弃)
   - performance.getEntries()
   - performance.mark/measure

2. **Navigation Timing Level 2**
   - 完整时间线模型
   - 各阶段的含义
   - 关键指标计算
   - 与 Level 1 的差异

3. **Resource Timing**
   - 资源时间线模型
   - 跨域资源的限制
   - Timing-Allow-Origin 头
   - 资源性能分析

4. **PerformanceObserver**
   - entryTypes 配置
   - buffered 选项
   - 回调函数处理
   - 与 getEntries 的区别

5. **User Timing API**
   - performance.mark()
   - performance.measure()
   - 自定义性能标记
   - 业务性能埋点

6. **数据采集方案设计**
   - 采集时机选择
   - 数据格式设计
   - 采集脚本优化
   - 与上报的衔接

## 4. 写作要求

### 开篇方式
展示一个场景：想知道页面加载到底慢在哪里，是 DNS 解析、TCP 连接还是服务器响应？Performance API 能告诉你答案。

### 结构组织
```
1. 页面加载到底慢在哪 (问题引入)
2. Performance API 全景图 (整体概览)
3. Navigation Timing 详解 (导航时间)
4. Resource Timing 详解 (资源时间)
5. PerformanceObserver 使用指南 (监听 API)
6. User Timing：自定义性能埋点 (业务埋点)
7. 性能数据采集方案设计 (综合应用)
8. 小结
```

### 代码示例要求
- **必须包含**：Navigation Timing 数据读取
- **必须包含**：Resource Timing 分析代码
- **必须包含**：PerformanceObserver 完整使用
- **必须包含**：User Timing 业务埋点示例
- **推荐包含**：性能数据采集 SDK 核心代码

### 图表需求
- Navigation Timing 时间线图
- Resource Timing 时间线图
- Performance API 类型关系图

## 5. 技术细节

### 规范参考
- Navigation Timing Level 2
- Resource Timing Level 2
- User Timing Level 3
- Performance Observer API

### 实现要点
- 时间戳的精度与安全性
- 跨域资源的限制突破
- 性能条目的内存管理

### 常见问题
- timing 数据为 0 的原因
- 采集时机过早的问题
- 采集数据量过大的处理

## 6. 风格指导

### 语气语调
技术深度与实用性并重，将规范语言转化为易于理解的解释。

### 类比方向
- 将 Navigation Timing 比作"页面加载的体检报告"
- PerformanceObserver 比作"性能事件监听器"

## 7. 章节检查清单

- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：跨域等限制是否覆盖
- [ ] 性能与权衡：采集本身的开销是否说明
- [ ] 替代方案：不同采集方式的对比
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操建议
