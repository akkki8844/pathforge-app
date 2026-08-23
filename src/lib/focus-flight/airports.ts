/**
 * The airport atlas Focus Flight departs from and arrives at.
 *
 * Bundled rather than fetched, and that is a deliberate architectural choice
 * worth defending, because the obvious alternative is a Places/geocoding API:
 *
 * - **A route has to be real for the journey to mean anything.** Every entry
 *   below carries its true IATA code and true coordinates, so DEL -> LHR is
 *   6 704 km because that is the distance, not because a number was invented to
 *   look plausible. The flight is simulated; the geography is not.
 * - **Search must be instant and offline.** Booking is the ritual — the moment
 *   the student commits — and a spinner between "I want to focus" and "I am
 *   focusing" is the exact friction the feature exists to remove. 160 airports
 *   is roughly 20 KB, filtered synchronously, with no key, no quota, no network
 *   error path, and no third-party request from a page students use daily.
 * - **A focus destination is not a place you go.** The list only needs to be
 *   evocative and globally spread, not exhaustive. An autocomplete over every
 *   airfield on earth would be worse: nobody wants to focus at a regional
 *   airstrip they have never heard of.
 *
 * Coordinates are airport reference points in decimal degrees, accurate to
 * roughly a hundred metres — far beyond what a great-circle drawn across a
 * world map can express, but they also drive the distance figure printed on the
 * boarding pass, and that figure should survive being checked.
 */

export type AirportRegion =
  | "Asia"
  | "Europe"
  | "North America"
  | "South America"
  | "Middle East"
  | "Africa"
  | "Oceania";

export interface Airport {
  /** IATA three-letter code. Unique, and the key everything else references. */
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  region: AirportRegion;
}

/**
 * Stored as tuples rather than objects purely for source weight: 160 objects
 * with seven repeated key names each is about 4 KB of duplicated property
 * names in the bundle. They are expanded once, at module load, below.
 */
type Row = [string, string, string, string, number, number, AirportRegion];

