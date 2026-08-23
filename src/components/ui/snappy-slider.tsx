import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A range input that snaps to a set of named stops.
 *
 * The difference from `ui/slider.tsx` (Radix) is the snap model: this one is
 * given the exact values it is allowed to land on, draws a notch at each one,
 * and pulls the thumb to the nearest notch inside a threshold. That makes it
 * right for ordinal scales — "how did the week land, 1 to 7" — where the stops
 * are the vocabulary and the space between them means nothing.
 *
 * It supports an explicitly *unset* state (`value={null}`). A slider that
 * always shows a number cannot be used to ask a question, because the answer
 * is already filled in and every person who skips it silently submits the
 * default. When unset there is no fill and no thumb; the first interaction
 * creates the value.
 */

export interface SnappySliderProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "onChange" | "defaultValue" | "children"
  > {
  /** The stops the thumb may land on. Drawn as notches in the track. */
  values: number[];
  /** Where an uncontrolled slider starts, and where a double-click resets to. */
  defaultValue: number;
  /** Controlled value. `null` means "nothing chosen yet". */
  value?: number | null;
  snapping?: boolean;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  config?: {
    /** How near a stop a drag must land before it is pulled in. */
    snappingThreshold?: number;
    /** Turns the value into the words shown under the thumb. */
    labelFormatter?: (value: number) => string;
  };
  /** Shown above the track. Pass "" to render no header at all. */
  label: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  disabled?: boolean;
  /** The typable number box in the header. */
  showInput?: boolean;
  /** Stands in for the readout while the value is unset. */
  placeholder?: string;
}

/**
 * Never throws. A slider that crashes the page because a parent handed it a
 * NaN is a worse failure than a slider that renders nothing.
 */
