# GLSL 语言基础：运算符与控制流

> "掌握控制流是编写复杂着色器逻辑的基础。"

## 运算符

### 算术运算符

```glsl
// 基本算术
float a = 10.0 + 3.0;   // 加法: 13.0
float b = 10.0 - 3.0;   // 减法: 7.0
float c = 10.0 * 3.0;   // 乘法: 30.0
float d = 10.0 / 3.0;   // 除法: 3.333...

// 取模（仅整数）
int e = 10 % 3;         // 取模: 1

// 向量运算（逐分量）
vec3 v1 = vec3(1.0, 2.0, 3.0);
vec3 v2 = vec3(4.0, 5.0, 6.0);
vec3 sum = v1 + v2;     // (5.0, 7.0, 9.0)
vec3 prod = v1 * v2;    // (4.0, 10.0, 18.0)

// 向量与标量
vec3 scaled = v1 * 2.0; // (2.0, 4.0, 6.0)

// 矩阵运算
mat4 m1, m2;
mat4 mProd = m1 * m2;   // 矩阵乘法

// 矩阵与向量
vec4 v = m1 * vec4(1.0, 0.0, 0.0, 1.0); // 矩阵变换
```

### 关系运算符

```glsl
bool a = 5.0 > 3.0;     // true
bool b = 5.0 < 3.0;     // false
bool c = 5.0 >= 5.0;    // true
bool d = 5.0 <= 4.0;    // false
bool e = 5.0 == 5.0;    // true
bool f = 5.0 != 5.0;    // false

// 向量比较（返回 bvec）
vec3 v1 = vec3(1.0, 5.0, 3.0);
vec3 v2 = vec3(2.0, 4.0, 3.0);
bvec3 cmp = lessThan(v1, v2);    // (true, false, false)
bvec3 eq = equal(v1, v2);        // (false, false, true)
```

### 逻辑运算符

```glsl
bool a = true && false; // false (与)
bool b = true || false; // true  (或)
bool c = !true;         // false (非)
bool d = true ^^ false; // true  (异或)

// 向量逻辑运算
bvec3 v1 = bvec3(true, false, true);
bvec3 v2 = bvec3(true, true, false);
bool allTrue = all(v1);   // false
bool anyTrue = any(v1);   // true
bvec3 notV1 = not(v1);    // (false, true, false)
```

### 位运算符（整数）

```glsl
int a = 5 & 3;   // 位与: 1
int b = 5 | 3;   // 位或: 7
int c = 5 ^ 3;   // 位异或: 6
int d = ~5;      // 位非
int e = 5 << 2;  // 左移: 20
int f = 20 >> 2; // 右移: 5
```

### 赋值运算符

```glsl
float a = 5.0;
a += 3.0;  // a = 8.0
a -= 2.0;  // a = 6.0
a *= 2.0;  // a = 12.0
a /= 3.0;  // a = 4.0

int i = 10;
i %= 3;    // i = 1
i <<= 2;   // i = 4
i >>= 1;   // i = 2
```

### 三元运算符

```glsl
float value = condition ? 1.0 : 0.0;

// 常用于平滑过渡
float t = x > 0.5 ? 1.0 : 0.0;
```

## 控制流

### if-else 语句

```glsl
if (condition) {
  // 条件为真时执行
} else if (anotherCondition) {
  // 另一条件为真时执行
} else {
  // 其他情况
}

// 示例
vec3 getColor(float value) {
  if (value < 0.33) {
    return vec3(1.0, 0.0, 0.0); // 红色
  } else if (value < 0.66) {
    return vec3(0.0, 1.0, 0.0); // 绿色
  } else {
    return vec3(0.0, 0.0, 1.0); // 蓝色
  }
}
```

### switch 语句

```glsl
switch (intValue) {
  case 0:
    // 处理 case 0
    break;
  case 1:
  case 2:
    // 处理 case 1 和 2
    break;
  default:
    // 默认处理
    break;
}
```

### for 循环

```glsl
// 基本 for 循环
for (int i = 0; i < 10; i++) {
  // 循环体
}

// 遍历数组
float values[5];
float sum = 0.0;
for (int i = 0; i < values.length(); i++) {
  sum += values[i];
}

// 嵌套循环
for (int y = 0; y < height; y++) {
  for (int x = 0; x < width; x++) {
    // 处理像素
  }
}
```

### while 循环

```glsl
int i = 0;
while (i < 10) {
  // 循环体
  i++;
}
```

### do-while 循环

```glsl
int i = 0;
do {
  // 至少执行一次
  i++;
} while (i < 10);
```

### break 和 continue

```glsl
for (int i = 0; i < 100; i++) {
  if (i == 50) {
    break;      // 跳出循环
  }
  
  if (i % 2 == 0) {
    continue;   // 跳过本次迭代
  }
  
  // 处理奇数
}
```

