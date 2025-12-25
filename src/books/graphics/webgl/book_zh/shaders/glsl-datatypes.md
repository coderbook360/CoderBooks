# GLSL 语言基础：数据类型

> "了解数据类型是编写高效着色器的第一步。"

## 标量类型

### 基本标量

| 类型 | 说明 | 示例 |
|------|------|------|
| `bool` | 布尔值 | `true`, `false` |
| `int` | 有符号整数 | `1`, `-5`, `0x1F` |
| `uint` | 无符号整数 | `1u`, `0u` |
| `float` | 浮点数 | `1.0`, `.5`, `3e-2` |

```glsl
bool isVisible = true;
int count = 10;
uint index = 5u;
float value = 3.14;
```

### 精度限定符

```glsl
precision highp float;   // 高精度（推荐用于顶点着色器）
precision mediump float; // 中精度
precision lowp float;    // 低精度

// 也可以单独指定
highp float position;
mediump vec2 texCoord;
lowp vec4 color;
```

**精度对比**：

| 精度 | float 范围 | float 精度 | 适用场景 |
|------|-----------|-----------|---------|
| highp | ±2^62 | 相对 2^-16 | 位置、矩阵 |
| mediump | ±2^14 | 相对 2^-10 | 纹理坐标 |
| lowp | ±2 | 绝对 2^-8 | 颜色 |

## 向量类型

### 向量定义

| 类型 | 分量类型 | 分量数 |
|------|---------|--------|
| `vec2`, `vec3`, `vec4` | float | 2, 3, 4 |
| `ivec2`, `ivec3`, `ivec4` | int | 2, 3, 4 |
| `uvec2`, `uvec3`, `uvec4` | uint | 2, 3, 4 |
| `bvec2`, `bvec3`, `bvec4` | bool | 2, 3, 4 |

### 向量构造

```glsl
// 直接构造
vec2 v2 = vec2(1.0, 2.0);
vec3 v3 = vec3(1.0, 2.0, 3.0);
vec4 v4 = vec4(1.0, 2.0, 3.0, 4.0);

// 标量扩展
vec3 all_ones = vec3(1.0);        // (1.0, 1.0, 1.0)

// 组合构造
vec4 combined = vec4(v2, 0.0, 1.0); // 从 vec2 + 标量
vec4 fromV3 = vec4(v3, 1.0);        // 从 vec3 + 标量

// 类型转换
vec3 floatVec = vec3(ivec3(1, 2, 3)); // int 转 float
```

### 分量访问

```glsl
vec4 v = vec4(1.0, 2.0, 3.0, 4.0);

// 位置分量：x, y, z, w
float x = v.x;  // 1.0
float y = v.y;  // 2.0

// 颜色分量：r, g, b, a
float r = v.r;  // 1.0 (等同于 x)
float a = v.a;  // 4.0 (等同于 w)

// 纹理分量：s, t, p, q
float s = v.s;  // 1.0 (等同于 x)

// 索引访问
float first = v[0];  // 1.0
```

### Swizzling（分量重排）

```glsl
vec4 v = vec4(1.0, 2.0, 3.0, 4.0);

// 提取分量
vec2 xy = v.xy;      // (1.0, 2.0)
vec3 rgb = v.rgb;    // (1.0, 2.0, 3.0)
vec3 zyx = v.zyx;    // (3.0, 2.0, 1.0) 反转

// 重复分量
vec4 xxxx = v.xxxx;  // (1.0, 1.0, 1.0, 1.0)
vec3 xxy = v.xxy;    // (1.0, 1.0, 2.0)

// 赋值中的 swizzle
v.xy = vec2(5.0, 6.0);  // v = (5.0, 6.0, 3.0, 4.0)
v.zw = v.xy;            // v = (5.0, 6.0, 5.0, 6.0)
```

## 矩阵类型

### 矩阵定义

| 类型 | 维度 | 说明 |
|------|------|------|
| `mat2` | 2×2 | 2 列 2 行 |
| `mat3` | 3×3 | 3 列 3 行 |
| `mat4` | 4×4 | 4 列 4 行 |
| `mat2x3` | 2×3 | 2 列 3 行 |
| `mat3x2` | 3×2 | 3 列 2 行 |
| `mat2x4` | 2×4 | 2 列 4 行 |
| `mat4x2` | 4×2 | 4 列 2 行 |
| `mat3x4` | 3×4 | 3 列 4 行 |
| `mat4x3` | 4×3 | 4 列 3 行 |

