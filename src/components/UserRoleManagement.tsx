
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile, UserRole } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const UserRoleManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUsers(data as UserProfile[]);
    } catch (error: any) {
      console.error("Error fetching users:", error.message);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!user) return;
    
    try {
      setUpdatingUserId(userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      
      toast({
        title: "Role updated",
        description: `User role successfully changed to ${newRole}`,
      });
    } catch (error: any) {
      console.error("Error updating role:", error.message);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Find the current user's profile
  const currentUserProfile = users.find(u => u.id === user?.id);
  const isAdmin = currentUserProfile?.role === 'Admin';
  
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            Only administrators can manage user roles.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Role Management</CardTitle>
        <CardDescription>
          Manage user roles and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userProfile) => (
                <TableRow key={userProfile.id}>
                  <TableCell className="font-medium">
                    {userProfile.full_name || userProfile.username || 'Unnamed User'}
                  </TableCell>
                  <TableCell>{userProfile.email}</TableCell>
                  <TableCell>{userProfile.role}</TableCell>
                  <TableCell>
                    {updatingUserId === userProfile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Select
                        defaultValue={userProfile.role}
                        onValueChange={(value: UserRole) => handleRoleChange(userProfile.id, value)}
                        disabled={userProfile.id === user?.id} // Cannot change own role
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Collaborator">Collaborator</SelectItem>
                          <SelectItem value="Client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default UserRoleManagement;
