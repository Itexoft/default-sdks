const _state = {
    module: null,
    libs: null,
    paths: null,
    autoLoad: null,
    autoLoadPromise: null
};

function _bindRuntimeModule() {
    if (typeof globalThis.getDotnetRuntime !== 'function') {
        throw new Error('getDotnetRuntime is not available');
    }
    const runtime = globalThis.getDotnetRuntime(0);
    if (!runtime || !runtime.Module) {
        throw new Error('Emscripten Module is not available');
    }
    _state.module = runtime.Module;
}

export async function onRuntimeReady(api) {
    if (!api || typeof api.getConfig !== 'function') {
        throw new Error('runtime api.getConfig is not available');
    }
    const config = api.getConfig();
    _applyNativeLibraries(config);
    _bindRuntimeModule();
    await _autoLoadWasmSideModules();
}

function _getModule() {
    if (_state.module) return _state.module;
    _bindRuntimeModule();
    return _state.module;
}

function _getFS(m) {
    if (m && m.FS) return m.FS;
    throw new Error('Emscripten FS is not available');
}

function _mkdirTree(FS, path) {
    if (!FS || typeof FS.mkdirTree !== 'function') {
        throw new Error('Emscripten FS.mkdirTree is not available');
    }
    FS.mkdirTree(path);
}

function _validateName(name) {
    if (typeof name !== 'string' || name.length === 0) throw new Error('name is empty');
    if (name.includes('/') || name.includes('\\')) throw new Error('name contains path separators');
}

export async function load(wasmBytes, name) {
    _validateName(name);
    if (!_state.libs) {
        throw new Error('native libraries registry is not initialized');
    }
    if (!_state.libs.has(name)) {
        throw new Error(`native module '${name}' is not registered`);
    }
    if (!(wasmBytes instanceof Uint8Array)) {
        throw new Error('wasmBytes must be Uint8Array');
    }

    const m = _getModule();
    const FS = _getFS(m);

    const dir = '/itexoft';
    const path = dir + '/' + name + '.wasm';

    _mkdirTree(FS, dir);

    FS.writeFile(path, wasmBytes);

    const loader = m.loadDynamicLibrary;
    if (!loader) throw new Error('loadDynamicLibrary is not available on Emscripten Module');

    const handle = await loader(path, {loadAsync: true, global: true, nodelete: true});
    return String(handle);
}

export async function loadByName(name) {
    _validateName(name);
    if (!_state.libs) {
        throw new Error('native libraries registry is not initialized');
    }
    if (!_state.libs.has(name)) {
        throw new Error(`native module '${name}' is not registered`);
    }

    const fileName = name + '.wasm';
    const path = _getWasmSideModulePath(name, fileName);
    const url = _resolveRootUrl(path);

    const response = await fetch(url, {credentials: 'same-origin'});
    if (!response.ok) throw new Error(`Failed to fetch '${url}': ${response.status} ${response.statusText}`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    return load(bytes, name);
}

function _setModules(libs) {
    if (!Array.isArray(libs)) {
        throw new Error('runtime config.extensions.extra.itexoftNativeModules must be an array');
    }
    for (const name of libs) {
        _validateName(name);
    }
    _state.libs = new Set(libs);
}

export function add(name) {
    _validateName(name);
    if (!_state.libs) {
        throw new Error('native libraries registry is not initialized');
    }
    _state.libs.add(name);
}

export function has(name) {
    if (!_state.libs) {
        throw new Error('native libraries registry is not initialized');
    }
    return _state.libs.has(name);
}

function _setWasmSideModulePaths(paths) {
    if (!paths || typeof paths !== 'object') {
        throw new Error('runtime config.extensions.extra.itexoftNativeModulePaths must be an object');
    }
    const entries = Object.entries(paths);
    for (const [name, value] of entries) {
        _validateName(name);
        if (typeof value !== 'string' || value.length === 0) {
            throw new Error('runtime config.extensions.extra.itexoftNativeModulePaths values must be non-empty strings');
        }
    }
    _state.paths = new Map(entries);
}

function _getWasmSideModulePath(name, fallback) {
    if (_state.paths && _state.paths.has(name)) {
        return _state.paths.get(name);
    }
    return fallback;
}

function _getRootUrl() {
    if (!globalThis.document || !document.baseURI) {
        throw new Error('document.baseURI is not available');
    }
    return document.baseURI;
}

function _resolveRootUrl(path) {
    return new URL(path, _getRootUrl()).toString();
}

function _applyNativeLibraries(config) {
    if (!config || typeof config !== 'object') {
        throw new Error('runtime config is not available');
    }
    const extensions = config.extensions;
    if (!extensions || typeof extensions !== 'object') {
        throw new Error('runtime config.extensions is not available');
    }
    const extra = extensions.extra;
    if (!extra || typeof extra !== 'object') {
        throw new Error('runtime config.extensions.extra is not available');
    }

    if (!('itexoftNativeModules' in extra)) {
        throw new Error('runtime config.extensions.extra.itexoftNativeModules is missing');
    }
    if (!('itexoftNativeModulePaths' in extra)) {
        throw new Error('runtime config.extensions.extra.itexoftNativeModulePaths is missing');
    }
    if (!('itexoftNativeAutoLoad' in extra)) {
        throw new Error('runtime config.extensions.extra.itexoftNativeAutoLoad is missing');
    }

    _setModules(extra.itexoftNativeModules);
    _setWasmSideModulePaths(extra.itexoftNativeModulePaths);

    if (!Array.isArray(extra.itexoftNativeAutoLoad)) {
        throw new Error('runtime config.extensions.extra.itexoftNativeAutoLoad must be an array');
    }
    for (const name of extra.itexoftNativeAutoLoad) {
        _validateName(name);
        if (!_state.libs.has(name)) {
            throw new Error(`runtime config.extensions.extra.itexoftNativeAutoLoad contains unknown module '${name}'`);
        }
    }
    _state.autoLoad = new Set(extra.itexoftNativeAutoLoad);
}

async function _autoLoadWasmSideModules() {
    if (_state.autoLoadPromise) return _state.autoLoadPromise;
    if (!_state.autoLoad) {
        throw new Error('native auto-load registry is not initialized');
    }
    if (_state.autoLoad.size === 0) return;
    _state.autoLoadPromise = (async () => {
        for (const name of _state.autoLoad) {
            await loadByName(name);
        }
    })();
    return _state.autoLoadPromise;
}

const _global = globalThis;
const _itexoft = _global.itexoft || (_global.itexoft = {});
const _wasmSideModule = _itexoft.wasmSideModule || (_itexoft.wasmSideModule = {});
_wasmSideModule.load = load;
_wasmSideModule.loadByName = loadByName;
_wasmSideModule.add = add;
_wasmSideModule.has = has;
