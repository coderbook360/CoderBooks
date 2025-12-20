# 章节写作指导：搭建 Mini Pinia 开发环境

## 1. 章节信息
- **章节标题**: 搭建 Mini Pinia 开发环境
- **文件名**: foundations/dev-environment.md
- **所属部分**: 第一部分：基础准备
- **预计阅读时间**: 10分钟
- **难度等级**: 初级

## 2. 学习目标
### 知识目标
- 了解 Mini Pinia 项目的文件结构
- 理解项目的依赖配置
- 掌握开发与测试环境的搭建

### 技能目标
- 能够独立搭建 Mini Pinia 开发环境
- 能够运行示例代码验证实现

## 3. 内容要点
### 核心概念
- **项目结构**：src、examples、tests 目录组织
- **依赖配置**：仅依赖 vue 核心包
- **构建工具**：简单的 TypeScript 配置

### 关键知识点
- Mini Pinia 不使用复杂的构建流程
- 聚焦核心逻辑，忽略边缘场景
- 与 Vue 3 项目的集成方式

## 4. 写作要求
### 开篇方式
"在开始实现 Mini Pinia 之前，我们需要搭建一个简洁的开发环境。这个环境将帮助我们专注于核心逻辑，而不被复杂的构建配置分散注意力。"

### 结构组织
```
1. 项目初始化
2. 目录结构设计
3. 依赖安装
4. TypeScript 配置
5. 示例项目搭建
6. 开发工作流
```

### 代码示例
```
mini-pinia/
├── src/
│   ├── index.ts           # 入口文件
│   ├── createPinia.ts     # createPinia 实现
│   ├── store.ts           # defineStore 实现
│   ├── rootStore.ts       # Pinia 类型与全局状态
│   ├── subscriptions.ts   # 订阅系统
│   └── types.ts           # 类型定义
├── examples/
│   └── basic/             # 基础示例
├── package.json
└── tsconfig.json
```

```json
// package.json
{
  "name": "mini-pinia",
  "version": "1.0.0",
  "type": "module",
  "peerDependencies": {
    "vue": "^3.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vue": "^3.3.0"
  }
}
```

## 5. 技术细节
### 最小依赖
```json
{
  "peerDependencies": {
    "vue": "^3.3.0"
  }
}
```

### TypeScript 配置
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true
  }
}
```

## 6. 风格指导
- **语气**：实操指导，步骤清晰
- **重点**：保持简洁，聚焦核心

## 7. 章节检查清单
- [ ] 项目结构清晰
- [ ] 依赖配置最小化
- [ ] 步骤可执行
- [ ] 为后续实现做好准备
