import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Lock, Users, Settings, Copy, Send, Smile, Paperclip, ArrowLeft, Crown, Shield, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ref, onValue, onChildAdded, off } from "firebase/database";
import { db } from "@/lib/firebase";
import { sendMessage, deleteMessage, toggleReaction, setTyping as setFirebaseTyping, getRoomInfo } from "@/lib/firebaseChat";
import type { ChatMessage, Room, RoomMember } from "@/lib/firebaseChat";

const ChatRoom = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showEmoji, setShowEmoji] = useState<string | false>(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load room info
  useEffect(() => {
    if (!roomId) return;
    getRoomInfo(roomId).then(setRoom);
  }, [roomId]);

  // Listen to messages in real-time
  useEffect(() => {
    if (!roomId) return;
    const msgsRef = ref(db, `messages/${roomId}`);
    const unsub = onValue(msgsRef, (snap) => {
      if (!snap.exists()) { setMessages([]); return; }
      const data = snap.val();
      const msgs: ChatMessage[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        senderUid: val.senderUid,
        senderName: val.senderName,
        senderAvatar: val.senderAvatar,
        text: val.text,
        timestamp: val.timestamp || 0,
        reactions: val.reactions,
      }));
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgs);
    });
    return () => off(msgsRef);
  }, [roomId]);

  // Listen to members
  useEffect(() => {
    if (!roomId) return;
    const membersRef = ref(db, `roomMembers/${roomId}`);
    const unsub = onValue(membersRef, (snap) => {
      if (!snap.exists()) { setMembers([]); return; }
      const data = snap.val();
      const mems: RoomMember[] = Object.entries(data).map(([uid, val]: [string, any]) => ({
        uid,
        name: val.name,
        avatar: val.avatar,
        role: val.role,
        joinedAt: val.joinedAt || 0,
      }));
      setMembers(mems);
    });
    return () => off(membersRef);
  }, [roomId]);

  // Listen to online status
  useEffect(() => {
    const statusRef = ref(db, "status");
    const unsub = onValue(statusRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      const online = new Set<string>();
      Object.entries(data).forEach(([uid, val]: [string, any]) => {
        if (val.online) online.add(uid);
      });
      setOnlineUsers(online);
    });
    return () => off(statusRef);
  }, []);

  // Listen to typing
  useEffect(() => {
    if (!roomId || !user) return;
    const typingRef = ref(db, `typing/${roomId}`);
    const unsub = onValue(typingRef, (snap) => {
      if (!snap.exists()) { setTypingUsers([]); return; }
      const data = snap.val();
      const names: string[] = [];
      Object.entries(data).forEach(([uid, val]: [string, any]) => {
        if (uid !== user.uid) names.push(val.name);
      });
      setTypingUsers(names);
    });
    return () => off(typingRef);
  }, [roomId, user]);

  const handleSend = async () => {
    if (!inputText.trim() || !user || !roomId) return;
    const userName = user.displayName || user.email?.split("@")[0] || "User";
    const avatar = (userName[0] || "U").toUpperCase();
    const text = inputText;
    setInputText("");
    inputRef.current?.focus();
    // Clear typing
    await setFirebaseTyping(roomId, user.uid, userName, false);
    await sendMessage(roomId, user.uid, userName, avatar, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (!roomId || !user) return;
    const userName = user.displayName || user.email?.split("@")[0] || "User";
    setFirebaseTyping(roomId, user.uid, userName, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setFirebaseTyping(roomId, user.uid, userName, false);
    }, 2000);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!roomId || !user) return;
    await toggleReaction(roomId, messageId, emoji, user.uid);
  };

  const handleDelete = async (messageId: string) => {
    if (!roomId) return;
    await deleteMessage(roomId, messageId);
  };

  const emojis = ["❤️", "😂", "😮", "😢", "👍", "🔥", "🎉", "💯"];

  const roleIcon = (role: string) => {
    if (role === "admin") return <Crown className="w-3 h-3 text-warning" />;
    if (role === "moderator") return <Shield className="w-3 h-3 text-primary" />;
    return null;
  };

  const getReactionCount = (reactions: Record<string, Record<string, boolean>> | undefined, emoji: string) => {
    if (!reactions || !reactions[emoji]) return 0;
    return Object.keys(reactions[emoji]).length;
  };

  const onlineMemberCount = members.filter((m) => onlineUsers.has(m.uid)).length;

  return (
    <div className="h-screen flex bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border glass-strong flex items-center px-4 gap-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              {room?.type === "private" ? <Lock className="w-4 h-4 text-accent" /> : <Hash className="w-4 h-4 text-primary" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground text-sm truncate">{room?.name || "Loading..."}</h2>
              <p className="text-xs text-muted-foreground">{onlineMemberCount} online · {members.length} members</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(roomId || "")} className="text-muted-foreground hover:text-foreground">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowMembers(!showMembers)} className={`text-muted-foreground hover:text-foreground ${showMembers ? "bg-secondary" : ""}`}>
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No messages yet</h3>
                <p className="text-sm text-muted-foreground">Be the first to send a message!</p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isOwn = msg.senderUid === user?.uid;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 py-1.5 group ${isOwn ? "flex-row-reverse" : ""}`}
              >
                {!isOwn && (
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 mt-0.5">
                    {msg.senderAvatar}
                  </div>
                )}
                <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                  {!isOwn && <p className="text-xs font-medium text-primary mb-1">{msg.senderName}</p>}
                  <div className={`rounded-2xl px-4 py-2.5 relative ${isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "glass rounded-bl-md"}`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>

                    {/* Hover actions */}
                    <div className={`absolute top-0 ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 px-1`}>
                      <button onClick={() => setShowEmoji(showEmoji === msg.id ? false : (msg.id as any))} className="w-6 h-6 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      {isOwn && (
                        <button onClick={() => handleDelete(msg.id)} className="w-6 h-6 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Inline emoji picker for reactions */}
                    {showEmoji === msg.id && (
                      <div className={`absolute ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} top-8 glass-strong rounded-xl p-2 flex gap-1 z-10`}>
                        {emojis.map((emoji) => (
                          <button key={emoji} onClick={() => { handleReaction(msg.id, emoji); setShowEmoji(false); }} className="text-lg hover:scale-125 transition-transform">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {Object.keys(msg.reactions).map((emoji) => {
                        const count = getReactionCount(msg.reactions, emoji);
                        if (count === 0) return null;
                        const hasReacted = user && msg.reactions?.[emoji]?.[user.uid];
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${hasReacted ? "bg-primary/20 border border-primary/40" : "glass hover:bg-secondary/80"}`}
                          >
                            {emoji} <span className="text-muted-foreground">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Typing indicator */}
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-3 py-1.5">
                <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                  {typingUsers[0][0]}
                </div>
                <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                  </p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border glass-strong">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="w-full resize-none bg-secondary border border-border rounded-xl px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors max-h-32"
                style={{ minHeight: "44px" }}
              />
              <button
                onClick={() => setShowEmoji(showEmoji === "input" ? false : ("input" as any))}
                className="absolute right-3 bottom-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {showEmoji === "input" && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-full right-0 mb-2 glass-strong rounded-xl p-3 flex gap-2">
                    {emojis.map((emoji) => (
                      <button key={emoji} onClick={() => { setInputText((prev) => prev + emoji); setShowEmoji(false); }} className="text-xl hover:scale-125 transition-transform">
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={handleSend} disabled={!inputText.trim()} size="icon" className="gradient-bg text-primary-foreground rounded-xl h-11 w-11 shrink-0 disabled:opacity-40">
                <Send className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Members Sidebar */}
      <AnimatePresence>
        {showMembers && (
          <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="border-l border-border glass-strong overflow-hidden shrink-0">
            <div className="p-4 w-[280px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground text-sm">Members ({members.length})</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowMembers(false)} className="text-muted-foreground hover:text-foreground h-7 w-7">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium px-2 mb-2">Online — {onlineMemberCount}</p>
                {members.filter((m) => onlineUsers.has(m.uid)).map((member) => (
                  <div key={member.uid} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground">
                        {member.avatar}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-online border-2 border-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-foreground truncate">
                          {member.uid === user?.uid ? "You" : member.name}
                        </span>
                        {roleIcon(member.role)}
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize">{member.role}</span>
                    </div>
                  </div>
                ))}

                {members.filter((m) => !onlineUsers.has(m.uid)).length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground font-medium px-2 mt-4 mb-2">
                      Offline — {members.filter((m) => !onlineUsers.has(m.uid)).length}
                    </p>
                    {members.filter((m) => !onlineUsers.has(m.uid)).map((member) => (
                      <div key={member.uid} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors opacity-50">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {member.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">
                            {member.uid === user?.uid ? "You" : member.name}
                          </span>
                          <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatRoom;
