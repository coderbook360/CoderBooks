# 章节写作指导：搭建 Mini Vue Router 开发环境

## 1. 章节信息
- **章节标题**: 搭建 Mini Vue Router 开发环境
- **文件名**: foundations/dev-environment.md
- **所属部分**: 第一部分：路由基础与架构概览
- **预计阅读时间**: 8分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 了解 Mini Vue Router 的项目结构
- 理解开发环境的技术选型

### 技能目标
- 能够搭建并运行 Mini Vue Router 开发环境
- 能够编写和运行测试用例

## 3. 内容要点

### 项目结构
```
mini-vue-router/
├── src/
│   ├── history/
│   ├── matcher/
│   ├── components/
│   ├── router.ts
│   └── index.ts
├── examples/
├── tests/
├── package.json
└── tsconfig.json
```

### 关键知识点
1. TypeScript 配置
2. Vite 作为开发服务器
3. Vitest 作为测试框架
4. 示例应用结构

## 4. 写作要求

### 开篇方式
"工欲善其事，必先利其器。让我们搭建一个舒适的开发环境。"

### 结构组织
```
1. 技术选型说明
2. 项目初始化步骤
3. 目录结构设计
4. 入口文件编写
5. 示例应用搭建
6. 验证环境可用
```

### 代码示例
- package.json 配置
- tsconfig.json 配置
- 入口文件骨架代码

## 5. 技术细节

### 技术栈
- TypeScript 5.x
- Vite 5.x
- Vue 3.4+
- Vitest

### 实现要点
- 使用 pnpm 作为包管理器
- ESM 模块格式
- 严格的 TypeScript 配置

## 6. 风格指导

### 语气语调
实操指南风格，步骤清晰

### 注意事项
- 给出完整可复制的命令
- 说明每个配置项的作用

## 7. 章节检查清单
- [ ] 步骤完整：从零开始可复现
- [ ] 命令准确：已验证可执行
- [ ] 结构清晰：目录设计合理
