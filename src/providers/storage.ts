// src/providers/storage.ts
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
  version: number; // 버전 관리 추가
}

const STORAGE_KEY = "mypattern-app-data";
const CURRENT_VERSION = 1;

export function loadFromStorage(): Partial<StorageData> | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // 버전 체크 및 마이그레이션
    if (parsed.version !== CURRENT_VERSION) {
      console.log("Storage version mismatch, applying migration...");
      return migrateData(parsed);
    }

    // 기본값으로 fallback 처리
    return {
      sentences: Array.isArray(parsed.sentences) ? parsed.sentences : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      chunks: Array.isArray(parsed.chunks) ? parsed.chunks : [],
      settings: { ...defaultSettings, ...parsed.settings },
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      version: CURRENT_VERSION,
    };
  } catch (error) {
    console.error("Failed to load from storage:", error);
    return null;
  }
}

export function saveToStorage(data: Partial<StorageData>): boolean {
  try {
    const toSave: StorageData = {
      sentences: Array.isArray(data.sentences) ? data.sentences : [],
      patterns: Array.isArray(data.patterns) ? data.patterns : [],
      chunks: Array.isArray(data.chunks) ? data.chunks : [],
      settings: data.settings || defaultSettings,
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      lastUpdated: new Date().toISOString(),
      version: CURRENT_VERSION,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return true;
  } catch (error) {
    console.error("Failed to save to storage:", error);
    return false;
  }
}

export function clearStorage(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear storage:", error);
    return false;
  }
}

// 데이터 마이그레이션 함수
function migrateData(oldData: any): Partial<StorageData> {
  // 필요시 이전 버전 데이터를 현재 버전으로 변환
  return {
    sentences: oldData.sentences || [],
    patterns: oldData.patterns || [],
    chunks: oldData.chunks || [],
    settings: { ...defaultSettings, ...oldData.settings },
    sessions: oldData.sessions || [],
    lastUpdated: new Date().toISOString(),
    version: CURRENT_VERSION,
  };
}

// 스토리지 용량 체크
export function getStorageSize(): number {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? new Blob([data]).size : 0;
  } catch {
    return 0;
  }
}

// 스토리지 상태 체크
export function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
