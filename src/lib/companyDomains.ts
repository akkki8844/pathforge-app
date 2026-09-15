/**
 * Company and organisation names mapped to the domain their logo lives on.
 *
 * A curated table rather than a guess. There is no reliable way to turn an
 * arbitrary string a student typed into a company's domain — "Apollo" is a
 * hospital chain, a spacecraft programme and a tyre manufacturer — and showing
 * the wrong company's mark against someone's internship is worse than showing
 * no mark at all. So this only ever resolves names it has been told about, and
 * everything else falls back to a monogram tile.
 *
 * Matching is on a normalised key: lower-cased, punctuation stripped, and the
 * corporate suffixes people write inconsistently ("Inc", "Ltd", "Pvt", "LLC",
 * "Corporation") removed. That way "Google", "Google LLC" and "google inc."
 * are one entry, while "Google Summer of Code" — a different thing — is not
 * silently folded into it.
 */

/** Strip case, punctuation and corporate suffixes so one entry covers the variants. */
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,'’&]/g, " ")
    .replace(/\b(inc|llc|ltd|limited|plc|corp|corporation|co|company|pvt|private|gmbh|sa|nv|ag|group|holdings|technologies|technology|labs|laboratories)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The table. Keys are already normalised.
 *
 * Scope is deliberately "employers, labs and organisations a secondary-school
 * student plausibly lists on a profile": big tech, the consultancies and banks
 * that run school outreach, Indian IT and conglomerates (most of this product's
 * users are applying from India), research bodies, NGOs, and the online-learning
 * and competition organisations that show up in activity lists.
 */
const COMPANY_DOMAINS: Record<string, string> = {
  // Technology
  google: "google.com",
  alphabet: "abc.xyz",
  youtube: "youtube.com",
  microsoft: "microsoft.com",
  linkedin: "linkedin.com",
  github: "github.com",
  openai: "openai.com",
  anthropic: "anthropic.com",
  apple: "apple.com",
  amazon: "amazon.com",
  "amazon web services": "aws.amazon.com",
  aws: "aws.amazon.com",
  meta: "meta.com",
  facebook: "facebook.com",
  instagram: "instagram.com",
  whatsapp: "whatsapp.com",
  netflix: "netflix.com",
  nvidia: "nvidia.com",
  intel: "intel.com",
  amd: "amd.com",
  qualcomm: "qualcomm.com",
  ibm: "ibm.com",
  oracle: "oracle.com",
  salesforce: "salesforce.com",
  adobe: "adobe.com",
  sap: "sap.com",
  cisco: "cisco.com",
  dell: "dell.com",
  hp: "hp.com",
  "hewlett packard": "hp.com",
  "hewlett packard enterprise": "hpe.com",
  samsung: "samsung.com",
  sony: "sony.com",
  siemens: "siemens.com",
  bosch: "bosch.com",
  philips: "philips.com",
  spotify: "spotify.com",
  uber: "uber.com",
  airbnb: "airbnb.com",
  stripe: "stripe.com",
  shopify: "shopify.com",
  atlassian: "atlassian.com",
  slack: "slack.com",
  zoom: "zoom.us",
  dropbox: "dropbox.com",
  notion: "notion.so",
  figma: "figma.com",
  canva: "canva.com",
  twilio: "twilio.com",
  cloudflare: "cloudflare.com",
  datadog: "datadoghq.com",
  snowflake: "snowflake.com",
  databricks: "databricks.com",
  palantir: "palantir.com",
  spacex: "spacex.com",
  tesla: "tesla.com",
  "blue origin": "blueorigin.com",
  boeing: "boeing.com",
  airbus: "airbus.com",
  "lockheed martin": "lockheedmartin.com",

  // Indian technology and conglomerates
  infosys: "infosys.com",
  wipro: "wipro.com",
  "tata consultancy services": "tcs.com",
  tcs: "tcs.com",
  "tata": "tata.com",
  "tata motors": "tatamotors.com",
  "tata steel": "tatasteel.com",
  "hcl": "hcltech.com",
  "hcltech": "hcltech.com",
  "tech mahindra": "techmahindra.com",
  mahindra: "mahindra.com",
  "larsen toubro": "larsentoubro.com",
  "l t": "larsentoubro.com",
  reliance: "ril.com",
  "reliance industries": "ril.com",
  jio: "jio.com",
  adani: "adani.com",
  zoho: "zoho.com",
  freshworks: "freshworks.com",
  razorpay: "razorpay.com",
  paytm: "paytm.com",
  phonepe: "phonepe.com",
  flipkart: "flipkart.com",
  zomato: "zomato.com",
  swiggy: "swiggy.com",
  ola: "olacabs.com",
  byju: "byjus.com",
  byjus: "byjus.com",
  unacademy: "unacademy.com",
  zerodha: "zerodha.com",
  "cred": "cred.club",
  "isro": "isro.gov.in",
  "indian space research organisation": "isro.gov.in",
  drdo: "drdo.gov.in",
  bhel: "bhel.com",
  ongc: "ongc.co.in",

  // Consulting, finance, professional services
  mckinsey: "mckinsey.com",
  "mckinsey company": "mckinsey.com",
  bain: "bain.com",
  "boston consulting": "bcg.com",
  bcg: "bcg.com",
  deloitte: "deloitte.com",
  pwc: "pwc.com",
  "pricewaterhousecoopers": "pwc.com",
  ey: "ey.com",
  "ernst young": "ey.com",
  kpmg: "kpmg.com",
  accenture: "accenture.com",
  capgemini: "capgemini.com",
  "goldman sachs": "goldmansachs.com",
  "morgan stanley": "morganstanley.com",
  "jp morgan": "jpmorganchase.com",
  jpmorgan: "jpmorganchase.com",
  "jpmorgan chase": "jpmorganchase.com",
  "bank of america": "bankofamerica.com",
  citi: "citi.com",
  citigroup: "citi.com",
  hsbc: "hsbc.com",
  barclays: "barclays.com",
  "deutsche bank": "db.com",
  ubs: "ubs.com",
  blackrock: "blackrock.com",
  "hdfc bank": "hdfcbank.com",
  hdfc: "hdfcbank.com",
  "icici bank": "icicibank.com",
  icici: "icicibank.com",
  "axis bank": "axisbank.com",
  "state bank of india": "sbi.co.in",
  sbi: "sbi.co.in",

  // Health, industry, consumer
  pfizer: "pfizer.com",
  moderna: "modernatx.com",
  novartis: "novartis.com",
  roche: "roche.com",
  astrazeneca: "astrazeneca.com",
  "johnson johnson": "jnj.com",
  "sun pharma": "sunpharma.com",
  cipla: "cipla.com",
  "dr reddy s": "drreddys.com",
  "dr reddys": "drreddys.com",
  apollo: "apollohospitals.com",
  "apollo hospitals": "apollohospitals.com",
  fortis: "fortishealthcare.com",
  unilever: "unilever.com",
  "hindustan unilever": "hul.co.in",
  hul: "hul.co.in",
  nestle: "nestle.com",
  "procter gamble": "pg.com",
  "p g": "pg.com",
  pepsico: "pepsico.com",
  "coca cola": "coca-cola.com",
  nike: "nike.com",
  adidas: "adidas.com",
  ikea: "ikea.com",
  maersk: "maersk.com",

  // Research, public bodies, non-profits
  nasa: "nasa.gov",
  esa: "esa.int",
  cern: "home.cern",
  "national institutes of health": "nih.gov",
  nih: "nih.gov",
  cdc: "cdc.gov",
  "world health organization": "who.int",
  "world health organisation": "who.int",
  who: "who.int",
  unicef: "unicef.org",
  "united nations": "un.org",
  un: "un.org",
  unesco: "unesco.org",
  "red cross": "redcross.org",
  "world wildlife fund": "worldwildlife.org",
  wwf: "worldwildlife.org",
  greenpeace: "greenpeace.org",
  "doctors without borders": "msf.org",
  "teach for india": "teachforindia.org",
  "teach for america": "teachforamerica.org",
  "habitat for humanity": "habitat.org",
  "rotary international": "rotary.org",
  rotary: "rotary.org",
  "lions club": "lionsclubs.org",
  "smile foundation": "smilefoundationindia.org",
  "goonj": "goonj.org",
  "akshaya patra": "akshayapatra.org",
  "amnesty international": "amnesty.org",

  // Learning, competitions, standards bodies
  "khan academy": "khanacademy.org",
  coursera: "coursera.org",
  edx: "edx.org",
  udemy: "udemy.com",
  udacity: "udacity.com",
  "college board": "collegeboard.org",
  collegeboard: "collegeboard.org",
  ets: "ets.org",
  "ib": "ibo.org",
  "international baccalaureate": "ibo.org",
  cambridge_assessment: "cambridgeinternational.org",
  "cambridge assessment international education": "cambridgeinternational.org",
  ieee: "ieee.org",
  acm: "acm.org",
  "association for computing machinery": "acm.org",
  "national science foundation": "nsf.gov",
  nsf: "nsf.gov",
  "google summer of code": "summerofcode.withgoogle.com",
  "hack club": "hackclub.com",
  "first robotics": "firstinspires.org",
  "first inspires": "firstinspires.org",
  "model united nations": "un.org",
  "duke of edinburgh": "dofe.org",
  "toastmasters": "toastmasters.org",
  "codeforces": "codeforces.com",
  leetcode: "leetcode.com",
  kaggle: "kaggle.com",
  hackerrank: "hackerrank.com",
  codechef: "codechef.com",
  "stack overflow": "stackoverflow.com",
};

/**
 * The domain a company's logo lives on, or null when the name is not one this
 * table knows. Never guesses — an unknown name returns null so the caller draws
 * a monogram instead of another company's mark.
 */
export function resolveCompanyDomain(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = normalizeCompany(name);
  if (!key) return null;
  return COMPANY_DOMAINS[key] ?? null;
}
