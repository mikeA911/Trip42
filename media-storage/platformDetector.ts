// src/media-storage/platformDetector.ts
export const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
export const isReactNative = typeof navigator !== "undefined" && (navigator as any).product === "ReactNative";
export const supportsOPFS = isBrowser && typeof (navigator as any).storage?.getDirectory === "function";
export const supportsFileSystemAccess = isBrowser && typeof (window as any).showDirectoryPicker === "function";
