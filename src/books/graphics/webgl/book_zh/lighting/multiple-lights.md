# 多光源渲染

> "真实场景由多个光源照亮，多光源渲染是必备技能。"

## 多光源基础

### 累加原理

```
┌─────────────────────────────────────────────────────────┐
│                    多光源累加                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   光源1 贡献         光源2 贡献        最终结果         │
│   ┌─────────┐       ┌─────────┐      ┌─────────┐       │
│   │ ▓░░░░░░ │   +   │ ░░░░░▓▓ │  =   │ ▓░░░░▓▓ │       │
│   │ ▓▓░░░░░ │       │ ░░░░▓▓▓ │      │ ▓▓░░▓▓▓ │       │
│   └─────────┘       └─────────┘      └─────────┘       │
│                                                         │
│   最终颜色 = Σ (每个光源的贡献)                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 光源类型定义

```glsl
// 方向光
struct DirectionalLight {
  vec3 direction;
  vec3 color;
  float intensity;
};

// 点光源
struct PointLight {
  vec3 position;
  vec3 color;
  float intensity;
  float range;
};

// 聚光灯
struct SpotLight {
  vec3 position;
  vec3 direction;
  vec3 color;
  float intensity;
  float innerAngle;
  float outerAngle;
  float range;
};
```

## 前向渲染

### 单 Pass 多光源

```glsl
#version 300 es
precision highp float;

#define MAX_DIR_LIGHTS 2
#define MAX_POINT_LIGHTS 8
#define MAX_SPOT_LIGHTS 4

uniform int u_numDirLights;
uniform int u_numPointLights;
uniform int u_numSpotLights;

uniform DirectionalLight u_dirLights[MAX_DIR_LIGHTS];
uniform PointLight u_pointLights[MAX_POINT_LIGHTS];
uniform SpotLight u_spotLights[MAX_SPOT_LIGHTS];

uniform vec3 u_viewPos;
uniform vec3 u_ambientColor;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_texCoord;

out vec4 fragColor;

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_viewPos - v_worldPos);
  
  // 从材质获取属性
  vec3 albedo = texture(u_diffuseMap, v_texCoord).rgb;
  float specular = texture(u_specularMap, v_texCoord).r;
  
  // 环境光
  vec3 result = u_ambientColor * albedo;
  
  // 累加方向光
  for (int i = 0; i < u_numDirLights; i++) {
    result += calcDirectionalLight(u_dirLights[i], N, V, albedo, specular);
  }
  
  // 累加点光源
  for (int i = 0; i < u_numPointLights; i++) {
    result += calcPointLight(u_pointLights[i], N, V, v_worldPos, albedo, specular);
  }
  
  // 累加聚光灯
  for (int i = 0; i < u_numSpotLights; i++) {
    result += calcSpotLight(u_spotLights[i], N, V, v_worldPos, albedo, specular);
  }
  
  fragColor = vec4(result, 1.0);
}
```

### 光源计算函数

```glsl
vec3 calcDirectionalLight(DirectionalLight light, vec3 N, vec3 V, vec3 albedo, float specular) {
  vec3 L = normalize(-light.direction);
  vec3 H = normalize(L + V);
  
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  
  vec3 diffuse = light.color * albedo * NdotL;
  vec3 spec = light.color * specular * pow(NdotH, 32.0);
  
  return (diffuse + spec) * light.intensity;
}

vec3 calcPointLight(PointLight light, vec3 N, vec3 V, vec3 fragPos, vec3 albedo, float specular) {
  vec3 lightVec = light.position - fragPos;
  float distance = length(lightVec);
  vec3 L = lightVec / distance;
  vec3 H = normalize(L + V);
  
  // 衰减
  float attenuation = 1.0 - smoothstep(0.0, light.range, distance);
  attenuation *= attenuation;  // 二次衰减
  
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  
  vec3 diffuse = light.color * albedo * NdotL;
  vec3 spec = light.color * specular * pow(NdotH, 32.0);
  
  return (diffuse + spec) * light.intensity * attenuation;
}

