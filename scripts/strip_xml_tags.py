#!/usr/bin/env python3
"""
Strip XML/HTML tags and URLs from a markdown document while preserving readable content.

Usage:
    python3 strip_xml_tags.py <input_file> [output_file]

If output_file is omitted, prints to stdout.
"""

import re
import sys


def strip_tags_and_urls(text: str) -> str:
    # --- Step 1: Convert <dt>/<dd> pairs to markdown list items FIRST,
    #             before block-tag newline injection interferes.
    # Pattern in source: <dt ...>1.</dt><dd ...>text here</dd>
    # We want:  \n- 1. text here
    text = re.sub(r'<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>', lambda m: f'\n- {m.group(1).strip()} ', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'</dd>', '\n', text, flags=re.IGNORECASE)
    # Handle any stray dt/dd that weren't in the expected paired pattern
    text = re.sub(r'<dt[^>]*>', '\n- ', text, flags=re.IGNORECASE)
    text = re.sub(r'</dt>', ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'<dd[^>]*>', ' ', text, flags=re.IGNORECASE)

    # --- Step 2: Ensure block-level tags start on their own line.
    #             Exclude dt/dd (already handled above).
    BLOCK_TAGS = r'article|section|div|dl|p|h[1-6]|ul|ol|li|header|footer|nav|main|aside|blockquote'
    text = re.sub(r'<(/?)(' + BLOCK_TAGS + r')(\b[^>]*)>', r'\n<\1\2\3>', text, flags=re.IGNORECASE)

    # --- Step 3: Handle superscript footnote references.
    # Standalone footnote definitions appear at the start of a line:
    #   <sup>[807](url)</sup> Amended by No ...
    # Inline back-references appear mid-sentence:
    #   ...Swiss Civil Code<sup>[809](url)</sup>.
    # Distinguish by anchoring on start-of-line (after optional whitespace).
    text = re.sub(
        r'(?m)^(\s*)<sup>\[(\d+)\][^<]*</sup>([^\n<]+)',
        lambda m: f'\n> **Footnote {m.group(2)}:** {m.group(3).strip()}',
        text,
        flags=re.IGNORECASE
    )

    # Inline superscript footnote back-references: <sup>[NNN](url)</sup> -> [NNN]
    text = re.sub(r'<sup[^>]*>\[(\d+)\][^<]*</sup>', r'[\1]', text, flags=re.IGNORECASE)
    # Inline plain number superscripts: <sup>1</sup> -> [1]  (paragraph numbering)
    text = re.sub(r'<sup[^>]*>(\d+)</sup>', r'[\1]', text, flags=re.IGNORECASE)
    # Drop any remaining empty or non-numeric superscripts (e.g. turn-source markers)
    text = re.sub(r'<sup[^>]*>[^<]*</sup>', '', text, flags=re.IGNORECASE)

    # --- Step 4: Strip markdown links but keep the label text.
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)

    # --- Step 5: Remove bare URLs
    text = re.sub(r'https?://\S+', '', text)

    # --- Step 6: Remove all remaining XML/HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # --- Step 7: Collapse runs of blank lines to a single blank line
    lines = text.split('\n')
    cleaned = []
    prev_blank = False
    for line in lines:
        stripped = line.strip()
        if stripped == '':
            if not prev_blank:
                cleaned.append('')
            prev_blank = True
        else:
            cleaned.append(line.rstrip())
            prev_blank = False

    return '\n'.join(cleaned).strip() + '\n'


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <input_file> [output_file]", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) >= 3 else None

    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    result = strip_tags_and_urls(content)

    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result)
        print(f"Written to {output_path}")
    else:
        sys.stdout.write(result)


if __name__ == '__main__':
    main()
