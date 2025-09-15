export type AppConfig = {
  usePlayApi: boolean;
  apiKey?: string;
};

export function getConfig(): AppConfig {
  const usePlayApi = (process.env.USE_PLAY_API ?? "false").toLowerCase() === "true";
  const apiKey = process.env.API_KEY || undefined;
  return { usePlayApi, apiKey };
}