function formatNumber(value: number | null, step = 1): string {
  if (value === null || !Number.isFinite(value)) return "";
  const decimals = step.toString().split(".")[1]?.length ?? 0;
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

/** Kills floating-point dust from repeated `Math.round(x / 0.1) * 0.1`. */
function quantise(value: number, step: number): number {
  const decimals = step.toString().split(".")[1]?.length ?? 0;
  return Number((Math.round(value / step) * step).toFixed(decimals + 2));
}

const SnappySlider = React.forwardRef<HTMLDivElement, SnappySliderProps>(
  (
    {
      values,
      defaultValue,
      value,
      snapping = true,
      min: providedMin,
      max: providedMax,
      step,
      onChange,
      config,
      label,
      prefix,
      suffix,
      className,
      disabled = false,
      showInput = true,
      placeholder,
      // Pulled out of the spread on purpose: the name belongs on the element
      // that carries role="slider", not on the wrapper, which has no role for
      // it to name.
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const draggingRef = React.useRef(false);
    const inputId = React.useId();

    const { snappingThreshold = 1, labelFormatter } = config ?? {};

    // `values` is a fresh array on most renders, so everything derived from it
    // is memoised on its contents rather than its identity.
    const valuesKey = values.join(",");
    const stops = React.useMemo(() => {
      const merged = Array.from(new Set([...values, defaultValue]));
      return merged.sort((a, b) => a - b);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valuesKey, defaultValue]);

    const computedStep =
      step ?? (stops.every((v) => Number.isInteger(v)) ? 1 : 0.1);

    const inputMin = providedMin ?? Math.min(...stops);
    const inputMax = providedMax ?? Math.max(...stops);

    const sliderValues = React.useMemo(
      () => stops.filter((v) => v >= inputMin && v <= inputMax),
      [stops, inputMin, inputMax],
    );

    const sliderMin = sliderValues.length ? Math.min(...sliderValues) : inputMin;
    const sliderMax = sliderValues.length ? Math.max(...sliderValues) : inputMax;
    const span = sliderMax - sliderMin || 1;

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState<number | null>(
      defaultValue,
    );
    const currentValue = isControlled ? value : internalValue;
    const hasValue = currentValue !== null && Number.isFinite(currentValue);

    const [inputValue, setInputValue] = React.useState(() =>
      formatNumber(currentValue, computedStep),
    );

    React.useEffect(() => {
      setInputValue(formatNumber(currentValue, computedStep));
    }, [currentValue, computedStep]);

    const isOutOfBounds =
      hasValue && (currentValue! < sliderMin || currentValue! > sliderMax);

    const percentage = hasValue
      ? ((Math.min(Math.max(currentValue!, sliderMin), sliderMax) - sliderMin) /
          span) *
        100
      : 0;

    const commit = React.useCallback(
      (next: number) => {
        if (disabled) return;
        if (!isControlled) setInternalValue(next);
        onChange(next);
      },
      [disabled, isControlled, onChange],
    );

    // ── Pointer ────────────────────────────────────────────────────────────
    // Pointer events unify mouse and touch and, with `touch-action: none` on
    // the track, need no passive-listener escape hatch — so unlike the usual
    // shape of this component there are no document-level listeners to
    // attach, and nothing re-binds on every render.

    const valueFromClientX = React.useCallback(
      (clientX: number): number | null => {
        const track = trackRef.current;
        if (!track) return null;
        const rect = track.getBoundingClientRect();
        if (rect.width === 0) return null;

        const ratio = Math.min(
          1,
          Math.max(0, (clientX - rect.left) / rect.width),
        );
        const raw = ratio * span + sliderMin;

        if (snapping && sliderValues.length > 0) {
          const nearest = sliderValues.reduce((prev, curr) =>
            Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev,
          );
          if (Math.abs(nearest - raw) <= snappingThreshold) return nearest;
        }

        return Math.min(
          sliderMax,
          Math.max(sliderMin, quantise(raw, computedStep)),
        );
      },
      [
        span,
        sliderMin,
        sliderMax,
        sliderValues,
        snapping,
        snappingThreshold,
        computedStep,
      ],
    );

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0) return;
      // preventDefault stops the drag from selecting surrounding text, but it
      // also suppresses the click's default focus — so focus is moved by hand,
      // otherwise arrow keys are dead until the control is tabbed to.
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      draggingRef.current = true;
      const next = valueFromClientX(event.clientX);
      if (next !== null) commit(next);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const next = valueFromClientX(event.clientX);
      if (next !== null && next !== currentValue) commit(next);
    };

    const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    // ── Keyboard ───────────────────────────────────────────────────────────

    const nudge = (direction: 1 | -1, magnitude: number) => {
      // From unset, any arrow key creates the value at the default rather than
      // at an edge — the same place a double-click resets to.
      if (!hasValue) {
        commit(Math.min(sliderMax, Math.max(sliderMin, defaultValue)));
        return;
      }
      if (snapping && sliderValues.length > 1) {
        const index = sliderValues.findIndex((v) => v === currentValue);
        if (index !== -1) {
          const target = Math.min(
            sliderValues.length - 1,
            Math.max(0, index + direction * magnitude),
          );
          commit(sliderValues[target]);
          return;
        }
      }
      const next = currentValue! + direction * computedStep * magnitude;
      commit(Math.min(sliderMax, Math.max(sliderMin, quantise(next, computedStep))));
    };

    const handleTrackKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const magnitude = event.shiftKey ? 2 : 1;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowUp":
          event.preventDefault();
          nudge(1, magnitude);
          break;
        case "ArrowLeft":
        case "ArrowDown":
          event.preventDefault();
          nudge(-1, magnitude);
          break;
        case "PageUp":
          event.preventDefault();
          nudge(1, 3);
          break;
        case "PageDown":
          event.preventDefault();
          nudge(-1, 3);
          break;
        case "Home":
          event.preventDefault();
          commit(sliderMin);
          break;
        case "End":
          event.preventDefault();
          commit(sliderMax);
          break;
        default:
          break;
      }
    };

    // ── Header input ───────────────────────────────────────────────────────

    const handleInputBlur = () => {
      if (inputValue.trim() === "") {
        setInputValue(formatNumber(currentValue, computedStep));
        return;
      }
      const parsed = Number(inputValue);
      if (!Number.isFinite(parsed)) {
        setInputValue(formatNumber(currentValue, computedStep));
        return;
      }
      const clamped = Math.max(inputMin, Math.min(inputMax, parsed));
      const stepped = quantise(clamped, computedStep);
      setInputValue(formatNumber(stepped, computedStep));
      commit(stepped);
    };

    // ── Readout ────────────────────────────────────────────────────────────

    const readout = !hasValue
      ? (placeholder ?? "")
      : isOutOfBounds
        ? currentValue! < sliderMin
          ? `<${formatNumber(sliderMin, computedStep)}`
          : `>${formatNumber(sliderMax, computedStep)}`
        : (labelFormatter?.(currentValue!) ??
          `${prefix ?? ""}${formatNumber(currentValue!, computedStep)}${suffix ?? ""}`);

    // Centring the readout on the thumb pushes it outside the component at
    // either end, so the two extremes align to their edge instead.
    const readoutAlign =
      percentage <= 6
        ? "translateX(0)"
        : percentage >= 94
          ? "translateX(-100%)"
          : "translateX(-50%)";

    const ariaText = hasValue
      ? (labelFormatter?.(currentValue!) ??
        `${prefix ?? ""}${formatNumber(currentValue!, computedStep)}${suffix ?? ""}`)
      : (placeholder ?? "Not set");

    return (
      <div
        ref={ref}
        {...props}
        className={cn(
          "[--mark-slider-gap:0.25rem] [--mark-slider-height:0.5rem] [--mark-slider-marker-width:1px] [--mark-slider-track-height:0.375rem]",
          // pb-8 is not arbitrary: the thumb hangs ~22px below the track centre
          // and the readout sits under it, so the column needs 40px of room
          // below the 8px track box or the text lands on whatever follows.
          "flex flex-col gap-[--mark-slider-gap] pb-8",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        {(label !== "" || showInput) && (
          <div className="mb-0.5 flex items-center justify-between">
            {label !== "" ? (
              <label
                htmlFor={showInput ? inputId : undefined}
                className="text-xs font-medium text-muted-foreground"
              >
                {label}
              </label>
            ) : (
              <span />
            )}
            {showInput && (
              <SnappySliderValue
                id={inputId}
                value={inputValue}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(event) => setInputValue(event.target.value)}
                onBlur={handleInputBlur}
                prefix={prefix}
                suffix={suffix}
                className={cn(isOutOfBounds && "opacity-75")}
              />
            )}
          </div>
        )}

        <div className="relative h-[--mark-slider-height]">
          <div
            ref={trackRef}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={label || ariaLabel}
            aria-valuemin={sliderMin}
            aria-valuemax={sliderMax}
            aria-valuenow={hasValue ? currentValue! : undefined}
            aria-valuetext={ariaText}
            aria-orientation="horizontal"
            aria-disabled={disabled || undefined}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={handleTrackKeyDown}
            onDoubleClick={() => commit(defaultValue)}
            className={cn(
              "absolute inset-0 touch-none select-none rounded-sm",
              // The visible track is 6px tall, which is a fine thing to look at
              // and an impossible thing to hit with a thumb. A transparent
              // pseudo-element pad takes the hit area to ~44px without moving
              // the track or the absolutely-positioned marks inside it. Most of
              // the extra room is taken downwards, into the padding the readout
              // already reserves, so it does not swallow the label above.
              "before:absolute before:-bottom-6 before:-top-3 before:inset-x-0 before:content-['']",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
              !disabled && "cursor-pointer",
            )}
          >
            <div className="absolute top-1/2 h-[--mark-slider-track-height] w-full -translate-y-1/2 overflow-hidden rounded-sm bg-primary/10">
              {hasValue && (
                <div
                  className="absolute top-0 z-[1] h-full bg-primary transition-[width] duration-150 ease-out motion-reduce:transition-none"
                  style={{ width: `${percentage}%` }}
                />
              )}

              {sliderValues.map((mark) => {
                if (mark === 0) return null;
                const markPercentage = ((mark - sliderMin) / span) * 100;
                if (markPercentage < 0 || markPercentage > 100) return null;
                return (
                  <div
                    key={mark}
                    className="absolute top-0 z-[2] h-full w-[--mark-slider-marker-width] -translate-x-[calc(var(--mark-slider-marker-width)/2)] bg-background"
                    style={{ left: `${markPercentage}%` }}
                  />
                );
              })}
            </div>

            {sliderValues.includes(0) && (
              <div
                className="absolute top-1/2 z-20 -translate-y-1/2"
                style={{ left: `${((0 - sliderMin) / span) * 100}%` }}
              >
                <div className="h-3 w-[--mark-slider-marker-width] -translate-x-[calc(var(--mark-slider-marker-width)/2)] bg-destructive" />
              </div>
            )}

            {hasValue ? (
              <div
                className={cn(
                  "absolute top-1/2 z-30 -translate-x-1/2 -translate-y-[35%]",
                  !disabled && "cursor-grab active:cursor-grabbing",
                  isOutOfBounds && "opacity-75",
                )}
                style={{ left: `${percentage}%` }}
              >
                <div
                  className={cn(
                    "mt-2 h-0 w-0 border-[5px] border-transparent border-b-primary",
                    isOutOfBounds && "border-b-primary/20",
                  )}
                />
                <div
                  className={cn(
                    "h-[10px] w-[10px]",
                    isOutOfBounds ? "bg-primary/20" : "bg-primary",
                  )}
                />
              </div>
            ) : null}

            {readout !== "" && (
              <div
                className="pointer-events-none absolute top-[calc(50%+20px)] whitespace-nowrap"
                style={{
                  left: hasValue ? `${percentage}%` : "0%",
                  transform: hasValue ? readoutAlign : "translateX(0)",
                }}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    hasValue ? "text-foreground" : "text-muted-foreground",
                    isOutOfBounds && "opacity-75",
                  )}
                >
                  {readout}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
SnappySlider.displayName = "SnappySlider";

const SnappySliderValue = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    prefix?: string;
    suffix?: string;
  }
>(({ className, prefix, suffix, disabled, ...props }, ref) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={cn(
        "group inline-flex w-20 cursor-text items-center rounded bg-primary/5 px-0.5",
        "focus-within:ring-1 focus-within:ring-ring",
        disabled && "cursor-not-allowed opacity-60",
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {prefix && (
        <span className="shrink-0 select-none text-xs text-muted-foreground">
          {prefix}
        </span>
      )}
      <input
        ref={(node) => {
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
          inputRef.current = node;
        }}
        type="number"
        inputMode="decimal"
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={cn(
          "w-full min-w-0 border-none bg-transparent text-right text-xs tabular-nums text-foreground focus:outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
        {...props}
      />
      {suffix && (
        <span className="shrink-0 select-none text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
});
SnappySliderValue.displayName = "SnappySliderValue";

export { SnappySlider };
