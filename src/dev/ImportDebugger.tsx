// src/dev/ImportDebugger.tsx
import React, { useEffect, useState } from "react";

type Result = {
  moduleAlias: string;
  tried: { spec: string; ok: boolean; error?: string }[];
  finalOk: boolean;
};

const MODULE_ALIASES = [
  // 문제 페이지에서 주로 쓰는 모듈(원래 쓰던 alias/이름)
  "@/shared/hooks/useTTS",
  "@/shared/hooks/useVoiceRecorder",
  "@/features/pronunciation/ui/PronunciationCard",
  "@/shared/utils/logger",
  "lucide-react",
];

function generateCandidates(alias: string) {
  // 여러 후보(specifier)를 만들어 시도한다
  const name = alias.replace(/^@\/?/, ""); // '@/shared/..' -> 'shared/...'
  const candidates = [
    alias,
    `${alias}.ts`,
    `${alias}.tsx`,
    `/${alias}`, // 절대 경로 시작 시도
    `/${alias}.ts`,
    `/${alias}.tsx`,
    `/src/${name}`,
    `/src/${name}.ts`,
    `/src/${name}.tsx`,
    `./src/${name}`,
    `./src/${name}.ts`,
    `./src/${name}.tsx`,
  ];

  // node-style relative guesses
  // also try removing '@/'
  if (alias.startsWith("@/")) {
    const noAt = alias.slice(2);
    candidates.push(noAt, `src/${noAt}`, `src/${noAt}.ts`, `src/${noAt}.tsx`);
  }

  // unique
  return Array.from(new Set(candidates));
}

export default function ImportDebugger() {
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      for (const alias of MODULE_ALIASES) {
        const tried: Result["tried"] = [];
        const candidates = generateCandidates(alias);
        let ok = false;
        for (const spec of candidates) {
          try {
            // dynamic import 시도
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await import(/* @vite-ignore */ spec);
            tried.push({ spec, ok: true });
            ok = true;
            break;
          } catch (err: any) {
            let message = "Unknown error";
            try {
              message = err?.message ?? String(err);
            } catch {
              message = "[could not stringify error]";
            }
            tried.push({ spec, ok: false, error: message });
            // 계속 후보 시도
          }
        }
        setResults((r) => [...r, { moduleAlias: alias, tried, finalOk: ok }]);
        // 만약 어떤 후보에서 런타임 예외(모듈 로드는 됐지만 탑레벨 실행에서 예외)라면 tried 항목의 error에 그 에러 메시지가 담길 것임.
        // 다음 alias도 계속 검사
      }
      setDone(true);
    })();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "monospace" }}>
      <h2>Import Debugger (enhanced)</h2>
      <p>각 alias에 대해 여러 후보 경로를 시도합니다. (개발용)</p>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "#0b1220",
          color: "#e6edf3",
          padding: 12,
        }}
      >
        {JSON.stringify({ done, results }, null, 2)}
      </pre>
      <p>
        완료 후, `finalOk: false` 이고 `tried` 중에 에러 메시지가 `"Cannot
        convert object to primitive value"` 또는 다른 런타임 예외를 표시하면
        해당 spec을 복사해서 그 파일을 열어 탑레벨 코드를 점검하세요.
      </p>
    </div>
  );
}
