import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import type { BoardListColumn } from "@/lib/boardapi";
import type { CardDragState, ColumnDragState } from "./drag-utils";

interface UseBoardWorkspaceRendererParams {
  isLoading: boolean;
  error: string;
  boardActionError: string;
  canEditBoard: boolean;
  newColumnName: string;
  setNewColumnName: (value: string) => void;
  createColumnLoading: boolean;
  cardTitles: Record<string, string>;
  creatingCards: Record<string, boolean>;
  orderedColumns: BoardListColumn[];
  columnDragState: ColumnDragState | null;
  cardDragState: CardDragState | null;
  editingColumnID: string | null;
  editColumnName: string;
  savingColumnID: string | null;
  deletingColumnID: string | null;
  editingCardID: string | null;
  savingCardID: string | null;
  deletingCardID: string | null;
  onSetCardTitle: (columnID: string, value: string) => void;
  onSetEditColumnName: (value: string) => void;
  onSetEditCardTitle: (value: string) => void;
  onSetEditCardDescription: (value: string) => void;
  onGetCardTitleValue: (columnID: string, cardID: string) => string;
  onGetCardDescriptionValue: (columnID: string, cardID: string) => string;
  onIsCardDirty: (columnID: string, cardID: string) => boolean;
  onStartEditingColumn: (columnID: string) => void;
  onCancelEditingColumn: () => void;
  onSaveColumnEdit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteListColumn: (columnID: string) => Promise<void>;
  onStartEditingCard: (cardID: string, columnID: string) => void;
  onCancelEditingCard: () => void;
  onSaveCardEdit: () => Promise<void>;
  onDeleteCard: (cardID: string) => Promise<boolean>;
  onCreateListColumn: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateCard: (e: FormEvent<HTMLFormElement>, columnID: string) => Promise<void>;
  onColumnDragStart: (columnID: string, startIndex: number, sourceHeight: number, sourceElement: HTMLElement) => void;
  onColumnDragEnd: () => void;
  onColumnDragHover: (targetColumnID: string, insertAfter: boolean) => void;
  onColumnDrop: (targetColumnID?: string, insertAfter?: boolean) => Promise<void>;
  onCardDragStart: (cardID: string, sourceColumnID: string, sourceIndex: number, sourceElement: HTMLElement) => void;
  onCardDragHover: (targetColumnID: string, targetCardID?: string, insertAfter?: boolean) => void;
  onCardDrop: (targetColumnID: string, targetCardID?: string) => Promise<void>;
}

function setColumnDragImage(event: DragEvent<HTMLDivElement>) {
  if (!event.dataTransfer) return;

  event.dataTransfer.setData("text/plain", "column");
  event.dataTransfer.effectAllowed = "move";

  const handle = event.currentTarget;
  const columnEl = handle.parentElement;
  if (!columnEl) return;

  const rect = columnEl.getBoundingClientRect();
  const ghost = columnEl.cloneNode(true) as HTMLDivElement;

  ghost.style.position = "fixed";
  ghost.style.top = "-10000px";
  ghost.style.left = "-10000px";
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.pointerEvents = "none";
  ghost.style.opacity = "1";
  ghost.style.background = "var(--background, #fff)";

  document.body.appendChild(ghost);

  const offsetX = Math.max(0, Math.min(event.clientX - rect.left, rect.width - 1));
  const offsetY = Math.max(0, Math.min(event.clientY - rect.top, rect.height - 1));
  event.dataTransfer.setDragImage(ghost, offsetX, offsetY);

  requestAnimationFrame(() => {
    ghost.remove();
  });
}

function setCardDragImage(event: DragEvent<HTMLDivElement>) {
  if (!event.dataTransfer) return;

  event.dataTransfer.setData("text/plain", "card");
  event.dataTransfer.effectAllowed = "move";

  const sourceCard = event.currentTarget;
  const rect = sourceCard.getBoundingClientRect();
  const ghostCard = sourceCard.cloneNode(true) as HTMLDivElement;

  ghostCard.style.position = "fixed";
  ghostCard.style.top = "-10000px";
  ghostCard.style.left = "-10000px";
  ghostCard.style.width = `${rect.width}px`;
  ghostCard.style.pointerEvents = "none";
  ghostCard.style.opacity = "1";

  document.body.appendChild(ghostCard);

  const offsetX = Math.max(0, Math.min(event.clientX - rect.left, rect.width - 1));
  const offsetY = Math.max(0, Math.min(event.clientY - rect.top, rect.height - 1));
  event.dataTransfer.setDragImage(ghostCard, offsetX, offsetY);

  requestAnimationFrame(() => {
    ghostCard.remove();
  });
}

