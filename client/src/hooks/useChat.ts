import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface ChatSession {
  id: number;
  userId: number;
  paperId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export function useChat() {
  const queryClient = useQueryClient();

  const createSessionMutation = useMutation({
    mutationFn: async (data: { paperId: string; title: string }) => {
      const response = await fetch("/api/chat/session", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create chat session");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { sessionId: number; content: string }) => {
      const response = await fetch(`/api/chat/session/${data.sessionId}/message`, {
        method: "POST",
        body: JSON.stringify({ content: data.content }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat/session", variables.sessionId, "messages"] 
      });
    },
  });

  const useChatSessions = () => {
    return useQuery({
      queryKey: ["/api/chat/sessions"],
    });
  };

  const useChatMessages = (sessionId: number) => {
    return useQuery({
      queryKey: ["/api/chat/session", sessionId, "messages"],
      enabled: !!sessionId,
    });
  };

  return {
    createSession: createSessionMutation.mutateAsync,
    sendMessage: sendMessageMutation.mutateAsync,
    useChatSessions,
    useChatMessages,
    isCreatingSession: createSessionMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
  };
}