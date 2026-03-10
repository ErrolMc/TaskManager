import type { BoardListColumn } from "@/lib/boardapi";

export interface ColumnDragState {
  columnID: string;
  startIndex: number;
  sourceHeight: number;
}

export interface CardDragState {
  cardID: string;
  sourceColumnID: string;
  sourceIndex: number;
}

export interface ColumnHoverTarget {
  index: number;
}

export interface CardHoverTarget {
  columnID: string;
  index: number;
}

export interface CardMoveResult {
  listColumns: BoardListColumn[];
  changed: boolean;
  finalIndex: number;
}

export function normalizeColumns(listColumns: BoardListColumn[]): BoardListColumn[] {
  return listColumns
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((column, i) => ({
      ...column,
      position: i,
      cards: column.cards
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((card, j) => ({ ...card, position: j })),
    }));
}

export function reorderColumns(
  listColumns: BoardListColumn[],
  fromIndex: number,
  toIndex: number
): BoardListColumn[] {
  const next = listColumns.map((col) => ({
    ...col,
    cards: col.cards.map((card) => ({ ...card })),
  }));
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((col, i) => ({ ...col, position: i }));
}

export function moveCard(
  columns: BoardListColumn[],
  drag: CardDragState,
  targetColumnID: string,
  rawTargetIndex: number
): CardMoveResult {
  const unchanged: CardMoveResult = {
    listColumns: columns,
    changed: false,
    finalIndex: drag.sourceIndex,
  };

  const srcCol = columns.find((c) => c.columnID === drag.sourceColumnID);
  const tgtCol = columns.find((c) => c.columnID === targetColumnID);
  if (!srcCol || !tgtCol) return unchanged;

  const sameColumn = drag.sourceColumnID === targetColumnID;
  const srcCards = srcCol.cards.map((c) => ({ ...c }));
  const srcIdx = srcCards.findIndex((c) => c.cardID === drag.cardID);
  if (srcIdx < 0) return unchanged;

  const [card] = srcCards.splice(srcIdx, 1);
  const tgtCards = sameColumn ? srcCards : tgtCol.cards.map((c) => ({ ...c }));
  let tgtIdx = sameColumn && srcIdx < rawTargetIndex ? rawTargetIndex - 1 : rawTargetIndex;
  tgtIdx = Math.max(0, Math.min(tgtIdx, tgtCards.length));

  if (sameColumn && tgtIdx === srcIdx) return unchanged;

  tgtCards.splice(tgtIdx, 0, { ...card, columnID: targetColumnID });

  const reindex = (cards: typeof srcCards) =>
    cards.map((c, i) => ({ ...c, position: i }));

  const nextColumns = columns.map((col) => {
    if (sameColumn && col.columnID === srcCol.columnID) {
      return { ...col, cards: reindex(tgtCards) };
    }
    if (col.columnID === srcCol.columnID) return { ...col, cards: reindex(srcCards) };
    if (col.columnID === tgtCol.columnID) {
      return {
        ...col,
        cards: reindex(tgtCards.map((c) => ({ ...c, columnID: targetColumnID }))),
      };
    }
    return { ...col, cards: col.cards.map((c) => ({ ...c })) };
  });

  return { listColumns: nextColumns, changed: true, finalIndex: tgtIdx };
}
