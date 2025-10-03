/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Deep path extraction from nested objects
 * Converts { a: { b: "text" } } => "a" | "a.b"
 */
type PathImpl<T, Key extends keyof T> = Key extends string
  ? T[Key] extends Record<string, any>
    ? T[Key] extends ArrayLike<any>
      ? Key | `${Key}.${PathImpl<T[Key], Exclude<keyof T[Key], keyof any[]>>}`
      : Key | `${Key}.${PathImpl<T[Key], keyof T[Key]>}`
    : Key
  : never;

export type Path<T> = PathImpl<T, keyof T> | keyof T;

/**
 * Get value type from nested path
 * PathValue<{ a: { b: string } }, "a.b"> => string
 */
export type PathValue<T, P extends Path<T>> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends Path<T[Key]>
      ? PathValue<T[Key], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never;

/**
 * Recursively extract all parameter names from a string
 * "Hello {name}! You have {count} items" => "name" | "count"
 */
type ExtractParamNames<T extends string> = T extends `${string}{${infer Param}}${infer Rest}` ? Param | ExtractParamNames<Rest> : never;

/**
 * Build exact parameter object type from extracted names
 * If no parameters, returns empty object type (not never)
 */
export type ExtractParams<T extends string> = [ExtractParamNames<T>] extends [never]
  ? Record<string, never> // No parameters needed
  : { [K in ExtractParamNames<T>]: string | number };

/**
 * Check if string contains interpolation variables
 */
type HasParams<T extends string> = T extends `${string}{${string}}${string}` ? true : false;

/**
 * Translation function type with strict parameter checking
 *
 * Overload 1: For translations without parameters
 * Overload 2: For translations with parameters (strict type checking)
 */
export type TranslateFn<T extends Record<string, any>> = {
  // Translation without parameters (when string has no {variables})
  <K extends Path<T>>(
    key: K
  ): PathValue<T, K> extends string
    ? HasParams<PathValue<T, K>> extends true
      ? never // Force params if string has {variables}
      : string
    : never;

  // Translation with parameters (when string has {variables})
  <K extends Path<T>>(
    key: K,
    params: PathValue<T, K> extends string ? ExtractParams<PathValue<T, K>> : never
  ): PathValue<T, K> extends string ? string : never;
};

/**
 * Dictionary type - any nested object structure
 */
export type Dictionary = Record<string, any>;

/**
 * Recursively converts all string literal types to string
 * while preserving the object structure
 */
export type Widen<T> = T extends string ? string : T extends object ? { [K in keyof T]: Widen<T[K]> } : T;

// ============================================================================
// Namespaced Translation Types
// ============================================================================

/**
 * Remove prefix from string literal type
 * @example RemovePrefix<"test.title", "test"> => "title"
 */
export type RemovePrefix<T extends string, Prefix extends string> = T extends `${Prefix}.${infer Rest}` ? Rest : never;

/**
 * Extract all keys with given prefix and remove the prefix
 * @example KeysWithPrefix<Messages, "test"> => "title" | "settingsPage" | "windowState" | ...
 */
export type KeysWithPrefix<T, Prefix extends string> = RemovePrefix<Extract<Path<T>, `${Prefix}.${string}`>, Prefix>;

/**
 * Namespaced translation function type
 * Similar to TranslateFn but keys are relative to the namespace
 */
export type NamespacedTranslateFn<T extends Record<string, any>, Prefix extends string> = {
  // Translation without parameters
  <K extends KeysWithPrefix<T, Prefix>>(
    key: K
  ): PathValue<T, `${Prefix}.${K}`> extends string ? (HasParams<PathValue<T, `${Prefix}.${K}`>> extends true ? never : string) : never;

  // Translation with parameters
  <K extends KeysWithPrefix<T, Prefix>>(
    key: K,
    params: PathValue<T, `${Prefix}.${K}`> extends string ? ExtractParams<PathValue<T, `${Prefix}.${K}`>> : never
  ): PathValue<T, `${Prefix}.${K}`> extends string ? string : never;
};
