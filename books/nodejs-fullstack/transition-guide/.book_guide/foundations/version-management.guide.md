# Node.js 版本管理与 LTS 策略

## 章节定位

本章是实践性章节，帮助开发者理解 Node.js 的版本策略，掌握版本管理工具的使用。这是日常开发中非常实用的知识。

## 学习目标

读完本章，读者应该能够：

1. 理解 Node.js 的 LTS（长期支持）策略
2. 知道如何选择适合项目的 Node.js 版本
3. 掌握 nvm/fnm 等版本管理工具的使用
4. 理解 .nvmrc 和 .node-version 文件的作用
5. 了解 Node.js 版本升级的注意事项

## 核心知识点

### 1. Node.js 版本命名

- 偶数版本（18, 20, 22）进入 LTS
- 奇数版本（19, 21, 23）是 Current 版本
- LTS 版本有 Active LTS 和 Maintenance LTS 两个阶段

### 2. LTS 策略详解

- **Current**：最新特性，可能不稳定（6 个月）
- **Active LTS**：积极维护，推荐生产使用（18 个月）
- **Maintenance LTS**：仅安全更新（12 个月）
- **End of Life**：不再维护

### 3. 版本选择建议

- 生产环境：使用 Active LTS
- 开发尝鲜：可以用 Current
- 遗留项目：至少保持在 Maintenance 阶段

### 4. 版本管理工具

**nvm (Unix/macOS)**
```bash
nvm install 20
nvm use 20
nvm alias default 20
```

**nvm-windows (Windows)**
```bash
nvm install 20.10.0
nvm use 20.10.0
```

**fnm (跨平台，更快)**
```bash
fnm install 20
fnm use 20
fnm default 20
```

### 5. 项目版本锁定

- `.nvmrc` 文件：nvm 专用
- `.node-version` 文件：多工具支持
- `package.json` 的 `engines` 字段

### 6. 版本升级注意事项

- 检查 Breaking Changes
- 运行测试套件
- 检查依赖兼容性
- 更新 CI/CD 配置

## 写作要求

### 内容结构

1. **开篇**：以"项目需要哪个 Node.js 版本？"切入
2. **版本策略**：解释 LTS 机制
3. **工具使用**：nvm/fnm 的安装和使用
4. **项目配置**：版本锁定最佳实践
5. **升级指南**：如何安全升级版本

### 代码示例要求

- 命令行操作示例
- 配置文件示例
- 版本检查脚本

### 避免的内容

- 不要详细对比所有版本管理工具
- 不要讲解每个 Node.js 版本的新特性
- 保持实用导向

## 示例代码片段

```bash
# 安装并使用 Node.js 20
nvm install 20
nvm use 20

# 设为默认版本
nvm alias default 20

# 查看已安装版本
nvm ls
```

```
// .nvmrc
20
```

```json
// package.json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## 章节长度

约 2000-2500 字，实用性章节。
