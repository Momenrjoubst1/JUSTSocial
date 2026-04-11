export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  status: MessageStatus;
  created_at: string;
  is_encrypted?: boolean;
}
