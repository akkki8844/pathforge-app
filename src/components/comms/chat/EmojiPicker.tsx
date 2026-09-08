import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * The emoji picker.
 *
 * Hand-rolled rather than pulled in as a dependency, and that is a deliberate
 * trade: the off-the-shelf pickers ship the full Unicode set plus a sprite
 * sheet and a search index, which is several hundred kilobytes on a page a
 * student opens on school wifi. A curated set of the emoji people actually use
 * in a school messenger covers the need at zero bytes of new dependency, and
 * every glyph here is a native font glyph, so it inherits the system's own
 * rendering rather than a bitmap that ages.
 *
 * Keywords exist so search finds a glyph by what it *is* — "party" has to find
 * 🎉 — because nobody knows the Unicode name of an emoji.
 */
interface EmojiGroup {
  name: string;
  /** Rendered as the group's tab. */
  tab: string;
  emoji: [glyph: string, keywords: string][];
}

const GROUPS: EmojiGroup[] = [
  {
    name: "Smileys & people",
    tab: "😀",
    emoji: [
      ["😀", "grin happy smile"], ["😃", "smile happy"], ["😄", "laugh happy"],
      ["😁", "beam grin"], ["😆", "laugh"], ["😅", "sweat laugh relief"],
      ["🤣", "rofl laugh"], ["😂", "joy laugh cry tears"], ["🙂", "slight smile"],
      ["🙃", "upside down silly"], ["😉", "wink"], ["😊", "blush smile"],
      ["😇", "angel halo innocent"], ["🥰", "love hearts adore"], ["😍", "heart eyes love"],
      ["😘", "kiss"], ["😗", "kiss"], ["😙", "kiss"], ["😋", "yum tasty"],
      ["😛", "tongue"], ["🤪", "zany silly"], ["🤨", "eyebrow suspicious"],
      ["🧐", "monocle inspect"], ["🤓", "nerd glasses study"], ["😎", "cool sunglasses"],
      ["🥳", "party celebrate birthday"], ["😏", "smirk"], ["😒", "unamused meh"],
      ["😔", "sad pensive"], ["😞", "disappointed sad"], ["😟", "worried"],
      ["😕", "confused"], ["🙁", "frown sad"], ["😣", "persevere struggle"],
      ["😖", "confounded"], ["😫", "tired exhausted"], ["😩", "weary"],
      ["🥺", "pleading puppy please"], ["😢", "cry sad tear"], ["😭", "sob cry"],
      ["😤", "triumph huff determined"], ["😠", "angry"], ["😡", "rage angry"],
      ["🤯", "mind blown shocked"], ["😳", "flushed embarrassed"], ["🥵", "hot"],
      ["😱", "scream shock"], ["😨", "fearful"], ["😰", "anxious"],
      ["😥", "sad relieved"], ["😓", "sweat"], ["🤗", "hug"],
      ["🤔", "think hmm"], ["🤭", "oops giggle"], ["🤫", "shh quiet"],
      ["😶", "no mouth speechless"], ["😐", "neutral"], ["😑", "expressionless"],
      ["😬", "grimace awkward"], ["🙄", "eye roll"], ["😮", "wow surprised"],
      ["😴", "sleep tired zzz"], ["🤤", "drool"], ["😪", "sleepy"],
      ["🤒", "sick thermometer"], ["🤕", "hurt injured"], ["🤢", "sick nauseous"],
      ["🥴", "woozy"], ["😵", "dizzy"], ["🤠", "cowboy"], ["🤡", "clown"],
      ["👻", "ghost boo"], ["💀", "skull dead"], ["👽", "alien"], ["🤖", "robot bot ai"],
      ["👋", "wave hi hello bye"], ["🤝", "handshake deal agree"], ["👏", "clap applause"],
      ["🙌", "raise hands praise"], ["🙏", "pray thanks please"], ["💪", "muscle strong"],
      ["👍", "thumbs up yes good like"], ["👎", "thumbs down no bad"],
      ["👌", "ok perfect"], ["✌️", "peace victory"], ["🤞", "fingers crossed luck"],
      ["🫶", "heart hands love"], ["🤷", "shrug dunno"], ["🤦", "facepalm"],
      ["👀", "eyes look watching"], ["🧠", "brain smart"], ["🫡", "salute yes sir"],
    ],
  },
  {
    name: "School & work",
    tab: "📚",
    emoji: [
      ["📚", "books study school"], ["📖", "book read"], ["📝", "note write exam"],
      ["✏️", "pencil write"], ["🖊️", "pen"], ["📄", "page document"],
      ["📋", "clipboard list"], ["📌", "pin"], ["📎", "clip attach"],
      ["🗂️", "folder files"], ["📁", "folder"], ["🗓️", "calendar date"],
      ["📅", "calendar deadline"], ["⏰", "alarm time deadline"], ["⏳", "hourglass time"],
      ["🎓", "graduate college university degree"], ["🏫", "school building"],
      ["🎒", "backpack school"], ["🔬", "science lab microscope"], ["🧪", "chemistry test"],
      ["🧮", "abacus maths"], ["📊", "chart data stats"], ["📈", "chart up growth"],
      ["📉", "chart down"], ["💡", "idea lightbulb"], ["🔍", "search find"],
      ["💻", "laptop computer code"], ["🖥️", "desktop"], ["⌨️", "keyboard type"],
      ["📱", "phone mobile"], ["✅", "check done complete tick"], ["☑️", "checkbox done"],
      ["❌", "cross no wrong"], ["⭐", "star favourite"], ["🌟", "star glow"],
      ["🏆", "trophy win award"], ["🥇", "gold first medal"], ["🎯", "target goal aim"],
      ["🚀", "rocket launch fast"], ["🔥", "fire hot streak"], ["⚡", "lightning fast"],
      ["💯", "hundred perfect score"], ["📢", "announce megaphone"], ["🔔", "bell notify"],
      ["🔕", "mute silent"], ["🔗", "link url"], ["💰", "money fees"],
      ["✈️", "plane travel abroad"], ["🌍", "world global earth"], ["🏛️", "college campus"],
    ],
  },
  {
    name: "Hearts & symbols",
    tab: "❤️",
    emoji: [
      ["❤️", "heart love red"], ["🧡", "orange heart"], ["💛", "yellow heart"],
      ["💚", "green heart"], ["💙", "blue heart"], ["💜", "purple heart"],
      ["🖤", "black heart"], ["🤍", "white heart"], ["💔", "broken heart"],
      ["💖", "sparkle heart"], ["💗", "growing heart"], ["💘", "cupid arrow"],
      ["💝", "gift heart"], ["✨", "sparkles shine"], ["🎉", "party celebrate tada"],
      ["🎊", "confetti party"], ["🎈", "balloon"], ["🎁", "gift present"],
      ["🎂", "cake birthday"], ["🍰", "cake slice"], ["☕", "coffee"],
      ["🍵", "tea"], ["🍕", "pizza food"], ["🍔", "burger food"],
      ["🌮", "taco food"], ["🍜", "noodles food"], ["🍎", "apple fruit"],
      ["🥑", "avocado"], ["🍫", "chocolate"], ["🍿", "popcorn film"],
      ["⚽", "football soccer sport"], ["🏀", "basketball sport"], ["🎮", "game gaming"],
      ["🎵", "music note"], ["🎧", "headphones music"], ["🎬", "film movie"],
      ["📷", "camera photo"], ["🌈", "rainbow"], ["☀️", "sun sunny"],
      ["🌙", "moon night"], ["⛅", "cloud weather"], ["🌧️", "rain"],
      ["❄️", "snow cold"], ["🌸", "blossom flower"], ["🌻", "sunflower"],
      ["🌱", "seedling grow"], ["🐶", "dog puppy"], ["🐱", "cat kitten"],
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.emoji);

export function EmojiPicker({
  onPick,
  className,
}: {
  onPick: (emoji: string) => void;
  className?: string;
}) {
  const [group, setGroup] = useState(0);
  const [term, setTerm] = useState("");

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return GROUPS[group].emoji;
    return ALL.filter(([glyph, keywords]) => glyph === q || keywords.includes(q));
  }, [term, group]);

  return (
    <div className={cn("w-[19.5rem]", className)}>
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search emoji"
            aria-label="Search emoji"
            className="h-8 rounded-lg border-transparent bg-muted/60 pl-8 text-xs"
          />
        </div>
      </div>

      {!term.trim() && (
        <div className="flex gap-1 border-b border-border px-2 py-1.5" role="tablist">
          {GROUPS.map((g, i) => (
            <button
              key={g.name}
              type="button"
              role="tab"
              aria-selected={i === group}
              aria-label={g.name}
              onClick={() => setGroup(i)}
              className={cn(
                "flex-1 rounded-lg py-1 text-base transition-colors",
                i === group ? "bg-accent/12 ring-1 ring-accent/30" : "hover:bg-muted",
              )}
            >
              <span aria-hidden>{g.tab}</span>
            </button>
          ))}
        </div>
      )}

      <ScrollArea className="h-56">
        {results.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            No emoji matched “{term.trim()}”.
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5 p-2">
            {results.map(([glyph, keywords]) => (
              <button
                key={glyph}
                type="button"
                onClick={() => onPick(glyph)}
                title={keywords.split(" ")[0]}
                aria-label={keywords.split(" ")[0]}
                className="rounded-lg py-1 text-xl leading-none transition-transform duration-100 hover:scale-125 hover:bg-muted focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <span aria-hidden>{glyph}</span>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
