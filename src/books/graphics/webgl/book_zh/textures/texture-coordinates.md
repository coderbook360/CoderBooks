# 纹理坐标

> "UV 坐标是连接 3D 模型与 2D 纹理的桥梁。"

## UV 坐标基础

### 坐标系统

```
纹理空间:
          V
          ↑
    (0,1) │ (1,1)
          │
    ──────┼──────→ U
          │
    (0,0) │ (1,0)
```

### 基本映射

```javascript
// 顶点数据包含 UV 坐标
const vertices = new Float32Array([
  // x, y, z, u, v
  -1, -1, 0, 0, 0,  // 左下
   1, -1, 0, 1, 0,  // 右下
   1,  1, 0, 1, 1,  // 右上
  -1,  1, 0, 0, 1   // 左上
]);

// 配置属性
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 20, 0);
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 20, 12);
```

### 着色器中使用

```glsl
// 顶点着色器
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  v_texCoord = a_texCoord;
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}

// 片元着色器
in vec2 v_texCoord;
uniform sampler2D u_texture;

void main() {
  fragColor = texture(u_texture, v_texCoord);
}
```

## UV 变换

### 缩放

```glsl
// 片元着色器中缩放 UV
uniform vec2 u_uvScale;

void main() {
  vec2 uv = v_texCoord * u_uvScale;
  fragColor = texture(u_texture, uv);
}
```

```javascript
// 纹理重复 4 次
gl.uniform2f(u_uvScale, 4.0, 4.0);
```

### 平移

```glsl
uniform vec2 u_uvOffset;

void main() {
  vec2 uv = v_texCoord + u_uvOffset;
  fragColor = texture(u_texture, uv);
}
```

```javascript
// 滚动纹理动画
function animate(time) {
  gl.uniform2f(u_uvOffset, time * 0.1, 0);
  render();
  requestAnimationFrame(animate);
}
```

### 旋转

```glsl
uniform float u_uvRotation;

vec2 rotateUV(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2 rotation = mat2(c, -s, s, c);
  return rotation * (uv - 0.5) + 0.5;  // 绕中心旋转
}

void main() {
  vec2 uv = rotateUV(v_texCoord, u_uvRotation);
  fragColor = texture(u_texture, uv);
}
```

### 组合变换

```glsl
uniform mat3 u_uvTransform;

void main() {
  vec3 uv = u_uvTransform * vec3(v_texCoord, 1.0);
  fragColor = texture(u_texture, uv.xy);
}
```

```javascript
// 构建 UV 变换矩阵
function createUVTransform(offsetX, offsetY, scaleX, scaleY, rotation) {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  
  return new Float32Array([
    scaleX * c, scaleX * s, 0,
    -scaleY * s, scaleY * c, 0,
    offsetX, offsetY, 1
  ]);
}
```

## 环绕模式详解

### REPEAT

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
```

```
UV 范围 [-0.5, 2.5]:

┌───┬───┬───┐
│ A │ A │ A │
├───┼───┼───┤
│ A │ A │ A │
├───┼───┼───┤
│ A │ A │ A │
└───┴───┴───┘

纹理 A 重复 3 次
```

### MIRRORED_REPEAT

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
```

```
UV 范围 [-1, 3]:

┌───┬───┬───┬───┐
│ A │ A'│ A │ A'│
├───┼───┼───┼───┤
│ A'│ A │ A'│ A │
├───┼───┼───┼───┤
│ A │ A'│ A │ A'│
└───┴───┴───┴───┘

A' = A 的镜像
无缝连接
```

### CLAMP_TO_EDGE

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
```

```
UV 范围 [-0.5, 1.5]:

┌─────┬─────┬─────┐
│edge │edge │edge │
├─────┼─────┼─────┤
│edge │  A  │edge │
├─────┼─────┼─────┤
│edge │edge │edge │
└─────┴─────┴─────┘

边缘像素延伸
常用于天空盒、UI
```

## 纹理图集

### 什么是纹理图集

将多个小纹理合并到一张大纹理中，减少纹理切换：

```
┌─────────────────────────┐
│  ┌───┐  ┌───┐  ┌───┐   │
│  │ A │  │ B │  │ C │   │
│  └───┘  └───┘  └───┘   │
│  ┌───┐  ┌───┐  ┌───┐   │
│  │ D │  │ E │  │ F │   │
│  └───┘  └───┘  └───┘   │
└─────────────────────────┘
        纹理图集
```

### 计算子纹理 UV

```javascript
// 图集信息
const atlas = {
  width: 512,
  height: 512,
  sprites: {
    'grass': { x: 0, y: 0, w: 64, h: 64 },
    'stone': { x: 64, y: 0, w: 64, h: 64 },
    'water': { x: 128, y: 0, w: 64, h: 64 }
  }
};

// 计算 UV 范围
function getSpriteUV(spriteName) {
  const sprite = atlas.sprites[spriteName];
  return {
    u0: sprite.x / atlas.width,
    v0: sprite.y / atlas.height,
    u1: (sprite.x + sprite.w) / atlas.width,
    v1: (sprite.y + sprite.h) / atlas.height
  };
}
```

### 着色器中使用

```glsl
uniform vec4 u_spriteUV;  // (u0, v0, u1, v1)

