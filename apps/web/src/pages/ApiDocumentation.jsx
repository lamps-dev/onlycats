
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { Code, Key, Zap, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

const ApiDocumentation = () => {
  const [apiKey, setApiKey] = useState('');
  const [testEndpoint, setTestEndpoint] = useState('/v1/photos');
  const [testResponse, setTestResponse] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleTestEndpoint = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }

    setTestLoading(true);
    setTestResponse(null);

    try {
      const response = await apiServerClient.fetch(testEndpoint, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      setTestResponse({
        status: response.status,
        data: data,
      });
    } catch (error) {
      setTestResponse({
        status: 500,
        error: error.message,
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>API Documentation - OnlyCats</title>
        <meta name="description" content="Complete API documentation for OnlyCats developer platform. Learn how to integrate cat content into your applications." />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{letterSpacing: '-0.02em'}}>
                API Documentation
              </h1>
              <p className="text-lg text-muted-foreground">
                Integrate OnlyCats cat content into your applications with our developer API
              </p>
            </div>

            <div className="space-y-12">
              <section>
                <h2 className="text-3xl font-bold mb-4">Overview</h2>
                <Card className="p-6">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    The OnlyCats API provides programmatic access to our collection of cat content. 
                    Use it to fetch cat photos, creator information, and engagement metrics for your applications.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">Fast & Reliable</p>
                        <p className="text-sm text-muted-foreground">Low latency responses with 99.9% uptime</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Key className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">Secure Authentication</p>
                        <p className="text-sm text-muted-foreground">API key-based authentication</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </section>

              <section>
                <h2 className="text-3xl font-bold mb-4">Authentication</h2>
                <Card className="p-6">
                  <p className="text-muted-foreground mb-4">
                    All API requests require authentication using an API key. Include your API key in the 
                    <code className="code-inline mx-1">Authorization</code> header using the Bearer token format.
                  </p>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Header Format</p>
                    <pre className="code-block">
                      <code>Authorization: Bearer YOUR_API_KEY</code>
                    </pre>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 border">
                    <p className="text-sm font-medium mb-2">Getting an API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Sign up for a free account and generate your API key from the Developer Dashboard. 
                      Each key has a rate limit of 100 requests per hour.
                    </p>
                  </div>
                </Card>
              </section>

              <section>
                <h2 className="text-3xl font-bold mb-4">Endpoints</h2>
                
                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-lg">GET</span>
                      <code className="font-mono text-sm">/api/v1/photos</code>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">
                      Retrieve all cat photos with creator information and engagement metrics.
                    </p>

                    <Tabs defaultValue="response" className="mb-4">
                      <TabsList>
                        <TabsTrigger value="response">Response</TabsTrigger>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      </TabsList>

                      <TabsContent value="response" className="mt-4">
                        <p className="text-sm font-medium mb-2">Response Schema</p>
                        <pre className="code-block">
{`[
  {
    "id": "abc123xyz456789",
    "photoUrl": "https://...",
    "caption": "My adorable cat!",
    "likeCount": 47,
    "tipCount": 12,
    "creator": {
      "id": "creator123",
      "name": "Maya Chen",
      "avatar": "https://..."
    }
  }
]`}
                        </pre>
                      </TabsContent>

                      <TabsContent value="curl" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`curl -X GET https://your-domain.com/api/v1/photos \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard('curl -X GET https://your-domain.com/api/v1/photos \\\n  -H "Authorization: Bearer YOUR_API_KEY"')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="javascript" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`const response = await fetch('/api/v1/photos', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const photos = await response.json();`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard("const response = await fetch('/api/v1/photos', {\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY'\n  }\n});\nconst photos = await response.json();")}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-lg">GET</span>
                      <code className="font-mono text-sm">/api/v1/photos/random</code>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">
                      Get a single random cat photo. Perfect for displaying random cat content in your app.
                    </p>

                    <Tabs defaultValue="response" className="mb-4">
                      <TabsList>
                        <TabsTrigger value="response">Response</TabsTrigger>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      </TabsList>

                      <TabsContent value="response" className="mt-4">
                        <p className="text-sm font-medium mb-2">Response Schema</p>
                        <pre className="code-block">
{`{
  "id": "abc123xyz456789",
  "photoUrl": "https://...",
  "caption": "My adorable cat!",
  "likeCount": 47,
  "tipCount": 12,
  "creator": {
    "id": "creator123",
    "name": "Maya Chen",
    "avatar": "https://..."
  }
}`}
                        </pre>
                      </TabsContent>

                      <TabsContent value="curl" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`curl -X GET https://your-domain.com/api/v1/photos/random \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard('curl -X GET https://your-domain.com/api/v1/photos/random \\\n  -H "Authorization: Bearer YOUR_API_KEY"')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="javascript" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`const response = await fetch('/api/v1/photos/random', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const photo = await response.json();`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard("const response = await fetch('/api/v1/photos/random', {\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY'\n  }\n});\nconst photo = await response.json();")}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Card>
                </div>
              </section>

              <section>
                <h2 className="text-3xl font-bold mb-4">Rate Limiting</h2>
                <Card className="p-6">
                  <p className="text-muted-foreground mb-4">
                    API requests are rate limited to ensure fair usage and system stability.
                  </p>
                  <div className="bg-muted/50 rounded-xl p-4 border">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">100 requests per hour per API key</p>
                        <p className="text-sm text-muted-foreground">
                          Rate limits reset every hour. If you exceed the limit, you will receive a 429 status code.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </section>

              <section>
                <h2 className="text-3xl font-bold mb-4">Error Codes</h2>
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-lg flex-shrink-0">200</span>
                      <div>
                        <p className="font-medium">Success</p>
                        <p className="text-sm text-muted-foreground">Request completed successfully</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">401</span>
                      <div>
                        <p className="font-medium">Unauthorized</p>
                        <p className="text-sm text-muted-foreground">Invalid or missing API key</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">429</span>
                      <div>
                        <p className="font-medium">Rate Limit Exceeded</p>
                        <p className="text-sm text-muted-foreground">Too many requests. Wait for rate limit to reset.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">500</span>
                      <div>
                        <p className="font-medium">Server Error</p>
                        <p className="text-sm text-muted-foreground">Internal server error. Try again later.</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </section>

              <section>
                <h2 className="text-3xl font-bold mb-4">API Explorer</h2>
                <Card className="p-6">
                  <p className="text-muted-foreground mb-4">
                    Test the API endpoints directly from your browser. Enter your API key and select an endpoint to try it out.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">API Key</label>
                      <Input
                        type="text"
                        placeholder="Enter your API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="font-mono text-sm text-gray-900 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Endpoint</label>
                      <select
                        value={testEndpoint}
                        onChange={(e) => setTestEndpoint(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-gray-900"
                      >
                        <option value="/v1/photos">GET /api/v1/photos</option>
                        <option value="/v1/photos/random">GET /api/v1/photos/random</option>
                      </select>
                    </div>

                    <Button
                      onClick={handleTestEndpoint}
                      disabled={testLoading}
                      className="w-full"
                    >
                      {testLoading ? 'Testing...' : 'Test Endpoint'}
                    </Button>

                    {testResponse && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">Response</span>
                          {testResponse.status === 200 ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              {testResponse.status}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="w-3 h-3" />
                              {testResponse.status}
                            </span>
                          )}
                        </div>
                        <pre className="code-block max-h-96 overflow-auto">
                          <code>{JSON.stringify(testResponse.data || testResponse.error, null, 2)}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default ApiDocumentation;
