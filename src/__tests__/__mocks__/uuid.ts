/**
 * Mock for uuid module
 * Provides a simple incrementing counter for generating unique IDs in tests
 */

let counter = 0;

export function v4(): string {
  counter++;
  return `test-uuid-${counter}-${Date.now()}`;
}

// Reset counter between tests
export function __resetUuidCounter(): void {
  counter = 0;
}
