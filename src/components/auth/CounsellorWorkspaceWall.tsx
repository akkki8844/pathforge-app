import { useMemo } from "react";
import { Marquee } from "@/components/ui/3d-testimonails";
import { COUNSELLOR_ALL, type CounsellorDestination } from "@/lib/teacher/nav";
import { cn } from "@/lib/utils";

/**
 * The counsellor sign-in wall: four columns of the workspace's own pages,
 * crawling past on a tilted plane.
 *
 * What this deliberately is NOT is a testimonial wall. The upstream component
 * this is built on ships with nine invented reviewers, and the student side of
 * `/auth` runs real, collected student reviews — but no counsellor reviews have
 * been collected, and writing some for a portal that schools are asked to trust
 * is not a trade worth making. `CounsellorRail` already says as much in prose.
 *
 * So the cards carry the one thing that is both true and worth reading before
 * you sign in: every destination in `lib/teacher/nav.ts`, by its real label and
 * its real one-line description. Each card is a page that exists behind the
 * form. When a page is added to the counsellor nav it appears here too, with no
 * second list to keep in sync.
 *
 * The 3D is a single `perspective` on the frame plus one rotated wrapper —
 * every card stays a flat DOM node, so this costs one composited layer per
 * column rather than a scene graph.
 */

function SurfaceCard({ label, description, icon: Icon }: CounsellorDestination) {
  return (
    <div className="w-56 rounded-xl border border-white/15 bg-white/[0.07] p-3.5 backdrop-blur-[2px]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10">
          <Icon className="h-4 w-4" />
        </span>
        <p className="truncate text-[14px] font-semibold leading-snug">{label}</p>
      </div>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-white/65">{description}</p>
    </div>
  );
}

/** Deal the destinations round-robin so no column is all one department. */
function dealIntoColumns(items: CounsellorDestination[], columns: number) {
  const out: CounsellorDestination[][] = Array.from({ length: columns }, () => []);
  items.forEach((item, i) => out[i % columns].push(item));
  return out;
}

export function CounsellorWorkspaceWall({ className }: { className?: string }) {
  const columns = useMemo(() => dealIntoColumns([...COUNSELLOR_ALL], 4), []);

  return (
    <div
      className={cn(
        "relative flex h-[26rem] w-full flex-row items-center justify-center overflow-hidden [perspective:300px]",
        // Fade the columns out on all four edges. A mask rather than four
        // gradient overlays painted in the panel's colour: AuthShell's panel is
        // hsl(226 62% 44%) in light and hsl(226 44% 15%) in dark, and an
        // overlay would have to restate both and then again the next time that
        // colour moves. A mask is transparent to whatever is behind it.
        "[mask-image:radial-gradient(115%_105%_at_50%_50%,#000_45%,transparent_88%)]",
        className,
      )}
      aria-hidden
    >
      <div
        className="flex flex-row items-center gap-4"
        style={{
          transform:
            "translateX(-70px) translateY(0px) translateZ(-90px) rotateX(18deg) rotateY(-10deg) rotateZ(18deg)",
        }}
      >
        {columns.map((column, i) => (
          <Marquee
            key={i}
            vertical
            pauseOnHover
            reverse={i % 2 === 1}
            repeat={3}
            // Each column crawls at its own speed. Equal speeds read as one
            // rigid sheet sliding past rather than four independent columns —
            // the same reason ReviewsRail offsets its columns.
            className={["[--duration:46s]", "[--duration:38s]", "[--duration:52s]", "[--duration:42s]"][i]}
          >
            {column.map((d) => (
              <SurfaceCard key={d.href} {...d} />
            ))}
          </Marquee>
        ))}
      </div>

    </div>
  );
}
