# 章节写作指导：Shader 程序管理

## 1. 章节信息

- **章节标题**: Shader 程序管理
- **文件名**: shader/program.md
- **所属部分**: 第五部分：Shader 系统
- **章节序号**: 29
- **预计阅读时间**: 30分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 深入理解 GlProgram 和 GpuProgram 的完整实现
- 掌握着色器程序的编译、链接、缓存全流程
- 理解程序缓存的 Key 生成与复用策略
- 掌握着色器变体（Shader Variants）的管理机制

### 技能目标
- 能够追踪着色器从源码到 GPU 程序的完整链路
- 能够诊断着色器编译错误并定位问题
- 能够使用宏定义创建着色器变体

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 GlProgram 类结构
```typescript
class GlProgram {
  // WebGL 程序对象
  program: WebGLProgram;
  
  // 着色器源码
  vertexSource: string;
  fragmentSource: string;
  
  // Attribute 位置缓存
  attributeData: Record<string, {
    type: string;
    size: number;
    location: number;
  }>;
  
  // Uniform 位置缓存
  uniformData: Record<string, {
    location: WebGLUniformLocation;
    type: GLenum;
  }>;
}
```

#### 3.2 编译链接流程 (WebGL)
```
着色器源码
    ↓
预处理 (宏展开、includes 解析)
    ↓
gl.createShader(type)
    ↓
gl.shaderSource(shader, source)
    ↓
gl.compileShader(shader) + 检查编译状态
    ↓
gl.createProgram()
    ↓
gl.attachShader(program, vertShader/fragShader)
    ↓
gl.linkProgram(program) + 检查链接状态
    ↓
提取 Attribute/Uniform 位置
    ↓
存入缓存
```

#### 3.3 程序缓存 Key 生成
```typescript
// Key 组成因素
const programKey = `${vertexSourceHash}-${fragmentSourceHash}-${macroDefinitions}`;

// 缓存查找
if (programCache.has(programKey)) {
  return programCache.get(programKey);
}
// 否则编译新程序并缓存
```

### 关键知识点（必须全部覆盖）
1. **编译流程**: WebGL vs WebGPU 的差异
2. **编译错误处理**: `gl.getShaderInfoLog()` 输出解析
3. **程序缓存策略**: Key 生成、引用计数、销毁
4. **着色器变体**: 宏定义生成不同版本
5. **Attribute/Uniform 提取**: 位置查找与缓存
6. **程序销毁**: 资源释放与缓存清理
7. **并行编译优化**: WebGPU `createShaderModuleAsync`

### 前置知识
- 第28章：HighShader 概览
- GLSL/WGSL 着色器语言基础

## 4. 写作要求

### 开篇方式
以"着色器程序是 GPU 可执行的代码"开篇，说明程序管理的重要性。

### 结构组织
1. **引言**：着色器程序的角色
2. **GlProgram 实现**：WebGL 编译链接
3. **GpuProgram 实现**：WebGPU 模块创建
4. **程序缓存**：Key 生成与缓存策略
5. **着色器变体**：宏定义与变体管理
6. **错误处理**：编译错误处理
7. **小结**：程序管理最佳实践

### 代码示例
- GlProgram 创建代码
- 程序缓存 Key 生成
- 编译错误处理

### 图表需求
- **必须**：程序编译流程图
- **可选**：变体管理示意图

## 5. 技术细节

### 源码参考
- `packages/webgl/src/shader/GlProgram.ts`
- `packages/webgpu/src/shader/GpuProgram.ts`
- `packages/core/src/rendering/renderers/shared/shader/utils/`

### 实现要点
- 如何生成唯一的程序 Key
- 编译时宏的处理
- 着色器源码的预处理
- 程序引用计数与销毁

### 常见问题
- Q: 同一着色器源码会重复编译吗？
  A: 不会，有缓存机制避免重复编译
- Q: 如何创建着色器变体？
  A: 使用不同的宏定义生成不同的程序

## 6. 风格指导

### 语气语调
- 深入实现细节
- 结合源码分析
- 提供调试技巧

### 类比方向
- 将程序编译类比为"代码编译"—— 从源码到可执行
- 将变体类比为"条件编译"—— 不同配置不同版本

## 7. 章节检查清单

- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操

## 8. 与其他章节的关系

### 前置章节
- 第28章：HighShader

### 后续章节
- 第30章：Uniform 管理
- 第31章：GLSL→WGSL 转换
