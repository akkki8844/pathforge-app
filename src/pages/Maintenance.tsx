import logo from "@/assets/pathforge-logo.webp";

export default function Maintenance() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <img
        src={logo}
        alt="Pathforge logo"
        width={96}
        height={96}
        className="h-24 w-24 rounded-2xl object-contain"
      />
      <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
        We are sorry, the website is undergoing downtime. It will be back up soon.
      </h1>
      <p className="max-w-xl text-base text-muted-foreground">
        Our team is working on it. Please check back shortly.
      </p>
    </main>
  );
}
