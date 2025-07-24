import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat, type ChatMessage } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Bot, User, AlertTriangle } from "lucide-react";
import type { Paper } from "@shared/schema";

interface ChatInterfaceProps {
  paper: Paper;
  onClose?: () => void;
}

export function ChatInterface({ paper, onClose }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { createSession, sendMessage, useChatMessages, isSendingMessage } = useChat();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messagesData, isLoading: isLoadingMessages } = useChatMessages(sessionId || 0);
  const messages = messagesData?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (paper && user) {
      initializeChat();
    }
  }, [paper, user]);

  const initializeChat = async () => {
    try {
      const response = await createSession({
        paperId: paper.paperId,
        title: `Chat about: ${paper.title}`,
      });
      setSessionId(response.session.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start chat session",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !sessionId || isSendingMessage) return;

    const content = messageInput.trim();
    setMessageInput("");

    try {
      await sendMessage({ sessionId, content });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      setMessageInput(content); // Restore the message
    }
  };

  if (!user?.hasApiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            OpenAI API Key Required
          </CardTitle>
          <CardDescription>
            To chat with papers, you need to add your OpenAI API key in your account settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Chat with Paper
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {paper.title}
        </CardDescription>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{paper.year}</Badge>
          <Badge variant="outline">{paper.citationCount} citations</Badge>
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm" className="ml-auto">
              Close
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {isLoadingMessages ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Start a conversation about this paper!</p>
                <p className="text-xs mt-1">Ask about methodology, findings, or related work.</p>
              </div>
            ) : (
              messages.map((message: ChatMessage) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {message.role === "user" ? (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isSendingMessage && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Ask about this paper..."
            disabled={isSendingMessage || !sessionId}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!messageInput.trim() || isSendingMessage || !sessionId}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}