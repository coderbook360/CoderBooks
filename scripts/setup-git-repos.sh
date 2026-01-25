#!/bin/bash

# ========================================
# Monorepo 多项目部署脚本
# 用途：为每个 package 创建独立的 Git 仓库和 GitHub Actions
# ========================================

# 配置区域
PACKAGES=("book2" "portal" "cs130-vue")
GITHUB_ORG="coderbook360"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Monorepo 多项目部署工具${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 函数：为单个 package 创建部署配置
setup_package() {
  local pkg=$1
  local pkg_dir="packages/$pkg"
  
  echo -e "${GREEN}[1/5] 处理项目: ${pkg}${NC}"
  
  if [ ! -d "$pkg_dir" ]; then
    echo -e "${YELLOW}  跳过：目录不存在${NC}\n"
    return
  fi
  
  cd "$pkg_dir"
  
  # 检查是否已经是 Git 仓库
  if [ -d ".git" ]; then
    echo -e "${YELLOW}  已是 Git 仓库，跳过初始化${NC}"
  else
    echo -e "${GREEN}[2/5] 初始化 Git 仓库${NC}"
    git init
    git branch -M main
  fi
  
  # 添加远程仓库
  echo -e "${GREEN}[3/5] 配置远程仓库${NC}"
  REMOTE_URL="git@github.com:${GITHUB_ORG}/${pkg}.git"
  
  if git remote | grep -q "origin"; then
    git remote set-url origin "$REMOTE_URL"
    echo -e "  更新远程地址: $REMOTE_URL"
  else
    git remote add origin "$REMOTE_URL"
    echo -e "  添加远程地址: $REMOTE_URL"
  fi
  
  # 提示检查文件
  echo -e "${GREEN}[4/5] 检查必要文件${NC}"
  
  if [ ! -f ".gitignore" ]; then
    echo -e "${YELLOW}  警告：缺少 .gitignore${NC}"
  fi
  
  if [ ! -f "README.md" ]; then
    echo -e "${YELLOW}  警告：缺少 README.md${NC}"
  fi
  
  if [ ! -f ".github/workflows/deploy.yml" ]; then
    echo -e "${YELLOW}  警告：缺少 GitHub Actions 配置${NC}"
  fi
  
  echo -e "${GREEN}[5/5] 准备就绪！${NC}"
  echo -e "  执行以下命令推送："
  echo -e "  ${BLUE}cd $pkg_dir && git add . && git commit -m 'first commit' && git push -u origin main${NC}\n"
  
  cd - > /dev/null
}

# 主流程
for pkg in "${PACKAGES[@]}"; do
  setup_package "$pkg"
done

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ 所有项目配置完成！${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "📋 下一步操作："
echo -e "1. 在 GitHub 创建对应的仓库："
for pkg in "${PACKAGES[@]}"; do
  echo -e "   - https://github.com/new → ${GITHUB_ORG}/${pkg}"
done
echo -e "\n2. 推送代码到远程仓库（参考上方命令）"
echo -e "\n3. 在仓库设置中启用 GitHub Pages："
echo -e "   Settings > Pages > Source 选择 'GitHub Actions'"
