import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Message } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, LogIn } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="flex-1" />
      <Skeleton className="h-20" />
    </div>
  );
}

export default function Chat({ projectId }: { projectId: number }) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: messages, isLoading, error } = useQuery<Message[]>({
    queryKey: ["/api/project", projectId, "messages"],
  });

  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res = await apiRequest("POST", `/api/project/${projectId}/messages`, {
        sender: "client",
        text: messageText,
        createdAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "unread"] });
      setText("");
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось отправить сообщение", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (user && messages && messages.length > 0) {
      apiRequest("POST", `/api/project/${projectId}/messages/read`, {}).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/project", projectId, "unread"] });
      });
    }
  }, [messages, user]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return <ChatSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 h-full flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground" data-testid="text-error">Не удалось загрузить сообщения</p>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry">Попробовать снова</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      <h1 className="text-2xl font-semibold shrink-0" data-testid="text-chat-title">Чат</h1>

      <Card className="flex-1 flex flex-col min-h-0" data-testid="card-chat">
        <CardHeader className="pb-2 shrink-0">
          <CardTitle className="text-base">Переписка с компанией</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 pb-4">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-3 py-2">
              {(!messages || messages.length === 0) && (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-messages">
                  Сообщений пока нет
                </p>
              )}
              {messages?.map((msg) => {
                const isClient = msg.sender === "client";
                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isClient ? "justify-end" : "justify-start")}
                    data-testid={`msg-${msg.id}`}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-md px-3 py-2 text-sm",
                        isClient
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap" data-testid={`text-msg-${msg.id}`}>{msg.text}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          isClient ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                        data-testid={`text-msg-time-${msg.id}`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {user ? (
            <div className="flex gap-2 pt-3 border-t mt-2 shrink-0">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите сообщение..."
                className="resize-none text-sm flex-1"
                rows={2}
                data-testid="input-message"
              />
              <Button
                onClick={handleSend}
                disabled={!text.trim() || sendMutation.isPending}
                size="icon"
                data-testid="button-send-message"
                aria-label="Отправить сообщение"
              >
                <Send />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-3 border-t mt-2 shrink-0 text-sm text-muted-foreground" data-testid="text-chat-login-hint">
              <LogIn className="h-4 w-4" />
              <span>Войдите, чтобы отправлять сообщения</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