export function useBoardWorkspaceRenderer({
  isLoading,
  error,
  boardActionError,
  canEditBoard,
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
  deletingColumnID,
  editingCardID,
  savingCardID,
  deletingCardID,
  onSetCardTitle,
  onSetEditColumnName,
  onSetEditCardTitle,
  onSetEditCardDescription,
  onGetCardTitleValue,
  onGetCardDescriptionValue,
  onIsCardDirty,
  onStartEditingColumn,
  onCancelEditingColumn,
  onSaveColumnEdit,
  onDeleteListColumn,
  onStartEditingCard,
  onCancelEditingCard,
  onSaveCardEdit,
  onDeleteCard,
  onCreateListColumn,
  onCreateCard,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDragHover,
  onColumnDrop,
  onCardDragStart,
  onCardDragHover,
  onCardDrop,
}: UseBoardWorkspaceRendererParams): ReactNode {
  const [focusedDescriptionCardID, setFocusedDescriptionCardID] = useState<string | null>(null);
  const [overlayCardID, setOverlayCardID] = useState<string | null>(null);
  const [overlayColumnID, setOverlayColumnID] = useState<string | null>(null);
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const addListContainerRef = useRef<HTMLDivElement | null>(null);
  const wasCreateColumnLoadingRef = useRef(false);

  useEffect(() => {
    if (!overlayCardID) return;

    let containingColumnID: string | null = null;
    for (const column of orderedColumns) {
      if (column.cards.some((card) => card.cardID === overlayCardID)) {
        containingColumnID = column.columnID;
        break;
      }
    }

    if (!containingColumnID) {
      onCancelEditingCard();
      setOverlayCardID(null);
      setOverlayColumnID(null);
      return;
    }

    if (overlayColumnID !== containingColumnID) {
      setOverlayColumnID(containingColumnID);
    }
  }, [orderedColumns, overlayCardID, overlayColumnID, onCancelEditingCard]);

  useEffect(() => {
    if (!isAddListOpen) return;

    function handleClickOutsideAddList(event: MouseEvent) {
      if (!addListContainerRef.current) return;
      if (addListContainerRef.current.contains(event.target as Node)) return;

      setIsAddListOpen(false);
      setNewColumnName("");
    }

    document.addEventListener("mousedown", handleClickOutsideAddList);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideAddList);
    };
  }, [isAddListOpen, setNewColumnName]);

  useEffect(() => {
    if (createColumnLoading) {
      wasCreateColumnLoadingRef.current = true;
      return;
    }

    if (!wasCreateColumnLoadingRef.current) return;
    wasCreateColumnLoadingRef.current = false;

    if (newColumnName.trim() === "") {
      setIsAddListOpen(false);
    }
  }, [createColumnLoading, newColumnName]);

  return useMemo(
    () => {
      // --- Drag prop helpers ---
      const canDragColumn = (columnID: string) =>
        canEditBoard && editingColumnID !== columnID && !editingCardID;

      const canDragCard = (cardID: string) =>
        canEditBoard && editingCardID !== cardID && !editingColumnID;

      const columnContainerDragProps = (columnID: string, columnIndex: number) => ({
        onDragOver: (e: DragEvent<HTMLDivElement>) => {
          if (columnDragState) {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
            const rect = e.currentTarget.getBoundingClientRect();
            const insertAfter = e.clientX > rect.left + rect.width / 2;
            onColumnDragHover(columnID, insertAfter);
          }
          if (cardDragState) {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
            onCardDragHover(columnID);
          }
        },
        onDrop: (e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          if (columnDragState) {
            const rect = e.currentTarget.getBoundingClientRect();
            const insertAfter = e.clientX > rect.left + rect.width / 2;
            void onColumnDrop(columnID, insertAfter);
            return;
          }
          if (cardDragState) void onCardDrop(columnID);
        },
      });

      const columnDragHandle = (columnID: string, columnIndex: number) => ({
        draggable: canDragColumn(columnID),
        "data-column-handle": true,
        onDragStart: (e: DragEvent<HTMLDivElement>) => {
          setColumnDragImage(e);
          const columnEl = e.currentTarget.parentElement;
          const height = columnEl?.getBoundingClientRect().height ?? 0;
          onColumnDragStart(columnID, columnIndex, height, e.currentTarget);
        },
        // Finalization is handled by native dragend listener in use-column-drag.
        // Avoid clearing state early here (Safari can fire this before drop handling).
        onDragEnd: () => {},
      });

      const cardDragSource = (cardID: string, columnID: string, cardIndex: number) => ({
        draggable: canDragCard(cardID),
        onDragStart: (e: DragEvent<HTMLDivElement>) => {
          setCardDragImage(e);
          onCardDragStart(cardID, columnID, cardIndex, e.currentTarget);
        },
        onDragEnd: () => {},
      });

      const cardDropZone = (columnID: string, cardID?: string) => ({
        onDragOver: (e: DragEvent<HTMLDivElement>) => {
          if (!cardDragState) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
          const rect = e.currentTarget.getBoundingClientRect();
          const insertAfter = e.clientY > rect.top + rect.height / 2;
          onCardDragHover(columnID, cardID, insertAfter);
        },
        onDrop: (e: DragEvent<HTMLDivElement>) => {
          if (!cardDragState) return;
          e.preventDefault();
          e.stopPropagation();
          void onCardDrop(columnID, cardID);
        },
      });

      return (
        <section className="p-5 bg-surface border border-border rounded-xl space-y-4">
          <div>
            <div>
              <h2 className="font-medium">Board Workspace</h2>
              <p className="text-sm text-muted">
                Drag columns and cards to reorder. Drop cards into another column to move them.
              </p>
            </div>
          </div>

          {boardActionError && (
            <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{boardActionError}</p>
          )}

          {isLoading && <p className="text-sm text-muted">Loading board...</p>}
          {!isLoading && error && <p className="text-sm text-red-500">{error}</p>}

          {!isLoading && !error && orderedColumns.length === 0 && !canEditBoard && (
            <p className="text-sm text-muted">
              No list columns yet. {canEditBoard ? "Create your first list column." : "Ask an editor to add one."}
            </p>
          )}

          {!isLoading && !error && (orderedColumns.length > 0 || canEditBoard) && (
            <div className="overflow-x-auto pb-2">
              <div className="flex items-start gap-4 min-h-60">
                {orderedColumns.map((column, columnIndex) => {
                  const isDraggedColumn = columnDragState?.columnID === column.columnID;
                  const orderedCards = column.cards.slice().sort((a, b) => a.position - b.position);

                  return (
                    <div
                      key={column.columnID}
                      {...columnContainerDragProps(column.columnID, columnIndex)}
                      className="w-72 shrink-0 border border-border rounded-xl p-3 bg-surface-alt space-y-3 relative"
                    >
                      <div
                        {...columnDragHandle(column.columnID, columnIndex)}
                        className={`flex items-center justify-between gap-2 ${
                          canDragColumn(column.columnID) ? "cursor-grab active:cursor-grabbing select-none" : ""
                        }`}
                      >
                        {editingColumnID === column.columnID ? (
                          <form onSubmit={(e) => void onSaveColumnEdit(e)} className="w-full flex items-center gap-2">
                            <input
                              type="text"
                              value={editColumnName}
                              onChange={(e) => onSetEditColumnName(e.target.value)}
                              className="min-w-0 flex-1 px-2 py-1.5 text-sm border border-border-light rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                              required
                            />
                            <button
                              type="submit"
                              disabled={savingColumnID === column.columnID}
                              className="text-xs px-2 py-1 border border-border-light rounded-md hover:bg-surface-hover disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEditingColumn}
                              disabled={savingColumnID === column.columnID}
                              className="text-xs px-2 py-1 border border-border-light rounded-md hover:bg-surface-hover disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <>
                            <h3 className="font-medium">{column.name}</h3>
                            <div className="flex items-center gap-2">
                              {canEditBoard && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onStartEditingColumn(column.columnID)}
                                    disabled={deletingColumnID === column.columnID}
                                    className="text-xs px-2 py-1 border border-border-light rounded-md hover:bg-surface-hover disabled:opacity-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `Delete column "${column.name}"? This cannot be undone.`
                                      );
                                      if (confirmed) {
                                        void onDeleteListColumn(column.columnID);
                                      }
                                    }}
                                    disabled={deletingColumnID === column.columnID}
                                    className="text-xs px-2 py-1 border border-red-500/40 text-red-500 rounded-md hover:bg-red-500/10 disabled:opacity-50"
                                  >
                                    {deletingColumnID === column.columnID ? "Deleting..." : "Delete"}
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-2 min-h-10">
                        {orderedCards.length === 0 && (
                          <p className="text-xs text-muted/70 px-1 py-3">No cards yet.</p>
                        )}

                        {orderedCards.map((card, cardIndex) => {
                          const hasDescription = card.description.trim().length > 0;
                          const isDraggedCard = cardDragState?.cardID === card.cardID;

                          return (
                            <div
                              key={card.cardID}
                              {...cardDragSource(card.cardID, column.columnID, cardIndex)}
                              {...cardDropZone(column.columnID, card.cardID)}
                              onClick={() => {
                                if (isDraggedCard) return;
                                setOverlayCardID(card.cardID);
                                setOverlayColumnID(column.columnID);
                                if (canEditBoard) {
                                  onStartEditingCard(card.cardID, column.columnID);
                                }
                              }}
                              className={
                                isDraggedCard
                                  ? "rounded-lg border border-border-light bg-surface-hover h-10 relative"
                                  : `rounded-lg border border-border bg-surface-card px-3 py-2.5 ${
                                      canDragCard(card.cardID)
                                        ? "cursor-grab active:cursor-grabbing select-none"
                                        : "cursor-pointer"
                                    } hover:border-border-light transition-colors`
                              }
                            >
                              {!isDraggedCard && (
                                <>
                                  <p className="text-sm font-medium truncate">
                                    {card.title}
                                  </p>
                                  {hasDescription && (
                                    <div
                                      className="mt-1.5 ml-1 inline-flex items-center text-muted"
                                      aria-label="Card has a description"
                                      title="Has description"
                                    >
                                      <svg
                                        viewBox="0 0 16 16"
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                      >
                                        <line x1="3" y1="4" x2="13" y2="4" />
                                        <line x1="3" y1="8" x2="11" y2="8" />
                                        <line x1="3" y1="12" x2="9" y2="12" />
                                      </svg>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}

                      </div>

                      <form
                        onSubmit={(e) => void onCreateCard(e, column.columnID)}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={cardTitles[column.columnID] ?? ""}
                          onChange={(e) => onSetCardTitle(column.columnID, e.target.value)}
                          placeholder="Add a card"
                          disabled={!canEditBoard || creatingCards[column.columnID]}
                          className="min-w-0 flex-1 px-2 py-1.5 text-sm border border-border-light rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
                          required
                        />
                        <button
                          type="submit"
                          disabled={!canEditBoard || creatingCards[column.columnID]}
                          className="px-2.5 py-1.5 text-sm bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-opacity"
                        >
                          +
                        </button>
                      </form>

                      {isDraggedColumn && (
                        <div className="absolute inset-0 rounded-xl bg-surface-hover border border-border-light pointer-events-none" />
                      )}
                    </div>
                  );
                })}

                {canEditBoard && (
                  <div
                    ref={addListContainerRef}
                    className="w-72 shrink-0 rounded-xl border border-border-light bg-surface-hover/70 p-3"
                  >
                    {!isAddListOpen ? (
                      <button
                        type="button"
                        onClick={() => setIsAddListOpen(true)}
                        className="w-full flex items-center gap-2 px-1 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
                      >
                        <span className="text-base leading-none">+</span>
                        <span>Add another list</span>
                      </button>
                    ) : (
                      <form
                        onSubmit={(e) => void onCreateListColumn(e)}
                        className="space-y-2"
                      >
                        <input
                          type="text"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="List title"
                          disabled={!canEditBoard || createColumnLoading}
                          className="w-full px-3 py-2 text-sm border border-border-light rounded-lg bg-background/95 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
                          required
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            disabled={!canEditBoard || createColumnLoading}
                            className="flex-1 px-3 py-2 text-sm bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-opacity"
                          >
                            {createColumnLoading ? "Adding..." : "Add List"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddListOpen(false);
                              setNewColumnName("");
                            }}
                            disabled={createColumnLoading}
                            className="px-3 py-2 text-sm border border-border-light rounded-lg hover:bg-surface-hover disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {overlayCardID && overlayColumnID && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => {
                onCancelEditingCard();
                setOverlayCardID(null);
                setOverlayColumnID(null);
              }}
            >
              <div
                className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-lg shadow-black/30 p-6 pt-4 space-y-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="text"
                    value={onGetCardTitleValue(overlayColumnID, overlayCardID)}
                    readOnly={!canEditBoard}
                    onChange={(e) => {
                      if (!canEditBoard) return;
                      if (editingCardID !== overlayCardID) {
                        onStartEditingCard(overlayCardID, overlayColumnID);
                      }
                      onSetEditCardTitle(e.target.value);
                    }}
                    className="-ml-2 min-w-0 flex-1 bg-transparent text-lg font-medium border border-transparent rounded-lg pl-3 pr-3 py-2 focus:outline-none focus:border-border-light focus:ring-2 focus:ring-accent/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onCancelEditingCard();
                      setOverlayCardID(null);
                      setOverlayColumnID(null);
                    }}
                    className="text-muted hover:text-foreground transition-colors text-xl leading-none px-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wide text-muted">Description</label>
                  <textarea
                    value={onGetCardDescriptionValue(overlayColumnID, overlayCardID)}
                    readOnly={!canEditBoard}
                    spellCheck={focusedDescriptionCardID === overlayCardID}
                    rows={6}
                    placeholder="Add a description..."
                    onFocus={() => {
                      if (canEditBoard && editingCardID !== overlayCardID) {
                        onStartEditingCard(overlayCardID, overlayColumnID);
                      }
                      setFocusedDescriptionCardID(overlayCardID);
                    }}
                    onBlur={() => setFocusedDescriptionCardID(null)}
                    onChange={(e) => {
                      if (!canEditBoard) return;
                      if (editingCardID !== overlayCardID) {
                        onStartEditingCard(overlayCardID, overlayColumnID);
                      }
                      onSetEditCardDescription(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border-light rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none read-only:cursor-default"
                  />
                </div>

                {canEditBoard && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void onSaveCardEdit()}
                        disabled={!onIsCardDirty(overlayColumnID, overlayCardID) || savingCardID === overlayCardID}
                        className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={onCancelEditingCard}
                        disabled={savingCardID === overlayCardID}
                        className="px-4 py-2 border border-border-light rounded-lg hover:bg-surface-hover disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="border-t border-border pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm("Delete this card? This cannot be undone.");
                          if (!confirmed) return;

                          void onDeleteCard(overlayCardID).then((deleted) => {
                            if (deleted) {
                              setOverlayCardID(null);
                              setOverlayColumnID(null);
                            }
                          });
                        }}
                        disabled={savingCardID === overlayCardID || deletingCardID === overlayCardID}
                        className="w-full px-4 py-2 border border-red-500/40 text-red-500 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      >
                        {deletingCardID === overlayCardID ? "Deleting..." : "Delete Card"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      );
    },
    [
      boardActionError,
      canEditBoard,
      cardDragState,
      cardTitles,
      columnDragState,
      editColumnName,
      createColumnLoading,
      creatingCards,
      editingCardID,
      editingColumnID,
      error,
      focusedDescriptionCardID,
      isLoading,
      isAddListOpen,
      newColumnName,
      overlayCardID,
      overlayColumnID,
      onCancelEditingCard,
      onCancelEditingColumn,
      onCardDragHover,
      onCardDragStart,
      onCardDrop,
      onColumnDragEnd,
      onColumnDragHover,
      onColumnDragStart,
      onColumnDrop,
      onCreateCard,
      onCreateListColumn,
      onGetCardDescriptionValue,
      onGetCardTitleValue,
      onIsCardDirty,
      onSaveCardEdit,
      onSaveColumnEdit,
      onSetEditCardDescription,
      onSetEditCardTitle,
      onSetEditColumnName,
      onSetCardTitle,
      onStartEditingCard,
      onStartEditingColumn,
      orderedColumns,
      savingCardID,
      savingColumnID,
      deletingCardID,
      setNewColumnName,
      onDeleteCard,
    ]
  );
}
