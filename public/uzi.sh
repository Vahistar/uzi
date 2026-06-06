#!/usr/bin/env bash
set -euo pipefail

R="\033[1;31m"
C="\033[22;38;2;0;200;255m"
B="\033[38;2;0;150;220m"
A="\033[38;2;255;190;50m"
W="\033[1;37m"
D="\033[2m"
N="\033[0m"

API_HOST="${UZI_HOST:-https://uzi.pm}"
API_URL="$API_HOST"

usage() {
  local logo=(
    " █    ██ ▒███████▒ ██▓      ██▓███   ███▄ ▄███▓"
    " ██  ▓██▒▒ ▒ ▒ ▄▀░▓██▒     ▓██░  ██▒▓██▒▀█▀ ██▒"
    "▓██  ▒██░░ ▒ ▄▀▒░ ▒██▒     ▓██░ ██▓▒▓██    ▓██░"
    "▓▓█  ░██░  ▄▀▒   ░░██░     ▒██▄█▓▒ ▒▒██    ▒██"
    "▒▒█████▓ ▒███████▒░██░ ██▓ ▒██▒ ░  ░▒██▒   ░██▒"
    "░▒▓▒ ▒ ▒ ░▒▒ ▓░▒░▒░▓   ▒▓▒ ▒▓▒░ ░  ░░ ▒░   ░  ░"
    "░░▒░ ░ ░ ░░▒ ▒ ░ ▒ ▒ ░ ░▒  ░▒ ░     ░  ░      ░"
    " ░░░ ░ ░ ░ ░ ░ ░ ░ ▒ ░ ░   ░░       ░      ░"
    "   ░       ░ ░     ░    ░                  ░"
  )
  local r=(0 0 0 0 0 0 0 0 0)
  local g=(200 187 175 162 150 137 125 112 100)
  local b=(255 248 241 234 227 220 213 206 200)
  echo
  for i in "${!logo[@]}"; do
    echo -e "  \033[38;2;${r[$i]};${g[$i]};${b[$i]}m${logo[$i]}\033[0m"
  done
  echo
  echo -e "  ${A}Usage:${N}"
  echo "    uzi install <slug>     Install a script"
  echo "    uzi list               List all scripts"
  echo "    uzi search  <query>    Search scripts"
  echo "    uzi info    <slug>     Show script details"
  echo
  echo -e "  ${A}Examples:${N}"
  echo "    uzi install hello"
  echo "    uzi search test"
  echo "    uzi info uzi"
  echo
}

api_get() {
  local path="$1"; shift
  curl -sf "$API_URL/$path" "$@" 2>/dev/null || {
    echo -e "  ${R}Error:${N} API unreachable at $API_URL" >&2
    exit 1
  }
}

cmd_search() {
  local q="${1:-}"
  local data
  if [ -n "$q" ]; then
    data=$(api_get "search?q=$q")
  else
    data=$(api_get "search")
  fi
  local count
  count=$(echo "$data" | jq 'length')
  echo
  local label
  if [ -n "$q" ]; then
    label="Search: $q"
  else
    label="Scripts"
  fi
  echo -e "  ${C}─── ${label} (${count}) ─────────────────────────────────${N}"
  echo "$data" | jq -r '.[] | [.slug, .name, .description] | @tsv' \
    | awk -F'\t' -v C="$C" -v N="$N" \
      '{ printf "  "C"%-20s"N"  %-24s  %s\n", $1, $2, $3 }'
  echo
}

cmd_info() {
  local slug="$1"
  local data
  data=$(api_get "scripts/$slug")

  local name desc distro tested script
  name=$(echo "$data" | jq -r '.name')
  desc=$(echo "$data" | jq -r '.description')
  distro=$(echo "$data" | jq -r '.distro')
  tested=$(echo "$data" | jq -r '.tested_on')
  script=$(echo "$data" | jq -r '.script_content')

  echo
  echo -e "  ${C}─── ${name} (${slug}) ─────────────────────────────────${N}"
  echo
  echo -e "  ${D}description${N}   ${desc}"
  echo

  echo -e "  ${D}distro${N}"
  IFS=',' read -ra distro_list <<< "$distro"
  local tested_list=()
  local sep=$'\x01'
  local tested_clean="${tested//;;/$sep}"
  IFS="$sep" read -ra tested_list <<< "$tested_clean"
  for i in "${!distro_list[@]}"; do
    local dname
    dname=$(echo "${distro_list[$i]}" | xargs)
    local dver
    dver=$(echo "${tested_list[$i]:-}" | xargs)
    if [ -n "$dver" ]; then
      echo -e "    ${dname}  ${D}(${dver})${N}"
    else
      echo "    ${dname}"
    fi
  done
  echo
  local linecount
  linecount=$(echo "$script" | wc -l)
  if [ "$linecount" -gt 30 ] && command -v less &>/dev/null; then
    echo "$script" | while IFS= read -r line; do
      echo -e "  ${C}│${N}  ${line}"
    done | less -R
  else
    echo "$script" | while IFS= read -r line; do
      echo -e "  ${C}│${N}  ${line}"
    done
  fi
  echo
}

cmd_install() {
  local slug="$1"
  curl -sf "$API_HOST/install/$slug?shell=bash" 2>/dev/null | bash || {
    echo -e "  ${R}Error:${N} script '$slug' not found" >&2
    exit 1
  }
}

case "${1:-}" in
  install|i|-i)
    shift
    if [ -z "${1:-}" ]; then
      echo -e "  ${R}Usage:${N} uzi install <slug>" >&2
      exit 1
    fi
    cmd_install "$1"
    ;;
  search|s|-s)
    shift
    cmd_search "${1:-}"
    ;;
  list|l)
    cmd_search
    ;;
  info|show)
    shift
    if [ -z "${1:-}" ]; then
      echo -e "  ${R}Usage:${N} uzi info <slug>" >&2
      exit 1
    fi
    cmd_info "$1"
    ;;
  --help|-h|"")
    usage
    ;;
  *)
    echo -e "  ${R}Unknown command:${N} $1" >&2
    usage
    exit 1
    ;;
esac
