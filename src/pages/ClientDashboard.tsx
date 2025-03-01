
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, FileText } from "lucide-react";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import { useNavigate } from "react-router-dom";
import FileList from "@/components/FileList";
import FileUpload from "@/components/FileUpload";
import { fileService, getFileType } from "@/services/fileService";
import { getMessagesForClient, sendMessage } from "@/services/messageService";

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [messages, setMessages] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Use maybeSingle() instead of single() to handle cases where no client record exists
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        if (clientError) {
          console.error("Error fetching client data:", clientError);
          return;
        }
        
        setClientData(clientData);
        
        if (clientData) {
          const { data: messagesData, error: messagesError } = await supabase
            .from('client_messages')
            .select('*')
            .eq('client_id', clientData.id)
            .order('created_at', { ascending: true });
          
          if (messagesError) {
            console.error("Error fetching messages:", messagesError);
          } else {
            const formattedMessages = messagesData.map(msg => ({
              id: msg.id,
              sender: {
                id: msg.sender_is_user ? 'client' : 'accountant',
                name: msg.sender_is_user ? 'You' : 'Your Accountant',
                avatar: msg.sender_is_user ? '/avatars/1.png' : '/avatars/7.png',
                isAccountant: !msg.sender_is_user
              },
              timestamp: new Date(msg.created_at),
              content: msg.content,
              read: msg.read
            }));
            
            setMessages(formattedMessages);
          }
          
          const { data: filesData, error: filesError } = await supabase
            .from('client_files')
            .select('*')
            .eq('client_id', clientData.id)
            .order('uploaded_at', { ascending: false });
          
          if (filesError) {
            console.error("Error fetching files:", filesError);
          } else {
            const formattedFiles = filesData.map(file => ({
              id: file.id,
              name: file.name,
              type: getFileType(file.name),
              size: file.size,
              uploadedAt: new Date(file.uploaded_at),
              uploadedBy: file.uploaded_by,
              clientId: file.client_id,
              storagePath: file.storage_path
            }));
            setFiles(formattedFiles);
          }
        }
      } catch (error: any) {
        console.error("Error in client dashboard:", error);
        toast({
          title: "Error",
          description: "Failed to load your dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchClientData();
  }, [user]);

  useEffect(() => {
    if (!clientData) return;
    
    const channel = supabase
      .channel('client-messages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_messages',
        filter: `client_id=eq.${clientData.id}`
      }, () => {
        fetchClientMessages(clientData.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientData]);

  const fetchClientMessages = async (clientId: string) => {
    try {
      const messages = await getMessagesForClient(clientId);
      setMessages(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    if (bottomRef.current && activeTab === "messages") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (message: string) => {
    if (!clientData || !message.trim()) return;
    
    try {
      const newMessage = {
        id: `temp-${Date.now()}`,
        sender: {
          id: 'client',
          name: 'You',
          avatar: '/avatars/1.png',
          isAccountant: false
        },
        timestamp: new Date(),
        content: message,
        read: false
      };
      
      setMessages([...messages, newMessage]);
      
      const success = await sendMessage(clientData.id, message, false);
      
      if (!success) {
        throw new Error("Failed to send message");
      }
      
      toast({
        title: "Message sent",
        description: "Your message has been sent to your accountant"
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!clientData) return;
    
    try {
      const uploadedFile = await fileService.uploadFile(file, clientData.id);
      
      if (!uploadedFile) {
        throw new Error("Failed to upload file");
      }
      
      setFiles([uploadedFile, ...files]);
      
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully"
      });
      
      setActiveTab("files");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-400">Account Not Configured</CardTitle>
            <CardDescription className="text-orange-600 dark:text-orange-300">
              Your account is not linked to any client record yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-orange-600 dark:text-orange-300 mb-4">
              It looks like you're signed in with the email <span className="font-semibold">{user?.email}</span>, but 
              this email hasn't been set up as a client in our system yet. Please contact your accountant to complete your account setup.
            </p>
            <div className="flex space-x-4">
              <Button onClick={() => navigate('/')} variant="outline" className="border-orange-500 text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30">
                Back to Home
              </Button>
              <Button 
                onClick={() => {window.location.href = `mailto:support@example.com?subject=Client%20Dashboard%20Access&body=Hello,%0D%0A%0D%0AI'm unable to access the client dashboard. My email is ${user?.email}.%0D%0A%0D%0APlease help me get set up.%0D%0A%0D%0AThank you.`}}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Welcome, {clientData.name}</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Client Overview</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                  <dd className="text-lg">{clientData.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Company</dt>
                  <dd className="text-lg">{clientData.company}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="text-lg">{clientData.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                  <dd className="text-lg">{clientData.phone}</dd>
                </div>
                {clientData.tax_id && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Tax ID</dt>
                    <dd className="text-lg">{clientData.tax_id}</dd>
                  </div>
                )}
                {clientData.address && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Address</dt>
                    <dd className="text-lg">{clientData.address}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Client Since</dt>
                  <dd className="text-lg">
                    {clientData.client_since ? new Date(clientData.client_since).toLocaleDateString() : 'N/A'}
                  </dd>
                </div>
              </dl>
              
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium">Recent Activity</h3>
                <div className="border rounded-md p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {messages.length > 0 ? `${messages.length} Messages` : 'No messages yet'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {files.length > 0 ? `${files.length} Files` : 'No files yet'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Communicate with your accountant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages yet. Send a message to your accountant!
                </div>
              ) : (
                <div className="h-[400px] overflow-y-auto border rounded-md p-4">
                  <MessageList messages={messages} currentUserId="client" />
                  <div ref={bottomRef} />
                </div>
              )}
              <MessageInput
                onSendMessage={handleSendMessage}
                placeholder="Type a message to your accountant..."
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>Documents shared with you and files you've uploaded</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Upload a new file</h3>
                <FileUpload 
                  onFileUpload={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  maxSize={10 * 1024 * 1024} // 10MB
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Your files</h3>
                <FileList 
                  files={files} 
                  emptyMessage="No files have been shared with you yet."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDashboard;
