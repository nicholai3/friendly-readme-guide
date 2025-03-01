
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    
    const fetchUserProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Error fetching user profile:", error);
        } else {
          setUserProfile(data as UserProfile);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    
    if (user) {
      fetchUserProfile();
    }
  }, [user, loading, navigate]);

  if (loading || profileLoading) {
    return (
      <div className="container mx-auto px-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in the useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;
