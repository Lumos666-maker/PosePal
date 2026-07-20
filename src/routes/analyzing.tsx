import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzePose } from "@/lib/analyze-pose.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/analyzing")({
  component: AnalyzingPage,
});

const STEPS = [
  "analyzeStep1",
  "analyzeStep2",
  "analyzeStep3",
  "analyzeStep4",
] as const;

function AnalyzingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const analyze = useServerFn(analyzePose);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const img = sessionStorage.getItem("posepal.image");
    const mode = (sessionStorage.getItem("posepal.mode") as "scene" | "selfie") || "scene";
    if (!img) {
      navigate({ to: "/upload" });
      return;
    }
    setImage(img);

    const timer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 1400);

    let cancelled = false;

    (async () => {
      try {
        const result = await analyze({ data: { imageDataUrl: img, mode } });
        if (cancelled) return;
        sessionStorage.setItem("posepal.result", JSON.stringify(result));
        setTimeout(() => {
          if (!cancelled) navigate({ to: "/results" });
        }, 400);
      } catch (e) {
        if (cancelled) return;
        console.error("[analyzing] analyze failed:", e);
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
      } finally {
        if (!cancelled) clearInterval(timer);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [analyze, navigate]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-blush/20 via-transparent to-rose/20" />
        <div className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose/15 blur-3xl animate-float-slow" />
      </div>

      <div className="w-full max-w-md text-center">
        {image && (
          <div className="relative mx-auto mb-10 aspect-[4/5] w-56 overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
            <img src={image} alt="Analyzing" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
            <div
              className="absolute inset-x-0 h-24 opacity-70"
              style={{
                background: "linear-gradient(180deg, transparent, color-mix(in oklab, var(--rose) 45%, transparent), transparent)",
                animation: "shimmer 2.2s linear infinite",
                backgroundSize: "100% 400px",
              }}
            />
          </div>
        )}

        {!error ? (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">PosePal</p>
            <h1 className="mt-4 font-display text-3xl sm:text-4xl text-balance">
              {t(STEPS[stepIndex])}
            </h1>

            <ul className="mt-10 space-y-3 text-left">
              {STEPS.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 rounded-2xl border border-ink/5 bg-card/60 px-4 py-3 backdrop-blur transition ${i <= stepIndex ? "opacity-100" : "opacity-40"}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${i < stepIndex ? "bg-ink text-cream" : i === stepIndex ? "bg-rose text-cream" : "bg-muted text-muted-foreground"}`}>
                    {i < stepIndex ? "✓" : i === stepIndex ? "…" : i + 1}
                  </span>
                  <span className="text-sm">{t(s)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="glass-card rounded-3xl p-8">
            <h2 className="font-display text-2xl">We hit a snag</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button onClick={() => navigate({ to: "/upload" })} className="ink-button mt-6">{t("uploadStart").replace(" →", "")}</button>
          </div>
        )}
      </div>
    </main>
  );
}
