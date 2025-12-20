# npm 深度使用指南

## 章节定位

本章深入讲解 npm 的高级用法。前端开发者日常使用 npm，但很多高级功能可能不熟悉。本章旨在让读者从"会用"到"精通"。

## 学习目标

读完本章，读者应该能够：

1. 理解 package.json 所有重要字段的含义
2. 掌握 npm scripts 的高级用法
3. 理解 npm 依赖解析和 node_modules 结构
4. 掌握 npm 发布包的完整流程
5. 了解 npm 安全相关的命令和最佳实践

## 核心知识点

### 1. package.json 深度解析

**必填字段**
- `name`：包名（全小写，可用连字符）
- `version`：语义化版本

**重要字段**
- `main`：CommonJS 入口
- `module`：ESM 入口
- `exports`：条件导出（推荐）
- `type`：模块类型（module/commonjs）
- `engines`：Node.js 版本要求
- `files`：发布时包含的文件

### 2. 依赖类型

- `dependencies`：运行时依赖
- `devDependencies`：开发时依赖
- `peerDependencies`：对等依赖
- `optionalDependencies`：可选依赖
- `bundledDependencies`：打包依赖

### 3. 版本范围语法

- `^1.2.3`：允许 minor 和 patch 更新
- `~1.2.3`：只允许 patch 更新
- `1.2.3`：精确版本
- `*`：任意版本
- `>=1.0.0 <2.0.0`：范围

### 4. npm scripts 高级用法

```json
{
  "scripts": {
    "pretest": "npm run lint",
    "test": "jest",
    "posttest": "echo done",
    "start": "node server.js",
    "build": "tsc && npm run build:css",
    "build:css": "postcss src/*.css -o dist/",
    "dev": "nodemon server.js"
  }
}
```

- pre/post 钩子
- 并行执行：`npm-run-all --parallel`
- 环境变量：`cross-env`

### 5. npm 常用命令进阶

```bash
npm ls --depth=0          # 查看顶层依赖
npm outdated              # 检查过期依赖
npm update                # 更新依赖
npm prune                 # 清理多余依赖
npm dedupe                # 去重依赖
npm pack                  # 打包为 tarball
npm link                  # 本地链接开发
npm audit                 # 安全审计
npm audit fix             # 自动修复漏洞
```

### 6. 发布 npm 包

- 注册 npm 账号
- npm login
- npm publish
- 作用域包：@scope/package
- npm version patch/minor/major

### 7. .npmrc 配置

```ini
registry=https://registry.npmmirror.com/
save-exact=true
engine-strict=true
```

## 写作要求

### 内容结构

1. **开篇**：以"你真的了解 npm 吗？"切入
2. **package.json 详解**：逐字段讲解
3. **依赖管理**：版本语法、依赖类型
4. **scripts 进阶**：钩子、并行、环境变量
5. **常用命令**：进阶命令使用
6. **发布指南**：完整发布流程
7. **配置优化**：.npmrc 最佳实践

### 代码示例要求

- 完整的 package.json 示例
- 常用命令的实际输出
- scripts 配置示例

### 避免的内容

- 不要讲 npm 源码
- 不要比较 npm/yarn/pnpm（pnpm 有专门章节）
- 不要讲 npm 历史版本的差异

## 章节长度

约 3500-4000 字，是实用性很强的深度章节。
