'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, ImageIcon, X, AlertCircle, CheckCircle, MapPin, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  crowdManagementChatbot,
  type CrowdManagementChatbotOutput,
  type ExtractedGrievanceInfo
} from '@/ai/flows/crowd-management-chatbot.client';
import { nanoid } from 'nanoid';
import { type UserProfile } from "@/hooks/use-user-profile";
import { createGrievance } from '@/services/grievance-service';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';

interface ChatMessage {
    id: string;
    role: 'user' | 'bot';
    text: string;
    type?: 'standard' | 'medical-emergency' | 'missing-person-upload' | 'missing-person-success' | 'map-route';
    photoDataUri?: string | null;
    extractedData?: ExtractedGrievanceInfo;
    reportSubmitted?: boolean;
}

interface ChatbotProps {
    user: UserProfile | null;
    handleNavigation: (action: string, tab?: string, details?: any) => void;
}

export default function Chatbot({ user, handleNavigation }: ChatbotProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Active missing person report details for inline form filling
    const [activeReportId, setActiveReportId] = useState<string | null>(null);
    const [inlinePhoto, setInlinePhoto] = useState<string | null>(null);
    const [inlineName, setInlineName] = useState('');
    const [inlineLastSeen, setInlineLastSeen] = useState('');
    const [inlineDetails, setInlineDetails] = useState('');
    const [submittingGrievance, setSubmittingGrievance] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        setMessages([{ 
            id: nanoid(), 
            role: 'bot', 
            text: "Hello! I am your Drishti Assistant. I can help you with medical emergencies, file missing person alerts, or highlight locations on the venue map. How can I assist you today?" 
        }]);
    }, []);

    // File selection handler for inline missing person photo upload
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setInlinePhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Submits the completed inline missing person report to Firestore
    const handleInlineMissingReportSubmit = async (msgId: string, extractedData: ExtractedGrievanceInfo) => {
        if (!user) return;
        setSubmittingGrievance(true);

        const name = inlineName || extractedData.name || "Unknown Person";
        const lastSeen = inlineLastSeen || extractedData.location || "Venue Area";
        const details = inlineDetails || extractedData.details || "No additional description provided.";

        try {
            // 1. Save to Grievances
            const grievanceResult = await createGrievance({
                type: 'Missing Person',
                submittedBy: user.email,
                email: user.email,
                personName: name,
                lastSeen: lastSeen,
                details: details,
                photoDataUri: inlinePhoto || undefined,
            });

            if (grievanceResult.success) {
                // 2. Save Notification to Firestore
                await addDoc(collection(db, "notifications"), {
                    userEmail: user.email,
                    message: `👥 Report Registered: Missing person report for "${name}" has been logged. Security staff alerted immediately.`,
                    createdAt: serverTimestamp(),
                    read: false,
                });

                // Update the chat message to show success
                setMessages(prev => prev.map(msg => {
                    if (msg.id === msgId) {
                        return {
                            ...msg,
                            type: 'missing-person-success',
                            text: `✅ Missing Person Alert filed successfully for **${name}**! Security has been notified.`,
                            reportSubmitted: true,
                        };
                    }
                    return msg;
                }));

                // Reset inline states
                setInlinePhoto(null);
                setInlineName('');
                setInlineLastSeen('');
                setInlineDetails('');
                setActiveReportId(null);
            }
        } catch (error) {
            console.error("Failed to submit inline missing report:", error);
        } finally {
            setSubmittingGrievance(false);
        }
    };

    // Submits an automatic medical emergency ticket to Firestore
    const logAutomaticMedicalEmergency = async (location: string, details: string) => {
        if (!user) return;
        try {
            // 1. Create Grievance
            const result = await createGrievance({
                type: 'Medical Attention',
                submittedBy: user.email,
                email: user.email,
                location: location || "Event Venue",
                details: details || "Immediate medical assistance requested via assistant chat.",
            });

            if (result.success) {
                // 2. Create Notification
                await addDoc(collection(db, "notifications"), {
                    userEmail: user.email,
                    message: `🚨 Emergency Dispatched: Medical team is responding to your report at ${location || 'your location'}.`,
                    createdAt: serverTimestamp(),
                    read: false,
                });
            }
        } catch (error) {
            console.error("Failed to log auto medical emergency:", error);
        }
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = { id: nanoid(), role: 'user', text: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const result: CrowdManagementChatbotOutput = await crowdManagementChatbot({ 
                query: input,
                history: messages.map(m => ({ id: m.id, role: m.role, text: m.text })),
            });

            const botMsgId = nanoid();
            let botMessage: ChatMessage = { id: botMsgId, role: 'bot', text: result.response };

            // Handle Medical Emergency Triaging
            if (result.category === 'MEDICAL_EMERGENCY') {
                botMessage.type = 'medical-emergency';
                const extractedLoc = result.extractedInfo?.location || "Current Area";
                const extractedDetails = result.extractedInfo?.details || input;
                await logAutomaticMedicalEmergency(extractedLoc, extractedDetails);
            }

            // Handle Missing Person Guided Triage
            if (result.category === 'MISSING_PERSON') {
                botMessage.type = 'missing-person-upload';
                botMessage.extractedData = result.extractedInfo;
                setActiveReportId(botMsgId);
                
                // Prefill fields from LLM extraction
                if (result.extractedInfo?.name) setInlineName(result.extractedInfo.name);
                if (result.extractedInfo?.location) setInlineLastSeen(result.extractedInfo.location);
                if (result.extractedInfo?.details) setInlineDetails(result.extractedInfo.details);
            }

            // Handle Map Directions & Routing Highlights
            if (result.category === 'MAP_DIRECTIONS' && result.extractedInfo?.poi) {
                botMessage.type = 'map-route';
                botMessage.extractedData = result.extractedInfo;
                
                // Highlight the POI immediately
                setTimeout(() => {
                    handleNavigation('SHOW_USER_MAP', undefined, { highlightPoi: result.extractedInfo?.poi });
                }, 2000);
            }

            setMessages(prev => [...prev, botMessage]);

            // Handle standard redirect actions if any and not handled inline
            if (result.action && result.category !== 'MISSING_PERSON' && result.category !== 'MAP_DIRECTIONS') {
                switch (result.action) {
                    case 'NAVIGATE_TO_EMERGENCY_FORM':
                        setTimeout(() => handleNavigation('user/dashboard', 'medical'), 2500);
                        break;
                }
            }

        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: ChatMessage = { id: nanoid(), role: 'bot', text: "I ran into a small issue connecting to the AI brain. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <CardHeader className="px-1 pt-4">
                <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <Bot className="h-6 w-6" /> Drishti Assistant
                </CardTitle>
                <CardDescription>Ask for emergency help, report a missing person inline, or find hydration stations on the venue map.</CardDescription>
            </CardHeader>
            <CardContent className="px-1">
                <div className="h-[480px] flex flex-col">
                    <div className="flex-grow space-y-4 overflow-y-auto p-4 border rounded-3xl bg-muted/20 backdrop-blur-sm shadow-inner">
                        {messages.map((msg) => (
                            <div key={msg.id} className={cn("flex items-end gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'bot' && <Avatar className="w-8 h-8"><AvatarFallback className="bg-purple-100 text-purple-700"><Bot className="h-4 w-4" /></AvatarFallback></Avatar>}
                                
                                <div className="max-w-md flex flex-col gap-2">
                                    <div className={cn(
                                        "rounded-2xl px-4 py-2.5 whitespace-pre-wrap shadow-sm text-sm leading-relaxed",
                                         msg.role === 'user' 
                                            ? 'bg-primary text-primary-foreground rounded-br-none' 
                                            : 'bg-white dark:bg-slate-900 border rounded-bl-none text-foreground'
                                    )}>
                                        {msg.text}
                                    </div>

                                    {/* Inline Medical Emergency Alert */}
                                    {msg.type === 'medical-emergency' && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-800 dark:text-red-300">
                                            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                            <span>Emergency grievance logged. Medical responders are deploying.</span>
                                        </div>
                                    )}

                                    {/* Inline Map Highlight Notification */}
                                    {msg.type === 'map-route' && (
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                                            <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                            <span>Map focused on nearest <b>{msg.extractedData?.poi}</b> POI.</span>
                                        </div>
                                    )}

                                    {/* Guided Missing Person Inline Photo Uploader & Form */}
                                    {msg.type === 'missing-person-upload' && !msg.reportSubmitted && (
                                        <div className="p-4 bg-white dark:bg-slate-900 border border-yellow-200 dark:border-yellow-950 rounded-xl shadow-md space-y-4">
                                            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">📝 Missing Person Guided Report</p>
                                            
                                            <div className="grid gap-3 text-xs">
                                                <div className="space-y-1">
                                                    <Label htmlFor="inline-name">Person's Name</Label>
                                                    <Input 
                                                        id="inline-name" 
                                                        value={inlineName} 
                                                        onChange={e => setInlineName(e.target.value)} 
                                                        placeholder="Enter name"
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="inline-lastseen">Last Seen Location</Label>
                                                    <Input 
                                                        id="inline-lastseen" 
                                                        value={inlineLastSeen} 
                                                        onChange={e => setInlineLastSeen(e.target.value)} 
                                                        placeholder="Enter last seen location"
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="inline-desc">Description (clothing/details)</Label>
                                                    <Textarea 
                                                        id="inline-desc" 
                                                        value={inlineDetails} 
                                                        onChange={e => setInlineDetails(e.target.value)} 
                                                        placeholder="e.g. wearing a black hoodie"
                                                        className="min-h-[50px] text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label>Upload Photo</Label>
                                                    {inlinePhoto ? (
                                                        <div className="relative w-20 h-20 border rounded-lg overflow-hidden">
                                                            <Image src={inlinePhoto} alt="Upload preview" layout="fill" objectFit="cover" />
                                                            <Button 
                                                                size="icon" 
                                                                variant="destructive" 
                                                                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full" 
                                                                onClick={() => { setInlinePhoto(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="w-full text-xs h-8 flex justify-center items-center gap-1.5"
                                                        >
                                                            <ImageIcon className="h-3.5 w-3.5" /> Upload Photo
                                                        </Button>
                                                    )}
                                                    <Input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                                                </div>

                                                <Button 
                                                    onClick={() => handleInlineMissingReportSubmit(msg.id, msg.extractedData || {})}
                                                    disabled={submittingGrievance} 
                                                    className="w-full text-xs h-9 bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                                                >
                                                    {submittingGrievance ? (
                                                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Submitting...</>
                                                    ) : (
                                                        "Submit Missing Report"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Inline Missing Person Success */}
                                    {msg.type === 'missing-person-success' && (
                                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-955/20 border border-green-200 dark:border-green-900 rounded-xl text-xs text-green-800 dark:text-green-300">
                                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            <span>Missing person alert has been broadcast to security guards.</span>
                                        </div>
                                    )}
                                </div>

                                {msg.role === 'user' && <Avatar className="w-8 h-8"><AvatarFallback className="bg-slate-200 text-slate-800"><User className="h-4 w-4" /></AvatarFallback></Avatar>}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-end gap-3 justify-start">
                                <Avatar className="w-8 h-8"><AvatarFallback className="bg-purple-100 text-purple-700"><Bot className="h-4 w-4" /></AvatarFallback></Avatar>
                                <div className="max-w-xs rounded-2xl px-4 py-2.5 shadow-sm bg-white dark:bg-slate-900 border rounded-bl-none">
                                    <Skeleton className="h-4 w-10" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleChatSubmit} className="flex items-center gap-2 pt-4">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your emergency, grievance or map request..."
                            disabled={loading || activeReportId !== null}
                            className="rounded-full px-4 border shadow-sm"
                        />
                        <Button type="submit" disabled={loading || activeReportId !== null} size="icon" className="rounded-full h-10 w-10 flex-shrink-0">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </CardContent>
        </div>
    );
}
