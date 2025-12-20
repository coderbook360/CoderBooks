# 私有仓库与企业级 npm 管理

## 章节定位

本章面向在企业环境工作的开发者，讲解如何搭建和使用私有 npm 仓库，以及企业级 npm 管理的最佳实践。

## 学习目标

读完本章，读者应该能够：

1. 理解为什么企业需要私有 npm 仓库
2. 了解常见的私有仓库解决方案
3. 掌握 Verdaccio 的搭建和配置
4. 理解 npm 的多源配置和作用域配置
5. 了解企业级 npm 安全管理策略

## 核心知识点

### 1. 为什么需要私有仓库

- 内部包不宜公开
- 控制依赖来源，提高安全性
- 缓存加速，减少外网依赖
- 支持断网环境开发

### 2. 私有仓库方案对比

| 方案 | 特点 | 适用场景 |
|------|------|----------|
| Verdaccio | 轻量、开源、易部署 | 中小团队 |
| Nexus | 多仓库支持、企业级 | 大型企业 |
| Artifactory | 全功能、企业级 | 大型企业 |
| npm Enterprise | 官方方案 | 使用 npm 生态 |
| GitHub Packages | 集成 GitHub | 使用 GitHub 的团队 |

### 3. Verdaccio 快速搭建

```bash
# 安装
npm install -g verdaccio

# 启动
verdaccio

# Docker 方式
docker run -d --name verdaccio -p 4873:4873 verdaccio/verdaccio
```

**配置文件 config.yaml**
```yaml
storage: ./storage
auth:
  htpasswd:
    file: ./htpasswd
    max_users: 100
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
packages:
  '@mycompany/*':
    access: $authenticated
    publish: $authenticated
  '**':
    access: $all
    proxy: npmjs
```

### 4. npm 多源配置

```ini
# .npmrc - 项目级配置
registry=https://registry.npmmirror.com/
@mycompany:registry=http://private.company.com:4873/
```

```bash
# 使用 nrm 管理多个源
npm install -g nrm
nrm add company http://private.company.com:4873/
nrm use company
```

### 5. 发布到私有仓库

```bash
# 登录私有仓库
npm login --registry=http://private.company.com:4873/

# 发布
npm publish --registry=http://private.company.com:4873/

# 或在 package.json 中指定
{
  "publishConfig": {
    "registry": "http://private.company.com:4873/"
  }
}
```

### 6. 企业安全策略

- 依赖审计：npm audit
- 许可证合规检查
- 依赖锁定：package-lock.json
- 私有仓库访问控制
- 定期更新策略

## 写作要求

### 内容结构

1. **开篇**：以"企业为什么不直接用 npmjs.com？"切入
2. **需求分析**：私有仓库的必要性
3. **方案对比**：各种方案的优劣
4. **Verdaccio 实战**：搭建配置发布
5. **多源配置**：npm/nrm 配置
6. **安全管理**：企业级最佳实践

### 代码示例要求

- 完整的配置文件示例
- 命令行操作步骤
- 常见问题解决方案

### 避免的内容

- 不要深入讲 Nexus/Artifactory 的详细配置
- 不要讲运维层面的高可用部署
- 保持实用导向

## 章节长度

约 2500-3000 字。
