#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="$ROOT_DIR/NET.Sdk.csproj"
SDK_SRC_DIR="$ROOT_DIR/Sdk"
NUGET_PUBLISH_DIR="$ROOT_DIR/../../nuget"
OUT_DIR="${OUT_DIR:-$NUGET_PUBLISH_DIR}"
PACKAGE_ID="${PACKAGE_ID:-Itexoft.NET.Sdk}"
VERSION_FILE="$ROOT_DIR/VERSION"
VERSION="${VERSION:-}"

if [[ -z "$VERSION" && -f "$VERSION_FILE" ]]; then
  VERSION="$(cat "$VERSION_FILE")"
fi

VERSION="${VERSION:-0.1.0}"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet is required to pack the SDK." >&2
  exit 1
fi

if [[ ! -f "$PROJECT_PATH" ]]; then
  echo "Project file not found: $PROJECT_PATH" >&2
  exit 1
fi

if [[ ! -f "$SDK_SRC_DIR/Sdk.props" || ! -f "$SDK_SRC_DIR/Sdk.targets" ]]; then
  echo "SDK files not found in $SDK_SRC_DIR" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

dotnet pack "$PROJECT_PATH" -c Release -o "$OUT_DIR" /p:NoBuild=true /p:PackageId="$PACKAGE_ID" /p:Version="$VERSION"

echo "Package created in: $OUT_DIR"
