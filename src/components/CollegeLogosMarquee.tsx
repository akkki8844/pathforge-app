import { motion } from "framer-motion";

const colleges = [
  { name: "Harvard", domain: "harvard.edu" },
  { name: "Stanford", domain: "stanford.edu" },
  { name: "MIT", domain: "mit.edu" },
  { name: "Princeton", domain: "princeton.edu" },
  { name: "Yale", domain: "yale.edu" },
  { name: "Columbia", domain: "columbia.edu" },
  { name: "Caltech", domain: "caltech.edu" },
  { name: "UChicago", domain: "uchicago.edu" },
  { name: "UPenn", domain: "upenn.edu" },
  { name: "Cornell", domain: "cornell.edu" },
  { name: "Brown", domain: "brown.edu" },
  { name: "Dartmouth", domain: "dartmouth.edu" },
  { name: "Duke", domain: "duke.edu" },
  { name: "Northwestern", domain: "northwestern.edu" },
  { name: "Johns Hopkins", domain: "jhu.edu" },
  { name: "UC Berkeley", domain: "berkeley.edu" },
  { name: "UCLA", domain: "ucla.edu" },
  { name: "Michigan", domain: "umich.edu" },
  { name: "NYU", domain: "nyu.edu" },
  { name: "CMU", domain: "cmu.edu" },
  { name: "Georgia Tech", domain: "gatech.edu" },
  { name: "Oxford", domain: "ox.ac.uk" },
  { name: "Cambridge", domain: "cam.ac.uk" },
  { name: "Imperial", domain: "imperial.ac.uk" },
  { name: "UCL", domain: "ucl.ac.uk" },
  { name: "LSE", domain: "lse.ac.uk" },
  { name: "ETH Zurich", domain: "ethz.ch" },
  { name: "NUS", domain: "nus.edu.sg" },
  { name: "Tsinghua", domain: "tsinghua.edu.cn" },
  { name: "Toronto", domain: "utoronto.ca" },
];

export function CollegeLogosMarquee() {
  const loop = [...colleges, ...colleges];
  return (
    <section
      className="relative py-10 overflow-hidden"
      aria-label="Top universities worldwide"
    >
      <div className="section-container mb-6">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Forging paths to the world's top universities
        </p>
      </div>

      <div className="relative">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />

        <div
          className="flex w-max gap-12 px-6 animate-marquee"
        >
          {loop.map((c, i) => (
            <div
              key={`${c.domain}-${i}`}
              className="flex items-center gap-3 h-12 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              title={c.name}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=32`}
                alt={`${c.name} university logo`}
                loading="lazy"
                width={28}
                height={28}
                className="h-7 w-7 object-contain rounded-sm"
              />
              <span className="text-sm font-medium text-foreground/80 whitespace-nowrap">
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
