import { getZhipuApiKey } from "./zhipu-config";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateZhipuToken } from "./zhipu-jwt";

const InputSchema = z.object({
  title: z.string().default(""),
  pose: z.string().min(1),
  vibe: z.string().default(""),
  cameraAngle: z.string().default(""),
  facingDirection: z.string().default(""),
  composition: z.string().default(""),
  anchorInteraction: z.string().default(""),
  sceneContext: z.string().default(""),
});

export type PoseSketchResult = { url: string | null; reason?: string };

/**
 * 构造文生图 prompt，生成场景感知、中性优雅的人物姿势线稿。
 * 核心改进：把场景尺寸（桌椅高度、相机距离）注入 prompt，让 CogView
 * 像看到场景一样生成正确比例的人形；风格上中性舒展、艺术感更强。
 */
function buildSketchPrompt(input: {
  pose: string;
  title: string;
  vibe: string;
  cameraAngle: string;
  facingDirection: string;
  composition: string;
  anchorInteraction: string;
  sceneContext: string;
}): string {
  const facing = normalizeFacing(input.facingDirection);
  const parts: string[] = [
    "A clean, artistic AI photography pose guide overlay.",
    "A single figure full-body pose reference drawn as an elegant black line diagram.",
    "",
    "CRITICAL — FULL BODY VISIBLE (no clipping):",
    "The ENTIRE figure MUST be visible from the top of the head to the bottom of the feet.",
    "Leave generous white space above the head and below the feet — at least 8% of the canvas height on each end.",
    "NEVER cut off the head, feet, or any limb at the canvas edge.",
    "If seated, the full seated body (including bent knees and feet) must fit within the canvas.",
    "Center the figure horizontally with at least 10% white space on each side.",
    "",
    "GENDER: The figure is a young woman. Draw her as FEMALE but NEUTRAL and ELEGANT —",
    "do NOT exaggerate or emphasize body curves, chest, or hips.",
    "Long hair flowing past the shoulders (one simple shape).",
    "Slender, graceful, relaxed proportions (head-to-body ~1:7).",
    "The figure should feel calm, spacious, and artistic — like a modern dance sketch or editorial gesture drawing.",
    "",
    "STYLE (prioritize artistry + readability):",
    "elegant flowing continuous line, like a modern gesture drawing or contemporary dance sketch,",
    "thin but confident black outline, mostly uniform weight with slight variation at joints for grace,",
    "relaxed, spacious,舒展 (stretched-out, expansive) posture — never stiff or rigid,",
    "minimal but with artistic sensitivity — NOT a cold technical diagram, NOT a fashion croquis,",
    "blank oval head (no face), simple flowing garment outline (a relaxed dress or draped fabric, NO texture/pattern),",
    "no shadows, no background, pure white background.",
    "",
    "Show the exact body position with artistic clarity:",
    "- posture (standing / seated / leaning)",
    "- body direction and weight distribution",
    "- head angle and gaze",
    "- arm placement (relaxed, not stiff)",
    "- hand position",
    "- leg position",
    "The limbs should look relaxed and natural, with a sense of flow and ease.",
    "",
    "CRITICAL — SCENE SCALE (use this to size the figure correctly):",
    "The figure will be overlaid on a real photo. Size her to match these real-world references:",
  ];
  if (input.sceneContext) {
    parts.push(input.sceneContext);
  } else {
    parts.push(
      "She is about 1.65m tall. If standing, her full height fills most of the frame. If seated, her hips are at ~0.45m height.",
    );
  }
  parts.push(
    "Draw her at the correct RELATIVE scale — her body parts should align with where real furniture would be.",
    "",
    "CRITICAL — NO PROPS, NO FURNITURE:",
    "Draw ONLY the human figure on pure white background.",
    "ABSOLUTELY NO chairs, stools, tables, doors, walls, windows, plants, or any object.",
    "If seated: thighs horizontal, knees bent ~90°, hips lowered as if on an invisible seat — draw NOTHING under her.",
    "If leaning: body angled as if against an invisible surface — draw NO surface.",
    "If touching: hand placed where a table/wall would be — draw NO table/wall.",
    "The real furniture in the target photo provides the object.",
    "",
    "Designed to overlay on a real photo:",
    "high visibility, clean flowing silhouette, blends naturally with real images,",
    "pure white background (will be keyed transparent), centered, generous white space around the figure.",
    "",
    "Style reference: modern gesture drawing, contemporary dance sketch, editorial pose study, AR camera guidance — artistic but readable.",
    "",
    "The figure must illustrate exactly this pose:",
    `POSE: ${input.pose}`,
  );
  if (facing) parts.push(`FACING: ${facing}.`);
  if (input.anchorInteraction)
    parts.push(
      `BODY INTERACTION (draw her body to suggest this, draw NO object): ${input.anchorInteraction}.`,
    );
  if (input.cameraAngle) parts.push(`CAMERA: ${input.cameraAngle}.`);
  if (input.composition) parts.push(`COMPOSITION: ${input.composition}.`);
  if (input.vibe) parts.push(`MOOD: ${input.vibe}.`);
  if (input.title) parts.push(`SHOT NAME: ${input.title}.`);
  parts.push(
    "FINAL CHECK: (1) figure is a calm, neutral, elegant young woman, (2) NO furniture/props, (3) pose matches instruction with relaxed artistic flow, (4) correct scale per scene references. If any check fails, the result is wrong.",
  );
  return parts.join("\n");
}

