# pnpm 与现代包管理

## 章节定位

本章介绍 pnpm 这个现代包管理器。pnpm 在大型项目和 Monorepo 场景中越来越流行，其独特的存储策略和性能优势值得掌握。

## 学习目标

读完本章，读者应该能够：

1. 理解 pnpm 的核心设计理念（内容寻址存储）
2. 掌握 pnpm 的基本命令和使用方法
3. 理解 pnpm 的 node_modules 结构差异
4. 了解 pnpm 在 Monorepo 中的应用
5. 知道何时选择 pnpm 而非 npm

## 核心知识点

### 1. pnpm 设计理念

- **内容寻址存储**：所有包存储在全局 store，项目中使用硬链接
- **节省磁盘空间**：相同版本的包只存储一份
- **安装速度快**：利用缓存和并行
- **严格模式**：只能访问直接声明的依赖

### 2. node_modules 结构对比

**npm (扁平化)**
```
node_modules/
├── lodash/
├── express/
├── body-parser/   # express 的依赖也被提升
└── ...
```

**pnpm (嵌套 + 符号链接)**
```
node_modules/
├── .pnpm/
│   ├── express@4.18.0/
│   │   └── node_modules/
│   │       ├── express/
│   │       └── body-parser -> ../../body-parser@1.20.0/...
│   └── body-parser@1.20.0/
│       └── node_modules/
│           └── body-parser/
├── express -> .pnpm/express@4.18.0/.../express
└── ...
```

### 3. pnpm 基本命令

```bash
# 安装
pnpm install              # 安装所有依赖
pnpm add lodash           # 添加依赖
pnpm add -D typescript    # 添加开发依赖
pnpm add -g npm-check     # 全局安装

# 运行
pnpm run dev              # 运行 scripts
pnpm dev                  # 简写（如果无冲突）
pnpm exec jest            # 执行 bin 命令
pnpm dlx create-react-app # 临时执行（类似 npx）

# 其他
pnpm update               # 更新依赖
pnpm prune                # 清理未使用的包
pnpm store prune          # 清理全局 store
```

### 4. pnpm 配置

```yaml
# .npmrc
shamefully-hoist=true     # 允许未声明依赖的访问（兼容模式）
strict-peer-dependencies=false
auto-install-peers=true
```

### 5. Monorepo 支持

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```bash
pnpm -r run build         # 递归运行所有包的 build
pnpm --filter @app/web run dev  # 只运行特定包
```

### 6. 何时使用 pnpm

**推荐场景**
- Monorepo 项目
- 需要节省磁盘空间
- 追求更快的安装速度
- 需要严格的依赖管理

**注意事项**
- 某些老旧包可能不兼容（需要 shamefully-hoist）
- 团队需要统一使用
- CI/CD 需要配置 pnpm

## 写作要求

### 内容结构

1. **开篇**：以"为什么需要另一个包管理器？"切入
2. **设计理念**：内容寻址、硬链接、符号链接
3. **结构对比**：npm vs pnpm 的 node_modules
4. **命令使用**：常用命令和 npm 对照
5. **Monorepo**：工作区配置和使用
6. **迁移指南**：从 npm 迁移到 pnpm

### 代码示例要求

- 目录结构对比
- 命令对照表
- 配置文件示例

### 避免的内容

- 不要深入讲 pnpm 源码
- 不要详细讲 Monorepo 架构设计
- 不要过度比较各种包管理器

## 章节长度

约 2500-3000 字。
