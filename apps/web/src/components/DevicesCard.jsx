import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, Tablet, Globe, RefreshCw, LogOut, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import supabase from '@/lib/supabaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';

const authFetch = async (path, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return apiServerClient.fetch(path, { ...options, headers });
};

const pickIcon = (ua) => {
  const s = (ua || '').toLowerCase();
  if (/ipad|tablet/.test(s)) return Tablet;
  if (/mobi|iphone|android/.test(s)) return Smartphone;
  if (/windows|mac|linux|cros/.test(s)) return Monitor;
  return Globe;
};

const prettyUA = (ua) => {
  if (!ua) return 'Unknown device';
  const s = ua;
  let os = 'Unknown OS';
  if (/Windows NT 10/i.test(s)) os = 'Windows 10/11';
  else if (/Windows/i.test(s)) os = 'Windows';
  else if (/Mac OS X/i.test(s)) os = 'macOS';
  else if (/iPhone|iPad|iOS/i.test(s)) os = 'iOS';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/Linux/i.test(s)) os = 'Linux';

  let browser = 'browser';
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\//i.test(s)) browser = 'Opera';
  else if (/Firefox/i.test(s)) browser = 'Firefox';
  else if (/Chrome\//i.test(s)) browser = 'Chrome';
  else if (/Safari\//i.test(s)) browser = 'Safari';

  return `${browser} on ${os}`;
};

const DevicesCard = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/devices/me');
      if (!res.ok) throw new Error('Failed to load devices');
      const body = await res.json();
      setDevices(body.devices ?? []);
    } catch (err) {
      console.error('Load devices failed:', err);
      toast.error('Could not load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revokeOne = async (id, isCurrent) => {
    if (isCurrent) {
      if (!window.confirm('This is your current device. Signing it out will log you out now. Continue?')) return;
    } else if (!window.confirm('Sign this device out?')) return;

    setWorking(true);
    try {
      const res = await authFetch(`/devices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Revoke failed');
      toast.success('Device signed out');
      if (isCurrent) {
        await supabase.auth.signOut();
        return;
      }
      setDevices((d) => d.filter((row) => row.id !== id));
    } catch (err) {
      console.error('Revoke device failed:', err);
      toast.error('Could not sign out that device');
    } finally {
      setWorking(false);
    }
  };

  const revokeOthers = async () => {
    if (!window.confirm('Sign out all other devices?')) return;
    setWorking(true);
    try {
      const res = await authFetch('/devices/revoke-others', { method: 'POST' });
      if (!res.ok) throw new Error('Revoke others failed');
      const body = await res.json();
      toast.success(`Signed out ${body.revoked ?? 0} other device${body.revoked === 1 ? '' : 's'}`);
      await load();
    } catch (err) {
      console.error('Revoke other devices failed:', err);
      toast.error('Could not sign out other devices');
    } finally {
      setWorking(false);
    }
  };

  const othersCount = devices.filter((d) => !d.is_current).length;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Devices</h2>
          <p className="text-sm text-muted-foreground">
            Your account stays signed in on these devices. Revoke any you don&apos;t recognize.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading || working}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={revokeOthers}
            disabled={working || othersCount === 0}
          >
            <LogOut className="w-4 h-4 mr-1" />
            Sign out others ({othersCount})
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading devices…</p>
      ) : devices.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No active devices.</p>
      ) : (
        <ul className="divide-y">
          {devices.map((d) => {
            const Icon = pickIcon(d.user_agent);
            return (
              <li key={d.id} className="py-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{prettyUA(d.user_agent)}</span>
                    {d.is_current && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> This device
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.ip ? `IP ${d.ip} · ` : ''}
                    last active {d.last_seen ? formatDistanceToNow(new Date(d.last_seen), { addSuffix: true }) : 'unknown'}
                  </p>
                  {d.user_agent && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono break-all line-clamp-2">
                      {d.user_agent}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeOne(d.id, d.is_current)}
                  disabled={working}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  Sign out
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export default DevicesCard;
