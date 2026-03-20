"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

export type NotificationEventName =
  | "CardMoved"
  | "ColumnMoved"
  | "ColumnDeleted"
  | "CardDeleted"
  | "ColumnEdited"
  | "CardEdited"
  | "ColumnCreated"
  | "CardCreated"
  | "BoardJoined"
  | "BoardLeft";

interface BaseNotificationPayload {
  SenderUserID?: string;
  BoardID?: string;
  UserID?: string;
}

type NotificationHandler = (payload: unknown) => void;

const NOTIFICATION_EVENTS: NotificationEventName[] = [
  "CardMoved",
  "ColumnMoved",
  "ColumnDeleted",
  "CardDeleted",
  "ColumnEdited",
  "CardEdited",
  "ColumnCreated",
  "CardCreated",
  "BoardJoined",
  "BoardLeft",
];

function buildHubUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!configuredUrl) return "/hubs/notifications";
  return `${configuredUrl.replace(/\/+$/, "")}/hubs/notifications`;
}

export class NotificationService {
  private connection: HubConnection | null = null;
  private activeBoardID: string | null = null;
  private token: string | null = null;
  private currentUserID: string | null = null;

  private handlers = new Map<NotificationEventName, Set<NotificationHandler>>(
    NOTIFICATION_EVENTS.map((eventName) => [eventName, new Set<NotificationHandler>()])
  );

  async start(token: string, currentUserID: string) {
    this.token = token;
    this.currentUserID = currentUserID;

    if (this.connection && this.connection.state !== HubConnectionState.Disconnected) {
      return;
    }

    if (!this.connection) {
      this.connection = new HubConnectionBuilder()
        .withUrl(buildHubUrl(), {
          accessTokenFactory: () => this.token ?? "",
          withCredentials: false,
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();

      this.registerEventHandlers(this.connection);
    }

    await this.connection.start();
  }

  async stop() {
    if (!this.connection) return;

    if (this.activeBoardID && this.connection.state === HubConnectionState.Connected) {
      await this.connection.invoke("LeaveBoardAsync", this.activeBoardID);
      this.activeBoardID = null;
    }

    if (this.connection.state !== HubConnectionState.Disconnected) {
      await this.connection.stop();
    }
  }

  async openBoard(boardID: string) {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error("NotificationService must be started before opening a board");
    }

    const trimmedBoardID = boardID.trim();
    if (!trimmedBoardID) return;

    if (this.activeBoardID === trimmedBoardID) return;

    if (this.activeBoardID) {
      await this.connection.invoke("LeaveBoardAsync", this.activeBoardID);
    }

    await this.connection.invoke("JoinBoardAsync", trimmedBoardID);
    this.activeBoardID = trimmedBoardID;
  }

  async closeBoard(boardID?: string) {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      this.activeBoardID = null;
      return;
    }

    const targetBoardID = boardID?.trim() || this.activeBoardID;
    if (!targetBoardID) return;

    await this.connection.invoke("LeaveBoardAsync", targetBoardID);

    if (this.activeBoardID === targetBoardID) {
      this.activeBoardID = null;
    }
  }

  on(eventName: NotificationEventName, handler: NotificationHandler) {
    this.handlers.get(eventName)?.add(handler);
    return () => {
      this.handlers.get(eventName)?.delete(handler);
    };
  }

  private registerEventHandlers(connection: HubConnection) {
    for (const eventName of NOTIFICATION_EVENTS) {
      connection.on(eventName, (payload: unknown) => {
        if (!this.shouldApplyPayload(eventName, payload)) return;

        const listeners = this.handlers.get(eventName);
        if (!listeners) return;

        listeners.forEach((handler) => handler(payload));
      });
    }
  }

  private shouldApplyPayload(eventName: NotificationEventName, payload: unknown) {
    if (!payload || typeof payload !== "object") return false;

    const typedPayload = payload as BaseNotificationPayload;
    const isBoardMembershipEvent =
      eventName === "BoardJoined" || eventName === "BoardLeft";

    if (isBoardMembershipEvent) {
      const isForCurrentUser = Boolean(
        typedPayload.UserID &&
          this.currentUserID &&
          typedPayload.UserID === this.currentUserID
      );

      const isForActiveBoard = Boolean(
        typedPayload.BoardID &&
          this.activeBoardID &&
          typedPayload.BoardID === this.activeBoardID
      );

      if (!isForCurrentUser && !isForActiveBoard) return false;
    } else {
      if (!typedPayload.BoardID || !this.activeBoardID) return false;
      if (typedPayload.BoardID !== this.activeBoardID) return false;
    }

    if (typedPayload.SenderUserID && this.currentUserID) {
      return typedPayload.SenderUserID !== this.currentUserID;
    }

    return true;
  }
}
