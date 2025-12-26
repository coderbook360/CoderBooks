#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
from collections import defaultdict

# 读取CSV
with open('E:/CoderBooks/src/books/missing-files-report.csv', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    data = list(reader)

# 按书籍分组
books_data = defaultdict(list)
for row in data:
    books_data[row['书籍路径']].append({
        'title': row['toc.md中的标题'],
        'path': row['缺失文件的完整路径']
    })

# 生成示例报告（只显示前5个书籍，每个书籍显示前10篇文章）
print("=" * 80)
print("缺失文章详细报告 - 示例（前5个书籍）")
print("=" * 80)
print()

count = 0
for book, items in sorted(books_data.items(), key=lambda x: len(x[1]), reverse=True):
    if count >= 5:
        break
    count += 1

    print(f"\n{'=' * 80}")
    print(f"📖 书籍: {book}")
    print(f"📊 缺失数量: {len(items)}")
    print(f"{'=' * 80}")

    for i, item in enumerate(items[:10], 1):
        print(f"\n  {i}. 标题: {item['title']}")
        # 只显示相对于 book_zh 的路径
        relative = item['path'].split('book_zh\\')[-1] if 'book_zh\\' in item['path'] else item['path'].split('book_zh/')[-1]
        print(f"     路径: {relative}")

    if len(items) > 10:
        print(f"\n  ... 还有 {len(items) - 10} 篇文章缺失")
    print()

print("=" * 80)
print("完整列表请查看: missing-files-report.txt 或 missing-files-report.csv")
print("=" * 80)
