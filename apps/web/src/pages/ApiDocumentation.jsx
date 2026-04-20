
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
  const [testEndpoint, setTestEndpoint] = useState('/api/v1/photos');
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
                <h2 className="text-3xl font-bold mb-4">Bots</h2>

                <Card className="p-6 mb-6">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Bots are automated accounts owned by a developer. Each bot has its own profile with a
                    <code className="code-inline mx-1">BOT</code> badge and can post content programmatically.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Key className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">Token Authentication</p>
                        <p className="text-sm text-muted-foreground">Bot tokens use the <code className="code-inline">ocb_</code> prefix</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">50 requests/hour per bot</p>
                        <p className="text-sm text-muted-foreground">Up to 5 bots per user account</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 border">
                    <p className="text-sm font-medium mb-2">Creating a Bot</p>
                    <p className="text-sm text-muted-foreground">
                      Create and manage bots from the Developer Dashboard. Creating a bot returns a one-time token with
                      the prefix <code className="code-inline">ocb_</code>. Store it like a password &mdash; it will never
                      be shown again. Rotate to issue a new one.
                    </p>
                  </div>
                </Card>

                <Card className="p-6 mb-6">
                  <p className="text-sm font-medium mb-2">Authentication Header</p>
                  <pre className="code-block mb-4">
                    <code>Authorization: Bearer ocb_YOUR_BOT_TOKEN</code>
                  </pre>
                  <p className="text-sm font-medium mb-2">Rate Limit Headers</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Every response includes <code className="code-inline">X-RateLimit-Limit</code>,
                    <code className="code-inline mx-1">X-RateLimit-Remaining</code>, and
                    <code className="code-inline">X-RateLimit-Window</code>. When you exceed the limit, the
                    <code className="code-inline mx-1">Retry-After</code> header is returned alongside a
                    <code className="code-inline">429</code>.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Spam rule: posting the same caption twice within one hour returns
                    <code className="code-inline mx-1">429 SPAM_DUPLICATE</code>.
                  </p>
                </Card>

                <h3 className="text-2xl font-bold mb-4">Bot Endpoints</h3>

                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-lg">GET</span>
                      <code className="font-mono text-sm">/bot/v1/me</code>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      Returns the authenticated bot's profile.
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
  "bot": {
    "id": "uuid",
    "display_name": "string",
    "avatar_url": "string | null"
  }
}`}
                        </pre>
                      </TabsContent>

                      <TabsContent value="curl" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`curl -X GET https://onlycats-api.vercel.app/bot/v1/me \\
  -H "Authorization: Bearer ocb_YOUR_TOKEN"`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard('curl -X GET https://onlycats-api.vercel.app/bot/v1/me \\\n  -H "Authorization: Bearer ocb_YOUR_TOKEN"')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="javascript" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`const response = await fetch('https://onlycats-api.vercel.app/bot/v1/me', {
  headers: {
    'Authorization': 'Bearer ocb_YOUR_TOKEN'
  }
});
const { bot } = await response.json();`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard("const response = await fetch('https://onlycats-api.vercel.app/bot/v1/me', {\n  headers: {\n    'Authorization': 'Bearer ocb_YOUR_TOKEN'\n  }\n});\nconst { bot } = await response.json();")}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-secondary/10 text-secondary text-sm font-medium rounded-lg">POST</span>
                      <code className="font-mono text-sm">/bot/v1/uploads/sign</code>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      Request a presigned R2 upload URL. PUT the file to <code className="code-inline">uploadUrl</code>
                      <span> </span>within 5 minutes, then use <code className="code-inline">publicUrl</code> as
                      <code className="code-inline mx-1">file_url</code> in <code className="code-inline">POST /bot/v1/posts</code>.
                    </p>

                    <Tabs defaultValue="request" className="mb-4">
                      <TabsList>
                        <TabsTrigger value="request">Request</TabsTrigger>
                        <TabsTrigger value="response">Response</TabsTrigger>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="errors">Errors</TabsTrigger>
                      </TabsList>

                      <TabsContent value="request" className="mt-4">
                        <p className="text-sm font-medium mb-2">Request Body</p>
                        <pre className="code-block">
{`{
  "contentType": "image/jpeg" | "image/png" | "image/gif"
                | "image/webp" | "video/mp4" | "video/webm",
  "size": 1234567  // optional, max 20 MB
}`}
                        </pre>
                      </TabsContent>

                      <TabsContent value="response" className="mt-4">
                        <p className="text-sm font-medium mb-2">Response Schema</p>
                        <pre className="code-block">
{`{
  "uploadUrl": "string",
  "publicUrl": "string",
  "key": "string"
}`}
                        </pre>
                      </TabsContent>

                      <TabsContent value="curl" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`curl -X POST https://onlycats-api.vercel.app/bot/v1/uploads/sign \\
  -H "Authorization: Bearer ocb_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"contentType":"image/jpeg","size":204800}'`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard('curl -X POST https://onlycats-api.vercel.app/bot/v1/uploads/sign \\\n  -H "Authorization: Bearer ocb_YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"contentType":"image/jpeg","size":204800}\'')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="errors" className="mt-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">400</span>
                            <div>
                              <p className="font-medium"><code className="code-inline">BAD_TYPE</code></p>
                              <p className="text-sm text-muted-foreground">Unsupported content type.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">400</span>
                            <div>
                              <p className="font-medium"><code className="code-inline">TOO_LARGE</code></p>
                              <p className="text-sm text-muted-foreground">File exceeds the 20 MB limit.</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-secondary/10 text-secondary text-sm font-medium rounded-lg">POST</span>
                      <code className="font-mono text-sm">/bot/v1/posts</code>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      Create a post as this bot.
                    </p>

                    <Tabs defaultValue="request" className="mb-4">
                      <TabsList>
                        <TabsTrigger value="request">Request</TabsTrigger>
                        <TabsTrigger value="response">Response</TabsTrigger>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="errors">Errors</TabsTrigger>
                      </TabsList>

                      <TabsContent value="request" className="mt-4">
                        <p className="text-sm font-medium mb-2">Request Body</p>
                        <pre className="code-block">
{`{
  "file_url": "string",         // required
  "caption": "string"           // optional, max 2000 chars
}`}
                        </pre>
                      </TabsContent>

                      <TabsContent value="response" className="mt-4">
                        <p className="text-sm font-medium mb-2">Response Schema (201 Created)</p>
                        <pre className="code-block">
{`{
  "post": {
    "id": "uuid",
    "caption": "string | null",
    "file_url": "string",
    "created_at": "iso8601",
    "like_count": 0,
    "tip_count": 0
  }
}`}
                        </pre>
                      </TabsContent>

                      <TabsContent value="curl" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`curl -X POST https://onlycats-api.vercel.app/bot/v1/posts \\
  -H "Authorization: Bearer ocb_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"file_url":"https://cdn.onlycats.example/cats/abc.jpg","caption":"Morning stretch"}'`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard('curl -X POST https://onlycats-api.vercel.app/bot/v1/posts \\\n  -H "Authorization: Bearer ocb_YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_url":"https://cdn.onlycats.example/cats/abc.jpg","caption":"Morning stretch"}\'')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="errors" className="mt-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">400</span>
                            <div>
                              <p className="font-medium"><code className="code-inline">BAD_REQUEST</code></p>
                              <p className="text-sm text-muted-foreground">Missing or invalid fields.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">429</span>
                            <div>
                              <p className="font-medium"><code className="code-inline">SPAM_DUPLICATE</code></p>
                              <p className="text-sm text-muted-foreground">Same caption posted within the last hour.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">429</span>
                            <div>
                              <p className="font-medium"><code className="code-inline">RATE_LIMITED</code></p>
                              <p className="text-sm text-muted-foreground">Bot exceeded 50 requests/hour. See <code className="code-inline">Retry-After</code>.</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg">DELETE</span>
                      <code className="font-mono text-sm">/bot/v1/posts/:id</code>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      Deletes a post owned by this bot. Returns <code className="code-inline">204 No Content</code> on success.
                    </p>

                    <Tabs defaultValue="curl" className="mb-4">
                      <TabsList>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      </TabsList>

                      <TabsContent value="curl" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`curl -X DELETE https://onlycats-api.vercel.app/bot/v1/posts/POST_ID \\
  -H "Authorization: Bearer ocb_YOUR_TOKEN"`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard('curl -X DELETE https://onlycats-api.vercel.app/bot/v1/posts/POST_ID \\\n  -H "Authorization: Bearer ocb_YOUR_TOKEN"')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="javascript" className="mt-4">
                        <div className="relative">
                          <pre className="code-block">
{`await fetch('https://onlycats-api.vercel.app/bot/v1/posts/' + postId, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer ocb_YOUR_TOKEN'
  }
});`}
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard("await fetch('https://onlycats-api.vercel.app/bot/v1/posts/' + postId, {\n  method: 'DELETE',\n  headers: {\n    'Authorization': 'Bearer ocb_YOUR_TOKEN'\n  }\n});")}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Card>
                </div>

                <h3 className="text-2xl font-bold mt-8 mb-4">Quickstart</h3>
                <Card className="p-6 mb-6">
                  <p className="text-muted-foreground mb-4">
                    Create your first bot post with a single request:
                  </p>
                  <div className="relative">
                    <pre className="code-block">
{`curl -X POST https://onlycats-api.vercel.app/bot/v1/posts \\
  -H "Authorization: Bearer ocb_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"file_url":"https://cdn.onlycats.example/cats/abc.jpg","caption":"Morning stretch"}'`}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard('curl -X POST https://onlycats-api.vercel.app/bot/v1/posts \\\n  -H "Authorization: Bearer ocb_YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"file_url":"https://cdn.onlycats.example/cats/abc.jpg","caption":"Morning stretch"}\'')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>

                <h3 className="text-2xl font-bold mb-4">Python Library</h3>
                <Card className="p-6 mb-6">
                  <p className="text-muted-foreground mb-4">
                    A first-party Python library is available as <code className="code-inline">onlycats-bot</code>.
                  </p>
                  <pre className="code-block mb-4">
                    <code>pip install onlycats-bot</code>
                  </pre>
                  <pre className="code-block">
{`from onlycats_bot import Client

client = Client(token="ocb_YOUR_TOKEN")
client.post(file_path="cat.jpg", caption="Morning stretch")`}
                  </pre>
                </Card>

                <h3 className="text-2xl font-bold mb-4">Auth Errors</h3>
                <Card className="p-6">
                  <p className="text-muted-foreground mb-4">
                    These errors apply to every bot endpoint:
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">401</span>
                      <div>
                        <p className="font-medium"><code className="code-inline">UNAUTHORIZED</code></p>
                        <p className="text-sm text-muted-foreground">Missing token in the <code className="code-inline">Authorization</code> header.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">401</span>
                      <div>
                        <p className="font-medium"><code className="code-inline">INVALID_TOKEN</code></p>
                        <p className="text-sm text-muted-foreground">Token has been revoked or is not recognized.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex-shrink-0">429</span>
                      <div>
                        <p className="font-medium"><code className="code-inline">RATE_LIMITED</code></p>
                        <p className="text-sm text-muted-foreground">Bot exceeded 50 requests/hour. Check <code className="code-inline">Retry-After</code>.</p>
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
                        <option value="/api/v1/photos">GET /api/v1/photos</option>
                        <option value="/api/v1/photos/random">GET /api/v1/photos/random</option>
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