vec3 calcSpotLight(SpotLight light, vec3 N, vec3 V, vec3 fragPos, vec3 albedo, float specular) {
  vec3 lightVec = light.position - fragPos;
  float distance = length(lightVec);
  vec3 L = lightVec / distance;
  vec3 H = normalize(L + V);
  
  // 聚光锥
  float theta = dot(L, normalize(-light.direction));
  float epsilon = light.innerAngle - light.outerAngle;
  float spotIntensity = clamp((theta - light.outerAngle) / epsilon, 0.0, 1.0);
  
  // 距离衰减
  float attenuation = 1.0 - smoothstep(0.0, light.range, distance);
  
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  
  vec3 diffuse = light.color * albedo * NdotL;
  vec3 spec = light.color * specular * pow(NdotH, 32.0);
  
  return (diffuse + spec) * light.intensity * attenuation * spotIntensity;
}
```

## 多 Pass 渲染

### 概念

```
┌─────────────────────────────────────────────────────────┐
│                    多 Pass 渲染                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Pass 1: 环境光 + 主光源                               │
│   ┌─────────────────────────────────────┐              │
│   │ 渲染场景，使用主光源                 │              │
│   │ 混合模式: REPLACE                    │              │
│   └─────────────────────────────────────┘              │
│                                                         │
│   Pass 2-N: 附加光源                                    │
│   ┌─────────────────────────────────────┐              │
│   │ 渲染场景，使用一个附加光源            │              │
│   │ 混合模式: ADD                        │              │
│   └─────────────────────────────────────┘              │
│                                                         │
│   优点: 支持无限光源                                    │
│   缺点: 每个光源一次绘制调用                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 实现

```javascript
function renderMultiPass(scene, lights) {
  // 第一遍：环境光 + 主光源
  gl.depthFunc(gl.LESS);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  
  gl.useProgram(ambientProgram);
  setAmbientUniforms();
  renderScene();
  
  gl.useProgram(lightingProgram);
  setLightUniforms(lights[0]);  // 主光源
  renderScene();
  
  // 后续遍：附加光源
  gl.depthFunc(gl.EQUAL);  // 只渲染相同深度的片元
  gl.depthMask(false);     // 不写入深度
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);  // 加法混合
  
  for (let i = 1; i < lights.length; i++) {
    setLightUniforms(lights[i]);
    renderScene();
  }
  
  // 恢复状态
  gl.depthFunc(gl.LESS);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
}
```

## UBO 光源管理

### 定义 UBO 结构

```glsl
// 着色器中
layout(std140) uniform LightBlock {
  vec4 dirLightDirs[2];      // direction.xyz, intensity
  vec4 dirLightColors[2];    // color.rgb, unused
  vec4 pointLightPos[8];     // position.xyz, range
  vec4 pointLightColors[8];  // color.rgb, intensity
  ivec4 lightCounts;         // numDir, numPoint, numSpot, unused
};
```

### JavaScript 更新

```javascript
const FLOAT_SIZE = 4;
const VEC4_SIZE = 16;

// 创建 UBO
const lightUBO = gl.createBuffer();
gl.bindBuffer(gl.UNIFORM_BUFFER, lightUBO);
gl.bufferData(gl.UNIFORM_BUFFER, LIGHT_BLOCK_SIZE, gl.DYNAMIC_DRAW);

// 绑定到绑定点
gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, lightUBO);

function updateLights(lights) {
  const data = new Float32Array(LIGHT_BLOCK_SIZE / FLOAT_SIZE);
  
  let offset = 0;
  
  // 方向光方向
  for (let i = 0; i < 2; i++) {
    if (i < lights.directional.length) {
      const light = lights.directional[i];
      data.set([...light.direction, light.intensity], offset);
    }
    offset += 4;
  }
  
  // 方向光颜色
  for (let i = 0; i < 2; i++) {
    if (i < lights.directional.length) {
      const light = lights.directional[i];
      data.set([...light.color, 0], offset);
    }
    offset += 4;
  }
  
  // 点光源位置
  for (let i = 0; i < 8; i++) {
    if (i < lights.point.length) {
      const light = lights.point[i];
      data.set([...light.position, light.range], offset);
    }
    offset += 4;
  }
  
  // 点光源颜色
  for (let i = 0; i < 8; i++) {
    if (i < lights.point.length) {
      const light = lights.point[i];
      data.set([...light.color, light.intensity], offset);
    }
    offset += 4;
  }
  
  // 光源数量
  const counts = new Int32Array([
    lights.directional.length,
    lights.point.length,
    lights.spot.length,
    0
  ]);
  data.set(new Float32Array(counts.buffer), offset);
  
  // 上传数据
  gl.bindBuffer(gl.UNIFORM_BUFFER, lightUBO);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
}
```

