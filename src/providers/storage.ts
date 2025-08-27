import {
  Sentence,
  Pattern,
  Chunk,
  Settings,
  PracticeSession,
  defaultSettings,
} from "@/entities";

export interface StorageData {
  sentences: Sentence[];
  patterns: Pattern[];
  chunks: Chunk[];
  settings: Settings;
  sessions: PracticeSession[];
  lastUpdated: string;
}

const STORAGE_KEY = "mypattern-app-data";

export function loadFromStorage(): Partial<StorageData> | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // 기본값으로 fallback 처리
    return {
      sentences: parsed.sentences || [],
      patterns: parsed.patterns || [],
      chunks: parsed.chunks || [],
      settings: { ...defaultSettings, ...parsed.settings },
      sessions: parsed.sessions || [],
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to load from storage:", error);
    return null;
  }
}

export function saveToStorage(data: Partial<StorageData>): void {
  try {
    const toSave: StorageData = {
      sentences: data.sentences || [],
      patterns: data.patterns || [],
      chunks: data.chunks || [],
      settings: data.settings || defaultSettings,
      sessions: data.sessions || [],
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error("Failed to save to storage:", error);
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear storage:", error);
  }
}
