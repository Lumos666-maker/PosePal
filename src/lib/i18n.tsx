/**
 * PosePal 首页国际化（中英文）
 * 简单实现：localStorage 存语言偏好，React context 共享
 */

import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "zh";

export const translations = {
  en: {
    navHowItWorks: "How it works",
    navGallery: "Gallery",
    navAbout: "About",
    navStart: "Start",
    heroBadge: "AI Photo Director",
    heroTitle1: "Before you shoot,",
    heroTitle2: "meet your AI photographer.",
    heroDesc: "Upload a photo of where you are. PosePal reads the light, the space, and the mood — then hands you three poses ready to shoot.",
    heroCta: "Upload a photo →",
    heroCtaNote: "Takes 15 seconds · No sign-up",
    feature1Title: "Read the light",
    feature1Desc: "Direction, softness, warmth — analyzed in seconds.",
    feature2Title: "Find the spot",
    feature2Desc: "The exact corner of the room that flatters you.",
    feature3Title: "Strike the pose",
    feature3Desc: "Three cinematic poses, tailored to your scene.",
    howTitle: "How it works",
    howStep1Title: "Upload your scene",
    howStep1Desc: "Snap a photo of where you are — a café, a gallery, a park. Or try one of our sample scenes.",
    howStep2Title: "AI analyzes everything",
    howStep2Desc: "PosePal identifies the light type, scene category, and composition — then matches the best poses from a library of 27 curated poses.",
    howStep3Title: "Get 3 tailored poses",
    howStep3Desc: "Each pose comes with a spoken script your friend can read aloud, expression guidance, and a visual overlay on your photo.",
    aboutTitle: "About PosePal",
    aboutDesc: "PosePal is your AI photo buddy before the shoot: snap a photo of your surroundings, and the AI reads the light and backdrop, then hands you pose and framing tip cards — so every girl can take great photos without a photographer, reclaiming 'looking good' from endless trial and error.",
    aboutFeature1: "27 curated poses across 3 scenes",
    aboutFeature2: "9 light types with shoot/avoid diagnosis",
    aboutFeature3: "Selfie mode with face shape & skin tone analysis",
    aboutFeature4: "Friend-friendly spoken scripts",
    footer: "Crafted for the ones who want the shot, not the stress.",
    // Upload page
    uploadStep: "Step 01",
    uploadTitle: "Show me where you are.",
    uploadDesc: "Snap the room, the street, the corner — I'll read the light and design your shot.",
    uploadSceneMode: "Scene photo",
    uploadSelfieMode: "Selfie mode",
    uploadDropHere: "Drop your photo here",
    uploadOrTap: "or tap below to choose from your camera roll",
    uploadChoose: "Choose photo",
    uploadReplace: "Replace",
    uploadStart: "Direct my shot →",
    uploadExamples: "Example scenes",
    uploadTapToTry: "Tap a scene to try PosePal instantly",
    uploadPrivacy: "Photos are analyzed once and never stored.",
    uploadBack: "← Back",
    // Analyzing page
    analyzeStep1: "Reading your space…",
    analyzeStep2: "Studying the light",
    analyzeStep3: "Finding the flattering angles",
    analyzeStep4: "Composing your poses",
    // Results page
    resultsYourScene: "Your scene",
    resultsYourAngles: "Your best angles",
    resultsClose: "Close",
    resultsTip: "Tip",
    resultsNewPhoto: "New photo",
  },
  zh: {
    navHowItWorks: "怎么用",
    navGallery: "作品",
    navAbout: "关于",
    navStart: "开始",
    heroBadge: "AI 摄影指导",
    heroTitle1: "按下快门前，",
    heroTitle2: "先遇见你的 AI 摄影师。",
    heroDesc: "拍一张你所在场景的照片上传。PosePal 读懂光线、空间与氛围，递给你三个立刻能拍的姿势。",
    heroCta: "上传照片 →",
    heroCtaNote: "只要 15 秒 · 无需注册",
    feature1Title: "读懂光线",
    feature1Desc: "光源方向、柔和度、色温——几秒内分析完毕。",
    feature2Title: "锁定机位",
    feature2Desc: "找到这个空间里最衬你的那个位置。",
    feature3Title: "摆好姿势",
    feature3Desc: "三个电影感姿势，为你的场景量身定制。",
    howTitle: "怎么用",
    howStep1Title: "上传场景",
    howStep1Desc: "拍一张你所在环境的照片——咖啡厅、美术馆、公园都行。也可以先试试我们的示例场景。",
    howStep2Title: "AI 全方位解读",
    howStep2Desc: "PosePal 识别光线类型、场景类别和构图方式，再从 27 个精选姿势里匹配最适合你的那几个。",
    howStep3Title: "收到三个姿势",
    howStep3Desc: "每个姿势都配有朋友能照着念的口令、表情要点，还能叠加在你照片上直观预览。",
    aboutTitle: "关于 PosePal",
    aboutDesc: "PosePal 是拍照前的 AI 搭子：拍一张现场环境照，AI 就看懂光线与背景，给出适合你的姿势和取景技巧卡片，让每个女生不靠摄影师也能轻松拍出好看的照片，帮女性把「拍好看」从反复试错里夺回来。",
    aboutFeature1: "3 大场景 · 27 个精选姿势",
    aboutFeature2: "9 种光线 · 可拍与避雷诊断",
    aboutFeature3: "自拍模式 · 脸型与肤色分析",
    aboutFeature4: "朋友照着念的口语化口令",
    footer: "为想拍好照、不想焦虑的人而做。",
    // Upload page
    uploadStep: "第一步",
    uploadTitle: "让我看看你在哪。",
    uploadDesc: "拍下房间、街道、角落——我来读懂光线，帮你设计这张照片。",
    uploadSceneMode: "场景拍照",
    uploadSelfieMode: "自拍模式",
    uploadDropHere: "把照片拖到这里",
    uploadOrTap: "或点下方从相册选择",
    uploadChoose: "选择照片",
    uploadReplace: "更换",
    uploadStart: "帮我出片 →",
    uploadExamples: "示例场景",
    uploadTapToTry: "点一个场景立即体验",
    uploadPrivacy: "照片仅分析一次，不会保存。",
    uploadBack: "← 返回",
    // Analyzing page
    analyzeStep1: "正在读取你的空间…",
    analyzeStep2: "研究中光线",
    analyzeStep3: "寻找最衬你的角度",
    analyzeStep4: "为你组合姿势",
    // Results page
    resultsYourScene: "你的场景",
    resultsYourAngles: "你的最佳角度",
    resultsClose: "关闭",
    resultsTip: "提示",
    resultsNewPhoto: "新照片",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("posepal.lang") as Lang) || "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("posepal.lang", l);
  };

  const t = (key: TranslationKey) => translations[lang][key];

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
