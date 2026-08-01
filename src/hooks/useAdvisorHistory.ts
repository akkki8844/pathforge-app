import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AdvisorSession {
  id: string;
  name: string | null;
  conversation_id: string | null;
  transcript: string;
  advisor_response: string;
  topics_discussed: string[] | null;
  pinned: boolean;
  archived: boolean;
  project_id: string | null;
  created_at: string;
}

export interface AdvisorProject {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface ConversationGroup {
  id: string;
  name: string;
  conversation_id: string;
  messages: { role: 'user' | 'advisor'; text: string; timestamp: string }[];
  pinned: boolean;
  archived: boolean;
  project_id: string | null;
  created_at: string;
}

export function useAdvisorHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AdvisorSession[]>([]);
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('voice_advisor_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const sessionsData = (data || []) as AdvisorSession[];
      setSessions(sessionsData);

      // Group sessions by conversation_id
      const grouped = groupSessionsIntoConversations(sessionsData);
      setConversations(grouped);
    } catch (error) {
      console.error('Error loading advisor sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Group individual session entries into conversation groups
  const groupSessionsIntoConversations = (sessions: AdvisorSession[]): ConversationGroup[] => {
    const conversationMap = new Map<string, AdvisorSession[]>();
    
    sessions.forEach(session => {
      const convId = session.conversation_id || session.id;
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, []);
      }
      conversationMap.get(convId)!.push(session);
    });

    const groups: ConversationGroup[] = [];
    conversationMap.forEach((sessionList, convId) => {
      // Sort by created_at ascending (oldest first)
      sessionList.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const messages: { role: 'user' | 'advisor'; text: string; timestamp: string }[] = [];
      sessionList.forEach(s => {
        messages.push({ role: 'user', text: s.transcript, timestamp: s.created_at });
        messages.push({ role: 'advisor', text: s.advisor_response, timestamp: s.created_at });
      });

      // Use the first session's name or auto-generate
      const firstSession = sessionList[0];
      const name = firstSession.name || 
        `Conversation ${new Date(firstSession.created_at).toLocaleDateString()}`;

      groups.push({
        id: firstSession.id,
        name,
        conversation_id: convId,
        messages,
        pinned: sessionList.some((s) => s.pinned),
        archived: sessionList.length > 0 && sessionList.every((s) => s.archived),
        project_id: sessionList.find((s) => s.project_id)?.project_id ?? null,
        created_at: firstSession.created_at,
      });
    });

    // Sort by most recent first
    groups.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return groups;
  };

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Rename a conversation
  const renameConversation = useCallback(async (conversationId: string, newName: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('voice_advisor_sessions')
        .update({ name: newName })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setConversations(prev => prev.map(c => 
        c.conversation_id === conversationId ? { ...c, name: newName } : c
      ));
      
      toast.success('Conversation renamed');
      return true;
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast.error('Failed to rename conversation');
      return false;
    }
  }, [user]);

  // Save a new message to a conversation
  const saveMessage = useCallback(async (
    transcript: string,
    advisorResponse: string,
    conversationId?: string,
    topics?: string[],
    autoTitle?: string | null,
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      const newConversationId = conversationId || crypto.randomUUID();
      const isFirstMessage = !conversationId;

      const { data, error } = await supabase
        .from('voice_advisor_sessions')
        .insert({
          user_id: user.id,
          transcript,
          advisor_response: advisorResponse,
          conversation_id: newConversationId,
          topics_discussed: topics || [],
          name: isFirstMessage && autoTitle ? autoTitle : null,
        })
        .select()
        .single();

      if (error) throw error;

      // If this is the first message and we have a title, propagate it to all
      // (currently only one) rows in this conversation so the sidebar shows it.
      if (isFirstMessage && autoTitle) {
        await supabase
          .from('voice_advisor_sessions')
          .update({ name: autoTitle })
          .eq('conversation_id', newConversationId)
          .eq('user_id', user.id);
      }

      // Optimistically merge instead of refetching all sessions
      setSessions((prev) => {
        const next = [data as AdvisorSession, ...prev];
        setConversations(groupSessionsIntoConversations(next));
        return next;
      });

      return newConversationId;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }, [user]);

  // Delete a single conversation (all rows that share its conversation_id)
  const deleteConversation = useCallback(
    async (conversationId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        const { error } = await supabase
          .from('voice_advisor_sessions')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);

        if (error) throw error;

        setSessions((prev) => {
          const next = prev.filter((s) => (s.conversation_id || s.id) !== conversationId);
          setConversations(groupSessionsIntoConversations(next));
          return next;
        });

        toast.success('Conversation deleted');
        return true;
      } catch (error) {
        console.error('Error deleting conversation:', error);
        toast.error('Failed to delete conversation');
        return false;
      }
    },
    [user],
  );

  // Delete every conversation for this user
  const deleteAllConversations = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('voice_advisor_sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setSessions([]);
      setConversations([]);
      toast.success('All conversations cleared');
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
      return false;
    }
  }, [user]);

  // Export a conversation as a downloaded markdown file
  const exportConversation = useCallback((conversationId: string) => {
    const conv = conversations.find((c) => c.conversation_id === conversationId);
    if (!conv) {
      toast.error('Conversation not found');
      return;
    }
    const safeName = conv.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'conversation';
    const date = new Date(conv.created_at).toLocaleString();
    const md =
      `# ${conv.name}\n\n_Exported from Pathforge Advisor — ${date}_\n\n---\n\n` +
      conv.messages
        .map((m) => {
          const role = m.role === 'user' ? '**You**' : '**Advisor**';
          const ts = new Date(m.timestamp).toLocaleString();
          return `${role} _( ${ts} )_\n\n${m.text}\n`;
        })
        .join('\n---\n\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Conversation exported');
  }, [conversations]);

  // Projects
  const [projects, setProjects] = useState<AdvisorProject[]>([]);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('advisor_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error) setProjects((data || []) as AdvisorProject[]);
  }, [user]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const createProject = useCallback(async (name: string): Promise<AdvisorProject | null> => {
    if (!user || !name.trim()) return null;
    const { data, error } = await supabase
      .from('advisor_projects')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();
    if (error) { toast.error('Failed to create project'); return null; }
    setProjects((p) => [...p, data as AdvisorProject]);
    toast.success('Project created');
    return data as AdvisorProject;
  }, [user]);

  const renameProject = useCallback(async (id: string, name: string) => {
    if (!user || !name.trim()) return false;
    const { error } = await supabase
      .from('advisor_projects').update({ name: name.trim() }).eq('id', id).eq('user_id', user.id);
    if (error) { toast.error('Rename failed'); return false; }
    setProjects((p) => p.map((x) => x.id === id ? { ...x, name: name.trim() } : x));
    return true;
  }, [user]);

  const deleteProject = useCallback(async (id: string) => {
    if (!user) return false;
    // Unassign conversations first, then drop the project.
    await supabase.from('voice_advisor_sessions')
      .update({ project_id: null }).eq('project_id', id).eq('user_id', user.id);
    const { error } = await supabase
      .from('advisor_projects').delete().eq('id', id).eq('user_id', user.id);
    if (error) { toast.error('Delete failed'); return false; }
    setProjects((p) => p.filter((x) => x.id !== id));
    setSessions((prev) => {
      const next = prev.map((s) => s.project_id === id ? { ...s, project_id: null } : s);
      setConversations(groupSessionsIntoConversations(next));
      return next;
    });
    toast.success('Project deleted');
    return true;
  }, [user]);

  const setConversationProject = useCallback(async (conversationId: string, projectId: string | null) => {
    if (!user) return false;
    const { error } = await supabase
      .from('voice_advisor_sessions')
      .update({ project_id: projectId })
      .eq('conversation_id', conversationId).eq('user_id', user.id);
    if (error) { toast.error('Move failed'); return false; }
    setSessions((prev) => {
      const next = prev.map((s) => (s.conversation_id || s.id) === conversationId ? { ...s, project_id: projectId } : s);
      setConversations(groupSessionsIntoConversations(next));
      return next;
    });
    return true;
  }, [user]);

  const togglePin = useCallback(async (conversationId: string, pinned: boolean) => {
    if (!user) return false;
    const { error } = await supabase
      .from('voice_advisor_sessions')
      .update({ pinned })
      .eq('conversation_id', conversationId).eq('user_id', user.id);
    if (error) { toast.error('Pin failed'); return false; }
    setSessions((prev) => {
      const next = prev.map((s) => (s.conversation_id || s.id) === conversationId ? { ...s, pinned } : s);
      setConversations(groupSessionsIntoConversations(next));
      return next;
    });
    return true;
  }, [user]);

  const setArchived = useCallback(async (conversationId: string, archived: boolean) => {
    if (!user) return false;
    const { error } = await supabase
      .from('voice_advisor_sessions')
      .update({ archived })
      .eq('conversation_id', conversationId).eq('user_id', user.id);
    if (error) { toast.error(archived ? 'Archive failed' : 'Unarchive failed'); return false; }
    setSessions((prev) => {
      const next = prev.map((s) => (s.conversation_id || s.id) === conversationId ? { ...s, archived } : s);
      setConversations(groupSessionsIntoConversations(next));
      return next;
    });
    toast.success(archived ? 'Conversation archived' : 'Conversation restored');
    return true;
  }, [user]);

  const activeConversations = useMemo(() => conversations.filter((c) => !c.archived), [conversations]);
  const archivedConversations = useMemo(() => conversations.filter((c) => c.archived), [conversations]);

  return {
    sessions,
    conversations: activeConversations,
    archivedConversations,
    allConversations: conversations,
    loading,
    refreshSessions: loadSessions,
    renameConversation,
    saveMessage,
    deleteConversation,
    deleteAllConversations,
    exportConversation,
    projects,
    createProject,
    renameProject,
    deleteProject,
    setConversationProject,
    togglePin,
    archiveConversation: setArchived,
    isAuthenticated: !!user,
  };
}

