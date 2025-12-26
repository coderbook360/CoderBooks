#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
from pathlib import Path
from collections import defaultdict

def extract_md_links_with_context(toc_content):
    """提取 toc.md 中的所有 markdown 链接，并记录所属章节"""
    lines = toc_content.split('\n')
    links_with_context = []
    current_chapter = "未分类"

    for line in lines:
        # 检测章节标题（通常是 ## 或 ###）
        chapter_match = re.match(r'^#{1,3}\s+(.+)$', line)
        if chapter_match:
            current_chapter = chapter_match.group(1).strip()
            continue

        # 提取链接
        pattern = r'\[([^\]]+)\]\(([^)]+\.md)\)'
        matches = re.findall(pattern, line)

        for title, relative_path in matches:
            # 跳过锚点链接
            if '#' not in relative_path or relative_path.endswith('.md'):
                clean_path = relative_path.split('#')[0] if '#' in relative_path else relative_path
                links_with_context.append({
                    'title': title,
                    'path': clean_path,
                    'chapter': current_chapter
                })

    return links_with_context

def check_book_missing_files(toc_path, book_name):
    """检查一个书籍的缺失文件，返回详细统计"""
    if not os.path.exists(toc_path):
        return None

    base_path = os.path.dirname(toc_path)

    try:
        with open(toc_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"警告：无法读取 {toc_path}: {e}")
        return None

    links = extract_md_links_with_context(content)

    if not links:
        return None

    missing_files = []
    existing_files = []

    for link_info in links:
        full_path = os.path.normpath(os.path.join(base_path, link_info['path']))

        if not os.path.exists(full_path):
            missing_files.append({
                'title': link_info['title'],
                'path': link_info['path'],
                'chapter': link_info['chapter'],
                'full_path': full_path
            })
        else:
            existing_files.append(link_info)

    return {
        'book_name': book_name,
        'toc_path': toc_path,
        'total': len(links),
        'existing': len(existing_files),
        'missing': len(missing_files),
        'missing_files': missing_files
    }

def scan_all_books(books_root, priority_dirs):
    """扫描所有书籍目录"""
    results = []

    for main_dir in priority_dirs:
        main_path = os.path.join(books_root, main_dir)

        if not os.path.exists(main_path):
            continue

        # 遍历主目录下的所有子目录
        for item in os.listdir(main_path):
            item_path = os.path.join(main_path, item)

            if not os.path.isdir(item_path):
                continue

            # 查找 book_zh/toc.md
            toc_path = os.path.join(item_path, "book_zh", "toc.md")

            if os.path.exists(toc_path):
                book_name = f"{main_dir}/{item}"
                result = check_book_missing_files(toc_path, book_name)

                if result:
                    results.append(result)

    return results

def main():
    books_root = r"E:\CoderBooks\src\books"

    # 优先检查的目录
    priority_dirs = [
        "algorithm",
        "graphics",
        "nodejs",
        "web-frontend",
        "design",
        "general"
    ]

    print("=" * 100)
    print("书籍缺失文章检查报告 (缺失数量: 1-20)")
    print("=" * 100)
    print()

    # 扫描所有书籍
    all_results = scan_all_books(books_root, priority_dirs)

    # 筛选缺失数量在 1-20 之间的书籍
    filtered_results = [r for r in all_results if 1 <= r['missing'] <= 20]

    # 按缺失数量排序（从少到多）
    filtered_results.sort(key=lambda x: x['missing'])

    if not filtered_results:
        print("✓ 没有找到缺失数量在 1-20 之间的书籍")
        return

    print(f"找到 {len(filtered_results)} 本书籍缺失数量在 1-20 之间\n")

    # 输出详细报告
    for idx, result in enumerate(filtered_results, 1):
        print("=" * 100)
        print(f"[{idx}] 书籍: {result['book_name']}")
        print("=" * 100)
        print(f"TOC 路径: {result['toc_path']}")
        print(f"总文章数: {result['total']}")
        print(f"已存在: {result['existing']}")
        print(f"缺失数量: {result['missing']}")
        print("-" * 100)

        # 按章节分组显示缺失文章
        by_chapter = defaultdict(list)
        for missing in result['missing_files']:
            by_chapter[missing['chapter']].append(missing)

        for chapter, items in by_chapter.items():
            print(f"\n章节: {chapter}")
            print(f"缺失文章数: {len(items)}")
            print("-" * 50)

            for i, item in enumerate(items, 1):
                print(f"  {i}. 标题: {item['title']}")
                print(f"     路径: {item['path']}")
                print()

        print()

    # 生成汇总统计
    print("=" * 100)
    print("汇总统计")
    print("=" * 100)
    print(f"{'书籍名称':<50} {'总数':>8} {'已有':>8} {'缺失':>8} {'完成率':>10}")
    print("-" * 100)

    for result in filtered_results:
        completion_rate = (result['existing'] / result['total'] * 100) if result['total'] > 0 else 0
        print(f"{result['book_name']:<50} {result['total']:>8} {result['existing']:>8} {result['missing']:>8} {completion_rate:>9.1f}%")

    print()

    # 保存到文件
    output_path = os.path.join(books_root, "books_1_20_missing_report.md")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# 书籍缺失文章检查报告 (缺失数量: 1-20)\n\n")
        f.write(f"生成时间: 2025年12月26日\n\n")
        f.write(f"找到 {len(filtered_results)} 本书籍缺失数量在 1-20 之间\n\n")

        f.write("## 汇总统计\n\n")
        f.write("| 书籍名称 | 总数 | 已有 | 缺失 | 完成率 |\n")
        f.write("|---------|------|------|------|--------|\n")

        for result in filtered_results:
            completion_rate = (result['existing'] / result['total'] * 100) if result['total'] > 0 else 0
            f.write(f"| {result['book_name']} | {result['total']} | {result['existing']} | {result['missing']} | {completion_rate:.1f}% |\n")

        f.write("\n---\n\n")

        # 详细报告
        for idx, result in enumerate(filtered_results, 1):
            f.write(f"## [{idx}] {result['book_name']}\n\n")
            f.write(f"- **TOC 路径**: `{result['toc_path']}`\n")
            f.write(f"- **总文章数**: {result['total']}\n")
            f.write(f"- **已存在**: {result['existing']}\n")
            f.write(f"- **缺失数量**: {result['missing']}\n\n")

            # 按章节分组
            by_chapter = defaultdict(list)
            for missing in result['missing_files']:
                by_chapter[missing['chapter']].append(missing)

            f.write("### 缺失文章列表\n\n")

            for chapter, items in by_chapter.items():
                f.write(f"#### 章节: {chapter}\n\n")
                f.write(f"缺失文章数: {len(items)}\n\n")

                for i, item in enumerate(items, 1):
                    f.write(f"{i}. **{item['title']}**\n")
                    f.write(f"   - 路径: `{item['path']}`\n")
                    f.write(f"   - 完整路径: `{item['full_path']}`\n\n")

            f.write("---\n\n")

    print(f"详细报告已保存到: {output_path}")
    print()

if __name__ == '__main__':
    main()
