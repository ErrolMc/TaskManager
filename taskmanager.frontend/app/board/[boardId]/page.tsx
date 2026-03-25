"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getBoardInfo,
  getBoardMembers,
  addUserToBoard,
  removeUserFromBoard,
  changeUserRole,
  type BoardMember,
  type BoardDetailsResponse,
  type BoardListColumn,
  type BoardRole,
} from "@/lib/boardapi";
import {
  NotificationService,
  type NotificationEventName,
} from "@/lib/notification-service";
import { useBoardWorkspace } from "./hooks/use-board-workspace";
import { useBoardWorkspaceRenderer } from "./hooks/use-board-workspace-renderer";

function roleLabel(role: BoardRole) {
  switch (role) {
    case 0:
      return "Owner";
    case 1:
      return "Admin";
    case 2:
      return "Member";
    case 3:
      return "Viewer";
    default:
      return "Unknown";
  }
}

const ASSIGNABLE_ROLES: { label: string; value: BoardRole }[] = [
  { label: "Admin", value: 1 },
  { label: "Member", value: 2 },
  { label: "Viewer", value: 3 },
];

interface ContextMenu {
  member: BoardMember;
  x: number;
  y: number;
}

interface NotificationItemPosition {
  Id: string;
  Position: number;
}

interface NotificationColumnArrangement {
  ListColumnID: string;
  CardsPositions: NotificationItemPosition[];
}

interface ColumnMovedNotificationPayload {
  BoardID: string;
  ColumnsPositions: NotificationItemPosition[];
}

interface ColumnDeletedNotificationPayload {
  BoardID: string;
  DeletedColumnID: string;
  ColumnsPositions: NotificationItemPosition[];
}

interface CardMovedNotificationPayload {
  BoardID: string;
  CardID: string;
  IsMovedWithinSameColumn: boolean;
  SourceColumnArrangement: NotificationColumnArrangement;
  TargetColumnArrangement?: NotificationColumnArrangement | null;
}

interface CardDeletedNotificationPayload {
  BoardID: string;
  CardID: string;
  ColumnArrangement: NotificationColumnArrangement;
}

interface ColumnEditedNotificationPayload {
  BoardID: string;
  ColumnId: string;
  Title: string;
}

interface CardEditedNotificationPayload {
  BoardID: string;
  CardID: string;
  Title: string;
  Description: string;
  DueAtUTC: string;
}

interface ColumnCreatedNotificationPayload {
  BoardID: string;
  ColumnID: string;
  Title: string;
}

interface CardCreatedNotificationPayload {
  BoardID: string;
  ColumnID: string;
  CardID: string;
  Title: string;
  Description: string;
}

interface BoardMembershipNotificationPayload {
  BoardID: string;
  UserID: string;
}

interface CardMessageCreatedNotificationPayload {
  BoardID: string;
  CardID: string;
  CardMessageID: string;
}

interface CardMessageDeletedNotificationPayload {
  BoardID: string;
  CardID: string;
  CardMessageID: string;
}

interface CardMessageRealtimeSignal {
  cardID: string;
  revision: number;
}

function sortColumnsByPosition(columns: BoardListColumn[]) {
  return columns.slice().sort((a, b) => a.position - b.position);
}

function applyColumnPositions(
  columns: BoardListColumn[],
  positions: NotificationItemPosition[]
) {
  if (!positions.length) return columns;

  const positionByID = new Map(positions.map((item) => [item.Id, item.Position]));
  const updated = columns.map((column) => {
    const nextPosition = positionByID.get(column.columnID);
    if (nextPosition === undefined) return column;
    return { ...column, position: nextPosition };
  });

  return sortColumnsByPosition(updated);
}

function applyCardArrangement(
  columns: BoardListColumn[],
  arrangement: NotificationColumnArrangement
) {
  const positionByCardID = new Map(
    arrangement.CardsPositions.map((item) => [item.Id, item.Position])
  );

  return columns.map((column) => {
    if (column.columnID !== arrangement.ListColumnID) return column;

    const cards = column.cards.map((card) => {
      const nextPosition = positionByCardID.get(card.cardID);
      if (nextPosition === undefined) return card;
      return { ...card, position: nextPosition };
    });

    return {
      ...column,
      cards: cards.slice().sort((a, b) => a.position - b.position),
    };
  });
}

