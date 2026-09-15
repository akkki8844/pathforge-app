import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";

/**
 * What a student sees at any `/test-prep/:testId` whose blueprint isn't
 * built yet — no test is singled out as "the one that works," so this page
 * never names another test to redirect to.
 *
 * It is deliberately not a "coming soon" page with a waiting list or a
 * countdown. Nothing has been promised for a date, so nothing here implies one.
 */
export function TestNotAvailable({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <>
      <Seo
        title={name}
        description={`${subtitle} is not yet available in Pathforge Test Prep.`}
        path={`/test-prep/${name.toLowerCase()}`}
        noindex
      />
      <div className="section-container py-16">
        <div className="mx-auto max-w-md text-center">
          <p className="font-display text-2xl font-bold tracking-tight text-foreground">{name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <p className="mt-6 text-sm text-muted-foreground">
            The {name} is not built out yet, and there is no date for it.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
