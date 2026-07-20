import { getZhipuApiKey, isDemoMode } from "./zhipu-config";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getTemplateListForPrompt, findPoseByPoseId } from "./pose-templates";
import { generateZhipuToken } from "./zhipu-jwt";
import {
  getLightTypesForPrompt,
  getCompositionRulesForPrompt,
  getSceneTypesForPrompt,
  getPoseLibraryForPrompt,
  getPoseLightMatchesForPrompt,
  getPosesByScene,
  type SceneCategory,
} from "./photography-kb";
import {
  getFaceShapesForPrompt,
  getSkinTonesForPrompt,
  getEyeTypesForPrompt,
  findFaceShapeRule,
  findSkinToneRule,
  findEyeTypeRule,
  SELFIE_STYLE_MVP,
} from "./selfie-knowledge";

const InputSchema = z.object({
  imageDataUrl: z.string().min(20),
  mode: z.enum(["scene", "selfie"]).default("scene"),
});

/**
 * 归一化主体放置框（0~1）。坐标系：左上角 (0,0)，右下角 (1,1)。
 * 标记"主体应该站在画面的哪个区域"，用于把示例人物线稿叠加上去。
 */
export type LayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PoseCard = {
  /** 对应摄影知识库的姿势 id（cafe-1 / exh-3 / out-7 等），便于前端展示对应中文口令 */
  poseId: string;
  title: string;
  vibe: string;
  pose: string;
  position: string;
  cameraAngle: string;
  composition: string;
  avoid: string;
  whyItWorks: string;
  /** 朋友照着念的口语化口令（英文，给 AI 输出；前端可据 poseId 查中文） */
  spokenScript: string;
  /** 表情指导（英文） */
  expression: string;
  /** 主体朝向，指导线稿生成与叠加 */
  facingDirection: string;
  /** 主体应放置的归一化区域，指导线稿叠加位置 */
  layoutBox: LayoutBox;
  /** 该姿势如何与场景参照物交互（如"手肘搁在桌上"、"背靠墙面"） */
  anchorInteraction: string;
  /** 预制模板 ID（从模板库中选择最匹配的） */
  templateId: string;
};

/** 场景中的尺寸参照物（桌椅门窗等），用于校准人物大小 */
export type SceneAnchor = {
  /** 参照物名称，如 "wooden table"、"window frame" */
  name: string;
  /** 真实世界高度（米），如桌子 0.75、门 2.0 */
  realWorldHeightM: number;
  /** 在画面中的归一化区域 */
  box: LayoutBox;
};

/** 光线诊断结果（融合自摄影知识库） */
export type LightDiagnosis = {
  /** 光线类型 id（对应 photography-kb.ts 的 LIGHT_TYPES） */
  lightTypeId: string;
  /** 光线类型英文名 */
  lightType: string;
  /** 光线状态：shoot / adjust / avoid */
  status: "shoot" | "adjust" | "avoid";
  /** 调整建议（英文） */
  advice: string;
  /** 口语化话术（中文，给前端展示） */
  spokenTip: string;
};

export type SceneAnalysis = {
  /** 场景类型 id（cafe-table / exhibition-bookstore / outdoor-grass） */
  sceneCategoryId: string;
  sceneType: string;
  /** 光线诊断（新模块） */
  lightDiagnosis: LightDiagnosis;
  /** 旧字段保留（向后兼容）：主光方向描述 */
  lightDirection: string;
  /** 旧字段保留：光线品质描述 */
  lightQuality: string;
  /** 构图提示（来自知识库 3 条规则） */
  compositionHint: string;
  background: string;
  foreground: string;
  bestSpots: string;
  moodWord: string;
  /** 识别到的尺寸参照物，用于校准人物大小 */
  sceneAnchors: SceneAnchor[];
  poses: PoseCard[];
};

/** 自拍诊断结果（AI 识别 + 硬编码匹配） */
export type SelfieDiagnosis = {
  /** 脸型 id */
  faceShapeId: string;
  faceShape: string;       // 英文描述
  faceShapeCn: string;      // 中文名
  /** 肤色 id */
  skinToneId: string;
  skinTone: string;
  skinToneCn: string;
  /** 眼型 id */
  eyeTypeId: string;
  eyeType: string;
  eyeTypeCn: string;
  /** 最佳角度（硬编码匹配） */
  bestAngle: string;
  /** 最佳光线（硬编码匹配） */
  bestLight: string;
  /** 风格建议 */
  styleSuggestion: string;
  /** 调整建议（硬编码匹配） */
  adjustmentTips: string[];
};

export type SelfieAnalysis = {
  selfieDiagnosis: SelfieDiagnosis;
  faceShape: string;       // legacy: AI 原始描述
  bestAngles: string;      // legacy
  moodWord: string;
  poses: PoseCard[];
};

