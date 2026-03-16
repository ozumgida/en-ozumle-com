#!/bin/bash
# Shared helper functions for update.sh and process-template.sh

# --- Minifier ---
min() {
  sed 's/^ *//; s/ *$//; /^$/d; s/  */ /g' "$1"
}

# --- JSON Helpers ---
json_val() {
  sed -n 's/.*"'"$2"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1" | head -1
}

json_flag() {
  grep -q "\"$2\"[[:space:]]*:[[:space:]]*true" "$1"
}

json_num() {
  sed -n 's/.*"'"$2"'"[[:space:]]*:[[:space:]]*\([0-9.]*\).*/\1/p' "$1" | head -1
}

json_img() {
  sed -n 's/.*"images"[[:space:]]*:[[:space:]]*\["\([^"]*\)".*/\1/p' "$1" | head -1
}

json_nested() {
  sed -n '/"'"$2"'"/,/^[[:space:]]*}/p' "$1" \
    | sed -n 's/.*"'"$3"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1
}

json_label() {
  sed -n '/"labels"/,/}/p' "$SITE_JSON" \
    | sed -n 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1
}

# Read array items from a nested JSON section
# Usage: json_nested_array "file" "section" "key" → one value per line
json_nested_array() {
  sed -n '/"'"$2"'"/,/^[[:space:]]*}/p' "$1" \
    | tr '\n' ' ' \
    | sed -n 's/.*"'"$3"'"[[:space:]]*:[[:space:]]*\[\([^]]*\)\].*/\1/p' \
    | tr ',' '\n' \
    | sed -n 's/.*"\([^"]*\)".*/\1/p'
}

# --- Utility ---
blur_src() {
  local src="$1"
  printf '%s' "${src%.webp}-k.webp"
}

# --- Routing ---
is_root_page() {
  echo ",$ROOT_PAGES," | grep -q ",$1,"
}

page_href() {
  local name="$1"
  if is_root_page "$name"; then
    printf '/%s.html' "$name"
  else
    printf '/%s/%s.html' "$PAGES_DIR" "$name"
  fi
}

page_output_path() {
  local name="$1"
  if is_root_page "$name"; then
    printf '%s/%s.html' "$OUTPUT_DIR" "$name"
  else
    printf '%s/%s/%s.html' "$OUTPUT_DIR" "$PAGES_DIR" "$name"
  fi
}

# --- Template Engine ---
render_template() {
  local content="$1"
  shift
  while [ $# -ge 2 ]; do
    local key="$1" val="$2"
    # Bash 5.2+: & and \ are special in replacement strings
    val="${val//\\/\\\\}"
    val="${val//&/\\&}"
    content="${content//\{\{$key\}\}/$val}"
    shift 2
  done
  printf '%s' "$content"
}

apply_layout() {
  local tpl_file="$1"
  shift
  local content
  content=$(<"$tpl_file")
  render_template "$content" "$@"
}
