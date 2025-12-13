# 增添质感：阴影、滤镜与过渡

你有没有注意过，为什么有些网站让人觉得"高级"，而有些网站看起来"廉价"？

很多时候，差别不在于布局或颜色，而在于那些微妙的细节——按钮悬停时轻轻上浮、卡片带着柔和的阴影、图片在悬停时微微放大。这些效果单独看很小，组合起来却能让界面从"能用"变成"想用"。

本章我们将通过构建一个产品展示页，系统学习 UnoCSS 的视觉效果工具。你会发现，专业级的交互效果并不神秘。

---

## 1. 从一个产品卡片开始

假设我们要为一个电商网站设计产品卡片。先看最基础的版本：

```html
<div class="border rounded-lg p-4">
  <img src="product.jpg" alt="产品图" class="w-full" />
  <h3 class="mt-4 font-semibold">无线蓝牙耳机</h3>
  <p class="text-gray-600">￥299</p>
  <button class="mt-4 w-full bg-blue-500 text-white py-2 rounded">
    加入购物车
  </button>
</div>
```

功能上没问题，但感觉很"扁"——没有深度，没有层次，像是贴在页面上的一张纸。

**问题在哪？** 缺少视觉深度。现实世界中的物体都有阴影、有质感。纯扁平的设计会让界面感觉不真实。

---

## 2. 阴影：创造深度

阴影是创造深度感最直接的方式。不同强度的阴影暗示元素离"背景"的距离不同。

### 2.1 为卡片添加阴影

```html
<!-- 无阴影：贴在背景上 -->
<div class="border rounded-lg p-4">...</div>

<!-- 轻微阴影：微微浮起 -->
<div class="shadow-sm rounded-lg p-4">...</div>

<!-- 中等阴影：明显浮动 -->
<div class="shadow rounded-lg p-4">...</div>

<!-- 较强阴影：高高悬浮 -->
<div class="shadow-lg rounded-lg p-4">...</div>
```

**选择哪个？** 取决于你想要的视觉层次。普通卡片用 `shadow` 或 `shadow-md`，弹窗用 `shadow-lg` 或 `shadow-xl`。阴影越深，元素看起来离背景越远。

### 2.2 阴影等级系统

UnoCSS 提供了一套完整的阴影等级：

```html
<div class="shadow-sm">最轻微，几乎看不见</div>
<div class="shadow">默认阴影，日常使用</div>
<div class="shadow-md">中等阴影，更明显</div>
<div class="shadow-lg">较强阴影，悬浮感</div>
<div class="shadow-xl">强阴影，弹窗常用</div>
<div class="shadow-2xl">最强阴影，极高层级</div>
```

**实际应用原则**：界面中不同层级的元素用不同阴影。背景是 0 级，普通卡片 1-2 级，悬浮菜单 3 级，模态框 4-5 级。层级越高，阴影越深。

### 2.3 内阴影：凹陷效果

除了外阴影，还有内阴影 `shadow-inner`，让元素看起来像是凹进去的：

```html
<!-- 输入框用内阴影暗示"可输入" -->
<input 
  class="shadow-inner bg-gray-100 border-none rounded px-3 py-2"
  placeholder="搜索商品..."
/>

<!-- 按钮按下时用内阴影暗示"按下" -->
<button class="bg-gray-200 px-4 py-2 rounded active:shadow-inner">
  点击我
</button>
```

**什么时候用内阴影？** 当你想让元素看起来"凹进去"而不是"浮起来"时。输入框、被按下的按钮、切换开关的轨道都是常见场景。

### 2.4 彩色阴影：光晕效果

默认阴影是灰色的。彩色阴影可以创造"发光"的效果：

```html
<button class="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg shadow-blue-500/40">
  发光的按钮
</button>

<div class="bg-purple-600 p-8 rounded-xl shadow-xl shadow-purple-500/30">
  带紫色光晕的卡片
</div>
```

`shadow-blue-500/40` 表示蓝色阴影，40% 透明度。**透明度很重要**——太高会显得假，通常 20%-50% 效果最好。

让我们把阴影应用到产品卡片：

