# 📊 缺失文章统计报告

生成时间：2025-12-26

## 📈 总体概况

**总计缺失文件数：3018**

---

## 📚 各分类缺失统计

### 🌐 WEB-FRONTEND（总计：927 个缺失）

| 书籍 | 缺失数 | 状态 |
|------|--------|------|
| web-frontend/mini-vitest | 239 | ⚠️ 严重 |
| web-frontend/mini-rollup | 155 | ⚠️ 严重 |
| web-frontend/mini-react | 150 | ⚠️ 严重 |
| web-frontend/mini-webpack5 | 129 | ⚠️ 严重 |
| web-frontend/mini-redux | 95 | ⚠️ 高 |
| web-frontend/mini-gsap | 70 | ⚠️ 高 |
| web-frontend/mini-lodash | 63 | ⚠️ 高 |
| web-frontend/mini-rxjs | 25 | ⚠️ 中 |
| web-frontend/mini-pinia | 1 | ✅ 低 |

### 🔧 NODEJS（总计：932 个缺失）

| 书籍 | 缺失数 | 状态 |
|------|--------|------|
| nodejs/database-orm | 105 | ⚠️ 严重 |
| nodejs/network | 92 | ⚠️ 高 |
| nodejs/projects | 92 | ⚠️ 高 |
| nodejs/web-framework | 90 | ⚠️ 高 |
| nodejs/engineering | 87 | ⚠️ 高 |
| nodejs/nodejs-source | 85 | ⚠️ 高 |
| nodejs/microservices | 82 | ⚠️ 高 |
| nodejs/core-principles | 79 | ⚠️ 高 |
| nodejs/security | 74 | ⚠️ 高 |
| nodejs/api-design | 73 | ⚠️ 高 |
| nodejs/filesystem-stream | 73 | ⚠️ 高 |

### 🎨 GRAPHICS（总计：259 个缺失）

| 书籍 | 缺失数 | 状态 |
|------|--------|------|
| graphics/mini-pixi | 130 | ⚠️ 严重 |
| graphics/advanced-rendering | 70 | ⚠️ 高 |
| graphics/threejs | 58 | ⚠️ 高 |
| graphics/3d-math | 1 | ✅ 低 |

### 🧮 ALGORITHM（总计：121 个缺失）

| 书籍 | 缺失数 | 状态 |
|------|--------|------|
| algorithm/competitive-programming | 110 | ⚠️ 严重 |
| algorithm/graph-algorithms | 7 | ⚠️ 低 |
| algorithm/dynamic-programming | 4 | ⚠️ 低 |

### 🏗️ DESIGN（总计：779 个缺失）

| 书籍 | 缺失数 | 状态 |
|------|--------|------|
| design/08-large-scale-systems | 103 | ⚠️ 严重 |
| design/05-quality-testing | 98 | ⚠️ 高 |
| design/07-design-system | 96 | ⚠️ 高 |
| design/04-build-tools | 88 | ⚠️ 高 |
| design/06-component-design | 87 | ⚠️ 高 |
| design/03-functional-architecture-patterns | 70 | ⚠️ 高 |
| design/10-architect-practice | 64 | ⚠️ 高 |
| design/09-technical-leadership | 60 | ⚠️ 高 |
| design/01-design-principles-typescript | 58 | ⚠️ 高 |
| design/02-design-patterns | 55 | ⚠️ 高 |

---

## 🎯 优先级建议

### 🔴 紧急需要补充（缺失 > 100）

1. **web-frontend/mini-vitest** - 239 个缺失
2. **web-frontend/mini-rollup** - 155 个缺失
3. **web-frontend/mini-react** - 150 个缺失
4. **graphics/mini-pixi** - 130 个缺失
5. **web-frontend/mini-webpack5** - 129 个缺失
6. **algorithm/competitive-programming** - 110 个缺失
7. **nodejs/database-orm** - 105 个缺失
8. **design/08-large-scale-systems** - 103 个缺失

### 🟡 高优先级（缺失 50-100）

- nodejs 系列：多个项目缺失 70-92 个文章
- design 系列：多个项目缺失 55-98 个文章
- web-frontend/mini-redux - 95 个缺失
- web-frontend/mini-gsap - 70 个缺失
- graphics/advanced-rendering - 70 个缺失
- graphics/threejs - 58 个缺失
- web-frontend/mini-lodash - 63 个缺失

### 🟢 低优先级（缺失 < 10）

- web-frontend/mini-pinia - 仅 1 个缺失 ✅
- graphics/3d-math - 仅 1 个缺失 ✅
- algorithm/graph-algorithms - 7 个缺失
- algorithm/dynamic-programming - 4 个缺失

---

## 📁 详细报告文件

完整的缺失文章列表请查看：

- **文本格式**: [missing-files-report.txt](missing-files-report.txt)
- **CSV格式**: [missing-files-report.csv](missing-files-report.csv)

---

## 📝 说明

- 本报告基于所有 `toc.md` 文件中的链接进行检查
- 仅统计实际缺失的 `.md` 文件
- 不包含锚点链接（`#` 开头的链接）
- 报告生成时间：2025-12-26

---

## 🔍 检查脚本

使用以下脚本重新生成报告：

```bash
cd E:\CoderBooks\src\books
python check_missing_files.py
```

---

生成工具：check_missing_files.py