/** 把模型给出的朝向描述归整成几个稳定取值，喂给文生图更可控。 */
function normalizeFacing(raw: string): string {
  const f = raw.trim().toLowerCase();
  if (!f) return "";
  if (f.includes("3/4") && f.includes("left")) return "three-quarter turn to her left";
  if (f.includes("3/4") && f.includes("right")) return "three-quarter turn to her right";
  if (f === "left") return "facing her left, profile-ish";
  if (f === "right") return "facing her right, profile-ish";
  if (f.includes("back")) return "back to camera";
  if (f.includes("front") || f.includes("center")) return "facing the camera straight on";
  return f;
}

/**
 * Generate a recommended-pose line-art sketch via Zhipu CogView-3-Flash (free).
 * Returns { url: null } when no API key is configured so the UI can degrade
 * gracefully instead of throwing.
 */
export const generatePoseSketch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<PoseSketchResult> => {
    const apiKey = getZhipuApiKey();
    console.log("[generatePoseSketch] ZHIPU_API_KEY present?", !!apiKey);
    if (!apiKey) return { url: null, reason: "missing_key" };

    const prompt = buildSketchPrompt({
      pose: data.pose,
      title: data.title,
      vibe: data.vibe,
      cameraAngle: data.cameraAngle,
      facingDirection: data.facingDirection,
      composition: data.composition,
      anchorInteraction: data.anchorInteraction,
      sceneContext: data.sceneContext,
    });
    const model = process.env.ZHIPU_IMAGE_MODEL || "cogview-3-flash";

    // CogView-3-Flash 的内容安全过滤（error 1301）是偶发/随机的：
    // 同一 prompt 有时 200 有时 400。重试几次通常就能过，因此这里做最多 3 次重试。
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch("https://open.bigmodel.cn/api/paas/v4/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${generateZhipuToken(apiKey)}`,
          },
          body: JSON.stringify({ model, prompt, size: "864x1152" }),
        });

        if (res.ok) {
          const json = await res.json();
          const url: string | null = json?.data?.[0]?.url ?? null;
          console.log("[generatePoseSketch] attempt", attempt, "url present?", !!url);
          if (url) {
            // 关键：CogView 返回的是远程 URL，客户端直接画到 canvas 会跨域污染画布，
            // 导致合成图 toDataURL 失败。因此服务端把图片下载成 base64 data URL 再返回，
            // 客户端就能自由地把线稿叠加到原图上并导出。
            try {
              const imgRes = await fetch(url);
              if (imgRes.ok) {
                const buf = Buffer.from(await imgRes.arrayBuffer());
                const ct = imgRes.headers.get("content-type") || "image/png";
                const dataUrl = `data:${ct};base64,${buf.toString("base64")}`;
                return { url: dataUrl };
              }
              // 下载失败则退回远程 url（至少能单独展示，只是无法合成）
              console.warn("[generatePoseSketch] image download failed, fallback to remote url");
              return { url };
            } catch (e) {
              console.error("[generatePoseSketch] image download error", e);
              return { url };
            }
          }
          // 200 但没拿到 url，也重试
          console.warn(`CogView attempt ${attempt}: 200 but no url`);
        } else {
          const body = await res.text();
          console.error(`CogView attempt ${attempt} error`, res.status, body);
          // 429 限流也值得重试；其它非过滤错误再试一次也无妨
        }
      } catch (e) {
        console.error(`CogView attempt ${attempt} request failed`, e);
      }
      // 重试前短暂等待，避开瞬时限流
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 600));
    }

    return { url: null, reason: "generation_failed" };
  });
