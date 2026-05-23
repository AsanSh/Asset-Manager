#!/bin/bash

# Script to replace bright colors in TSX/TS files with darker shades
# Usage: bash replace_colors.sh

SRC_DIR="src"

echo "Starting color replacement in $SRC_DIR..."

# Find all .tsx and .ts files, excluding node_modules
find "$SRC_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) ! -path "*/node_modules/*" | while read file; do
    # Create backup
    # cp "$file" "$file.backup"

    # Submit/Primary buttons
    sed -i '' 's/bg-emerald-500/bg-emerald-600/g' "$file"
    sed -i '' 's/hover:bg-emerald-600/hover:bg-emerald-700/g' "$file"

    # Delete buttons - red to rose
    sed -i '' 's/bg-red-500/bg-rose-600/g' "$file"
    sed -i '' 's/hover:bg-red-600/hover:bg-rose-700/g' "$file"
    sed -i '' 's/text-red-500/text-rose-600/g' "$file"
    sed -i '' 's/text-red-400/text-rose-600/g' "$file"
    sed -i '' 's/hover:bg-red-50/hover:bg-rose-50/g' "$file"
    sed -i '' 's/hover:text-red-700/hover:text-rose-700/g' "$file"
    sed -i '' 's/text-red-600/text-rose-600/g' "$file"
    sed -i '' 's/text-red-700/text-rose-700/g' "$file"
    sed -i '' 's/text-red-800/text-rose-800/g' "$file"
    sed -i '' 's/bg-red-50/bg-rose-50/g' "$file"
    sed -i '' 's/bg-red-100/bg-rose-100/g' "$file"
    sed -i '' 's/bg-red-600/bg-rose-600/g' "$file"
    sed -i '' 's/bg-red-700/bg-rose-700/g' "$file"
    sed -i '' 's/border-red-100/border-rose-100/g' "$file"
    sed -i '' 's/border-red-200/border-rose-200/g' "$file"

    # Blue buttons
    sed -i '' 's/bg-blue-500/bg-blue-600/g' "$file"
    sed -i '' 's/hover:bg-blue-600/hover:bg-blue-700/g' "$file"

    # Success/green to emerald
    sed -i '' 's/text-green-500/text-emerald-600/g' "$file"
    sed -i '' 's/text-green-600/text-emerald-600/g' "$file"
    sed -i '' 's/text-green-700/text-emerald-700/g' "$file"
    sed -i '' 's/text-green-800/text-emerald-800/g' "$file"
    sed -i '' 's/bg-green-50/bg-emerald-50/g' "$file"
    sed -i '' 's/bg-green-100/bg-emerald-100/g' "$file"
    sed -i '' 's/bg-green-200/bg-emerald-200/g' "$file"
    sed -i '' 's/border-green-100/border-emerald-100/g' "$file"
    sed -i '' 's/border-green-200/border-emerald-200/g' "$file"
    sed -i '' 's/hover:bg-green-50/hover:bg-emerald-50/g' "$file"
    sed -i '' 's/hover:bg-green-100/hover:bg-emerald-100/g' "$file"

    # Purple to indigo
    sed -i '' 's/text-purple-500/text-indigo-600/g' "$file"
    sed -i '' 's/text-purple-600/text-indigo-600/g' "$file"
    sed -i '' 's/text-purple-700/text-indigo-700/g' "$file"
    sed -i '' 's/text-purple-800/text-indigo-800/g' "$file"
    sed -i '' 's/bg-purple-50/bg-indigo-50/g' "$file"
    sed -i '' 's/bg-purple-100/bg-indigo-100/g' "$file"
    sed -i '' 's/bg-purple-500/bg-indigo-600/g' "$file"
    sed -i '' 's/bg-purple-600/bg-indigo-600/g' "$file"
    sed -i '' 's/border-purple-100/border-indigo-100/g' "$file"
    sed -i '' 's/border-purple-200/border-indigo-200/g' "$file"

    # Violet to indigo
    sed -i '' 's/text-violet-500/text-indigo-600/g' "$file"
    sed -i '' 's/text-violet-600/text-indigo-600/g' "$file"
    sed -i '' 's/text-violet-700/text-indigo-700/g' "$file"
    sed -i '' 's/bg-violet-50/bg-indigo-50/g' "$file"
    sed -i '' 's/bg-violet-100/bg-indigo-100/g' "$file"

    # Orange to amber
    sed -i '' 's/text-orange-500/text-amber-600/g' "$file"
    sed -i '' 's/text-orange-600/text-amber-600/g' "$file"
    sed -i '' 's/text-orange-700/text-amber-700/g' "$file"
    sed -i '' 's/text-orange-800/text-amber-800/g' "$file"
    sed -i '' 's/bg-orange-50/bg-amber-50/g' "$file"
    sed -i '' 's/bg-orange-100/bg-amber-100/g' "$file"
    sed -i '' 's/border-orange-100/border-amber-100/g' "$file"
    sed -i '' 's/border-orange-200/border-amber-200/g' "$file"

    # Yellow to amber
    sed -i '' 's/text-yellow-500/text-amber-600/g' "$file"
    sed -i '' 's/text-yellow-600/text-amber-600/g' "$file"
    sed -i '' 's/text-yellow-700/text-amber-700/g' "$file"
    sed -i '' 's/text-yellow-800/text-amber-800/g' "$file"
    sed -i '' 's/bg-yellow-50/bg-amber-50/g' "$file"
    sed -i '' 's/bg-yellow-100/bg-amber-100/g' "$file"
    sed -i '' 's/border-yellow-100/border-amber-100/g' "$file"
    sed -i '' 's/border-yellow-200/border-amber-200/g' "$file"
done

echo "Color replacement completed!"
echo ""
echo "Summary of changes:"
echo "- red-* → rose-*"
echo "- green-* → emerald-*"
echo "- purple-*/violet-* → indigo-*"
echo "- orange-*/yellow-* → amber-*"
echo "- blue-500 → blue-600"
echo "- emerald-500 → emerald-600"
