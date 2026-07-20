import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

const MAX_BYTES = 8 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<string> {
  // Downscale large images client-side so payload stays small.
  const bitmap = await createImageBitmap(file);
  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function UploadPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"scene" | "selfie">("scene");
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 从 results 页面返回时，清理旧的分析结果，让用户能重新开始
  useEffect(() => {
    const returnFlag = sessionStorage.getItem("posepal.returning");
    if (returnFlag === "1") {
      sessionStorage.removeItem("posepal.returning");
      sessionStorage.removeItem("posepal.result");
      sessionStorage.removeItem("posepal.image");
      sessionStorage.removeItem("posepal.mode");
    }
  }, []);

  const handleFile = async (file: File | undefined | null) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image too large (max 8MB).");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
    } catch {
      setError("Couldn't read that image. Try another.");
    }
  };

  // 点击示例场景：直接用 URL 预览（避免 fetch+blob+dataURL 的卡顿）
  // 实际分析时仍会通过 fileToDataUrl 转换
  const handleExampleScene = async (src: string) => {
    setError(null);
    try {
      // 预加载图片，确认可访问
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("load failed"));
        img.src = src;
      });
      // 直接用 URL 作为预览，后续分析时再转 dataURL
      setPreview(src);
    } catch {
      setError("Couldn't load that scene. Try uploading your own photo.");
    }
  };

  // 开始分析：如果 preview 是 URL（示例场景），先转成 dataURL 再传给 analyzing
  const startAnalysis = async () => {
    if (!preview) return;
    let dataUrl = preview;
    if (!preview.startsWith("data:")) {
      // 示例场景图：转 dataURL
      try {
        const res = await fetch(preview);
        const blob = await res.blob();
        dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      } catch {
        setError("Couldn't load that scene. Try uploading your own photo.");
        return;
      }
    }
    sessionStorage.setItem("posepal.image", dataUrl);
    sessionStorage.setItem("posepal.mode", mode);
    sessionStorage.removeItem("posepal.result");
    navigate({ to: "/analyzing" });
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 right-0 h-96 w-96 rounded-full bg-blush/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-rose/20 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link to="/" className="flex items-center gap-2 text-ink">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            fill="none"
            className="h-7 w-7 text-ink"
            aria-hidden="true"
          >
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M 20 11 C 23.5 9, 27 11.5, 27 15.5 C 27 18.5, 24.5 20.5, 24 22.5 C 23.5 24.5, 25 26, 26.5 27 C 29 29, 32 32, 34 36 C 35.5 39, 35.5 41, 34.5 42"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="24" cy="24" r="2" fill="#c9806a" />
          </svg>
          <span className="font-display text-lg">PosePal</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          {t("uploadBack")}
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-24 pt-6 sm:px-10">
        <div className="animate-fade-up text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("uploadStep")}</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl text-balance">
            {t("uploadTitle")}
          </h1>
          <p className="mt-4 text-muted-foreground text-balance">
            {t("uploadDesc")}
          </p>
        </div>

        {/* Mode tabs */}
        <div
          className="animate-fade-up mt-8 flex justify-center"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="inline-flex rounded-full border border-ink/10 bg-card/60 p-1 backdrop-blur">
            {(["scene", "selfie"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  mode === m ? "bg-ink text-cream" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "scene" ? t("uploadSceneMode") : t("uploadSelfieMode")}
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`animate-fade-up mt-8 rounded-[2.5rem] border-2 border-dashed p-2 transition ${
            dragOver ? "border-rose bg-blush/20" : "border-ink/15"
          }`}
          style={{ animationDelay: "0.2s" }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="glass-card relative flex min-h-[22rem] flex-col items-center justify-center overflow-hidden rounded-[2rem] p-8 text-center sm:min-h-[26rem]">
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                <button
                  onClick={() => {
                    setPreview(null);
                    inputRef.current && (inputRef.current.value = "");
                  }}
                  className="absolute right-4 top-4 rounded-full bg-cream/90 px-3 py-1.5 text-xs font-medium text-ink backdrop-blur"
                >
                  {t("uploadReplace")}
                </button>
              </>
            ) : (
              <>
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-ink text-cream">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-2xl">{t("uploadDropHere")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("uploadOrTap")}
                </p>
                <button onClick={() => inputRef.current?.click()} className="ink-button mt-6">
                  {t("uploadChoose")}
                </button>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </div>

        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

        {preview && (
          <div className="animate-fade-up mt-8 flex justify-center">
            <button onClick={startAnalysis} className="ink-button text-base">
              {t("uploadStart")}
            </button>
          </div>
        )}

        {/* Example scenes — 点击直接用该场景图分析 */}
        {!preview && (
          <div className="mt-12">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-ink/20" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {t("uploadExamples")}
              </p>
              <span className="h-px w-8 bg-ink/20" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:gap-3">
              {EXAMPLE_SCENES.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => handleExampleScene(scene.src)}
                  className="group relative aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-2xl border border-ink/10 bg-card/60 transition hover:border-ink/30 hover:shadow-[var(--shadow-soft)] sm:w-auto"
                >
                  <img
                    src={scene.src}
                    alt={scene.label}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                    <span className="font-display text-sm text-cream">{scene.label}</span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-cream/80"
                    >
                      <path
                        d="M5 12h14M13 5l7 7-7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {t("uploadTapToTry")}
            </p>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {t("uploadPrivacy")}
        </p>
      </section>
    </main>
  );
}

const EXAMPLE_SCENES = [
  { id: "beach", label: "Beach", src: "/scenes/beach.jpg" },
  { id: "exhibition", label: "Gallery", src: "/scenes/exhibition.jpg" },
  { id: "street", label: "Street", src: "/scenes/street.jpg" },
  { id: "park", label: "Park", src: "/scenes/park.jpg" },
];
