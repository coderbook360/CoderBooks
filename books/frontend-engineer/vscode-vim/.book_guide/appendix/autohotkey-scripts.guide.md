# 章节写作指导：AutoHotkey 自定义脚本方案

## 1. 章节信息（强制性基础信息）
- **章节标题**: AutoHotkey 自定义脚本方案
- **文件名**: appendix/autohotkey-scripts.md
- **所属部分**: 附录：Windows 全键盘办公完整方案
- **预计阅读时间**: 30 分钟
- **难度等级**: 中级-高级

## 2. 学习目标（验收清单）
### 知识目标
- 理解 AutoHotkey 的工作原理
- 掌握 AHK 脚本的基本语法
- 了解系统级键位重映射的原理
- 理解脚本安全性与权限问题

### 技能目标
- 能够安装并运行 AutoHotkey
- 能够编写基础的键位重映射脚本
- 能够实现 CapsLock 作为 Leader 键
- 能够创建应用快速启动脚本
- 能够配置脚本开机自启动

## 3. 内容要点（内容清单）
### 核心概念（必须全部讲解）
- **AutoHotkey 定位**: Windows 系统级的键盘与鼠标自动化工具
- **热键与热字符串**: 触发机制的两种类型
- **上下文敏感**: 根据活动窗口执行不同脚本
- **脚本优先级**: 系统 → AHK → 应用的键位处理顺序

### 关键知识点（必须全部覆盖）
- **CapsLock 作为 Leader 键**:
  ```ahk
  SetCapsLockState, AlwaysOff
  CapsLock::return
  
  CapsLock & h::Send {Left}
  CapsLock & j::Send {Down}
  CapsLock & k::Send {Up}
  CapsLock & l::Send {Right}
  ```

- **应用快速启动**:
  ```ahk
  CapsLock & c::
    IfWinExist, ahk_exe Code.exe
        WinActivate
    else
        Run, Code.exe
  return
  ```

- **窗口管理增强**:
  ```ahk
  ; CapsLock + 数字 切换应用
  CapsLock & 1::WinActivate ahk_exe Code.exe
  CapsLock & 2::WinActivate ahk_exe chrome.exe
  CapsLock & 3::WinActivate ahk_exe WindowsTerminal.exe
  ```

- **全局 Vim 导航**（在任何应用中）:
  ```ahk
  ; Alt + hjkl 方向键
  !h::Send {Left}
  !j::Send {Down}
  !k::Send {Up}
  !l::Send {Right}
  
  ; Alt + Shift + hjkl 选择文本
  !+h::Send +{Left}
  !+j::Send +{Down}
  !+k::Send +{Up}
  !+l::Send +{Right}
  ```

## 4. 写作要求（结构规范）
- **开篇方式**: 
  "你已经在 VSCode 中享受到了 Vim 的高效，但切换到浏览器、Word、或其他应用时，又回到了鼠标和慢速编辑。AutoHotkey 可以让你在整个 Windows 系统中都拥有 Vim 般的键盘控制能力。"

- **结构组织**: 
  1. AutoHotkey 简介与安装
  2. AHK 脚本基本语法速成
  3. CapsLock Leader 键系统设计
  4. 应用快速启动与切换
  5. 全局 Vim 风格导航
  6. 窗口管理自动化
  7. 文本输入增强（热字符串）
  8. 脚本调试与优化
  9. 完整示例脚本
  10. 开机自启动配置

- **代码示例**: 必须包含：
  - 完整的 `vscode-vim-global.ahk` 脚本（可直接使用）
  - 每个功能的独立代码片段（便于理解）
  - 注释详尽的配置说明
  - 作者实际使用的完整脚本

- **图表需求**: 
  - AutoHotkey 安装步骤截图
  - 脚本编辑器界面说明
  - 键位映射逻辑流程图
  - CapsLock Leader 键位图（可视化）

## 5. 技术细节（技术规范）
- **完整示例脚本**:
```ahk
; ================================
; VSCode Vim 全局键盘增强脚本
; ================================

#NoEnv
#SingleInstance Force
SendMode Input
SetWorkingDir %A_ScriptDir%

; ===== CapsLock 作为 Leader 键 =====
SetCapsLockState, AlwaysOff
CapsLock::return

; ===== 全局导航（CapsLock + hjkl） =====
CapsLock & h::Send {Left}
CapsLock & j::Send {Down}
CapsLock & k::Send {Up}
CapsLock & l::Send {Right}

; 词级移动
CapsLock & w::Send ^{Right}
CapsLock & b::Send ^{Left}

; 行首行尾
CapsLock & 0::Send {Home}
CapsLock & 4::Send {End}

; ===== 应用快速启动/切换 =====
CapsLock & v::
    IfWinExist, ahk_exe Code.exe
        WinActivate
    else
        Run, Code.exe
return

CapsLock & c::
    IfWinExist, ahk_exe chrome.exe
        WinActivate
    else
        Run, chrome.exe
return

CapsLock & t::
    IfWinExist, ahk_exe WindowsTerminal.exe
        WinActivate
    else
        Run, wt.exe
return

; ===== 窗口管理 =====
; CapsLock + Shift + hjkl 移动窗口
CapsLock & +h::
    WinGetPos, X, Y, W, H, A
    WinMove, A,, X-50, Y
return

CapsLock & +l::
    WinGetPos, X, Y, W, H, A
    WinMove, A,, X+50, Y
return

; ===== 热字符串（文本输入增强） =====
::@g::example@gmail.com
::sig::
(
Best regards,
Your Name
Software Engineer
)

; ===== 调试热键 =====
CapsLock & F1::Reload  ; 重新加载脚本
CapsLock & F2::Suspend ; 暂停/恢复脚本
```

