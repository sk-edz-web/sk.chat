import { ref, push, set, get, update, remove, onValue, onChildAdded, onChildChanged, off, serverTimestamp, query, orderByChild, limitToLast } from "firebase/database";
import { db } from "./firebase";

// Room types
export interface Room {
  id: string;
  name: string;
  type: "public" | "private";
  password?: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  lastMessage?: string;
  lastMessageTime?: number;
}

export interface RoomMember {
  uid: string;
  name: string;
  avatar: string;
  role: "admin" | "moderator" | "member";
  joinedAt: number;
  online?: boolean;
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  reactions?: Record<string, Record<string, boolean>>; // emoji -> {uid: true}
}

// Create a room
export const createRoom = async (
  name: string,
  type: "public" | "private",
  description: string,
  password: string,
  uid: string,
  userName: string,
  userAvatar: string
): Promise<string> => {
  const roomRef = push(ref(db, "rooms"));
  const roomId = roomRef.key!;

  await set(roomRef, {
    name,
    type,
    description,
    password: type === "private" ? password : "",
    createdBy: uid,
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageTime: serverTimestamp(),
  });

  // Add creator as admin member
  await set(ref(db, `roomMembers/${roomId}/${uid}`), {
    name: userName,
    avatar: userAvatar,
    role: "admin",
    joinedAt: serverTimestamp(),
  });

  // Add room to user's rooms
  await set(ref(db, `userRooms/${uid}/${roomId}`), true);

  return roomId;
};

// Join a room
export const joinRoom = async (
  roomId: string,
  uid: string,
  userName: string,
  userAvatar: string
): Promise<void> => {
  await set(ref(db, `roomMembers/${roomId}/${uid}`), {
    name: userName,
    avatar: userAvatar,
    role: "member",
    joinedAt: serverTimestamp(),
  });
  await set(ref(db, `userRooms/${uid}/${roomId}`), true);
};

// Check if room exists & get info
export const getRoomInfo = async (roomId: string): Promise<Room | null> => {
  const snap = await get(ref(db, `rooms/${roomId}`));
  if (!snap.exists()) return null;
  return { id: roomId, ...snap.val() } as Room;
};

// Send message
export const sendMessage = async (
  roomId: string,
  uid: string,
  senderName: string,
  senderAvatar: string,
  text: string
): Promise<void> => {
  const msgRef = push(ref(db, `messages/${roomId}`));
  await set(msgRef, {
    senderUid: uid,
    senderName,
    senderAvatar,
    text,
    timestamp: serverTimestamp(),
  });

  // Update room's last message
  await update(ref(db, `rooms/${roomId}`), {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
  });
};

// Toggle reaction
export const toggleReaction = async (
  roomId: string,
  messageId: string,
  emoji: string,
  uid: string
): Promise<void> => {
  const reactionRef = ref(db, `messages/${roomId}/${messageId}/reactions/${emoji}/${uid}`);
  const snap = await get(reactionRef);
  if (snap.exists()) {
    await remove(reactionRef);
  } else {
    await set(reactionRef, true);
  }
};

// Delete message
export const deleteMessage = async (roomId: string, messageId: string): Promise<void> => {
  await remove(ref(db, `messages/${roomId}/${messageId}`));
};

// Set typing status
export const setTyping = async (roomId: string, uid: string, userName: string, isTyping: boolean): Promise<void> => {
  if (isTyping) {
    await set(ref(db, `typing/${roomId}/${uid}`), { name: userName, timestamp: serverTimestamp() });
  } else {
    await remove(ref(db, `typing/${roomId}/${uid}`));
  }
};

// Leave room
export const leaveRoom = async (roomId: string, uid: string): Promise<void> => {
  await remove(ref(db, `roomMembers/${roomId}/${uid}`));
  await remove(ref(db, `userRooms/${uid}/${roomId}`));
};
