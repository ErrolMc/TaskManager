import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  createCard,
  createListColumn,
  deleteCard,
  deleteListColumn,
  updateCard,
  updateListColumn,
  type BoardDetailsResponse,
} from "@/lib/boardapi";
import { normalizeColumns } from "./drag-utils";
import { useColumnDrag } from "./use-column-drag";
import { useCardDrag } from "./use-card-drag";

export type { CardDragState, ColumnDragState } from "./drag-utils";

interface UseBoardWorkspaceParams {
  token: string | null;
  boardId: string;
  canEditBoard: boolean;
  boardData: BoardDetailsResponse | null;
  setBoardData: Dispatch<SetStateAction<BoardDetailsResponse | null>>;
  loadBoard: () => Promise<void>;
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
  const [editingColumnID, setEditingColumnID] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState("");
  const [savingColumnID, setSavingColumnID] = useState<string | null>(null);
  const [deletingColumnID, setDeletingColumnID] = useState<string | null>(null);
  const [editingCardID, setEditingCardID] = useState<string | null>(null);
  const [editCardTitle, setEditCardTitle] = useState("");
  const [editCardDescription, setEditCardDescription] = useState("");
  const [editCardDueAtUTC, setEditCardDueAtUTC] = useState("");
  const [savingCardID, setSavingCardID] = useState<string | null>(null);
  const [deletingCardID, setDeletingCardID] = useState<string | null>(null);

  const baseOrderedColumns = useMemo(
    () => normalizeColumns(boardData?.listColumns ?? []),
    [boardData?.listColumns]
  );

  const columnDrag = useColumnDrag({
    canEditBoard,
    editingColumnID,
    editingCardID,
    token,
    boardData,
    baseOrderedColumns,
    setBoardData,
    loadBoard,
    onError: setBoardActionError,
  });

  const cardDrag = useCardDrag({
    canEditBoard,
    editingColumnID,
    editingCardID,
    token,
    boardData,
    baseOrderedColumns: columnDrag.orderedColumns,
    setBoardData,
    loadBoard,
    onError: setBoardActionError,
  });

  const setCardTitle = (columnID: string, value: string) => {
    setCardTitles((current) => ({ ...current, [columnID]: value }));
  };

  const startEditingColumn = (columnID: string) => {
    const column = cardDrag.orderedColumns.find((item) => item.columnID === columnID);
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
    const column = baseOrderedColumns.find((item) => item.columnID === columnID);
    return column?.cards.find((item) => item.cardID === cardID) ?? null;
  };

  const findCardByID = (cardID: string) => {
    for (const column of baseOrderedColumns) {
      const card = column.cards.find((item) => item.cardID === cardID);
      if (card) return card;
    }
    return null;
  };

  const startEditingCard = (cardID: string, columnID: string) => {
    if (editingCardID === cardID) return;
    const card = findCardByColumn(columnID, cardID);
    if (!card) return;
    setBoardActionError("");
    setEditingCardID(cardID);
    setEditCardTitle(card.title);
    setEditCardDescription(card.description);
    const normalizedDueAtUTC = card.dueAtUTC === "0001-01-01T00:00:00"
      ? ""
      : card.dueAtUTC.slice(0, 19);
    setEditCardDueAtUTC(normalizedDueAtUTC);
  };

  const cancelEditingCard = () => {
    setEditingCardID(null);
    setEditCardTitle("");
    setEditCardDescription("");
    setEditCardDueAtUTC("");
  };

  const getCardTitleValue = (columnID: string, cardID: string) => {
    if (editingCardID === cardID) return editCardTitle;
    return findCardByColumn(columnID, cardID)?.title ?? "";
  };

  const getCardDescriptionValue = (columnID: string, cardID: string) => {
    if (editingCardID === cardID) return editCardDescription;
    return findCardByColumn(columnID, cardID)?.description ?? "";
  };

  const getCardDueAtUTCValue = (columnID: string, cardID: string) => {
    const dueAtUTC = editingCardID === cardID
      ? editCardDueAtUTC
      : findCardByColumn(columnID, cardID)?.dueAtUTC ?? "";
    return !dueAtUTC || dueAtUTC === "0001-01-01T00:00:00" ? "" : dueAtUTC.slice(0, 19);
  };

  const isCardDirty = (columnID: string, cardID: string) => {
    if (editingCardID !== cardID) return false;
    const card = findCardByColumn(columnID, cardID);
    if (!card) return false;
    const currentDueAtUTC = card.dueAtUTC === "0001-01-01T00:00:00"
      ? ""
      : card.dueAtUTC.slice(0, 19);
    return editCardTitle !== card.title
      || editCardDescription !== card.description
      || editCardDueAtUTC !== currentDueAtUTC;
  };

