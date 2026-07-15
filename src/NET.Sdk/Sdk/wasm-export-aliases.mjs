import { appendFileSync, createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const [, , irPath, exportMapPath, wrapperSymbolsPath, publicSymbolsPath] = process.argv;

if (!irPath || !exportMapPath || !wrapperSymbolsPath || !publicSymbolsPath) {
  fail("Usage: wasm-export-aliases.mjs <ir> <export-map> <wrappers> <public-symbols>");
}

const symbolPattern = /^[-A-Za-z$._][-A-Za-z$._0-9]*$/;
const lines = createInterface({
  input: createReadStream(exportMapPath, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

let wrapperSymbols = "";
let publicSymbols = "";
let aliases = "";
let hasMappings = false;

for await (const line of lines) {
  const separator = line.indexOf("\t");
  const fieldOffset = "\t".length;

  if (separator <= 0 || separator === line.length - fieldOffset || line.indexOf("\t", separator + fieldOffset) !== -1) {
    fail(`Invalid export map record in ${exportMapPath}. Expected EntryPoint<TAB>LLVMWrapperSymbol.`);
  }

  const publicSymbol = line.slice(0, separator);
  const wrapperSymbol = line.slice(separator + fieldOffset);

  symbol(publicSymbol, "EntryPoint");
  symbol(wrapperSymbol, "LLVMWrapperSymbol");

  if (hasRecord(publicSymbols, publicSymbol)) {
    fail(`Duplicate EntryPoint ${publicSymbol} in ${exportMapPath}.`);
  }

  if (hasRecord(wrapperSymbols, wrapperSymbol)) {
    fail(`Duplicate LLVMWrapperSymbol ${wrapperSymbol} in ${exportMapPath}.`);
  }

  if (publicSymbol === wrapperSymbol || hasRecord(wrapperSymbols, publicSymbol) || hasRecord(publicSymbols, wrapperSymbol)) {
    fail(`EntryPoint and LLVMWrapperSymbol namespaces overlap in ${exportMapPath}: ${publicSymbol}, ${wrapperSymbol}.`);
  }

  publicSymbols += `${publicSymbol}\n`;
  wrapperSymbols += `${wrapperSymbol}\n`;
  aliases += `@${publicSymbol} = dso_local alias ptr, ptr @${wrapperSymbol}\n`;
  hasMappings = true;
}

if (!hasMappings) {
  fail(`No UnmanagedCallersOnly export mappings found in ${exportMapPath}.`);
}

writeFileSync(wrapperSymbolsPath, wrapperSymbols);
writeFileSync(publicSymbolsPath, publicSymbols);
appendFileSync(irPath, `\n; UnmanagedCallersOnly entry point aliases.\n${aliases}`);

function symbol(value, field) {
  if (!symbolPattern.test(value)) {
    fail(`${field} ${value} from ${exportMapPath} is not an unquoted LLVM identifier.`);
  }
}

function hasRecord(records, expected) {
  let start = 0;

  while (start < records.length) {
    const end = records.indexOf("\n", start);

    if (records.slice(start, end) === expected) {
      return true;
    }

    start = end + "\n".length;
  }

  return false;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
