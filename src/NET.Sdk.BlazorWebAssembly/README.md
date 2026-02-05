# Itexoft.NET.Sdk.BlazorWebAssembly

## English

### Purpose
`Itexoft.NET.Sdk.BlazorWebAssembly` is a thin wrapper over `Microsoft.NET.Sdk.BlazorWebAssembly`.
It keeps the default SDK behavior and adds:
- a build fix for `WasmAssembliesToBundle` when using a custom `OutDir` or when referenced projects output to custom paths;
- a generic side-module pipeline for browser wasm dynamic linking.

### What it changes
- Re-resolves project reference outputs via `GetTargetPath` (with a build dependency) and replaces missing entries in `WasmAssembliesToBundle`.
- Keeps existing resolved assemblies intact; only missing ones are swapped.
- Skips this adjustment for nested publish (`WasmBuildingForNestedPublish=true`) and design-time builds.
- Treats `@(NativeWasmFileReference)` as the only public input for browser side-modules.
- Publishes side-modules as loose files and writes boot config metadata for the JS loader.
- Does not know anything about provider assemblies, package references, embedded resources, or extraction flows.

### Usage
```xml
<Project Sdk="Itexoft.NET.Sdk.BlazorWebAssembly">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
</Project>
```

Provider contract:
```xml
<ItemGroup>
  <NativeWasmFileReference Include="/absolute/or/resolved/path/to/example-native.wasm">
    <AutoLoad>true</AutoLoad>
  </NativeWasmFileReference>
</ItemGroup>
```

### Configuration (public properties)
| Property | Default | Notes |
| --- | --- | --- |
| ItexoftFixWasmAssembliesToBundle | true | Set to `false` to keep the upstream bundling behavior. |
| EnableDefaultWasmAssembliesToBundle | true | Standard WebAssembly SDK flag; required for the fix to apply. |
| WasmMainModuleLevel | `auto` | Resolves to `dce` when `NativeWasmFileReference` exists, otherwise to `off`. |
| WasmEnableDlopenExports | `auto` | Resolves to `true` when dynamic linking is enabled. |
| WasmEnableDynamicLinkingLoader | `auto` | Resolves to `true` when dynamic linking is enabled. |

### Side-module metadata
When `@(NativeWasmFileReference)` is present, the SDK emits:
- `itexoftWasmSideModules`
- `itexoftWasmSideModulePaths`
- `itexoftWasmSideModuleAutoLoad`

These keys are consumed by the browser loader and are derived only from `NativeWasmFileReference`.

---

## Русский

### Назначение
`Itexoft.NET.Sdk.BlazorWebAssembly` — тонкая обёртка над `Microsoft.NET.Sdk.BlazorWebAssembly`.
Он сохраняет стандартное поведение SDK и добавляет:
- фикс для `WasmAssembliesToBundle` при использовании кастомного `OutDir` или когда зависимые проекты собираются в нестандартные каталоги;
- общий пайплайн browser side-module для wasm dynamic linking.

### Что меняется
- Переопределяет выходы project references через `GetTargetPath` (с зависимостью на build) и заменяет отсутствующие элементы в `WasmAssembliesToBundle`.
- Сохраняет уже найденные сборки; заменяются только отсутствующие.
- Не трогает вложенный publish (`WasmBuildingForNestedPublish=true`) и дизайн-тайм сборки.
- Считает `@(NativeWasmFileReference)` единственным публичным входом для browser side-module.
- Публикует side-module как внешний loose-файл и пишет метаданные в boot config для JS loader.
- Ничего не знает про provider assembly, package references, embedded resources и extraction flow.

### Использование
```xml
<Project Sdk="Itexoft.NET.Sdk.BlazorWebAssembly">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
</Project>
```

Контракт провайдера:
```xml
<ItemGroup>
  <NativeWasmFileReference Include="/absolute/or/resolved/path/to/example-native.wasm">
    <AutoLoad>true</AutoLoad>
  </NativeWasmFileReference>
</ItemGroup>
```

### Настройка (публичные свойства)
| Свойство | По умолчанию | Примечания |
| --- | --- | --- |
| ItexoftFixWasmAssembliesToBundle | true | Установите `false`, чтобы оставить поведение SDK по умолчанию. |
| EnableDefaultWasmAssembliesToBundle | true | Стандартный флаг WebAssembly SDK; нужен для применения фикса. |
| WasmMainModuleLevel | `auto` | Становится `dce`, когда есть `NativeWasmFileReference`, иначе `off`. |
| WasmEnableDlopenExports | `auto` | Становится `true`, когда включён dynamic linking. |
| WasmEnableDynamicLinkingLoader | `auto` | Становится `true`, когда включён dynamic linking. |

### Метаданные side-module
Когда задан `@(NativeWasmFileReference)`, SDK пишет:
- `itexoftWasmSideModules`
- `itexoftWasmSideModulePaths`
- `itexoftWasmSideModuleAutoLoad`

Эти ключи использует browser loader; они полностью выводятся только из `NativeWasmFileReference`.
