import { isLimitReached } from "../../types.js";
import { shouldHideUsage } from "../../stdin.js";
import { critical, label, getQuotaColor, quotaBar, stackedBar, RESET } from "../colors.js";
import { getAdaptiveBarWidth } from "../../utils/terminal.js";
import { t } from "../../i18n/index.js";
import { progressLabel } from "./label-align.js";
import { formatResetTime } from "../format-reset-time.js";
const FIVE_HOUR_WINDOW_MS = 5 * 60 * 60 * 1000;
const SEVEN_DAY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export function renderUsageLine(ctx, alignLabels = false) {
    const display = ctx.config?.display;
    const colors = ctx.config?.colors;
    if (display?.showUsage === false) {
        return null;
    }
    if (!ctx.usageData) {
        return null;
    }
    if (shouldHideUsage(ctx.stdin)) {
        return null;
    }
    const usageLabel = progressLabel("label.usage", colors, alignLabels);
    const balanceLabel = ctx.usageData.balanceLabel ?? null;
    const hasWindowData = ctx.usageData.fiveHour !== null || ctx.usageData.sevenDay !== null;
    if (balanceLabel && !hasWindowData) {
        return `${usageLabel} ${balanceLabel}`;
    }
    const timeFormat = normalizeTimeFormat(display?.timeFormat);
    const showResetLabel = display?.showResetLabel ?? true;
    const resetsKey = limitResetTimeFormat(timeFormat) === 'absolute' ? "format.resets" : "format.resetsIn";
    const usageCompact = display?.usageCompact ?? false;
    const usageValueMode = display?.usageValue ?? 'percent';
    if (isLimitReached(ctx.usageData)) {
        const limitTimeFormat = limitResetTimeFormat(timeFormat);
        const resetTime = ctx.usageData.fiveHour === 100
            ? formatResetTime(ctx.usageData.fiveHourResetAt, limitTimeFormat)
            : formatResetTime(ctx.usageData.sevenDayResetAt, limitTimeFormat);
        if (usageCompact) {
            return appendBalance(critical(`⚠ Limit${resetTime ? ` (${resetTime})` : ""}`, colors), balanceLabel);
        }
        const resetSuffix = resetTime
            ? showResetLabel
                ? ` (${t(resetsKey)} ${resetTime})`
                : ` (${resetTime})`
            : "";
        return appendBalance(`${usageLabel} ${critical(`⚠ ${t("status.limitReached")}${resetSuffix}`, colors)}`, balanceLabel);
    }
    const threshold = display?.usageThreshold ?? 0;
    const fiveHour = ctx.usageData.fiveHour;
    const sevenDay = ctx.usageData.sevenDay;
    const effectiveUsage = Math.max(fiveHour ?? 0, sevenDay ?? 0);
    if (effectiveUsage < threshold) {
        return balanceLabel ? `${usageLabel} ${balanceLabel}` : null;
    }
    const sevenDayThreshold = display?.sevenDayThreshold ?? 80;
    if (usageCompact) {
        const fiveHourPart = fiveHour !== null
            ? formatCompactWindowPart("5h", fiveHour, ctx.usageData.fiveHourResetAt, FIVE_HOUR_WINDOW_MS, timeFormat, colors, usageValueMode)
            : null;
        const sevenDayPart = (sevenDay !== null && (fiveHour === null || sevenDay >= sevenDayThreshold))
            ? formatCompactWindowPart("7d", sevenDay, ctx.usageData.sevenDayResetAt, SEVEN_DAY_WINDOW_MS, timeFormat, colors, usageValueMode)
            : null;
        if (fiveHourPart && sevenDayPart) {
            return appendBalance(`${fiveHourPart} | ${sevenDayPart}`, balanceLabel);
        }
        const compactLine = fiveHourPart ?? sevenDayPart;
        return compactLine ? appendBalance(compactLine, balanceLabel) : null;
    }
    const usageBarEnabled = display?.usageBarEnabled ?? true;
    const usageStacked = display?.usageStackedBar ?? false;
    const barWidth = getAdaptiveBarWidth();
    if (fiveHour === null && sevenDay !== null) {
        const weeklyOnlyPart = formatUsageWindowPart({
            label: t("label.weekly"),
            labelKey: "label.weekly",
            percent: sevenDay,
            resetAt: ctx.usageData.sevenDayResetAt,
            windowMs: SEVEN_DAY_WINDOW_MS,
            colors,
            usageBarEnabled,
            usageStacked,
            barWidth,
            timeFormat,
            showResetLabel,
            forceLabel: true,
            alignLabels,
            usageValueMode,
        });
        return appendBalance(`${usageLabel} ${weeklyOnlyPart}`, balanceLabel);
    }
    const fiveHourPart = formatUsageWindowPart({
        label: "5h",
        percent: fiveHour,
        resetAt: ctx.usageData.fiveHourResetAt,
        windowMs: FIVE_HOUR_WINDOW_MS,
        colors,
        usageBarEnabled,
        usageStacked,
        barWidth,
        timeFormat,
        showResetLabel,
        usageValueMode,
    });
    if (sevenDay !== null && sevenDay >= sevenDayThreshold) {
        const sevenDayPart = formatUsageWindowPart({
            label: t("label.weekly"),
            labelKey: "label.weekly",
            percent: sevenDay,
            resetAt: ctx.usageData.sevenDayResetAt,
            windowMs: SEVEN_DAY_WINDOW_MS,
            colors,
            usageBarEnabled,
            usageStacked,
            barWidth,
            timeFormat,
            showResetLabel,
            forceLabel: true,
            alignLabels,
            usageValueMode,
        });
        return appendBalance(`${usageLabel} ${fiveHourPart} | ${sevenDayPart}`, balanceLabel);
    }
    return appendBalance(`${usageLabel} ${fiveHourPart}`, balanceLabel);
}
function appendBalance(line, balanceLabel) {
    return balanceLabel ? `${line} | ${balanceLabel}` : line;
}
function formatCompactWindowPart(windowLabel, percent, resetAt, windowMs, timeFormat, colors, usageValueMode = 'percent') {
    const usageDisplay = formatUsagePercent(percent, colors, usageValueMode);
    const reset = formatWindowTime(resetAt, windowMs, timeFormat);
    const styledLabel = label(`${windowLabel}:`, colors);
    return reset
        ? `${styledLabel} ${usageDisplay} ${label(`(${reset})`, colors)}`
        : `${styledLabel} ${usageDisplay}`;
}
function formatUsagePercent(percent, colors, mode = 'percent') {
    if (percent === null) {
        return label("--", colors);
    }
    const color = getQuotaColor(percent, colors);
    const displayPercent = mode === 'remaining' ? Math.max(0, 100 - percent) : percent;
    return `${color}${displayPercent}%${RESET}`;
}
function formatUsageWindowPart({ label: windowLabel, labelKey, percent, resetAt, windowMs, colors, usageBarEnabled, usageStacked, barWidth, timeFormat = 'relative', showResetLabel, forceLabel = false, alignLabels = false, usageValueMode = 'percent', }) {
    const usageDisplay = formatUsagePercent(percent, colors, usageValueMode);
    const reset = formatWindowTime(resetAt, windowMs, timeFormat);
    const styledLabel = labelKey
        ? progressLabel(labelKey, colors, alignLabels)
        : label(windowLabel, colors);
    const showResetWording = timeFormat !== 'elapsed' && timeFormat !== 'elapsedAndAbsolute';
    const resetsKey = timeFormat === 'absolute' ? "format.resets" : "format.resetsIn";
    const resetSuffix = reset
        ? showResetLabel && showResetWording
            ? `(${t(resetsKey)} ${reset})`
            : `(${reset})`
        : "";
    if (usageBarEnabled) {
        // Stacked "hamburger" bar: top half = quota used, bottom half = time elapsed
        // in the window. Falls back to the flat quota bar when stacked mode is off or
        // the elapsed fraction can't be derived (no reset time).
        const elapsed = usageStacked ? elapsedWindowPercent(resetAt, windowMs) : null;
        const bar = elapsed !== null
            ? stackedBar(percent ?? 0, elapsed, barWidth)
            : quotaBar(percent ?? 0, barWidth, colors);
        const body = resetSuffix
            ? `${bar} ${usageDisplay} ${resetSuffix}`
            : `${bar} ${usageDisplay}`;
        return forceLabel ? `${styledLabel} ${body}` : body;
    }
    return resetSuffix
        ? `${styledLabel} ${usageDisplay} ${resetSuffix}`
        : `${styledLabel} ${usageDisplay}`;
}
function normalizeTimeFormat(value) {
    if (value === 'absolute'
        || value === 'both'
        || value === 'elapsed'
        || value === 'elapsedAndAbsolute') {
        return value;
    }
    return 'relative';
}
function limitResetTimeFormat(timeFormat) {
    if (timeFormat === 'elapsedAndAbsolute') {
        return 'absolute';
    }
    if (timeFormat === 'elapsed') {
        return 'relative';
    }
    return timeFormat;
}
function formatWindowTime(resetAt, windowMs, timeFormat) {
    if (timeFormat === 'elapsed') {
        return formatElapsedWindow(resetAt, windowMs);
    }
    if (timeFormat === 'elapsedAndAbsolute') {
        const elapsed = formatElapsedWindow(resetAt, windowMs);
        const absolute = formatResetTime(resetAt, 'absolute');
        if (elapsed && absolute) {
            return `${elapsed}, ${absolute}`;
        }
        return elapsed || absolute;
    }
    return formatResetTime(resetAt, timeFormat);
}
/**
 * Numeric percentage of a usage window already elapsed (0–100), or null when the
 * reset time is unknown. The window started `windowMs` before it resets. Used as
 * the bottom ("time") half of the stacked usage bar.
 */
function elapsedWindowPercent(resetAt, windowMs) {
    if (!resetAt || !Number.isFinite(windowMs) || windowMs <= 0) {
        return null;
    }
    const windowStart = resetAt.getTime() - windowMs;
    const pct = ((Date.now() - windowStart) / windowMs) * 100;
    return Math.max(0, Math.min(100, pct));
}
function formatElapsedWindow(resetAt, windowMs) {
    const pct = elapsedWindowPercent(resetAt, windowMs);
    if (pct === null) {
        return '';
    }
    return `${Math.round(pct)}% elapsed`;
}
//# sourceMappingURL=usage.js.map