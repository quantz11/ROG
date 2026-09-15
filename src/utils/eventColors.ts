import { ClanEvent, EventType } from '../types';

export interface EventTheme {
  hex: string;
  lightHex: string;
  icon: string;
  rgb: { r: number; g: number; b: number };
}

// Preset color map for common events and palette cycling
export const EVENT_COLOR_PALETTE = [
  '#f59e0b', // Amber / Gold
  '#3b82f6', // Bright Blue
  '#ef4444', // Crimson / Red
  '#8b5cf6', // Violet / Purple
  '#10b981', // Emerald / Green
  '#06b6d4', // Cyan
  '#ec4899', // Pink / Rose
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Purple-500
];

export function hexToRgb(hexStr?: string): { r: number; g: number; b: number } {
  if (!hexStr) return { r: 245, g: 158, b: 11 };
  let cleaned = hexStr.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num) || cleaned.length !== 6) {
    return { r: 245, g: 158, b: 11 }; // default amber
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Generates a lighter/brighter tint for high-contrast dark-mode typography
export function getLightTint(r: number, g: number, b: number): string {
  // Blend 40% towards white for crisp text on dark backgrounds
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.45));
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.45));
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.45));
  return `rgb(${lr}, ${lg}, ${lb})`;
}

/**
 * Resolves full color and icon styling for an EventType
 */
export function getEventTypeColorTheme(eventType?: EventType | null, indexFallback: number = 0): EventTheme {
  const hex = eventType?.color?.trim() || EVENT_COLOR_PALETTE[indexFallback % EVENT_COLOR_PALETTE.length];
  const rgb = hexToRgb(hex);
  const lightHex = getLightTint(rgb.r, rgb.g, rgb.b);
  const icon = eventType?.icon || '⚔';

  return {
    hex,
    lightHex,
    icon,
    rgb,
  };
}

/**
 * Resolves color and icon styling for a specific ClanEvent
 */
export function getEventColorTheme(event: ClanEvent, eventTypes: EventType[]): EventTheme {
  if (!event) {
    return getEventTypeColorTheme(null, 0);
  }

  const etIndex = eventTypes.findIndex(t => t.id === event.eventTypeId);
  const et = etIndex >= 0 ? eventTypes[etIndex] : null;

  if (et) {
    return getEventTypeColorTheme(et, etIndex);
  }

  // Fallback by event name hash if no event type found
  let hash = 0;
  for (let i = 0; i < (event.name || '').length; i++) {
    hash = (hash << 5) - hash + event.name.charCodeAt(i);
    hash |= 0;
  }
  const colorIndex = Math.abs(hash) % EVENT_COLOR_PALETTE.length;
  const hex = EVENT_COLOR_PALETTE[colorIndex];
  const rgb = hexToRgb(hex);
  const lightHex = getLightTint(rgb.r, rgb.g, rgb.b);

  return {
    hex,
    lightHex,
    icon: '⚔',
    rgb,
  };
}
