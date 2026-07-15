# Itexoft.NET.Sdk

## Purpose

`Itexoft.NET.Sdk` builds a managed project into a WebAssembly module that the browser .NET runtime loads dynamically at run time.

The SDK takes an ordinary project and its WebAssembly settings, resolves the compatible tools and runtime package on its own, and produces:

- `$(TargetName).wasm`, linked with `SIDE_MODULE=1` and no entry point;
- the managed assembly image that matches that wasm;
- a symbol file when debug output is enabled.

The SDK does not know the concrete library, the resource owner, or the resource names. It only builds the side module and returns the paths of the produced files.

## Operational definitions

- **Dynamically loaded module**: input — a managed assembly with `UnmanagedCallersOnly` exports; output — a wasm linked with `SIDE_MODULE=1`; changed state — the set of build artifacts; correctness — the module is loaded through `dlopen`/`NativeLibrary.Load` instead of being linked statically into the main wasm.
- **Side-module build result**: input — the producer project; output — the `Wasm` and `ManagedImage` items of the `BuildWasmSideModule` target; changed state — only the producer project's files; correctness — both returned files exist.
- **Thread mode**: input — `WasmEnableThreads=true|false`; output — a multithreaded or singlethreaded wasm and a compatible runtime; changed state — compiler flags and the selected runtime variant; correctness — the value matches between the main module and every dynamically loaded module.
- **Export table**: input — methods with `UnmanagedCallersOnly.EntryPoint`; output — exact pairs of public name and LLVM wrapper; changed state — the side module's intermediate representation; correctness — every pair is unique, the wrapper exists, and the public name is exported by the final wasm.

## Producer project

The project describes only its own managed code:

```xml
<Project Sdk="Itexoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0-browser</TargetFramework>
    <PublishAot>true</PublishAot>
    <WasmEnableThreads>true</WasmEnableThreads>
  </PropertyGroup>
</Project>
```

The SDK derives `browser-wasm` from the target platform. The producer project enables AOT, because the side module's native code comes from AOT compilation, and sets its own thread mode. It does not set `RuntimeIdentifier`, runtime-package paths, or linker options.

`BuildWasmSideModule` returns two items with `ArtifactKind=Wasm` and `ArtifactKind=ManagedImage`. Consuming or embedding these files is the calling project layer's job, not the SDK's.

An exported function:

```csharp
using System.Runtime.InteropServices;

public static class Exports
{
    [UnmanagedCallersOnly(EntryPoint = "add_i32")]
    public static int Add(int a, int b) => a + b;
}
```

## How exports are formed

For every exported method the AOT compiler reports the exact `EntryPoint → LLVM wrapper` pair to the SDK. It does not make the wrapper public specifically for the side module, does not create an alias, and does not pick linker exports.

The SDK uses only that table: it makes the reported wrapper visible to the native linker, creates an LLVM alias named after the `EntryPoint`, and passes that name via `--export-if-defined`. Prefix-based wrapper lookup, positional matching of two lists, and alias creation inside Mono are not used.

## Main-module contract

The main wasm must be built with the `MAIN_MODULE` level that matches the runtime variant (`mm1` or `mm2`) selected by the host SDK. Linking a dynamically loaded module statically into the main wasm is not supported.

The `WasmEnableThreads` value must match:

| Main wasm | Loaded wasm | Result |
| --- | --- | --- |
| `true` | `true` | compatible multithreaded loading |
| `false` | `false` | compatible singlethreaded loading |
| mixed values | mixed values | incompatible memory and atomic operations |

## Public inputs

| Input | Value | Purpose |
| --- | --- | --- |
| `WasmEnableThreads` | required, `true` or `false` | selects the single thread mode |

## Responsibility boundaries

The SDK produces the artifacts and guarantees `SIDE_MODULE=1`. The owner's code, separately:

1. calls `BuildWasmSideModule`;
2. decides which results become resources;
3. reads the wasm bytes from the resource;
4. materializes them in a form accepted by `NativeLibrary.Load`;
5. registers the AOT information of the loaded module;
6. loads the matching managed image.

This SDK does not produce JS/HTML, boot config, or static web assets.
