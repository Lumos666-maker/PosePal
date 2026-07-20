import { createFileRoute, Link } from "@tanstack/react-router";
import { I18nProvider, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({ component: LandingWithI18n });

function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      className="rounded-full border border-ink/15 bg-card/70 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-card"
      aria-label="Toggle language"
    >
      {lang === "en" ? "中文" : "EN"}
    </button>
  );
}

function Landing() {
  const { t } = useI18n();

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-blush/40 blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-rose/25 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-sand/50 blur-3xl animate-float-slow" style={{ animationDelay: "4s" }} />
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <a href="/" className="flex items-center gap-2 text-ink">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className="h-8 w-8 text-ink" aria-hidden="true">
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 20 11 C 23.5 9, 27 11.5, 27 15.5 C 27 18.5, 24.5 20.5, 24 22.5 C 23.5 24.5, 25 26, 26.5 27 C 29 29, 32 32, 34 36 C 35.5 39, 35.5 41, 34.5 42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="24" cy="24" r="2" fill="#c9806a" />
          </svg>
          <span className="font-display text-xl tracking-tight">PosePal</span>
        </a>
        <div className="hidden gap-8 text-sm text-muted-foreground sm:flex">
          <a href="#about" className="transition hover:text-foreground">{t("navAbout")}</a>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle />
          <Link to="/upload" className="rounded-full border border-ink/15 bg-card/70 px-4 py-2 text-sm font-medium backdrop-blur">
            {t("navStart")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 text-center sm:px-10 sm:pt-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-card/60 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-rose" /> {t("heroBadge")}
          </span>
        </div>

        <h1 className="animate-fade-up mt-8 font-display text-5xl leading-[1.05] text-balance sm:text-7xl md:text-[5.5rem]" style={{ animationDelay: "0.1s" }}>
          {t("heroTitle1")}
          <br />
          <em className="italic text-rose">{t("heroTitle2")}</em>
        </h1>

        <p className="animate-fade-up mx-auto mt-8 max-w-xl text-lg text-muted-foreground text-balance" style={{ animationDelay: "0.2s" }}>
          {t("heroDesc")}
        </p>

        <div className="animate-fade-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: "0.3s" }}>
          <Link to="/upload" className="ink-button text-base">
            {t("heroCta")}
          </Link>
          <span className="text-sm text-muted-foreground">{t("heroCtaNote")}</span>
        </div>

        {/* Preview cards */}
        <div className="animate-fade-up mt-24 grid gap-6 sm:grid-cols-3" style={{ animationDelay: "0.4s" }}>
          {[
            { t: t("feature1Title"), d: t("feature1Desc") },
            { t: t("feature2Title"), d: t("feature2Desc") },
            { t: t("feature3Title"), d: t("feature3Desc") },
          ].map((c, i) => (
            <div key={i} className="glass-card rounded-3xl p-6 text-left transition-transform hover:-translate-y-1">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-cream font-display">
                {i + 1}
              </div>
              <h3 className="font-display text-xl">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-5xl px-6 pt-16 pb-24 sm:px-10 sm:pt-24">
        <div className="animate-fade-up glass-card rounded-3xl p-8 sm:p-12">
          <h2 className="mb-6 text-center font-display text-4xl text-ink sm:text-5xl">{t("aboutTitle")}</h2>
          <p className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-muted-foreground text-balance">
            {t("aboutDesc")}
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              t("aboutFeature1"),
              t("aboutFeature2"),
              t("aboutFeature3"),
              t("aboutFeature4"),
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-card/40 px-4 py-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-rose/20 text-rose">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-sm text-ink/80">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-center text-xs text-muted-foreground sm:px-10">
        {t("footer")}
      </footer>
    </main>
  );
}

// I18nProvider 已在 __root.tsx 全局包裹
export function LandingWithI18n() {
  return <Landing />;
}
