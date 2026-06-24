import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleError(error: unknown, context?: string) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`Error${context ? ` [${context}]` : ''}: ${msg}`);
}
