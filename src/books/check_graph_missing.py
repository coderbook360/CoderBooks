#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查 graph-algorithms 目录下缺失的文章
"""

import re
import os

def check_missing_files():
    base_dir = r'e:\CoderBooks\src\books\algorithm\graph-algorithms\book_zh'
    toc_path = os.path.join(base_dir, 'toc.md')

    # 读取 toc.md
    with open(toc_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取所有markdown链接
    pattern = r'\[([^\]]+)\]\(([^)]+\.md)\)'
    matches = re.findall(pattern, content)

    missing = []
    found = 0
    total = 0

    lines = content.split('\n')

    # 检查每个文件
    for title, file in matches:
        total += 1
        full_path = os.path.join(base_dir, file)

        if not os.path.exists(full_path):
            # 找到所属章节
            chapter = '未分类'
            for idx, line in enumerate(lines):
                if file in line:
                    # 向上查找最近的章节标题
                    for i in range(idx - 1, -1, -1):
                        if lines[i].startswith('###'):
                            chapter = lines[i].replace('###', '').strip()
                            break
                    break

            missing.append({
                'file': file,
                'title': title,
                'chapter': chapter,
                'full_path': full_path
            })
        else:
            found += 1

    # 输出结果
    print('\n' + '=' * 80)
    print('图论算法书籍文件检查报告')
    print('=' * 80)
    print(f'\n总文件数: {total}')
    print(f'已存在: {found}')
    print(f'缺失数: {len(missing)}')

    if missing:
        print('\n缺失文件详情：')
        print('=' * 80)

        current_chapter = ''
        for item in missing:
            if item['chapter'] != current_chapter:
                current_chapter = item['chapter']
                print(f'\n【{current_chapter}】')

            print(f'  ✗ 文件路径: {item["file"]}')
            print(f'    标题: {item["title"]}')
            print(f'    完整路径: {item["full_path"]}')
    else:
        print('\n✓ 所有文件都存在！')

    print('\n' + '=' * 80)

if __name__ == '__main__':
    check_missing_files()