```html
<div class="bg-white rounded-xl shadow-md p-4">
  <img src="product.jpg" alt="产品图" class="w-full rounded-lg" />
  <h3 class="mt-4 font-semibold">无线蓝牙耳机</h3>
  <p class="text-gray-600">￥299</p>
  <button class="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg shadow shadow-blue-500/30">
    加入购物车
  </button>
</div>
```

现在卡片有了浮动感，按钮有了轻微的蓝色光晕。

---

## 3. 过渡：让变化变得自然

静态的阴影还不够。真正让界面感觉"活"的是过渡效果——当状态变化时，不是瞬间切换，而是平滑过渡。

### 3.1 基础过渡

```html
<!-- 没有过渡：生硬地变色 -->
<button class="bg-blue-500 hover:bg-blue-600">点击</button>

<!-- 有过渡：平滑地变色 -->
<button class="bg-blue-500 hover:bg-blue-600 transition-colors">点击</button>
```

`transition-colors` 告诉浏览器：当颜色变化时，用动画过渡而不是瞬间切换。

### 3.2 过渡属性

UnoCSS 提供了几种过渡预设：

```html
<!-- 只过渡颜色相关属性 -->
<div class="transition-colors hover:bg-blue-500">颜色过渡</div>

<!-- 只过渡透明度 -->
<div class="transition-opacity hover:opacity-50">透明度过渡</div>

<!-- 只过渡阴影 -->
<div class="transition-shadow hover:shadow-lg">阴影过渡</div>

<!-- 只过渡变换（缩放、旋转、移动） -->
<div class="transition-transform hover:scale-105">变换过渡</div>

<!-- 过渡所有可动画属性 -->
<div class="transition-all hover:bg-blue-500 hover:scale-105">全部过渡</div>
```

**为什么要区分？** 性能考虑。`transition-all` 会监听所有属性变化，`transition-colors` 只监听颜色。越精确，性能越好。

### 3.3 过渡时长

默认过渡是 150ms，可以调整：

```html
<!-- 很快：75ms，适合微小变化 -->
<button class="transition-colors duration-75">快速</button>

<!-- 默认：150ms，大多数情况 -->
<button class="transition-colors duration-150">默认</button>

<!-- 适中：300ms，明显的变化 -->
<button class="transition-colors duration-300">适中</button>

<!-- 较慢：500ms，强调性动画 -->
<button class="transition-colors duration-500">较慢</button>
```

**怎么选择时长？** 变化越大，时长应该越长。颜色变化 100-200ms，位置移动 200-300ms，大型动画 300-500ms。太快会显得突兀，太慢会让人等待。

### 3.4 缓动函数

缓动函数控制变化的"节奏"：

```html
<!-- 线性：匀速变化，机械感 -->
<div class="transition-transform ease-linear hover:translate-x-10">线性</div>

<!-- 缓出：开始快，结束慢（推荐） -->
<div class="transition-transform ease-out hover:translate-x-10">缓出</div>

<!-- 缓入：开始慢，结束快 -->
<div class="transition-transform ease-in hover:translate-x-10">缓入</div>

<!-- 缓入缓出：开始慢，中间快，结束慢 -->
<div class="transition-transform ease-in-out hover:translate-x-10">缓入缓出</div>
```

**最佳实践**：大多数情况用 `ease-out`。它模拟了物理世界中的减速运动，感觉最自然。`ease-in` 适合元素"退出"的动画。

### 3.5 给产品卡片添加悬停效果

```html
<div class="bg-white rounded-xl shadow-md p-4 
            transition-shadow duration-300 ease-out 
            hover:shadow-xl">
  <img src="product.jpg" alt="产品图" class="w-full rounded-lg" />
  <h3 class="mt-4 font-semibold">无线蓝牙耳机</h3>
  <p class="text-gray-600">￥299</p>
  <button class="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg
                 transition-colors duration-200
                 hover:bg-blue-600">
    加入购物车
  </button>
</div>
```

现在悬停在卡片上，阴影会平滑地加深；悬停在按钮上，颜色会平滑地变深。

---

## 4. 变换：移动、缩放、旋转

