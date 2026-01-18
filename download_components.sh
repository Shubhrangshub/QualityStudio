#!/bin/bash
REPO="https://raw.githubusercontent.com/Shubhrangshub/QualityStudio/main"

# Download UI components
components=(
  "accordion.jsx"
  "alert-dialog.jsx"
  "alert.jsx"
  "aspect-ratio.jsx"
  "avatar.jsx"
  "badge.jsx"
  "breadcrumb.jsx"
  "button.jsx"
  "calendar.jsx"
  "card.jsx"
  "carousel.jsx"
  "chart.jsx"
  "checkbox.jsx"
  "collapsible.jsx"
  "command.jsx"
  "context-menu.jsx"
  "dialog.jsx"
  "drawer.jsx"
  "dropdown-menu.jsx"
  "form.jsx"
  "hover-card.jsx"
  "input-otp.jsx"
  "input.jsx"
  "label.jsx"
  "menubar.jsx"
  "navigation-menu.jsx"
  "pagination.jsx"
  "popover.jsx"
  "progress.jsx"
  "radio-group.jsx"
  "resizable.jsx"
  "scroll-area.jsx"
  "select.jsx"
  "separator.jsx"
  "sheet.jsx"
  "sidebar.jsx"
  "skeleton.jsx"
  "slider.jsx"
  "sonner.jsx"
  "switch.jsx"
  "table.jsx"
  "tabs.jsx"
  "textarea.jsx"
  "toast.jsx"
  "toaster.jsx"
  "toggle-group.jsx"
  "toggle.jsx"
  "tooltip.jsx"
)

echo "Downloading UI components..."
for file in "${components[@]}"; do
  echo "Downloading $file..."
  curl -s "$REPO/$file" -o "src/components/$file" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✓ Downloaded $file"
  else
    echo "✗ Failed to download $file"
  fi
done

echo "Download complete!"