## 延迟渲染

### 概念

```
┌─────────────────────────────────────────────────────────┐
│                    延迟渲染流程                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   几何 Pass: 渲染到 G-Buffer                            │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│   │ Position│ │ Normal  │ │ Albedo  │ │ Specular│      │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                         │
│   光照 Pass: 使用 G-Buffer 计算光照                     │
│   ┌─────────────────────────────────────────┐          │
│   │ 读取 G-Buffer，对每个光源计算光照         │          │
│   │ 输出到颜色缓冲                           │          │
│   └─────────────────────────────────────────┘          │
│                                                         │
│   优点: 光源数量不影响几何复杂度                        │
│   缺点: 带宽消耗大，不支持透明                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### G-Buffer 设置

```javascript
function createGBuffer(width, height) {
  const gBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);
  
  // 位置纹理 (RGB16F)
  const positionTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, positionTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, positionTexture, 0);
  
  // 法线纹理 (RGB16F)
  const normalTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, normalTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, normalTexture, 0);
  
  // Albedo + Specular (RGBA8)
  const albedoSpecTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, albedoSpecTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, albedoSpecTexture, 0);
  
  // 深度缓冲
  const depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
  
  // 设置绘制缓冲
  gl.drawBuffers([
    gl.COLOR_ATTACHMENT0,
    gl.COLOR_ATTACHMENT1,
    gl.COLOR_ATTACHMENT2
  ]);
  
  return {
    framebuffer: gBuffer,
    position: positionTexture,
    normal: normalTexture,
    albedoSpec: albedoSpecTexture,
    depth: depthTexture
  };
}
```

### 几何 Pass 着色器

```glsl
// 片元着色器
#version 300 es
precision highp float;

layout(location = 0) out vec4 gPosition;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gAlbedoSpec;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_specularMap;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_texCoord;

void main() {
  gPosition = vec4(v_worldPos, 1.0);
  gNormal = vec4(normalize(v_normal), 0.0);
  
  vec3 albedo = texture(u_diffuseMap, v_texCoord).rgb;
  float specular = texture(u_specularMap, v_texCoord).r;
  gAlbedoSpec = vec4(albedo, specular);
}
```

### 光照 Pass 着色器

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_gPosition;
uniform sampler2D u_gNormal;
uniform sampler2D u_gAlbedoSpec;

uniform vec3 u_viewPos;

// 光源 uniforms...

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  // 从 G-Buffer 读取数据
  vec3 fragPos = texture(u_gPosition, v_texCoord).rgb;
  vec3 normal = texture(u_gNormal, v_texCoord).rgb;
  vec4 albedoSpec = texture(u_gAlbedoSpec, v_texCoord);
  vec3 albedo = albedoSpec.rgb;
  float specular = albedoSpec.a;
  
  vec3 V = normalize(u_viewPos - fragPos);
  
  // 计算光照
  vec3 result = u_ambientColor * albedo;
  
  for (int i = 0; i < u_numPointLights; i++) {
    result += calcPointLight(u_pointLights[i], normal, V, fragPos, albedo, specular);
  }
  
  fragColor = vec4(result, 1.0);
}
```