CSS 变换可以改变元素的位置、大小、角度，而不影响文档流。

### 4.1 缩放效果

悬停时微微放大，暗示"可交互"：

```html
<div class="transition-transform duration-300 hover:scale-105">
  悬停放大 5%
</div>

<img class="transition-transform duration-500 hover:scale-110" src="product.jpg" />
```

**注意**：放大超过 10% 通常会显得夸张。5% 是常用的微妙效果。

### 4.2 位移效果

悬停时上浮，增强"点击感"：

```html
<button class="transition-transform duration-200 hover:-translate-y-1 
               shadow hover:shadow-lg">
  上浮按钮
</button>
```

`-translate-y-1` 向上移动 0.25rem。配合阴影加深，创造"浮起来"的效果。

### 4.3 旋转效果

```html
<!-- 悬停时轻微旋转 -->
<div class="transition-transform duration-300 hover:rotate-3">
  轻微倾斜
</div>

<!-- 展开/收起箭头 -->
<svg class="transition-transform duration-200" :class="{ 'rotate-180': isOpen }">
  <path d="M5 8l5 5 5-5" />
</svg>
```

### 4.4 组合变换

多种变换可以组合使用：

```html
<div class="transition-transform duration-300 
            hover:scale-105 hover:-translate-y-2 hover:rotate-1">
  放大 + 上浮 + 轻微旋转
</div>
```

### 4.5 变换原点

默认变换以元素中心为原点。有时需要改变：

```html
<!-- 从左上角开始缩放 -->
<div class="origin-top-left hover:scale-110">从左上角缩放</div>

<!-- 从底部开始旋转（像翻书） -->
<div class="origin-bottom hover:rotate-12">从底部旋转</div>
```

让我们给产品卡片添加悬停上浮效果：

```html
<div class="bg-white rounded-xl shadow-md p-4 
            transition-all duration-300 ease-out 
            hover:shadow-xl hover:-translate-y-2">
  <img src="product.jpg" class="w-full rounded-lg
                                transition-transform duration-500
                                hover:scale-105" />
  <h3 class="mt-4 font-semibold">无线蓝牙耳机</h3>
  <p class="text-gray-600">￥299</p>
  <button class="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg
                 transition-all duration-200
                 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30">
    加入购物车
  </button>
</div>
```

---

## 5. 透明度：淡入淡出

### 5.1 元素透明度

```html
<!-- 禁用状态 -->
<button class="opacity-50 cursor-not-allowed" disabled>禁用按钮</button>

<!-- 悬停变淡 -->
<a class="opacity-100 hover:opacity-80 transition-opacity">链接</a>

<!-- 淡入效果（配合 JS） -->
<div class="opacity-0 transition-opacity duration-500" :class="{ 'opacity-100': isVisible }">
  淡入内容
</div>
```

### 5.2 背景透明度

背景色可以单独设置透明度，不影响文字：

```html
<div class="bg-black/50 text-white p-4">
  背景半透明，文字完全不透明
</div>

<div class="bg-blue-500/30 p-4">
  30% 透明度的蓝色背景
</div>
```

`bg-black/50` 等同于 `rgba(0, 0, 0, 0.5)`。

### 5.3 遮罩层

模态框背景常用半透明遮罩：

```html
<div class="fixed inset-0 bg-black/50 flex items-center justify-center">
  <div class="bg-white rounded-xl p-6 shadow-2xl">
    模态框内容
  </div>
</div>
```

---

## 6. 滤镜：图像效果

CSS 滤镜可以对元素应用模糊、灰度、亮度等效果。

### 6.1 模糊效果

```html
<!-- 背景模糊（毛玻璃） -->
<div class="backdrop-blur-md bg-white/30 p-6 rounded-xl">
  毛玻璃效果
</div>

<!-- 元素本身模糊 -->
<img class="blur-sm" src="background.jpg" />
```

毛玻璃效果在现代 UI 中非常流行，iOS 和 macOS 大量使用。关键是 `backdrop-blur-*` + 半透明背景。

### 6.2 灰度效果