### discard（仅片元着色器）

```glsl
void main() {
  if (alpha < 0.1) {
    discard;  // 丢弃此片元，不写入帧缓冲
  }
  
  fragColor = vec4(color, alpha);
}
```

## 函数

### 函数定义

```glsl
// 基本函数
float square(float x) {
  return x * x;
}

// 多参数
vec3 blend(vec3 a, vec3 b, float t) {
  return mix(a, b, t);
}

// 无返回值
void logValue(float value) {
  // 仅用于调试
}
```

### 参数限定符

```glsl
// in: 输入参数（默认）
void func1(in float x) { }

// out: 输出参数
void func2(out float result) {
  result = 10.0;
}

// inout: 输入输出参数
void func3(inout float x) {
  x = x * 2.0;
}

// const: 常量参数
void func4(const in float x) { }
```

### 函数重载

```glsl
float add(float a, float b) {
  return a + b;
}

vec3 add(vec3 a, vec3 b) {
  return a + b;
}

mat4 add(mat4 a, mat4 b) {
  return a + b;
}
```

## 内置函数

### 数学函数

```glsl
// 三角函数
float a = sin(x);
float b = cos(x);
float c = tan(x);
float d = asin(x);
float e = acos(x);
float f = atan(y, x);

// 指数函数
float g = pow(x, y);    // x^y
float h = exp(x);       // e^x
float i = log(x);       // ln(x)
float j = exp2(x);      // 2^x
float k = log2(x);      // log2(x)
float l = sqrt(x);      // 平方根
float m = inversesqrt(x); // 1/sqrt(x)

// 常用函数
float n = abs(x);       // 绝对值
float o = sign(x);      // 符号 (-1, 0, 1)
float p = floor(x);     // 向下取整
float q = ceil(x);      // 向上取整
float r = fract(x);     // 小数部分
float s = mod(x, y);    // 取模
float t = min(x, y);    // 最小值
float u = max(x, y);    // 最大值
float v = clamp(x, min, max); // 限制范围
```

### 插值函数

```glsl
// 线性插值
vec3 result = mix(a, b, t);  // a * (1-t) + b * t

// 阶跃函数
float step_result = step(edge, x);  // x < edge ? 0 : 1

// 平滑阶跃
float smooth = smoothstep(edge0, edge1, x);
```

### 向量函数

```glsl
float len = length(v);           // 向量长度
float dist = distance(a, b);     // 两点距离
float d = dot(a, b);             // 点积
vec3 c = cross(a, b);            // 叉积（仅 vec3）
vec3 n = normalize(v);           // 归一化
vec3 r = reflect(I, N);          // 反射向量
vec3 t = refract(I, N, eta);     // 折射向量
vec3 f = faceforward(N, I, Nref); // 面向前
```

### 矩阵函数

```glsl
mat4 t = transpose(m);           // 转置
float d = determinant(m);        // 行列式（mat2, mat3, mat4）
mat4 inv = inverse(m);           // 逆矩阵

// 矩阵分量操作
mat3 outerProd = outerProduct(v1, v2); // 外积
```

### 纹理函数

```glsl
// 基本采样
vec4 color = texture(sampler, texCoord);

// 带偏移采样
vec4 color = textureOffset(sampler, texCoord, ivec2(1, 0));

// 指定 LOD 采样
vec4 color = textureLod(sampler, texCoord, lod);

// 投影采样
vec4 color = textureProj(sampler, texCoordProj);

// 梯度采样
vec4 color = textureGrad(sampler, texCoord, dPdx, dPdy);

// 获取纹理尺寸
ivec2 size = textureSize(sampler, 0);
```

## 性能考虑

### 分支的代价

```glsl
// 避免在着色器中使用复杂分支
// 不好的写法
if (x > 0.5) {
  color = texture(tex1, uv);
} else {
  color = texture(tex2, uv);
}

// 更好的写法（使用 mix）
vec4 c1 = texture(tex1, uv);
vec4 c2 = texture(tex2, uv);
color = mix(c2, c1, step(0.5, x));
```

### 循环展开

```glsl
// 固定次数的循环可能会被展开
// 但动态循环可能影响性能

// 如果可能，使用常量循环次数
const int SAMPLES = 4;
for (int i = 0; i < SAMPLES; i++) {
  // ...
}
```

## 本章小结

- GLSL 支持丰富的运算符，包括算术、关系、逻辑、位运算
- 控制流语句与 C 语言类似
- 函数支持参数限定符和重载
- 内置函数提供了数学、向量、矩阵、纹理操作
- 注意分支和循环对 GPU 性能的影响

下一章，我们将详细学习顶点着色器。
