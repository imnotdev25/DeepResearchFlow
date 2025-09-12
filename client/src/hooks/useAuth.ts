import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface User {
  id: number;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  hasApiKey: boolean;
  replitSubId: string | null;
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Fetch user from session-based endpoint
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: 'include', // Include session cookies
      });
      
      if (response.status === 401) {
        return null; // User not authenticated
      }
      
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      
      return response.json();
    },
  });

  // Redirect to Replit Auth login
  const login = () => {
    window.location.href = "/api/login";
  };

  // No registration - handled by Replit Auth
  const register = () => {
    window.location.href = "/api/login";
  };

  // Session-based logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/api/logout";
      return { success: true };
    },
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // Update API key using session authentication
  const updateApiKeyMutation = useMutation({
    mutationFn: async (data: { apiKey: string; baseUrl?: string }) => {
      const response = await fetch("/api/auth/api-key", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: 'include', // Use session cookies
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update API key");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout: logoutMutation.mutateAsync,
    updateApiKey: updateApiKeyMutation.mutateAsync,
    isLoginLoading: false, // No longer applicable - redirects immediately
    isRegisterLoading: false, // No longer applicable - redirects immediately
    isLogoutLoading: logoutMutation.isPending,
    isApiKeyLoading: updateApiKeyMutation.isPending,
    refetch,
  };
}

// Remove all JWT token management utilities
// These are no longer needed with session-based auth