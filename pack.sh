#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${OUT_DIR:-$ROOT_DIR/nuget}"
DEFAULT_VERSION="0.1.0"
VERSION_OVERRIDE=""
ALL=false
REQUESTED_PROJECTS=()
PROJECTS=()

usage() {
  cat <<'EOF'
Usage: ./pack.sh [--project <path>|--sdk <dir>] [--all] [--out <dir>] [--version <x.y.z>]

Examples:
  ./pack.sh --all
  ./pack.sh --project src/NET.Sdk/NET.Sdk.csproj
  ./pack.sh --sdk src/NET.Sdk.BlazorWebAssembly --out /tmp/nuget
EOF
}

resolve_project() {
  local input="$1"

  if [[ -d "$input" ]]; then
    shopt -s nullglob
    local matches=("$input"/*.csproj)
    shopt -u nullglob
    if [[ ${#matches[@]} -ne 1 ]]; then
      echo "Expected exactly one .csproj in $input, found ${#matches[@]}" >&2
      exit 1
    fi
    echo "${matches[0]}"
    return
  fi

  echo "$input"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project|--sdk)
      REQUESTED_PROJECTS+=("$2")
      shift 2
      ;;
    --all)
      ALL=true
      shift
      ;;
    --out)
      OUT_DIR="$2"
      shift 2
      ;;
    --version)
      VERSION_OVERRIDE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet is required to pack the SDKs." >&2
  exit 1
fi

if [[ "$ALL" == true || ${#REQUESTED_PROJECTS[@]} -eq 0 ]]; then
  while IFS= read -r proj; do
    if grep -q "PackageType>MSBuildSdk<" "$proj"; then
      PROJECTS+=("$proj")
    fi
  done < <(find "$ROOT_DIR/src" -mindepth 2 -maxdepth 2 -name "*.csproj" -print | sort)
else
  for input in "${REQUESTED_PROJECTS[@]}"; do
    PROJECTS+=("$(resolve_project "$input")")
  done
fi

if [[ ${#PROJECTS[@]} -eq 0 ]]; then
  echo "No SDK projects found to pack." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

for project in "${PROJECTS[@]}"; do
  if [[ ! -f "$project" ]]; then
    echo "Project file not found: $project" >&2
    exit 1
  fi

  project_dir="$(cd "$(dirname "$project")" && pwd)"
  version="$VERSION_OVERRIDE"
  if [[ -z "$version" && -f "$project_dir/VERSION" ]]; then
    version="$(cat "$project_dir/VERSION")"
  fi
  version="${version:-$DEFAULT_VERSION}"

  echo "Packing $(basename "$project") (version $version)"
  dotnet pack "$project" -c Release -o "$OUT_DIR" /p:NoBuild=true /p:Version="$version"
done

echo "Packages created in: $OUT_DIR"
