# 立方体贴图

> "立方体贴图将环境捕获到六个方向，创造沉浸式视觉效果。"

## 什么是立方体贴图

### 定义

立方体贴图（Cube Map）是由六个正方形纹理组成的特殊纹理，代表一个虚拟立方体的六个面。

```
┌─────────────────────────────────────────────────────────┐
│                    立方体贴图展开                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────┐                                    │
│              │ +Y  │                                    │
│              │ TOP │                                    │
│       ┌─────┼─────┼─────┬─────┐                        │
│       │ -X  │ +Z  │ +X  │ -Z  │                        │
│       │LEFT │FRONT│RIGHT│BACK │                        │
│       └─────┼─────┼─────┴─────┘                        │
│              │ -Y  │                                    │
│              │BOTM │                                    │
│              └─────┘                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 坐标系统

```
        +Y
         │
         │
   -X ───┼─── +X
        /│
       / │
     +Z  │
         -Y

使用 3D 方向向量采样
```

## 创建立方体贴图

### 基本创建

```javascript
const cubeMap = gl.createTexture();
gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

// 六个面的目标
const targets = [
  gl.TEXTURE_CUBE_MAP_POSITIVE_X,  // +X: 右
  gl.TEXTURE_CUBE_MAP_NEGATIVE_X,  // -X: 左
  gl.TEXTURE_CUBE_MAP_POSITIVE_Y,  // +Y: 上
  gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,  // -Y: 下
  gl.TEXTURE_CUBE_MAP_POSITIVE_Z,  // +Z: 前
  gl.TEXTURE_CUBE_MAP_NEGATIVE_Z   // -Z: 后
];

// 上传六个面
targets.forEach((target, index) => {
  gl.texImage2D(
    target,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    images[index]
  );
});

// 设置参数
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
```

### 从图像加载

```javascript
async function loadCubeMap(urls) {
  const cubeMap = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  
  const targets = [
    gl.TEXTURE_CUBE_MAP_POSITIVE_X,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
  ];
  
  // 临时填充
  targets.forEach(target => {
    gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
                  new Uint8Array([128, 128, 128, 255]));
  });
  
  // 加载图像
  const loadPromises = urls.map((url, i) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
        gl.texImage2D(targets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        resolve();
      };
      image.onerror = reject;
      image.src = url;
    });
  });
  
  await Promise.all(loadPromises);
  
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  
  return cubeMap;
}

// 使用
const skybox = await loadCubeMap([
  'right.jpg', 'left.jpg',
  'top.jpg', 'bottom.jpg',
  'front.jpg', 'back.jpg'
]);
```

### 从单张全景图生成

```javascript
// 从等距柱状投影图生成立方体贴图
function equirectToCubemap(equirectTexture, size) {
  const cubeMap = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  
  // 创建帧缓冲用于渲染每个面
  const fbo = gl.createFramebuffer();
  
  const targets = [
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, dir: [1, 0, 0], up: [0, -1, 0] },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, dir: [-1, 0, 0], up: [0, -1, 0] },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, dir: [0, 1, 0], up: [0, 0, 1] },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, dir: [0, -1, 0], up: [0, 0, -1] },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, dir: [0, 0, 1], up: [0, -1, 0] },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, dir: [0, 0, -1], up: [0, -1, 0] }
  ];
  
  // 为每个面分配空间
  targets.forEach(({ target }) => {
    gl.texImage2D(target, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  });
  
  // 渲染每个面...
  
  return cubeMap;
}
```

## 采样立方体贴图

### 着色器采样

```glsl
uniform samplerCube u_envMap;

void main() {
  // 使用 3D 方向向量采样
  vec3 direction = normalize(v_worldPos);
  vec4 color = texture(u_envMap, direction);
  
  fragColor = color;
}
```

### 方向向量

```glsl
// 不同用途的方向向量

// 天空盒：使用视图方向
vec3 viewDir = normalize(v_position);

