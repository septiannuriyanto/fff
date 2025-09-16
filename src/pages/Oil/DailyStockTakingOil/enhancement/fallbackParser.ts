// fallbackParser.ts
import { ParsedData } from "./parseWithOpenRouter";

export function fallbackParser(input: string): ParsedData {
  const tank = input.match(/otg\d+/i)?.[0] ?? null;
  const material = input.match(/oli\s+\w+/i)?.[0] ?? null;
  const tinggi = parseFloat(
    input.replace(",", ".").match(/(\d+(\.\d+)?)\s*cm/i)?.[1] ?? ""
  );
  return { tank, material, tinggi: isNaN(tinggi) ? null : tinggi };
}