function moveCardBetweenColumns(
  columns: BoardListColumn[],
  cardID: string,
  sourceColumnID: string,
  targetColumnID: string
) {
  let cardToMove: BoardListColumn["cards"][number] | null = null;

  const withoutCard = columns.map((column) => {
    if (column.columnID !== sourceColumnID) return column;

    const cards = column.cards.filter((card) => {
      if (card.cardID !== cardID) return true;
      cardToMove = { ...card, columnID: targetColumnID };
      return false;
    });

    return { ...column, cards };
  });

  if (!cardToMove) {
    const found = columns
      .flatMap((column) => column.cards)
      .find((card) => card.cardID === cardID);
    if (found) {
      cardToMove = { ...found, columnID: targetColumnID };
    }
  }

  if (!cardToMove) return withoutCard;

  const movedCard = cardToMove;
  return withoutCard.map((column) => {
    if (column.columnID !== targetColumnID) return column;

    const existingInTarget = column.cards.some((card) => card.cardID === cardID);
    if (existingInTarget) {
      return {
        ...column,
        cards: column.cards.map((card) =>
          card.cardID === cardID ? { ...card, columnID: targetColumnID } : card
        ),
      };
    }

    return { ...column, cards: [...column.cards, movedCard] };
  });
}

export default function BoardViewPage() {
  const { isAuthenticated, token, userID } = useAuth();
  const router = useRouter();
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const [boardData, setBoardData] = useState<BoardDetailsResponse | null>(null);
  const [error, setError] = useState("");

  // add member dialog state
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addRole, setAddRole] = useState<BoardRole>(2);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  // header menu state
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [headerMenuError, setHeaderMenuError] = useState("");
  const [leaveBoardLoading, setLeaveBoardLoading] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [cardMessageSignal, setCardMessageSignal] = useState<CardMessageRealtimeSignal | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    function handleOutsideHeaderMenuClick(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    }

    if (isHeaderMenuOpen) {
      document.addEventListener("mousedown", handleOutsideHeaderMenuClick);
    }

    return () => document.removeEventListener("mousedown", handleOutsideHeaderMenuClick);
  }, [isHeaderMenuOpen]);

  const loadBoard = useCallback(async () => {
    if (!isAuthenticated || !token || !boardId) return;
    setError("");

    try {
      const data = await getBoardInfo(token, boardId);
      setBoardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board");
    }
  }, [isAuthenticated, token, boardId]);

  const loadBoardMembers = useCallback(async () => {
    if (!isAuthenticated || !token || !boardId) return;

    try {
      const members = await getBoardMembers(token, boardId);
      setBoardData((current) => {
        if (!current) return current;
        return {
          ...current,
          members,
        };
      });
    } catch (err) {
      console.error("Failed to refresh board members", err);
    }
  }, [isAuthenticated, token, boardId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!isAuthenticated || !token || !userID || !boardId) return;

    const notificationService = new NotificationService();
    const unsubscribeHandlers: Array<() => void> = [];
    const eventsToSubscribe: NotificationEventName[] = [
      "CardMoved",
      "ColumnMoved",
      "ColumnDeleted",
      "CardDeleted",
      "ColumnEdited",
      "CardEdited",
      "ColumnCreated",
      "CardCreated",
      "CardMessageCreated",
      "CardMessageDeleted",
      "BoardJoined",
      "BoardLeft",
    ];

    const handleColumnMoved = (payload: unknown) => {
      const data = payload as ColumnMovedNotificationPayload;
      if (!data?.ColumnsPositions) return;

      setBoardData((current) => {
        if (!current) return current;
        return {
          ...current,
          listColumns: applyColumnPositions(current.listColumns, data.ColumnsPositions),
        };
      });
    };

    const handleColumnDeleted = (payload: unknown) => {
      const data = payload as ColumnDeletedNotificationPayload;
      if (!data?.DeletedColumnID || !data.ColumnsPositions) return;

      setBoardData((current) => {
        if (!current) return current;
        const columnsAfterDelete = current.listColumns.filter(
          (column) => column.columnID !== data.DeletedColumnID
        );
        return {
          ...current,
          listColumns: applyColumnPositions(columnsAfterDelete, data.ColumnsPositions),
        };
      });
    };

    const handleCardDeleted = (payload: unknown) => {
      const data = payload as CardDeletedNotificationPayload;
      if (!data?.CardID || !data.ColumnArrangement) return;

      setBoardData((current) => {
        if (!current) return current;

        const columnsWithoutCard = current.listColumns.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => card.cardID !== data.CardID),
        }));

        return {
          ...current,
          listColumns: applyCardArrangement(columnsWithoutCard, data.ColumnArrangement),
        };
      });
    };

    const handleCardMoved = (payload: unknown) => {
      const data = payload as CardMovedNotificationPayload;
      if (!data?.CardID || !data.SourceColumnArrangement) return;

      setBoardData((current) => {
        if (!current) return current;

        let nextColumns = current.listColumns;

        if (!data.IsMovedWithinSameColumn && data.TargetColumnArrangement) {
          nextColumns = moveCardBetweenColumns(
            nextColumns,
            data.CardID,
            data.SourceColumnArrangement.ListColumnID,
            data.TargetColumnArrangement.ListColumnID
          );
          nextColumns = applyCardArrangement(nextColumns, data.TargetColumnArrangement);
        }

        nextColumns = applyCardArrangement(nextColumns, data.SourceColumnArrangement);

        return {
          ...current,
          listColumns: nextColumns,
        };
      });
    };

    const handleColumnEdited = (payload: unknown) => {
      const data = payload as ColumnEditedNotificationPayload;
      if (!data?.ColumnId || !data.Title) return;

      setBoardData((current) => {
        if (!current) return current;

        return {
          ...current,
          listColumns: current.listColumns.map((column) =>
            column.columnID === data.ColumnId
              ? {
                  ...column,
                  name: data.Title,
                }
              : column
          ),
        };
      });
    };

    const handleCardEdited = (payload: unknown) => {
      const data = payload as CardEditedNotificationPayload;
      if (!data?.CardID || !data.Title) return;

      setBoardData((current) => {
        if (!current) return current;

        return {
          ...current,
          listColumns: current.listColumns.map((column) => ({
            ...column,
            cards: column.cards.map((card) =>
              card.cardID === data.CardID
                ? {
                    ...card,
                    title: data.Title,
                    description: data.Description ?? "",
                    dueAtUTC: data.DueAtUTC ?? "0001-01-01T00:00:00",
                  }
                : card
            ),
          })),
        };
      });
    };

    const handleColumnCreated = (payload: unknown) => {
      const data = payload as ColumnCreatedNotificationPayload;
      if (!data?.ColumnID || !data.Title || !data.BoardID) return;

      setBoardData((current) => {
        if (!current) return current;

        const alreadyExists = current.listColumns.some(
          (column) => column.columnID === data.ColumnID
        );
        if (alreadyExists) return current;

        const nextPosition =
          current.listColumns.length > 0
            ? Math.max(...current.listColumns.map((column) => column.position)) + 1
            : 0;

        const nowISO = new Date().toISOString();
        return {
          ...current,
          listColumns: [
            ...current.listColumns,
            {
              columnID: data.ColumnID,
              boardID: data.BoardID,
              name: data.Title,
              position: nextPosition,
              createdAtUTC: nowISO,
              updatedAtUTC: nowISO,
              cards: [],
            },
          ],
        };
      });
    };

    const handleCardCreated = (payload: unknown) => {
      const data = payload as CardCreatedNotificationPayload;
      if (!data?.CardID || !data.ColumnID || !data.Title) return;

      setBoardData((current) => {
        if (!current) return current;

        const alreadyExists = current.listColumns.some((column) =>
          column.cards.some((card) => card.cardID === data.CardID)
        );
        if (alreadyExists) return current;

        return {
          ...current,
          listColumns: current.listColumns.map((column) => {
            if (column.columnID !== data.ColumnID) return column;

            const nextPosition =
              column.cards.length > 0
                ? Math.max(...column.cards.map((card) => card.position)) + 1
                : 0;

            return {
              ...column,
              cards: [
                ...column.cards,
                {
                  cardID: data.CardID,
                  columnID: data.ColumnID,
                  title: data.Title,
                  description: data.Description ?? "",
                  position: nextPosition,
                  dueAtUTC: "0001-01-01T00:00:00",
                  createdByUserID: "",
                  isArchived: false,
                },
              ],
            };
          }),
        };
      });
    };

    const handleBoardJoined = (payload: unknown) => {
      const data = payload as BoardMembershipNotificationPayload;
      if (!data?.BoardID || !data.UserID) return;

      if (data.UserID === userID) return;

      void loadBoardMembers();
    };

    const handleBoardLeft = (payload: unknown) => {
      const data = payload as BoardMembershipNotificationPayload;
      if (!data?.BoardID || !data.UserID) return;

      if (data.UserID === userID) {
        router.push("/dashboard");
        return;
      }

      void loadBoardMembers();
    };

    const handleCardMessageCreated = (payload: unknown) => {
      const data = payload as CardMessageCreatedNotificationPayload;
      if (!data?.CardID || !data?.CardMessageID) return;

      setCardMessageSignal({
        cardID: data.CardID,
        revision: Date.now(),
      });
    };

    const handleCardMessageDeleted = (payload: unknown) => {
      const data = payload as CardMessageDeletedNotificationPayload;
      if (!data?.CardID || !data?.CardMessageID) return;

      setCardMessageSignal({
        cardID: data.CardID,
        revision: Date.now(),
      });
    };

    for (const eventName of eventsToSubscribe) {
      const handler =
        eventName === "ColumnMoved"
          ? handleColumnMoved
          : eventName === "ColumnDeleted"
            ? handleColumnDeleted
            : eventName === "CardDeleted"
              ? handleCardDeleted
              : eventName === "ColumnEdited"
                ? handleColumnEdited
                : eventName === "CardEdited"
                  ? handleCardEdited
                  : eventName === "ColumnCreated"
                    ? handleColumnCreated
                    : eventName === "CardCreated"
                      ? handleCardCreated
                        : eventName === "CardMessageCreated"
                          ? handleCardMessageCreated
                          : eventName === "CardMessageDeleted"
                            ? handleCardMessageDeleted
                      : eventName === "BoardJoined"
                        ? handleBoardJoined
                        : eventName === "BoardLeft"
                          ? handleBoardLeft
                      : handleCardMoved;

      const unsubscribe = notificationService.on(eventName, handler);
      unsubscribeHandlers.push(unsubscribe);
    }

    void (async () => {
      try {
        await notificationService.start(token, userID);
        await notificationService.openBoard(boardId);
      } catch (err) {
        console.error("Failed to start board notifications", err);
      }
    })();

    return () => {
      unsubscribeHandlers.forEach((unsubscribe) => unsubscribe());
      void notificationService.closeBoard(boardId);
      void notificationService.stop();
    };
  }, [isAuthenticated, token, userID, boardId, loadBoardMembers, router]);

  // close context menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        setChangeRoleOpen(false);
        setActionError("");
      }
    }
    if (contextMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  const currentUserRole = useMemo(() => {
    if (!userID || !boardData) return null;
    return boardData.members.find((member) => member.user.userID === userID)?.role ?? null;
  }, [userID, boardData]);

  const isOwner = currentUserRole === 0;
  const canManageMembers = currentUserRole === 0 || currentUserRole === 1;
  const canEditBoard = currentUserRole !== null && currentUserRole !== 3;

  const isLoading = !boardData && !error;

  const boardWorkspace = useBoardWorkspace({
    token,
    boardId,
    canEditBoard,
    boardData,
    setBoardData,
    loadBoard,
  });

  const boardWorkspaceSection = useBoardWorkspaceRenderer({
    token,
    boardID: boardId,
    currentUserID: userID,
    boardMembers: boardData?.members ?? [],
    cardMessageRealtimeSignal: cardMessageSignal,
    isLoading,
    error,
    boardActionError: boardWorkspace.boardActionError,
    canEditBoard,
    newColumnName: boardWorkspace.newColumnName,
    setNewColumnName: boardWorkspace.setNewColumnName,
    createColumnLoading: boardWorkspace.createColumnLoading,
    cardTitles: boardWorkspace.cardTitles,
    creatingCards: boardWorkspace.creatingCards,
    orderedColumns: boardWorkspace.orderedColumns,
    columnDragState: boardWorkspace.columnDragState,
    cardDragState: boardWorkspace.cardDragState,
    editingColumnID: boardWorkspace.editingColumnID,
    editColumnName: boardWorkspace.editColumnName,
    savingColumnID: boardWorkspace.savingColumnID,
    deletingColumnID: boardWorkspace.deletingColumnID,
    editingCardID: boardWorkspace.editingCardID,
    savingCardID: boardWorkspace.savingCardID,
    deletingCardID: boardWorkspace.deletingCardID,
    onSetCardTitle: boardWorkspace.setCardTitle,
    onSetEditColumnName: boardWorkspace.setEditColumnName,
    onSetEditCardTitle: boardWorkspace.setEditCardTitle,
    onSetEditCardDescription: boardWorkspace.setEditCardDescription,
    onSetEditCardDueAtUTC: boardWorkspace.setEditCardDueAtUTC,
    onGetCardTitleValue: boardWorkspace.getCardTitleValue,
    onGetCardDescriptionValue: boardWorkspace.getCardDescriptionValue,
    onGetCardDueAtUTCValue: boardWorkspace.getCardDueAtUTCValue,
    onIsCardDirty: boardWorkspace.isCardDirty,
    onStartEditingColumn: boardWorkspace.startEditingColumn,
    onCancelEditingColumn: boardWorkspace.cancelEditingColumn,
    onSaveColumnEdit: boardWorkspace.handleSaveColumnEdit,
    onDeleteListColumn: boardWorkspace.handleDeleteListColumn,
    onStartEditingCard: boardWorkspace.startEditingCard,
    onCancelEditingCard: boardWorkspace.cancelEditingCard,
    onSaveCardEdit: boardWorkspace.handleSaveCardEdit,
    onDeleteCard: boardWorkspace.handleDeleteCard,
    onCreateListColumn: boardWorkspace.handleCreateListColumn,
    onCreateCard: boardWorkspace.handleCreateCard,
    onColumnDragStart: boardWorkspace.handleColumnDragStart,
    onColumnDragEnd: boardWorkspace.clearColumnDragState,
    onColumnDragHover: boardWorkspace.handleColumnDragHover,
    onColumnDrop: boardWorkspace.handleColumnDrop,
    onCardDragStart: boardWorkspace.handleCardDragStart,
    onCardDragHover: boardWorkspace.handleCardDragHover,
    onCardDrop: boardWorkspace.handleCardDrop,
  });

  function handleMemberClick(e: React.MouseEvent, member: BoardMember) {
    if (!isOwner) return;
    if (member.role === 0) return; // can't act on owner
    e.stopPropagation();
    setContextMenu({ member, x: e.clientX, y: e.clientY });
    setChangeRoleOpen(false);
    setActionError("");
  }

  async function handleRemoveMember(member: BoardMember) {
    if (!token) return;
    setActionLoading(true);
    setActionError("");
    try {
      await removeUserFromBoard(token, boardId, member.user.userID);
      setContextMenu(null);
      await loadBoardMembers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChangeRole(member: BoardMember, newRole: BoardRole) {
    if (!token) return;
    setActionLoading(true);
    setActionError("");
    try {
      await changeUserRole(token, boardId, member.user.userID, newRole);
      setContextMenu(null);
      setChangeRoleOpen(false);
      await loadBoardMembers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setAddLoading(true);
    setAddError("");
    setAddSuccess("");
    try {
      await addUserToBoard(token, boardId, addUsername.trim(), addRole);
      setAddSuccess(`${addUsername.trim()} added successfully.`);
      setAddUsername("");
      await loadBoardMembers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleLeaveBoard() {
    if (!token || !userID) return;
    if (isOwner) {
      setHeaderMenuError("Can't leave as owner");
      return;
    }

    const confirmed = window.confirm("Leave this board?");
    if (!confirmed) return;

    setLeaveBoardLoading(true);
    setHeaderMenuError("");

    try {
      await removeUserFromBoard(token, boardId, userID);
      setIsHeaderMenuOpen(false);
      router.push("/dashboard");
    } catch (err) {
      setHeaderMenuError(err instanceof Error ? err.message : "Failed to leave board");
    } finally {
      setLeaveBoardLoading(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="w-full px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="shrink-0 text-sm px-3 py-1 border border-border-light rounded-lg hover:bg-surface-hover transition-colors"
            >
              Back
            </button>
            <div className="shrink-0">
              <h1 className="text-xl font-bold">
                {boardData?.boardInfo.boardName ?? "Board"}
              </h1>
              <p className="text-sm text-muted">
                {currentUserRole === null ? "Role unavailable" : `Role: ${roleLabel(currentUserRole)}`}
              </p>
            </div>
          </div>
          <div className="ml-auto min-w-0 flex items-center">
            {!isLoading && !error && boardData && boardData.members.length > 0 && (
              <div className="min-w-0 max-w-[50vw] flex items-center gap-2">
                <p className="shrink-0 text-sm text-muted">Members</p>
                <div className="min-w-0 overflow-x-auto">
                  <div className="flex items-center gap-2 w-max">
                    {boardData.members.map((member) => (
                      <button
                        key={member.user.userID}
                        type="button"
                        onClick={(e) => handleMemberClick(e, member)}
                        className={`shrink-0 px-3 py-1 text-sm border border-border rounded-full transition-colors ${
                          isOwner && member.role !== 0
                            ? "hover:bg-surface-hover cursor-pointer"
                            : "cursor-default"
                        }`}
                      >
                        {member.user.username} ({roleLabel(member.role)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {!isLoading && !error && boardData && boardData.members.length > 0 && (
              <div className="mx-3 shrink-0 flex items-center justify-center" aria-hidden="true">
                <div className="h-6 w-px bg-border-light" />
              </div>
            )}
            <div className="shrink-0 relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsHeaderMenuOpen((current) => !current);
                  setHeaderMenuError("");
                }}
                className="shrink-0 text-sm px-3 py-1 border border-border-light rounded-lg hover:bg-surface-hover transition-colors"
              >
                Menu
              </button>

              {isHeaderMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-48 bg-surface border border-border rounded-xl shadow-lg shadow-black/20 py-1 text-sm">
                  {headerMenuError && (
                    <p className="px-3 py-1 text-red-500 text-xs">{headerMenuError}</p>
                  )}

                  {canManageMembers && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        setAddError("");
                        setAddSuccess("");
                        setShowAddMemberDialog(true);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors"
                    >
                      Add Members
                    </button>
                  )}

                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => void handleLeaveBoard()}
                      disabled={leaveBoardLoading || isOwner}
                      className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {leaveBoardLoading ? "Leaving..." : "Leave Board"}
                    </button>
                    {isOwner && (
                      <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted opacity-0 shadow-md shadow-black/20 transition-opacity group-hover:opacity-100">
                        Can't leave as owner
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8 space-y-6">
        {boardWorkspaceSection}
      </main>

      {contextMenu && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 50 }}
          className="min-w-44 bg-surface border border-border rounded-xl shadow-lg shadow-black/20 py-1 text-sm"
        >
          <p className="px-3 py-2 font-medium border-b border-border text-muted">
            {contextMenu.member.user.username}
          </p>

          {actionError && (
            <p className="px-3 py-1 text-red-500 text-xs">{actionError}</p>
          )}

          <button
            type="button"
            onClick={() => setChangeRoleOpen((current) => !current)}
            disabled={actionLoading}
            className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors flex items-center justify-between"
          >
            Change Role
            <span className="text-muted">{changeRoleOpen ? "▲" : "▼"}</span>
          </button>

          {changeRoleOpen && (
            <div className="border-t border-border">
              {ASSIGNABLE_ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  disabled={actionLoading || contextMenu.member.role === role.value}
                  onClick={() => handleChangeRole(contextMenu.member, role.value)}
                  className="w-full text-left px-5 py-1.5 hover:bg-surface-hover transition-colors disabled:opacity-40"
                >
                  {role.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleRemoveMember(contextMenu.member)}
            className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-500/10 transition-colors border-t border-border"
          >
            Remove Member
          </button>
        </div>
      )}

      {showAddMemberDialog && canManageMembers && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (addLoading) return;
            setShowAddMemberDialog(false);
          }}
        >
          <div
            className="w-full max-w-md bg-surface border border-border rounded-xl shadow-lg shadow-black/30 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Add Members</h3>
              <button
                type="button"
                onClick={() => setShowAddMemberDialog(false)}
                disabled={addLoading}
                className="text-muted hover:text-foreground transition-colors text-xl leading-none px-1 disabled:opacity-50"
              >
                x
              </button>
            </div>

            {addError && (
              <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{addError}</p>
            )}
            {addSuccess && (
              <p className="text-sm text-green-500 bg-green-500/10 rounded-lg px-3 py-2">{addSuccess}</p>
            )}

            <form onSubmit={handleAddMember} className="space-y-3">
              <input
                type="text"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-3 py-2 border border-border-light rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                required
              />
              <select
                value={addRole}
                onChange={(e) => setAddRole(Number(e.target.value) as BoardRole)}
                className="w-full px-3 py-2 border border-border-light rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddMemberDialog(false)}
                  disabled={addLoading}
                  className="px-3 py-2 border border-border-light rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-opacity"
                >
                  {addLoading ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