// 反射：反射视图方向
vec3 viewDir = normalize(v_worldPos - u_cameraPos);
vec3 reflectDir = reflect(viewDir, normalize(v_normal));
vec4 reflection = texture(u_envMap, reflectDir);

// 折射
vec3 refractDir = refract(viewDir, normalize(v_normal), 1.0 / 1.33);
vec4 refraction = texture(u_envMap, refractDir);
```

## 天空盒

### 天空盒几何体

```javascript
// 简单的立方体顶点
const skyboxVertices = new Float32Array([
  // 位置
  -1, -1, -1,
   1, -1, -1,
   1,  1, -1,
  -1,  1, -1,
  -1, -1,  1,
   1, -1,  1,
   1,  1,  1,
  -1,  1,  1
]);

const skyboxIndices = new Uint16Array([
  // 前
  0, 1, 2, 0, 2, 3,
  // 后
  5, 4, 7, 5, 7, 6,
  // 上
  3, 2, 6, 3, 6, 7,
  // 下
  4, 5, 1, 4, 1, 0,
  // 右
  1, 5, 6, 1, 6, 2,
  // 左
  4, 0, 3, 4, 3, 7
]);
```

### 天空盒着色器

```glsl
// 顶点着色器
#version 300 es

in vec3 a_position;

uniform mat4 u_viewProjection;  // 移除平移的视图投影矩阵

out vec3 v_texCoord;

void main() {
  v_texCoord = a_position;
  
  vec4 pos = u_viewProjection * vec4(a_position, 1.0);
  gl_Position = pos.xyww;  // 深度为最远
}

// 片元着色器
#version 300 es
precision highp float;

in vec3 v_texCoord;

uniform samplerCube u_skybox;

out vec4 fragColor;

void main() {
  fragColor = texture(u_skybox, v_texCoord);
}
```

### 渲染天空盒

```javascript
function renderSkybox() {
  gl.depthFunc(gl.LEQUAL);  // 允许深度等于 1.0
  gl.depthMask(false);      // 不写入深度
  
  gl.useProgram(skyboxProgram);
  
  // 移除视图矩阵的平移部分
  const viewRotation = mat4.clone(viewMatrix);
  viewRotation[12] = 0;
  viewRotation[13] = 0;
  viewRotation[14] = 0;
  
  const vpMatrix = mat4.create();
  mat4.multiply(vpMatrix, projectionMatrix, viewRotation);
  
  gl.uniformMatrix4fv(u_viewProjection, false, vpMatrix);
  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
  gl.uniform1i(u_skybox, 0);
  
  gl.bindVertexArray(skyboxVAO);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  
  gl.depthFunc(gl.LESS);
  gl.depthMask(true);
}
```

## 环境反射

### 简单反射

```glsl
uniform samplerCube u_envMap;
uniform vec3 u_cameraPos;

in vec3 v_worldPos;
in vec3 v_normal;

void main() {
  vec3 I = normalize(v_worldPos - u_cameraPos);
  vec3 R = reflect(I, normalize(v_normal));
  
  vec4 envColor = texture(u_envMap, R);
  
  // 混合反射和基础颜色
  vec4 baseColor = vec4(0.5, 0.5, 0.5, 1.0);
  fragColor = mix(baseColor, envColor, 0.5);
}
```

### 菲涅尔反射

```glsl
// 菲涅尔效应：边缘更反光
float fresnel(vec3 viewDir, vec3 normal) {
  return pow(1.0 - max(dot(-viewDir, normal), 0.0), 5.0);
}

void main() {
  vec3 I = normalize(v_worldPos - u_cameraPos);
  vec3 N = normalize(v_normal);
  vec3 R = reflect(I, N);
  
  float F = fresnel(I, N);
  
  vec4 envColor = texture(u_envMap, R);
  vec4 baseColor = u_diffuseColor;
  
  fragColor = mix(baseColor, envColor, F);
}
```

### 粗糙度反射

```glsl
// 使用 LOD 模拟粗糙度
uniform float u_roughness;

