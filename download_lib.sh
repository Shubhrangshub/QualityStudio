#!/bin/bash
REPO="https://raw.githubusercontent.com/Shubhrangshub/QualityStudio/main"

# Download lib/core files
files=(
  "entities.js:src/lib/entities.js"
  "base44Client.js:src/lib/base44Client.js"
  "integrations.js:src/lib/integrations.js"
  "app-params.js:src/lib/app-params.js"
  "query-client.js:src/lib/query-client.js"
  "utils.js:src/lib/utils.js"
  "index.ts:src/lib/index.ts"
)

# Download hooks
hooks=(
  "use-mobile.jsx:src/hooks/use-mobile.jsx"
  "use-toast.jsx:src/hooks/use-toast.jsx"
)

# Download assets
assets=(
  "react.svg:src/assets/react.svg"
)

echo "Downloading lib files..."
for entry in "${files[@]}"; do
  IFS=':' read -r source dest <<< "$entry"
  echo "Downloading $source to $dest..."
  curl -s "$REPO/$source" -o "$dest" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✓ Downloaded $source"
  else
    echo "✗ Failed to download $source"
  fi
done

echo "Downloading hooks..."
for entry in "${hooks[@]}"; do
  IFS=':' read -r source dest <<< "$entry"
  echo "Downloading $source to $dest..."
  curl -s "$REPO/$source" -o "$dest" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✓ Downloaded $source"
  else
    echo "✗ Failed to download $source"
  fi
done

mkdir -p src/assets
echo "Downloading assets..."
for entry in "${assets[@]}"; do
  IFS=':' read -r source dest <<< "$entry"
  echo "Downloading $source to $dest..."
  curl -s "$REPO/$source" -o "$dest" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✓ Downloaded $source"
  else
    echo "✗ Failed to download $source"
  fi
done

echo "Download complete!"
