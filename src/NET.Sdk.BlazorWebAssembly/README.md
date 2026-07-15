# Itexoft.NET.Sdk.BlazorWebAssembly

## Purpose

`Itexoft.NET.Sdk.BlazorWebAssembly` prepares the main Blazor WebAssembly module for dynamic loading of wasm libraries.

The SDK takes the application project, an explicit thread mode, and a main-module level, selects the compatible browser .NET runtime, and produces the main wasm. The SDK does not receive the path, the name, or the bytes of any concrete dynamic library.

## Operational definitions

- **Main module**: input — a Blazor project and `WasmMainModuleLevel`; output — the main wasm with the matching `MAIN_MODULE`; changed state — native link options; correctness — the runtime exports the `dlopen` infrastructure for dynamic modules.
- **Main-module level**: input — `WasmMainModuleLevel=1|2` or one of its public aliases; output — the same-numbered Emscripten mode and the `mm1|mm2` runtime variant; changed state — the set of retained symbols and the selected runtime assets; correctness — the linker flag and the runtime directory carry the same numeric level.
- **Dead-code elimination**: input — the native linker's reference graph; output — a wasm without unreachable symbols; changed state — the content of the final wasm; correctness — every symbol needed by dynamic modules is listed explicitly.
- **Dynamic library**: input for the application — a byte array from an embedded resource; output — a `NativeLibrary.Load` handle; changed state — the runtime's table of loaded native modules; correctness — the library is not published as a loose file and is not linked statically into the main wasm.
- **Thread mode**: input — `WasmEnableThreads=true|false`; output — the selected main-runtime variant; changed state — compiler flags and runtime assets; correctness — the same value was used to build every loadable wasm.
- **Application AOT mode**: input — `PublishAot=true|false`; output — AOT-compiled or interpreted managed assemblies; changed state — how managed code executes, but not the `st/mt × mm1/mm2` variant; correctness — `true` enables `RunAOTCompilation`, while `false` or no value leaves it off.
- **Native relink**: input — dynamic linking enabled; output — the main wasm relinked with `MAIN_MODULE` and `NO_EXIT_RUNTIME`; changed state — the application's native part; correctness — these options are present both with and without AOT.
- **Consistent function index**: input — a side-module export and the range of its element segment; output — the same `GOT.func` index on every pthread; changed state — the thread's function table; correctness — reverse P/Invoke never hits an empty slot on a secondary pthread.

## Usage

A multithreaded application:

```xml
<Project Sdk="Itexoft.NET.Sdk.BlazorWebAssembly">
  <PropertyGroup>
    <TargetFramework>net10.0-browser</TargetFramework>
    <WasmEnableThreads>true</WasmEnableThreads>
  </PropertyGroup>
</Project>
```

A singlethreaded application:

```xml
<WasmEnableThreads>false</WasmEnableThreads>
```

`WasmEnableThreads` is set explicitly in every project that builds a wasm. The main application's SDK does not change the properties of referenced projects and does not know which of them produces the dynamic library.

`WasmMainModuleLevel` defaults to `1`. The aliases `auto` and `main` mean `1`, `dce` means `2`, and `off` means `0`. Level `2` enables dead-code elimination and requires listing explicitly every symbol the dynamic modules will need. Level `0` disables dynamic linking and keeps the stock Microsoft runtime.

## Dynamic-linking contract

The SDK translates `WasmMainModuleLevel` into a numeric level and adds `MAIN_MODULE=<level>` and `NO_EXIT_RUNTIME=1` to the stock native link of the main module. The same number selects `mm1` or `mm2` inside the runtime package. Static linking of a loadable library into the main wasm is not used.

With `WasmEnableThreads=true` the SDK plugs in a pinned `library_dylink.js` matching the Emscripten runtime. It writes into `GOT.func` the function index taken from the loaded side module's element segment, so the index is identical on all pthreads. A singlethreaded build uses the stock Emscripten library.

## Embedded-resource contract

The concrete library is managed by the resource-owning assembly, not by the application SDK:

1. the owner assembly invokes the producer project's `BuildWasmSideModule` target;
2. the producer's SDK builds a wasm with `SIDE_MODULE=1` and returns the paths of the wasm and the managed image;
3. the owner assembly embeds both returned files as embedded resources itself;
4. the application code reads the wasm as a byte array;
5. the bytes are handed to `NativeLibrary.Load` through a runtime-supported form;
6. the application registers the AOT information and loads the matching managed image.

`NativeWasmFileReference`, publishing the wasm as a static web asset, boot extensions, and a JS auto-loader are not part of this contract.

## Threading compatibility

| `WasmEnableThreads` | Main runtime | Allowed loadable module |
| --- | --- | --- |
| `true` | shared memory, pthreads, and atomic operations | only one built with `true` |
| `false` | plain memory without pthreads | only one built with `false` |

Mixing the modes is forbidden: the loadable module imports the main module's memory.

With dynamic linking enabled there are four main-runtime variants: `singlethread/mm1`, `singlethread/mm2`, `multithread/mm1`, and `multithread/mm2`. `PublishAot` is chosen independently and does not change the variant.

## Public inputs

| Input | Value | Purpose |
| --- | --- | --- |
| `WasmEnableThreads` | required, `true` or `false` | selects the single thread mode |
| `WasmMainModuleLevel` | `auto/main/1`, `dce/2`, `off/0`; defaults to `1` | selects the Emscripten level and native runtime, or disables dynamic linking |
| `PublishAot` | `true` or `false`; defaults to `false` | selects AOT or interpreted execution of managed assemblies |

The `Release` configuration by itself does not enable AOT. `RuntimeIdentifier`, runtime-package paths, and concrete wasm paths are not inputs of the application project.