void main() {
  vec3 R = reflect(I, N);
  
  // 粗糙度越高，使用越模糊的 mipmap
  float lod = u_roughness * 8.0;  // 假设 8 级 mipmap
  
  vec4 envColor = textureLod(u_envMap, R, lod);
  fragColor = envColor;
}
```

## 折射

### 基本折射

```glsl
uniform samplerCube u_envMap;
uniform float u_ior;  // 折射率

void main() {
  vec3 I = normalize(v_worldPos - u_cameraPos);
  vec3 N = normalize(v_normal);
  
  // 折射向量
  vec3 T = refract(I, N, 1.0 / u_ior);
  
  vec4 refractColor = texture(u_envMap, T);
  fragColor = refractColor;
}
```

### 色散效果

```glsl
// 不同波长不同折射率
uniform float u_iorR;  // 红色折射率
uniform float u_iorG;  // 绿色折射率
uniform float u_iorB;  // 蓝色折射率

void main() {
  vec3 I = normalize(v_worldPos - u_cameraPos);
  vec3 N = normalize(v_normal);
  
  vec3 TR = refract(I, N, 1.0 / u_iorR);
  vec3 TG = refract(I, N, 1.0 / u_iorG);
  vec3 TB = refract(I, N, 1.0 / u_iorB);
  
  float r = texture(u_envMap, TR).r;
  float g = texture(u_envMap, TG).g;
  float b = texture(u_envMap, TB).b;
  
  fragColor = vec4(r, g, b, 1.0);
}
```

## 动态立方体贴图

### 实时环境捕获

```javascript
// 创建渲染目标立方体贴图
const dynamicCubeMap = gl.createTexture();
gl.bindTexture(gl.TEXTURE_CUBE_MAP, dynamicCubeMap);

const targets = [
  gl.TEXTURE_CUBE_MAP_POSITIVE_X,
  gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
  gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
  gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
  gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
  gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
];

targets.forEach(target => {
  gl.texImage2D(target, 0, gl.RGBA8, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
});

// 创建帧缓冲
const fbo = gl.createFramebuffer();
const depthBuffer = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, 256, 256);
```

### 渲染六个方向

```javascript
const cameraDirections = [
  { dir: [1, 0, 0], up: [0, -1, 0] },   // +X
  { dir: [-1, 0, 0], up: [0, -1, 0] },  // -X
  { dir: [0, 1, 0], up: [0, 0, 1] },    // +Y
  { dir: [0, -1, 0], up: [0, 0, -1] },  // -Y
  { dir: [0, 0, 1], up: [0, -1, 0] },   // +Z
  { dir: [0, 0, -1], up: [0, -1, 0] }   // -Z
];

function renderDynamicCubeMap(position) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, 256, 256);
  
  const projection = mat4.create();
  mat4.perspective(projection, Math.PI / 2, 1, 0.1, 100);
  
  targets.forEach((target, i) => {
    // 附加目标面
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, dynamicCubeMap, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    
    // 计算视图矩阵
    const view = mat4.create();
    const dir = cameraDirections[i].dir;
    const up = cameraDirections[i].up;
    const target = [position[0] + dir[0], position[1] + dir[1], position[2] + dir[2]];
    mat4.lookAt(view, position, target, up);
    
    // 渲染场景
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    renderScene(view, projection);
  });
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
```

## 无缝边缘

### 启用无缝采样

```javascript
// WebGL 2.0 自动处理立方体贴图边缘

// 确保使用正确的环绕模式
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
```

## 本章小结

- 立方体贴图由六个正方形纹理组成
- 使用 3D 方向向量采样
- 适用于天空盒、环境反射、折射
- 天空盒使用特殊深度技巧渲染在最远处
- 反射使用 reflect 函数计算方向
- 菲涅尔效应使边缘更反光
- 动态立方体贴图需要渲染六次场景

下一章，我们将学习 3D 纹理。
