import type { HudColorOverrides } from '../config.js';
export declare const RESET = "\u001B[0m";
export declare function green(text: string): string;
export declare function yellow(text: string): string;
export declare function red(text: string): string;
export declare function cyan(text: string): string;
export declare function magenta(text: string): string;
export declare function dim(text: string): string;
export declare function claudeOrange(text: string): string;
export declare function model(text: string, colors?: Partial<HudColorOverrides>): string;
export declare function project(text: string, colors?: Partial<HudColorOverrides>): string;
export declare function git(text: string, colors?: Partial<HudColorOverrides>): string;
export declare function gitBranch(text: string, colors?: Partial<HudColorOverrides>): string;
export declare function label(text: string, colors?: Partial<HudColorOverrides>): string;
export declare function custom(text: string, colors?: Partial<HudColorOverrides>): string;
export declare function warning(text: string, colors?: Partial<HudColorOverrides>): string;
export declare function critical(text: string, colors?: Partial<HudColorOverrides>): string;
export interface ContextThresholds {
    warning?: number;
    critical?: number;
}
export declare function getContextColor(percent: number, colors?: Partial<HudColorOverrides>, thresholds?: ContextThresholds): string;
export declare function getQuotaColor(percent: number, colors?: Partial<HudColorOverrides>): string;
export declare function quotaBar(percent: number, width?: number, colors?: Partial<HudColorOverrides>): string;
export declare function coloredBar(percent: number, width?: number, colors?: Partial<HudColorOverrides>, thresholds?: ContextThresholds): string;
/**
 * A single-row stacked bar: top half = `usagePct` (green → amber → orange → red),
 * bottom half = `timePct` (teal). Built from ▄ cells whose bg/fg encode the two
 * halves (top = background, bottom = foreground glyph). When the colored top
 * extends past the teal bottom, quota is being spent faster than the window's
 * clock is ticking.
 */
export declare function stackedBar(usagePct: number, timePct: number, width?: number): string;
//# sourceMappingURL=colors.d.ts.map