export type AnalyzeResult =
  | { mode: "scene"; demo: boolean; data: SceneAnalysis }
  | { mode: "selfie"; demo: boolean; data: SelfieAnalysis };

const DEMO_SCENE: SceneAnalysis = {
  sceneCategoryId: "cafe-table",
  sceneType: "sunlit café corner",
  lightDiagnosis: {
    lightTypeId: "side-light",
    lightType: "Side Light (90°)",
    status: "shoot",
    advice: "Cinematic side light. Face the lit half toward the camera for a movie-heroine look.",
    spokenTip: "侧光太高级了！亮的那半张脸朝向镜头，秒变电影女主。",
  },
  lightDirection: "soft natural light from a large window to the left",
  lightQuality: "warm, diffused afternoon light — flattering for skin tones",
  compositionHint: "Frame structure detected — use the window frame as a natural vignette; stand beside it for narrative depth.",
  background: "terracotta walls with plants on the windowsill",
  foreground: "wooden table edge and an empty stool",
  bestSpots:
    "Stand beside the window so the light wraps across your face; use the warm wall as a backdrop.",
  moodWord: "Reverie",
  sceneAnchors: [
    {
      name: "wooden table",
      realWorldHeightM: 0.75,
      box: { x: 0.1, y: 0.55, width: 0.5, height: 0.35 },
    },
    {
      name: "window frame",
      realWorldHeightM: 2.0,
      box: { x: 0.0, y: 0.05, width: 0.4, height: 0.85 },
    },
    {
      name: "empty stool",
      realWorldHeightM: 0.45,
      box: { x: 0.45, y: 0.65, width: 0.18, height: 0.25 },
    },
  ],
  poses: [
    {
      poseId: "cafe-1",
      title: "Window Glow",
      vibe: "soft · candid",
      pose: "Turn 45° toward the window, chin slightly down, shoulders relaxed, one hand resting gently on the table edge.",
      position: "Next to the window, half a step from the wall.",
      cameraAngle: "Medium close-up, camera at eye level, slight tilt toward the light.",
      composition:
        "Rule of thirds: place your eyes on the upper third line and let the window frame the left edge.",
      avoid: "Don't stand with your back to the window or you'll become a silhouette.",
      whyItWorks:
        "The side light sculpts your cheekbones and the warm wall bounces a golden fill back onto the shadow side.",
      spokenScript: "Slowly turn your face toward the window, stop. Right hand picks up the cup, bring it to your mouth, don't drink yet. Eyes move from the cup slowly out the window, as if thinking. Good, snap.",
      expression: "Mouth relaxed, slightly closed, not pressed; gaze distant out window, vacant with faint smile; chin raised 10° to define jawline",
      facingDirection: "3/4 left",
      anchorInteraction: "left hand rests on the wooden table edge",
      templateId: "stand-3q-left-hand-hip",
      layoutBox: { x: 0.08, y: 0.12, width: 0.46, height: 0.82 },
    },
    {
      poseId: "cafe-3",
      title: "Café Lean",
      vibe: "editorial · relaxed",
      pose: "Rest one elbow on the table, body angled to the camera, weight on the back foot, soft gaze toward the window.",
      position: "Lean against the table edge closest to the window.",
      cameraAngle: "Low hip height, phone tilted up 5°, medium shot.",
      composition: "Include the window frame and plants in the upper left for depth.",
      avoid: "Avoid leaning too far forward — it compresses the neck and shoulders.",
      whyItWorks: "A relaxed lean creates a natural S-curve and makes the pose feel unposed.",
      spokenScript: "Right hand up, elbow on table, palm under right chin. Turn face slightly right, as if resting cheek on hand. Look at me, smile. Snap.",
      expression: "Smile or slightly open, natural; eyes straight to camera, soft, with a hint of playfulness; brows naturally raised a touch for energy",
      facingDirection: "3/4 right",
      anchorInteraction: "right elbow leans on the wooden table, hip touches the table edge",
      templateId: "stand-leaning-forward-table",
      layoutBox: { x: 0.28, y: 0.22, width: 0.52, height: 0.66 },
    },
    {
      poseId: "cafe-8",
      title: "Doorway Frame",
      vibe: "moody · architectural",
      pose: "Stand centered in the doorway, one hand lightly touching the frame, head turned a few degrees toward the light.",
      position: "In the doorway that separates the warm interior from the brighter window area.",
      cameraAngle: "Straight-on, camera at chest height, square to the frame.",
      composition: "Use the door frame as a natural vignette around you.",
      avoid: "Don't let the bright exterior blow out behind you; keep the exposure on your face.",
      whyItWorks: "The frame creates layers and draws the eye straight to you.",
      spokenScript: "Right hand up, flick hair once, hand stops by ear. Face follows the gesture toward the window. Look out the window, not at me. Snap.",
      expression: "Mouth naturally closed, faint smile; gaze to window, soft; overall natural, casual",
      facingDirection: "front",
      anchorInteraction: "stands within the door frame, right hand touches the frame edge",
      templateId: "lean-wall-shoulder",
      layoutBox: { x: 0.26, y: 0.06, width: 0.48, height: 0.88 },
    },
  ],
};

