/**
 * Brand Color Palette Configuration
 * 
 * This file contains all brand colors based on the official color palette
 * with Pantone codes, CMYK, Hex, and RGB values.
 */

export const brandColors = {
  // AU GREEN - Primary brand green
  green: {
    pantone: '7740 C',
    cmyk: { c: 81, m: 20, y: 100, k: 6 },
    hex: '#348F41',
    rgb: { r: 52, g: 143, b: 65 },
    name: 'AU Green',
  },
  
  // AU CORPORATE GREEN - Darker shade of green
  corporateGreen: {
    pantone: '3415 C',
    cmyk: { c: 86, m: 40, y: 91, k: 39 },
    hex: '#1A5632',
    rgb: { r: 26, g: 86, b: 50 },
    name: 'AU Corporate Green',
  },

  // AU RED - Brand red
  red: {
    pantone: '7420 C',
    cmyk: { c: 27, m: 98, y: 66, k: 18 },
    hex: '#9F2241',
    rgb: { r: 159, g: 34, b: 65 },
    name: 'AU Red',
  },

  // AU GOLD - Primary brand gold
  gold: {
    pantone: '4515 C',
    cmyk: { c: 31, m: 31, y: 69, k: 2 },
    hex: '#B4A269',
    rgb: { r: 180, g: 162, b: 105 },
    name: 'AU Gold',
  },

  // BRIGHT WHITE
  white: {
    pantone: '11-0601 TCX',
    cmyk: { c: 0, m: 0, y: 0, k: 0 },
    hex: '#FFFFFF',
    rgb: { r: 255, g: 255, b: 255 },
    name: 'Bright White',
  },

  // GREY TEXT - Text color
  greyText: {
    pantone: '425 C',
    cmyk: { c: 65, m: 56, y: 53, k: 29 },
    hex: '#58595B',
    rgb: { r: 88, g: 89, b: 91 },
    name: 'Grey Text',
  },
} as const;

/**
 * Primary Color Palette Ratio
 * Used for determining color usage proportions
 */
export const colorRatio = {
  gold: '60%',
  green: '15%',
  white: '15%',
  red: '15%',
} as const;

/**
 * Simplified color map for easy access (Hex values only)
 */
export const colors = {
  green: brandColors.green.hex,
  corporateGreen: brandColors.corporateGreen.hex,
  red: brandColors.red.hex,
  gold: brandColors.gold.hex,
  white: brandColors.white.hex,
  greyText: brandColors.greyText.hex,
} as const;

/**
 * Type-safe color names
 */
export type BrandColorName = keyof typeof colors;

