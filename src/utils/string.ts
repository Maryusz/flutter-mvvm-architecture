/**
 * Capitalizes snake_case features to PascalCase.
 * e.g., "my_feature_name" -> "MyFeatureName"
 */
export function toPascalCase(name: string): string {
  if (!name) {
    return "";
  }
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Standardizes plurals to snake_case.
 */
export function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/_+/g, "_");
}

/**
 * Deduces building-block singular name based on plural snake_case input.
 * e.g., "companies" -> "company", "users" -> "user", "categories" -> "category"
 */
export function deduceSingular(pluralSnakeCaseName: string): string {
  const lowercase = pluralSnakeCaseName.toLowerCase();
  
  // Rule for companies/categories -> company/category
  if (lowercase.endsWith("ies")) {
    return pluralSnakeCaseName.slice(0, -3) + "y";
  }
  
  // Rule for boxes/matches -> box/match (ends in -es but base might end in x, ch, sh, ss)
  if (lowercase.endsWith("es") && (lowercase.endsWith("ches") || lowercase.endsWith("shes") || lowercase.endsWith("xes") || lowercase.endsWith("sses"))) {
    return pluralSnakeCaseName.slice(0, -2);
  }

  // Simple plural s removal
  if (lowercase.endsWith("s") && !lowercase.endsWith("ss") && lowercase.length > 1) {
    return pluralSnakeCaseName.slice(0, -1);
  }
  
  return pluralSnakeCaseName;
}
