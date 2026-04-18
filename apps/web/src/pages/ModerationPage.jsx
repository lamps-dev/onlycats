import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import supabase from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Gavel, Search, AlertCircle, Ban, Clock, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';

const DURATION_PRESETS = [
  { hours: 1,     label: '1 hour'  },
  { hours: 24,    label: '1 day'   },
  { hours: 24*7,  label: '7 days'  },
  { hours: 24*30, label: '30 days' },
];

const authFetch = async (path, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in');
  return apiServerClient.fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
};

const SanctionIssueDialog = ({ open, onOpenChange, target, isOwner, onIssued }) => {
  const [kind, setKind]                 = useState('timeout');
  const [durationHours, setDuration]    = useState(24);
  const [permanent, setPermanent]       = useState(false);
  const [reason, setReason]             = useState('');
  const [ips, setIps]                   = useState([]);
  const [selectedIps, setSelectedIps]   = useState(new Set());
  const [loadingIps, setLoadingIps]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    setKind('timeout'); setDuration(24); setPermanent(false); setReason('');
    setSelectedIps(new Set());
    (async () => {
      setLoadingIps(true);
      try {
        const res = await authFetch(`/moderation/users/${target.id}/ips`);
        if (!res.ok) throw new Error('Failed to load IPs');
        const body = await res.json();
        if (!cancelled) setIps(body.ips || []);
      } catch (err) {
        if (!cancelled) { setIps([]); console.warn(err); }
      } finally {
        if (!cancelled) setLoadingIps(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, target]);

  const toggleIp = (ip) => {
    setSelectedIps((prev) => {
      const next = new Set(prev);
      if (next.has(ip)) next.delete(ip); else next.add(ip);
      return next;
    });
  };

  const submit = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/moderation/sanctions/user', {
        method: 'POST',
        body: JSON.stringify({
          userId: target.id,
          kind,
          permanent,
          durationHours: permanent ? null : Number(durationHours),
          reason: reason.trim() || null,
          alsoIps: [...selectedIps],
        }),
      });
      if (!res.ok) {
        let msg = `Failed (${res.status})`;
        try { const b = await res.json(); if (b?.error) msg = b.error; } catch (_) {}
        throw new Error(msg);
      }
      toast.success(`${permanent ? 'Permanent ' : ''}${kind === 'ban' ? 'ban' : 'timeout'} issued`);
      onIssued?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || 'Failed to issue sanction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue sanction</DialogTitle>
          <DialogDescription>
            Target: <strong>{target?.display_name || target?.id}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="timeout">Timeout — can't post</SelectItem>
                <SelectItem value="ban">Ban — blocked from the app</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isOwner && (
            <div className="flex items-center justify-between py-2 border-y">
              <div>
                <p className="font-medium text-sm">Permanent</p>
                <p className="text-xs text-muted-foreground">No expiry. No appeal. Owner only.</p>
              </div>
              <Switch checked={permanent} onCheckedChange={setPermanent} />
            </div>
          )}

          {!permanent && (
            <div>
              <Label>Duration</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DURATION_PRESETS.map((p) => (
                  <Button
                    key={p.hours}
                    type="button"
                    size="sm"
                    variant={Number(durationHours) === p.hours ? 'default' : 'outline'}
                    onClick={() => setDuration(p.hours)}
                  >
                    {p.label}
                  </Button>
                ))}
                <Input
                  type="number"
                  min="1"
                  className="w-28"
                  value={durationHours}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="hours"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Shown to the user"
            />
          </div>

          <div>
            <Label>Also ban these IPs</Label>
            {loadingIps ? (
              <p className="text-sm text-muted-foreground mt-2">Loading IPs...</p>
            ) : ips.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No IPs captured for this user yet.</p>
            ) : (
              <div className="space-y-1 mt-2 max-h-40 overflow-y-auto">
                {ips.map((row) => (
                  <label key={row.ip} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedIps.has(row.ip)} onCheckedChange={() => toggleIp(row.ip)} />
                    <span className="font-mono">{row.ip}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      seen {formatDistanceToNowStrict(new Date(row.last_seen))} ago
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>
            {submitting ? 'Issuing...' : 'Issue sanction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const IpBanCard = ({ isOwner, onIssued }) => {
  const [ip, setIp] = useState('');
  const [hours, setHours] = useState(24);
  const [permanent, setPermanent] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!ip.trim()) return;
    setBusy(true);
    try {
      const res = await authFetch('/moderation/sanctions/ip', {
        method: 'POST',
        body: JSON.stringify({
          ip: ip.trim(),
          permanent,
          durationHours: permanent ? null : Number(hours),
          reason: reason.trim() || null,
        }),
      });
      if (!res.ok) {
        let msg = `Failed (${res.status})`;
        try { const b = await res.json(); if (b?.error) msg = b.error; } catch (_) {}
        throw new Error(msg);
      }
      toast.success(`${permanent ? 'Permanent ' : ''}IP ban issued`);
      setIp(''); setReason(''); setPermanent(false); setHours(24);
      onIssued?.();
    } catch (err) {
      toast.error(err.message || 'Failed to issue IP ban');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-1">Ban an IP address</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Applies to every request from this IP, regardless of which user sent it.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2">
          <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="e.g. 203.0.113.42" />
          {!permanent && (
            <Input
              type="number"
              min="1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="hours"
              className="w-28"
            />
          )}
        </div>
        {isOwner && (
          <label className="flex items-center justify-between gap-2 py-2 border-y">
            <span className="text-sm">
              <strong>Permanent</strong> <span className="text-muted-foreground">(owner only, no appeal)</span>
            </span>
            <Switch checked={permanent} onCheckedChange={setPermanent} />
          </label>
        )}
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (optional)" />
        <Button type="submit" variant="destructive" disabled={busy || !ip.trim()}>
          <Ban className="w-4 h-4 mr-2" />
          {busy ? 'Issuing...' : 'Issue IP ban'}
        </Button>
      </form>
    </Card>
  );
};

const SanctionRow = ({ sanction, type, canLift, onLift }) => {
  const untilLabel = sanction.permanent
    ? 'Permanent'
    : sanction.expires_at
      ? `Until ${new Date(sanction.expires_at).toLocaleString()}`
      : '—';
  const KindIcon = sanction.kind === 'ban' || type === 'ip' ? Ban : Clock;
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="mt-0.5">
        <KindIcon className={`w-5 h-5 ${sanction.permanent ? 'text-destructive' : 'text-amber-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        {type === 'user' ? (
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6 rounded-md">
              <AvatarImage src={sanction.target?.avatar_url} alt="" />
              <AvatarFallback className="rounded-md text-xs">
                {sanction.target?.display_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium truncate">
              {sanction.target?.display_name || sanction.user_id}
            </p>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted uppercase">{sanction.kind}</span>
          </div>
        ) : (
          <p className="font-mono">{sanction.ip}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {untilLabel}{sanction.reason ? ` — ${sanction.reason}` : ''}
        </p>
      </div>
      {canLift && (
        <Button size="sm" variant="outline" onClick={() => onLift(sanction, type)}>
          <Undo2 className="w-4 h-4 mr-1" />
          Lift
        </Button>
      )}
    </li>
  );
};

const ModerationPage = () => {
  const { currentUser, isAuthenticated, isModerator, isOwner } = useAuth();

  const [users, setUsers]       = useState([]);
  const [search, setSearch]     = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError]       = useState(null);

  const [sanctions, setSanctions] = useState({ users: [], ips: [] });
  const [loadingSanctions, setLoadingSanctions] = useState(true);

  const [issueTarget, setIssueTarget] = useState(null);

  const loadSanctions = useCallback(async () => {
    setLoadingSanctions(true);
    try {
      const res = await authFetch('/moderation/sanctions?active=true');
      if (!res.ok) throw new Error('Failed to load sanctions');
      const body = await res.json();
      setSanctions({ users: body.users || [], ips: body.ips || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSanctions(false);
    }
  }, []);

  const searchUsers = useCallback(async (q = '') => {
    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      const res = await authFetch(`/moderation/users${params.toString() ? `?${params}` : ''}`);
      if (!res.ok) throw new Error('Failed to load users');
      const body = await res.json();
      setUsers(body.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (isModerator) {
      loadSanctions();
      searchUsers('');
    }
  }, [isModerator, loadSanctions, searchUsers]);

  const liftSanction = async (sanction, type) => {
    const path = type === 'user'
      ? `/moderation/sanctions/user/${sanction.id}/lift`
      : `/moderation/sanctions/ip/${sanction.id}/lift`;
    try {
      const res = await authFetch(path, { method: 'POST' });
      if (!res.ok) {
        let msg = `Failed (${res.status})`;
        try { const b = await res.json(); if (b?.error) msg = b.error; } catch (_) {}
        throw new Error(msg);
      }
      toast.success('Sanction lifted');
      loadSanctions();
    } catch (err) {
      toast.error(err.message || 'Failed to lift sanction');
    }
  };

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isModerator)     return <Navigate to="/" replace />;

  const handleSearch = (e) => { e.preventDefault(); searchUsers(search); };

  return (
    <>
      <Helmet>
        <title>Moderation - OnlyCats</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Gavel className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Moderation</h1>
                <p className="text-sm text-muted-foreground">
                  Signed in as {currentUser?.display_name || currentUser?.email} ({isOwner ? 'owner' : 'moderator'})
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Tabs defaultValue="active">
              <TabsList className="mb-6">
                <TabsTrigger value="active">Active sanctions</TabsTrigger>
                <TabsTrigger value="users">Issue on user</TabsTrigger>
                <TabsTrigger value="ip">Issue on IP</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <Card className="p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-3">User sanctions</h2>
                  {loadingSanctions ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : sanctions.users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active user sanctions.</p>
                  ) : (
                    <ul className="divide-y">
                      {sanctions.users.map((s) => (
                        <SanctionRow
                          key={s.id}
                          sanction={s}
                          type="user"
                          canLift={isOwner || !s.permanent}
                          onLift={liftSanction}
                        />
                      ))}
                    </ul>
                  )}
                </Card>

                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-3">IP sanctions</h2>
                  {loadingSanctions ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : sanctions.ips.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active IP sanctions.</p>
                  ) : (
                    <ul className="divide-y">
                      {sanctions.ips.map((s) => (
                        <SanctionRow
                          key={s.id}
                          sanction={s}
                          type="ip"
                          canLift={isOwner || !s.permanent}
                          onLift={liftSanction}
                        />
                      ))}
                    </ul>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-1">Find a user</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Search by display name, then choose "Issue sanction".
                  </p>
                  <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search display name..."
                        className="pl-9"
                      />
                    </div>
                    <Button type="submit" variant="outline" disabled={searching}>Search</Button>
                  </form>

                  {searching ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No users found.</p>
                  ) : (
                    <ul className="divide-y">
                      {users.map((u) => {
                        const self = u.id === currentUser?.id;
                        const locked = u.role === 'owner' || self || (u.role === 'moderator' && !isOwner);
                        return (
                          <li key={u.id} className="flex items-center gap-3 py-3">
                            <Avatar className="w-10 h-10 rounded-xl">
                              <AvatarImage src={u.avatar_url} alt={u.display_name} />
                              <AvatarFallback className="rounded-xl bg-primary text-primary-foreground">
                                {u.display_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{u.display_name || '(no name)'}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.id}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{u.role}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={locked}
                              onClick={() => setIssueTarget(u)}
                              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            >
                              <Gavel className="w-4 h-4 mr-1" />
                              Sanction
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="ip">
                <IpBanCard isOwner={isOwner} onIssued={loadSanctions} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <SanctionIssueDialog
        open={!!issueTarget}
        onOpenChange={(v) => { if (!v) setIssueTarget(null); }}
        target={issueTarget}
        isOwner={isOwner}
        onIssued={loadSanctions}
      />

      <Footer />
    </>
  );
};

export default ModerationPage;