const DEMO_SELFIE: SelfieAnalysis = {
  selfieDiagnosis: {
    faceShapeId: "round",
    faceShape: "Round",
    faceShapeCn: "圆脸",
    skinToneId: "warm",
    skinTone: "Warm",
    skinToneCn: "暖皮",
    eyeTypeId: "double_eyelid",
    eyeType: "Double eyelid",
    eyeTypeCn: "双眼皮",
    bestAngle: "Side 45° + overhead 15°",
    bestLight: "Front side light (45°)",
    styleSuggestion: "Daily Sweet (日常甜美风)",
    adjustmentTips: [
      "Hair covers one side of jawline to slim",
      "Overhead 15° tilt to define jawline",
      "Turn face slightly toward the light source",
    ],
  },
  faceShape: "soft round face with full cheeks and gentle jawline",
  bestAngles: "Side 45° + overhead 15°",
  moodWord: "Luminous",
  poses: [
    {
      poseId: "",
      title: "Soft Gaze",
      vibe: "gentle · dreamy",
      pose: "Chin down a finger's width, eyes looking slightly off-camera, lips relaxed.",
      position: "Hold the phone at upper-chest height, arm extended naturally.",
      cameraAngle: "Lens slightly above eye line, phone vertical.",
      composition: "Center your face in the upper half of the frame, leave breathing room above the head.",
      avoid: "Don't hold the phone below chin level — it widens the lower face.",
      whyItWorks: "A downward gaze softens the eyes and the higher angle emphasizes the cheekbones.",
      spokenScript: "Drop your chin just a finger's width. Look slightly off-camera, not into the lens. Lips soft, don't press. Hold. Snap.",
      expression: "Lips relaxed, not pressed; gaze off-lens, dreamy; chin down one finger-width to soften eyes",
      facingDirection: "3/4 right",
      anchorInteraction: "phone held at arm's length, face framed by negative space",
      templateId: "",
      layoutBox: { x: 0.26, y: 0.1, width: 0.48, height: 0.64 },
    },
    {
      poseId: "",
      title: "Window Light",
      vibe: "fresh · natural",
      pose: "Turn so the nearest window lights the side of your face, one shoulder closer to the camera.",
      position: "Sit or stand about an arm's length from a window.",
      cameraAngle: "Phone at eye level, slight 3/4 turn toward the light.",
      composition: "Keep the brightest area on the front of your face, not the background.",
      avoid: "Avoid overhead indoor lights; they cast shadows under the eyes.",
      whyItWorks: "Side light adds dimension and makes skin look luminous without harsh shadows.",
      spokenScript: "Turn so the window lights the side of your face. One shoulder closer to camera. Look toward the light, not into the lens. Snap.",
      expression: "Eyes toward light, soft; lips relaxed; skin luminous from side light",
      facingDirection: "3/4 left",
      anchorInteraction: "face turned toward the window, shoulder closest to the light",
      templateId: "",
      layoutBox: { x: 0.22, y: 0.12, width: 0.52, height: 0.66 },
    },
    {
      poseId: "",
      title: "Hand Story",
      vibe: "editorial · graceful",
      pose: "Bring one hand up near the collarbone or jaw, fingers soft and slightly separated.",
      position: "Same 3/4 angle, phone steady with both hands or a stand.",
      cameraAngle: "Slightly above eye level, phone tilted a few degrees toward you.",
      composition: "The hand creates a diagonal line that leads back to your eyes.",
      avoid: "Don't press the hand flat against the face — keep a little space between fingers and skin.",
      whyItWorks: "A hand gesture adds elegance and breaks up the negative space around the face.",
      spokenScript: "Bring one hand up near your collarbone. Fingers soft, slightly apart. Don't press flat — keep a little space. Look at me. Snap.",
      expression: "Fingers soft and slightly apart; eyes at camera; elegant, graceful",
      facingDirection: "front",
      anchorInteraction: "hand near collarbone, fingers frame the face",
      templateId: "",
      layoutBox: { x: 0.24, y: 0.08, width: 0.52, height: 0.72 },
    },
  ],
};