```html
<!-- 悬停前灰色，悬停后彩色 -->
<img class="grayscale hover:grayscale-0 transition-all duration-500" src="photo.jpg" />

<!-- 禁用状态变灰 -->
<div class="grayscale opacity-50">禁用的内容</div>
```

### 6.3 亮度和对比度

```html
<!-- 悬停时变亮 -->
<img class="brightness-100 hover:brightness-110 transition-all" src="photo.jpg" />

<!-- 悬停时变暗（作为遮罩效果） -->
<img class="brightness-100 hover:brightness-75 transition-all" src="photo.jpg" />
```

### 6.4 实战：图片悬停效果

```html
<div class="relative overflow-hidden rounded-xl group">
  <img 
    src="product.jpg" 
    class="w-full transition-all duration-500 
           group-hover:scale-110 group-hover:brightness-75"
  />
  <div class="absolute inset-0 flex items-center justify-center 
              opacity-0 group-hover:opacity-100 transition-opacity duration-300">
    <button class="bg-white text-gray-900 px-6 py-2 rounded-lg font-semibold">
      查看详情
    </button>
  </div>
</div>
```

悬停时图片放大并变暗，同时显示"查看详情"按钮。

---

## 7. 预设动画

UnoCSS 内置了几种常用动画。

### 7.1 旋转加载

```html
<svg class="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
</svg>
<span class="ml-2">加载中...</span>
```

### 7.2 脉冲提示

```html
<span class="relative flex h-3 w-3">
  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
  <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
</span>
```

`animate-ping` 创造脉冲扩散效果，常用于通知徽章。

### 7.3 呼吸效果

```html
<!-- 骨架屏加载 -->
<div class="animate-pulse space-y-4">
  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
  <div class="h-32 bg-gray-200 rounded"></div>
</div>
```

`animate-pulse` 创造明暗交替的呼吸效果，骨架屏必备。

### 7.4 弹跳效果

```html
<div class="animate-bounce">
  <svg class="w-6 h-6"><!-- 向下箭头 --></svg>
</div>
```

`animate-bounce` 用于吸引注意力，比如"滚动查看更多"的提示。

---

## 8. 光标与交互反馈

### 8.1 光标样式

```html
<button class="cursor-pointer">可点击</button>
<button class="cursor-not-allowed opacity-50" disabled>不可点击</button>
<div class="cursor-move">可拖动</div>
<div class="cursor-grab active:cursor-grabbing">拖拽元素</div>
```

### 8.2 禁用指针事件

```html
<!-- 装饰性覆盖层，不阻挡点击 -->
<div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
</div>
```

`pointer-events-none` 让元素"透明"，点击会穿透到下层。

### 8.3 禁止选择

```html
<button class="select-none">按钮文字不可选中</button>
```

UI 元素的文字通常不应被选中，避免误操作。

---

## 9. 完整的产品卡片

综合所有学到的效果：

```html
<div class="group bg-white rounded-2xl shadow-lg p-5 
            transition-all duration-300 ease-out
            hover:shadow-2xl hover:-translate-y-2">
  
  <!-- 图片区域 -->
  <div class="relative overflow-hidden rounded-xl">
    <img 
      src="product.jpg" 
      alt="无线蓝牙耳机"
      class="w-full aspect-square object-cover
             transition-transform duration-500 ease-out
             group-hover:scale-110"
    />
    <!-- 收藏按钮 -->
    <button class="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full
                   opacity-0 group-hover:opacity-100 
                   transition-all duration-300
                   hover:bg-white hover:scale-110">
      <svg class="w-5 h-5 text-gray-600"><!-- 心形图标 --></svg>
    </button>
    <!-- 标签 -->
    <span class="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
      新品
    </span>
  </div>
  
  <!-- 信息区域 -->
  <div class="mt-4">
    <h3 class="font-semibold text-gray-900 line-clamp-1">
      无线蓝牙耳机 Pro Max
    </h3>
    <p class="mt-1 text-sm text-gray-500 line-clamp-2">
      主动降噪，40小时续航，Hi-Fi音质
    </p>
    
    <div class="mt-3 flex items-center justify-between">
      <div>
        <span class="text-lg font-bold text-gray-900">￥299</span>
        <span class="ml-2 text-sm text-gray-400 line-through">￥399</span>
      </div>
      <div class="flex items-center text-sm text-yellow-500">
        <svg class="w-4 h-4"><!-- 星星图标 --></svg>
        <span class="ml-1">4.8</span>
      </div>
    </div>
  </div>
  
  <!-- 按钮区域 -->
  <button class="mt-4 w-full py-2.5 bg-blue-500 text-white font-medium rounded-xl
                 shadow-lg shadow-blue-500/30
                 transition-all duration-200 ease-out
                 hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/40
                 active:scale-[0.98]">
    加入购物车
  </button>
</div>
```

