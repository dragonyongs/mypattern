// src/shared/utils/logger.ts
type Level = "error" | "warn" | "info" | "log" | "debug";

const LEVEL_ORDER: Record<Level, number> = {
  error: 0,
  warn: 1,
  info: 2,
  log: 3,
  debug: 4,
};

// 환경 변수로 최소 출력 레벨 제어(기본: info)
const MIN_LEVEL_NAME = (import.meta?.env?.VITE_LOG_LEVEL ?? "info") as Level;
const MIN_LEVEL = LEVEL_ORDER[MIN_LEVEL_NAME] ?? LEVEL_ORDER.info;

// dev 여부
const IS_DEV = import.meta?.env?.MODE === "development";

// 안전 순환 참조 처리
function getCircularReplacer() {
  const seen = new WeakSet<any>();
  return (_key: string, value: any) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  };
}

export function safeStringify(x: any) {
  try {
    if (typeof x === "string") return x;
    return JSON.stringify(x, getCircularReplacer(), 2);
  } catch {
    try {
      return String(x);
    } catch {
      return "[Unserializable]";
    }
  }
}

// 공통 포맷터
function formatArgs(args: any[]) {
  return args.map((a) => (typeof a === "object" ? safeStringify(a) : a));
}

function shouldPrint(level: Level) {
  return LEVEL_ORDER[level] <= MIN_LEVEL && (IS_DEV || level !== "debug");
}

const onceSet = new Set<string>();

function print(level: Level, tag: string | undefined, args: any[]) {
  if (!shouldPrint(level)) return;
  const head = tag ? `[${tag}]` : "";
  const formatted = formatArgs(args);
  const c = console as any;
  const fn =
    level === "error"
      ? c.error
      : level === "warn"
      ? c.warn
      : level === "info"
      ? c.info
      : level === "debug"
      ? c.debug
      : c.log;
  try {
    fn.call(c, head, ...formatted);
  } catch {
    // 콘솔 바인딩 이슈 대비
    (console.log as any)(head, ...formatted);
  }
}

export type Logger = {
  log: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  // 동일 키 한 번만 출력
  logOnce: (key: string, level: Level, ...args: any[]) => void;
  // 태그가 다른 새 로거
  withTag: (tag: string) => Logger;
};

function makeLogger(tag?: string): Logger {
  return {
    log: (...args) => print("log", tag, args),
    info: (...args) => print("info", tag, args),
    warn: (...args) => print("warn", tag, args),
    error: (...args) => print("error", tag, args),
    debug: (...args) => print("debug", tag, args),
    logOnce: (key, level, ...args) => {
      if (onceSet.has(key)) return;
      onceSet.add(key);
      print(level, tag, args);
    },
    withTag: (t: string) => makeLogger(t),
  };
}

export const logger: Logger = makeLogger();
