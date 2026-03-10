import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  createCard,
  createListColumn,
  updateCard,
  updateCardPosition,
  updateListColumn,
  updateListColumnPosition,
  type BoardDetailsResponse,
  type BoardListColumn,
} from "@/lib/boardapi";

export interface ColumnDragState {
  columnID: string;
  startIndex: number;
}

export interface CardDragState {
  cardID: string;
  sourceColumnID: string;
  sourceIndex: number;
}

interface CardMoveResult {
  listColumns: BoardListColumn[];
  changed: boolean;
  finalIndex: number;
}

interface UseBoardWorkspaceParams {
  token: string | null;
  boardId: string;
  canEditBoard: boolean;
  boardData: BoardDetailsResponse | null;
  setBoardData: Dispatch<SetStateAction<BoardDetailsResponse | null>>;
  loadBoard: () => Promise<void>;
}

function normalizeColumns(listColumns: BoardListColumn[]): BoardListColumn[] {
  return listColumns
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((column, columnIndex) => ({
      ...column,
      position: columnIndex,
      cards: column.cards
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((card, cardIndex) => ({ ...card, position: cardIndex })),
    }));
}

function reorderColumns(
  listColumns: BoardListColumn[],
  startIndex: number,
  endIndex: number
): BoardListColumn[] {
  const nextColumns = listColumns.map((column) => ({
    ...column,
    cards: column.cards.map((card) => ({ ...card })),
  }));

  const [movingColumn] = nextColumns.splice(startIndex, 1);
  nextColumns.splice(endIndex, 0, movingColumn);

  return nextColumns.map((column, index) => ({
    ...column,
    position: index,
  }));
}

function moveCard(
  listColumns: BoardListColumn[],
  dragState: CardDragState,
  targetColumnID: string,
  rawTargetIndex: number
): CardMoveResult {
  const sourceColumn = listColumns.find((column) => column.columnID === dragState.sourceColumnID);
  const targetColumn = listColumns.find((column) => column.columnID === targetColumnID);

  if (!sourceColumn || !targetColumn) {
    return {
      listColumns,
      changed: false,
      finalIndex: dragState.sourceIndex,
    };
  }

  if (dragState.sourceColumnID === targetColumnID) {
    const cards = sourceColumn.cards.map((card) => ({ ...card }));
    const sourceIndex = cards.findIndex((card) => card.cardID === dragState.cardID);
    if (sourceIndex < 0) {
      return {
        listColumns,
        changed: false,
        finalIndex: dragState.sourceIndex,
      };
    }

    const [movingCard] = cards.splice(sourceIndex, 1);
    let targetIndex = rawTargetIndex;
    if (sourceIndex < targetIndex) {
      targetIndex -= 1;
    }

    if (targetIndex < 0) {
      targetIndex = 0;
    }
    if (targetIndex > cards.length) {
      targetIndex = cards.length;
    }

    if (targetIndex === sourceIndex) {
      return {
        listColumns,
        changed: false,
        finalIndex: dragState.sourceIndex,
      };
    }

    cards.splice(targetIndex, 0, {
      ...movingCard,
      columnID: targetColumnID,
    });

    const nextColumns = listColumns.map((column) => {
      if (column.columnID !== sourceColumn.columnID) {
        return {
          ...column,
          cards: column.cards.map((card) => ({ ...card })),
        };
      }

      return {
        ...column,
        cards: cards.map((card, index) => ({
          ...card,
          position: index,
          columnID: targetColumnID,
        })),
      };
    });

    return {
      listColumns: nextColumns,
      changed: true,
      finalIndex: targetIndex,
    };
  }

  const sourceCards = sourceColumn.cards.map((card) => ({ ...card }));
  const targetCards = targetColumn.cards.map((card) => ({ ...card }));
  const sourceIndex = sourceCards.findIndex((card) => card.cardID === dragState.cardID);
  if (sourceIndex < 0) {
    return {
      listColumns,
      changed: false,
      finalIndex: dragState.sourceIndex,
    };
  }

  const [movingCard] = sourceCards.splice(sourceIndex, 1);
  let targetIndex = rawTargetIndex;
  if (targetIndex < 0) {
    targetIndex = 0;
  }
  if (targetIndex > targetCards.length) {
    targetIndex = targetCards.length;
  }

  targetCards.splice(targetIndex, 0, {
    ...movingCard,
    columnID: targetColumnID,
  });

  const nextColumns = listColumns.map((column) => {
    if (column.columnID === sourceColumn.columnID) {
      return {
        ...column,
        cards: sourceCards.map((card, index) => ({
          ...card,
          position: index,
        })),
      };
    }

    if (column.columnID === targetColumn.columnID) {
      return {
        ...column,
        cards: targetCards.map((card, index) => ({
          ...card,
          position: index,
          columnID: targetColumnID,
        })),
      };
    }

    return {
      ...column,
      cards: column.cards.map((card) => ({ ...card })),
    };
  });

  return {
    listColumns: nextColumns,
    changed: true,
    finalIndex: targetIndex,
  };
}