这个卡片包含了：
- 阴影层次（`shadow-lg` → `shadow-2xl`）
- 悬停上浮（`hover:-translate-y-2`）
- 图片放大（`group-hover:scale-110`）
- 收藏按钮淡入（`opacity-0 group-hover:opacity-100`）
- 毛玻璃效果（`bg-white/80 backdrop-blur-sm`）
- 按钮光晕（`shadow-blue-500/30`）
- 按下反馈（`active:scale-[0.98]`）

---

## 10. 模态框实战

另一个常见的效果组合——模态框：

```html
<!-- 遮罩层 -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4
            bg-black/50 backdrop-blur-sm
            opacity-0 invisible
            transition-all duration-300
            data-[open]:opacity-100 data-[open]:visible">
  
  <!-- 模态框主体 -->
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md
              transform scale-95 opacity-0
              transition-all duration-300
              data-[open]:scale-100 data-[open]:opacity-100">
    
    <!-- 头部 -->
    <div class="flex items-center justify-between p-6 border-b">
      <h2 class="text-xl font-semibold">确认订单</h2>
      <button class="p-2 hover:bg-gray-100 rounded-full transition-colors">
        <svg class="w-5 h-5"><!-- 关闭图标 --></svg>
      </button>
    </div>
    
    <!-- 内容 -->
    <div class="p-6">
      <p class="text-gray-600">确定要将此商品加入购物车吗？</p>
    </div>
    
    <!-- 底部 -->
    <div class="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
      <button class="flex-1 py-2.5 border rounded-xl font-medium
                     transition-colors hover:bg-gray-100">
        取消
      </button>
      <button class="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-medium
                     shadow-lg shadow-blue-500/30
                     transition-all hover:bg-blue-600 hover:shadow-xl">
        确认
      </button>
    </div>
  </div>
</div>
```

---

## 11. 小结

本章通过构建产品展示页，系统学习了 UnoCSS 的视觉效果工具。

**阴影**是创造深度感的核心。`shadow-sm` 到 `shadow-2xl` 提供不同层级，`shadow-inner` 创造凹陷效果，彩色阴影如 `shadow-blue-500/30` 创造光晕效果。记住：界面层级越高，阴影应该越深。

**过渡**让状态变化变得自然。`transition-*` 指定过渡属性，`duration-*` 控制时长，`ease-out` 是最常用的缓动函数。过渡让界面从"能用"变成"想用"。

**变换**改变元素的位置、大小、角度。`hover:scale-105` 创造放大效果，`hover:-translate-y-1` 创造上浮效果，它们组合使用能创造丰富的交互反馈。

**透明度**控制元素和背景的可见性。`opacity-50` 用于禁用状态，`bg-black/50` 用于遮罩层。

**滤镜**提供模糊、灰度、亮度等效果。`backdrop-blur-md` + 半透明背景创造毛玻璃效果，`grayscale` 用于禁用状态或悬停前的图片。

**预设动画**包括 `animate-spin`（加载）、`animate-ping`（脉冲提示）、`animate-pulse`（骨架屏）、`animate-bounce`（引导注意）。

**核心原则**：视觉效果应该增强用户体验，而不是干扰。每个效果都应该有明确的目的——反馈交互状态、引导注意力、或创造品质感。效果的时长和强度要适度，太快显得生硬，太慢让人等待；太弱感知不到，太强喧宾夺主。

下一章我们将进入核心功能实战，学习快捷方式、属性化模式等提升开发效率的高级特性。
