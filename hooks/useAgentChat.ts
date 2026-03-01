"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ParsedIntent } from "@/lib/ai/types";

const STORAGE_KEY = "tempo.agent.chat.v1";
const MAX_MESSAGES = 100;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  const trimmed = messages.slice(-MAX_MESSAGES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export interface UseAgentChatReturn {
  messages: ChatMessage[];
  isProcessing: boolean;
  sendMessage: (text: string) => Promise<ParsedIntent | null>;
  addAssistantMessage: (content: string, intent?: ParsedIntent) => string;
  updateMessageTxHash: (messageId: string, txHash: string) => void;
  clearHistory: () => void;
}

export function useAgentChat(): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (!initialized.current) {
      setMessages(loadMessages());
      initialized.current = true;
    }
  }, []);

  // Persist to localStorage on changes (skip initial empty state)
  useEffect(() => {
    if (initialized.current && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  const addAssistantMessage = useCallback((content: string, intent?: ParsedIntent): string => {
    const id = generateId();
    const msg: ChatMessage = {
      id,
      role: "assistant",
      content,
      intent,
      timestamp: Date.now(),
    };
    setMessages((prev) => {
      const next = [...prev, msg];
      saveMessages(next);
      return next;
    });
    return id;
  }, []);

  const updateMessageTxHash = useCallback((messageId: string, txHash: string) => {
    setMessages((prev) => {
      const next = prev.map((m) => (m.id === messageId ? { ...m, txHash } : m));
      saveMessages(next);
      return next;
    });
  }, []);

  const sendMessage = useCallback(async (text: string): Promise<ParsedIntent | null> => {
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = (await response.json()) as ParsedIntent;

      // Build assistant message
      let content: string;
      if (data.action === "transfer") {
        content = `Transfer ${data.amount} ${data.token || "pathUSD"} to ${data.recipient}`;
        if (data.memo) content += ` (memo: ${data.memo})`;
      } else if (data.action === "balance") {
        content = "Here are your current balances:";
      } else {
        content = data.error || "I couldn't understand that. Try: \"Send 5 pathUSD to 0x...\"";
      }

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content,
        intent: data,
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        saveMessages(next);
        return next;
      });

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Request failed";
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: errorMsg,
        intent: { action: "unknown", error: errorMsg },
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        saveMessages(next);
        return next;
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    messages,
    isProcessing,
    sendMessage,
    addAssistantMessage,
    updateMessageTxHash,
    clearHistory,
  };
}
