# 扩展管理的键盘流程

扩展是 VSCode 的强大之处，掌握键盘管理扩展可以高效地安装、配置和管理扩展。

## 打开扩展视图

### Vim 键位配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "x"],
      "commands": ["workbench.view.extensions"]
    }
  ]
}
```

或使用默认快捷键：`Ctrl+Shift+X`

## 扩展视图导航

### 列表导航

配置 keybindings.json：

```json
{
  "key": "j",
  "command": "list.focusDown",
  "when": "extensionsFocus && !inputFocus"
},
{
  "key": "k",
  "command": "list.focusUp",
  "when": "extensionsFocus && !inputFocus"
},
{
  "key": "enter",
  "command": "list.select",
  "when": "extensionsFocus && !inputFocus"
}
```

### 搜索扩展

1. `\x` 打开扩展视图
2. 自动聚焦搜索框
3. 输入扩展名称
4. `j/k` 导航结果
5. `Enter` 查看详情

## 扩展操作

### 安装扩展

```
1. \x 打开扩展视图
2. 搜索扩展名
3. j/k 选择扩展
4. Enter 查看详情
5. Ctrl+Enter 安装
```

### 卸载扩展

```
1. \x 打开扩展视图
2. 搜索或导航到已安装扩展
3. Enter 查看详情
4. 找到卸载按钮
```

### 禁用扩展

对于临时不需要的扩展，可以禁用而非卸载：

```
1. 找到扩展
2. 右键或使用命令面板
3. 选择禁用
```

## 常用搜索过滤器

在扩展搜索框中使用过滤器：

- `@installed` - 已安装的扩展
- `@enabled` - 已启用的扩展
- `@disabled` - 已禁用的扩展
- `@outdated` - 有更新的扩展
- `@builtin` - 内置扩展
- `@recommended` - 推荐扩展
- `@category:themes` - 主题类扩展
- `@category:linters` - Linter 类扩展

## 扩展设置

### 打开扩展设置

```json
{
  "before": ["<leader>", "x", "s"],
  "commands": ["workbench.extensions.action.showExtensionsSettings"]
}
```

### 配置特定扩展

1. 找到扩展
2. 点击齿轮图标或查看详情
3. 选择扩展设置

## 扩展快捷命令

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 更新所有扩展
    {
      "before": ["<leader>", "x", "u"],
      "commands": ["workbench.extensions.action.updateAllExtensions"]
    },
    // 显示已安装扩展
    {
      "before": ["<leader>", "x", "i"],
      "commands": ["workbench.extensions.action.showInstalledExtensions"]
    },
    // 显示推荐扩展
    {
      "before": ["<leader>", "x", "r"],
      "commands": ["workbench.extensions.action.showRecommendedExtensions"]
    }
  ]
}
```

## 工作区扩展推荐

### 创建推荐文件

`.vscode/extensions.json`:

```json
{
  "recommendations": [
    "vscodevim.vim",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### 安装推荐扩展

```
1. 打开扩展视图
2. 搜索 @recommended
3. 批量安装
```

## 扩展管理工作流

### 场景 1：项目初始化

```
1. 克隆项目
2. \x 打开扩展视图
3. 搜索 @recommended
4. 安装推荐扩展
```

### 场景 2：性能优化

```
1. \x 打开扩展视图
2. 搜索 @installed
3. 禁用不常用的扩展
4. 重新加载窗口
```

### 场景 3：扩展更新

```
1. \xu 更新所有扩展
2. 或手动选择更新
```

## 键位总结

| 键位 | 操作 |
|------|------|
| `\x` | 打开扩展视图 |
| `\xu` | 更新所有扩展 |
| `\xi` | 显示已安装 |
| `\xr` | 显示推荐 |
| `j/k` | 列表导航 |
| `Enter` | 查看详情 |

---

**效率提升**：扩展管理键盘化，安装、配置、更新一键完成。
