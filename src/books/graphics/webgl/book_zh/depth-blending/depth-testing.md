# 深度测试

> "深度测试决定片元是否通过，控制可见性的最终裁决。"

## 深度测试函数

### 设置比较函数

```javascript
// 设置深度比较函数
gl.depthFunc(gl.LESS);  // 默认值
```

### 所有比较函数

| 函数 | 说明 | 通过条件 |
|------|------|----------|
| `gl.NEVER` | 永不通过 | 无 |
| `gl.LESS` | 小于 | 片元深度 < 缓冲深度 |
| `gl.EQUAL` | 等于 | 片元深度 = 缓冲深度 |
| `gl.LEQUAL` | 小于等于 | 片元深度 ≤ 缓冲深度 |
| `gl.GREATER` | 大于 | 片元深度 > 缓冲深度 |
| `gl.NOTEQUAL` | 不等于 | 片元深度 ≠ 缓冲深度 |
| `gl.GEQUAL` | 大于等于 | 片元深度 ≥ 缓冲深度 |
| `gl.ALWAYS` | 总是通过 | 所有 |

### 比较过程

```
┌─────────────────────────────────────────────────────────┐
│                    深度测试流程                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   片元深度值 (0.3)                                      │
│        │                                                │
│        ▼                                                │
│   ┌─────────────┐                                       │
│   │ 深度比较    │ <── 缓冲深度值 (0.5)                 │
│   │ (gl.LESS)   │                                       │
│   └──────┬──────┘                                       │
│          │                                              │
│    ┌─────┴─────┐                                        │
│    ▼           ▼                                        │
│  通过        失败                                       │
│  (0.3<0.5)   (丢弃片元)                                │
│    │                                                    │
│    ▼                                                    │
│  更新缓冲 (0.3)                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 常用测试模式

### 标准渲染（LESS）

```javascript
// 最常用：较近的物体覆盖较远的
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LESS);
gl.clearDepth(1.0);
```

### 天空盒渲染（LEQUAL）

```javascript
// 天空盒深度设为最远（1.0）
function renderSkybox() {
  gl.depthFunc(gl.LEQUAL);  // 允许等于
  
  // 顶点着色器中: gl_Position = pos.xyww
  // 这使深度固定为 1.0
  
  drawSkybox();
  
  gl.depthFunc(gl.LESS);  // 恢复
}
```

### 反向 Z（GREATER）

```javascript
// 使用反向 Z 提高精度
gl.clearDepth(0.0);       // 清除为最近
gl.depthFunc(gl.GREATER); // 较大深度通过
```

### 相等测试（EQUAL）

```javascript
// 用于多遍渲染，精确匹配深度
function secondPass() {
  gl.depthFunc(gl.EQUAL);
  gl.depthMask(false);  // 不修改深度
  
  // 渲染额外效果...
  
  gl.depthMask(true);
  gl.depthFunc(gl.LESS);
}
```

## 提前深度测试

### 概念

```
┌─────────────────────────────────────────────────────────┐
│                Early-Z 优化                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   传统流程:                                              │
│   顶点着色 → 光栅化 → 片元着色 → 深度测试                │
│                           ↑                             │
│                       浪费计算                          │
│                                                         │
│   Early-Z 流程:                                         │
│   顶点着色 → 光栅化 → 深度测试 → 片元着色                │
│                           ↓                             │
│                    跳过被遮挡片元                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 触发条件

```javascript
// Early-Z 会被禁用如果:
// 1. 片元着色器写入 gl_FragDepth
// 2. 片元着色器使用 discard
// 3. 开启了 Alpha 测试

// 保持 Early-Z 的做法:
// - 避免在着色器中修改深度
// - 尽量不使用 discard（或分开渲染）
// - 从前往后渲染不透明物体
```

### 深度预渲染

```javascript
// 先只写入深度，再渲染颜色
function renderWithDepthPrepass() {
  // 第一遍：只写入深度
  gl.colorMask(false, false, false, false);
  gl.depthMask(true);
  gl.depthFunc(gl.LESS);
  
  drawScene();  // 使用简单着色器
  
  // 第二遍：渲染颜色
  gl.colorMask(true, true, true, true);
  gl.depthMask(false);
  gl.depthFunc(gl.EQUAL);
  
  drawScene();  // 使用完整着色器
  
  gl.depthMask(true);
  gl.depthFunc(gl.LESS);
}
```

