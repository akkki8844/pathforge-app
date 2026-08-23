import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Illustration } from "@/components/ui/not-found";
import { useAuth } from "@/contexts/AuthContext";

const SEARCH_INDEX = [
  { label: "Dashboard", path: "/dashboard", terms: ["dashboard", "home"] },
  { label: "Journey", path: "/journey", terms: ["journey", "levels", "tasks", "roadmap"] },
  { label: "Profile", path: "/profile", terms: ["profile", "account", "settings"] },
  { label: "Colleges", path: "/colleges", terms: ["colleges", "universities", "schools"] },
  { label: "Activities", path: "/activities", terms: ["activities", "extracurriculars", "competitions", "olympiads"] },
  { label: "Outcomes", path: "/outcomes", terms: ["outcomes", "chances", "admissions"] },
  { label: "Readiness", path: "/readiness", terms: ["readiness", "report", "analysis"] },
  { label: "Recommendations", path: "/recommendations", terms: ["recommendations", "recs", "suggestions"] },
  { label: "Scholarships", path: "/scholarships", terms: ["scholarships", "financial aid"] },
  { label: "Pricing", path: "/pricing", terms: ["pricing", "plans", "subscription", "credits"] },
  { label: "About", path: "/about", terms: ["about", "team", "company"] },
  { label: "Contact", path: "/contact", terms: ["contact", "support", "help"] },
  { label: "FAQ", path: "/faq", terms: ["faq", "questions", "help"] },
  { label: "Privacy", path: "/privacy", terms: ["privacy", "policy"] },
  { label: "Terms", path: "/terms", terms: ["terms", "conditions"] },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const signedIn = !!user && !isGuest;

  const [query, setQuery] = useState("");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        item.terms.some((term) => term.includes(q))
    );
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matches.length > 0) {
      navigate(matches[0].path);
    }
  };

  return (
    <div className="relative flex min-h-[100svh] w-full flex-col justify-center bg-background p-6 md:p-10">
      <Seo
        title="Page Not Found — Pathforge"
        description="The page you're looking for doesn't exist. Return to Pathforge to keep planning your college journey."
        path={location.pathname}
        noindex
      />

      <div className="relative mx-auto w-full max-w-5xl">
        <Illustration className="absolute inset-0 h-[50vh] w-full text-blue-600 opacity-[0.05] dark:text-blue-400 dark:opacity-[0.04]" />

        <div className="relative z-[1] pt-52 text-center">
          <h1 className="mt-4 text-balance text-5xl font-semibold tracking-tight text-blue-700 dark:text-blue-400 sm:text-7xl">
            Page not found
          </h1>
          <p className="mt-6 text-pretty text-lg font-medium text-muted-foreground sm:text-xl/8">
            There's nothing at <span className="font-mono text-foreground/80">{location.pathname}</span>.
            It may have moved, or the link may be out of date.
          </p>

          <form
            onSubmit={handleSubmit}
            className="relative mx-auto mt-10 flex flex-col gap-y-3 sm:max-w-sm sm:flex-row sm:space-x-2"
          >
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-blue-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit(e);
                }}
                placeholder="Search Pathforge"
                aria-label="Search Pathforge"
                className="border-blue-200 bg-white pl-8 focus-visible:ring-blue-300 dark:border-blue-900 dark:bg-slate-950"
              />
              {matches.length > 0 && (
                <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-blue-200 bg-white py-1 text-left shadow-lg dark:border-blue-900 dark:bg-slate-950">
                  {matches.map((item) => (
                    <li key={item.path}>
                      <button
                        type="button"
                        onClick={() => navigate(item.path)}
                        className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        {item.label}{" "}
                        <span className="text-xs text-muted-foreground">{item.path}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={!query.trim() || matches.length === 0}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              Search
            </Button>
          </form>

          <div className="mt-10 flex flex-col gap-y-3 gap-x-6 sm:flex-row sm:items-center sm:justify-center">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              className="group bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              <ArrowLeft
                className="me-2 ms-0 opacity-60 transition-transform group-hover:-translate-x-0.5"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
              Go back
            </Button>
            <Button
              asChild
              className="-order-1 bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400 sm:order-none"
            >
              <Link to={signedIn ? "/dashboard" : "/"}>Take me home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
