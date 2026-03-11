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
  type BoardRole,
} from "@/lib/boardapi";
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
    editingCardID: boardWorkspace.editingCardID,
    savingCardID: boardWorkspace.savingCardID,
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
    onStartEditingCard: boardWorkspace.startEditingCard,
    onCancelEditingCard: boardWorkspace.cancelEditingCard,
    onSaveCardEdit: boardWorkspace.handleSaveCardEdit,
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
      <header className="border-b border-foreground/10">
        <div className="w-full px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-sm px-3 py-1 border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors"
            >
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {boardData?.boardInfo.boardName ?? "Board"}
              </h1>
              <p className="text-sm text-foreground/60">
                {currentUserRole === null ? "Role unavailable" : `Role: ${roleLabel(currentUserRole)}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="text-sm px-3 py-1 border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="w-full px-6 py-8 space-y-6">
        <section className="p-5 border border-foreground/10 rounded-xl">
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
                className="text-sm px-3 py-1 border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                Add Member +
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="mb-4 p-4 border border-foreground/10 rounded-lg space-y-3">
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
                  className="flex-1 min-w-0 px-3 py-2 border border-foreground/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/30"
                  required
                />
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(Number(e.target.value) as BoardRole)}
                  className="px-3 py-2 border border-foreground/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/30"
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
                  className="px-4 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {addLoading ? "Adding..." : "Add"}
                </button>
              </form>
            </div>
          )}

          {isLoading && <p className="text-sm text-foreground/60">Loading board...</p>}
          {!isLoading && error && <p className="text-sm text-red-500">{error}</p>}

          {!isLoading && !error && boardData?.members.length === 0 && (
            <p className="text-sm text-foreground/50">No members in this board.</p>
          )}

          {!isLoading && !error && boardData && boardData.members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {boardData.members.map((member) => (
                <button
                  key={member.user.userID}
                  type="button"
                  onClick={(e) => handleMemberClick(e, member)}
                  className={`px-3 py-1 text-sm border border-foreground/15 rounded-full transition-colors ${
                    isOwner && member.role !== 0
                      ? "hover:bg-foreground/10 cursor-pointer"
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
          className="min-w-44 bg-background border border-foreground/15 rounded-xl shadow-lg py-1 text-sm"
        >
          <p className="px-3 py-2 font-medium border-b border-foreground/10 text-foreground/60">
            {contextMenu.member.user.username}
          </p>

          {actionError && (
            <p className="px-3 py-1 text-red-500 text-xs">{actionError}</p>
          )}

          <button
            type="button"
            onClick={() => setChangeRoleOpen((current) => !current)}
            disabled={actionLoading}
            className="w-full text-left px-3 py-2 hover:bg-foreground/5 transition-colors flex items-center justify-between"
          >
            Change Role
            <span className="text-foreground/40">{changeRoleOpen ? "▲" : "▼"}</span>
          </button>

          {changeRoleOpen && (
            <div className="border-t border-foreground/10">
              {ASSIGNABLE_ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  disabled={actionLoading || contextMenu.member.role === role.value}
                  onClick={() => handleChangeRole(contextMenu.member, role.value)}
                  className="w-full text-left px-5 py-1.5 hover:bg-foreground/5 transition-colors disabled:opacity-40"
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
            className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-500/10 transition-colors border-t border-foreground/10"
          >
            Remove Member
          </button>
        </div>
      )}
    </div>
  );
}
