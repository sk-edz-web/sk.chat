import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hash, Lock, Copy, Check, ArrowRight, ArrowLeft, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createRoom } from "@/lib/firebaseChat";
import { useToast } from "@/hooks/use-toast";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
}

const CreateRoomModal = ({ open, onClose }: CreateRoomModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"type" | "config" | "success">("type");
  const [roomType, setRoomType] = useState<"public" | "private">("public");
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(createdRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const userName = user.displayName || user.email?.split("@")[0] || "User";
      const avatar = (userName[0] || "U").toUpperCase();
      const roomId = await createRoom(roomName, roomType, description, password, user.uid, userName, avatar);
      setCreatedRoomId(roomId);
      setStep("success");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create room", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep("type");
    setRoomName("");
    setDescription("");
    setPassword("");
    setConfirmPassword("");
    setCreatedRoomId("");
    onClose();
  };

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ["", "bg-destructive", "bg-warning", "bg-success"];
  const strengthLabels = ["", "Weak", "Medium", "Strong"];

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
          className="relative glass-strong rounded-2xl p-6 w-full max-w-lg glow-strong"
        >
          <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait">
            {step === "type" && (
              <motion.div key="type" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="text-xl font-bold text-foreground mb-2">Create a Room</h2>
                <p className="text-sm text-muted-foreground mb-6">Choose your room type to get started.</p>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setRoomType("public"); setStep("config"); }}
                    className="glass rounded-xl p-6 text-left group cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Hash className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Public</h3>
                    <p className="text-xs text-muted-foreground">Anyone with the ID can join.</p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-primary">
                      <Users className="w-3 h-3" /> Open to all
                    </div>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setRoomType("private"); setStep("config"); }}
                    className="glass rounded-xl p-6 text-left group cursor-pointer hover:border-accent/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Lock className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Private</h3>
                    <p className="text-xs text-muted-foreground">Password-protected room.</p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-accent">
                      <Shield className="w-3 h-3" /> Password required
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === "config" && (
              <motion.div key="config" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setStep("type")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h2 className="text-xl font-bold text-foreground mb-1">Configure Room</h2>
                <p className="text-sm text-muted-foreground mb-6">Set up your {roomType} room details.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Room Name</label>
                    <Input placeholder="e.g. Cool Hangout" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="bg-secondary border-border focus:border-primary h-11 rounded-xl" />
                    {roomName.length > 0 && roomName.length < 3 && <p className="text-xs text-destructive mt-1">Minimum 3 characters required</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Description (optional)</label>
                    <Input placeholder="What's this room about?" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-border focus:border-primary h-11 rounded-xl" />
                  </div>
                  {roomType === "private" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="Set a room password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary border-border focus:border-primary h-11 rounded-xl pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? "Hide" : "Show"}</button>
                        </div>
                        {password.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 flex gap-1">
                              {[1, 2, 3].map((level) => (
                                <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= level ? strengthColors[passwordStrength] : "bg-border"}`} />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">{strengthLabels[passwordStrength]}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
                        <Input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-secondary border-border focus:border-primary h-11 rounded-xl" />
                        {confirmPassword && confirmPassword !== password && <p className="text-xs text-destructive mt-1">Passwords don't match</p>}
                      </div>
                    </motion.div>
                  )}
                  <Button
                    onClick={handleCreate}
                    disabled={roomName.length < 3 || creating || (roomType === "private" && (password.length < 6 || password !== confirmPassword))}
                    className="w-full h-11 rounded-xl gradient-bg text-primary-foreground font-medium hover:opacity-90 transition-opacity group"
                  >
                    {creating ? "Creating..." : "Create Room"}
                    {!creating && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mx-auto mb-5"
                >
                  <Check className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <h2 className="text-xl font-bold text-foreground mb-2">Room Created! 🎉</h2>
                <p className="text-sm text-muted-foreground mb-6">Share this ID with your friends to let them join.</p>
                <div className="glass rounded-xl p-4 flex items-center justify-between mb-6">
                  <code className="text-sm font-mono font-bold gradient-text break-all">{createdRoomId}</code>
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="text-muted-foreground hover:text-foreground shrink-0 ml-2">
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  onClick={() => { handleClose(); navigate(`/room/${createdRoomId}`); }}
                  className="w-full h-11 rounded-xl gradient-bg text-primary-foreground font-medium hover:opacity-90"
                >
                  Go to Room
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateRoomModal;
