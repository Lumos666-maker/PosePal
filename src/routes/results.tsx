import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { AnalyzeResult } from "@/lib/analyze-pose.functions";
import { composeSketchOnPhoto } from "@/lib/pose-overlay";
import { generatePoseSketch } from "@/lib/generate-pose-image.functions";
import { findTemplate } from "@/lib/pose-templates";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/results")({
  component: ResultsPage,
});

function ResultsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const genSketch = useServerFn(generatePoseSketch);
  // 原始推荐线稿（用于底部单独展示 + 合成）
  const [sketches, setSketches] = useState<Record<number, { url: string | null; reason?: string }>>(
    {},
  );
  // 合成图：原图 + 推荐线稿叠加（用于"效果示意"框）
  const [composites, setComposites] = useState<Record<number, string | null>>({});
  const sketchLoading = useRef<Set<number>>(new Set());
  const composeLoading = useRef<Set<number>>(new Set());

  useEffect(() => {
    const r = sessionStorage.getItem("posepal.result");
    const img = sessionStorage.getItem("posepal.image");
    if (!r || !img) {
      navigate({ to: "/upload" });
      return;
    }
    try {
      setResult(JSON.parse(r));
      setImage(img);
    } catch {
      navigate({ to: "/upload" });
    }
  }, [navigate]);

  // 清理旧版 sketch 缓存（v1/v2 存的是 url，与新的合成逻辑无关，避免命中脏数据）
  useEffect(() => {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && /^posepal\.sketch(\.v2)?\.\d+$/.test(key)) {
        sessionStorage.removeItem(key);
      }
    }
  }, []);

  // 为当前选中的建议加载姿势线稿：
  // 优先用预制模板（瞬间加载、风格统一、无男性化问题），
  // 无 templateId 时 fallback 到 CogView 生成。
  // selfie 模式不需要线稿叠加，直接跳过。
  useEffect(() => {
    if (!result) return;
    // selfie 模式不加载线稿
    if (result.mode === "selfie") return;
    const poses = result.data.poses ?? [];
    const pose = poses[active];
    if (!pose) return;
    // 已加载过就跳过
    if (sketches[active] !== undefined) return;
    if (sketchLoading.current.has(active)) return;

    // 路径 A：有 templateId → 直接用预制模板图，跳过 CogView
    if (pose.templateId) {
      const template = findTemplate(pose.templateId);
      if (template) {
        setSketches((s) => ({ ...s, [active]: { url: template.src } }));
        return;
      }
    }

    // 路径 B：无 templateId（或模板不存在）→ fallback 到 CogView 生成
    sketchLoading.current.add(active);
    const data = result.data as Partial<{
      sceneType: string;
      sceneAnchors: Array<{ name: string; realWorldHeightM: number }>;
    }>;
    const anchors = data.sceneAnchors ?? [];
    const sceneType = data.sceneType ?? "";
    const sceneContext = [
      sceneType ? `Scene: ${sceneType}.` : "",
      "She is about 1.65m tall with shoulder width ~0.42m.",
      ...anchors.map(
        (a: { name: string; realWorldHeightM: number }) =>
          `Nearby object: ${a.name} (${a.realWorldHeightM}m tall in real life). She should be sized relative to this.`,
      ),
    ]
      .filter(Boolean)
      .join(" ");

    let cancelled = false;
    genSketch({
      data: {
        title: pose.title,
        pose: pose.pose,
        vibe: pose.vibe,
        cameraAngle: pose.cameraAngle,
        facingDirection: pose.facingDirection,
        composition: pose.composition,
        anchorInteraction: pose.anchorInteraction,
        sceneContext,
      },
    })
      .then((r) => {
        if (!cancelled) setSketches((s) => ({ ...s, [active]: r }));
      })
      .catch(() => {
        if (!cancelled)
          setSketches((s) => ({
            ...s,
            [active]: { url: null, reason: "generation_failed" },
          }));
      })
      .finally(() => {
        if (!cancelled) sketchLoading.current.delete(active);
      });

    return () => {
      cancelled = true;
    };
  }, [result, active, sketches, genSketch]);

  // 拿到线稿后，把它叠加合成到原图上，作为"效果示意"图
  useEffect(() => {
    if (!image) return;
    const sk = sketches[active];
    if (!sk) return; // 线稿还没回来
    if (active in composites) return;
    if (composeLoading.current.has(active)) return;

    if (!sk.url) {
      // 线稿没生成（无 key / 失败）→ 效果示意就直接用原图兜底
      setComposites((c) => ({ ...c, [active]: null }));
      return;
    }

    let cancelled = false;
    composeLoading.current.add(active);
    const currentPose = result?.data?.poses?.[active];
    const sceneData = result?.data as any;
    const sceneAnchors = sceneData?.sceneAnchors || [];
    // 模板图是 URL（如 /poses/xxx.jpg），合成函数需要 dataURL 或同源 URL
    // fetch 同源资源转 dataURL，避免 canvas 跨域污染
    const sketchUrl = sk.url;
    const sketchDataUrlPromise: Promise<string> = sketchUrl.startsWith("data:")
      ? Promise.resolve(sketchUrl)
      : fetch(sketchUrl)
          .then((r) => r.blob())
          .then(
            (b) =>
              new Promise<string>((resolve) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result as string);
                fr.readAsDataURL(b);
              }),
          )
          .catch(() => sketchUrl); // fallback：直接用 URL（可能跨域失败）

    sketchDataUrlPromise
      .then((sketchDataUrl) =>
        composeSketchOnPhoto(image, sketchDataUrl, currentPose?.layoutBox, {
          label: currentPose?.title || "推荐姿势",
          sceneAnchors,
          framing: (currentPose as any)?.framing || "",
        }),
      )
      .then((res) => {
        if (!cancelled) setComposites((c) => ({ ...c, [active]: res }));
      })
      .catch(() => {
        if (!cancelled) setComposites((c) => ({ ...c, [active]: null }));
      })
      .finally(() => composeLoading.current.delete(active));

    return () => {
      cancelled = true;
    };
  }, [image, active, sketches, composites, result]);

  if (!result || !image) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading your shots…</p>
      </main>
    );
  }

  const isScene = result.mode === "scene";
  const data = result.data;
  const poses = data.poses ?? [];
  const heading = isScene
    ? (data as any).sceneType || t("resultsYourScene")
    : (data as any).faceShape || t("resultsYourAngles");
  const mood = (data as any).moodWord || "Mood";

  const currentComposite = active in composites ? composites[active] : undefined;
  const currentSketch = active in sketches ? sketches[active] : undefined;
  const currentPose = poses[active];

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      {/* ── 全屏取景器：原图或合成图 ── */}
      <div className="absolute inset-0">
        {/* selfie 模式直接显示原图，不加载线稿叠加 */}
        {!isScene ? (
          <img src={image} alt="Your selfie" className="h-full w-full object-cover" />
        ) : currentComposite === undefined ? (
          <ViewfinderLoading image={image} />
        ) : currentComposite ? (
          <img
            src={currentComposite}
            alt="AR pose overlay on your scene"
            className="h-full w-full object-cover"
          />
        ) : image ? (
          <img src={image} alt="Your scene" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-white/60">No image</div>
        )}
      </div>

      {/* ── 顶部栏 ── */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4 sm:px-6">
        <Link
          to="/upload"
          onClick={() => sessionStorage.setItem("posepal.returning", "1")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
          aria-label="Close"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Pose Overlay
          <span className="ml-1 h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <button
          onClick={() => setShowTips((v) => !v)}
          className="flex h-10 items-center gap-1.5 rounded-full bg-black/50 px-3 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/70"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
          </svg>
          Tips
        </button>
      </div>

      {/* ── 浮动信息卡片（深色半透明） ── */}
      {currentPose && (
        <>
          {/* 左上：姿势标题 + 身体方向 */}
          <div className="absolute left-4 top-20 z-10 max-w-[200px] sm:left-6">
            <div className="rounded-2xl bg-black/55 p-3.5 backdrop-blur-md">
              <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-400">
                {currentPose.vibe}
              </p>
              <h3 className="mt-1 font-display text-xl leading-tight text-white">
                <em className="italic">{currentPose.title}</em>
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/70">{currentPose.pose}</p>
            </div>
          </div>

          {/* 左下：机位 */}
          <div className="absolute bottom-28 left-4 z-10 sm:left-6">
            <div className="rounded-2xl bg-black/55 p-3 backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white/60"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">
                  Camera Position
                </p>
              </div>
              <p className="mt-1 text-xs text-white">{currentPose.cameraAngle}</p>
            </div>
          </div>

          {/* 右侧：场景交互 / 手部位置 */}
          {currentPose.anchorInteraction && (
            <div className="absolute right-4 top-24 z-10 max-w-[180px] sm:right-6">
              <div className="rounded-2xl bg-black/55 p-3 backdrop-blur-md">
                <div className="flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-white/60"
                  >
                    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                  </svg>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">Hand / Body</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-white">
                  {currentPose.anchorInteraction}
                </p>
              </div>
            </div>
          )}

          {/* 右下：构图提示 */}
          <div className="absolute bottom-28 right-4 z-10 max-w-[170px] sm:right-6">
            <div className="rounded-2xl bg-black/55 p-3 backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white/60"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                </svg>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">Composition</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white">{currentPose.composition}</p>
            </div>
          </div>

          {/* "Full body in frame" 确认 */}
          {currentComposite && (
            <div className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2">
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 backdrop-blur-md">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-400"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-[10px] font-medium text-emerald-300">Full body in frame</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tips 面板 ── */}
      {showTips && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setShowTips(false)}
        >
          <div
            className="max-w-md rounded-3xl bg-zinc-900 p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl">Scene Analysis</h3>
              <button onClick={() => setShowTips(false)} className="text-white/60 hover:text-white">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="text-white/40">Mood</span>
                <span className="text-rose-300">{mood}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-white/40">Scene</span>
                <span>{heading}</span>
              </div>
              {isScene && (
                <>
                  <div className="flex gap-2">
                    <span className="text-white/40">Light</span>
                    <span className="text-white/80">{(data as any).lightDirection}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-white/40">Quality</span>
                    <span className="text-white/80">{(data as any).lightQuality}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-white/40">Best spot</span>
                    <span className="text-white/80">{(data as any).bestSpots}</span>
                  </div>
                </>
              )}
              {!isScene && (() => {
                const diag = (data as any).selfieDiagnosis;
                if (!diag) return null;
                return (
                  <>
                    <div className="flex gap-2">
                      <span className="text-white/40">Face</span>
                      <span className="text-white/80">{diag.faceShapeCn} ({diag.faceShape})</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-white/40">Skin</span>
                      <span className="text-white/80">{diag.skinToneCn} ({diag.skinTone})</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-white/40">Eyes</span>
                      <span className="text-white/80">{diag.eyeTypeCn} ({diag.eyeType})</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-white/40">Angle</span>
                      <span className="text-white/80">{diag.bestAngle}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-white/40">Light</span>
                      <span className="text-white/80">{diag.bestLight}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-white/40">Style</span>
                      <span className="text-rose-300">{diag.styleSuggestion}</span>
                    </div>
                    {diag.adjustmentTips?.length > 0 && (
                      <div className="border-t border-white/10 pt-2">
                        <span className="mb-1 block text-xs text-white/40">{t("resultsTip")}s</span>
                        <ul className="space-y-0.5">
                          {diag.adjustmentTips.map((tip: string, i: number) => (
                            <li key={i} className="text-[11px] leading-snug text-white/70">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()}
              {currentPose?.avoid && (
                <div className="flex gap-2 border-t border-white/10 pt-3">
                  <span className="text-white/40">{t("resultsTip")}</span>
                  <span className="text-white/80">{currentPose.avoid}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 底部相机控制栏 ── */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="flex items-end justify-between px-6 pb-6 pt-3">
          {/* 左：缩略图 */}
          <div className="h-12 w-12 overflow-hidden rounded-xl border-2 border-white/30">
            <img src={image ?? ""} alt="" className="h-full w-full object-cover" />
          </div>

          {/* 中：快门按钮 */}
          <Link
            to="/upload"
            onClick={() => sessionStorage.setItem("posepal.returning", "1")}
            className="flex h-16 w-16 items-center justify-center rounded-full ring-4 ring-white/30 transition active:scale-90"
          >
            <div className="h-13 w-13 rounded-full bg-white" style={{ width: 52, height: 52 }} />
          </Link>

          {/* 右：翻转/新照片 */}
          <button
            onClick={() => {
              sessionStorage.setItem("posepal.returning", "1");
              navigate({ to: "/upload" });
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
            aria-label="New photo"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>

        {/* 姿势切换 tabs（相机模式风格） */}
        <div className="flex justify-center gap-1 pb-4">
          {poses.map((p, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                active === i
                  ? "bg-emerald-500/90 text-white"
                  : "bg-black/40 text-white/50 backdrop-blur-md hover:text-white/80"
              }`}
            >
              {i + 1} · {p.title.split(" ").slice(0, 2).join(" ")}
            </button>
          ))}
        </div>
      </div>

      {/* Demo mode notice */}
      {result.demo && (
        <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2">
          <div className="rounded-full bg-rose/80 px-4 py-1.5 text-[11px] font-medium text-white backdrop-blur-md">
            Demo mode — add ZHIPU_API_KEY for real analysis
          </div>
        </div>
      )}
    </main>
  );
}

function ViewfinderLoading({ image }: { image: string | null }) {
  return (
    <div className="relative h-full w-full">
      {image && <img src={image} alt="" className="h-full w-full object-cover" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p className="mt-3 text-xs text-white/70">Rendering pose overlay…</p>
      </div>
    </div>
  );
}
