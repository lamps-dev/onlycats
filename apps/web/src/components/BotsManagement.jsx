import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import supabase from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { toast } from 'sonner';
import { Bot, Copy, AlertTriangle, RotateCw, Trash2, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const authFetch = async (path, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return apiServerClient.fetch(path, { ...options, headers });
};

const BotsManagement = () => {
  const [bots, setBots] = useState([]);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [working, setWorking] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [revealToken, setRevealToken] = useState(null);
  const [revealContext, setRevealContext] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/bots');
      if (!res.ok) throw new Error('Failed to load bots');
      const body = await res.json();
      setBots(body.bots ?? []);
      if (typeof body.limit === 'number') setLimit(body.limit);
    } catch (err) {
      console.error('Load bots failed:', err);
      toast.error('Could not load bots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Bot name is required');
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch('/bots', {
        method: 'POST',
        body: JSON.stringify({ display_name: trimmed, bio: bio.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Failed to create bot');
      setName('');
      setBio('');
      setRevealToken(body.token);
      setRevealContext({ botName: body.bot?.display_name || trimmed, reason: 'created' });
      await load();
    } catch (err) {
      console.error('Create bot failed:', err);
      toast.error(err.message || 'Failed to create bot');
    } finally {
      setCreating(false);
    }
  };

  const handleRotate = async (bot) => {
    if (!window.confirm(`Rotate token for "${bot.display_name}"? The current token will stop working immediately.`)) return;
    setWorking(true);
    try {
      const res = await authFetch(`/bots/${bot.id}/rotate`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Rotate failed');
      setRevealToken(body.token);
      setRevealContext({ botName: bot.display_name, reason: 'rotated' });
      await load();
    } catch (err) {
      console.error('Rotate bot token failed:', err);
      toast.error(err.message || 'Could not rotate token');
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async (bot) => {
    if (!window.confirm(`Delete "${bot.display_name}" and all of its posts? This can't be undone.`)) return;
    setWorking(true);
    try {
      const res = await authFetch(`/bots/${bot.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Delete failed');
      }
      toast.success('Bot deleted');
      await load();
    } catch (err) {
      console.error('Delete bot failed:', err);
      toast.error(err.message || 'Could not delete bot');
    } finally {
      setWorking(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Token copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const closeReveal = () => {
    setRevealToken(null);
    setRevealContext(null);
  };

  const activeBots = bots.length;
  const atLimit = activeBots >= limit;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Bots</h3>
            <p className="text-sm text-muted-foreground">
              Automated accounts that post through the API. Limited to 50 requests/hour each.
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{activeBots} / {limit}</span>
      </div>

      <form onSubmit={handleCreate} className="grid sm:grid-cols-[1fr,auto] gap-3 items-start">
        <div className="space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bot name (e.g. CatFactsBot)"
            maxLength={64}
            disabled={creating || atLimit}
            className="text-gray-900 placeholder:text-gray-500"
          />
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
            maxLength={200}
            disabled={creating || atLimit}
            className="text-sm text-gray-900 placeholder:text-gray-500"
          />
        </div>
        <Button type="submit" disabled={creating || atLimit}>
          {creating ? 'Creating...' : 'Create bot'}
        </Button>
      </form>
      {atLimit && (
        <p className="text-xs text-muted-foreground">
          You&apos;ve reached the max of {limit} bots. Delete one to create another.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading bots…</p>
      ) : bots.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No bots yet. Create one above to get an API token.
        </p>
      ) : (
        <ul className="space-y-3">
          {bots.map((bot) => {
            const activeToken = bot.tokens?.find((t) => !t.revoked);
            return (
              <li key={bot.id}>
                <Card className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/${bot.id}`}
                          className="font-semibold text-sm hover:underline"
                        >
                          {bot.display_name}
                        </Link>
                        <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-blue-500/10 text-blue-600 border border-blue-500/35">
                          BOT
                        </span>
                      </div>
                      {bot.bio && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{bot.bio}</p>
                      )}
                      {activeToken ? (
                        <p className="text-xs font-mono text-muted-foreground mt-1">
                          {activeToken.token_prefix}…  ·  created {formatDistanceToNow(new Date(activeToken.created_at), { addSuffix: true })}
                          {activeToken.last_used && (
                            <>{' '}· last used {formatDistanceToNow(new Date(activeToken.last_used), { addSuffix: true })}</>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-destructive mt-1">No active token — rotate to issue one.</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRotate(bot)}
                        disabled={working}
                        title="Rotate token"
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(bot)}
                        disabled={working}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete bot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Activity className="w-3 h-3" />
                    <span>{bot.requests_last_hour ?? 0} / 50 requests in the last hour</span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!revealToken} onOpenChange={(open) => { if (!open) closeReveal(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Bot token {revealContext?.reason === 'rotated' ? 'rotated' : 'created'}
            </DialogTitle>
            <DialogDescription>
              {revealContext?.botName
                ? `New token for “${revealContext.botName}”. Copy it now — it won't be shown again.`
                : 'Copy this token now — it won\'t be shown again.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Treat this like a password. Store it in an environment variable in your bot library,
                never commit it to source control.
              </p>
            </div>

            <div className="flex gap-2">
              <Input readOnly value={revealToken ?? ''} className="font-mono text-sm text-gray-900" />
              <Button type="button" variant="outline" onClick={() => copy(revealToken)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="bg-muted rounded-xl p-3 text-xs space-y-1">
              <p className="font-medium">Use it as a Bearer token against <code>/bot/v1/*</code>:</p>
              <pre className="whitespace-pre-wrap break-all">{`Authorization: Bearer ${revealToken ?? ''}`}</pre>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={closeReveal} className="w-full">
              I&apos;ve saved the token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BotsManagement;
