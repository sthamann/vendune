#!/usr/bin/env python3
"""Render every tracked Markdown document with repository-aware links and search."""
import html
import json
import os
import re
import shutil
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit

import markdown
from site_navigation import sidebar, onward, hub, chrome

ROOT = Path(__file__).resolve().parents[1]
REPO = 'https://github.com/sthamann/veyndo'
MEDIA = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm', '.pdf'}


def sources():
    """Include tracked sources plus new documents before their first commit."""
    names = subprocess.check_output(
        ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT)
    return sorted({Path(os.fsdecode(name)) for name in names.split(b'\0')
                   if name and name.lower().endswith(b'.md') and (ROOT / os.fsdecode(name)).is_file()})


def public_path(source):
    # Pages artifact upload excludes .github/.git directories even inside docs.
    path = (Path('docs') / source.relative_to('docs') if source.parts[0] == 'docs'
            else Path('docs/repository') / source)
    return Path(*(f'dot-{part[1:]}' if part.startswith('.') else part for part in path.parts))


def destination(source):
    return public_path(source).with_suffix('.html')


def slug(value, separator):
    """Match GitHub heading punctuation/Unicode rules rather than ASCII transliteration."""
    return re.sub(r'\s', separator, re.sub(r'[^\w\-\s]', '', value.lower()))


class Document(HTMLParser):
    """Rewrite Markdown and embedded HTML links, keeping source links on GitHub."""
    def __init__(self, source, dest, known, copy_assets=True):
        super().__init__(convert_charrefs=False)
        self.source, self.dest, self.known = source, dest, known
        self.copy_assets = copy_assets
        self.output, self.text = [], []
        self.headings = 0

    def url(self, value):
        url = urlsplit(value)
        # Repository-local absolute GitHub links should also open the rendered guide.
        prefix = REPO + '/blob/main/'
        if value.startswith(prefix):
            url = urlsplit(value[len(prefix):])
            target = ROOT / unquote(url.path)
        elif url.scheme or url.netloc or not url.path:
            return value
        else:
            target = (ROOT / self.source.parent / unquote(url.path)).resolve()
        if not target.is_relative_to(ROOT):
            raise ValueError(f'{self.source}: link escapes repository: {value}')
        if not target.exists():
            raise ValueError(f'{self.source}: missing repository target: {value}')
        relative = target.relative_to(ROOT)
        if relative in self.known:
            mapped = destination(relative)
        elif target.is_file() and target.suffix.lower() in MEDIA:
            mapped = public_path(relative)
            if self.copy_assets:
                output = self.dest / mapped
                output.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(target, output)
        else:
            return urlunsplit(('https', 'github.com', '/sthamann/veyndo/' +
                              ('tree' if target.is_dir() else 'blob') + '/main/' +
                              quote(relative.as_posix(), safe='/'), url.query, url.fragment))
        path = os.path.relpath(mapped, destination(self.source).parent).replace(os.sep, '/')
        return urlunsplit(('', '', quote(path, safe='/'), url.query, url.fragment))

    def tag(self, tag, attrs, ending):
        if tag == 'h1':
            self.headings += 1
        values = []
        for name, value in attrs:
            if value is not None and name in ('href', 'src', 'poster'):
                value = self.url(value)
            values.append(name if value is None else f'{name}="{html.escape(value, quote=True)}"')
        self.output.append('<' + tag + (' ' + ' '.join(values) if values else '') + ending)

    def handle_starttag(self, tag, attrs):
        self.tag(tag, attrs, '>')

    def handle_startendtag(self, tag, attrs):
        self.tag(tag, attrs, ' />')

    def handle_endtag(self, tag):
        self.output.append('</' + tag + '>')

    def handle_data(self, data):
        self.output.append(data)
        self.text.append(data)

    def handle_entityref(self, name):
        self.output.append('&' + name + ';')
        self.text.append(html.unescape('&' + name + ';'))

    def handle_charref(self, name):
        self.output.append('&#' + name + ';')

    def handle_comment(self, data):
        self.output.append('<!--' + data + '-->')


def render(source, dest, known):
    converter = markdown.Markdown(extensions=['extra', 'sane_lists', 'toc'],
                                  extension_configs={'toc': {'slugify': slug, 'toc_depth': '2-3'}})
    document = Document(source, dest, known)
    original = (ROOT / source).read_text()
    # GitHub permits Markdown in README layout containers and collapsible sections.
    if source == Path('README.md'):
        original = original.replace('<div align="center">', '<div align="center" markdown="1">')
        original = original.replace('<details>', '<details markdown="1">')
    document.feed(converter.convert(original))
    text = re.sub(r'\s+', ' ', ' '.join(document.text)).strip()
    heading = re.search(r'<h1[^>]*>(.*?)</h1>', ''.join(document.output), re.S)
    title = html.unescape(re.sub('<[^>]+>', '', heading[1])) if heading else source.as_posix()
    content = ''.join(document.output)
    if not document.headings:
        content = '<h1>' + html.escape(title) + '</h1>' + content
    return title, content, converter.toc if converter.toc_tokens else '', text


def build_documents(dest, write_page):
    known = set(sources())
    records = []
    rendered = []
    for source in sorted(known):
        title, body, toc, text = render(source, dest, known)
        path = destination(source)
        description = text[len(title):].strip()[:180] or title
        records.append({'source': source.as_posix(), 'url': path.as_posix(),
                        'title': title, 'description': description, 'text': text})
        rendered.append((source, title, body, toc, text, path, description))
    for source, title, body, toc, text, path, description in rendered:
        prefix = os.path.relpath('.', path.parent).replace(os.sep, '/') + '/'
        navigation, group = sidebar(source.as_posix(), prefix, records, toc)
        minutes = max(1, (len(text.split()) + 229) // 230)
        content = (chrome(prefix) + '<div class="docs-layout">' + navigation + '<article class="article docs-article">'
                   '<div class="docs-source"><span>' + html.escape(source.as_posix()) + '</span>'
                   f'<a href="{REPO}/blob/main/{quote(source.as_posix(), safe="/")}" data-docs-copy="source">View source ↗</a>'
                   f'</div><p class="docs-reading"><span data-docs-copy="english">English source</span> · {minutes} min</p>' + body +
                   onward(source.as_posix(), prefix, records, group) + '</article></div>')
        write_page(path, title + ' | ' + source.as_posix() + ' | Veyndo', description, content)
    content = chrome('../') + hub(records)
    write_page(Path('docs/index.html'), 'Documentation | Veyndo',
               'Search and read all Veyndo guides, source ownership notes and developer contracts.', content)
    (dest / 'docs/search.json').write_text(json.dumps(records, ensure_ascii=False))
    (dest / 'docs/manifest.json').write_text(json.dumps(
        [{'source': r['source'], 'url': r['url']} for r in records], indent=2) + '\n')
    assets = dest / 'docs/assets/ui'
    assets.mkdir(parents=True, exist_ok=True)
    for name in ['docs.js', 'docs.css', 'docs-copy.json', 'docs-navigation.json']:
        shutil.copyfile(ROOT / 'site' / name, assets / name)
    shutil.copyfile(ROOT / 'site/style.css', assets / 'site.css')
    shutil.copyfile(ROOT / 'site/favicon.svg', assets / 'favicon.svg')
    return len(records)