const ROWS: Row[] = [
  // ── South Asia ──────────────────────────────────────────────────────────
  ["DEL", "Indira Gandhi International", "New Delhi", "India", 28.5562, 77.1, "Asia"],
  ["BOM", "Chhatrapati Shivaji Maharaj International", "Mumbai", "India", 19.0896, 72.8656, "Asia"],
  ["BLR", "Kempegowda International", "Bengaluru", "India", 13.1986, 77.7066, "Asia"],
  ["MAA", "Chennai International", "Chennai", "India", 12.9941, 80.1709, "Asia"],
  ["HYD", "Rajiv Gandhi International", "Hyderabad", "India", 17.2403, 78.4294, "Asia"],
  ["CCU", "Netaji Subhas Chandra Bose International", "Kolkata", "India", 22.6547, 88.4467, "Asia"],
  ["COK", "Cochin International", "Kochi", "India", 10.152, 76.4019, "Asia"],
  ["AMD", "Sardar Vallabhbhai Patel International", "Ahmedabad", "India", 23.0772, 72.6347, "Asia"],
  ["GOI", "Goa International", "Goa", "India", 15.3808, 73.8314, "Asia"],
  ["PNQ", "Pune", "Pune", "India", 18.5822, 73.9197, "Asia"],
  ["JAI", "Jaipur International", "Jaipur", "India", 26.8242, 75.8122, "Asia"],
  ["LKO", "Chaudhary Charan Singh International", "Lucknow", "India", 26.7606, 80.8893, "Asia"],
  ["TRV", "Trivandrum International", "Thiruvananthapuram", "India", 8.4821, 76.92, "Asia"],
  ["IXC", "Chandigarh International", "Chandigarh", "India", 30.6735, 76.7885, "Asia"],
  ["GAU", "Lokpriya Gopinath Bordoloi International", "Guwahati", "India", 26.1061, 91.5859, "Asia"],
  ["CMB", "Bandaranaike International", "Colombo", "Sri Lanka", 7.1808, 79.8841, "Asia"],
  ["KTM", "Tribhuvan International", "Kathmandu", "Nepal", 27.6966, 85.3591, "Asia"],
  ["DAC", "Hazrat Shahjalal International", "Dhaka", "Bangladesh", 23.8433, 90.3978, "Asia"],
  ["KHI", "Jinnah International", "Karachi", "Pakistan", 24.9065, 67.1608, "Asia"],
  ["ISB", "Islamabad International", "Islamabad", "Pakistan", 33.549, 72.8256, "Asia"],
  ["LHE", "Allama Iqbal International", "Lahore", "Pakistan", 31.5216, 74.4036, "Asia"],
  ["MLE", "Velana International", "Male", "Maldives", 4.1918, 73.5291, "Asia"],

  // ── East and Southeast Asia ─────────────────────────────────────────────
  ["HND", "Haneda", "Tokyo", "Japan", 35.5494, 139.7798, "Asia"],
  ["NRT", "Narita International", "Tokyo", "Japan", 35.772, 140.3929, "Asia"],
  ["KIX", "Kansai International", "Osaka", "Japan", 34.4342, 135.244, "Asia"],
  ["CTS", "New Chitose", "Sapporo", "Japan", 42.7752, 141.6923, "Asia"],
  ["ICN", "Incheon International", "Seoul", "South Korea", 37.4602, 126.4407, "Asia"],
  ["GMP", "Gimpo International", "Seoul", "South Korea", 37.5583, 126.7906, "Asia"],
  ["PEK", "Capital International", "Beijing", "China", 40.0799, 116.6031, "Asia"],
  ["PKX", "Daxing International", "Beijing", "China", 39.5098, 116.4109, "Asia"],
  ["PVG", "Pudong International", "Shanghai", "China", 31.1443, 121.8083, "Asia"],
  ["CAN", "Baiyun International", "Guangzhou", "China", 23.3924, 113.2988, "Asia"],
  ["SZX", "Bao'an International", "Shenzhen", "China", 22.6393, 113.8107, "Asia"],
  ["CTU", "Tianfu International", "Chengdu", "China", 30.3125, 104.4414, "Asia"],
  ["HKG", "Hong Kong International", "Hong Kong", "Hong Kong", 22.308, 113.9185, "Asia"],
  ["TPE", "Taoyuan International", "Taipei", "Taiwan", 25.0777, 121.2328, "Asia"],
  ["SIN", "Changi", "Singapore", "Singapore", 1.3644, 103.9915, "Asia"],
  ["KUL", "Kuala Lumpur International", "Kuala Lumpur", "Malaysia", 2.7456, 101.7099, "Asia"],
  ["BKK", "Suvarnabhumi", "Bangkok", "Thailand", 13.69, 100.7501, "Asia"],
  ["HKT", "Phuket International", "Phuket", "Thailand", 8.1132, 98.3169, "Asia"],
  ["CGK", "Soekarno-Hatta", "Jakarta", "Indonesia", -6.1256, 106.6559, "Asia"],
  ["DPS", "Ngurah Rai", "Bali", "Indonesia", -8.7482, 115.1675, "Asia"],
  ["MNL", "Ninoy Aquino International", "Manila", "Philippines", 14.5086, 121.0194, "Asia"],
  ["SGN", "Tan Son Nhat", "Ho Chi Minh City", "Vietnam", 10.8188, 106.6519, "Asia"],
  ["HAN", "Noi Bai International", "Hanoi", "Vietnam", 21.2212, 105.8072, "Asia"],
  ["TAS", "Islam Karimov Tashkent", "Tashkent", "Uzbekistan", 41.2579, 69.2812, "Asia"],
  ["ALA", "Almaty International", "Almaty", "Kazakhstan", 43.3521, 77.0405, "Asia"],
  ["ULN", "Chinggis Khaan International", "Ulaanbaatar", "Mongolia", 47.6431, 106.8195, "Asia"],

  // ── Europe ──────────────────────────────────────────────────────────────
  ["LHR", "Heathrow", "London", "United Kingdom", 51.47, -0.4543, "Europe"],
  ["LGW", "Gatwick", "London", "United Kingdom", 51.1537, -0.1821, "Europe"],
  ["MAN", "Manchester", "Manchester", "United Kingdom", 53.3537, -2.275, "Europe"],
  ["EDI", "Edinburgh", "Edinburgh", "United Kingdom", 55.9508, -3.3615, "Europe"],
  ["DUB", "Dublin", "Dublin", "Ireland", 53.4213, -6.2701, "Europe"],
  ["CDG", "Charles de Gaulle", "Paris", "France", 49.0097, 2.5479, "Europe"],
  ["ORY", "Orly", "Paris", "France", 48.7233, 2.3794, "Europe"],
  ["NCE", "Cote d'Azur", "Nice", "France", 43.6584, 7.2159, "Europe"],
  ["AMS", "Schiphol", "Amsterdam", "Netherlands", 52.3105, 4.7683, "Europe"],
  ["FRA", "Frankfurt", "Frankfurt", "Germany", 50.0379, 8.5622, "Europe"],
  ["MUC", "Munich", "Munich", "Germany", 48.3538, 11.7861, "Europe"],
  ["BER", "Brandenburg", "Berlin", "Germany", 52.3667, 13.5033, "Europe"],
  ["ZRH", "Zurich", "Zurich", "Switzerland", 47.4647, 8.5492, "Europe"],
  ["GVA", "Geneva", "Geneva", "Switzerland", 46.2381, 6.109, "Europe"],
  ["VIE", "Vienna International", "Vienna", "Austria", 48.1103, 16.5697, "Europe"],
  ["BRU", "Brussels", "Brussels", "Belgium", 50.9014, 4.4844, "Europe"],
  ["CPH", "Copenhagen", "Copenhagen", "Denmark", 55.618, 12.656, "Europe"],
  ["ARN", "Arlanda", "Stockholm", "Sweden", 59.6519, 17.9186, "Europe"],
  ["OSL", "Gardermoen", "Oslo", "Norway", 60.1939, 11.1004, "Europe"],
  ["HEL", "Helsinki-Vantaa", "Helsinki", "Finland", 60.3172, 24.9633, "Europe"],
  ["KEF", "Keflavik", "Reykjavik", "Iceland", 63.985, -22.6056, "Europe"],
  ["MAD", "Barajas", "Madrid", "Spain", 40.4719, -3.5626, "Europe"],
  ["BCN", "El Prat", "Barcelona", "Spain", 41.2971, 2.0785, "Europe"],
  ["LIS", "Humberto Delgado", "Lisbon", "Portugal", 38.7742, -9.1342, "Europe"],
  ["OPO", "Francisco Sa Carneiro", "Porto", "Portugal", 41.2481, -8.6814, "Europe"],
  ["FCO", "Fiumicino", "Rome", "Italy", 41.8003, 12.2389, "Europe"],
  ["MXP", "Malpensa", "Milan", "Italy", 45.6306, 8.7281, "Europe"],
  ["VCE", "Marco Polo", "Venice", "Italy", 45.5053, 12.3519, "Europe"],
  ["ATH", "Eleftherios Venizelos", "Athens", "Greece", 37.9364, 23.9445, "Europe"],
  ["PRG", "Vaclav Havel", "Prague", "Czechia", 50.1008, 14.26, "Europe"],
  ["WAW", "Chopin", "Warsaw", "Poland", 52.1657, 20.9671, "Europe"],
  ["BUD", "Ferenc Liszt", "Budapest", "Hungary", 47.4369, 19.2556, "Europe"],
  ["IST", "Istanbul", "Istanbul", "Turkiye", 41.2753, 28.7519, "Europe"],
  ["SVO", "Sheremetyevo", "Moscow", "Russia", 55.9726, 37.4146, "Europe"],
  ["TLL", "Lennart Meri Tallinn", "Tallinn", "Estonia", 59.4133, 24.8328, "Europe"],
  ["RIX", "Riga International", "Riga", "Latvia", 56.9236, 23.9711, "Europe"],

  // ── Middle East ─────────────────────────────────────────────────────────
  ["DXB", "Dubai International", "Dubai", "United Arab Emirates", 25.2532, 55.3657, "Middle East"],
  ["AUH", "Zayed International", "Abu Dhabi", "United Arab Emirates", 24.433, 54.6511, "Middle East"],
  ["DOH", "Hamad International", "Doha", "Qatar", 25.2731, 51.6081, "Middle East"],
  ["RUH", "King Khalid International", "Riyadh", "Saudi Arabia", 24.9576, 46.6988, "Middle East"],
  ["JED", "King Abdulaziz International", "Jeddah", "Saudi Arabia", 21.6796, 39.1565, "Middle East"],
  ["KWI", "Kuwait International", "Kuwait City", "Kuwait", 29.2266, 47.9689, "Middle East"],
  ["MCT", "Muscat International", "Muscat", "Oman", 23.5933, 58.2844, "Middle East"],
  ["TLV", "Ben Gurion", "Tel Aviv", "Israel", 32.0004, 34.8706, "Middle East"],
  ["AMM", "Queen Alia International", "Amman", "Jordan", 31.7226, 35.9932, "Middle East"],
  ["BAH", "Bahrain International", "Manama", "Bahrain", 26.2708, 50.6336, "Middle East"],

  // ── North America ───────────────────────────────────────────────────────
  ["JFK", "John F. Kennedy International", "New York", "United States", 40.6413, -73.7781, "North America"],
  ["EWR", "Newark Liberty International", "Newark", "United States", 40.6895, -74.1745, "North America"],
  ["LGA", "LaGuardia", "New York", "United States", 40.7769, -73.874, "North America"],
  ["BOS", "Logan International", "Boston", "United States", 42.3656, -71.0096, "North America"],
  ["IAD", "Dulles International", "Washington", "United States", 38.9531, -77.4565, "North America"],
  ["PHL", "Philadelphia International", "Philadelphia", "United States", 39.8744, -75.2424, "North America"],
  ["ATL", "Hartsfield-Jackson", "Atlanta", "United States", 33.6407, -84.4277, "North America"],
  ["MIA", "Miami International", "Miami", "United States", 25.7959, -80.287, "North America"],
  ["MCO", "Orlando International", "Orlando", "United States", 28.4312, -81.3081, "North America"],
  ["ORD", "O'Hare International", "Chicago", "United States", 41.9742, -87.9073, "North America"],
  ["DTW", "Detroit Metropolitan", "Detroit", "United States", 42.2162, -83.3554, "North America"],
  ["MSP", "Minneapolis-St Paul", "Minneapolis", "United States", 44.8848, -93.2223, "North America"],
  ["DFW", "Dallas/Fort Worth", "Dallas", "United States", 32.8998, -97.0403, "North America"],
  ["IAH", "George Bush Intercontinental", "Houston", "United States", 29.9902, -95.3368, "North America"],
  ["DEN", "Denver International", "Denver", "United States", 39.8561, -104.6737, "North America"],
  ["PHX", "Sky Harbor", "Phoenix", "United States", 33.4373, -112.0078, "North America"],
  ["LAS", "Harry Reid International", "Las Vegas", "United States", 36.084, -115.1537, "North America"],
  ["LAX", "Los Angeles International", "Los Angeles", "United States", 33.9416, -118.4085, "North America"],
  ["SFO", "San Francisco International", "San Francisco", "United States", 37.6213, -122.379, "North America"],
  ["SAN", "San Diego International", "San Diego", "United States", 32.7338, -117.1933, "North America"],
  ["SEA", "Seattle-Tacoma", "Seattle", "United States", 47.4502, -122.3088, "North America"],
  ["PDX", "Portland International", "Portland", "United States", 45.5898, -122.5951, "North America"],
  ["SLC", "Salt Lake City International", "Salt Lake City", "United States", 40.7899, -111.9791, "North America"],
  ["HNL", "Daniel K. Inouye International", "Honolulu", "United States", 21.3187, -157.9224, "North America"],
  ["ANC", "Ted Stevens Anchorage", "Anchorage", "United States", 61.1743, -149.9962, "North America"],
  ["YYZ", "Toronto Pearson", "Toronto", "Canada", 43.6777, -79.6248, "North America"],
  ["YVR", "Vancouver International", "Vancouver", "Canada", 49.1967, -123.1815, "North America"],
  ["YUL", "Montreal-Trudeau", "Montreal", "Canada", 45.4706, -73.7408, "North America"],
  ["YYC", "Calgary International", "Calgary", "Canada", 51.1315, -114.0106, "North America"],
  ["MEX", "Benito Juarez International", "Mexico City", "Mexico", 19.4363, -99.0721, "North America"],
  ["CUN", "Cancun International", "Cancun", "Mexico", 21.0365, -86.8771, "North America"],
  ["PTY", "Tocumen International", "Panama City", "Panama", 9.0714, -79.3835, "North America"],
  ["SJO", "Juan Santamaria", "San Jose", "Costa Rica", 9.9981, -84.2041, "North America"],
  ["HAV", "Jose Marti International", "Havana", "Cuba", 22.9892, -82.4091, "North America"],

  // ── South America ───────────────────────────────────────────────────────
  ["GRU", "Guarulhos", "Sao Paulo", "Brazil", -23.4356, -46.4731, "South America"],
  ["GIG", "Galeao", "Rio de Janeiro", "Brazil", -22.81, -43.2506, "South America"],
  ["EZE", "Ministro Pistarini", "Buenos Aires", "Argentina", -34.8222, -58.5358, "South America"],
  ["SCL", "Arturo Merino Benitez", "Santiago", "Chile", -33.393, -70.7858, "South America"],
  ["LIM", "Jorge Chavez International", "Lima", "Peru", -12.0219, -77.1143, "South America"],
  ["BOG", "El Dorado International", "Bogota", "Colombia", 4.7016, -74.1469, "South America"],
  ["UIO", "Mariscal Sucre", "Quito", "Ecuador", -0.1292, -78.3575, "South America"],
  ["MVD", "Carrasco International", "Montevideo", "Uruguay", -34.8384, -56.0308, "South America"],

  // ── Africa ──────────────────────────────────────────────────────────────
  ["JNB", "O. R. Tambo", "Johannesburg", "South Africa", -26.1367, 28.2411, "Africa"],
  ["CPT", "Cape Town International", "Cape Town", "South Africa", -33.9715, 18.6021, "Africa"],
  ["NBO", "Jomo Kenyatta International", "Nairobi", "Kenya", -1.3192, 36.9278, "Africa"],
  ["ADD", "Bole International", "Addis Ababa", "Ethiopia", 8.9779, 38.7993, "Africa"],
  ["CAI", "Cairo International", "Cairo", "Egypt", 30.1219, 31.4056, "Africa"],
  ["CMN", "Mohammed V", "Casablanca", "Morocco", 33.3675, -7.59, "Africa"],
  ["RAK", "Menara", "Marrakesh", "Morocco", 31.6069, -8.0363, "Africa"],
  ["LOS", "Murtala Muhammed", "Lagos", "Nigeria", 6.5774, 3.3212, "Africa"],
  ["ACC", "Kotoka International", "Accra", "Ghana", 5.6052, -0.1668, "Africa"],
  ["DAR", "Julius Nyerere International", "Dar es Salaam", "Tanzania", -6.8781, 39.2026, "Africa"],
  ["TUN", "Tunis-Carthage", "Tunis", "Tunisia", 36.851, 10.2272, "Africa"],
  ["MRU", "Sir Seewoosagur Ramgoolam", "Port Louis", "Mauritius", -20.4302, 57.6836, "Africa"],
  ["SEZ", "Seychelles International", "Mahe", "Seychelles", -4.6743, 55.5218, "Africa"],

  // ── Oceania ─────────────────────────────────────────────────────────────
  ["SYD", "Kingsford Smith", "Sydney", "Australia", -33.9399, 151.1753, "Oceania"],
  ["MEL", "Tullamarine", "Melbourne", "Australia", -37.669, 144.841, "Oceania"],
  ["BNE", "Brisbane", "Brisbane", "Australia", -27.3842, 153.1175, "Oceania"],
  ["PER", "Perth", "Perth", "Australia", -31.9385, 115.9672, "Oceania"],
  ["ADL", "Adelaide", "Adelaide", "Australia", -34.9461, 138.5306, "Oceania"],
  ["AKL", "Auckland", "Auckland", "New Zealand", -37.0082, 174.785, "Oceania"],
  ["CHC", "Christchurch", "Christchurch", "New Zealand", -43.4894, 172.5322, "Oceania"],
  ["WLG", "Wellington", "Wellington", "New Zealand", -41.3272, 174.8053, "Oceania"],
  ["NAN", "Nadi International", "Nadi", "Fiji", -17.7554, 177.4434, "Oceania"],
  ["PPT", "Faa'a International", "Papeete", "French Polynesia", -17.5537, -149.607, "Oceania"],
];

