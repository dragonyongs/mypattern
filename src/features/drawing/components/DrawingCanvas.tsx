// src/features/drawing/components/DrawingCanvas.tsx - 수정된 버전
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Line, Rect } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { Eraser, Pen, RotateCcw, Save, Trash2, Palette } from "lucide-react";
import { useDrawingStore } from "@/features/drawing/stores/drawingStore";
import { useUser } from "@/shared/hooks/useAppHooks";

interface DrawingCanvasProps {
  packId: string;
  itemId: string;
  itemType: "vocab" | "sentence";
  itemWord: string;
  onSave?: (saved: boolean) => void;
  className?: string;
}

// 선 데이터 타입
interface LineData {
  id: string;
  tool: "pen" | "eraser";
  points: number[];
  stroke: string;
  strokeWidth: number;
}

const DrawingCanvas = React.memo<DrawingCanvasProps>(
  ({ packId, itemId, itemType, itemWord, onSave, className = "" }) => {
    const user = useUser();
    const { saveDrawing, getDrawing, loadUserDrawings, isLoading } =
      useDrawingStore();
    const stageRef = useRef<Konva.Stage>(null);

    // 상태 관리
    const [strokeColor, setStrokeColor] = useState("#2563eb");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [tool, setTool] = useState<"pen" | "eraser">("pen");
    const [lines, setLines] = useState<LineData[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasLegacyData, setHasLegacyData] = useState(false);

    // 사용자별 그림 로드
    useEffect(() => {
      if (user?.id && packId) {
        loadUserDrawings(user.id, packId);
      }
    }, [user?.id, packId, loadUserDrawings]);

    // 기존 그림 데이터 로드
    const existingDrawing = getDrawing(packId, itemId);

    // 데이터 형식 감지 및 변환 함수
    const parseDrawingData = useCallback((rawData: string): LineData[] => {
      if (!rawData || rawData.trim() === "") {
        return [];
      }

      // SVG 데이터인지 확인
      if (rawData.trim().startsWith("<svg") || rawData.includes("<path")) {
        console.log(
          "🔄 Legacy SVG data detected, cannot convert to Konva format"
        );
        setHasLegacyData(true);
        return []; // SVG는 변환할 수 없으므로 빈 배열 반환
      }

      try {
        // JSON 데이터 파싱 시도
        const parsedData = JSON.parse(rawData);

        if (Array.isArray(parsedData)) {
          // 데이터 유효성 검사
          const validLines = parsedData.filter(
            (line: any) =>
              line &&
              typeof line.id === "string" &&
              Array.isArray(line.points) &&
              line.points.length >= 2
          );

          console.log(
            `✅ Parsed ${validLines.length} valid lines from JSON data`
          );
          setHasLegacyData(false);
          return validLines;
        }
      } catch (error) {
        console.error("❌ Failed to parse drawing data as JSON:", error);
      }

      // 파싱 실패시 빈 배열 반환
      console.warn("⚠️ Unknown data format, starting with empty canvas");
      setHasLegacyData(true);
      return [];
    }, []);

    // 기존 그림이 있으면 로드
    useEffect(() => {
      if (existingDrawing?.svg_data) {
        console.log("🔄 Loading existing drawing data...");
        const parsedLines = parseDrawingData(existingDrawing.svg_data);
        setLines(parsedLines);

        if (parsedLines.length > 0) {
          console.log(
            `✅ Loaded ${parsedLines.length} lines from existing drawing`
          );
        }
      } else {
        // 아이템 변경시 캔버스 초기화
        console.log(`🧹 Clearing canvas for new item: ${packId}-${itemId}`);
        setLines([]);
        setHasLegacyData(false);
      }
    }, [packId, itemId, existingDrawing?.svg_data, parseDrawingData]);

    // 그리기 이벤트 핸들러들
    const handleMouseDown = useCallback(
      (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!stageRef.current) return;

        setIsDrawing(true);
        const pos = stageRef.current.getPointerPosition();
        if (!pos) return;

        const newLine: LineData = {
          id: `line-${Date.now()}-${Math.random()}`,
          tool,
          points: [pos.x, pos.y],
          stroke: tool === "eraser" ? "white" : strokeColor,
          strokeWidth: tool === "eraser" ? strokeWidth * 2 : strokeWidth,
        };

        setLines((prev) => [...prev, newLine]);
      },
      [tool, strokeColor, strokeWidth]
    );

    const handleMouseMove = useCallback(
      (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isDrawing || !stageRef.current) return;

        const pos = stageRef.current.getPointerPosition();
        if (!pos) return;

        setLines((prev) => {
          const newLines = [...prev];
          const lastLine = newLines[newLines.length - 1];
          if (lastLine) {
            lastLine.points = [...lastLine.points, pos.x, pos.y];
          }
          return newLines;
        });
      },
      [isDrawing]
    );

    const handleMouseUp = useCallback(() => {
      setIsDrawing(false);
    }, []);

    // 저장 핸들러
    const handleSave = useCallback(async () => {
      if (!user?.id) {
        alert("로그인이 필요합니다!");
        return;
      }

      if (lines.length === 0) {
        alert("그림을 그린 후 저장해주세요!");
        return;
      }

      try {
        // JSON 형태로 저장
        const drawingData = JSON.stringify(lines);
        console.log("📤 Saving drawing data...", {
          linesCount: lines.length,
          dataSize: drawingData.length,
        });

        await saveDrawing(packId, itemId, itemType, drawingData);
        onSave?.(true);

        // 저장 후 레거시 데이터 플래그 해제
        setHasLegacyData(false);

        const isDemoUser = user.id === "demo-user";
        const message = isDemoUser
          ? "그림이 로컬에 저장되었습니다! 🎨 (데모 모드)"
          : "그림이 저장되었습니다! 🎨";

        alert(message);
      } catch (error) {
        console.error("❌ Failed to save drawing:", error);
        onSave?.(false);
        alert("저장에 실패했습니다. 다시 시도해주세요.");
      }
    }, [user, lines, packId, itemId, itemType, saveDrawing, onSave]);

    // 레거시 데이터 삭제 핸들러
    const handleClearLegacyData = useCallback(async () => {
      if (confirm("이전 그림 데이터를 삭제하고 새로 시작하시겠습니까?")) {
        setLines([]);
        setHasLegacyData(false);

        try {
          // 빈 배열을 JSON 문자열로 저장 (유효한 JSON 데이터)
          const emptyDrawingData = JSON.stringify([]);
          console.log(
            "🧹 Clearing legacy data with empty JSON array:",
            emptyDrawingData
          );

          await saveDrawing(packId, itemId, itemType, emptyDrawingData);
          alert("이전 데이터가 삭제되었습니다. 이제 새로운 그림을 그려보세요!");
        } catch (error) {
          console.error("❌ Failed to clear legacy data:", error);
          alert("데이터 삭제에 실패했습니다. 다시 시도해주세요.");
        }
      }
    }, [packId, itemId, itemType, saveDrawing]);

    // 기타 핸들러들
    const handleUndo = useCallback(() => {
      setLines((prev) => {
        const newLines = prev.slice(0, -1);
        console.log(`↶ Undo: ${prev.length} → ${newLines.length} lines`);
        return newLines;
      });
    }, []);

    const handleClear = useCallback(() => {
      if (confirm("그림을 모두 지우시겠습니까?")) {
        console.log("🧹 Clearing all lines");
        setLines([]);
      }
    }, []);

    return (
      <div
        className={`bg-white rounded-xl border-2 border-gray-200 p-4 ${className}`}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-800">
              "{itemWord}" 그림으로 기억하기
            </h3>
            <p className="text-sm text-gray-500">
              마우스나 터치로 자유롭게 그림을 그려보세요
              {user?.id === "demo-user" && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                  데모 모드
                </span>
              )}
            </p>
          </div>

          {/* 도구 모음 */}
          <div className="flex gap-2">
            <button
              onClick={() => setTool("pen")}
              className={`p-2 rounded transition-colors ${
                tool === "pen"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              title="펜"
            >
              <Pen className="w-4 h-4" />
            </button>

            <button
              onClick={() => setTool("eraser")}
              className={`p-2 rounded transition-colors ${
                tool === "eraser"
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              title="지우개"
            >
              <Eraser className="w-4 h-4" />
            </button>

            <button
              onClick={handleUndo}
              disabled={lines.length === 0}
              className="p-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="되돌리기"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleClear}
              disabled={lines.length === 0}
              className="p-2 rounded bg-red-100 hover:bg-red-200 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="모두 지우기"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 레거시 데이터 경고 */}
        {hasLegacyData && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-orange-800">
                  이전 그림 형식 감지됨
                </h4>
                <p className="text-xs text-orange-700 mt-1">
                  이전 버전에서 저장된 그림은 새로운 시스템과 호환되지 않습니다.
                </p>
              </div>
              <button
                onClick={handleClearLegacyData}
                className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
              >
                초기화하고 새로 시작
              </button>
            </div>
          </div>
        )}

        {/* 캔버스 영역 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg mb-4 bg-white overflow-hidden">
          <Stage
            width={Math.min(window.innerWidth - 100, 800)}
            height={300}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            ref={stageRef}
          >
            <Layer>
              {/* 배경 */}
              <Rect
                x={0}
                y={0}
                width={Math.min(window.innerWidth - 100, 800)}
                height={300}
                fill="white"
              />

              {/* 그린 선들 */}
              {lines.map((line) => (
                <Line
                  key={line.id}
                  points={line.points}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === "eraser" ? "destination-out" : "source-over"
                  }
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* 컨트롤 패널 */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 색상 선택 (펜 모드일 때만) */}
            {tool === "pen" && (
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-600" />
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-8 h-8 rounded border cursor-pointer"
                  title="색상 선택"
                />
              </div>
            )}

            {/* 선 굵기 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {tool === "pen" ? "굵기:" : "지우개:"}
              </span>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-gray-500 w-8">{strokeWidth}px</span>
            </div>

            {/* 선 개수 표시 */}
            <div className="text-xs text-gray-500">선: {lines.length}개</div>
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={isLoading || lines.length === 0}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isLoading ? "저장 중..." : "저장"}
          </button>
        </div>

        {/* 기존 그림 정보 표시 */}
        {existingDrawing && !hasLegacyData && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-green-800">
                저장된 그림
              </h4>
              <span className="text-xs text-green-600">
                {new Date(existingDrawing.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-green-600">
              선 개수: {lines.length}개 | 새로운 그림을 그리면 기존 그림이
              대체됩니다
            </p>
          </div>
        )}
      </div>
    );
  }
);

DrawingCanvas.displayName = "DrawingCanvas";
export default DrawingCanvas;
