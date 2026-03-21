import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { updateListColumnPosition, type BoardDetailsResponse, type BoardListColumn } from "@/lib/boardapi";
import { reorderColumns, type ColumnDragState, type ColumnHoverTarget } from "./drag-utils";

interface UseColumnDragParams {
  canEditBoard: boolean;
  editingColumnID: string | null;
  editingCardID: string | null;
  token: string | null;
  boardData: BoardDetailsResponse | null;
  baseOrderedColumns: BoardListColumn[];
  setBoardData: Dispatch<SetStateAction<BoardDetailsResponse | null>>;
  loadBoard: () => Promise<void>;
  onError: (message: string) => void;
}

export function useColumnDrag({
  canEditBoard,
  editingColumnID,
  editingCardID,
  token,
  boardData,
  baseOrderedColumns,
  setBoardData,
  loadBoard,
  onError,
}: UseColumnDragParams) {
  const [columnDragState, setColumnDragState] = useState<ColumnDragState | null>(null);
  const [hoverTarget, setHoverTarget] = useState<ColumnHoverTarget | null>(null);
  const hoverTargetRef = useRef<ColumnHoverTarget | null>(null);
  const dropCommittedRef = useRef(false);
  const dragSourceElRef = useRef<HTMLElement | null>(null);

  function updateHoverTarget(target: ColumnHoverTarget | null) {
    hoverTargetRef.current = target;
    setHoverTarget(target);
  }

  const orderedColumns = useMemo(() => {
    if (!columnDragState || !hoverTarget) return baseOrderedColumns;
    const from = columnDragState.startIndex;
    const to = hoverTarget.index;
    if (from === to) return baseOrderedColumns;
    return reorderColumns(baseOrderedColumns, from, to);
  }, [baseOrderedColumns, columnDragState, hoverTarget]);

  function resolveHoverIndex(targetColumnID: string, insertAfter?: boolean): number {
    if (!columnDragState) return 0;

    // Hovering the dragged column's placeholder — keep current position
    if (targetColumnID === columnDragState.columnID) {
      return hoverTargetRef.current?.index ?? columnDragState.startIndex;
    }

    const idx = baseOrderedColumns.findIndex((c) => c.columnID === targetColumnID);
    if (idx < 0) return 0;

    const rawIndex = insertAfter ? idx + 1 : idx;
    // Adjust for source removal (same as card system)
    return columnDragState.startIndex < rawIndex ? rawIndex - 1 : rawIndex;
  }

  function startColumnDrag(columnID: string, startIndex: number, sourceHeight: number, sourceElement?: HTMLElement) {
    if (!canEditBoard || editingColumnID || editingCardID) return;
    dragSourceElRef.current = sourceElement ?? null;
    updateHoverTarget(null);
    dropCommittedRef.current = false;
    setColumnDragState({ columnID, startIndex, sourceHeight });
  }

  function hoverColumn(targetColumnID: string, insertAfter?: boolean) {
    if (!columnDragState) return;

    const index = resolveHoverIndex(targetColumnID, insertAfter);
    const target = { index };
    hoverTargetRef.current = target;
    setHoverTarget((current) => (current?.index === index ? current : target));
  }

  async function commitDrop(state: ColumnDragState, target: ColumnHoverTarget) {
    if (!boardData) return;

    setColumnDragState(null);
    updateHoverTarget(null);

    if (state.startIndex === target.index) return;

    const reordered = reorderColumns(boardData.listColumns, state.startIndex, target.index);
    setBoardData((current) =>
      current ? { ...current, listColumns: reordered } : current
    );

    if (!token) return;

    try {
      await updateListColumnPosition(token, state.columnID, target.index);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to reorder list columns");
      await loadBoard();
    }
  }

  async function dropColumn(targetColumnID?: string, insertAfter?: boolean) {
    if (dropCommittedRef.current) return;
    const state = columnDragState;
    const target =
      hoverTargetRef.current ??
      (state && targetColumnID
        ? { index: resolveHoverIndex(targetColumnID, insertAfter) }
        : null);
    if (!state || !target) return;
    dropCommittedRef.current = true;
    await commitDrop(state, target);
  }

  function clearColumnDrag() {
    setColumnDragState(null);
    updateHoverTarget(null);
    dragSourceElRef.current = null;
  }

  // Attach dragend listener to source element (handles drop on empty space)
  useEffect(() => {
    const sourceEl = dragSourceElRef.current;
    const state = columnDragState;
    if (!state || !sourceEl) return;

    function handleDragEnd() {
      if (!dropCommittedRef.current && hoverTargetRef.current) {
        dropCommittedRef.current = true;
        void commitDrop(state!, hoverTargetRef.current);
      } else if (!dropCommittedRef.current) {
        clearColumnDrag();
      }
      dragSourceElRef.current = null;
    }

    sourceEl.addEventListener("dragend", handleDragEnd);
    return () => sourceEl.removeEventListener("dragend", handleDragEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnDragState]);

  return { columnDragState, orderedColumns, startColumnDrag, hoverColumn, dropColumn, clearColumnDrag };
}
