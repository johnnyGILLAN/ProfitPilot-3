
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Bot, MessageCircle, Send, ExternalLink } from "lucide-react";
import { Separator } from "./ui/separator";

interface AIChatWidgetProps {
  prompts: {
    errorHelp: string;
    quickGuides: string[];
    contactHuman: string;
  };
  apiEndpoint: string;
}

export function AIChatWidget({ prompts, apiEndpoint }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [chatInput, setChatInput] = React.useState("");

  const handleSendMessage = () => {
    // Placeholder for actual API call
    console.log("Sending message to AI:", chatInput, "at endpoint:", apiEndpoint);
    // In a real implementation, you would call:
    // fetch(apiEndpoint, { method: 'POST', body: JSON.stringify({ message: chatInput }) });
    setChatInput("");
    // And then handle the response to display in chat history
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          aria-label="Open AI Chat Assistant"
        >
          <Bot className="h-7 w-7" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 mr-4 mb-2 p-0 border-border shadow-2xl rounded-lg" side="top" align="end">
        <div className="flex flex-col h-[400px]">
          <header className="bg-primary text-primary-foreground p-3 rounded-t-lg">
            <h3 className="font-semibold text-md flex items-center gap-2">
              <Bot className="h-5 w-5" /> AI Support Assistant
            </h3>
          </header>

          <div className="flex-grow p-3 space-y-3 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              Hi there! How can I help you today?
            </p>
            
            <Separator />

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1">Try these:</h4>
              <Button variant="outline" size="sm" className="w-full justify-start text-left h-auto py-1.5 mb-1" disabled>
                {prompts.errorHelp}
              </Button>
              {prompts.quickGuides.map((guide, index) => (
                <Button key={index} variant="outline" size="sm" className="w-full justify-start text-left h-auto py-1.5 mb-1" disabled>
                   <ExternalLink className="mr-2 h-3 w-3 opacity-70" /> {guide}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="w-full justify-start text-left h-auto py-1.5" disabled>
                {prompts.contactHuman}
              </Button>
            </div>

            <Separator />
            <p className="text-xs text-muted-foreground">
              Chat functionality and API connection to <code className="text-xs bg-muted p-0.5 rounded">{apiEndpoint}</code> is coming soon.
            </p>
          </div>

          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type your message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && chatInput.trim() && handleSendMessage()}
                disabled // Enable when API is ready
              />
              <Button onClick={handleSendMessage} size="icon" disabled={!chatInput.trim()} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