/**
 * One destination per country — never per city.
 *
 * Focus Flight books countries, not cities: the shortlist, the search index
 * and the map all read from this constant, so collapsing it here is the one
 * change that keeps every consumer honest. The first row encountered for a
 * country in `ROWS` above wins, which is deliberate rather than incidental —
 * each country's entry in this file is ordered with its best-known hub
 * first, so the surviving coordinate is a real, recognisable point in that
 * country rather than an arbitrary one.
 */
const seenCountries = new Set<string>();
export const AIRPORTS: Airport[] = ROWS.filter(([, , , country]) => {
  if (seenCountries.has(country)) return false;
  seenCountries.add(country);
  return true;
}).map(([code, name, city, country, lat, lon, region]) => ({
  code,
  name,
  city,
  country,
  lat,
  lon,
  region,
}));

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export function airportByCode(code: string | null | undefined): Airport | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

/**
 * Search, ranked so that typing an airport code lands it first.
 *
 * The ranking matters more than the matching here. A student typing "LON"
 * means London, and a plain `includes()` over every field would bury LHR under
 * every airport whose *name* happens to contain those letters. So: exact code,
 * then code prefix, then city prefix, then anything else — and only then
 * alphabetically, so the order is stable between keystrokes rather than
 * reshuffling as the result set narrows.
 */
