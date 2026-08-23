/**
 * Cabin ambience, synthesised rather than streamed.
 *
 * The obvious implementation is four looping audio files. This does not do
 * that, for reasons that all point the same way:
 *
 * - Convincing engine and rain loops are megabytes each, and they would be
 *   downloaded by every student who opens Focus whether or not they ever turn
 *   sound on. Shaped noise is a few hundred bytes of code and starts instantly.
 * - Licensed audio has to be tracked and attributed. Generated audio has no
 *   provenance question at all.
 * - A loop of a recording has a seam. Noise does not, so a ninety-minute flight
 *   never develops that "here comes the join again" rhythm that pulls attention
 *   back to the fact that you are listening to a file.
 *
 * All four beds are the same white-noise source pushed through different
 * filters, which is close to how these sounds actually differ: cabin roar is
 * low-passed noise, rain is high-passed noise with a little motion.
 *
 * Nothing here starts without a click. The AudioContext is constructed lazily
 * inside a user gesture, so no autoplay policy is ever tripped, and every step
 * is wrapped — audio failing must never take the timer with it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export type AmbienceBed = "off" | "cabin" | "engine" | "noise" | "rain";

export const AMBIENCE: { value: AmbienceBed; label: string }[] = [
  { value: "off", label: "Silent" },
  { value: "cabin", label: "Cabin" },
  { value: "engine", label: "Engine" },
  { value: "noise", label: "White noise" },
  { value: "rain", label: "Rain" },
];

/** Filter shape per bed: [type, frequency Hz, Q, gain multiplier]. */
const SHAPE: Record<Exclude<AmbienceBed, "off">, [BiquadFilterType, number, number, number]> = {
  cabin: ["lowpass", 420, 0.7, 1],
  engine: ["lowpass", 180, 1.4, 1.25],
  noise: ["highpass", 60, 0.5, 0.55],
  rain: ["highpass", 1400, 0.6, 0.5],
};

/** Two seconds of white noise, looped. Long enough that the loop is inaudible. */
function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const frames = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function useCabinAudio() {
  const [bed, setBed] = useState<AmbienceBed>("off");
  const [volume, setVolume] = useState(0.4);
  const [failed, setFailed] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  /** Slow LFO that makes rain breathe instead of sitting flat. */
  const lfoRef = useRef<OscillatorNode | null>(null);

  const teardown = useCallback(() => {
    try {
      lfoRef.current?.stop();
      sourceRef.current?.stop();
    } catch {
      /* already stopped */
    }
    lfoRef.current?.disconnect();
    sourceRef.current?.disconnect();
    filterRef.current?.disconnect();
    gainRef.current?.disconnect();
    lfoRef.current = null;
    sourceRef.current = null;
    filterRef.current = null;
    gainRef.current = null;
  }, []);

  const play = useCallback(
    (next: Exclude<AmbienceBed, "off">, level: number) => {
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) {
          setFailed(true);
          return;
        }
        const ctx = ctxRef.current ?? new Ctor();
        ctxRef.current = ctx;
        void ctx.resume();

        teardown();

        const [type, freq, q, mult] = SHAPE[next];
        const source = ctx.createBufferSource();
        source.buffer = makeNoiseBuffer(ctx);
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = freq;
        filter.Q.value = q;

        const gain = ctx.createGain();
        // Ramped, never set instantly: a step change in gain on noise is an
        // audible click.
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(level * mult * 0.5, ctx.currentTime + 0.8);

        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start();

        if (next === "rain") {
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.08;
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 500;
          lfo.connect(lfoGain).connect(filter.frequency);
          lfo.start();
          lfoRef.current = lfo;
        }

        sourceRef.current = source;
        filterRef.current = filter;
        gainRef.current = gain;
        setFailed(false);
      } catch {
        setFailed(true);
      }
    },
    [teardown],
  );

  const select = useCallback(
    (next: AmbienceBed) => {
      setBed(next);
      if (next === "off") {
        teardown();
        return;
      }
      play(next, volume);
    },
    [play, teardown, volume],
  );

  const changeVolume = useCallback(
    (next: number) => {
      setVolume(next);
      const ctx = ctxRef.current;
      const gain = gainRef.current;
      if (!ctx || !gain || bed === "off") return;
      const mult = SHAPE[bed as Exclude<AmbienceBed, "off">][3];
      try {
        gain.gain.linearRampToValueAtTime(next * mult * 0.5, ctx.currentTime + 0.15);
      } catch {
        /* a failed ramp is not worth surfacing */
      }
    },
    [bed],
  );

  // Tear the graph down on unmount, or a silent noise source outlives the page.
  useEffect(
    () => () => {
      teardown();
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [teardown],
  );

  return { bed, volume, failed, select, changeVolume };
}

export function CabinAudioControls({
  bed,
  volume,
  failed,
  onSelect,
  onVolume,
  className,
}: {
  bed: AmbienceBed;
  volume: number;
  failed: boolean;
  onSelect: (bed: AmbienceBed) => void;
  onVolume: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Headphones className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />
        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
          Cabin audio
        </span>
      </div>

      {failed ? (
        <p className="text-xs text-amber-300/80">
          Cabin audio is unavailable on this device. Your flight continues normally.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cabin ambience">
            {AMBIENCE.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => onSelect(a.value)}
                aria-pressed={bed === a.value}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  bed === a.value
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-white/12 text-white/60 hover:border-white/25 hover:text-white",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {bed === "off" ? (
              <VolumeX className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden="true" />
            )}
            <Slider
              value={[Math.round(volume * 100)]}
              onValueChange={([v]) => onVolume(v / 100)}
              max={100}
              step={1}
              disabled={bed === "off"}
              aria-label="Cabin audio volume"
              className="flex-1"
            />
            <span className="w-8 shrink-0 text-right font-sans text-[11px] tabular-nums text-white/45">
              {Math.round(volume * 100)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
