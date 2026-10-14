"""Curated reading paths and shared document navigation; Markdown remains authoritative."""
import html
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def catalogue():
    data = json.loads((ROOT / 'site/docs-navigation.json').read_text())
    seen = set()
    for group in data['groups']:
        assert group['id'] not in seen, 'Duplicate reading path'
        seen.add(group['id'])
        assert set(group['title']) == {'en', 'de', 'fr', 'es'}
        for source in group['sources']:
            assert (ROOT / source).is_file(), f'Missing curated document: {source}'
    return data


def link(record, prefix, label=None, **attributes):
    attrs = ''.join(f' {k.replace("_", "-")}="{html.escape(str(v), quote=True)}"'
                    for k, v in attributes.items())
    return f'<a href="{prefix}{record["url"]}"{attrs}>{html.escape(label or record["title"])}</a>'


def sidebar(source, prefix, records, toc):
    data = catalogue()
    lookup = {r['source']: r for r in records}
    groups = []
    active = None
    for number, group in enumerate(data['groups'], 1):
        selected = source in group['sources']
        if selected:
            active = group
        rows = ''.join('<li>' + link(lookup[s], prefix, aria_current='page' if s == source else 'false') + '</li>'
                       for s in group['sources'])
        groups.append(f'<details class="docs-nav-group"{" open" if selected else ""}>'
                      f'<summary><span>{number:02}</span><b data-group-title="{group["id"]}">'
                      f'{html.escape(group["title"]["en"])}</b></summary><ul>{rows}</ul></details>')
    return ('<aside class="docs-sidebar"><details class="docs-menu" open><summary data-docs-copy="browse">Browse the handbook</summary>'
            f'<a class="docs-library-link" href="{prefix}docs/index.html" data-docs-copy="library">The Veyndo handbook</a>'
            '<nav aria-label="Documentation chapters">' + ''.join(groups) + '</nav></details>'
            '<div class="docs-page-toc"><p data-docs-copy="onPage">On this page</p>' + toc + '</div></aside>'), active


def onward(source, prefix, records, group):
    if not group:
        return ''
    lookup = {r['source']: r for r in records}
    position = group['sources'].index(source)
    buttons = []
    for label, offset in [('Previous', -1), ('Next', 1)]:
        index = position + offset
        if 0 <= index < len(group['sources']):
            buttons.append('<div><small data-docs-copy="' + label.lower() + '">' + label + '</small>' +
                           link(lookup[group['sources'][index]], prefix) + '</div>')
    return '<nav class="docs-onward" aria-label="Continue reading">' + ''.join(buttons) + '</nav>'


def hub(records):
    data = catalogue()
    lookup = {r['source']: r for r in records}
    cards = []
    selected = set()
    for number, group in enumerate(data['groups'], 1):
        rows = ''.join('<li>' + link(lookup[s], '../') + '</li>' for s in group['sources'])
        selected.update(group['sources'])
        cards.append(f'<section class="docs-chapter" id="chapter-{group["id"]}"><div class="docs-chapter-heading">'
                     f'<span class="docs-chapter-number">{number:02}</span><div><h2 data-group-title="{group["id"]}">'
                     f'{html.escape(group["title"]["en"])}</h2><p data-group-description="{group["id"]}">'
                     f'{html.escape(group["description"]["en"])}</p></div></div><ol>{rows}</ol></section>')
    archive = ''.join('<li>' + link(r, '../') + '<small>' + html.escape(r['source']) + '</small></li>'
                      for r in records if r['source'] not in selected)
    return ('<div class="docs-index"><section class="docs-hero"><p class="eyebrow" data-docs-copy="eyebrow">THE VEYNDO HANDBOOK</p>'
            '<h1><span data-docs-copy="titleA">Think AI.</span> <span data-docs-copy="titleB">Build commerce.</span></h1>'
            '<p class="lead" data-docs-copy="intro">Understand the idea. Try one complete round. Connect knowledge, agents and apps. Then operate with control.</p>'
            '<div class="docs-hero-actions"><a class="docs-primary" href="first-tour.html" data-docs-copy="firstTour">Start the first tour →</a>'
            '<a href="cognitive-commerce.html" data-docs-copy="understand">Explore the intelligence →</a></div>'
            '<p class="docs-language-note" data-docs-copy="sourceLanguage">Navigation is available in four languages. Technical articles currently use the original English source.</p></section>'
            '<section class="docs-discovery"><label for="docs-search" data-docs-copy="search">Search the complete handbook</label>'
            '<div class="docs-search-wrap"><span aria-hidden="true">⌕</span><input id="docs-search" type="search" '
            'placeholder="Knowledge, checkout, apps, sandbox…" autocomplete="off" aria-describedby="docs-count" /></div>'
            f'<p id="docs-count" role="status" data-document-count="{len(records)}">{len(records)} source documents · one connected system</p>'
            '<div id="docs-results"></div></section><div id="docs-directory">'
            '<nav class="docs-chapter-jump" aria-label="Reading paths">' +
            ''.join(f'<a href="#chapter-{g["id"]}" data-group-title="{g["id"]}">{html.escape(g["title"]["en"])}</a>' for g in data['groups']) +
            '</nav><div class="docs-chapters">' + ''.join(cards) + '</div>'
            '<details class="docs-reference"><summary data-docs-copy="reference">Complete reference, module notes and historical evidence</summary>'
            '<p data-docs-copy="referenceNote">Every source remains available and searchable. Historical reports retain their original dates and scope.</p>'
            '<ul class="docs-list">' + archive + '</ul></details></div></div>')


def chrome(prefix):
    return (f'<div class="docs-controls"><a href="{prefix}docs/index.html" data-docs-copy="handbook">Handbook</a>'
            '<label class="docs-locale-label"><span class="sr-only" data-docs-copy="language">Language</span>'
            '<select id="docs-language" aria-label="Documentation language"><option value="en">English</option>'
            '<option value="de">Deutsch</option><option value="fr">Français</option><option value="es">Español</option></select></label></div>')
