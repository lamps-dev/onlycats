
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { Copy, Key, AlertTriangle } from 'lucide-react';

const ApiKeyManagement = ({ onKeyCreated }) => {
  const [keyName, setKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'oc_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    
    if (!keyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }

    setLoading(true);
    try {
      const apiKey = generateApiKey();
      
      await pb.collection('api_keys').create({
        key: apiKey,
        userId: pb.authStore.model.id,
        name: keyName,
        revoked: false,
      }, { $autoCancel: false });

      setNewKey(apiKey);
      setShowKeyModal(true);
      setKeyName('');
      
      if (onKeyCreated) {
        onKeyCreated();
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast.error('Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('API key copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCloseModal = () => {
    setShowKeyModal(false);
    setNewKey(null);
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Generate New API Key</h3>
            <p className="text-sm text-muted-foreground">Create a new API key for your application</p>
          </div>
        </div>

        <form onSubmit={handleCreateKey} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Key Name</label>
            <Input
              type="text"
              placeholder="My App API Key"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="text-gray-900 placeholder:text-gray-500"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Give your API key a descriptive name to identify it later
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Generating...' : 'Generate API Key'}
          </Button>
        </form>
      </Card>

      <Dialog open={showKeyModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
            <DialogDescription>
              Save this key securely. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive mb-1">Important Security Notice</p>
                <p className="text-muted-foreground">
                  This is the only time you will see this API key. Copy it now and store it securely. 
                  If you lose it, you will need to generate a new one.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newKey || ''}
                  readOnly
                  className="font-mono text-sm text-gray-900"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyToClipboard(newKey)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-muted rounded-xl p-4">
              <p className="text-sm font-medium mb-2">Quick Start</p>
              <p className="text-xs text-muted-foreground mb-3">
                Use this key in the Authorization header of your API requests:
              </p>
              <pre className="code-block text-xs">
                <code>Authorization: Bearer {newKey}</code>
              </pre>
            </div>

            <Button onClick={handleCloseModal} className="w-full">
              I have saved my API key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiKeyManagement;
