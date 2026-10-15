import { readSave, type Save } from "./game";
export const SAVE_KEY = "dead-deadly-deader:v1";
export function saveProblem(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return "Your existing save could not be read. It has been kept intact.";
    if (value.version !== 1 && value.version !== 2)
      return "This save uses a different game version. It has been kept intact.";
    return null;
  } catch {
    return "Your existing save could not be read. It has been kept intact.";
  }
}
export function loadLocalSave(storage: Pick<Storage, "getItem">) {
  const raw = storage.getItem(SAVE_KEY);
  return { save: readSave(raw), notice: saveProblem(raw) };
}
/** Never overwrite a corrupt or newer-version save, including after a second tab changes it. */
export function writeLocalSave(
  storage: Pick<Storage, "getItem" | "setItem">,
  save: Save,
): boolean {
  try {
    if (saveProblem(storage.getItem(SAVE_KEY))) return false;
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