## 条件渲染

### 按深度选择着色

```glsl
uniform sampler2D u_depthTexture;
uniform float u_threshold;

void main() {
  float depth = texture(u_depthTexture, v_texCoord).r;
  
  if (depth < u_threshold) {
    // 近处物体
    fragColor = u_nearColor;
  } else {
    // 远处物体
    fragColor = u_farColor;
  }
}
```

### 深度剥离

```javascript
// 用于正确渲染半透明物体
function depthPeeling(layers) {
  const depthTextures = [];
  const colorTextures = [];
  
  for (let i = 0; i < layers; i++) {
    // 设置当前层的帧缓冲
    gl.bindFramebuffer(gl.FRAMEBUFFER, layerFBO);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // 使用上一层深度作为参考
    if (i > 0) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, depthTextures[i - 1]);
      gl.uniform1i(u_prevDepth, 1);
    }
    
    // 渲染场景
    renderScene();
    
    // 保存结果
    depthTextures.push(currentDepthTexture);
    colorTextures.push(currentColorTexture);
  }
  
  // 合成所有层
  composeLayers(colorTextures);
}
```

## 深度偏差

### gl_FragDepth

```glsl
#version 300 es

in float v_linearDepth;

void main() {
  // 手动写入深度
  gl_FragDepth = v_linearDepth / u_far;
  
  fragColor = u_color;
}
```

### 对数深度缓冲

```glsl
// 顶点着色器
out float v_depth;

void main() {
  gl_Position = u_mvp * a_position;
  
  // 计算对数深度
  v_depth = log2(max(1e-6, 1.0 + gl_Position.w)) * C;
}

// 片元着色器
in float v_depth;

void main() {
  gl_FragDepth = v_depth * 0.5;
  fragColor = u_color;
}
```

## 遮挡查询

### 创建和使用

```javascript
// 创建遮挡查询
const query = gl.createQuery();

// 开始查询
gl.beginQuery(gl.ANY_SAMPLES_PASSED, query);

// 渲染包围盒
drawBoundingBox(object);

// 结束查询
gl.endQuery(gl.ANY_SAMPLES_PASSED);

// 稍后检查结果
if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
  const passed = gl.getQueryParameter(query, gl.QUERY_RESULT);
  
  if (passed > 0) {
    // 物体可见，渲染完整模型
    drawFullModel(object);
  }
}
```

### 保守遮挡查询

```javascript
// ANY_SAMPLES_PASSED_CONSERVATIVE 更高效
gl.beginQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE, query);
drawBoundingBox();
gl.endQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE);
```

### 异步结果

```javascript
// 遮挡查询结果是异步的
function checkQueryResult(query, callback) {
  if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
    const result = gl.getQueryParameter(query, gl.QUERY_RESULT);
    callback(result);
  } else {
    // 等待下一帧
    requestAnimationFrame(() => checkQueryResult(query, callback));
  }
}
```

## 渲染顺序优化

### 从前到后

```javascript
// 不透明物体从前往后渲染（利用 Early-Z）
function sortFrontToBack(objects, camera) {
  return objects.sort((a, b) => {
    const distA = vec3.distance(a.position, camera.position);
    const distB = vec3.distance(b.position, camera.position);
    return distA - distB;  // 近的在前
  });
}

function render() {
  // 先渲染不透明物体（从前到后）
  const opaqueObjects = sortFrontToBack(opaqueList, camera);
  opaqueObjects.forEach(obj => draw(obj));
  
  // 再渲染半透明物体（从后到前）
  const transparentObjects = sortFrontToBack(transparentList, camera).reverse();
  transparentObjects.forEach(obj => draw(obj));
}
```

### 状态排序

```javascript
// 按材质/着色器分组，减少状态切换
function sortByMaterial(objects) {
  const groups = new Map();
  
  objects.forEach(obj => {
    const key = obj.material.id;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(obj);
  });
  
  return groups;
}
```

## 本章小结

- `gl.depthFunc()` 设置深度比较函数
- 常用 LESS（默认）、LEQUAL（天空盒）、GREATER（反向 Z）
- Early-Z 优化可跳过被遮挡片元
- 深度预渲染可避免复杂着色器浪费
- 遮挡查询用于可见性剔除
- 从前往后渲染不透明物体利用 Early-Z
- 从后往前渲染半透明物体保证正确混合

下一章，我们将学习 Alpha 混合。