### 矩阵构造

```glsl
// 对角矩阵
mat4 identity = mat4(1.0);  // 单位矩阵

// 列主序构造
mat2 m2 = mat2(
  1.0, 2.0,   // 第一列
  3.0, 4.0    // 第二列
);

// 从向量构造
mat3 m3 = mat3(
  vec3(1.0, 0.0, 0.0),  // 第一列
  vec3(0.0, 1.0, 0.0),  // 第二列
  vec3(0.0, 0.0, 1.0)   // 第三列
);

// 完整 mat4
mat4 m4 = mat4(
  1.0, 0.0, 0.0, 0.0,  // 第一列
  0.0, 1.0, 0.0, 0.0,  // 第二列
  0.0, 0.0, 1.0, 0.0,  // 第三列
  0.0, 0.0, 0.0, 1.0   // 第四列
);
```

### 矩阵访问

```glsl
mat4 m = mat4(1.0);

// 列访问（返回向量）
vec4 col0 = m[0];      // 第一列
vec4 col1 = m[1];      // 第二列

// 元素访问
float m00 = m[0][0];   // 第一列第一行
float m12 = m[1][2];   // 第二列第三行

// 也可以用分量语法
float m00_alt = m[0].x;
```

## 数组类型

### 数组声明

```glsl
// 固定大小数组
float values[3];
vec4 colors[4];
mat4 bones[32];

// 带初始化
float data[3] = float[3](1.0, 2.0, 3.0);
float data2[3] = float[](1.0, 2.0, 3.0); // 大小推断

// 数组访问
float first = values[0];
vec4 secondColor = colors[1];
```

### 数组长度

```glsl
float values[10];
int len = values.length(); // 返回 10
```

## 结构体

### 结构体定义

```glsl
struct Light {
  vec3 position;
  vec3 color;
  float intensity;
};

struct Material {
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
  float shininess;
};
```

### 结构体使用

```glsl
// 声明变量
Light light;
light.position = vec3(0.0, 10.0, 0.0);
light.color = vec3(1.0, 1.0, 1.0);
light.intensity = 1.0;

// 构造函数语法
Light light2 = Light(
  vec3(5.0, 5.0, 5.0),
  vec3(1.0, 0.8, 0.6),
  0.8
);

// 作为数组
Light lights[4];
lights[0] = light;
```

## 采样器类型

### 采样器定义

| 类型 | 说明 |
|------|------|
| `sampler2D` | 2D 纹理采样器 |
| `sampler3D` | 3D 纹理采样器 |
| `samplerCube` | 立方体贴图采样器 |
| `sampler2DArray` | 2D 纹理数组采样器 |
| `sampler2DShadow` | 2D 阴影贴图采样器 |
| `isampler2D` | 整数 2D 纹理采样器 |
| `usampler2D` | 无符号整数 2D 纹理采样器 |

### 采样器使用

```glsl
uniform sampler2D u_texture;
uniform samplerCube u_envMap;

void main() {
  // 2D 纹理采样
  vec4 texColor = texture(u_texture, v_texCoord);
  
  // 立方体贴图采样
  vec4 envColor = texture(u_envMap, v_normal);
  
  // LOD 采样
  vec4 texLod = textureLod(u_texture, v_texCoord, 2.0);
}
```

## 类型转换

### 隐式转换

GLSL 不支持隐式类型转换，必须显式转换：

```glsl
int i = 5;
float f = float(i);      // int 到 float

float f2 = 3.14;
int i2 = int(f2);        // float 到 int (截断)

vec3 v = vec3(1.0);
ivec3 iv = ivec3(v);     // vec3 到 ivec3
```

### 构造函数转换

```glsl
// 向量类型转换
vec4 v4 = vec4(1.0, 2.0, 3.0, 4.0);
vec3 v3 = vec3(v4);      // 取前三个分量
vec2 v2 = vec2(v4);      // 取前两个分量

// 矩阵类型转换
mat4 m4 = mat4(1.0);
mat3 m3 = mat3(m4);      // 取左上 3x3
```

## 本章小结

- GLSL 支持标量、向量、矩阵、数组、结构体等类型
- 向量支持 swizzling 进行灵活的分量操作
- 矩阵按列主序存储
- 采样器用于纹理采样
- 不支持隐式类型转换，需要显式转换

下一章，我们将学习 GLSL 的运算符和控制流。