export function useBoardWorkspace({
  token,
  boardId,
  canEditBoard,
  boardData,
  setBoardData,
  loadBoard,
}: UseBoardWorkspaceParams) {
  const [boardActionError, setBoardActionError] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [createColumnLoading, setCreateColumnLoading] = useState(false);
  const [cardTitles, setCardTitles] = useState<Record<string, string>>({});
  const [creatingCards, setCreatingCards] = useState<Record<string, boolean>>({});
  const [columnDragState, setColumnDragState] = useState<ColumnDragState | null>(null);
  const [cardDragState, setCardDragState] = useState<CardDragState | null>(null);
  const [editingColumnID, setEditingColumnID] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState("");
  const [savingColumnID, setSavingColumnID] = useState<string | null>(null);
  const [editingCardID, setEditingCardID] = useState<string | null>(null);
  const [editCardTitle, setEditCardTitle] = useState("");
  const [editCardDescription, setEditCardDescription] = useState("");
  const [savingCardID, setSavingCardID] = useState<string | null>(null);

  const orderedColumns = useMemo(
    () => normalizeColumns(boardData?.listColumns ?? []),
    [boardData?.listColumns]
  );

  const setCardTitle = (columnID: string, value: string) => {
    setCardTitles((current) => ({
      ...current,
      [columnID]: value,
    }));
  };

  const clearColumnDragState = () => {
    setColumnDragState(null);
  };

  const clearCardDragState = () => {
    setCardDragState(null);
  };

  const startEditingColumn = (columnID: string) => {
    const column = orderedColumns.find((item) => item.columnID === columnID);
    if (!column) return;

    setBoardActionError("");
    setEditingColumnID(columnID);
    setEditColumnName(column.name);
  };

  const cancelEditingColumn = () => {
    setEditingColumnID(null);
    setEditColumnName("");
  };

  const findCardByColumn = (columnID: string, cardID: string) => {
    const column = orderedColumns.find((item) => item.columnID === columnID);
    return column?.cards.find((item) => item.cardID === cardID) ?? null;
  };

  const startEditingCard = (cardID: string, columnID: string) => {
    if (editingCardID === cardID) {
      return;
    }

    const card = findCardByColumn(columnID, cardID);
    if (!card) return;

    setBoardActionError("");
    setEditingCardID(cardID);
    setEditCardTitle(card.title);
    setEditCardDescription(card.description);
  };

  const cancelEditingCard = () => {
    setEditingCardID(null);
    setEditCardTitle("");
    setEditCardDescription("");
  };

  const getCardTitleValue = (columnID: string, cardID: string) => {
    if (editingCardID === cardID) {
      return editCardTitle;
    }

    return findCardByColumn(columnID, cardID)?.title ?? "";
  };

  const getCardDescriptionValue = (columnID: string, cardID: string) => {
    if (editingCardID === cardID) {
      return editCardDescription;
    }

    return findCardByColumn(columnID, cardID)?.description ?? "";
  };

  const isCardDirty = (columnID: string, cardID: string) => {
    if (editingCardID !== cardID) {
      return false;
    }

    const card = findCardByColumn(columnID, cardID);
    if (!card) {
      return false;
    }

    return editCardTitle !== card.title || editCardDescription !== card.description;
  };

  async function handleCreateListColumn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !canEditBoard) return;

    const trimmedName = newColumnName.trim();
    if (!trimmedName) return;

    setCreateColumnLoading(true);
    setBoardActionError("");

    try {
      const createdColumn = await createListColumn(token, boardId, trimmedName);
      setBoardData((current) => {
        if (!current) return current;

        return {
          ...current,
          listColumns: normalizeColumns([
            ...current.listColumns,
            {
              ...createdColumn,
              cards: [],
            },
          ]),
        };
      });
      setNewColumnName("");
    } catch (err) {
      setBoardActionError(err instanceof Error ? err.message : "Failed to create list column");
    } finally {
      setCreateColumnLoading(false);
    }
  }

  async function handleCreateCard(e: FormEvent<HTMLFormElement>, columnID: string) {
    e.preventDefault();
    if (!token || !canEditBoard) return;

    const title = (cardTitles[columnID] ?? "").trim();
    if (!title) return;

    setCreatingCards((current) => ({ ...current, [columnID]: true }));
    setBoardActionError("");

    try {
      const createdCard = await createCard(token, columnID, title);
      setBoardData((current) => {
        if (!current) return current;

        return {
          ...current,
          listColumns: normalizeColumns(
            current.listColumns.map((column) => {
              if (column.columnID !== columnID) return column;
              return {
                ...column,
                cards: [...column.cards, createdCard],
              };
            })
          ),
        };
      });

      setCardTitle(columnID, "");
    } catch (err) {
      setBoardActionError(err instanceof Error ? err.message : "Failed to create card");
    } finally {
      setCreatingCards((current) => ({ ...current, [columnID]: false }));
    }
  }

  function handleColumnDragStart(columnID: string, startIndex: number) {
    if (!canEditBoard) return;
    if (editingColumnID || editingCardID) return;
    setCardDragState(null);
    setColumnDragState({ columnID, startIndex });
  }

  async function handleColumnDrop(targetIndex: number) {
    const dragState = columnDragState;
    if (!dragState || !boardData) return;

    setColumnDragState(null);

    if (dragState.startIndex === targetIndex) {
      return;
    }

    const reorderedColumns = reorderColumns(boardData.listColumns, dragState.startIndex, targetIndex);
    setBoardData((current) =>
      current
        ? {
            ...current,
            listColumns: reorderedColumns,
          }
        : current
    );

    if (!token) return;

    try {
      await updateListColumnPosition(token, dragState.columnID, targetIndex);
    } catch (err) {
      setBoardActionError(err instanceof Error ? err.message : "Failed to reorder list columns");
      await loadBoard();
    }
  }

  function handleCardDragStart(cardID: string, sourceColumnID: string, sourceIndex: number) {
    if (!canEditBoard) return;
    if (editingColumnID || editingCardID) return;
    setColumnDragState(null);
    setCardDragState({ cardID, sourceColumnID, sourceIndex });
  }

  async function handleCardDrop(targetColumnID: string, targetIndex: number) {
    const dragState = cardDragState;
    if (!dragState || !boardData) return;

    setCardDragState(null);

    const moveResult = moveCard(boardData.listColumns, dragState, targetColumnID, targetIndex);
    if (!moveResult.changed) {
      return;
    }

    setBoardData((current) =>
      current
        ? {
            ...current,
            listColumns: moveResult.listColumns,
          }
        : current
    );

    if (!token) return;

    try {
      await updateCardPosition(token, dragState.cardID, targetColumnID, moveResult.finalIndex);
    } catch (err) {
      setBoardActionError(err instanceof Error ? err.message : "Failed to reorder cards");
      await loadBoard();
    }
  }

  async function handleSaveColumnEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !canEditBoard || !editingColumnID) return;

    const trimmedName = editColumnName.trim();
    if (!trimmedName) {
      setBoardActionError("List column name is required");
      return;
    }

    setSavingColumnID(editingColumnID);
    setBoardActionError("");

    try {
      const updatedColumn = await updateListColumn(token, editingColumnID, trimmedName);
      setBoardData((current) => {
        if (!current) return current;

        return {
          ...current,
          listColumns: current.listColumns.map((column) =>
            column.columnID === editingColumnID
              ? {
                  ...column,
                  ...updatedColumn,
                }
              : column
          ),
        };
      });
      cancelEditingColumn();
    } catch (err) {
      setBoardActionError(err instanceof Error ? err.message : "Failed to update list column");
    } finally {
      setSavingColumnID(null);
    }
  }

  async function handleSaveCardEdit() {
    if (!token || !canEditBoard || !editingCardID) return;

    const currentColumn = orderedColumns.find((column) =>
      column.cards.some((card) => card.cardID === editingCardID)
    );
    if (!currentColumn) return;

    if (!isCardDirty(currentColumn.columnID, editingCardID)) {
      cancelEditingCard();
      return;
    }

    const trimmedTitle = editCardTitle.trim();
    if (!trimmedTitle) {
      setBoardActionError("Card title is required");
      return;
    }

    setSavingCardID(editingCardID);
    setBoardActionError("");

    try {
      const updatedCard = await updateCard(
        token,
        editingCardID,
        trimmedTitle,
        editCardDescription.trim()
      );
      setBoardData((current) => {
        if (!current) return current;

        return {
          ...current,
          listColumns: current.listColumns.map((column) => ({
            ...column,
            cards: column.cards.map((card) =>
              card.cardID === editingCardID
                ? {
                    ...card,
                    ...updatedCard,
                  }
                : card
            ),
          })),
        };
      });
      cancelEditingCard();
    } catch (err) {
      setBoardActionError(err instanceof Error ? err.message : "Failed to update card");
    } finally {
      setSavingCardID(null);
    }
  }

  return {
    boardActionError,
    newColumnName,
    setNewColumnName,
    createColumnLoading,
    cardTitles,
    creatingCards,
    orderedColumns,
    columnDragState,
    cardDragState,
    editingColumnID,
    editColumnName,
    savingColumnID,
    editingCardID,
    editCardTitle,
    editCardDescription,
    savingCardID,
    setCardTitle,
    setEditColumnName,
    setEditCardTitle,
    setEditCardDescription,
    clearColumnDragState,
    clearCardDragState,
    startEditingColumn,
    cancelEditingColumn,
    startEditingCard,
    cancelEditingCard,
    getCardTitleValue,
    getCardDescriptionValue,
    isCardDirty,
    handleCreateListColumn,
    handleCreateCard,
    handleColumnDragStart,
    handleColumnDrop,
    handleCardDragStart,
    handleCardDrop,
    handleSaveColumnEdit,
    handleSaveCardEdit,
  };
}
