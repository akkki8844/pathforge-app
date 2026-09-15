/**
 * Shared shape for a web-sourced professor.
 *
 * Lives in its own module because both the results panel and the compose
 * dialog need it, and importing the type from the panel would drag the panel's
 * whole component tree into the dialog's chunk.
 *
 * The optional fields come from the `find-professors` enrichment pass, which
 * reads the professor's own faculty page. They are optional because that pass
 * is allowed to come back empty rather than guess — a page with no publication
 * list yields no publications, not an invented one.
 */
export interface Publication {
  title: string;
  venue?: string;
  year?: string;
  url?: string;
}

export interface Professor {
  name: string;
  title: string;
  department: string;
  university: string;
  email: string;
  profile_url: string;
  research_interests: string[];
  country: string;
  email_source_url: string;
  /** A few sentences on what they work on, from their faculty page. */
  bio?: string;
  /** Appointments, prior institutions, lab roles, honours. */
  experience?: string[];
  /** Selected papers, as listed on their own page. */
  publications?: Publication[];
}
