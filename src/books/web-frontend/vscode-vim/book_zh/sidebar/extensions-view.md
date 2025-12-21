# 扩展管理：搜索与安装

VSCode 的扩展生态是其强大之处。本章介绍如何用键盘高效管理扩展。

## 打开扩展视图

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+X` | 聚焦扩展视图 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "5"],
  "commands": ["workbench.view.extensions"]
}
```

`\5` 打开扩展视图。

## 搜索扩展

扩展视图顶部是搜索框。聚焦后直接输入关键词搜索。

### 搜索语法

| 前缀 | 效果 |
|------|------|
| `@installed` | 已安装的扩展 |
| `@enabled` | 已启用的扩展 |
| `@disabled` | 已禁用的扩展 |
| `@outdated` | 有更新的扩展 |
| `@builtin` | 内置扩展 |
| `@recommended` | 推荐的扩展 |
| `@category:` | 按类别搜索 |

例如：
- `@installed vim` - 已安装的 vim 相关扩展
- `@category:themes` - 主题类扩展

## 安装扩展

### 从搜索结果安装

1. 搜索扩展名称
2. `j/k` 导航到目标扩展
3. `Enter` 打开扩展详情
4. 点击"安装"按钮或用命令

### 通过命令安装

```
> Extensions: Install Extensions
```

然后输入扩展名称。

### 通过命令行安装

在终端：

```bash
code --install-extension vscodevim.vim
```

## 管理已安装扩展

### 禁用扩展

右键扩展 → Disable

或者：

```
> Extensions: Disable
```

### 卸载扩展

右键扩展 → Uninstall

### 禁用工作区特定扩展

某些扩展只在特定项目需要。右键扩展 → Disable (Workspace)

## 扩展设置

每个扩展可能有自己的设置。

```json
{
  "before": ["<leader>", ","],
  "commands": ["workbench.action.openSettings"]
}
```

`\,` 打开设置，然后搜索扩展名称查看其配置。

## 推荐的 Vim 用户扩展

### 必备

- **VSCode Vim** - Vim 模式（你已经安装了）
- **ESLint** - JavaScript/TypeScript 代码检查
- **Prettier** - 代码格式化

### 强烈推荐

- **GitLens** - Git 增强
- **Error Lens** - 行内显示错误
- **Auto Rename Tag** - HTML/JSX 标签自动重命名
- **Path Intellisense** - 路径自动补全

### 语言支持

根据你的技术栈：

- **Volar** - Vue 3 支持
- **ES7+ React/Redux Snippets** - React 代码片段
- **Tailwind CSS IntelliSense** - Tailwind 支持

### 主题和美化

- **One Dark Pro** - 流行的暗色主题
- **Material Icon Theme** - 文件图标
- **Bracket Pair Colorizer** - 括号配对着色（VSCode 现已内置）

## 扩展包

扩展包是多个扩展的集合，一次安装多个：

搜索 "Extension Pack" 可以找到相关的扩展包：
- React Extension Pack
- Vue Extension Pack
- Python Extension Pack

## 扩展冲突

有时扩展之间会冲突。如果遇到问题：

1. 禁用最近安装的扩展
2. 检查是否冲突
3. 查看扩展的 issue 页面
4. 更新到最新版本

### Vim 相关冲突

某些扩展可能与 Vim 模式冲突：

- 键盘快捷键冲突
- 编辑行为冲突

解决方法：在 `vim.handleKeys` 中配置哪些键由 Vim 处理。

## 扩展更新

### 手动更新

```
> Extensions: Check for Extension Updates
```

### 自动更新

```json
{
  "extensions.autoUpdate": true
}
```

默认启用。如果你想控制更新时机，可以设为 `false`。

## 同步扩展

VSCode 设置同步可以跨设备同步扩展：

```
> Settings Sync: Turn On...
```

登录 GitHub 或 Microsoft 账号，扩展列表会同步到云端。

## 工作区推荐扩展

在项目中创建 `.vscode/extensions.json`：

```json
{
  "recommendations": [
    "vscodevim.vim",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

团队成员打开项目时会看到推荐安装这些扩展。

## 配置汇总

settings.json：

```json
{
  "extensions.autoUpdate": true,
  "extensions.ignoreRecommendations": false
}
```

Vim 配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "5"],
      "commands": ["workbench.view.extensions"]
    },
    {
      "before": ["<leader>", ","],
      "commands": ["workbench.action.openSettings"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 掌握扩展的搜索和安装
- ✅ 学会管理和配置扩展
- ✅ 了解推荐的 Vim 用户扩展
- ✅ 配置工作区推荐扩展

**效率提升**：选择合适的扩展，打造个性化的高效开发环境。
