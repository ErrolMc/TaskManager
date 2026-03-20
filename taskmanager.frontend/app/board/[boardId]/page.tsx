"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getBoardInfo,
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
  BoardId: string;
  ColumnId: string;
  Title: string;
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
  const { isAuthenticated, token, userID, logout } = useAuth();
  const router = useRouter();
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const [boardData, setBoardData] = useState<BoardDetailsResponse | null>(null);
  const [error, setError] = useState("");

  // add member form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addRole, setAddRole] = useState<BoardRole>(2);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  // context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

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
  }, [isAuthenticated, token, userID, boardId]);

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
    onGetCardTitleValue: boardWorkspace.getCardTitleValue,
    onGetCardDescriptionValue: boardWorkspace.getCardDescriptionValue,
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
      await loadBoard();
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
      await loadBoard();
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
      await loadBoard();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddLoading(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="w-full px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-sm px-3 py-1 border border-border-light rounded-lg hover:bg-surface-hover transition-colors"
            >
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {boardData?.boardInfo.boardName ?? "Board"}
              </h1>
              <p className="text-sm text-muted">
                {currentUserRole === null ? "Role unavailable" : `Role: ${roleLabel(currentUserRole)}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="text-sm px-3 py-1 border border-border-light rounded-lg hover:bg-surface-hover transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="w-full px-6 py-8 space-y-6">
        <section className="p-5 bg-surface border border-border rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Board Members</h2>
            {canManageMembers && (
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((current) => !current);
                  setAddError("");
                  setAddSuccess("");
                }}
                className="text-sm px-3 py-1 border border-border-light rounded-lg hover:bg-surface-hover transition-colors"
              >
                Add Member +
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="mb-4 p-4 bg-surface-hover/50 border border-border rounded-lg space-y-3">
              {addError && (
                <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{addError}</p>
              )}
              {addSuccess && (
                <p className="text-sm text-green-500 bg-green-500/10 rounded-lg px-3 py-2">{addSuccess}</p>
              )}
              <form onSubmit={handleAddMember} className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="Username"
                  className="flex-1 min-w-0 px-3 py-2 border border-border-light rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                  required
                />
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(Number(e.target.value) as BoardRole)}
                  className="px-3 py-2 border border-border-light rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-opacity"
                >
                  {addLoading ? "Adding..." : "Add"}
                </button>
              </form>
            </div>
          )}

          {isLoading && <p className="text-sm text-muted">Loading board...</p>}
          {!isLoading && error && <p className="text-sm text-red-500">{error}</p>}

          {!isLoading && !error && boardData?.members.length === 0 && (
            <p className="text-sm text-muted">No members in this board.</p>
          )}

          {!isLoading && !error && boardData && boardData.members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {boardData.members.map((member) => (
                <button
                  key={member.user.userID}
                  type="button"
                  onClick={(e) => handleMemberClick(e, member)}
                  className={`px-3 py-1 text-sm border border-border rounded-full transition-colors ${
                    isOwner && member.role !== 0
                      ? "hover:bg-surface-hover cursor-pointer"
                      : "cursor-default"
                  }`}
                >
                  {member.user.username} ({roleLabel(member.role)})
                </button>
              ))}
            </div>
          )}
        </section>

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
    </div>
  );
}
