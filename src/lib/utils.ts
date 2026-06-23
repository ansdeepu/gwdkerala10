import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name?: string) => {
  if (!name || name.trim() === '') return 'U';
  return name
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export const formatCase = (str: string | null | undefined): string | null | undefined => {
  if (!str || str.trim().length === 0) return str;
  
  const isAllUpperCase = str === str.toUpperCase() && str !== str.toLowerCase();
  
  // List of small words to keep in lowercase unless they are the first word.
  const lowerCaseWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with']);

  if (isAllUpperCase) {
    return str
      .split(' ')
      .map((word, index) => {
        const lowerWord = word.toLowerCase();
        if (word.length > 0) {
          if (index > 0 && lowerCaseWords.has(lowerWord)) {
            return lowerWord;
          }
          return word.charAt(0).toUpperCase() + lowerWord.slice(1);
        }
        return '';
      })
      .join(' ');
  }
  
  return str;
};