const LAYOUT_RULES = `layoutBox rules — CRITICAL (precision positioning, anchored to scene objects):
- Coordinates are NORMALIZED to image dimensions: (0,0) = top-left, (1,1) = bottom-right.
- The box marks WHERE the woman should stand/sit in THIS photo. It must EXACTLY overlap the real scene objects she interacts with.

STEP 1 — Find scene anchors (size references):
- Identify 1-3 physical objects in the photo with KNOWN real-world sizes: chairs (~0.45m seat), tables (~0.75m tall), doors (~2.0m), windows, sofas, beds, countertops, potted plants, etc.
- For each anchor, note its EXACT pixel position in the image (normalized box) and its real-world height.
- The woman is ~1.65m tall with shoulder width ~0.42m. Use the anchors to calibrate: if a 0.75m table occupies 30% of the image height, then a 1.65m woman occupies roughly 66% of the image height at the same depth.

STEP 2 — Size the layoutBox using the anchors, NOT fixed numbers:
- A woman standing NEXT TO a table should be roughly 2x the table's image-height.
- A woman sitting ON a chair should have her head ~1.5-1.8x above the chair seat.
- The box width must include her body + arms + natural breathing room (arms add ~0.15m each side).

STEP 3 — PRECISION POSITIONING (most important — the box must touch real objects):
- LEANING ON TABLE: the box's BOTTOM EDGE must align with the TABLE TOP in the image. If the table top is at y=0.55 in the image, the box bottom (y+height) must be ~0.55. Her hands reach the table edge.
- SITTING ON STOOL/CHAIR: the box BOTTOM must align with the STOOL SEAT position in the image (NOT the floor). If the stool seat is at y=0.65, box bottom (y+height) = ~0.65. Her hips sit ON the seat.
- STANDING: the box BOTTOM must align with the FLOOR or ground line in the image. Her feet touch the ground.
- TOUCHING WALL: the box's SIDE must touch the wall's position in the image.
- The box must EXACTLY overlap where the real furniture is — if the stool is at the right side at x=0.5-0.7, the box must be at x=0.5-0.7 too.
- NEVER float the box in empty space. The box edges must visually connect to the scene objects.

STEP 4 — SAFETY (prevent clipping):
- The ENTIRE box must be INSIDE the image: x >= 0.06, y >= 0.06, x+width <= 0.94, y+height <= 0.92.
- Leave at least 6% margin on all sides so the figure's head and feet are NEVER cut off.
- If the ideal position would clip the figure, move the box inward until it fits.
- Width >= 0.40, height >= 0.52 (a real adult body).
- Each of the 3 poses MUST have a DIFFERENT layoutBox reflecting its specific anchor + interaction.`;

const SCENE_PROMPT = `You are PosePal — an elite fashion photographer. Analyze the uploaded photo of a woman's CURRENT SURROUNDINGS. Ground every recommendation in REAL objects you see (tables, chairs, windows, walls). The subject is ALWAYS a young WOMAN — feminine, graceful poses only.

PHASE 1 — DIAGNOSIS:
1A. Match scene to ONE category:
${getSceneTypesForPrompt()}
Output sceneCategoryId + describe sceneType.

1B. Diagnose light from the 9 types:
${getLightTypesForPrompt()}
Pick lightTypeId. Set status: "shoot" (good), "adjust" (needs tweak), or "avoid" (unusable — top/bottom light — then DON'T recommend poses, output empty poses[] array).

1C. Check composition rules:
${getCompositionRulesForPrompt()}
Output matching advice in compositionHint, or "none".

PHASE 2 — POSES (skip if status=="avoid"):
2A. Find 1-3 scene anchors (objects with known real-world sizes: chair ~0.45m, table ~0.75m, door ~2.0m). Woman is ~1.65m tall.

2B. Select 3 DIFFERENT poses (MUST have different poseIds, never repeat). Filter by POSE-LIGHT MATCH RULES for (this scene, this light type).

POSE LIBRARY (use these directly, don't invent):
${((): string => {
  const scenes: SceneCategory[] = ["cafe-table", "exhibition-bookstore", "outdoor-grass"];
  return scenes
    .map((s) => `--- ${s} ---\n${getPoseLibraryForPrompt(s)}`)
    .join("\n\n");
})()}

MATCH RULES (scene × light → pose ids):
${getPoseLightMatchesForPrompt()}

2C. For each pose: output poseId, templateId, facing from the library. Adapt trajectory/spokenScript/expression/avoid to THIS scene.

2D. Design a REAL interaction with a visible anchor (lean on table, sit on stool, stand in doorway). layoutBox MUST touch/align with that anchor.

2E. Describe BODY POSITION precisely (limb angles, weight, gaze) — not just "sit on chair" but "seated, thighs horizontal, knees bent, back upright".

PHASE 3 — OUTPUT (JSON only, no markdown, no commentary):

{
  "sceneCategoryId": string,
  "sceneType": string,
  "lightDiagnosis": {
    "lightTypeId": string,
    "lightType": string,
    "status": "shoot"|"adjust"|"avoid",
    "advice": string,     // english, 1 sentence
    "spokenTip": string   // chinese, 1 sentence
  },
  "lightDirection": string,
  "lightQuality": string,
  "compositionHint": string,
  "background": string,
  "foreground": string,
  "bestSpots": string,
  "moodWord": string,
  "sceneAnchors": [{"name": string, "realWorldHeightM": number, "box": {"x": number,"y": number,"width": number,"height": number}}],
  "poses": [3 cards]  // empty if status=="avoid"
}

Each pose card (KEEP SHORT — omitted fields are filled from the library by code):
{
  "poseId": string,       // from library, don't invent
  "title": string,        // max 4 words
  "vibe": string,         // 2-3 words
  "pose": string,         // precise body position, 1-2 sentences max
  "position": string,     // 1 sentence
  "cameraAngle": string,  // 1 sentence
  "composition": string,  // 1 sentence
  "facingDirection": string,
  "anchorInteraction": string,  // 1 sentence
  "templateId": string,   // from library
  "layoutBox": {"x": number,"y": number,"width": number,"height": number}
}
NOTE: Do NOT output spokenScript, expression, avoid, whyItWorks — these are filled by code from the library. Keep each field SHORT (1-2 sentences max) to fit in 1024 tokens.

AVAILABLE TEMPLATES (templateId must come from here):
${getTemplateListForPrompt()}

${LAYOUT_RULES}

Rules: ALL values in ENGLISH (except spokenTip which is Chinese). Base details on what you ACTUALLY see. Poses MUST describe concrete interaction with a visible object. NEVER invent a poseId. Return ONLY JSON.`;