void main() {
  // 将 [0,1] 映射到精灵区域
  vec2 uv = mix(u_spriteUV.xy, u_spriteUV.zw, v_texCoord);
  fragColor = texture(u_atlas, uv);
}
```

### 防止边缘渗色

```javascript
// 问题：线性过滤可能采样到相邻精灵

// 解决 1：添加边距
const padding = 2;  // 像素
const sprite = { x: 64 + padding, y: padding, w: 64 - padding * 2, h: 64 - padding * 2 };

// 解决 2：使用 CLAMP_TO_EDGE 并为每个精灵创建边框

// 解决 3：禁用线性过滤
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
```

## 程序化 UV

### 平面投影

```glsl
// 从世界坐标生成 UV
in vec3 v_worldPos;

void main() {
  vec2 uv = v_worldPos.xz * 0.1;  // 从 XZ 平面投影
  fragColor = texture(u_texture, uv);
}
```

### 球面投影

```glsl
// 球面 UV 映射
in vec3 v_normal;

void main() {
  vec3 n = normalize(v_normal);
  float u = atan(n.z, n.x) / (2.0 * 3.14159) + 0.5;
  float v = asin(n.y) / 3.14159 + 0.5;
  
  fragColor = texture(u_texture, vec2(u, v));
}
```

### 立方体投影

```glsl
// 立方体 UV 映射
in vec3 v_localPos;

void main() {
  vec3 absPos = abs(v_localPos);
  vec2 uv;
  
  if (absPos.x >= absPos.y && absPos.x >= absPos.z) {
    uv = v_localPos.zy / v_localPos.x;  // X 面
  } else if (absPos.y >= absPos.x && absPos.y >= absPos.z) {
    uv = v_localPos.xz / v_localPos.y;  // Y 面
  } else {
    uv = v_localPos.xy / v_localPos.z;  // Z 面
  }
  
  uv = uv * 0.5 + 0.5;
  fragColor = texture(u_texture, uv);
}
```

### 三平面投影（Triplanar）

```glsl
uniform sampler2D u_texture;

in vec3 v_worldPos;
in vec3 v_normal;

void main() {
  vec3 blending = abs(v_normal);
  blending = normalize(max(blending, 0.00001));
  blending /= (blending.x + blending.y + blending.z);
  
  vec2 uvX = v_worldPos.yz * 0.1;
  vec2 uvY = v_worldPos.xz * 0.1;
  vec2 uvZ = v_worldPos.xy * 0.1;
  
  vec4 texX = texture(u_texture, uvX);
  vec4 texY = texture(u_texture, uvY);
  vec4 texZ = texture(u_texture, uvZ);
  
  fragColor = texX * blending.x + texY * blending.y + texZ * blending.z;
}
```

## UV 动画

### 滚动纹理

```glsl
uniform float u_time;

void main() {
  vec2 uv = v_texCoord;
  uv.x += u_time * 0.1;  // 水平滚动
  fragColor = texture(u_texture, uv);
}
```

### 帧动画

```glsl
uniform int u_frame;
uniform vec2 u_gridSize;  // 如 (4, 4) 表示 4x4 网格

void main() {
  int col = u_frame % int(u_gridSize.x);
  int row = u_frame / int(u_gridSize.x);
  
  vec2 frameSize = 1.0 / u_gridSize;
  vec2 uv = v_texCoord * frameSize;
  uv.x += float(col) * frameSize.x;
  uv.y += float(row) * frameSize.y;
  
  fragColor = texture(u_spriteSheet, uv);
}
```

### 扭曲动画

```glsl
uniform float u_time;
uniform sampler2D u_distortionMap;

void main() {
  vec2 distortion = texture(u_distortionMap, v_texCoord + u_time * 0.05).rg;
  distortion = distortion * 2.0 - 1.0;  // [0,1] -> [-1,1]
  
  vec2 uv = v_texCoord + distortion * 0.02;
  fragColor = texture(u_texture, uv);
}
```

## UV 精度问题

### 大 UV 值精度

```glsl
// 问题：UV 值很大时精度下降
// v_texCoord = (1000.5, 1000.5) 精度不够

// 解决：使用 fract
void main() {
  vec2 uv = fract(v_texCoord);  // 只保留小数部分
  fragColor = texture(u_texture, uv);
}
```

### 导数不连续

```glsl
// fract 在整数边界导数不连续，影响 mipmap 选择

// 解决：使用 textureGrad 手动指定导数
void main() {
  vec2 dx = dFdx(v_texCoord);  // 在 fract 之前计算
  vec2 dy = dFdy(v_texCoord);
  vec2 uv = fract(v_texCoord);
  
  fragColor = textureGrad(u_texture, uv, dx, dy);
}
```

## 本章小结

- UV 坐标将 2D 纹理映射到 3D 表面
- 可以在着色器中变换 UV 实现缩放、平移、旋转
- 环绕模式控制 UV 超出 [0,1] 的行为
- 纹理图集减少纹理切换开销
- 程序化 UV 可实现平面、球面、立方体映射
- 三平面投影适合无 UV 的地形
- UV 动画创建滚动、帧动画、扭曲效果

下一章，我们将学习纹理采样与过滤。
