// @ts-nocheck
import * as React from "react";

const LEVELS = ["Low", "Medium", "High", "Extra", "Max", "Ultracode"];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

const mix = (from, to, amount) => from + (to - from) * amount;
const mixColor = (from, to, amount) =>
  `rgb(${Math.round(mix(from[0], to[0], amount))} ${Math.round(
    mix(from[1], to[1], amount),
  )} ${Math.round(mix(from[2], to[2], amount))})`;

let instanceCount = 0;

class ClaudeModelSelector extends HTMLElement {
  static get observedAttributes() {
    return ["value", "open", "disabled"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._uid = `claude-effort-${++instanceCount}`;
    this._value = 0;
    this._levelIndex = 0;
    this._dragging = false;
    this._pointerSamples = [];
    this._springFrame = 0;
    this._canvasFrame = 0;
    this._labelFrame = 0;
    this._labelTimer = 0;
    this._closeTimer = 0;
    this._lastCanvasFrame = 0;
    this._ultraStartedAt = 0;
    this._reveal = 0;
    this._isUltra = false;
    this._reflectingValue = false;
    this._reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --effort-accent: #8c73c9;
          --effort-accent-deep: #a17ec2;
          --effort-text: #5f5b58;
          --effort-text-strong: #3f3b38;
          --effort-muted: #77736f;
          --effort-track: #edeae8;
          --effort-track-fill: #e0dbd6;
          --effort-progress: 0;
          --effort-thumb-w: 1.5rem;
          --effort-thumb-h: 1.625rem;
          --effort-track-pad: 1px;
          --effort-track-radius: 0.625rem;
          --effort-surface: #ffffff;
          --effort-outline: rgba(76, 70, 65, 0.12);
          --effort-blue: #2788d6;
          --effort-width: min(22.5rem, calc(100vw - 2rem));
          --ease-decay: cubic-bezier(0.2, 0, 0, 1);
          display: block;
          width: var(--effort-width);
          max-width: 100%;
          color: var(--effort-text);
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 1rem;
          line-height: 1.4;
          font-synthesis: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        *, *::before, *::after {
          box-sizing: border-box;
        }

        button, input {
          font: inherit;
        }

        .shell {
          position: relative;
          width: 100%;
          min-height: 2.5rem;
        }

        .panel {
          position: absolute;
          z-index: 4;
          right: 0;
          bottom: 3.25rem;
          width: 100%;
          padding: 1rem 1.125rem;
          border: 1px solid var(--effort-outline);
          border-radius: 1rem;
          background: var(--effort-surface);
          box-shadow:
            0 1px 2px rgba(62, 56, 50, 0.05),
            0 4px 10px rgba(62, 56, 50, 0.04),
            0 12px 28px rgba(62, 56, 50, 0.06);
          opacity: 1;
          transform: translateY(0);
          transition-property: opacity, transform;
          transition-duration: 120ms;
          transition-timing-function: ease-in;
        }

        :host(:not([open]):not([data-closing])) .panel {
          display: none;
        }

        :host([data-closing]) .panel {
          pointer-events: none;
          opacity: 0;
          transform: translateY(2px);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 2rem;
          gap: 0.75rem;
        }

        .title {
          display: flex;
          align-items: baseline;
          min-width: 0;
          color: var(--effort-text);
          font-size: 1rem;
          font-weight: 500;
          line-height: 1.3;
          letter-spacing: -0.01em;
          text-wrap: balance;
        }

        .level-stage {
          position: relative;
          display: inline-block;
          height: 1.3em;
          margin-left: 0.375rem;
          color: var(--effort-text-strong);
          line-height: inherit;
          vertical-align: baseline;
        }

        .level-stage::after {
          content: "Ultracode";
          visibility: hidden;
          white-space: nowrap;
        }

        .level-stage > span {
          position: absolute;
          top: 0;
          left: 0;
          line-height: inherit;
          white-space: nowrap;
          transform-origin: left center;
        }

        .level-current,
        .level-outgoing {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
          transition-property: opacity, transform, filter, color;
          transition-duration: 180ms;
          transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
        }

        .level-current {
          transition-delay: 24ms;
        }

        .level-current.is-preparing {
          opacity: 0;
          transform: translateY(var(--label-enter-y, 3px));
          filter: blur(2px);
          transition-duration: 0ms;
          transition-delay: 0ms;
        }

        .level-outgoing {
          pointer-events: none;
          transition-delay: 0ms;
        }

        .level-outgoing.is-exiting {
          opacity: 0;
          transform: translateY(var(--label-exit-y, -3px));
          filter: blur(2px);
        }

        :host([data-ultra]) .level-current {
          color: var(--effort-accent);
        }

        .help-wrap {
          position: relative;
          flex: 0 0 auto;
        }

        .help-button {
          position: relative;
          display: grid;
          width: 2.75rem;
          height: 2.75rem;
          margin: -0.375rem;
          padding: 0.375rem;
          place-items: center;
          border: 0;
          border-radius: 0.5rem;
          background: transparent;
          color: var(--effort-muted);
          cursor: help;
          transition-property: color, background-color, scale;
          transition-duration: 150ms;
          transition-timing-function: ease-out;
        }

        .help-button:hover {
          color: #74706d;
          background: rgba(82, 76, 70, 0.055);
        }

        .help-button:active {
          scale: 0.96;
        }

        .help-button:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--effort-accent) 35%, transparent);
          outline-offset: 2px;
        }

        .help-button svg {
          width: 1rem;
          height: 1rem;
        }

        .tooltip {
          position: absolute;
          z-index: 8;
          top: calc(100% + 0.375rem);
          right: 0;
          width: min(16rem, calc(100vw - 2rem));
          padding: 0.5rem 0.625rem;
          border: 1px solid rgba(76, 70, 65, 0.1);
          border-radius: 0.5rem;
          background: #34312f;
          box-shadow:
            0 2px 5px rgba(35, 31, 29, 0.12),
            0 8px 18px rgba(35, 31, 29, 0.12);
          color: #fff;
          font-size: 0.8125rem;
          font-weight: 450;
          line-height: 1.45;
          text-wrap: pretty;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-2px);
          transition-property: opacity, transform, visibility;
          transition-duration: 120ms;
          transition-timing-function: ease-in;
        }

        .help-wrap:hover .tooltip,
        .help-button:focus-visible + .tooltip,
        .help-wrap[data-tip-open] .tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          transition-timing-function: ease-out;
        }

        .axis {
          display: flex;
          justify-content: space-between;
          margin-top: 1.25rem;
          color: var(--effort-muted);
          font-size: 0.875rem;
          font-weight: 450;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }

        .track-shell {
          position: relative;
          height: 2.75rem;
          margin-top: 0.75rem;
        }

        .track {
          position: absolute;
          inset: 0.5rem 0;
          overflow: hidden;
          border-radius: var(--effort-track-radius);
          background-color: var(--effort-track);
          box-shadow: inset 0 1px 1px rgba(70, 64, 59, 0.035);
        }

        .track-fill {
          position: absolute;
          z-index: 0;
          top: 0;
          bottom: 0;
          left: var(--effort-track-pad);
          width: calc(
            (100% - (var(--effort-track-pad) * 2) - var(--effort-thumb-w))
              * var(--effort-progress, 0)
            + (var(--effort-thumb-w) * 0.5)
          );
          border-radius: calc(var(--effort-track-radius) - 1px) 0 0 calc(var(--effort-track-radius) - 1px);
          background: var(--effort-track-fill);
          pointer-events: none;
          transition-property: opacity;
          transition-duration: 200ms;
          transition-timing-function: var(--ease-decay);
        }

        :host([data-ultra]) .track-fill {
          opacity: 0;
        }

        .track::before {
          content: "";
          position: absolute;
          z-index: 0;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #eeebe9 0%,
            #ece9e7 18%,
            #e2dce3 32%,
            #d9d0df 48%,
            #d0c1da 68%,
            #cdbcd9 82%,
            #cbbad8 100%
          );
          opacity: 0;
          transition-property: opacity;
          transition-duration: 340ms;
          transition-timing-function: ease-in;
        }

        :host([data-ultra]) .track::before {
          opacity: 1;
        }

        .ultra-fallback,
        .pixel-field {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition-property: opacity;
          transition-duration: 200ms;
          transition-timing-function: var(--ease-decay);
        }

        .ultra-fallback {
          background: linear-gradient(
            90deg,
            #eeebe9 0%,
            #ece9e7 18%,
            #e2dce3 32%,
            #d5cadc 48%,
            #c8b5d4 68%,
            #bda6cc 82%,
            #b59bc6 100%
          );
        }

        :host([data-ultra][data-pixels-ready]) .pixel-field {
          opacity: 1;
        }

        .ticks {
          position: absolute;
          z-index: 1;
          inset: 0 calc(var(--effort-track-pad) + var(--effort-thumb-w) * 0.5);
          display: flex;
          align-items: center;
          justify-content: space-between;
          pointer-events: none;
        }

        .tick {
          width: 0.25rem;
          height: 0.25rem;
          border-radius: 999px;
          background: #b6b2af;
          opacity: 0.82;
          transition-property: opacity;
          transition-duration: 180ms;
          transition-timing-function: var(--ease-decay);
        }

        .tick:last-child {
          background: var(--effort-accent);
          opacity: 1;
        }

        :host([data-ultra]) .tick {
          opacity: 0;
        }

        .range {
          position: absolute;
          z-index: 3;
          inset: 0 var(--effort-track-pad);
          width: calc(100% - var(--effort-track-pad) * 2);
          height: 100%;
          margin: 0;
          appearance: none;
          -webkit-appearance: none;
          border: 0;
          outline: 0;
          background: transparent;
          cursor: ew-resize;
          touch-action: none;
        }

        .range::-webkit-slider-runnable-track {
          height: var(--effort-thumb-h);
          border: 0;
          background: transparent;
        }

        .range::-webkit-slider-thumb {
          width: var(--effort-thumb-w);
          height: var(--effort-thumb-h);
          margin-top: 0;
          appearance: none;
          -webkit-appearance: none;
          border: 1px solid rgba(76, 70, 65, 0.13);
          border-radius: 0.5rem;
          background: #fff;
          box-shadow:
            0 1px 2px rgba(62, 56, 50, 0.08),
            0 4px 10px rgba(62, 56, 50, 0.055);
          cursor: ew-resize;
          transition-property: transform;
          transition-duration: 150ms;
          transition-timing-function: ease-out;
        }

        .range::-moz-range-track {
          height: var(--effort-thumb-h);
          border: 0;
          background: transparent;
        }

        .range::-moz-range-progress {
          background: transparent;
        }

        .range::-moz-range-thumb {
          width: var(--effort-thumb-w);
          height: var(--effort-thumb-h);
          border: 1px solid rgba(76, 70, 65, 0.13);
          border-radius: 0.5rem;
          background: #fff;
          box-shadow:
            0 1px 2px rgba(62, 56, 50, 0.08),
            0 4px 10px rgba(62, 56, 50, 0.055);
          cursor: ew-resize;
          transition-property: transform;
          transition-duration: 150ms;
          transition-timing-function: ease-out;
        }

        .range:active::-webkit-slider-thumb {
          transform: scale(0.96);
        }

        .range:active::-moz-range-thumb {
          transform: scale(0.96);
        }

        .range:focus-visible::-webkit-slider-thumb {
          box-shadow:
            0 0 0 3px color-mix(in srgb, var(--effort-accent) 30%, transparent),
            0 1px 2px rgba(62, 56, 50, 0.08),
            0 4px 10px rgba(62, 56, 50, 0.055);
        }

        .range:focus-visible::-moz-range-thumb {
          box-shadow:
            0 0 0 3px color-mix(in srgb, var(--effort-accent) 30%, transparent),
            0 1px 2px rgba(62, 56, 50, 0.08),
            0 4px 10px rgba(62, 56, 50, 0.055);
        }

        :host([disabled]) {
          opacity: 0.58;
        }

        :host([disabled]) .range,
        :host([disabled]) button {
          cursor: not-allowed;
        }

        .anchor-row {
          position: relative;
          z-index: 2;
          display: flex;
          min-height: 2.5rem;
          align-items: center;
          justify-content: center;
          padding: 0 2px;
        }

        .trigger {
          width: max-content;
          min-width: 0;
          min-height: 2.75rem;
          padding: 0.375rem 0.75rem;
          border: 0;
          border-radius: 0.5rem;
          background: #efefed;
          box-shadow:
            inset 0 0 0 1px rgba(76, 70, 65, 0.045),
            0 1px 2px rgba(62, 56, 50, 0.035);
          color: var(--effort-text-strong);
          font-size: 0.875rem;
          font-weight: 500;
          line-height: 1.25;
          white-space: nowrap;
          cursor: pointer;
          transition-property: background-color, scale;
          transition-duration: 150ms;
          transition-timing-function: ease-out;
        }

        .trigger:hover {
          background: #e7e6e3;
        }

        .trigger:active {
          scale: 0.96;
        }

        .trigger:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--effort-accent) 32%, transparent);
          outline-offset: 2px;
        }

        .trigger-value {
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 479px) {
          :host {
            --effort-width: calc(100vw - 1.5rem);
          }

          .panel {
            bottom: 3rem;
            padding: 0.875rem 1rem;
            border-radius: 0.875rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .level-current,
          .level-outgoing,
          .panel,
          .track::before,
          .track-fill,
          .range::-webkit-slider-thumb,
          .range::-moz-range-thumb,
          .trigger,
          .help-button,
          .tooltip {
            transition-duration: 0.001ms;
          }

          :host([data-ultra]) .ultra-fallback {
            opacity: 1;
          }

          .pixel-field {
            display: none;
          }
        }
      </style>

      <div class="shell">
        <div class="anchor-row">
          <button
            class="trigger"
            type="button"
            aria-controls="${this._uid}-panel"
            aria-expanded="false"
            aria-label="Effort level: Low"
          >
            <span class="trigger-value">Low</span>
          </button>
        </div>

        <section class="panel" id="${this._uid}-panel" aria-label="Effort settings">
          <div class="header">
            <div class="title">
              <span>Effort</span>
              <span class="level-stage" aria-live="polite" aria-atomic="true">
                <span class="level-outgoing" aria-hidden="true"></span>
                <span class="level-current">Low</span>
              </span>
            </div>
            <div class="help-wrap">
              <button class="help-button" type="button" aria-label="About effort levels" aria-describedby="${this._uid}-tooltip">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                  <path d="M9.8 9.2a2.35 2.35 0 0 1 4.55.82c0 1.8-2.35 2.05-2.35 3.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M12 17.2h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
              </button>
              <div class="tooltip" id="${this._uid}-tooltip" role="tooltip">
                Higher effort spends more time reasoning. Ultracode adds the deepest analysis and code pass.
              </div>
            </div>
          </div>

          <div class="axis" aria-hidden="true">
            <span>Faster</span>
            <span>Smarter</span>
          </div>

          <div class="track-shell">
            <div class="track" aria-hidden="true">
              <div class="track-fill"></div>
              <div class="ultra-fallback"></div>
              <canvas class="pixel-field"></canvas>
              <div class="ticks">
                ${LEVELS.map(() => '<span class="tick"></span>').join("")}
              </div>
            </div>
            <input
              class="range"
              type="range"
              min="0"
              max="5"
              step="0.001"
              value="0"
              aria-label="Effort level"
              aria-valuemin="0"
              aria-valuemax="5"
              aria-valuetext="Low"
            />
          </div>
        </section>
      </div>
    `;

    this._panel = this.shadowRoot.querySelector(".panel");
    this._input = this.shadowRoot.querySelector(".range");
    this._track = this.shadowRoot.querySelector(".track");
    this._canvas = this.shadowRoot.querySelector(".pixel-field");
    this._currentLabel = this.shadowRoot.querySelector(".level-current");
    this._outgoingLabel = this.shadowRoot.querySelector(".level-outgoing");
    this._trigger = this.shadowRoot.querySelector(".trigger");
    this._triggerValue = this.shadowRoot.querySelector(".trigger-value");
    this._helpWrap = this.shadowRoot.querySelector(".help-wrap");
    this._helpButton = this.shadowRoot.querySelector(".help-button");

    this._onDocumentPointerDown = this._onDocumentPointerDown.bind(this);
    this._onReducedMotionChange = this._onReducedMotionChange.bind(this);
  }

  connectedCallback() {
    this._events?.abort();
    this._events = new AbortController();
    const { signal } = this._events;
    const initialValue = Number.parseFloat(this.getAttribute("value") ?? "0");
    this._setValue(Number.isFinite(initialValue) ? initialValue : 0, {
      animateLabel: false,
      reflect: false,
    });
    this._syncOpenState();
    this._syncDisabledState();

    this._input.addEventListener("pointerdown", (event) => this._onPointerDown(event), { signal });
    this._input.addEventListener("pointerup", (event) => this._onPointerUp(event), { signal });
    this._input.addEventListener("pointercancel", (event) => this._onPointerUp(event), { signal });
    this._input.addEventListener("input", () => this._onInput(), { signal });
    this._input.addEventListener("keydown", (event) => this._onKeyDown(event), { signal });
    this._trigger.addEventListener("click", () => this.toggle(), { signal });
    this._helpButton.addEventListener("click", () => {
      if (this.disabled) return;
      this._helpWrap.toggleAttribute("data-tip-open");
    }, { signal });
    this.shadowRoot.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.open) {
        event.preventDefault();
        this.close();
        this._trigger.focus();
      }
    }, { signal });

    document.addEventListener("pointerdown", this._onDocumentPointerDown, true);
    this._reducedMotion.addEventListener("change", this._onReducedMotionChange);
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this._track);
    this._resizeCanvas();
    if (this._isUltra) this._ensureCanvasLoop();
  }

  disconnectedCallback() {
    this._events?.abort();
    document.removeEventListener("pointerdown", this._onDocumentPointerDown, true);
    this._reducedMotion.removeEventListener("change", this._onReducedMotionChange);
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._springFrame);
    cancelAnimationFrame(this._canvasFrame);
    cancelAnimationFrame(this._labelFrame);
    clearTimeout(this._labelTimer);
    clearTimeout(this._closeTimer);
    this._springFrame = 0;
    this._canvasFrame = 0;
    this._labelFrame = 0;
    this._labelTimer = 0;
    this._closeTimer = 0;
    this._lastCanvasFrame = 0;
    this._dragging = false;
    this._pointerSamples = [];
    this.removeAttribute("data-closing");
    this._panel.hidden = !this.open;
    this._currentLabel.classList.remove("is-preparing");
    this._outgoingLabel.classList.remove("is-exiting");
    this._outgoingLabel.textContent = "";
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "value" && !this._reflectingValue && this._input) {
      const next = Number.parseFloat(newValue ?? "0");
      this._setValue(Number.isFinite(next) ? next : 0, {
        animateLabel: this.isConnected,
        reflect: false,
      });
    }
    if (name === "open" && this._trigger) this._syncOpenState();
    if (name === "disabled" && this._input) this._syncDisabledState();
  }

  get value() {
    return this._value;
  }

  set value(nextValue) {
    this._setValue(Number(nextValue), { animateLabel: true, reflect: true });
  }

  get level() {
    return LEVELS[this._levelIndex];
  }

  get open() {
    return this.hasAttribute("open");
  }

  set open(nextOpen) {
    nextOpen ? this.openPanel() : this.close();
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(nextDisabled) {
    this.toggleAttribute("disabled", Boolean(nextDisabled));
  }

  openPanel() {
    if (this.disabled) return;
    clearTimeout(this._closeTimer);
    this._closeTimer = 0;
    this.removeAttribute("data-closing");
    if (!this.open) this.setAttribute("open", "");
    this._panel.hidden = false;
    this._resizeCanvas();
  }

  close() {
    if (!this.open && !this.hasAttribute("data-closing")) return;
    clearTimeout(this._closeTimer);
    this.setAttribute("data-closing", "");
    this.removeAttribute("open");
    this._closeTimer = window.setTimeout(() => {
      this._closeTimer = 0;
      this._panel.hidden = true;
      this.removeAttribute("data-closing");
      this._helpWrap.removeAttribute("data-tip-open");
    }, this._reducedMotion.matches ? 0 : 120);
  }

  toggle() {
    if (this.disabled) return;
    this.open ? this.close() : this.openPanel();
  }

  _syncOpenState() {
    const isOpen = this.open;
    this._trigger.setAttribute("aria-expanded", String(isOpen));
    this._panel.inert = !isOpen;
    if (isOpen) {
      this._panel.hidden = false;
      requestAnimationFrame(() => this._resizeCanvas());
    } else if (!this.hasAttribute("data-closing")) {
      this._panel.hidden = true;
    }
  }

  _syncDisabledState() {
    const isDisabled = this.disabled;
    this._input.disabled = isDisabled;
    this._trigger.disabled = isDisabled;
    this._helpButton.disabled = isDisabled;
  }

  _onDocumentPointerDown(event) {
    if (this.open && !event.composedPath().includes(this)) this.close();
  }

  _onPointerDown() {
    if (this.disabled) return;
    cancelAnimationFrame(this._springFrame);
    this._dragging = true;
    this._pointerSamples = [{ time: performance.now(), value: this._value }];
  }

  _onPointerUp() {
    if (!this._dragging) return;
    this._dragging = false;
    this._snapToNearest();
  }

  _onInput() {
    let nextValue = Number.parseFloat(this._input.value);
    if (this._dragging) {
      nextValue = this._applyMagnet(nextValue);
      this._input.value = String(nextValue);
      const now = performance.now();
      this._pointerSamples.push({ time: now, value: nextValue });
      this._pointerSamples = this._pointerSamples.filter((sample) => now - sample.time < 90).slice(-5);
    }
    this._setValue(nextValue, { animateLabel: true, reflect: false });
    this._emit("input");
  }

  _applyMagnet(value) {
    const nearest = Math.round(value);
    const delta = value - nearest;
    const distance = Math.abs(delta);
    const radius = 0.5;
    if (distance < 0.001 || distance > radius) return value;
    const t = 1 - distance / radius;
    const strength = 0.68 + 0.42 * t;
    return value - delta * strength * t * t;
  }

  _onKeyDown(event) {
    if (this.disabled) return;
    const keyTargets = {
      ArrowLeft: this._levelIndex - 1,
      ArrowDown: this._levelIndex - 1,
      ArrowRight: this._levelIndex + 1,
      ArrowUp: this._levelIndex + 1,
      Home: 0,
      End: LEVELS.length - 1,
      PageDown: this._levelIndex - 1,
      PageUp: this._levelIndex + 1,
    };
    if (!(event.key in keyTargets)) return;
    event.preventDefault();
    const target = clamp(keyTargets[event.key], 0, LEVELS.length - 1);
    this._setValue(target, { animateLabel: false, reflect: true });
    this._emit("input");
    this._emit("change");
  }

  _snapToNearest() {
    const target = Math.round(this._value);
    if (this._reducedMotion.matches || Math.abs(target - this._value) < 0.001) {
      this._setValue(target, { animateLabel: false, reflect: true });
      this._emit("change");
      return;
    }

    let initialVelocity = 0;
    if (this._pointerSamples.length >= 2) {
      const first = this._pointerSamples[0];
      const last = this._pointerSamples.at(-1);
      const elapsed = Math.max((last.time - first.time) / 1000, 0.016);
      initialVelocity = clamp((last.value - first.value) / elapsed, -8, 8);
    }
    this._springTo(target, initialVelocity);
  }

  _springTo(target, initialVelocity) {
    cancelAnimationFrame(this._springFrame);
    let position = this._value;
    let velocity = initialVelocity;
    let previousTime = performance.now();
    const stiffness = 920;
    const damping = 40;

    const step = (time) => {
      const delta = Math.min((time - previousTime) / 1000, 0.032);
      previousTime = time;
      const acceleration = -stiffness * (position - target) - damping * velocity;
      velocity += acceleration * delta;
      position = clamp(position + velocity * delta, 0, LEVELS.length - 1);
      this._setValue(position, { animateLabel: true, reflect: false });

      if (Math.abs(position - target) < 0.001 && Math.abs(velocity) < 0.01) {
        this._springFrame = 0;
        this._setValue(target, { animateLabel: false, reflect: true });
        this._emit("change");
        return;
      }
      this._springFrame = requestAnimationFrame(step);
    };
    this._springFrame = requestAnimationFrame(step);
  }

  _setValue(nextValue, { animateLabel = true, reflect = false } = {}) {
    const safeValue = clamp(Number.isFinite(nextValue) ? nextValue : 0, 0, LEVELS.length - 1);
    const nextIndex = clamp(Math.round(safeValue), 0, LEVELS.length - 1);
    const previousIndex = this._levelIndex;
    this._value = safeValue;
    this._input.value = String(safeValue);
    this._input.setAttribute("aria-valuetext", LEVELS[nextIndex]);
    this.style.setProperty(
      "--effort-progress",
      String(safeValue / (LEVELS.length - 1)),
    );

    if (nextIndex !== previousIndex) {
      this._levelIndex = nextIndex;
      this._swapLabel(LEVELS[nextIndex], nextIndex > previousIndex, animateLabel);
    } else if (!this._currentLabel.textContent) {
      this._currentLabel.textContent = LEVELS[nextIndex];
    }

    this._triggerValue.textContent = LEVELS[nextIndex];
    this._trigger.setAttribute("aria-label", `Effort level: ${LEVELS[nextIndex]}`);
    this._setUltra(nextIndex === LEVELS.length - 1);

    if (reflect) {
      this._reflectingValue = true;
      this.setAttribute("value", String(Number(safeValue.toFixed(3))));
      this._reflectingValue = false;
    }
  }

  _swapLabel(nextLabel, forward, animate) {
    cancelAnimationFrame(this._labelFrame);
    this._labelFrame = 0;
    clearTimeout(this._labelTimer);
    const shouldAnimate = animate && !this._reducedMotion.matches && this.isConnected;
    const previousLabel = this._currentLabel.textContent;
    this._currentLabel.classList.remove("is-preparing");
    this._outgoingLabel.classList.remove("is-exiting");

    if (!shouldAnimate) {
      this._outgoingLabel.textContent = "";
      this._currentLabel.textContent = nextLabel;
      return;
    }

    this._outgoingLabel.textContent = previousLabel;
    this._currentLabel.textContent = nextLabel;
    const enterY = forward ? "3px" : "-3px";
    const exitY = forward ? "-3px" : "3px";
    this._currentLabel.style.setProperty("--label-enter-y", enterY);
    this._outgoingLabel.style.setProperty("--label-exit-y", exitY);
    this._currentLabel.classList.add("is-preparing");

        this._currentLabel.getBoundingClientRect();

    this._labelFrame = requestAnimationFrame(() => {
      this._labelFrame = 0;
      this._currentLabel.classList.remove("is-preparing");
      this._outgoingLabel.classList.add("is-exiting");
    });

    this._labelTimer = window.setTimeout(() => {
      this._outgoingLabel.textContent = "";
      this._outgoingLabel.classList.remove("is-exiting");
    }, 200);
  }

  _setUltra(isUltra) {
    if (isUltra === this._isUltra) return;
    this._isUltra = isUltra;
    this.toggleAttribute("data-ultra", isUltra);
    if (isUltra) {
      this.setAttribute("data-pixels-ready", "");
      this._reveal = this._reducedMotion.matches ? 1 : 0;
      this._ultraStartedAt = performance.now();
      this._ensureCanvasLoop();
    } else {
      this.removeAttribute("data-pixels-ready");
      this._reveal = 0;
      this._drawPixelField(performance.now());
    }
  }

  _onReducedMotionChange() {
    if (this._isUltra) {
      this.setAttribute("data-pixels-ready", "");
      this._reveal = this._reducedMotion.matches ? 1 : 0;
      this._ultraStartedAt = performance.now();
      this._ensureCanvasLoop();
    }
  }

  _resizeCanvas() {
    const rect = this._track.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    if (this._canvas.width !== width || this._canvas.height !== height) {
      this._canvas.width = width;
      this._canvas.height = height;
      this._canvas.style.width = `${rect.width}px`;
      this._canvas.style.height = `${rect.height}px`;
      this._drawPixelField(performance.now());
    }
  }

  _ensureCanvasLoop() {
    if (this._canvasFrame || !this._isUltra || this._reducedMotion.matches) {
      this._drawPixelField(performance.now());
      return;
    }

    const frame = (time) => {
      if (!this._isUltra || !this.isConnected) {
        this._canvasFrame = 0;
        return;
      }
      if (time - this._lastCanvasFrame >= 33) {
        this._lastCanvasFrame = time;
        this._reveal = smoothstep(0, 1, (time - this._ultraStartedAt) / 1000);
        this._drawPixelField(time);
      }
      this._canvasFrame = requestAnimationFrame(frame);
    };
    this._canvasFrame = requestAnimationFrame(frame);
  }

  _drawPixelField(time) {
    const context = this._canvas.getContext("2d");
    if (!context || !this._canvas.width || !this._canvas.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = this._canvas.width / ratio;
    const height = this._canvas.height / ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!this._isUltra) return;

    const reveal = this._reducedMotion.matches ? 1 : this._reveal;
    const frontier = 1 - reveal;
    const cell = width < 280 ? 5 : 6;
    const gap = 1.1;
    const columns = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);
    const elapsed = Math.max(0, time - this._ultraStartedAt);

    // Ultracode track palette (share-weighted).
    const leftColor = [210, 206, 214];
    const deepViolet = [156, 120, 192];
    const deepMid = [156, 132, 192];
    const midPurple = [168, 144, 204];
    const softMid = [168, 156, 204];
    const softLilac = [180, 168, 204];
    const paleCool = [192, 180, 204];
    const highlightColor = [216, 204, 228];
    const peakColor = [232, 224, 242];
        const tones = [
      deepViolet, deepViolet, deepMid, deepMid,
      midPurple, midPurple, midPurple,
      softMid, softMid, softLilac, paleCool,
    ];

        const flowDuration = 4000;
    const rawFlow = elapsed / flowDuration;
    const flowCycle = Math.floor(rawFlow);
    const easedFlow = flowCycle + smoothstep(0, 1, rawFlow - flowCycle);

    context.save();
    context.beginPath();
    context.roundRect(0, 0, width, height, 10);
    context.clip();

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = column * cell;
        const y = row * cell;
        const normalizedX = (x + cell * 0.5) / width;
        const revealAlpha = smoothstep(frontier - 0.1, frontier + 0.07, normalizedX);
        if (revealAlpha <= 0.002) continue;

                const purpleAmount = smoothstep(0.1, 0.88, normalizedX);
        const fieldIntensity = smoothstep(0.04, 0.38, normalizedX);
        const depthBias = smoothstep(0.35, 0.95, normalizedX);

        const baseHash = Math.abs(Math.sin(column * 12.9898 + row * 78.233) * 43758.5453) % 1;
        const tempoHash = Math.abs(Math.sin(column * 7.13 + row * 19.41) * 19341.731) % 1;
        const phaseHash = Math.abs(Math.sin(column * 31.17 + row * 11.93) * 28437.123) % 1;
        const chromaHash = Math.abs(Math.sin(column * 9.47 + row * 67.13) * 15823.917) % 1;

        const period = 500 + tempoHash * 1500;
        const localTime = elapsed + phaseHash * period;
        const cycle = Math.floor(localTime / period);
        const cycleProgress = (localTime % period) / period;
        const cycleHash = Math.abs(
          Math.sin(column * 17.17 + row * 41.73 + cycle * 13.11) * 24634.6345,
        ) % 1;
        const widthHash = Math.abs(
          Math.sin(column * 5.37 + row * 29.11 + cycle * 7.43) * 17391.443,
        ) % 1;

                const pulseCenter = 0.2 + cycleHash * 0.55;
        const pulseWidth = 0.09 + widthHash * 0.08;
        const pulseDistance = (cycleProgress - pulseCenter) / pulseWidth;
        const pulseEnvelope = Math.exp(-pulseDistance * pulseDistance * 1.45);
        const activeCycle = cycleHash > 0.12 ? 1 : 0.26;
        const irregularFlicker = pulseEnvelope * activeCycle;

                const flowCoordinate = (normalizedX + easedFlow) * 9;
        const flowIndex = Math.floor(flowCoordinate);
        const flowProgress = smoothstep(0, 1, flowCoordinate - flowIndex);
        const flowHashA = Math.abs(
          Math.sin(flowIndex * 18.31 + row * 37.17) * 19283.173,
        ) % 1;
        const flowHashB = Math.abs(
          Math.sin((flowIndex + 1) * 18.31 + row * 37.17) * 19283.173,
        ) % 1;
        const clusterGate = smoothstep(0.46, 0.84, mix(flowHashA, flowHashB, flowProgress));
        const wavePhase =
          (normalizedX + easedFlow + row * 0.06 + baseHash * 0.02) * Math.PI * 2;
        const directionalWave = Math.pow(0.5 + 0.5 * Math.cos(wavePhase), 5);
        const directionalFlow = Math.max(clusterGate, directionalWave * 0.62);
        const flowingFlicker = Math.max(
          irregularFlicker * (0.48 + directionalFlow * 0.58),
          directionalFlow * (0.38 + baseHash * 0.28),
        );

        const revealGlow = reveal < 0.995
          ? Math.exp(-((normalizedX - frontier) ** 2) / 0.012)
            * (1 - smoothstep(0.7, 1, reveal))
          : 0;
        const lightAmount = Math.max(
          flowingFlicker,
          revealGlow * (0.4 + baseHash * 0.4),
        );

                const peakHighlight =
          lightAmount > 0.4
          && irregularFlicker > 0.16
          && cycleHash > 0.26
          && clusterGate > 0.04;
        const hottestHighlight =
          lightAmount > 0.68
          && irregularFlicker > 0.3
          && cycleHash > 0.48
          && clusterGate > 0.12;
        const highlightAmount = peakHighlight
          ? 0.97
          : clamp(lightAmount * (0.44 + cycleHash * 0.3), 0, 0.64);

                const toneDrift =
          baseHash * 0.28
          + depthBias * 0.28
          + cycleProgress * 0.38
          + easedFlow * 0.18
          + cycleHash * 0.2
          + Math.sin(elapsed * 0.00135 + phaseHash * Math.PI * 2) * 0.14;
        const tonePosition = ((toneDrift % 1) + 1) % 1 * tones.length;
        const toneIndex = Math.floor(tonePosition);
        const toneMix = tonePosition - toneIndex;
        const toneA = tones[toneIndex];
        const toneB = tones[(toneIndex + 1) % tones.length];
        const cellTone = [
          mix(toneA[0], toneB[0], toneMix),
          mix(toneA[1], toneB[1], toneMix),
          mix(toneA[2], toneB[2], toneMix),
        ];

                const chromaNudge = (chromaHash - 0.5) * 10 + depthBias * 12;
        const variedPurple = [
          clamp(cellTone[0] + chromaNudge * 0.35 - depthBias * 8, 140, 196),
          clamp(cellTone[1] - depthBias * 16 + (baseHash - 0.5) * 8, 104, 168),
          clamp(cellTone[2] + depthBias * 6 + (cycleHash - 0.5) * 6, 182, 216),
        ];
        const baseColor = [
          mix(leftColor[0], variedPurple[0], purpleAmount),
          mix(leftColor[1], variedPurple[1], purpleAmount),
          mix(leftColor[2], variedPurple[2], purpleAmount),
        ];
        const color = hottestHighlight
          ? mixColor(baseColor, peakColor, 0.95)
          : mixColor(baseColor, highlightColor, highlightAmount);

        const baseOpacity = 0.7 + baseHash * 0.2;
        context.globalAlpha = peakHighlight || hottestHighlight
          ? revealAlpha * fieldIntensity
          : revealAlpha * fieldIntensity * clamp(baseOpacity + flowingFlicker * 0.12, 0, 1);
        context.fillStyle = color;
        context.fillRect(x + gap * 0.5, y + gap * 0.5, cell - gap, cell - gap);
      }
    }

    context.restore();
    context.globalAlpha = 1;
  }

  _emit(type) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail: {
          index: this._levelIndex,
          level: LEVELS[this._levelIndex],
          value: this._value,
        },
      }),
    );
  }
}

if (typeof customElements !== "undefined" && !customElements.get("claude-model-selector")) {
  customElements.define("claude-model-selector", ClaudeModelSelector);
}

export type ClaudeModelSelectorProps = {
  value?: number;
  open?: boolean;
  disabled?: boolean;
  className?: string;
  onLevelChange?: (level: string, index: number) => void;
};

const ClaudeModelSelectorComponent = React.forwardRef<
  HTMLElement,
  ClaudeModelSelectorProps
>(function ClaudeModelSelectorComponent(
  { value = 0, open = false, disabled = false, className, onLevelChange },
  forwardedRef,
) {
  const localRef = React.useRef<HTMLElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    [forwardedRef],
  );

  React.useEffect(() => {
    const node = localRef.current;
    if (!node || !onLevelChange) return;
    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) onLevelChange(detail.level, detail.index);
    };
    node.addEventListener("change", handleChange);
    return () => node.removeEventListener("change", handleChange);
  }, [onLevelChange]);

  return React.createElement("claude-model-selector", {
    ref: setRefs,
    className,
    value: String(value),
    open: open ? true : undefined,
    disabled: disabled ? true : undefined,
  });
});

export { ClaudeModelSelector, LEVELS as CLAUDE_MODEL_SELECTOR_LEVELS };
export default ClaudeModelSelectorComponent;
