/**
 * Learn more about light and dark modes:
 * https:
 */


import { Colors } from '@/constants/Colors';

export function useThemeColor(
  colorName: keyof typeof Colors.nollningPostReveal
) {
  const theme = 'nollningPostReveal';
  return Colors[theme][colorName];
}
