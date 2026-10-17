# 检查 index.html 与 CSS 里引用的资源路径大小写是否与磁盘完全一致（Linux 服务器区分大小写）
import os
import re

bad = []


def check(base, ref):
    ref = ref.split('?')[0]
    if ref.startswith(('http', 'data:', '//', '#')):
        return
    path = os.path.normpath(os.path.join(base, ref)).replace(chr(92), '/')
    cur = '.'
    for part in path.split('/'):
        if part in ('.', ''):
            continue
        if part not in os.listdir(cur):
            bad.append((base, ref, part))
            return
        cur = os.path.join(cur, part)


html = open('index.html', encoding='utf8').read()
for m in re.finditer(r'(?:src|href)="([^"]+)"', html):
    check('.', m.group(1))
for root, _, files in os.walk('css'):
    for f in files:
        if f.endswith('.css'):
            text = open(os.path.join(root, f), encoding='utf8').read()
            for m in re.finditer(r'url\([\'"]?([^\'")]+)[\'"]?\)', text):
                check(root, m.group(1))
print('路径大小写/缺失问题:', bad or '无')