const SELFIE_PROMPT = `You are PosePal — a warm celebrity photographer. Analyze this SELFIE and identify the user's face shape, skin undertone, and eye type.

STEP 1 — Identify face shape (pick ONE):
${getFaceShapesForPrompt()}

STEP 2 — Identify skin undertone (pick ONE):
${getSkinTonesForPrompt()}

STEP 3 — Identify eye type (pick ONE):
${getEyeTypesForPrompt()}

STEP 4 — Recommend 3 selfie poses for "Daily Sweet" style (微笑不露齿, 月牙眼, 自然放松, 慵懒温柔, 俏皮可爱). Each pose should flatter her specific face shape, skin tone, and eye type.

Respond ONLY as JSON (no markdown, no commentary):

{
  "faceShapeId": string,       // one of: round | square_round | long | diamond
  "faceShapeDesc": string,      // your own description, e.g. "soft round face with full cheeks"
  "skinToneId": string,         // one of: warm | cool
  "skinToneDesc": string,       // your own description
  "eyeTypeId": string,          // one of: monolid | double_eyelid | inner_double
  "eyeTypeDesc": string,        // your own description
  "moodWord": string,           // ONE evocative english word
  "poses": [3 pose cards]
}

Each pose card (KEEP SHORT to fit 1024 tokens):
{
  "poseId": "",                 // empty for selfie
  "title": string,              // max 4 words
  "vibe": string,               // 2-3 words
  "pose": string,               // precise face/hand/gaze position, 1-2 sentences
  "position": string,           // 1 sentence
  "cameraAngle": string,         // 1 sentence
  "composition": string,         // 1 sentence
  "facingDirection": string,
  "anchorInteraction": string,
  "templateId": "",             // empty for selfie
  "layoutBox": {"x": number,"y": number,"width": number,"height": number}
}
NOTE: Do NOT output spokenScript, expression, avoid, whyItWorks — these are filled by code. Keep fields SHORT.

${LAYOUT_RULES}

Rules: Kind, empowering tone. Never critical. ALL values in ENGLISH. For selfies layoutBox marks face+head+shoulders: width 0.45-0.65, height 0.55-0.80. Return ONLY JSON.`;

/** 把模型返回的 layoutBox 钳制到合法范围 + 强制最小尺寸，避免框太小不符合真实人形。 */
function clampLayoutBox(box: unknown): LayoutBox {
  const b = (box ?? {}) as Partial<LayoutBox>;
  // 安全边距：左右各留 6%，上下各留 6%/8%，防止人形贴边或超出画面
  const MARGIN_X = 0.06;
  const MARGIN_TOP = 0.06;
  const MARGIN_BOTTOM = 0.08;
  const x = clamp(Number(b.x ?? 0.28), MARGIN_X, 0.94 - 0.42);
  const y = clamp(Number(b.y ?? 0.08), MARGIN_TOP, 0.92 - 0.55);
  // 强制最小尺寸：宽度 >= 0.40，高度 >= 0.52
  const width = clamp(Number(b.width ?? 0.46), 0.4, 0.94 - x);
  const height = clamp(Number(b.height ?? 0.82), 0.52, 0.92 - y);
  return { x, y, width, height };
}

function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

