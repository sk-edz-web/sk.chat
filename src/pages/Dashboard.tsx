import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, LogIn, MessageCircle, Users, Hash, Lock, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";
import type { Room } from "@/lib/firebaseChat";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen to user's rooms
  useEffect(() => {
    if (!user) return;
    const userRoomsRef = ref(db, `userRooms/${user.uid}`);
    const unsub = onValue(userRoomsRef, async (snap) => {
      if (!snap.exists()) {
        setRooms([]);
        setLoading(false);
        return;
      }
      const roomIds = Object.keys(snap.val());
      // Listen to each room
      const roomsRef = ref(db, "rooms");
      onValue(roomsRef, (roomsSnap) => {
        if (!roomsSnap.exists()) {
          setRooms([]);
          setLoading(false);
          return;
        }
        const allRooms = roomsSnap.val();
        const userRooms: Room[] = roomIds
          .filter((id) => allRooms[id])
          .map((id) => ({ id, ...allRooms[id] }));
        // Sort by last message time
        userRooms.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
        setRooms(userRooms);
        setLoading(false);
      });
    });
    return () => unsub();
  }, [user]);

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="min-h-screen relative">
      {/* Background effects */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border glass-strong sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold gradient-text">ChatVerse</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 mr-2">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {user?.displayName || user?.email?.split("@")[0] || "User"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => { await logout(); navigate("/"); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-10">
          {/* Hero Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12"
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="glass rounded-2xl p-8 text-left group cursor-pointer glow hover:glow-strong transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Plus className="w-7 h-7 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Create Room</h2>
              <p className="text-sm text-muted-foreground">Start a new public or private chat room and invite your friends.</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowJoinModal(true)}
              className="glass rounded-2xl p-8 text-left group cursor-pointer glow hover:glow-strong transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <LogIn className="w-7 h-7 text-accent-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Join Room</h2>
              <p className="text-sm text-muted-foreground">Enter a room ID to join the conversation.</p>
            </motion.button>
          </motion.div>

          {/* Your Rooms */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Your Rooms</h2>
              {rooms.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors w-48"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading rooms...</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-16 glass rounded-2xl">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No rooms yet</h3>
                <p className="text-sm text-muted-foreground">Create a room or join one to start chatting!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRooms.map((room, i) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate(`/room/${room.id}`)}
                    className="glass rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-card/80 transition-all group"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      room.type === "public" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                    }`}>
                      {room.type === "public" ? <Hash className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          room.type === "public" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                        }`}>
                          {room.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {room.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {formatTime(room.lastMessageTime || 0)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </main>
      </div>

      <CreateRoomModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <JoinRoomModal open={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </div>
  );
};

export default Dashboard;
