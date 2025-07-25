import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, KeyRound, Save, User, Mail, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const { user, updateApiKey, isApiKeyLoading, logout } = useAuth();
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [apiKeyData, setApiKeyData] = useState({
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
  });

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKeyData.apiKey.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid OpenAI API key",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateApiKey({
        apiKey: apiKeyData.apiKey,
        baseUrl: apiKeyData.baseUrl,
      });
      toast({
        title: "Success",
        description: "API key updated successfully!",
      });
      setApiKeyData({ apiKey: "", baseUrl: "https://api.openai.com/v1" });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update API key",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Success",
        description: "Logged out successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <SettingsIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Your account details and information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={user.username} disabled className="bg-slate-50 dark:bg-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user.email} disabled className="bg-slate-50 dark:bg-slate-800" />
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${user.hasApiKey ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className="text-slate-600 dark:text-slate-400">
                  {user.hasApiKey ? 'OpenAI API key configured' : 'OpenAI API key not configured'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <KeyRound className="h-5 w-5" />
                <span>OpenAI API Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure your OpenAI API key for chat functionality. Your key is encrypted and stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateApiKey} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">OpenAI API Key</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="api-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-..."
                      className="pl-10 pr-10"
                      value={apiKeyData.apiKey}
                      onChange={(e) => setApiKeyData({ ...apiKeyData, apiKey: e.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base-url">API Base URL (Optional)</Label>
                  <Input
                    id="base-url"
                    type="url"
                    placeholder="https://api.openai.com/v1"
                    value={apiKeyData.baseUrl}
                    onChange={(e) => setApiKeyData({ ...apiKeyData, baseUrl: e.target.value })}
                  />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    For OpenAI-compatible APIs. Leave default for standard OpenAI.
                  </p>
                </div>

                <Button type="submit" disabled={isApiKeyLoading} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>{isApiKeyLoading ? "Saving..." : "Save API Key"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account and session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <span>Sign Out</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}