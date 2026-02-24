import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Lock, Hash, Users, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRoomInfo, joinRoom } from "@/lib/firebaseChat";
import { useToast } from "@/hooks/use-toast";
import type { Room } from "@/lib/firebaseChat";

interface JoinRoomModalProps {
  open: boolean;
  onClose: () => void;
}

const JoinRoomModal = ({ open, onClose }: JoinRoomModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [foundRoom, setFoundRoom] = useState<Room | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCheck = async () => {
    if (roomId.trim().length < 3) {
      setError("Please enter a valid room ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const room = await getRoomInfo(roomId.trim());
      if (!room) {
        setError("Room not found. Check the ID and try again.");
        setFoundRoom(null);
      } else {
        setFoundRoom(room);
        setChecked(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to check room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !foundRoom) return;

    // Check password for private rooms
    if (foundRoom.type === "private" && password !== foundRoom.password) {
      setError("Incorrect password");
      return;
    }

    setJoining(true);
    try {
      const userName = user.displayName || user.email?.split("@")[0] || "User";
      const avatar = (userName[0] || "U").toUpperCase();
      await joinRoom(roomId.trim(), user.uid, userName, avatar);
      handleClose();
      navigate(`/room/${roomId.trim()}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to join room", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const handleClose = () => {
    setRoomId("");
    setPassword("");
    setChecked(false);
    setFoundRoom(null);
    setError("");
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative glass-strong rounded-2xl p-6 w-full max-w-md glow-strong"
        >
          <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-bold text-foreground mb-2">Join a Room</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter a room ID to join an existing conversation.</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Room ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Paste room ID here"
                  value={roomId}
                  onChange={(e) => { setRoomId(e.target.value); setChecked(false); setFoundRoom(null); setError(""); }}
                  className="pl-10 bg-secondary border-border focus:border-primary h-11 rounded-xl"
                />
              </div>
            </div>

            {!checked && (
              <Button
                onClick={handleCheck}
                disabled={loading}
                variant="outline"
                className="w-full h-11 rounded-xl border-border hover:border-primary transition-colors"
              >
                {loading ? "Checking..." : "Check Room"}
              </Button>
            )}

            {checked && foundRoom && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    foundRoom.type === "public" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                  }`}>
                    {foundRoom.type === "public" ? <Hash className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{foundRoom.name}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      foundRoom.type === "public" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                    }`}>
                      {foundRoom.type}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {checked && foundRoom?.type === "private" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Room Password</label>
                <Input
                  type="password"
                  placeholder="Enter room password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="bg-secondary border-border focus:border-primary h-11 rounded-xl"
                />
              </motion.div>
            )}

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {error}
              </motion.p>
            )}

            {checked && foundRoom && (
              <Button
                onClick={handleJoin}
                disabled={joining || (foundRoom.type === "private" && !password)}
                className="w-full h-11 rounded-xl gradient-bg text-primary-foreground font-medium hover:opacity-90 transition-opacity group"
              >
                {joining ? "Joining..." : "Join Room"}
                {!joining && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default JoinRoomModal;