- **安全性说明**:
  - AutoHotkey 脚本可以模拟任何键盘/鼠标操作，需谨慎使用
  - 某些应用（如管理员权限应用）需要 AHK 也以管理员权限运行
  - 建议从简单脚本开始，逐步扩展

- **常见问题**: 
  - 脚本不生效：检查是否有其他应用拦截了热键
  - 某些应用中无效：可能需要管理员权限
  - 键位冲突：AHK 脚本优先级高，会覆盖应用热键

## 6. 风格指导（表达规范）
- **语气语调**: 
  - 承认 AHK 有学习曲线，但强调"值得投资"
  - 提供"拿来即用"的完整脚本，降低门槛
  - 鼓励读者从小脚本开始，逐步定制

- **类比方向**: 
  - 将 AutoHotkey 比作"操作系统的超能力"
  - 强调"一次配置，终身受益"

## 7. 章节检查清单
- [ ] 目标明确：读者能安装 AHK 并运行基础脚本
- [ ] 术语统一：使用 AHK 标准语法说明
- [ ] 最小实现：提供一个 10 行脚本入门示例
- [ ] 边界处理：说明某些应用可能不支持（如游戏）
- [ ] 性能与权衡：AHK 对系统性能影响极小
- [ ] 替代方案：简要提及 PowerToys Keyboard Manager 作为简化版
- [ ] 图示与代码：完整脚本 + 详细注释 + 使用截图
- [ ] 总结与练习：提供 3 个练习（CapsLock 导航、应用切换、热字符串）

## 8. 与其他章节的关联
- **前置章节**: 无（附录可独立阅读）
- **相关章节**: 
  - 附录 A：Windows 系统级快捷键（AHK 是增强）
  - 附录 B：PowerToys（AHK 的部分功能替代）
  - 附录 G：完整配置清单（AHK 是其中一环）

## 9. 读者痛点预判
- **痛点 1**: "AutoHotkey 看起来很复杂"
  - 回应：提供完整可用脚本，无需从头编写

- **痛点 2**: "我担心脚本安全性"
  - 回应：说明 AHK 是开源软件，提供官方下载链接

- **痛点 3**: "有没有更简单的方案？"
  - 回应：推荐 PowerToys 作为入门替代，但 AHK 更强大

## 10. 效率提升承诺
本章结束后，读者应该能够：
- ✅ 在整个 Windows 系统中使用 hjkl 导航
- ✅ 用 CapsLock + 字母快速切换应用
- ✅ 减少 80% 的 CapsLock 误触（重映射为功能键）
- ✅ 实现系统级的"Vim 化"操作

**效率预期**：
- 应用切换速度提升 **5-10 倍**
- 在非 Vim 应用中的导航效率提升 **3-5 倍**
- 整体键盘操作舒适度提升 **50%**

## 11. 实战演示
提供一个完整的日常场景：
```
场景：正在 Chrome 浏览文档，需要切换到 VSCode 写代码，然后打开 Terminal 运行命令

传统方式：
1. Alt+Tab 多次寻找 VSCode（约 3-5 秒）
2. 写完代码
3. Alt+Tab 多次寻找 Terminal（约 3-5 秒）

AHK 方式：
1. CapsLock+V 直接切换到 VSCode（0.5 秒）
2. 写完代码
3. CapsLock+T 直接切换到 Terminal（0.5 秒）

效率提升：约 6-8 倍
```

## 12. 特别强调
**这是实现"全系统键盘化"的核心章节！**  

必须提供：
1. ✅ 完整可用的脚本文件
2. ✅ 详细的注释说明
3. ✅ 安全性保证
4. ✅ 调试方法
5. ✅ 开机自启动配置

让读者感受到："原来整个 Windows 都可以像 Vim 一样操作！"

## 13. 下载资源
提供以下资源（放在 GitHub 仓库）：
- `vscode-vim-global.ahk` - 完整脚本
- `readme.md` - 使用说明
- `ahk-installer.exe` - AutoHotkey 安装包链接
- `video-demo.gif` - 演示动图