/** 规整一张 pose card：补默认 facingDirection、钳制 layoutBox、补新字段；如果 AI 没返回 spokenScript/expression，从知识库反查填充。 */
function normalizePoseCard(card: Partial<PoseCard>): PoseCard {
  // 清理 templateId：模型可能返回 "id=xxx" 格式，统一为 "xxx"
  const rawTemplateId = (card.templateId ?? "").trim();
  const templateId = rawTemplateId.replace(/^id\s*=\s*/i, "").replace(/^["']|["']$/g, "");
  // 清理 poseId：同上
  const rawPoseId = (card.poseId ?? "").trim();
  const poseId = rawPoseId.replace(/^id\s*=\s*/i, "").replace(/^["']|["']$/g, "");

  // 从知识库反查姿势详情（补 AI 没输出的 spokenScript / expression / avoid）
  const kbPose = findPoseByPoseId(poseId);

  return {
    poseId,
    title: card.title ?? "Untitled",
    vibe: card.vibe ?? "",
    pose: card.pose ?? "",
    position: card.position ?? "",
    cameraAngle: card.cameraAngle ?? "",
    composition: card.composition ?? "",
    avoid: card.avoid ?? (kbPose?.avoidEn ?? ""),
    whyItWorks: card.whyItWorks ?? "",
    spokenScript: card.spokenScript ?? (kbPose?.spokenScriptEn ?? ""),
    expression: card.expression ?? (kbPose?.expressionEn ?? ""),
    facingDirection: card.facingDirection ?? (kbPose?.facing ?? "front"),
    anchorInteraction: card.anchorInteraction ?? "",
    templateId: templateId || kbPose?.templateId || "stand-3q-right-hand-hip",
    layoutBox: clampLayoutBox(card.layoutBox),
  };
}

/** 规整场景参照物 */
function normalizeSceneAnchor(anchor: unknown): SceneAnchor {
  const a = (anchor ?? {}) as Partial<SceneAnchor>;
  return {
    name: a.name ?? "unknown object",
    realWorldHeightM: clamp(Number(a.realWorldHeightM ?? 0.75), 0.1, 5),
    box: clampLayoutBox(a.box),
  };
}

function normalizeAnalysis(
  parsed: unknown,
  mode: "scene" | "selfie",
): SceneAnalysis | SelfieAnalysis {
  const p = (parsed ?? {}) as Record<string, unknown>;
  const rawPoses = Array.isArray(p.poses) ? (p.poses as Partial<PoseCard>[]) : [];

  // ── 去重：按 poseId 去重，AI 可能返回相同姿势两次 ──
  // 如果 poseId 为空（selfie 模式），按 title 去重
  const seen = new Set<string>();
  const dedupedPoses: Partial<PoseCard>[] = [];
  for (const card of rawPoses) {
    const key = (card.poseId ?? "").trim() || (card.title ?? "").trim().toLowerCase();
    if (!key || !seen.has(key)) {
      if (key) seen.add(key);
      dedupedPoses.push(card);
    }
  }

  const poses = dedupedPoses.map(normalizePoseCard).slice(0, 3);
  if (mode === "selfie") {
    // AI 只识别 3 项 id，推荐规则由代码硬编码匹配
    const faceShapeId = (p.faceShapeId as string) || "round";
    const skinToneId = (p.skinToneId as string) || "warm";
    const eyeTypeId = (p.eyeTypeId as string) || "double_eyelid";

    const faceRule = findFaceShapeRule(faceShapeId);
    const skinRule = findSkinToneRule(skinToneId);
    const eyeRule = findEyeTypeRule(eyeTypeId);

    // 合并调整建议：脸型 + 眼型
    const adjustmentTips = [
      ...(faceRule?.tips ?? []),
      ...(eyeRule?.avoid ? [`Eyes: ${eyeRule.avoid}`] : []),
    ].slice(0, 5);

    const selfieDiagnosis: SelfieDiagnosis = {
      faceShapeId,
      faceShape: faceRule?.nameEn ?? faceShapeId,
      faceShapeCn: faceRule?.nameCn ?? faceShapeId,
      skinToneId,
      skinTone: skinRule?.nameEn ?? skinToneId,
      skinToneCn: skinRule?.nameCn ?? skinToneId,
      eyeTypeId,
      eyeType: eyeRule?.nameEn ?? eyeTypeId,
      eyeTypeCn: eyeRule?.nameCn ?? eyeTypeId,
      bestAngle: faceRule?.bestAngle ?? "Side 45°",
      bestLight: skinRule?.bestLight ?? "Front side light (45°)",
      styleSuggestion: `${SELFIE_STYLE_MVP.nameEn} (${SELFIE_STYLE_MVP.nameCn})`,
      adjustmentTips,
    };

    return {
      selfieDiagnosis,
      faceShape: (p.faceShapeDesc as string) ?? (p.faceShape as string) ?? "",
      bestAngles: selfieDiagnosis.bestAngle,
      moodWord: (p.moodWord as string) ?? "Mood",
      poses: poses.slice(0, 3),
    } as SelfieAnalysis;
  }
  // scene 模式：规整 lightDiagnosis
  const rawLD = (p.lightDiagnosis ?? {}) as Record<string, unknown>;
  const status = (rawLD.status as string) ?? "shoot";
  const lightDiagnosis: LightDiagnosis = {
    lightTypeId: (rawLD.lightTypeId as string) ?? "front-side-light",
    lightType: (rawLD.lightType as string) ?? "Front Side Light (45°)",
    status: status === "avoid" || status === "adjust" ? status : "shoot",
    advice: (rawLD.advice as string) ?? "",
    spokenTip: (rawLD.spokenTip as string) ?? "",
  };
  return {
    sceneCategoryId: (p.sceneCategoryId as string) ?? "cafe-table",
    sceneType: (p.sceneType as string) ?? "",
    lightDiagnosis,
    lightDirection: (p.lightDirection as string) ?? "",
    lightQuality: (p.lightQuality as string) ?? "",
    compositionHint: (p.compositionHint as string) ?? "none",
    background: (p.background as string) ?? "",
    foreground: (p.foreground as string) ?? "",
    bestSpots: (p.bestSpots as string) ?? "",
    moodWord: (p.moodWord as string) ?? "Mood",
    sceneAnchors: Array.isArray(p.sceneAnchors)
      ? (p.sceneAnchors as unknown[]).map(normalizeSceneAnchor).slice(0, 3)
      : [],
    poses: poses.slice(0, 3),
  } as SceneAnalysis;
}

export const analyzePose = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    if (isDemoMode()) {
      await new Promise((r) => setTimeout(r, 1200));
      const resultData = data.mode === "selfie" ? DEMO_SELFIE : DEMO_SCENE;
      return { mode: data.mode, demo: true, data: resultData } as AnalyzeResult;
    }

    const apiKey = getZhipuApiKey();
    if (!apiKey)
      throw new Error(
        "Missing ZHIPU_API_KEY — add your free Zhipu key to .env.local, or set DEMO_MODE=true to preview.",
      );

    const prompt = data.mode === "selfie" ? SELFIE_PROMPT : SCENE_PROMPT;

    // ── 调用智谱 GLM-4V API，带重试和 timeout ──
    const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
    const MAX_RETRIES = 2;
    const REQUEST_TIMEOUT_MS = 60_000; // 60 秒

    let lastError: Error | null = null;
    let res: Response | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        res = await fetch(ZHIPU_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${generateZhipuToken(apiKey)}`,
          },
          body: JSON.stringify({
            model: process.env.ZHIPU_VISION_MODEL || "glm-4v-flash",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: data.imageDataUrl } },
                ],
              },
            ],
            temperature: 0.7,
            max_tokens: 1024,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // 502/504/500 是 upstream 错误，值得重试
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          console.warn(`[analyzePose] attempt ${attempt} got ${res.status}, retrying...`);
          const body = await res.text();
          console.error("Zhipu gateway error", res.status, body.slice(0, 300));
          lastError = new Error(`AI upstream error (${res.status})`);
          await new Promise((r) => setTimeout(r, 1500 * attempt)); // 退避
          continue;
        }
        break; // 成功或不可重试的错误，跳出
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const msg = err instanceof Error ? err.message : String(err);
        // AbortError / 网络错误值得重试
        if (attempt < MAX_RETRIES) {
          console.warn(`[analyzePose] attempt ${attempt} network error: ${msg}, retrying...`);
          lastError = err instanceof Error ? err : new Error(msg);
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        lastError = err instanceof Error ? err : new Error(msg);
        break;
      }
    }

    if (!res) {
      throw lastError ?? new Error("AI request failed — no response received.");
    }

    if (!res.ok) {
      const body = await res.text();
      console.error("Zhipu gateway error", res.status, body.slice(0, 500));
      if (res.status === 429) throw new Error("Rate limit — please try again in a moment.");
      if (res.status === 401 || res.status === 403)
        throw new Error("Invalid ZHIPU_API_KEY — check the key in .env.local.");
      if (res.status === 413)
        throw new Error("Photo too large for AI — try a smaller or more compressed image.");
      if (res.status >= 500)
        throw new Error(
          "AI server is having issues — please retry in a few seconds. If this keeps happening, try DEMO_MODE=true to preview.",
        );
      throw new Error(`AI request failed (${res.status})`);
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty response from AI");

    const parsed = robustJsonParse(raw);
    if (parsed === null) {
      console.error("[analyzePose] Failed to parse AI response:", String(raw).slice(0, 500));
      throw new Error("Could not parse AI response — try retaking the photo or switching mode.");
    }

    const normalized = normalizeAnalysis(parsed, data.mode);
    return { mode: data.mode, demo: false, data: normalized } as AnalyzeResult;
  });

/**
 * 健壮的 JSON 解析器，处理 GLM-4V 常见的输出问题：
 * 1. 在 JSON 前后带 markdown 代码块 ```json ... ```
 * 2. 在 JSON 前后带额外文字说明
 * 3. 多余的尾随逗号（trailing commas）
 * 4. 字段值里的中文引号（""''）
 * 5. 未转义的换行符在字符串值里
 * 6. 嵌套的 JSON 对象（取第一个完整的）
 * 7. 提前终止的不完整 JSON（尝试补全括号）
 *
 * @returns 解析后的对象，失败返回 null
 */
function robustJsonParse(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;

  let text = raw.trim();

  // ── Step 1: 去除 markdown 代码块包裹 ──
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  // ── Step 2: 提取第一个 { 到最后一个 } 之间的内容 ──
  // 用平衡括号法，找到最外层完整对象
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    // 没有大括号，可能是数组
    const firstArr = text.indexOf("[");
    const lastArr = text.lastIndexOf("]");
    if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
      text = text.slice(firstArr, lastArr + 1);
    } else {
      return null;
    }
  } else {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  // ── Step 3: 直接尝试解析 ──
  try {
    return JSON.parse(text);
  } catch {
    // 继续下面的修复步骤
  }

  // ── Step 4: 修复中文引号 ──
  const fixedQuotes = text
    .replace(/[\u201C\u201D]/g, '"')  // " "
    .replace(/[\u2018\u2019]/g, "'"); // ' '
  try {
    return JSON.parse(fixedQuotes);
  } catch {
    // 继续
  }

  // ── Step 5: 移除尾随逗号 ──
  const noTrailingComma = fixedQuotes.replace(/,(\s*[}\]])/g, "$1");
  try {
    return JSON.parse(noTrailingComma);
  } catch {
    // 继续
  }

  // ── Step 6: 修复字符串值里的未转义换行 ──
  // 粗暴但有效：把 "..." 内部的裸换行替换成 \n
  const fixedNewlines = noTrailingComma.replace(
    /"([^"\\]*(?:\\.[^"\\]*)*)"|(\n)/g,
    (match, str, newline) => {
      if (newline) return "\\n";
      return match;
    },
  );
  try {
    return JSON.parse(fixedNewlines);
  } catch {
    // 继续
  }

  // ── Step 7: 用平衡括号扫描，提取第一个完整的 JSON 对象 ──
  const balanced = extractBalancedObject(noTrailingComma);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {
      // 继续
    }
  }

  // ── Step 8: 尝试补全不完整的 JSON（缺尾括号）──
  const completed = autoCompleteJson(noTrailingComma);
  if (completed) {
    try {
      return JSON.parse(completed);
    } catch {
      // 放弃
    }
  }

  return null;
}

/** 用括号平衡法提取第一个完整的 {...} 对象 */
function extractBalancedObject(text: string): string | null {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/** 尝试给不完整的 JSON 补全尾部括号，处理字符串被截断的情况 */
function autoCompleteJson(text: string): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastKeyColon = -1; // 最后一个 "key": 的位置，用于截断值
  let lastComma = -1;     // 最后一个顶层逗号位置

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === "[") depth++;
    else if (ch === "]") depth--;
    else if (ch === ":") lastKeyColon = i;
    else if (ch === ",") lastComma = i;
  }

  // depth > 0 表示缺右大括号/中括号
  if (depth <= 0) return null;

  let result = text;

  // 情况 1：字符串被截断（inString === true）
  if (inString) {
    // 找到最后一个 key 的冒号位置，截断到值之前
    // 例如："foreground  → 把这个不完整的值删掉
    if (lastKeyColon >= 0 && lastComma < lastKeyColon) {
      // 当前 key-value 被截断，删掉这个不完整的键值对
      // 回退到最后一个逗号
      const cutAt = lastComma >= 0 ? lastComma : lastKeyColon - 1; // 找 key 的引号开始
      // 更精确：找到 lastKeyColon 前面的 key 的起始引号
      let keyStart = -1;
      for (let i = lastKeyColon - 1; i >= 0; i--) {
        if (text[i] === '"') {
          if (keyStart === -1) {
            keyStart = i; // 这是 key 的结束引号
          } else {
            keyStart = i; // 这是 key 的开始引号
            break;
          }
        }
      }
      if (keyStart >= 0) {
        // 截断到 key 之前的逗号（如果有）
        let cutPos = keyStart - 1;
        while (cutPos >= 0 && /\s/.test(text[cutPos])) cutPos--;
        if (cutPos >= 0 && text[cutPos] === ",") {
          result = text.slice(0, cutPos); // 删掉 ", "key": "foreground
        } else {
          result = text.slice(0, keyStart); // 删掉 "key": "foreground
        }
      }
    } else {
      // 直接闭合字符串
      result = result + '"';
    }
    // 重新计算 depth（因为可能截断改变了括号平衡）
    depth = 0;
    inString = false;
    escape = false;
    for (let i = 0; i < result.length; i++) {
      const ch = result[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") depth--;
    }
    if (depth <= 0) return result; // 截断后刚好平衡
  }

  // 移除可能的尾随逗号
  result = result.replace(/,(\s*)$/, "$1");
  // 补全缺失的右括号
  result = result + "}".repeat(Math.max(0, depth));
  return result;
}
