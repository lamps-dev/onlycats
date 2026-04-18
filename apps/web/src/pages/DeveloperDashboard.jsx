
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ApiKeyManagement from '@/components/ApiKeyManagement.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Key, Trash2, Calendar, Activity, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DeveloperDashboard = () => {
  const { currentUser } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [usageStats, setUsageStats] = useState({ total: 0, byEndpoint: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiKeys();
    fetchUsageStats();
  }, []);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const keys = await pb.collection('api_keys').getList(1, 50, {
        filter: `userId="${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false,
      });
      setApiKeys(keys.items);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const keys = await pb.collection('api_keys').getFullList({
        filter: `userId="${currentUser.id}"`,
        $autoCancel: false,
      });

      if (keys.length === 0) {
        setUsageStats({ total: 0, byEndpoint: {} });
        return;
      }

      const keyIds = keys.map(k => k.id);
      const filterStr = keyIds.map(id => `apiKeyId="${id}"`).join(' || ');

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];

      const usage = await pb.collection('api_usage').getFullList({
        filter: `(${filterStr}) && created >= "${firstDayStr}"`,
        $autoCancel: false,
      });

      const byEndpoint = {};
      usage.forEach(record => {
        byEndpoint[record.endpoint] = (byEndpoint[record.endpoint] || 0) + 1;
      });

      setUsageStats({
        total: usage.length,
        byEndpoint,
      });
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await pb.collection('api_keys').update(keyId, {
        revoked: true,
      }, { $autoCancel: false });

      toast.success('API key revoked');
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  return (
    <>
      <Helmet>
        <title>Developer Dashboard - OnlyCats</title>
        <meta name="description" content="Manage your OnlyCats API keys and view usage statistics." />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{letterSpacing: '-0.02em'}}>
                Developer Dashboard
              </h1>
              <p className="text-lg text-muted-foreground">
                Manage your API keys and monitor usage statistics
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Total Requests</span>
                </div>
                <p className="text-3xl font-bold">{usageStats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="w-5 h-5 text-secondary" />
                  <span className="text-sm font-medium text-muted-foreground">Active Keys</span>
                </div>
                <p className="text-3xl font-bold">{apiKeys.filter(k => !k.revoked).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Out of {apiKeys.length} total</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium text-muted-foreground">Rate Limit</span>
                </div>
                <p className="text-3xl font-bold">100</p>
                <p className="text-xs text-muted-foreground mt-1">Requests per hour</p>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">API Keys</h2>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <Card key={i} className="p-6 animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                      </Card>
                    ))}
                  </div>
                ) : apiKeys.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No API keys yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Generate your first key to get started</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {apiKeys.map((key) => (
                      <Card key={key.id} className={`p-6 ${key.revoked ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{key.name}</h3>
                              {key.revoked && (
                                <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">
                                  Revoked
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                              {key.key.substring(0, 12)}...{key.key.substring(key.key.length - 4)}
                            </p>
                          </div>
                          {!key.revoked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeKey(key.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Created {format(new Date(key.created), 'MMM d, yyyy')}</span>
                          </div>
                          {key.last_used && (
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              <span>Last used {format(new Date(key.last_used), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Generate New Key</h2>
                <ApiKeyManagement onKeyCreated={fetchApiKeys} />
              </div>
            </div>

            {Object.keys(usageStats.byEndpoint).length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Usage by Endpoint</h2>
                <Card className="p-6">
                  <div className="space-y-3">
                    {Object.entries(usageStats.byEndpoint).map(([endpoint, count]) => (
                      <div key={endpoint} className="flex items-center justify-between">
                        <span className="text-sm font-mono">{endpoint}</span>
                        <span className="text-sm font-semibold">{count} requests</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default DeveloperDashboard;
