export function getZhipuApiKey(): string | undefined {
  return process.env.ZHIPU_API_KEY;
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}