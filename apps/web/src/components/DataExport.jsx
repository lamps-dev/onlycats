import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Download, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Every section is fetched independently and failures are reported rather than
// thrown. The database behind this site is in a bad state, so a partial export
// is a far better outcome than one broken table taking the whole thing down.
const buildSections = (userId) => [
  {
    key: 'profile',
    label: 'Profile',
    run: () =>
      supabase
        .from('profiles')
        .select('id, display_name, bio, about_me, avatar_url, follower_count, role, country, location, social_links, notification_prefs')
        .eq('id', userId),
  },
  {
    key: 'posts',
    label: 'Posts',
    run: () =>
      supabase
        .from('content')
        .select('id, caption, file_url, like_count, tip_count, comment_count, repost_count, created_at, creator_id')
        .eq('creator_id', userId),
  },
  {
    key: 'comments',
    label: 'Comments',
    run: () =>
      supabase
        .from('comments')
        .select('id, content_id, parent_id, body, edited_at, created_at')
        .eq('user_id', userId),
  },
  {
    key: 'collections',
    label: 'Collections',
    run: () =>
      supabase
        .from('collections')
        .select('id, name, description, cover_url, created_at, updated_at')
        .eq('user_id', userId),
  },
  {
    key: 'likes',
    label: 'Likes',
    run: () => supabase.from('likes').select('content_id').eq('user_id', userId),
  },
  {
    key: 'reposts',
    label: 'Reposts',
    run: () =>
      supabase
        .from('reposts')
        .select('id, content_id, quote_text, overlay_text, created_at')
        .eq('user_id', userId),
  },
  {
    key: 'following',
    label: 'Creators you follow',
    run: () => supabase.from('followers').select('creator_id').eq('user_id', userId),
  },
  {
    key: 'followers',
    label: 'Your followers',
    run: () => supabase.from('followers').select('user_id').eq('creator_id', userId),
  },
  {
    key: 'tips_sent',
    label: 'Tips you sent',
    run: () =>
      supabase.from('tips').select('creator_id, amount, message').eq('sender_id', userId),
  },
  {
    key: 'tips_received',
    label: 'Tips you received',
    run: () =>
      supabase.from('tips').select('sender_id, amount, message').eq('creator_id', userId),
  },
];

const DataExport = () => {
  const { currentUser } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const handleExport = async () => {
    if (!currentUser?.id) return;
    setRunning(true);
    setResults(null);

    const sections = buildSections(currentUser.id);
    const data = {};
    const report = [];

    for (const section of sections) {
      try {
        const { data: rows, error } = await section.run();
        if (error) throw error;
        data[section.key] = rows ?? [];
        report.push({ key: section.key, label: section.label, ok: true, count: (rows ?? []).length });
      } catch (err) {
        console.error(`Export of ${section.key} failed:`, err);
        data[section.key] = null;
        report.push({
          key: section.key,
          label: section.label,
          ok: false,
          error: err?.message || 'Could not be read',
        });
      }
    }

    const failed = report.filter((r) => !r.ok);

    const payload = {
      export_note:
        'OnlyCats data export. OnlyCats is discontinued and read-only. Sections set to null could not be read from the database at the time of export. Media files are referenced by URL and are not guaranteed to stay online, so download anything you want to keep.',
      exported_at: new Date().toISOString(),
      account: {
        id: currentUser.id,
        email: currentUser.email,
        display_name: currentUser.display_name ?? null,
      },
      failed_sections: failed.map((r) => ({ section: r.key, error: r.error })),
      data,
    };

    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `onlycats-data-${currentUser.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (failed.length === 0) {
        toast.success('Your data has been downloaded.');
      } else if (failed.length === sections.length) {
        toast.error('Nothing could be read from the database. The file records what failed.');
      } else {
        toast.warning(`Downloaded, but ${failed.length} of ${sections.length} sections could not be read.`);
      }
    } catch (err) {
      console.error('Export download failed:', err);
      toast.error('Could not build the download file.');
    }

    setResults(report);
    setRunning(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Save your data</h2>
        <p className="text-sm text-muted-foreground">
          Download everything this account still has in the database as a single JSON file: your
          profile, posts, comments, collections, likes, reposts, follows, and tips. Media files are
          included as URLs, so save anything you care about separately while those links still
          resolve.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-muted-foreground">
          This is best effort. The database behind OnlyCats is in a poor state, so some sections may
          come back empty or fail outright. Whatever fails is listed in the file and below, and you
          can run the export again.
        </p>
      </div>

      <Button onClick={handleExport} disabled={running || !currentUser?.id}>
        {running ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Collecting your data...</>
        ) : (
          <><Download className="w-4 h-4 mr-2" />Download my data</>
        )}
      </Button>

      {results && (
        <ul className="space-y-1.5 text-sm pt-2 border-t">
          {results.map((row) => (
            <li key={row.key} className="flex items-start gap-2">
              {row.ok ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
              )}
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">{row.label}</span>
                {row.ok ? `: ${row.count} record${row.count === 1 ? '' : 's'}` : `: failed (${row.error})`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default DataExport;