export function searchAirports(query: string, limit = 40): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { airport: Airport; score: number }[] = [];
  for (const a of AIRPORTS) {
    const code = a.code.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    const country = a.country.toLowerCase();

    let score = -1;
    if (code === q) score = 0;
    else if (code.startsWith(q)) score = 1;
    else if (city.startsWith(q)) score = 2;
    else if (name.startsWith(q)) score = 3;
    else if (city.includes(q)) score = 4;
    else if (name.includes(q)) score = 5;
    else if (country.startsWith(q)) score = 6;
    else if (country.includes(q)) score = 7;

    if (score >= 0) scored.push({ airport: a, score });
  }

  scored.sort((x, y) =>
    x.score !== y.score ? x.score - y.score : x.airport.code.localeCompare(y.airport.code),
  );
  return scored.slice(0, limit).map((s) => s.airport);
}

/** Airports grouped by region, for browsing rather than searching. */
export function airportsByRegion(): { region: AirportRegion; airports: Airport[] }[] {
  const order: AirportRegion[] = [
    "Asia",
    "Europe",
    "North America",
    "Middle East",
    "Oceania",
    "Africa",
    "South America",
  ];
  return order.map((region) => ({
    region,
    airports: AIRPORTS.filter((a) => a.region === region),
  }));
}
