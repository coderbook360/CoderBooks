#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
from pathlib import Path
from collections import defaultdict

def extract_md_links(toc_content):
    """提取 toc.md 中的所有 markdown 链接"""
    pattern = r'\[([^\]]+)\]\(([^)]+\.md)\)'
    matches = re.findall(pattern, toc_content)
    return matches

def check_missing_files(toc_path, book_name):
    """检查一个书籍的缺失文件"""
    if not os.path.exists(toc_path):
        return []

    missing_files = []
    base_path = os.path.dirname(toc_path)

    with open(toc_path, 'r', encoding='utf-8') as f:
        content = f.read()

    links = extract_md_links(content)

    for title, relative_path in links:
        # 跳过锚点链接
        if '#' in relative_path:
            continue

        full_path = os.path.normpath(os.path.join(base_path, relative_path))

        if not os.path.exists(full_path):
            missing_files.append({
                'book': book_name,
                'title': title,
                'relative_path': relative_path,
                'full_path': full_path
            })

    return missing_files

def main():
    books_root = r"E:\CoderBooks\src\books"
    all_missing = []

    print("=" * 80)
    print("缺失文章检查报告")
    print("=" * 80)
    print()

    # Web-Frontend mini-* 项目
    web_frontend_minis = [
        "mini-webpack5", "mini-vue-router", "mini-vue3", "mini-redux",
        "mini-vite", "mini-react", "mini-pinia", "mini-rollup",
        "mini-axios", "mini-lodash", "mini-jquery", "mini-hammer",
        "mini-gsap", "mini-dayjs", "mini-acornjs", "mini-path-to-regexp",
        "mini-ramda", "mini-rxjs", "mini-vitest", "mini-zepto", "mini-zod"
    ]

    for mini in web_frontend_minis:
        toc_path = os.path.join(books_root, f"web-frontend/{mini}/book_zh/toc.md")
        missing = check_missing_files(toc_path, f"web-frontend/{mini}")
        all_missing.extend(missing)

    # Nodejs 项目
    nodejs_projects = [
        "api-design", "core-principles", "database-orm", "engineering",
        "filesystem-stream", "getting-started", "microservices",
        "mini-npm", "mini-sentry", "network", "nodejs-source",
        "projects", "security", "web-framework"
    ]

    for proj in nodejs_projects:
        toc_path = os.path.join(books_root, f"nodejs/{proj}/book_zh/toc.md")
        missing = check_missing_files(toc_path, f"nodejs/{proj}")
        all_missing.extend(missing)

    # Graphics 项目
    graphics_projects = [
        "3d-math", "advanced-rendering", "canvas", "mini-fabric",
        "mini-pixi", "threejs", "webgl"
    ]

    for proj in graphics_projects:
        toc_path = os.path.join(books_root, f"graphics/{proj}/book_zh/toc.md")
        missing = check_missing_files(toc_path, f"graphics/{proj}")
        all_missing.extend(missing)

    # Algorithm 项目
    algorithm_projects = [
        "advanced-ds", "algorithms", "competitive-programming",
        "data-structures", "dynamic-programming", "graph-algorithms"
    ]

    for proj in algorithm_projects:
        toc_path = os.path.join(books_root, f"algorithm/{proj}/book_zh/toc.md")
        missing = check_missing_files(toc_path, f"algorithm/{proj}")
        all_missing.extend(missing)

    # Design 项目
    design_projects = [
        "01-design-principles-typescript", "02-design-patterns",
        "03-functional-architecture-patterns", "04-build-tools",
        "05-quality-testing", "06-component-design",
        "07-design-system", "08-large-scale-systems",
        "09-technical-leadership", "10-architect-practice"
    ]

    for proj in design_projects:
        toc_path = os.path.join(books_root, f"design/{proj}/book_zh/toc.md")
        missing = check_missing_files(toc_path, f"design/{proj}")
        all_missing.extend(missing)

    # General 项目
    general_projects = ["ai-prompt", "ai-tools", "clear-thinking", "thinking-methods"]

    for proj in general_projects:
        toc_path = os.path.join(books_root, f"general/{proj}/book_zh/toc.md")
        missing = check_missing_files(toc_path, f"general/{proj}")
        all_missing.extend(missing)

    # 按书籍分组
    grouped = defaultdict(list)
    for item in all_missing:
        grouped[item['book']].append(item)

    # 输出结果
    if not all_missing:
        print("✓ 所有文件都存在！")
    else:
        print(f"发现 {len(all_missing)} 个缺失的文件\n")

        for book_name in sorted(grouped.keys()):
            items = grouped[book_name]
            print("=" * 80)
            print(f"书籍: {book_name}")
            print(f"缺失数量: {len(items)}")
            print("-" * 80)

            for item in items:
                print(f"\n标题: {item['title']}")
                print(f"相对路径: {item['relative_path']}")
                print(f"完整路径: {item['full_path']}")

            print()

        # 保存报告
        output_path = os.path.join(books_root, "missing-files-report.txt")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("缺失文章报告\n")
            f.write("=" * 80 + "\n\n")
            f.write(f"总计缺失文件数: {len(all_missing)}\n\n")

            for book_name in sorted(grouped.keys()):
                items = grouped[book_name]
                f.write("\n" + "=" * 80 + "\n")
                f.write(f"书籍: {book_name}\n")
                f.write(f"缺失数量: {len(items)}\n")
                f.write("-" * 80 + "\n")

                for item in items:
                    f.write(f"\n标题: {item['title']}\n")
                    f.write(f"相对路径: {item['relative_path']}\n")
                    f.write(f"完整路径: {item['full_path']}\n")

                f.write("\n")

        print("=" * 80)
        print(f"报告已保存到: {output_path}")

        # 生成CSV格式便于查看
        csv_path = os.path.join(books_root, "missing-files-report.csv")
        with open(csv_path, 'w', encoding='utf-8-sig') as f:
            f.write("书籍路径,toc.md中的标题,缺失文件的完整路径\n")
            for book_name in sorted(grouped.keys()):
                for item in grouped[book_name]:
                    f.write(f'"{item["book"]}","{item["title"]}","{item["full_path"]}"\n')

        print(f"CSV报告已保存到: {csv_path}")

if __name__ == '__main__':
    main()
