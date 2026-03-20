"use client";

const API_BASE = "/api/board";
const LIST_COLUMN_API_BASE = "/api/listcolumn";
const CARD_API_BASE = "/api/card";

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

export interface BoardCard {
  cardID: string;
  columnID: string;
  title: string;
  description: string;
  position: number;
  dueAtUTC: string;
  createdByUserID: string;
  isArchived: boolean;
}

export interface ListColumn {
  columnID: string;
  boardID: string;
  name: string;
  position: number;
  createdAtUTC: string;
  updatedAtUTC: string;
}

export interface BoardListColumn extends ListColumn {
  cards: BoardCard[];
}

export interface BoardDetailsResponse {
  boardInfo: BoardInfo;
  members: BoardMember[];
  listColumns: BoardListColumn[];
}

export interface ItemPosition {
  id: string;
  position: number;
}

export interface ColumnArrangement {
  listColumnID: string;
  cardsPositions: ItemPosition[];
}

export interface UpdateListColumnPositionResponse {
  updatedColumns: ItemPosition[];
}

export interface UpdateCardPositionResponse {
  adjustedColumns: ColumnArrangement[];
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

export async function getBoardMembers(
  token: string,
  boardID: string
): Promise<BoardMember[]> {
  const searchParams = new URLSearchParams({ boardID });
  const res = await fetch(`${API_BASE}/getboardmembers?${searchParams.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to fetch board members"));
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

export async function createListColumn(
  token: string,
  boardID: string,
  name: string
): Promise<ListColumn> {
  const res = await fetch(`${LIST_COLUMN_API_BASE}/create`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ boardID, name }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to create list column"));
  }

  return res.json();
}

export async function updateListColumn(
  token: string,
  listColumnID: string,
  name: string
): Promise<ListColumn> {
  const res = await fetch(`${LIST_COLUMN_API_BASE}/update`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ listColumnID, name }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to update list column"));
  }

  return res.json();
}

export async function deleteListColumn(
  token: string,
  listColumnID: string
): Promise<void> {
  const res = await fetch(`${LIST_COLUMN_API_BASE}/delete`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(listColumnID),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to delete list column"));
  }
}

export async function updateListColumnPosition(
  token: string,
  listColumnID: string,
  newPosition: number
): Promise<UpdateListColumnPositionResponse> {
  const res = await fetch(`${LIST_COLUMN_API_BASE}/updateposition`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ listColumnID, newPosition }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to move list column"));
  }

  return res.json();
}

export async function createCard(
  token: string,
  columnID: string,
  title: string,
  description = ""
): Promise<BoardCard> {
  const res = await fetch(`${CARD_API_BASE}/create`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ columnID, title, description }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to create card"));
  }

  return res.json();
}

export async function updateCard(
  token: string,
  cardID: string,
  name: string,
  description: string
): Promise<BoardCard> {
  const res = await fetch(`${CARD_API_BASE}/update`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ cardID, name, description }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to update card"));
  }

  return res.json();
}

export async function deleteCard(token: string, cardID: string): Promise<void> {
  const res = await fetch(`${CARD_API_BASE}/delete`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ cardID }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to delete card"));
  }
}

export async function updateCardPosition(
  token: string,
  cardID: string,
  listColumnID: string,
  newPosition: number
): Promise<UpdateCardPositionResponse> {
  const res = await fetch(`${CARD_API_BASE}/updateposition`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ cardID, listColumnID, newPosition }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to move card"));
  }

  return res.json();
}
