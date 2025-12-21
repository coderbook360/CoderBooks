# 导出功能：图片与SVG

用户创作完成，如何导出为图片或SVG文件？

---

## 1. 导出PNG

```javascript
class CanvasEditor {
  exportToPNG(filename = 'canvas.png') {
    // 创建临时Canvas（包含所有内容）
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 绘制所有对象
    this.objects.forEach(obj => obj.draw(tempCtx));
    
    // 转换为Blob并下载
    tempCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

// 使用
document.getElementById('export-png').addEventListener('click', () => {
  editor.exportToPNG('my-design.png');
});
```

---

## 2. 导出JPEG

```javascript
exportToJPEG(filename = 'canvas.jpg', quality = 0.9) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = this.canvas.width;
  tempCanvas.height = this.canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  // JPEG不支持透明，先填充白色背景
  tempCtx.fillStyle = 'white';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  
  this.objects.forEach(obj => obj.draw(tempCtx));
  
  tempCanvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', quality);
}
```

---

## 3. 导出SVG

将Canvas对象转换为SVG：

```javascript
class Rectangle {
  toSVG() {
    return `<rect x="${this.left}" y="${this.top}" width="${this.width}" height="${this.height}" fill="${this.fill}" stroke="${this.stroke || 'none'}" stroke-width="${this.strokeWidth || 0}"/>`;
  }
}

class Circle {
  toSVG() {
    const cx = this.left + this.radius;
    const cy = this.top + this.radius;
    return `<circle cx="${cx}" cy="${cy}" r="${this.radius}" fill="${this.fill}" stroke="${this.stroke || 'none'}" stroke-width="${this.strokeWidth || 0}"/>`;
  }
}

class CanvasEditor {
  exportToSVG(filename = 'canvas.svg') {
    const svgContent = `
<?xml version="1.0" encoding="UTF-8"?>
<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
  ${this.objects.map(obj => obj.toSVG()).join('\n  ')}
</svg>`;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

---

## 4. 复制到剪贴板

```javascript
async copyToClipboard() {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = this.canvas.width;
  tempCanvas.height = this.canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  this.objects.forEach(obj => obj.draw(tempCtx));
  
  tempCanvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
    }
  });
}
```

---

## 5. 导出高分辨率图片

```javascript
exportHighRes(scale = 2, filename = 'canvas-hires.png') {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = this.canvas.width * scale;
  tempCanvas.height = this.canvas.height * scale;
  const tempCtx = tempCanvas.getContext('2d');
  
  // 缩放上下文
  tempCtx.scale(scale, scale);
  
  this.objects.forEach(obj => obj.draw(tempCtx));
  
  tempCanvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// 导出2倍分辨率
editor.exportHighRes(2);
```

---

## 6. 导出选中区域

```javascript
exportSelection(filename = 'selection.png') {
  if (this.selectedObjects.length === 0) return;
  
  // 计算选中对象的边界
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  this.selectedObjects.forEach(obj => {
    minX = Math.min(minX, obj.left);
    minY = Math.min(minY, obj.top);
    maxX = Math.max(maxX, obj.left + obj.width);
    maxY = Math.max(maxY, obj.top + obj.height);
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  
  // 平移坐标系
  tempCtx.translate(-minX, -minY);
  
  this.selectedObjects.forEach(obj => obj.draw(tempCtx));
  
  tempCanvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}
```

---

## 本章小结

导出功能让作品可以分享：
- **PNG导出**：`canvas.toBlob()`
- **JPEG导出**：指定MIME类型和质量
- **SVG导出**：转换为SVG代码
- **高分辨率**：缩放上下文
- **选中区域**：计算边界并裁剪

**恭喜！《Canvas图形编程：从基础到图形编辑器实现》全部49章完成！**（第50章WebWorker已预先存在）
