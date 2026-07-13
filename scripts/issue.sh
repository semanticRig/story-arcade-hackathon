#!/bin/bash
# issue.sh — create/close issues. Works local-first, optionally syncs to GitHub.
# Usage:
#   ./scripts/issue.sh create "title" "body" [bug|feat|chore]
#   ./scripts/issue.sh close ISSUE_FILE
#   ./scripts/issue.sh sync          # push all open issues to GitHub

set -euo pipefail
ISSUES_DIR=".issues"
OPEN_DIR="${ISSUES_DIR}/open"
CLOSED_DIR="${ISSUES_DIR}/closed"
TEMPLATES_DIR="${ISSUES_DIR}/templates"

cmd="${1:-}"
shift || true

create_issue() {
  local title="$1" body="${2:-}" label="${3:-bug}"
  local date=$(date +%Y-%m-%d)
  local slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//')
  local file="${OPEN_DIR}/${date}-${slug}.md"

  cat > "$file" <<EOF
---
title: "${title}"
labels: [${label}]
status: open
created: ${date}
assigned: loop-engineer
---

${body}

## Priority
<!-- low / medium / high / critical -->
EOF
  echo "Created: $file"
}

close_issue() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "Error: issue $file not found" >&2
    return 1
  fi
  mv "$file" "$CLOSED_DIR/"
  echo "Closed: $file → $CLOSED_DIR/"
}

sync_to_github() {
  if ! command -v gh &>/dev/null; then
    echo "gh CLI not found — skipping GitHub sync"
    return 0
  fi
  if ! gh auth status &>/dev/null; then
    echo "gh not authenticated — skipping GitHub sync"
    return 0
  fi
  if ! git remote get-url origin &>/dev/null 2>&1; then
    echo "No git remote 'origin' — skipping GitHub sync (issues stored locally)"
    return 0
  fi

  for file in "${OPEN_DIR}"/*.md; do
    [ -f "$file" ] || continue
    # Skip files already synced (check for github-id in frontmatter)
    if grep -q "github-id:" "$file" 2>/dev/null; then continue; fi

    local title=$(grep '^title:' "$file" | head -1 | sed 's/^title:\s*"//;s/"$//' | sed "s/^title:\s*'//;s/'$//")
    local label=$(grep '^labels:' "$file" | head -1 | sed 's/^labels:\s*\[//;s/\]$//' | tr -d ' ')
    local body=$(sed -n '/^---$/,/^## Priority/p' "$file" | tail -n +2 | head -n -1 | sed '/^## Priority/d' | tail -n +2)

    echo "Creating GitHub issue: $title"
    local url=$(gh issue create --title "$title" --body "$body" --label "${label:-bug}" 2>&1)
    if echo "$url" | grep -q 'github.com'; then
      local id=$(echo "$url" | grep -oP '/issues/\K[0-9]+')
      sed -i "3i github-id: ${id}" "$file"
      echo "  Synced → $url"
    else
      echo "  Failed: $url"
    fi
  done
}

case "$cmd" in
  create) create_issue "$@" ;;
  close)  close_issue "$1" ;;
  sync)   sync_to_github ;;
  *)
    echo "Usage: $0 create|close|sync [args...]"
    echo "  create 'title' 'body' [label]   Create new issue"
    echo "  close  issue-file.md            Move to closed"
    echo "  sync                            Push open issues to GitHub"
    exit 1
    ;;
esac
