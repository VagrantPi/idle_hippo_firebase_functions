export type AppConfig = {
  usePlayApi: boolean;
  apiKey?: string;
  allowedOrigins: string;
};

export function getConfig(): AppConfig {
  const usePlayApi = (process.env.USE_PLAY_API ?? "false").toLowerCase() === "true";
  const apiKey = process.env.API_KEY || undefined;
  const allowedOrigins = process.env.ALLOWED_ORIGINS || "*";
  return { usePlayApi, apiKey, allowedOrigins };
}
