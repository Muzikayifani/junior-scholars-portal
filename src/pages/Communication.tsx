// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Thread {
  id: string;
  subject: string | null;
  last_message_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  sender_profile_id: string;
  content: string;
  created_at: string;
}

const Communication: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // New conversation state
  const [openNew, setOpenNew] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedLearner, setSelectedLearner] = useState<string>("");
  const isTeacher = profile?.role === "teacher";
  const isParent = profile?.role === "parent";

  useEffect(() => {
    if (!profile) return;
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadThreads = async () => {
    const { data, error } = await supabase
      .from("message_threads")
      .select("id, subject, last_message_at")
      .order("last_message_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setThreads(data || []);
    if (data && data.length && !activeThread) {
      setActiveThread(data[0]);
      loadMessages(data[0].id);
    }
  };

  const loadMessages = async (threadId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, thread_id, sender_profile_id, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setMessages(data || []);
  };

  // Realtime updates
  useEffect(() => {
    if (!activeThread) return;
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${activeThread.id}` },
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
    if (!newMessage.trim() || !activeThread || !profile) return;
    setLoading(true);

    const { error } = await supabase.from("messages").insert({
      thread_id: activeThread.id,
      sender_profile_id: profile.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
      await loadThreads();
    }
    setLoading(false);
  };

  // New conversation helpers
  useEffect(() => {
    if (!profile) return;
    if (isTeacher) {
      supabase.from("classes").select("id, name, grade_level").then(({ data }) => setClasses(data || []));
    } else if (isParent) {
      // Parents don't need classes to start; they will pick one child
      loadParentThreadsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, isParent, profile]);

  const loadParentThreadsData = async () => {
    // noop for now; we will fetch child list when opening the composer
  };

  const startTeacherConversation = async () => {
    if (!profile || !selectedLearner) return;
    setLoading(true);
    try {
      // Find selected learner's parent
      const { data: learner, error: learnerErr } = await supabase
        .from("learners")
        .select("id, parent_id")
        .eq("id", selectedLearner)
        .maybeSingle();
      if (learnerErr) throw learnerErr;
      if (!learner?.parent_id) throw new Error("Selected learner has no parent linked.");

      // Create thread
      const { data: thread, error: threadErr } = await supabase
        .from("message_threads")
        .insert({ subject: "Parent-Teacher Conversation" })
        .select("id, subject, last_message_at")
        .single();
      if (threadErr) throw threadErr;

      // Add participants: teacher (self) and parent
      const { error: partErr } = await supabase.from("thread_participants").insert([
        { thread_id: thread!.id, profile_id: profile.id },
        { thread_id: thread!.id, profile_id: learner.parent_id },
      ]);
      if (partErr) throw partErr;

      setOpenNew(false);
      setSelectedClass("");
      setSelectedLearner("");
      await loadThreads();
      setActiveThread(thread!);
      await loadMessages(thread!.id);

      toast({ title: "Conversation started" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const startParentConversation = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Fetch children and allow selection on UI. For now, auto-pick first child and their teacher.
      const { data: children, error: childrenErr } = await supabase
        .from("learners")
        .select("id, class_id")
        .eq("parent_id", profile.id);
      if (childrenErr) throw childrenErr;
      if (!children || !children.length) throw new Error("No linked children found.");

      const child = children[0];
      const { data: cls, error: clsErr } = await supabase
        .from("classes")
        .select("teacher_id")
        .eq("id", child.class_id)
        .single();
      if (clsErr) throw clsErr;
      if (!cls?.teacher_id) throw new Error("Child's class has no teacher assigned.");

      const { data: thread, error: threadErr } = await supabase
        .from("message_threads")
        .insert({ subject: "Parent-Teacher Conversation" })
        .select("id, subject, last_message_at")
        .single();
      if (threadErr) throw threadErr;

      const { error: partErr } = await supabase.from("thread_participants").insert([
        { thread_id: thread!.id, profile_id: profile.id },
        { thread_id: thread!.id, profile_id: cls.teacher_id },
      ]);
      if (partErr) throw partErr;

      setOpenNew(false);
      await loadThreads();
      setActiveThread(thread!);
      await loadMessages(thread!.id);
      toast({ title: "Conversation started" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  // Load learners when class picked
  useEffect(() => {
    if (!selectedClass) { setLearners([]); return; }
    supabase
      .from("learners")
      .select("id, 'Student FullName', profile:profiles(first_name, last_name)")
      .eq("class_id", selectedClass)
      .then(({ data }) => setLearners(data || []));
  }, [selectedClass]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
      {/* Threads list */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conversations</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpenNew(true)}>New</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => { setActiveThread(t); loadMessages(t.id); }}
                className={`w-full text-left rounded p-3 border transition ${activeThread?.id === t.id ? 'bg-accent' : 'hover:bg-accent/50'}`}
              >
                <div className="font-medium">{t.subject || 'Conversation'}</div>
                <div className="text-xs text-muted-foreground">Last: {new Date(t.last_message_at).toLocaleString()}</div>
              </button>
            ))}
            {threads.length === 0 && (
              <div className="text-sm text-muted-foreground">No conversations yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active chat */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle>{activeThread?.subject || 'Select a conversation'}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] rounded p-3 ${m.sender_profile_id === profile?.id ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
              <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
          {activeThread && messages.length === 0 && (
            <div className="text-sm text-muted-foreground">No messages yet. Say hello!</div>
          )}
        </CardContent>
        {activeThread && (
          <div className="flex gap-2 p-4 pt-0">
            <Input
              placeholder="Type a message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            />
            <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>Send</Button>
          </div>
        )}
      </Card>

      {/* New conversation modal - simple inline */}
      {openNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-lg shadow-lg">
            <div className="text-lg font-semibold mb-4">Start a new conversation</div>
            {isTeacher ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} (Grade {c.grade_level})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Learner</Label>
                  <Select value={selectedLearner} onValueChange={setSelectedLearner}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select learner" />
                    </SelectTrigger>
                    <SelectContent>
                      {learners.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l["Student FullName"] || `${l.profile?.first_name} ${l.profile?.last_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
                  <Button onClick={startTeacherConversation} disabled={!selectedLearner || loading}>Start</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">We'll start a chat with your child's class teacher.</p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
                  <Button onClick={startParentConversation} disabled={loading}>Start</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Communication;
