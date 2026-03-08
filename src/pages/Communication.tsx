import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Send, Plus, ArrowLeft } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";

interface Thread {
  id: string;
  subject: string | null;
  last_message_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
}

interface Participant {
  user_id: string;
  full_name: string;
}

const Communication: React.FC = () => {
  const { profile, user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // New conversation state
  const [openNew, setOpenNew] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedLearner, setSelectedLearner] = useState<string>("");
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [creatingThread, setCreatingThread] = useState(false);
  const [messageTarget, setMessageTarget] = useState<"parent" | "learner">("parent");

  const isTeacher = profile?.role === "teacher";
  const isParent = profile?.role === "parent";
  const isLearner = profile?.role === "learner";
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!profile) return;
    loadThreads();
  }, [profile]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("message_threads")
        .select("id, subject, last_message_at")
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      
      setThreads(data || []);
      if (data && data.length > 0 && !activeThread) {
        setActiveThread(data[0]);
        loadMessages(data[0].id);
        loadParticipants(data[0].id);
      }
    } catch (error: any) {
      console.error("Error loading threads:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, thread_id, sender_user_id, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load messages");
      return;
    }
    setMessages(data || []);
  };

  const loadParticipants = async (threadId: string) => {
    const { data, error } = await supabase
      .from("thread_participants")
      .select("user_id")
      .eq("thread_id", threadId);

    if (error) return;

    if (data && data.length > 0) {
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      setParticipants(profiles?.map(p => ({ 
        user_id: p.user_id, 
        full_name: p.full_name || "Unknown" 
      })) || []);
    }
  };

  // Realtime updates
  useEffect(() => {
    if (!activeThread) return;
    
    const channel = supabase
      .channel(`messages-${activeThread.id}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "messages", 
          filter: `thread_id=eq.${activeThread.id}` 
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeThread]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeThread || !user) return;
    setSendingMessage(true);

    try {
      const { error } = await supabase.from("messages").insert({
        thread_id: activeThread.id,
        sender_user_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      
      setNewMessage("");
      await loadThreads();
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Load teacher's classes
  useEffect(() => {
    if (!profile || !isTeacher) return;
    
    supabase
      .from("classes")
      .select("id, name, grade_level")
      .eq("teacher_id", profile.user_id)
      .then(({ data }) => setClasses(data || []));
  }, [isTeacher, profile]);

  // Load parent's children
  useEffect(() => {
    if (!profile || !isParent) return;
    
    const loadChildren = async () => {
      const { data: relationships } = await supabase
        .from("parent_child_relationships")
        .select("child_user_id")
        .eq("parent_user_id", profile.user_id);

      if (relationships && relationships.length > 0) {
        const childIds = relationships.map(r => r.child_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", childIds);
        
        setChildren(profiles || []);
      }
    };
    
    loadChildren();
  }, [isParent, profile]);

  // Load learner's teachers
  useEffect(() => {
    if (!profile || !isLearner) return;
    
    const loadTeachers = async () => {
      const { data: learnerData } = await supabase
        .from("learners")
        .select("class_id")
        .eq("user_id", profile.user_id)
        .eq("status", "active");

      if (learnerData && learnerData.length > 0) {
        const classIds = learnerData.map(l => l.class_id);
        const { data: classData } = await supabase
          .from("classes")
          .select("id, name, teacher_id")
          .in("id", classIds);

        if (classData && classData.length > 0) {
          const teacherIds = [...new Set(classData.map(c => c.teacher_id).filter(Boolean))];
          const { data: teacherProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", teacherIds);

          const teachersWithClasses = teacherProfiles?.map(t => ({
            ...t,
            className: classData.find(c => c.teacher_id === t.user_id)?.name || "Unknown Class"
          })) || [];
          
          setTeachers(teachersWithClasses);
        }
      }
    };
    
    loadTeachers();
  }, [isLearner, profile]);

  // Load all teachers for admin
  useEffect(() => {
    if (!profile || !isAdmin) return;
    
    const loadAllTeachers = async () => {
      const { data: teacherProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("role", "teacher");

      setTeachers(teacherProfiles?.map(t => ({
        ...t,
        className: "Teacher"
      })) || []);
    };
    
    loadAllTeachers();
  }, [isAdmin, profile]);

  // Load learners when class is selected
  useEffect(() => {
    if (!selectedClass) {
      setLearners([]);
      return;
    }
    
    const loadLearners = async () => {
      const { data } = await supabase
        .from("learners")
        .select("id, user_id")
        .eq("class_id", selectedClass);

      if (data && data.length > 0) {
        const userIds = data.map(l => l.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const learnersWithNames = data.map(l => ({
          ...l,
          full_name: profiles?.find(p => p.user_id === l.user_id)?.full_name || "Unknown"
        }));
        
        setLearners(learnersWithNames);
      }
    };
    
    loadLearners();
  }, [selectedClass]);

  const startTeacherConversation = async () => {
    if (!profile || !selectedLearner) return;
    setCreatingThread(true);

    try {
      // Find the learner's user_id
      const learner = learners.find(l => l.id === selectedLearner);
      if (!learner) throw new Error("Learner not found");

      let targetUserId: string;
      let threadSubject: string;

      if (messageTarget === "parent") {
        // Find parent linked to this learner
        const { data: parentRelations, error: parentError } = await supabase
          .from("parent_child_relationships")
          .select("parent_user_id")
          .eq("child_user_id", learner.user_id)
          .limit(1);

        if (parentError) throw parentError;
        if (!parentRelations || parentRelations.length === 0) {
          throw new Error("No parent linked to this student. Please link a parent first, or message the learner directly.");
        }

        targetUserId = parentRelations[0].parent_user_id;
        threadSubject = `Parent of ${learner.full_name}`;
      } else {
        // Message learner directly
        targetUserId = learner.user_id;
        threadSubject = `Message to ${learner.full_name}`;
      }

      // Create thread with client-generated ID
      const threadId = crypto.randomUUID();
      const { error: threadErr } = await supabase
        .from("message_threads")
        .insert({ id: threadId, subject: threadSubject });

      if (threadErr) throw threadErr;

      const thread = { id: threadId, subject: threadSubject, last_message_at: new Date().toISOString() };

      // Add participants
      const { error: partErr } = await supabase
        .from("thread_participants")
        .insert([
          { thread_id: thread.id, user_id: profile.user_id },
          { thread_id: thread.id, user_id: targetUserId },
        ]);

      if (partErr) throw partErr;

      setOpenNew(false);
      setSelectedClass("");
      setSelectedLearner("");
      setMessageTarget("parent");
      await loadThreads();
      setActiveThread(thread);
      await loadMessages(thread.id);
      await loadParticipants(thread.id);

      toast.success(messageTarget === "parent" ? "Conversation started with parent" : "Conversation started with learner");
    } catch (e: any) {
      toast.error(e.message || "Failed to start conversation");
    } finally {
      setCreatingThread(false);
    }
  };

  const startParentConversation = async () => {
    if (!profile || !selectedChild) return;
    setCreatingThread(true);

    try {
      // Get the learner record for this child
      const { data: learnerData, error: learnerError } = await supabase
        .from("learners")
        .select("id, class_id")
        .eq("user_id", selectedChild)
        .eq("status", "active")
        .limit(1);

      if (learnerError) throw learnerError;
      if (!learnerData || learnerData.length === 0) {
        throw new Error("Child is not enrolled in any class.");
      }

      // Get the teacher for this class
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("teacher_id")
        .eq("id", learnerData[0].class_id)
        .single();

      if (classError) throw classError;
      if (!classData?.teacher_id) {
        throw new Error("No teacher assigned to child's class.");
      }

      // Get child's name
      const { data: childProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", selectedChild)
        .single();

      // Create thread with client-generated ID
      const threadId = crypto.randomUUID();
      const threadSubject = `Regarding: ${childProfile?.full_name || "My Child"}`;
      const { error: threadErr } = await supabase
        .from("message_threads")
        .insert({ id: threadId, subject: threadSubject });

      if (threadErr) throw threadErr;

      const thread = { id: threadId, subject: threadSubject, last_message_at: new Date().toISOString() };

      // Add participants
      const { error: partErr } = await supabase
        .from("thread_participants")
        .insert([
          { thread_id: thread.id, user_id: profile.user_id },
          { thread_id: thread.id, user_id: classData.teacher_id },
        ]);

      if (partErr) throw partErr;

      setOpenNew(false);
      setSelectedChild("");
      await loadThreads();
      setActiveThread(thread);
      await loadMessages(thread.id);
      await loadParticipants(thread.id);

      toast.success("Conversation started with teacher");
    } catch (e: any) {
      toast.error(e.message || "Failed to start conversation");
    } finally {
      setCreatingThread(false);
    }
  };

  const startLearnerConversation = async () => {
    if (!profile || !selectedTeacher) return;
    setCreatingThread(true);

    try {
      // Get teacher's name
      const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", selectedTeacher)
        .single();

      // Create thread with client-generated ID
      const threadId = crypto.randomUUID();
      const threadSubject = `Message to ${teacherProfile?.full_name || "Teacher"}`;
      const { error: threadErr } = await supabase
        .from("message_threads")
        .insert({ id: threadId, subject: threadSubject });

      if (threadErr) throw threadErr;

      const thread = { id: threadId, subject: threadSubject, last_message_at: new Date().toISOString() };

      // Add participants
      const { error: partErr } = await supabase
        .from("thread_participants")
        .insert([
          { thread_id: thread.id, user_id: profile.user_id },
          { thread_id: thread.id, user_id: selectedTeacher },
        ]);

      if (partErr) throw partErr;

      setOpenNew(false);
      setSelectedTeacher("");
      await loadThreads();
      setActiveThread(thread);
      await loadMessages(thread.id);
      await loadParticipants(thread.id);

      toast.success("Conversation started with teacher");
    } catch (e: any) {
      toast.error(e.message || "Failed to start conversation");
    } finally {
      setCreatingThread(false);
    }
  };

  const getSenderName = (senderId: string) => {
    if (senderId === user?.id) return "You";
    const participant = participants.find(p => p.user_id === senderId);
    return participant?.full_name || "Unknown";
  };

  const getOtherParticipants = () => {
    return participants
      .filter(p => p.user_id !== user?.id)
      .map(p => p.full_name)
      .join(", ");
  };

  // All roles can now access communication

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner text="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {isLearner ? "Messages" : "Communication"}
        </h1>
        <p className="text-muted-foreground">
          {isTeacher 
            ? "Message parents and students" 
            : isParent 
              ? "Contact your children's teachers" 
              : isAdmin
                ? "Communicate with teachers"
                : "Message your teachers"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threads list */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Conversations
            </CardTitle>
            <Button size="sm" onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveThread(t);
                    loadMessages(t.id);
                    loadParticipants(t.id);
                  }}
                  className={`w-full text-left rounded-lg p-3 border transition-colors ${
                    activeThread?.id === t.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted/50 border-transparent'
                  }`}
                >
                  <div className="font-medium truncate">{t.subject || 'Conversation'}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(t.last_message_at), "MMM d, h:mm a")}
                  </div>
                </button>
              ))}
              {threads.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Start a new conversation</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active chat */}
        <Card className="glass-card lg:col-span-2 flex flex-col min-h-[600px]">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-lg">
              {activeThread ? (
                <div>
                  <div>{activeThread.subject || 'Conversation'}</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    with {getOtherParticipants() || "..."}
                  </div>
                </div>
              ) : (
                'Select a conversation'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[400px]">
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    m.sender_user_id === user?.id 
                      ? 'ml-auto bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {getSenderName(m.sender_user_id)}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                  <div className="text-[10px] opacity-70 mt-1">
                    {format(new Date(m.created_at), "h:mm a")}
                  </div>
                </div>
              ))}
              {activeThread && messages.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No messages yet. Say hello!
                </div>
              )}
              {!activeThread && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Select a conversation to view messages
                </div>
              )}
            </div>
            
            {activeThread && (
              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); }}
                  disabled={sendingMessage}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={sendingMessage || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New conversation dialog */}
      {openNew && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 glass-card">
            <CardHeader>
              <CardTitle>Start New Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTeacher ? (
                <>
                  <div className="space-y-2">
                    <Label>Select Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} (Grade {c.grade_level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Student</Label>
                    <Select 
                      value={selectedLearner} 
                      onValueChange={setSelectedLearner}
                      disabled={!selectedClass}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {learners.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message To</Label>
                    <Select value={messageTarget} onValueChange={(v) => setMessageTarget(v as "parent" | "learner")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent/Guardian</SelectItem>
                        <SelectItem value="learner">Student Directly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {messageTarget === "parent" 
                      ? "A conversation will be started with the student's linked parent." 
                      : "A conversation will be started directly with the student."}
                  </p>
                </>
              ) : isParent ? (
                <>
                  <div className="space-y-2">
                    <Label>Select Child</Label>
                    <Select value={selectedChild} onValueChange={setSelectedChild}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your child" />
                      </SelectTrigger>
                      <SelectContent>
                        {children.map((c) => (
                          <SelectItem key={c.user_id} value={c.user_id}>
                            {c.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A conversation will be started with your child's class teacher.
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Select Teacher</Label>
                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((t: any) => (
                          <SelectItem key={t.user_id} value={t.user_id}>
                            {t.full_name} ({t.className})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? "Start a conversation with a teacher." : "A conversation will be started with your teacher."}
                  </p>
                  {teachers.length === 0 && (
                    <p className="text-xs text-warning">
                      {isAdmin ? "No teachers found in the system." : "No teachers found. Make sure you are enrolled in a class."}
                    </p>
                  )}
                </>
              )}
              
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setOpenNew(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={
                    isTeacher 
                      ? startTeacherConversation 
                      : isParent 
                        ? startParentConversation 
                        : startLearnerConversation
                  }
                  disabled={
                    creatingThread || 
                    (isTeacher ? !selectedLearner : isParent ? !selectedChild : !selectedTeacher)
                  }
                >
                  {creatingThread ? "Creating..." : "Start Conversation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Communication;