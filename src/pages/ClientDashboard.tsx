
import React, { useState, useEffect } from "react";
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

  // Fetch client data
  useEffect(() => {
    const fetchClientData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // First get the client record that matches this user's email
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('email', user.email)
          .single();
        
        if (clientError) {
          console.error("Error fetching client data:", clientError);
          return;
        }
        
        setClientData(clientData);
        
        // Fetch messages for this client
        if (clientData) {
          const { data: messagesData, error: messagesError } = await supabase
            .from('client_messages')
            .select('*')
            .eq('client_id', clientData.id)
            .order('created_at', { ascending: true });
          
          if (messagesError) {
            console.error("Error fetching messages:", messagesError);
          } else {
            // Format messages for the MessageList component
            const formattedMessages = messagesData.map(msg => ({
              id: msg.id,
              sender: {
                id: msg.sender_is_user ? 'accountant' : 'client',
                name: msg.sender_is_user ? 'Accountant' : 'You',
                avatar: msg.sender_is_user ? '/avatars/7.png' : '/avatars/1.png',
                isAccountant: msg.sender_is_user
              },
              timestamp: new Date(msg.created_at),
              content: msg.content,
              read: msg.read
            }));
            
            setMessages(formattedMessages);
          }
          
          // Fetch files for this client
          const { data: filesData, error: filesError } = await supabase
            .from('client_files')
            .select('*')
            .eq('client_id', clientData.id)
            .order('uploaded_at', { ascending: false });
          
          if (filesError) {
            console.error("Error fetching files:", filesError);
          } else {
            setFiles(filesData);
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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current && activeTab === "messages") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (message: string) => {
    if (!clientData || !message.trim()) return;
    
    try {
      // Add optimistic update
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
      
      // Save to database
      const { data, error } = await supabase
        .from('client_messages')
        .insert({
          client_id: clientData.id,
          content: message,
          sender_is_user: false, // false means client is sending
          read: false
        })
        .select();
      
      if (error) throw error;
      
      // Replace temp message with actual database record
      if (data && data.length > 0) {
        setMessages(messages => messages.map(msg => 
          msg.id === newMessage.id ? {
            ...newMessage,
            id: data[0].id
          } : msg
        ));
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
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Your account is not linked to any client record yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please contact your accountant to link your account to your client record.
            </p>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
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
              <CardDescription>Documents shared with you</CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No files have been shared with you yet.
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDashboard;
