/**
 * Where Pathforge students are, for the map on the landing page.
 *
 * WHERE THIS CAME FROM
 *
 * Read from the live database on 17 September 2026:
 *
 *   select country, count(*) from onboarding_data
 *   where country is not null and btrim(country) <> ''
 *   group by country order by count(*) desc;
 *
 * Every country below is one a real student selected during onboarding. None of
 * it is invented, and nothing is here for decoration — if a country is on the
 * map, somebody in it uses Pathforge.
 *
 * WHY THERE ARE NO NUMBERS
 *
 * Deliberate, and it is a privacy decision rather than a styling one. Several
 * of these countries have exactly one student. Publishing "1 student in Algeria"
 * says something about an identifiable-in-principle person on a service whose
 * users are school-age minors, for no benefit to anybody. Country-level presence
 * discloses nothing; a headcount of one does. The section therefore says which
 * countries, and never how many.
 *
 * TO REFRESH
 *
 * Re-run the query, replace the list, and update the date above. Do not add a
 * country because it would look good on the map, and do not add counts.
 */

export interface StudentCountry {
  /** Country name, exactly as students select it during onboarding. */
  name: string;
  /**
   * A representative point for the country — its capital, or its geographic
   * centre for the larger ones. We store the country a student chose and never
   * their city, so this locates the country on a map and claims nothing more.
   */
  lat: number;
  lng: number;
}

/**
 * The hub every arc is drawn from. Pathforge is operated from India, which is
 * also where most of its students are, so the lines read as "students here,
 * connected to Pathforge" rather than as traffic between arbitrary places.
 */
export const STUDENT_HUB: StudentCountry = {
  name: "India",
  lat: 22.5937,
  lng: 78.9629,
};

/** Every other country with at least one student, most students first. */
export const STUDENT_COUNTRIES: StudentCountry[] = [
  { name: "United States", lat: 39.8283, lng: -98.5795 },
  { name: "United Arab Emirates", lat: 24.4539, lng: 54.3773 },
  { name: "United Kingdom", lat: 54.0, lng: -2.5 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Algeria", lat: 28.0339, lng: 1.6596 },
  { name: "Angola", lat: -11.2027, lng: 17.8739 },
];

/** Arcs for `<WorldMap />`: the hub out to each other country. */
export const STUDENT_MAP_DOTS = STUDENT_COUNTRIES.map((country) => ({
  start: { lat: STUDENT_HUB.lat, lng: STUDENT_HUB.lng, label: STUDENT_HUB.name },
  end: { lat: country.lat, lng: country.lng, label: country.name },
}));

/** How many countries have at least one student, the hub included. */
export const STUDENT_COUNTRY_COUNT = STUDENT_COUNTRIES.length + 1;
