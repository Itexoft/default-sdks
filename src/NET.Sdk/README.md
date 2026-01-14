# Itexoft.NET.Sdk

### Purpose
`Itexoft.NET.Sdk` is a wrapper over `Microsoft.NET.Sdk`.
Currently, it behaves like the base SDK in normal cases and adds a NativeAOT WebAssembly side-module pipeline when `RuntimeIdentifier=browser-wasm`.

### Why use it
- Produce a single importable `.wasm` module from managed code.
- Keep the output clean: no JS/HTML, no static web assets, no runtime config or deps files.
- Use the installed wasm workload toolchain plus lightweight LLVM helpers.

### What it produces
- `$(TargetName).wasm` side module with no entry point.
- Optional `$(TargetName).wasm.symbols` when debug info is enabled.
- Exports are taken only from `UnmanagedCallersOnly` methods (build fails if none).

### Requirements
- .NET SDK with the wasm workload: `dotnet workload install wasm-tools` and `dotnet workload install wasm-experimental`.
- `RuntimeIdentifier=browser-wasm`.
- `PublishAot=true`.
- A modern target framework (tested with `net10.0`).

### Quick start
```xml
<Project Sdk="Itexoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <RuntimeIdentifier>browser-wasm</RuntimeIdentifier>
    <PublishAot>true</PublishAot>
  </PropertyGroup>
</Project>
```

Exported entry point:
```csharp
using System.Runtime.InteropServices;

public static class Exports
{
    [UnmanagedCallersOnly(EntryPoint = "add_i32")]
    public static int Add(int a, int b) => a + b;
}
```

Publish (this generates the `.wasm` output):
```
dotnet publish -c Release -r browser-wasm
```

### Output
- `dotnet publish` places artifacts in `bin/<config>/<tfm>/publish/` (or `PublishDir` if set).
- `*.wasm.symbols` is emitted when debug symbols are enabled.
- The module is importable; the host provides any missing runtime symbols.

### Configuration (public properties)

Core:
| Property | Default | Notes |
| --- | --- | --- |
| RuntimeIdentifier | required | Must be `browser-wasm` to enable the wasm pipeline. |
| PublishAot | required | NativeAOT is mandatory for this SDK. |
| TargetFramework | project | Use a modern net version (tested with `net10.0`). |

Diagnostics & optimization:
| Property | Notes |
| --- | --- |
| DebugSymbols | Enables symbol map output. |
| DebugType | `none` disables debug output. |
| Optimize | `false` forces `-O0`. |
| OptimizationPreference | `Size` uses `-Oz`; `Speed` uses `-O3` |
| PublishTrimmed | When `true`, debug output is suppressed. |
| StripSymbols | When `true`, strips debug sections with `llvm-objcopy`. |

Wasm feature flags:
| Property | Default | Notes |
| --- | --- | --- |
| WasmExceptionHandlingMode | `wasm` | `wasm`, `default`, or `none`. |
| WasmEnableSIMD | true | Enables SIMD in AOT, emcc, and wasm-opt. |
| WasmEnableThreads | true | Enables pthreads and uses the multithread runtime pack. |
| WasmThreadPoolSize | unset | Sets the Emscripten thread pool size when threads are enabled. |
| WasmEnableSignExt | true | Enables sign-extension ops in wasm-opt. |
| WasmEnableMutableGlobals | true | Enables mutable globals in wasm-opt. |
| WasmEnableBulkMemory | true | Enables bulk memory ops in wasm-opt. |
| WasmEnableNontrappingFloatToInt | true | Enables non-trapping float-to-int in wasm-opt. |
| WasmEnableReferenceTypes | true | Enables reference types in wasm-opt. |
| WasmEnableMultivalue | true | Enables multi-value results in wasm-opt. |
| WasmEnableExtendedConst | true | Enables extended const expressions in wasm-opt. |
| WasmEnableTailCall | true | Enables tail calls in wasm-opt. |
| WasmEnableGC | true | Enables GC features in wasm-opt. |

### Notes and limitations
- The output is a side module with no JS/HTML or static web assets.
- No runtime config or deps files are generated.
- Managed trimming runs as part of the pipeline and expects a single managed assembly input.
- At least one `UnmanagedCallersOnly` export is required.

### Tooling used
- Uses the installed wasm workload (wasm-tools + wasm-experimental).
- Adds LLVM helper packages as private assets: `llvm.wasm-tools.*`, `llvm.objcopy`, `llvm.er`, `ilneg`, `nuxmux`.