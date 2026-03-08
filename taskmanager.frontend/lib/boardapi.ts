"use client";

const API_BASE = "/api/board";

export type BoardRole = 0 | 1 | 2 | 3;

export interface BoardInfo {
  boardID: string;
  boardName: string;
  description: string;
  createdAtUTC: string;
  updatedAtUTC: string;
}

export interface CreateBoardResponse {
  boardID: string;
  boardName: string;
  boardDescription: string;
}

export interface BoardMember {
  user: {
    userID: string;
    username: string;
  };
  role: BoardRole;
}

export interface BoardDetailsResponse {
  boardInfo: BoardInfo;
  members: BoardMember[];
}

function getAuthHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function getErrorMessage(res: Response, fallbackMessage: string) {
  const text = await res.text();
  return text || fallbackMessage;
}

export async function createBoard(
  token: string,
  boardName: string,
  boardDescription: string
): Promise<CreateBoardResponse> {
  const res = await fetch(`${API_BASE}/create`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ boardName, boardDescription }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to create board"));
  }

  return res.json();
}

export async function getBoardsForCurrentUser(token: string): Promise<BoardInfo[]> {
  const res = await fetch(`${API_BASE}/getboardsforcurrentuser`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to fetch boards"));
  }

  return res.json();
}

export async function getBoardInfo(
  token: string,
  boardID: string
): Promise<BoardDetailsResponse> {
  const searchParams = new URLSearchParams({ boardID });
  const res = await fetch(`${API_BASE}/getboardinfo?${searchParams.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to fetch board details"));
  }

  return res.json();
}

export async function addUserToBoard(
  token: string,
  boardID: string,
  username: string,
  role: BoardRole
): Promise<void> {
  const res = await fetch(`${API_BASE}/adduser`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ boardID, username, role }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to add member"));
  }
}

export async function removeUserFromBoard(
  token: string,
  boardID: string,
  userID: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/removeuser`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ boardID, userID }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to remove member"));
  }
}

export async function changeUserRole(
  token: string,
  boardID: string,
  userID: string,
  newRole: BoardRole
): Promise<void> {
  const res = await fetch(`${API_BASE}/changerole`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ boardID, userID, newRole }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to change role"));
  }
}
