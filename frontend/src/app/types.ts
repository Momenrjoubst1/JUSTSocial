export interface AppMessagePreview {
  senderName: string;
  text: string;
}

export interface AppNotificationPreview {
  actorName: string;
  type: string;
}

export type NotificationCountSetter = (
  count: number | ((prev: number) => number)
) => void;
