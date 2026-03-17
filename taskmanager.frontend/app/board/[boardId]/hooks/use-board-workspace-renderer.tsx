import { useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
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
  onCreateListColumn: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateCard: (e: FormEvent<HTMLFormElement>, columnID: string) => Promise<void>;
  onColumnDragStart: (columnID: string, startIndex: number, sourceHeight: number, sourceElement: HTMLElement) => void;
  onColumnDragEnd: () => void;
  onColumnDragHover: (targetColumnID: string, insertAfter: boolean) => void;
  onColumnDrop: () => Promise<void>;
  onCardDragStart: (cardID: string, sourceColumnID: string, sourceIndex: number, sourceElement: HTMLElement) => void;
  onCardDragHover: (targetColumnID: string, targetCardID?: string, insertAfter?: boolean) => void;
  onCardDrop: (targetColumnID: string, targetCardID?: string) => Promise<void>;
}

function setColumnDragImage(event: DragEvent<HTMLDivElement>) {
  if (!event.dataTransfer) return;

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
            const rect = e.currentTarget.getBoundingClientRect();
            const insertAfter = e.clientX > rect.left + rect.width / 2;
            onColumnDragHover(columnID, insertAfter);
          }
          if (cardDragState) {
            e.preventDefault();
            onCardDragHover(columnID);
          }
        },
        onDrop: (e: DragEvent<HTMLDivElement>) => {
          console.log("[renderer] column onDrop:", { columnID, columnIndex, hasColumnDrag: !!columnDragState, hasCardDrag: !!cardDragState });
          e.preventDefault();
          if (columnDragState) { void onColumnDrop(); return; }
          if (cardDragState) void onCardDrop(columnID);
          else console.warn("[renderer] column onDrop: no drag state to handle!");
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
        onDragEnd: onColumnDragEnd,
      });

      const cardDragSource = (cardID: string, columnID: string, cardIndex: number) => ({
        draggable: canDragCard(cardID),
        onDragStart: (e: DragEvent<HTMLDivElement>) => {
          setCardDragImage(e);
          onCardDragStart(cardID, columnID, cardIndex, e.currentTarget);
        },
        onDragEnd: () => {
          console.log("[renderer] card onDragEnd (synthetic):", { cardID, columnID });
        },
      });

      const cardDropZone = (columnID: string, cardID?: string) => ({
        onDragOver: (e: DragEvent<HTMLDivElement>) => {
          if (!cardDragState) return;
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const insertAfter = e.clientY > rect.top + rect.height / 2;
          onCardDragHover(columnID, cardID, insertAfter);
        },
        onDrop: (e: DragEvent<HTMLDivElement>) => {
          console.log("[renderer] cardDropZone onDrop:", { columnID, cardID: cardID ?? "(none — bottom/placeholder)", hasCardDrag: !!cardDragState });
          if (!cardDragState) return;
          e.preventDefault();
          e.stopPropagation();
          void onCardDrop(columnID, cardID);
        },
      });

      return (
        <section className="p-5 border border-foreground/10 rounded-xl space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-medium">Board Workspace</h2>
              <p className="text-sm text-foreground/60">
                Drag columns and cards to reorder. Drop cards into another column to move them.
              </p>
            </div>

            <form onSubmit={(e) => void onCreateListColumn(e)} className="flex gap-2">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="New list column"
                disabled={!canEditBoard || createColumnLoading}
                className="px-3 py-2 border border-foreground/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/30 disabled:opacity-50"
                required
              />
              <button
                type="submit"
                disabled={!canEditBoard || createColumnLoading}
                className="px-4 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createColumnLoading ? "Adding..." : "Add Column"}
              </button>
            </form>
          </div>

          {boardActionError && (
            <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{boardActionError}</p>
          )}

          {isLoading && <p className="text-sm text-foreground/60">Loading board...</p>}
          {!isLoading && error && <p className="text-sm text-red-500">{error}</p>}

          {!isLoading && !error && orderedColumns.length === 0 && (
            <p className="text-sm text-foreground/50">
              No list columns yet. {canEditBoard ? "Create your first list column." : "Ask an editor to add one."}
            </p>
          )}

          {!isLoading && !error && orderedColumns.length > 0 && (
            <div className="overflow-x-auto pb-2">
              <div className="flex items-start gap-4 min-h-60">
                {orderedColumns.map((column, columnIndex) => {
                  const isDraggedColumn = columnDragState?.columnID === column.columnID;
                  const orderedCards = isDraggedColumn
                    ? []
                    : column.cards.slice().sort((a, b) => a.position - b.position);

                  if (isDraggedColumn) {
                    return (
                      <div
                        key={column.columnID}
                        {...columnContainerDragProps(column.columnID, columnIndex)}
                        className="w-72 shrink-0 rounded-xl border border-foreground/20 bg-foreground/[0.10] relative"
                        style={{ height: columnDragState.sourceHeight }}
                      >
                        {/* Handle stays in DOM (hidden) so the browser doesn't cancel the drag */}
                        <div
                          {...columnDragHandle(column.columnID, columnIndex)}
                          className="opacity-0 pointer-events-none absolute"
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={column.columnID}
                      {...columnContainerDragProps(column.columnID, columnIndex)}
                      className="w-72 shrink-0 border border-foreground/10 rounded-xl p-3 bg-foreground/[0.02] space-y-3"
                    >
                      <div
                        {...columnDragHandle(column.columnID, columnIndex)}
                        className={`flex items-center justify-between gap-2 ${
                          canDragColumn(column.columnID) ? "cursor-grab active:cursor-grabbing" : ""
                        }`}
                      >
                        {editingColumnID === column.columnID ? (
                          <form onSubmit={(e) => void onSaveColumnEdit(e)} className="w-full flex items-center gap-2">
                            <input
                              type="text"
                              value={editColumnName}
                              onChange={(e) => onSetEditColumnName(e.target.value)}
                              className="min-w-0 flex-1 px-2 py-1.5 text-sm border border-foreground/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/30"
                              required
                            />
                            <button
                              type="submit"
                              disabled={savingColumnID === column.columnID}
                              className="text-xs px-2 py-1 border border-foreground/20 rounded-md hover:bg-foreground/5 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEditingColumn}
                              disabled={savingColumnID === column.columnID}
                              className="text-xs px-2 py-1 border border-foreground/20 rounded-md hover:bg-foreground/5 disabled:opacity-50"
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
                                    className="text-xs px-2 py-1 border border-foreground/20 rounded-md hover:bg-foreground/5 disabled:opacity-50"
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

                      <form onSubmit={(e) => void onCreateCard(e, column.columnID)} className="flex gap-2">
                        <input
                          type="text"
                          value={cardTitles[column.columnID] ?? ""}
                          onChange={(e) => onSetCardTitle(column.columnID, e.target.value)}
                          placeholder="Add a card"
                          disabled={!canEditBoard || creatingCards[column.columnID]}
                          className="min-w-0 flex-1 px-2 py-1.5 text-sm border border-foreground/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/30 disabled:opacity-50"
                          required
                        />
                        <button
                          type="submit"
                          disabled={!canEditBoard || creatingCards[column.columnID]}
                          className="px-2.5 py-1.5 text-sm bg-foreground text-background rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          +
                        </button>
                      </form>

                      <div className="space-y-2 min-h-10">
                        {orderedCards.length === 0 && (
                          <p className="text-xs text-foreground/45 px-1 py-3">No cards yet.</p>
                        )}

                        {orderedCards.map((card, cardIndex) => {
                          if (cardDragState?.cardID === card.cardID) {
                            return (
                              <div
                                key={card.cardID}
                                {...cardDropZone(column.columnID, card.cardID)}
                                className="rounded-lg border border-foreground/20 bg-foreground/[0.10] min-h-36"
                              />
                            );
                          }

                          return (
                            <div
                              key={card.cardID}
                              {...cardDragSource(card.cardID, column.columnID, cardIndex)}
                              {...cardDropZone(column.columnID, card.cardID)}
                              onBlurCapture={(e) => {
                                if (editingCardID !== card.cardID) return;
                                const nextFocused = e.relatedTarget as Node | null;
                                if (!nextFocused || !e.currentTarget.contains(nextFocused)) {
                                  onCancelEditingCard();
                                }
                              }}
                              className={`rounded-lg border border-foreground/15 bg-background p-3 space-y-2 min-h-36 ${
                                canDragCard(card.cardID) ? "cursor-grab active:cursor-grabbing" : ""
                              }`}
                            >
                              <div>
                                <input
                                  type="text"
                                  value={onGetCardTitleValue(column.columnID, card.cardID)}
                                  readOnly={!canEditBoard}
                                  onFocus={() => {
                                    if (canEditBoard) {
                                      onStartEditingCard(card.cardID, column.columnID);
                                    }
                                  }}
                                  onChange={(e) => {
                                    if (!canEditBoard) return;
                                    if (editingCardID !== card.cardID) {
                                      onStartEditingCard(card.cardID, column.columnID);
                                    }
                                    onSetEditCardTitle(e.target.value);
                                  }}
                                  className="w-full px-2 py-1.5 text-sm border border-foreground/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/30 read-only:cursor-default"
                                />
                              </div>

                              <div className="space-y-1">
                                <p className="text-[11px] uppercase tracking-wide text-foreground/45">Description</p>
                                <textarea
                                  value={onGetCardDescriptionValue(column.columnID, card.cardID)}
                                  readOnly={!canEditBoard}
                                  spellCheck={focusedDescriptionCardID === card.cardID}
                                  rows={4}
                                  placeholder="Description"
                                  onFocus={() => {
                                    if (canEditBoard) {
                                      onStartEditingCard(card.cardID, column.columnID);
                                    }
                                    setFocusedDescriptionCardID(card.cardID);
                                  }}
                                  onBlur={() => setFocusedDescriptionCardID(null)}
                                  onChange={(e) => {
                                    if (!canEditBoard) return;
                                    if (editingCardID !== card.cardID) {
                                      onStartEditingCard(card.cardID, column.columnID);
                                    }
                                    onSetEditCardDescription(e.target.value);
                                  }}
                                  className="w-full px-2 py-1.5 text-xs border border-foreground/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/30 resize-none read-only:cursor-default"
                                />
                              </div>

                              {canEditBoard && onIsCardDirty(column.columnID, card.cardID) && (
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => void onSaveCardEdit()}
                                    disabled={savingCardID === card.cardID}
                                    className="text-xs px-2 py-1 border border-foreground/20 rounded-md hover:bg-foreground/5 disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={onCancelEditingCard}
                                    disabled={savingCardID === card.cardID}
                                    className="text-xs px-2 py-1 border border-foreground/20 rounded-md hover:bg-foreground/5 disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                      </div>
                    </div>
                  );
                })}
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
      newColumnName,
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
      setNewColumnName,
    ]
  );
}