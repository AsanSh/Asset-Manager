#!/usr/bin/env python3
"""
Script to replace bright colors in TSX/TS files with darker shades.
"""
import os
import re
from pathlib import Path

# Color replacements
REPLACEMENTS = [
    # Submit/Primary buttons
    (r'bg-emerald-500', 'bg-emerald-600'),
    (r'hover:bg-emerald-600', 'hover:bg-emerald-700'),

    # Delete buttons
    (r'bg-red-500', 'bg-rose-600'),
    (r'hover:bg-red-600', 'hover:bg-rose-700'),
    (r'text-red-500', 'text-rose-600'),
    (r'text-red-400', 'text-rose-600'),
    (r'hover:bg-red-50', 'hover:bg-rose-50'),
    (r'hover:text-red-700', 'hover:text-rose-700'),
    (r'text-red-600', 'text-rose-600'),
    (r'text-red-700', 'text-rose-700'),
    (r'text-red-800', 'text-rose-800'),
    (r'bg-red-50', 'bg-rose-50'),
    (r'bg-red-100', 'bg-rose-100'),
    (r'bg-red-600', 'bg-rose-600'),
    (r'bg-red-700', 'bg-rose-700'),
    (r'border-red-100', 'border-rose-100'),
    (r'border-red-200', 'border-rose-200'),

    # Blue buttons
    (r'bg-blue-500', 'bg-blue-600'),
    (r'hover:bg-blue-600', 'hover:bg-blue-700'),

    # Success/green states
    (r'text-green-500', 'text-emerald-600'),
    (r'text-green-600', 'text-emerald-600'),
    (r'text-green-700', 'text-emerald-700'),
    (r'text-green-800', 'text-emerald-800'),
    (r'bg-green-50', 'bg-emerald-50'),
    (r'bg-green-100', 'bg-emerald-100'),
    (r'bg-green-200', 'bg-emerald-200'),
    (r'border-green-100', 'border-emerald-100'),
    (r'border-green-200', 'border-emerald-200'),

    # Purple/violet to indigo
    (r'text-purple-500', 'text-indigo-600'),
    (r'text-purple-600', 'text-indigo-600'),
    (r'text-purple-700', 'text-indigo-700'),
    (r'text-purple-800', 'text-indigo-800'),
    (r'bg-purple-50', 'bg-indigo-50'),
    (r'bg-purple-100', 'bg-indigo-100'),
    (r'bg-purple-500', 'bg-indigo-600'),
    (r'bg-purple-600', 'bg-indigo-600'),
    (r'border-purple-100', 'border-indigo-100'),
    (r'border-purple-200', 'border-indigo-200'),

    (r'text-violet-500', 'text-indigo-600'),
    (r'text-violet-600', 'text-indigo-600'),
    (r'text-violet-700', 'text-indigo-700'),
    (r'bg-violet-50', 'bg-indigo-50'),
    (r'bg-violet-100', 'bg-indigo-100'),

    # Orange to amber
    (r'text-orange-500', 'text-amber-600'),
    (r'text-orange-600', 'text-amber-600'),
    (r'text-orange-700', 'text-amber-700'),
    (r'text-orange-800', 'text-amber-800'),
    (r'bg-orange-50', 'bg-amber-50'),
    (r'bg-orange-100', 'bg-amber-100'),
    (r'border-orange-100', 'border-amber-100'),
    (r'border-orange-200', 'border-amber-200'),

    # Yellow to amber
    (r'text-yellow-500', 'text-amber-600'),
    (r'text-yellow-600', 'text-amber-600'),
    (r'text-yellow-700', 'text-amber-700'),
    (r'text-yellow-800', 'text-amber-800'),
    (r'bg-yellow-50', 'bg-amber-50'),
    (r'bg-yellow-100', 'bg-amber-100'),
    (r'border-yellow-100', 'border-amber-100'),
    (r'border-yellow-200', 'border-amber-200'),
]

def replace_in_file(file_path: Path):
    """Replace color classes in a single file."""
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content

        for old, new in REPLACEMENTS:
            content = re.sub(old, new, content)

        if content != original_content:
            file_path.write_text(content, encoding='utf-8')
            print(f"Updated: {file_path.relative_to(Path.cwd())}")
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to process all TSX/TS files."""
    src_dir = Path(__file__).parent / 'src'
    if not src_dir.exists():
        print(f"Source directory not found: {src_dir}")
        return

    patterns = ['**/*.tsx', '**/*.ts']
    files_updated = 0
    files_processed = 0

    for pattern in patterns:
        for file_path in src_dir.glob(pattern):
            if 'node_modules' not in str(file_path):
                files_processed += 1
                if replace_in_file(file_path):
                    files_updated += 1

    print(f"\nProcessed {files_processed} files, updated {files_updated} files.")

if __name__ == '__main__':
    main()
