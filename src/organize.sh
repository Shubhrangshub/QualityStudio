#!/bin/bash

# Move UI components to components/ui/
mv accordion.jsx alert-dialog.jsx alert.jsx aspect-ratio.jsx avatar.jsx badge.jsx components/ui/ 2>/dev/null
mv breadcrumb.jsx button.jsx calendar.jsx card.jsx carousel.jsx chart.jsx components/ui/ 2>/dev/null
mv checkbox.jsx collapsible.jsx command.jsx context-menu.jsx dialog.jsx drawer.jsx components/ui/ 2>/dev/null
mv dropdown-menu.jsx form.jsx hover-card.jsx input-otp.jsx input.jsx label.jsx components/ui/ 2>/dev/null
mv menubar.jsx navigation-menu.jsx pagination.jsx popover.jsx progress.jsx radio-group.jsx components/ui/ 2>/dev/null
mv resizable.jsx scroll-area.jsx select.jsx separator.jsx sheet.jsx sidebar.jsx components/ui/ 2>/dev/null
mv skeleton.jsx slider.jsx sonner.jsx switch.jsx table.jsx tabs.jsx components/ui/ 2>/dev/null
mv textarea.jsx toast.jsx toaster.jsx toggle-group.jsx toggle.jsx tooltip.jsx components/ui/ 2>/dev/null

# Move lib files
mkdir -p api
mv base44Client.js api/ 2>/dev/null
mv entities.js integrations.js app-params.js query-client.js utils.js index.ts lib/ 2>/dev/null

# Move hooks
mv use-mobile.jsx use-toast.jsx hooks/ 2>/dev/null

# Move assets
mv react.svg assets/ 2>/dev/null

echo "Organization complete!"