### 光源体积优化

```javascript
// 只在光源影响范围内渲染
function renderLightVolumes(lights) {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT);  // 从内部看光源体积
  
  gl.useProgram(pointLightProgram);
  
  for (const light of lights.point) {
    // 绘制光源范围的球体
    const scale = light.range;
    const modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, light.position);
    mat4.scale(modelMatrix, modelMatrix, [scale, scale, scale]);
    
    gl.uniformMatrix4fv(u_model, false, modelMatrix);
    setLightUniforms(light);
    
    drawSphere();
  }
  
  gl.cullFace(gl.BACK);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
}
```

## 分簇渲染

### 概念

```
┌─────────────────────────────────────────────────────────┐
│                    分簇渲染                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   将视锥体分割成 3D 簇 (Cluster)                        │
│                                                         │
│        ┌─┬─┬─┬─┐                                       │
│       /├─┼─┼─┼─┤\                                      │
│      / ├─┼─┼─┼─┤ \                                     │
│     /  ├─┼─┼─┼─┤  \                                    │
│    /   ├─┼─┼─┼─┤   \                                   │
│   近   └─┴─┴─┴─┘   远                                  │
│                                                         │
│   每个簇记录影响它的光源列表                            │
│   渲染时只计算相关光源                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 簇划分

```javascript
const CLUSTER_X = 16;
const CLUSTER_Y = 9;
const CLUSTER_Z = 24;

function buildClusters(camera, lights) {
  const clusters = new Array(CLUSTER_X * CLUSTER_Y * CLUSTER_Z)
    .fill(null)
    .map(() => []);
  
  const near = camera.near;
  const far = camera.far;
  
  for (const light of lights) {
    // 计算光源在视图空间的位置
    const viewPos = vec3.transformMat4([], light.position, camera.viewMatrix);
    
    // 计算影响的簇范围
    const lightRadius = light.range;
    const minZ = Math.max(0, getZSlice(-viewPos[2] - lightRadius, near, far));
    const maxZ = Math.min(CLUSTER_Z - 1, getZSlice(-viewPos[2] + lightRadius, near, far));
    
    for (let z = minZ; z <= maxZ; z++) {
      const sliceDepth = getSliceDepth(z, near, far);
      
      for (let y = 0; y < CLUSTER_Y; y++) {
        for (let x = 0; x < CLUSTER_X; x++) {
          if (lightIntersectsCluster(light, x, y, z, camera)) {
            const idx = x + y * CLUSTER_X + z * CLUSTER_X * CLUSTER_Y;
            clusters[idx].push(light.index);
          }
        }
      }
    }
  }
  
  return clusters;
}

function getZSlice(depth, near, far) {
  // 对数划分
  return Math.floor(CLUSTER_Z * Math.log(depth / near) / Math.log(far / near));
}
```

## 性能优化

### 光源剔除

```javascript
function cullLights(lights, frustum) {
  return lights.filter(light => {
    if (light.type === 'directional') return true;
    
    // 球体与视锥体相交测试
    for (const plane of frustum.planes) {
      const dist = vec3.dot(plane.normal, light.position) + plane.distance;
      if (dist < -light.range) return false;
    }
    return true;
  });
}
```

### 光源排序

```javascript
function sortLightsByImportance(lights, viewPos) {
  return lights.sort((a, b) => {
    const importanceA = getLightImportance(a, viewPos);
    const importanceB = getLightImportance(b, viewPos);
    return importanceB - importanceA;
  });
}

function getLightImportance(light, viewPos) {
  const distance = vec3.distance(light.position, viewPos);
  return light.intensity / (distance * distance);
}
```

## 本章小结

- 多光源渲染累加各光源贡献
- 前向渲染：单 Pass 多光源或多 Pass
- UBO 可高效管理大量光源数据
- 延迟渲染将几何和光照分离
- 分簇渲染进一步优化光源查找
- 光源剔除和排序可减少计算量

下一章，我们将学习帧缓冲对象。
