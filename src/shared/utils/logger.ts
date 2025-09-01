// src/shared/utils/logger.ts
// 안전한 stringify + logger (개발환경에서만 사용)
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

export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      try {
        // console.log에 객체 그대로 넘기면 React의 override가 포맷하려다 실패할 수 있음
        console.log(
          ...args.map((a) => (typeof a === "object" ? safeStringify(a) : a))
        );
      } catch {
        try {
          console.log(...args.map((a) => safeStringify(a)));
        } catch {
          // swallow
        }
      }
    }
  },

  error: (...args: any[]) => {
    try {
      // 첫 인자가 문자열이면 그대로 출력하고, 나머지는 안전하게 stringify
      if (typeof args[0] === "string") {
        const [head, ...rest] = args;
        console.error(
          head,
          ...rest.map((r) => (typeof r === "object" ? safeStringify(r) : r))
        );
      } else {
        console.error(
          ...args.map((a) => (typeof a === "object" ? safeStringify(a) : a))
        );
      }
    } catch {
      try {
        console.error(
          "logger.error fallback:",
          ...args.map((a) => safeStringify(a))
        );
      } catch {
        // swallow
      }
    }
  },

  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      try {
        // 첫 인자가 문자열이면 그대로 출력하고, 나머지는 안전하게 stringify
        if (typeof args[0] === "string") {
          const [head, ...rest] = args;
          console.warn(
            head,
            ...rest.map((r) => (typeof r === "object" ? safeStringify(r) : r))
          );
        } else {
          console.warn(
            ...args.map((a) => (typeof a === "object" ? safeStringify(a) : a))
          );
        }
      } catch {
        try {
          console.warn(
            "logger.warn fallback:",
            ...args.map((a) => safeStringify(a))
          );
        } catch {
          // swallow
        }
      }
    }
  },

  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      try {
        // 첫 인자가 문자열이면 그대로 출력하고, 나머지는 안전하게 stringify
        if (typeof args[0] === "string") {
          const [head, ...rest] = args;
          console.debug(
            head,
            ...rest.map((r) => (typeof r === "object" ? safeStringify(r) : r))
          );
        } else {
          console.debug(
            ...args.map((a) => (typeof a === "object" ? safeStringify(a) : a))
          );
        }
      } catch {
        try {
          console.debug(
            "logger.debug fallback:",
            ...args.map((a) => safeStringify(a))
          );
        } catch {
          // swallow
        }
      }
    }
  },
};
