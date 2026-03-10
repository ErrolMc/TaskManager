import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { BoardListColumn } from "@/lib/boardapi";
import type { CardDragState, ColumnDragState } from "./use-board-workspace";

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
  onStartEditingCard: (cardID: string, columnID: string) => void;
  onCancelEditingCard: () => void;
  onSaveCardEdit: () => Promise<void>;
  onCreateListColumn: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateCard: (e: FormEvent<HTMLFormElement>, columnID: string) => Promise<void>;
  onColumnDragStart: (columnID: string, startIndex: number) => void;
  onColumnDragEnd: () => void;
  onColumnDrop: (targetIndex: number) => Promise<void>;
  onCardDragStart: (cardID: string, sourceColumnID: string, sourceIndex: number) => void;
  onCardDragEnd: () => void;
  onCardDrop: (targetColumnID: string, targetIndex: number) => Promise<void>;
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
  onStartEditingCard,
  onCancelEditingCard,
  onSaveCardEdit,
  onCreateListColumn,
  onCreateCard,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDrop,
  onCardDragStart,
  onCardDragEnd,
  onCardDrop,
}: UseBoardWorkspaceRendererParams): ReactNode {
  const [focusedDescriptionCardID, setFocusedDescriptionCardID] = useState<string | null>(null);

  return useMemo(
    () => (
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
                const orderedCards = column.cards
                  .slice()
                  .sort((a, b) => a.position - b.position);

                return (
                  <div
                    key={column.columnID}
                    onDragOver={(e) => {
                      if (columnDragState || cardDragState) {
                        e.preventDefault();
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (columnDragState) {
                        void onColumnDrop(columnIndex);
                        return;
                      }
                      if (cardDragState) {
                        void onCardDrop(column.columnID, orderedCards.length);
                      }
                    }}
                    className="w-72 shrink-0 border border-foreground/10 rounded-xl p-3 bg-foreground/[0.02] space-y-3"
                  >
                    <div
                      draggable={canEditBoard && editingColumnID !== column.columnID && !editingCardID}
                      onDragStart={() => onColumnDragStart(column.columnID, columnIndex)}
                      onDragEnd={onColumnDragEnd}
                      className={`flex items-center justify-between gap-2 ${
                        canEditBoard && editingColumnID !== column.columnID && !editingCardID
                          ? "cursor-grab active:cursor-grabbing"
                          : ""
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
                              <button
                                type="button"
                                onClick={() => onStartEditingColumn(column.columnID)}
                                className="text-xs px-2 py-1 border border-foreground/20 rounded-md hover:bg-foreground/5"
                              >
                                Edit
                              </button>
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

                      {orderedCards.map((card, cardIndex) => (
                        <div
                          key={card.cardID}
                          draggable={canEditBoard && editingCardID !== card.cardID && !editingColumnID}
                          onDragStart={() => onCardDragStart(card.cardID, column.columnID, cardIndex)}
                          onDragEnd={onCardDragEnd}
                          onDragOver={(e) => {
                            if (!cardDragState) return;
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            if (!cardDragState) return;
                            e.preventDefault();
                            e.stopPropagation();
                            void onCardDrop(column.columnID, cardIndex);
                          }}
                          onBlurCapture={(e) => {
                            if (editingCardID !== card.cardID) return;
                            const nextFocused = e.relatedTarget as Node | null;
                            if (!nextFocused || !e.currentTarget.contains(nextFocused)) {
                              onCancelEditingCard();
                            }
                          }}
                          className={`rounded-lg border border-foreground/15 bg-background p-3 space-y-2 min-h-36 ${
                            canEditBoard && editingCardID !== card.cardID && !editingColumnID
                              ? "cursor-grab active:cursor-grabbing"
                              : ""
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
                      ))}

                      {cardDragState && (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void onCardDrop(column.columnID, orderedCards.length);
                          }}
                          className="h-10 rounded-lg border border-dashed border-foreground/25 bg-foreground/[0.02] flex items-center justify-center text-[11px] text-foreground/50"
                        >
                          Drop at bottom
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    ),
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
      onCardDragEnd,
      onCardDragStart,
      onCardDrop,
      onColumnDragEnd,
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
