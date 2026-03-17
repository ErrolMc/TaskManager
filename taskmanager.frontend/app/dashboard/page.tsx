"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createBoard, getBoardsForCurrentUser, type BoardInfo } from "@/lib/boardapi";

export default function DashboardPage() {
  const { isAuthenticated, userID, token, logout } = useAuth();
  const router = useRouter();
  const [boards, setBoards] = useState<BoardInfo[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardsError, setBoardsError] = useState("");
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const loadBoards = useCallback(async () => {
    if (!token) return;

    setBoardsLoading(true);
    setBoardsError("");

    try {
      const data = await getBoardsForCurrentUser(token);
      setBoards(data);
    } catch (err) {
      setBoardsError(err instanceof Error ? err.message : "Failed to load boards");
    } finally {
      setBoardsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    loadBoards();
  }, [isAuthenticated, token, loadBoards]);

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setCreateLoading(true);
    setCreateError("");

    try {
      await createBoard(token, boardName.trim(), boardDescription.trim());
      setBoardName("");
      setBoardDescription("");
      await loadBoards();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setCreateLoading(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Task Manager</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">
              {userID?.slice(0, 8)}...
            </span>
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
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted mt-1">
              Create a board or open one you are already in.
            </p>
          </div>

          <div className="p-6 bg-surface border border-border rounded-xl">
            <h3 className="font-medium mb-4">Create New Board</h3>

            {createError && (
              <p className="mb-3 text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                {createError}
              </p>
            )}

            <form onSubmit={handleCreateBoard} className="space-y-3">
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Board name"
                className="w-full px-3 py-2 border border-border-light rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                required
              />
              <textarea
                value={boardDescription}
                onChange={(e) => setBoardDescription(e.target.value)}
                placeholder="Board description (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-border-light rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                type="submit"
                disabled={createLoading}
                className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 transition-opacity"
              >
                {createLoading ? "Creating..." : "Create Board"}
              </button>
            </form>
          </div>

          <div className="p-6 bg-surface border border-border rounded-xl">
            <h3 className="font-medium mb-4">Your Boards</h3>

            {boardsLoading && (
              <p className="text-muted text-sm">Loading boards...</p>
            )}

            {!boardsLoading && boardsError && (
              <p className="text-red-500 text-sm">{boardsError}</p>
            )}

            {!boardsLoading && !boardsError && boards.length === 0 && (
              <p className="text-muted text-sm">
                You are not in any boards yet. Create one to get started.
              </p>
            )}

            {!boardsLoading && !boardsError && boards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boards.map((board) => (
                  <button
                    key={board.boardID}
                    type="button"
                    onClick={() => router.push(`/board/${board.boardID}`)}
                    className="text-left p-4 border border-border rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                  >
                    <p className="font-medium">{board.boardName}</p>
                    <p className="text-sm text-muted mt-1">
                      {board.description || "No description"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