  // Remote edits should win immediately while a card is open.
  useEffect(() => {
    if (!editingCardID) return;

    const liveCard = findCardByID(editingCardID);
    if (!liveCard) return;

    const liveDueAtUTC = liveCard.dueAtUTC === "0001-01-01T00:00:00"
      ? ""
      : liveCard.dueAtUTC.slice(0, 19);

    setEditCardTitle((current) => (current === liveCard.title ? current : liveCard.title));
    setEditCardDescription((current) => (current === liveCard.description ? current : liveCard.description));
    setEditCardDueAtUTC((current) => (current === liveDueAtUTC ? current : liveDueAtUTC));
  }, [editingCardID, baseOrderedColumns]);

  // Coordinated drag start: clear the other drag type first
  function handleColumnDragStart(columnID: string, startIndex: number, sourceHeight: number, sourceElement?: HTMLElement) {
    cardDrag.clearCardDrag();
    columnDrag.startColumnDrag(columnID, startIndex, sourceHeight, sourceElement);
  }

  function handleCardDragStart(cardID: string, sourceColumnID: string, sourceIndex: number, sourceElement?: HTMLElement) {
    columnDrag.clearColumnDrag();
    cardDrag.startCardDrag(cardID, sourceColumnID, sourceIndex, sourceElement);
  }

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
          listColumns: normalizeColumns([...current.listColumns, { ...createdColumn, cards: [] }]),
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
              return { ...column, cards: [...column.cards, createdCard] };
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
            column.columnID === editingColumnID ? { ...column, ...updatedColumn } : column
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

  async function handleDeleteListColumn(columnID: string) {
    if (!token || !canEditBoard) return;

    setDeletingColumnID(columnID);
    setBoardActionError("");

    try {
      await deleteListColumn(token, columnID);
      setBoardData((current) => {
        if (!current) return current;
        return {
          ...current,
          listColumns: current.listColumns.filter((column) => column.columnID !== columnID),
        };
      });

      if (editingColumnID === columnID) {
        cancelEditingColumn();
      }
    } catch (err) {
      setBoardActionError(err instanceof Error ? err.message : "Failed to delete list column");
    } finally {
      setDeletingColumnID(null);
    }
  }

  async function handleSaveCardEdit() {
    if (!token || !canEditBoard || !editingCardID) return;

    const currentColumn = baseOrderedColumns.find((column) =>
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
        editCardDescription.trim(),
        editCardDueAtUTC || "0001-01-01T00:00:00"
      );
      setBoardData((current) => {
        if (!current) return current;
        return {
          ...current,
          listColumns: current.listColumns.map((column) => ({
            ...column,
            cards: column.cards.map((card) =>
              card.cardID === editingCardID ? { ...card, ...updatedCard } : card
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

  async function handleDeleteCard(cardID: string) {
    if (!token || !canEditBoard) return false;

    setDeletingCardID(cardID);
    setBoardActionError("");

    try {
      await deleteCard(token, cardID);
      setBoardData((current) => {
        if (!current) return current;
        return {
          ...current,
          listColumns: current.listColumns.map((column) => ({
            ...column,
            cards: column.cards.filter((card) => card.cardID !== cardID),
          })),
        };
      });

      if (editingCardID === cardID) {
        cancelEditingCard();
      }

      return true;
    } catch (err) {
      setBoardActionError(err instanceof Error ? err.message : "Failed to delete card");
      return false;
    } finally {
      setDeletingCardID(null);
    }
  }

  return {
    boardActionError,
    newColumnName,
    setNewColumnName,
    createColumnLoading,
    cardTitles,
    creatingCards,
    orderedColumns: cardDrag.orderedColumns,
    columnDragState: columnDrag.columnDragState,
    cardDragState: cardDrag.cardDragState,
    editingColumnID,
    editColumnName,
    savingColumnID,
    deletingColumnID,
    editingCardID,
    savingCardID,
    deletingCardID,
    setCardTitle,
    setEditColumnName,
    setEditCardTitle,
    setEditCardDescription,
    setEditCardDueAtUTC,
    clearColumnDragState: columnDrag.clearColumnDrag,
    startEditingColumn,
    cancelEditingColumn,
    startEditingCard,
    cancelEditingCard,
    getCardTitleValue,
    getCardDescriptionValue,
    getCardDueAtUTCValue,
    isCardDirty,
    handleCreateListColumn,
    handleCreateCard,
    handleColumnDragStart,
    handleColumnDragHover: columnDrag.hoverColumn,
    handleColumnDrop: (targetColumnID?: string, insertAfter?: boolean) =>
      columnDrag.dropColumn(targetColumnID, insertAfter),
    handleCardDragStart,
    handleCardDragHover: cardDrag.hoverCard,
    handleCardDrop: cardDrag.dropCard,
    handleSaveColumnEdit,
    handleDeleteListColumn,
    handleSaveCardEdit,
    handleDeleteCard,
  };
}
