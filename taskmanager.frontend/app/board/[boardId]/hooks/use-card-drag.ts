import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { updateCardPosition, type BoardDetailsResponse, type BoardListColumn } from "@/lib/boardapi";
import { moveCard, type CardDragState, type CardHoverTarget } from "./drag-utils";

interface UseCardDragParams {
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

export function useCardDrag({
  canEditBoard,
  editingColumnID,
  editingCardID,
  token,
  boardData,
  baseOrderedColumns,
  setBoardData,
  loadBoard,
  onError,
}: UseCardDragParams) {
  const [dragState, setDragState] = useState<CardDragState | null>(null);
  const [hoverTarget, setHoverTarget] = useState<CardHoverTarget | null>(null);

  const dragStateRef = useRef<CardDragState | null>(null);
  const hoverTargetRef = useRef<CardHoverTarget | null>(null);
  const dropCommittedRef = useRef(false);
  const dragSourceElRef = useRef<HTMLElement | null>(null);

  const updateDragState = (value: CardDragState | null) => {
    console.log("[card-drag] dragState:", value ? `card=${value.cardID} col=${value.sourceColumnID} idx=${value.sourceIndex}` : "null");
    dragStateRef.current = value;
    setDragState(value);
  };

  const updateHoverTarget = (value: CardHoverTarget | null) => {
    dragStateRef.current && console.log("[card-drag] hoverTarget:", value ? `col=${value.columnID} idx=${value.index}` : "null");
    hoverTargetRef.current = value;
    setHoverTarget(value);
  };

  const clearCardDrag = () => {
    console.log("[card-drag] clearCardDrag called");
    updateDragState(null);
    updateHoverTarget(null);
  };

  // Preview-aware column ordering: shows where the card will land during drag
  const orderedColumns = useMemo(() => {
    if (!dragState || !hoverTarget) return baseOrderedColumns;
    const preview = moveCard(baseOrderedColumns, dragState, hoverTarget.columnID, hoverTarget.index);
    return preview.changed ? preview.listColumns : baseOrderedColumns;
  }, [baseOrderedColumns, dragState, hoverTarget]);

  function resolveHoverIndex(targetColumnID: string, targetCardID?: string, insertAfter?: boolean): number {
    const col = baseOrderedColumns.find((c) => c.columnID === targetColumnID);
    if (!col) return 0;
    if (!targetCardID) return col.cards.length;

    if (targetCardID === dragState?.cardID) {
      return hoverTarget?.columnID === targetColumnID ? hoverTarget.index : col.cards.length;
    }

    const idx = col.cards.findIndex((c) => c.cardID === targetCardID);
    if (idx < 0) return col.cards.length;
    return insertAfter ? idx + 1 : idx;
  }

  function startCardDrag(cardID: string, sourceColumnID: string, sourceIndex: number, sourceElement?: HTMLElement) {
    if (!canEditBoard || editingColumnID || editingCardID) return;
    console.log("[card-drag] startCardDrag:", { cardID, sourceColumnID, sourceIndex, hasElement: !!sourceElement });
    dragSourceElRef.current = sourceElement ?? null;
    updateHoverTarget(null);
    dropCommittedRef.current = false;
    updateDragState({ cardID, sourceColumnID, sourceIndex });
  }

  function hoverCard(targetColumnID: string, targetCardID?: string, insertAfter?: boolean) {
    if (!dragState) return;

    // Column-background hover (no specific card) for a column we're already
    // tracking: ignore to prevent overriding card-level positions when the
    // mouse briefly crosses gaps between cards (space-y-2).
    if (!targetCardID && hoverTargetRef.current?.columnID === targetColumnID) {
      return;
    }

    const index = resolveHoverIndex(targetColumnID, targetCardID, insertAfter);
    const target = { columnID: targetColumnID, index };
    hoverTargetRef.current = target;
    setHoverTarget((current) =>
      current?.columnID === targetColumnID && current.index === index ? current : target
    );
  }

  async function commitDrop(state: CardDragState, target: CardHoverTarget) {
    if (!boardData) {
      console.warn("[card-drag] commitDrop: no boardData, aborting");
      return;
    }

    console.log("[card-drag] commitDrop:", { cardID: state.cardID, targetCol: target.columnID, targetIdx: target.index });
    updateDragState(null);
    updateHoverTarget(null);

    const result = moveCard(boardData.listColumns, state, target.columnID, target.index);
    if (!result.changed) {
      console.log("[card-drag] commitDrop: moveCard returned unchanged");
      return;
    }

    setBoardData((current) =>
      current ? { ...current, listColumns: result.listColumns } : current
    );

    if (!token) return;

    try {
      await updateCardPosition(token, state.cardID, target.columnID, result.finalIndex);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to reorder cards");
      await loadBoard();
    }
  }

  async function dropCard(targetColumnID: string, targetCardID?: string) {
    const state = dragState;
    if (!state || !boardData) {
      console.warn("[card-drag] dropCard: no drag state or board data", { hasDragState: !!state, hasBoardData: !!boardData });
      return;
    }

    const resolved =
      hoverTarget?.columnID === targetColumnID
        ? hoverTarget
        : { columnID: targetColumnID, index: resolveHoverIndex(targetColumnID, targetCardID) };

    console.log("[card-drag] dropCard:", { targetColumnID, targetCardID, resolved, dropCommitted: dropCommittedRef.current });
    dropCommittedRef.current = true;
    await commitDrop(state, resolved);
  }

  // Ref to latest commitDrop so the dragend listener always calls the latest version
  const commitDropRef = useRef(commitDrop);
  commitDropRef.current = commitDrop;

  // Dragend listener attached to the original drag source element.
  // React replaces the dragged card with a placeholder, detaching the original
  // DOM node. A document-level listener won't catch dragend because the event
  // fires on the (now detached) source element and can't bubble up.
  // Listening directly on the element guarantees we always finalize the drop.
  useEffect(() => {
    if (!dragState) return;

    const el = dragSourceElRef.current;
    if (!el) {
      console.warn("[card-drag] no drag source element captured, falling back to document listener");
    }

    const handleDragEnd = () => {
      console.log("[card-drag] dragend fired:", {
        source: el ? "element" : "document",
        dropCommitted: dropCommittedRef.current,
        hasDragState: !!dragStateRef.current,
        hasHoverTarget: !!hoverTargetRef.current,
        dragState: dragStateRef.current,
        hoverTarget: hoverTargetRef.current,
      });

      if (dropCommittedRef.current) {
        console.log("[card-drag] dragend: drop already committed, cleaning up");
        dropCommittedRef.current = false;
        updateDragState(null);
        updateHoverTarget(null);
        return;
      }

      const state = dragStateRef.current;
      if (!state) {
        console.warn("[card-drag] dragend: no drag state in ref, cleaning up");
        updateDragState(null);
        updateHoverTarget(null);
        return;
      }

      const target = hoverTargetRef.current;
      if (target) {
        console.log("[card-drag] dragend: committing via fallback path", { cardID: state.cardID, target });
        void commitDropRef.current(state, target);
      } else {
        console.warn("[card-drag] dragend: no hover target, reverting drag");
        updateDragState(null);
        updateHoverTarget(null);
      }
    };

    const listenTarget = el ?? document;
    listenTarget.addEventListener("dragend", handleDragEnd);
    return () => {
      listenTarget.removeEventListener("dragend", handleDragEnd);
      if (el) dragSourceElRef.current = null;
    };
  }, [dragState]);

  return {
    cardDragState: dragState,
    orderedColumns,
    startCardDrag,
    hoverCard,
    dropCard,
    clearCardDrag,
  };
}
