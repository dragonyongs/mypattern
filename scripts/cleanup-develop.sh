#!/usr/bin/env bash
# scripts/cleanup-develop.sh
# Real VOCA 14일 학습 플로우에 맞춘 정리 스크립트
# 안전 모드 + 존재 확인 + 건너뛰기 지원

set -euo pipefail

echo "[1/6] 브랜치/상태 확인"
git rev-parse --abbrev-ref HEAD
git status

# 필요한 경우, develop이 origin/develop를 추적하도록 고정(환경에 맞게 주석 해제)
# git branch --set-upstream-to=origin/develop develop

echo "[2/6] 삭제 대상 선언(실제 필요에 맞게 추가/수정 가능)"
# 비어있어도 set -u에서 안전하도록 빈 배열로 초기화
REMOVE_PATHS=(
  # 빌드(패턴 제너레이터) 전면 제거
  "src/features/build"
  "src/pages/BuildPage.tsx"

  # 실험/임시 텍스트 페이지 제거(새 플로우에서 미사용 가정)
  "src/pages/TextPage.tsx"

  # 중복/이전 위치의 스마트 패턴 서비스가 존재한다면 제거(공용으로 통합 예정)
  "src/features/learn/services/smartPatternService.ts"

  # 학습 내부 관리 전용 UI 중 새 플로우 미사용 가정
  "src/features/learn/components/PatternManager.tsx"

  # 초기 시드 전용 폴더(런타임 시 불필요 가정)
  "src/seed"
)

echo "[3/6] 이동(리팩토링) 매핑 선언 old=>new (존재 시에만 이동)"
# "old_path::new_path"
MOVE_MAP=(
  # 학습 메인 컴포넌트를 페이지로 승격
  "src/features/learn/components/PatternCompose.tsx::src/pages/Learn/PatternCompose.tsx"

  # 엔진/서비스를 shared/services로 집약
  "src/features/learn/services/patternEngine.ts::src/shared/services/patternEngine.ts"
  "src/shared/smartPatternService.ts::src/shared/services/smartPatternService.ts"
  "src/shared/services/dataPackLoader.ts::src/shared/services/dataPackLoader.ts"

  # 공용 훅/라이브러리는 유지(경로 재정비 예시, 존재 시 이동)
  "src/shared/hooks/useDebouncedValue.ts::src/shared/hooks/useDebouncedValue.ts"
  "src/shared/lib/lang.ts::src/shared/lib/lang.ts"
  "src/shared/lib/schedule.ts::src/shared/lib/schedule.ts"
)

echo "[4/6] 삭제 실행"
for p in "${REMOVE_PATHS[@]:-}"; do
  if [ -e "$p" ]; then
    echo " - git rm -r $p"
    git rm -r "$p"
  else
    echo " - 건너뜀(없음): $p"
  fi
done

echo "[5/6] 이동 실행"
for pair in "${MOVE_MAP[@]:-}"; do
  OLD="${pair%%::*}"
  NEW="${pair##*::}"
  if [ -e "$OLD" ]; then
    mkdir -p "$(dirname "$NEW")"
    echo " - git mv $OLD $NEW"
    git mv "$OLD" "$NEW"
  else
    echo " - 건너뜀(없음): $OLD"
  fi
done

echo "[6/6] 변경 요약"
git status --short

echo
echo "커밋 예시:"
echo "  git add -A"
echo "  git commit -m \"chore(cleanup): streamline for Real VOCA 14-day flow (remove build, unify services)\""
echo "  git push origin develop"
