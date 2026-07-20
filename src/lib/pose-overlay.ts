import type { PoseLandmarker as PoseLandmarkerType } from "@mediapipe/tasks-vision";
import type { LayoutBox } from "./analyze-pose.functions";

// 需与 package.json 里 @mediapipe/tasks-vision 的版本保持一致
const MEDIAPIPE_VERSION = "0.10.35";
const WASM_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

type NormalizedLandmark = { x: number; y: number; z: number; visibility?: number };

let landmarkerPromise: Promise<PoseLandmarkerType> | null = null;
let connectionsCache: ReadonlyArray<[number, number]> | null = null;

async function getLandmarker(): Promise<PoseLandmarkerType> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_PATH);
      const make = (delegate: "GPU" | "CPU") =>
        vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          runningMode: "IMAGE",
          numPoses: 1,
        });
      try {
        return await make("GPU");
      } catch {
        return await make("CPU");
      }
    })();
  }
  return landmarkerPromise;
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  w: number,
  h: number,
  connections: ReadonlyArray<[number, number]>,
) {
  const visible = (p: NormalizedLandmark) => (p.visibility ?? 1) >= 0.4;

  // 骨架连线
  ctx.lineWidth = Math.max(2, Math.round(w / 220));
  ctx.strokeStyle = "#ff3d71"; // 玫红，呼应 PosePal 主题色
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [a, b] of connections) {
    const pa = landmarks[a];
    const pb = landmarks[b];
    if (!pa || !pb || !visible(pa) || !visible(pb)) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  }

  // 关节点
  ctx.fillStyle = "#ffffff";
  const r = Math.max(2, Math.round(w / 480));
  for (const p of landmarks) {
    if (!visible(p)) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 浏览器端用 MediaPipe PoseLandmarker 检测原图的人体关键点，
 * 再把骨架线条 + 关节点叠加到原图上，返回叠加后的 JPEG dataURL。
 * 完全本地运行、免费、无需 API key。
 * 检测不到人 / 非浏览器环境时返回 null。
 */
export async function drawPoseOverlay(imageDataUrl: string): Promise<string | null> {
  if (typeof window === "undefined") return null; // 仅浏览器端执行

  const img = new Image();
  img.src = imageDataUrl;
  await img.decode();
  const w = img.naturalWidth;
  const h = img.naturalWidth ? img.naturalHeight : 0;

  const landmarker = await getLandmarker();
  const result = landmarker.detect(img);
  const poses = result.landmarks;
  if (!poses || poses.length === 0) return null;

  const landmarks = poses[0] as NormalizedLandmark[];

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 先画原图
  ctx.drawImage(img, 0, 0, w, h);

  if (!connectionsCache) {
    const vision = await import("@mediapipe/tasks-vision");
    connectionsCache = vision.PoseLandmarker.POSE_CONNECTIONS as ReadonlyArray<[number, number]>;
  }
  drawSkeleton(ctx, landmarks, w, h, connectionsCache);

  return canvas.toDataURL("image/jpeg", 0.9);
}

/** 归一化包围盒（0~1） */
type BBox = { minX: number; maxX: number; minY: number; maxY: number };

/** 检测原图里主要人物的归一化包围盒，检测不到返回 null */
async function detectPersonBBox(img: HTMLImageElement): Promise<BBox | null> {
  try {
    const landmarker = await getLandmarker();
    const result = landmarker.detect(img);
    const poses = result.landmarks;
    if (!poses || poses.length === 0) return null;
    const lms = poses[0] as NormalizedLandmark[];
    const visible = lms.filter((p) => (p.visibility ?? 1) >= 0.4);
    const pts = visible.length ? visible : lms;
    if (!pts.length) return null;
    let minX = 1,
      maxX = 0,
      minY = 1,
      maxY = 0;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    return {
      minX: Math.max(0, minX),
      maxX: Math.min(1, maxX),
      minY: Math.max(0, minY),
      maxY: Math.min(1, maxY),
    };
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** AR 风格引导：左右虚线竖线 + 地面虚线椭圆（脚部落点）。 */
function drawARGuide(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = Math.max(1.5, Math.round(w / 200));
  ctx.setLineDash([Math.max(6, w / 40), Math.max(4, w / 60)]);
  ctx.lineCap = "round";

  // 左右竖虚线
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();

  // 地面虚线椭圆（脚部落点）
  const ellipseRX = w * 0.42;
  const ellipseRY = h * 0.035;
  const cx = x + w / 2;
  const cy = y + h - ellipseRY * 0.3;
  ctx.setLineDash([Math.max(5, w / 50), Math.max(4, w / 70)]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, ellipseRX, ellipseRY, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

/** 在引导框左上角画一个"stand here"角标。 */
function drawFrameLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fontSize: number,
) {
  ctx.save();
  ctx.font = `600 ${fontSize}px -apple-system, system-ui, "PingFang SC", sans-serif`;
  ctx.textBaseline = "top";
  const padX = fontSize * 0.7;
  const tw = ctx.measureText(text).width;
  const boxW = tw + padX * 2;
  const boxH = fontSize + 10;
  // 让角标贴在框左上角内侧
  const bx = x + 6;
  const by = y + 6;
  ctx.fillStyle = "rgba(255,61,113,0.92)";
  roundRectPath(ctx, bx, by, boxW, boxH, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, bx + padX, by + 5);
  ctx.restore();
}

/**
 * 扫描线稿像素，找到实际人形（非白底）的包围盒，返回源图坐标。
 * CogView 生成的线稿四周有大量留白，裁掉后人形才能填满目标区域。
 * 扫描失败或线稿几乎全白时返回 null，由调用方回退到整图绘制。
 */
function trimSketchWhitespace(
  sketch: HTMLImageElement,
): { sx: number; sy: number; w: number; h: number } | null {
  const sw = sketch.naturalWidth || 864;
  const sh = sketch.naturalHeight || 1152;
  if (!sw || !sh) return null;

  // 降采样加速：在不超过 400x533 的缩略图上扫描
  const maxDim = 400;
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const tw = Math.max(1, Math.round(sw * scale));
  const th = Math.max(1, Math.round(sh * scale));

  const c = document.createElement("canvas");
  c.width = tw;
  c.height = th;
  const cx = c.getContext("2d");
  if (!cx) return null;
  cx.drawImage(sketch, 0, 0, tw, th);

  let imgData: ImageData;
  try {
    imgData = cx.getImageData(0, 0, tw, th);
  } catch {
    return null;
  }
  const d = imgData.data;

  let minX = tw;
  let maxX = -1;
  let minY = th;
  let maxY = -1;
  // 阈值：亮度 <= 215 视为线条像素（与后续白底转透明一致）
  const THRESH = 215;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const i = (y * tw + x) * 4;
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (lum <= THRESH) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  // 没找到线条 / 几乎全白
  if (maxX < 0 || maxY < 0) return null;

  // 留 2px 容差，避免线条边缘被切掉
  const pad = 2;
  const sx = Math.max(0, minX - pad) / scale;
  const sy = Math.max(0, minY - pad) / scale;
  const ex = Math.min(sw, maxX + 1 + pad) / scale;
  const ey = Math.min(sh, maxY + 1 + pad) / scale;
  const w = ex - sx;
  const h = ey - sy;
  if (w < 4 || h < 4) return null;
  return { sx, sy, w, h };
}

/** 场景参照物（桌椅门窗等），用于校准人物大小 */
export interface SceneAnchorInput {
  name: string;
  realWorldHeightM: number;
  box?: { x: number; y: number; width: number; height: number };
}

/**
 * 把「推荐姿势线稿」合成叠加到用户原图上，作为"效果示意"。
 *
 * 摆放策略（优先级从高到低）：
 *  1. 若传入 layoutBox（来自分析模型，归一化坐标）→ 线稿按 contain 适配到该区域，
 *     引导框紧贴线稿实际边界，二者完全重合；线稿铺满区域，真正融入场景；
 *     若同时传入 sceneAnchors，用参照物真实高度校准线稿大小，避免人物过大；
 *  2. 否则用 MediaPipe 检测原图人物包围盒，把线稿摆在人物旁边更空的一侧（兜底）；
 *  3. 检测不到人 → 默认放右侧。
 *
 * 线稿处理：白底转透明、线条染成主题玫红，垫一层淡白圆角底提升可读性。
 * 非浏览器环境返回 null；线稿加载失败也返回 null。
 */
export async function composeSketchOnPhoto(
  originalDataUrl: string,
  sketchDataUrl: string,
  layoutBox?: LayoutBox,
  options?: { label?: string; sceneAnchors?: SceneAnchorInput[]; framing?: string },
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  let orig: HTMLImageElement;
  let sketch: HTMLImageElement;
  try {
    [orig, sketch] = await Promise.all([loadImage(originalDataUrl), loadImage(sketchDataUrl)]);
  } catch {
    return null;
  }

  const W = orig.naturalWidth;
  const H = orig.naturalHeight;
  if (!W || !H) return null;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(orig, 0, 0, W, H);

  // 计算线稿目标区域（像素）
  let targetX: number;
  let targetY: number;
  let targetW: number;
  let targetH: number;
  let drawGuide = false;
  // 裁掉线稿白边后的人形区域（源图坐标）；为空表示未裁剪
  let sketchTrim: { sx: number; sy: number; w: number; h: number } | null = null;

  const sketchAspect = (sketch.naturalWidth || 864) / (sketch.naturalHeight || 1152);

  if (layoutBox && layoutBox.width > 0 && layoutBox.height > 0) {
    // 路径 1：用分析模型给出的归一化区域。
    // 关键优化：
    //  1. 安全边距：layoutBox 已在 clamp 时留出边距，这里再加画布级保护
    //  2. 缩放保护：线稿适配后若超出画面，整体缩小到安全区内
    //  3. 智能对齐：站姿底部对齐，坐姿底部对齐到 layoutBox 底部（凳子座面）
    const SAFE_MARGIN = 12; // 像素级安全边距，防止贴边
    const boxX = Math.max(0, layoutBox.x);
    const boxY = Math.max(0, layoutBox.y);
    const boxW = Math.min(1 - boxX, layoutBox.width);
    const boxH = Math.min(1 - boxY, layoutBox.height);

    // layoutBox 目标区域（像素），加安全边距
    const boxPx = Math.max(SAFE_MARGIN, boxX * W);
    const boxPy = Math.max(SAFE_MARGIN, boxY * H);
    const boxPw = Math.min(W - SAFE_MARGIN - boxPx, boxW * W);
    const boxPh = Math.min(H - SAFE_MARGIN - boxPy, boxH * H);

    // 先裁掉线稿四周白边，找到实际人形边界
    const trimmed = trimSketchWhitespace(sketch);
    sketchTrim = trimmed;
    const trimW = trimmed ? trimmed.w : sketch.naturalWidth || 864;
    const trimH = trimmed ? trimmed.h : sketch.naturalHeight || 1152;
    const trimAspect = trimW / trimH;

    // ── 参照物校准：用真实高度比例缩放线稿，避免人物过大 ──
    // 人物真实身高 1.65m，如果场景里有桌子(0.75m)，桌子的像素高度 / 0.75 * 1.65 = 人物应有的像素高度
    const PERSON_HEIGHT_M = 1.65;
    const MAX_HEIGHT_RATIO = 0.72; // 线稿高度不超过画面 72%（留出头顶空间）
    let anchorCalibratedH: number | null = null;

    if (options?.sceneAnchors && options.sceneAnchors.length > 0) {
      // 找到最好的参照物：有 box 且高度合理（0.3-3m 之间）
      const bestAnchor = options.sceneAnchors
        .filter((a) => a.realWorldHeightM > 0.3 && a.realWorldHeightM < 3.0 && a.box)
        .sort((a, b) => Math.abs(a.realWorldHeightM - 0.7) - Math.abs(b.realWorldHeightM - 0.7))[0];

      if (bestAnchor && bestAnchor.box) {
        const anchorPxH = bestAnchor.box.height * H; // 参照物像素高度
        const pixelsPerMeter = anchorPxH / bestAnchor.realWorldHeightM; // 每米对应的像素
        anchorCalibratedH = pixelsPerMeter * PERSON_HEIGHT_M; // 人物应有的像素高度
        // 坐姿/蹲姿缩小：framing 标记判断
        const framing = options?.framing || "";
        if (framing.includes("half-body") || framing.includes("half_body")) {
          anchorCalibratedH *= 0.65; // 半身照只显示上半身
        } else if (framing.includes("back") || framing.includes("dynamic")) {
          anchorCalibratedH *= 0.85;
        }
        // 上限保护
        anchorCalibratedH = Math.min(anchorCalibratedH, H * MAX_HEIGHT_RATIO);
      }
    }

    // 线稿（裁剪后）按 contain 适配到 layoutBox，但优先用参照物校准的高度
    let sH: number;
    let sW: number;
    if (anchorCalibratedH && anchorCalibratedH > 0) {
      // 用参照物校准的高度，但不超过 layoutBox 的宽度
      sH = anchorCalibratedH;
      sW = sH * trimAspect;
      if (sW > boxPw) {
        sW = boxPw;
        sH = sW / trimAspect;
      }
    } else {
      // 无参照物：按 contain 适配到 layoutBox（原逻辑）
      sH = boxPh;
      sW = sH * trimAspect;
      if (sW > boxPw) {
        sW = boxPw;
        sH = sW / trimAspect;
      }
      // 兜底上限保护：不超过画面 72%
      if (sH > H * MAX_HEIGHT_RATIO) {
        sH = H * MAX_HEIGHT_RATIO;
        sW = sH * trimAspect;
      }
    }

    // 安全缩放保护：如果适配后人形顶部超出画面，整体缩小
    // 计算最终位置先
    let targetX_ = boxPx + (boxPw - sW) / 2; // 水平居中
    let targetY_ = boxPy + (boxPh - sH); // 默认底部对齐

    // 如果顶部超出安全区（头被砍），改为顶部对齐并缩小
    if (targetY_ < SAFE_MARGIN) {
      // 缩小高度让整个人形在安全区内
      const maxH = boxPy + boxPh - SAFE_MARGIN;
      const scale = maxH / sH;
      sH = sH * scale;
      sW = sW * scale;
      targetY_ = SAFE_MARGIN; // 顶部对齐安全区
      targetX_ = boxPx + (boxPw - sW) / 2; // 重新水平居中
    }

    // 二次保护：确保底部不超出画面
    if (targetY_ + sH > H - SAFE_MARGIN) {
      const overflow = targetY_ + sH - (H - SAFE_MARGIN);
      sH -= overflow;
      sW = sH * trimAspect; // 保持比例
      targetX_ = boxPx + (boxPw - sW) / 2;
    }

    targetW = sW;
    targetH = sH;
    targetX = targetX_;
    targetY = targetY_;

    // 引导框 = AR 风格引导（虚线竖线 + 地面椭圆）
    drawARGuide(ctx, targetX, targetY, targetW, targetH);
    drawGuide = true;
  } else {
    // 路径 2/3：无坐标 → 用人物检测挑更空的一侧（兜底）
    const bbox = await detectPersonBBox(orig);
    let side: "left" | "right" = "right";
    if (bbox) {
      const leftSpace = bbox.minX;
      const rightSpace = 1 - bbox.maxX;
      side = rightSpace >= leftSpace ? "right" : "left";
    }

    const marginX = W * 0.02;
    const marginY = H * 0.02;
    targetH = H * 0.78;
    targetW = targetH * sketchAspect;

    if (bbox) {
      const freeW = (side === "right" ? 1 - bbox.maxX : bbox.minX) * W;
      const maxW = Math.max(freeW - marginX, W * 0.28);
      if (targetW > maxW) {
        targetW = maxW;
        targetH = targetW / sketchAspect;
      }
    }

    targetX = side === "right" ? W - targetW - marginX : marginX;
    targetY = H - targetH - marginY;
  }

  // 处理线稿：白底 -> 透明，线条 -> 玫红
  const off = document.createElement("canvas");
  off.width = Math.round(targetW);
  off.height = Math.round(targetH);
  const octx = off.getContext("2d");
  if (!octx) return null;
  // 若已裁掉白边，只画人形部分；否则画整张线稿
  if (sketchTrim) {
    octx.drawImage(
      sketch,
      sketchTrim.sx,
      sketchTrim.sy,
      sketchTrim.w,
      sketchTrim.h,
      0,
      0,
      off.width,
      off.height,
    );
  } else {
    octx.drawImage(sketch, 0, 0, off.width, off.height);
  }
  try {
    const imgData = octx.getImageData(0, 0, off.width, off.height);
    const d = imgData.data;
    // 粉笔/素描风模板：线条 + 灰色阴影都转白色（半透明），纯白底透明。
    // 阈值 240：只抠除接近纯白的背景（240-255），保留灰色阴影为半透明白色。
    // 深色线条（< 200）满不透明，中间灰色（200-240）按强度半透明。
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (lum > 240) {
        d[i + 3] = 0; // 纯白/接近纯白底透明
      } else {
        // 线条和灰色阴影都转白色，alpha 按深浅渐变
        const alpha = Math.min(255, Math.round((245 - lum) * 2.5));
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
        d[i + 3] = alpha;
      }
    }
    octx.putImageData(imgData, 0, 0);
  } catch {
    // getImageData 若因跨域失败（理论上 dataURL 不会），直接画原线稿兜底
  }

  // 无引导框时（兜底路径）补一层淡白圆角底，提升可读性
  if (!drawGuide) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    roundRectPath(ctx, targetX - 8, targetY - 8, targetW + 16, targetH + 16, 24);
    ctx.fill();
    ctx.restore();
  }

  // 叠加线稿：先画一层深色阴影（让白线在任何背景上都可读），再画白色线稿
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = Math.max(3, Math.round(targetW / 120));
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 0.95;
  ctx.drawImage(off, targetX, targetY, targetW, targetH);
  ctx.restore();

  // AR 风格不需要角标文字
  return canvas.toDataURL("image/jpeg", 0.92);
}
