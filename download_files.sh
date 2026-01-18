#!/bin/bash
REPO="https://raw.githubusercontent.com/Shubhrangshub/QualityStudio/main"

# Download all JSX page files
pages=(
  "Home.jsx"
  "Dashboard.jsx"
  "DefectIntake.jsx"
  "RCAStudio.jsx"
  "CAPAWorkspace.jsx"
  "ProcessRuns.jsx"
  "GoldenBatch.jsx"
  "GoldenBatchCard.jsx"
  "GoldenBatchComparison.jsx"
  "GoldenBatchWizard.jsx"
  "SOPLibrary.jsx"
  "DoEDesigner.jsx"
  "KnowledgeSearch.jsx"
  "QualityOverview.jsx"
  "SalesComplaintLog.jsx"
  "TraceabilityViewer.jsx"
  "TraceabilityDiagram.jsx"
  "DataUpload.jsx"
  "DatabaseExport.jsx"
  "AIHub.jsx"
  "Admin.jsx"
  "RolePermissions.jsx"
  "SPCCapability.jsx"
  "QFIRForm.jsx"
  "VisualEditAgent.jsx"
  "PageNotFound.jsx"
  "AuthContext.jsx"
  "NavigationTracker.jsx"
)

echo "Downloading page files..."
for file in "${pages[@]}"; do
  echo "Downloading $file..."
  curl -s "$REPO/$file" -o "src/$file" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✓ Downloaded $file"
  else
    echo "✗ Failed to download $file"
  fi
done

echo "Download complete!"
