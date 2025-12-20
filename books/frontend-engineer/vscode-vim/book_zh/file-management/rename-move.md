# 文件重命名与移动的键盘流程

重命名和移动文件是日常开发中的常见操作。用鼠标右键操作太慢，本章介绍完全键盘化的流程。

## 文件重命名

### 在编辑器中重命名

当文件已在编辑器中打开时，使用命令面板：

1. `Ctrl+Shift+P` → 打开命令面板
2. 输入 `rename file`
3. 选择 "File: Rename..."
4. 输入新文件名
5. `Enter` 确认

### 在文件树中重命名

1. `Ctrl+Shift+E` → 聚焦文件树
2. 导航到目标文件
3. `F2` 或 `r`（如果配置了）→ 进入重命名模式
4. 输入新名称
5. `Enter` 确认

配置 `r` 键：

```json
{
  "key": "r",
  "command": "renameFile",
  "when": "explorerViewletFocus && !inputFocus"
}
```

### 重命名技巧

**技巧 1：选择性修改**

重命名时，文件名（不含扩展名）会被选中。你可以：
- 直接输入完全替换
- 用 `End` 键取消选择，在末尾添加内容
- 用 `Home` 键移动到开头

**技巧 2：保留扩展名**

VSCode 默认只选中文件名部分，扩展名不选中，避免意外修改。

**技巧 3：批量重命名**

对于多个文件的批量重命名，可以使用：
- 搜索替换（`Ctrl+Shift+H`）配合正则
- 专门的批量重命名扩展

## 文件移动

### 使用剪切粘贴

1. `Ctrl+Shift+E` → 聚焦文件树
2. 导航到要移动的文件
3. `x`（如果配置了）或 `Ctrl+X` → 剪切
4. 导航到目标目录
5. `p`（如果配置了）或 `Ctrl+V` → 粘贴

配置剪切粘贴键：

```json
[
  {
    "key": "x",
    "command": "filesExplorer.cut",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "p",
    "command": "filesExplorer.paste",
    "when": "explorerViewletFocus && !inputFocus"
  }
]
```

### 使用命令面板

1. 打开要移动的文件
2. `Ctrl+Shift+P` → 命令面板
3. 输入 `move file`
4. 选择 "File: Move..."
5. 输入新路径
6. `Enter` 确认

这种方式可以一步完成移动，不需要先导航到目标目录。

### 移动后自动更新导入

VSCode 内置支持移动 TypeScript/JavaScript 文件后自动更新 import 语句。

确保设置：

```json
{
  "typescript.updateImportsOnFileMove.enabled": "always",
  "javascript.updateImportsOnFileMove.enabled": "always"
}
```

这样移动 `components/Button.tsx` 到 `ui/Button.tsx` 后，所有引用它的文件都会自动更新 import 路径。

## 文件复制

### 在同一目录复制

1. 文件树中选中文件
2. `y` 或 `Ctrl+C` → 复制
3. `p` 或 `Ctrl+V` → 粘贴

粘贴时会自动添加副本后缀，如 `Button copy.tsx`。

### 复制到其他目录

1. 选中文件，`y` 复制
2. 导航到目标目录
3. `p` 粘贴

### 配置复制键

```json
{
  "key": "y",
  "command": "filesExplorer.copy",
  "when": "explorerViewletFocus && !inputFocus"
}
```

## 文件删除

### 安全删除（移到回收站）

1. 文件树中选中文件
2. `d`（如果配置了）或 `Delete` → 移到回收站
3. 确认对话框选择"移动到回收站"

配置：

```json
{
  "key": "d",
  "command": "moveFileToTrash",
  "when": "explorerViewletFocus && !inputFocus"
}
```

### 永久删除

`Shift+Delete` 可以永久删除，但不推荐使用。

### 删除确认

VSCode 默认会弹出确认对话框。如果你确信自己的操作，可以禁用：

```json
{
  "explorer.confirmDelete": false
}
```

但建议保留这个确认，避免误删。

## 路径复制

### 复制相对路径

1. 文件树中选中文件
2. `Shift+Alt+C` → 复制相对路径

粘贴后得到类似 `src/components/Button.tsx` 的路径。

### 复制绝对路径

1. 右键菜单 → 复制路径
2. 或使用命令面板 `Copy Path`

### 配置到键位

```json
{
  "key": "shift+y",
  "command": "copyRelativeFilePath",
  "when": "explorerViewletFocus && !inputFocus"
}
```

`Shift+Y` 复制相对路径——与 Vim 的 `Y`（复制行）形成对照。

## 在资源管理器中显示

有时你需要在系统文件管理器中打开当前文件位置：

1. `Ctrl+Shift+P`
2. 输入 `reveal in explorer`
3. 选择 "File: Reveal in File Explorer"

配置快捷键：

```json
{
  "before": ["<Leader>", "f", "o"],
  "commands": ["revealFileInOS"]
}
```

`<Space>fo`（file open in OS）在系统资源管理器中打开。

## 完整键位配置

综合本章所有操作：

```json
[
  // 文件树操作
  {
    "key": "r",
    "command": "renameFile",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "d",
    "command": "moveFileToTrash",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "y",
    "command": "filesExplorer.copy",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "x",
    "command": "filesExplorer.cut",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "p",
    "command": "filesExplorer.paste",
    "when": "explorerViewletFocus && !inputFocus"
  },
  {
    "key": "shift+y",
    "command": "copyRelativeFilePath",
    "when": "explorerViewletFocus && !inputFocus"
  }
]
```

## 键位速查

| 键位 | 操作 | 位置 |
|------|------|------|
| `r` 或 `F2` | 重命名 | 文件树 |
| `d` | 删除 | 文件树 |
| `y` | 复制 | 文件树 |
| `x` | 剪切 | 文件树 |
| `p` | 粘贴 | 文件树 |
| `Shift+Y` | 复制路径 | 文件树 |
| `<Space>fo` | 系统资源管理器打开 | 编辑器 |

## 实战：重构项目结构

**任务**：将 `components/Button.tsx` 移动到 `ui/buttons/Button.tsx`

**键盘流程**：

```
1. Ctrl+Shift+E       # 聚焦文件树
2. 导航到 components/Button.tsx
3. x                  # 剪切
4. 导航到项目根目录
5. Shift+A            # 新建文件夹
6. 输入 ui/buttons   # 一次创建多级目录
7. Enter
8. l                  # 进入目录
9. p                  # 粘贴
```

如果开启了自动更新导入，所有引用这个文件的 import 都会自动更新。

---

**本章收获**：
- ✅ 掌握键盘重命名文件
- ✅ 掌握键盘移动/复制文件
- ✅ 配置完整的文件操作键位
- ✅ 了解自动更新导入功能

**效率提升**：文件重命名和移动效率提升 **3-5 倍**，重构项目结构更加流畅。
