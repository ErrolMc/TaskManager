"use client";

const CARD_MESSAGE_API_BASE = "/api/cardmessage";

export interface CardMessageItem {
  messageID: string;
  cardID: string;
  message: string;
  senderUserID: string;
  senderUsername: string;
  createTimeUTC: string;
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

export async function getCardMessages(
  token: string,
  boardID: string,
  cardID: string
): Promise<CardMessageItem[]> {
  const searchParams = new URLSearchParams({ boardID, cardID });
  const res = await fetch(`${CARD_MESSAGE_API_BASE}/getbycard?${searchParams.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to load card messages"));
  }

  return res.json();
}

export async function createCardMessage(
  token: string,
  boardID: string,
  cardID: string,
  message: string
): Promise<CardMessageItem> {
  const res = await fetch(`${CARD_MESSAGE_API_BASE}/create`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ boardID, cardID, message }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to create card message"));
  }

  const createdMessage = (await res.json()) as {
    messageID: string;
    cardID: string;
    message: string;
    senderUserID: string;
    createTimeUTC: string;
  };

  return {
    messageID: createdMessage.messageID,
    cardID: createdMessage.cardID,
    message: createdMessage.message,
    senderUserID: createdMessage.senderUserID,
    senderUsername: "",
    createTimeUTC: createdMessage.createTimeUTC,
  };
}

export async function deleteCardMessage(
  token: string,
  boardID: string,
  cardMessageID: string
): Promise<void> {
  const res = await fetch(`${CARD_MESSAGE_API_BASE}/delete`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ boardID, cardMessageID }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, "Failed to delete card message"));
  }
}
