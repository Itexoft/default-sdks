# Itexoft.NET.Sdk.BlazorWebAssembly

## English

### Purpose
`Itexoft.NET.Sdk.BlazorWebAssembly` is a thin wrapper over `Microsoft.NET.Sdk.BlazorWebAssembly`. It keeps the default SDK behavior and adds a build fix for `WasmAssembliesToBundle` when using a custom `OutDir` or when referenced projects output to custom paths.

### What it changes
- Re-resolves project reference outputs via `GetTargetPath` (with a build dependency) and replaces missing entries in `WasmAssembliesToBundle`.
- Keeps existing resolved assemblies intact; only missing ones are swapped.
- Skips this adjustment for nested publish (`WasmBuildingForNestedPublish=true`) and design-time builds.

### Usage
```xml
<Project Sdk="Itexoft.NET.Sdk.BlazorWebAssembly">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
</Project>
```

### Configuration (public properties)
| Property | Default | Notes |
| --- | --- | --- |
| ItexoftFixWasmAssembliesToBundle | true | Set to `false` to keep the upstream bundling behavior. |
| EnableDefaultWasmAssembliesToBundle | true | Standard WebAssembly SDK flag; required for the fix to apply. |

---

## Русский

### Назначение
`Itexoft.NET.Sdk.BlazorWebAssembly` — тонкая обёртка над `Microsoft.NET.Sdk.BlazorWebAssembly`. Он сохраняет стандартное поведение SDK и добавляет фикс для `WasmAssembliesToBundle` при использовании кастомного `OutDir` или когда зависимые проекты собираются в нестандартные каталоги.

### Что меняется
- Переопределяет выходы project references через `GetTargetPath` (с зависимостью на build) и заменяет отсутствующие элементы в `WasmAssembliesToBundle`.
- Сохраняет уже найденные сборки; заменяются только отсутствующие.
- Не трогает вложенный publish (`WasmBuildingForNestedPublish=true`) и дизайн-тайм сборки.

### Использование
```xml
<Project Sdk="Itexoft.NET.Sdk.BlazorWebAssembly">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
</Project>
```

### Настройка (публичные свойства)
| Свойство | По умолчанию | Примечания |
| --- | --- | --- |
| ItexoftFixWasmAssembliesToBundle | true | Установите `false`, чтобы оставить поведение SDK по умолчанию. |
| EnableDefaultWasmAssembliesToBundle | true | Стандартный флаг WebAssembly SDK; нужен для применения фикса. |
