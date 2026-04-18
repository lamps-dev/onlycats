import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import DeleteAccountDialog from '@/components/DeleteAccountDialog.jsx';
import CollectionsManager from '@/components/CollectionsManager.jsx';
import MarkdownContent from '@/components/MarkdownContent.jsx';
import supabase from '@/lib/supabaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { Trash2, Plus, X, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';

const SOCIAL_PLATFORMS = [
  { value: 'twitter',   label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'twitch',    label: 'Twitch' },
  { value: 'github',    label: 'GitHub' },
  { value: 'discord',   label: 'Discord' },
  { value: 'website',   label: 'Website' },
  { value: 'other',     label: 'Other' },
];

const DEFAULT_PREFS = { tips: true, follows: true, likes: false, email: false };

const SettingsPage = () => {
  const navigate = useNavigate();
  const { currentUser, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [bio, setBio]             = useState('');
  const [aboutMe, setAboutMe]     = useState('');
  const [country, setCountry]     = useState('');
  const [location, setLocation]   = useState('');
  const [socials, setSocials]     = useState([]);
  const [prefs, setPrefs]         = useState(DEFAULT_PREFS);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs]     = useState(false);
  const [deleteOpen, setDeleteOpen]       = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setBio(currentUser.bio ?? '');
    setAboutMe(currentUser.about_me ?? '');
    setCountry(currentUser.country ?? '');
    setLocation(currentUser.location ?? '');
    setSocials(Array.isArray(currentUser.social_links) ? currentUser.social_links : []);
    setPrefs({ ...DEFAULT_PREFS, ...(currentUser.notification_prefs || {}) });
  }, [currentUser]);

  const cleanedSocials = useMemo(
    () => socials
      .map((s) => ({ platform: s.platform || 'other', url: (s.url || '').trim() }))
      .filter((s) => s.url.length > 0),
    [socials],
  );

  const addSocial    = () => setSocials((s) => [...s, { platform: 'twitter', url: '' }]);
  const removeSocial = (i) => setSocials((s) => s.filter((_, idx) => idx !== i));
  const updateSocial = (i, patch) => setSocials((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const saveProfile = async () => {
    if (!currentUser) return;
    for (const s of cleanedSocials) {
      try { new URL(s.url); } catch {
        toast.error(`Invalid URL: ${s.url}`);
        return;
      }
    }
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: bio.trim() || null,
          about_me: aboutMe.trim() || null,
          country: country.trim() || null,
          location: location.trim() || null,
          social_links: cleanedSocials,
        })
        .eq('id', currentUser.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Profile updated');
    } catch (err) {
      console.error('Profile save failed:', err);
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async (next) => {
    if (!currentUser) return;
    setSavingPrefs(true);
    setPrefs(next);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_prefs: next })
        .eq('id', currentUser.id);
      if (error) throw error;
    } catch (err) {
      console.error('Prefs save failed:', err);
      toast.error('Failed to update preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  if (!currentUser) return null;

  return (
    <>
      <Helmet><title>Settings - OnlyCats</title></Helmet>
      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground mb-8">
              Manage your appearance, profile, and account.
            </p>

            <Tabs defaultValue="profile">
              <TabsList className="grid grid-cols-4 w-full mb-6">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Card className="p-6 space-y-6">
                  <div>
                    <Label htmlFor="bio">Short bio</Label>
                    <Input
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={160}
                      placeholder="One-line tagline shown under your name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{bio.length}/160</p>
                  </div>

                  <div>
                    <Label htmlFor="about">About me</Label>
                    <Textarea
                      id="about"
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      maxLength={1000}
                      rows={5}
                      placeholder="Tell the world about you and your cats (Markdown supported)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{aboutMe.length}/1000</p>
                    {aboutMe.trim() && (
                      <div className="mt-3 rounded-xl border bg-card p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                        <MarkdownContent>{aboutMe}</MarkdownContent>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Canada" />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Toronto" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Social links</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addSocial}>
                        <Plus className="w-4 h-4 mr-1" /> Add link
                      </Button>
                    </div>
                    {socials.length === 0 && (
                      <p className="text-sm text-muted-foreground">No links yet.</p>
                    )}
                    <div className="space-y-2">
                      {socials.map((row, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Select
                            value={row.platform}
                            onValueChange={(v) => updateSocial(i, { platform: v })}
                          >
                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SOCIAL_PLATFORMS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={row.url}
                            onChange={(e) => updateSocial(i, { url: e.target.value })}
                            placeholder="https://..."
                            className="flex-1"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSocial(i)} aria-label="Remove">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button onClick={saveProfile} disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Save profile'}
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold">Collections</h2>
                      <p className="text-sm text-muted-foreground">Group your posts into named collections.</p>
                    </div>
                  </div>
                  <CollectionsManager userId={currentUser.id} editable />
                </Card>
              </TabsContent>

              <TabsContent value="appearance">
                <Card className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Theme</h2>
                    <p className="text-sm text-muted-foreground">Choose how OnlyCats looks on this device.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light',  label: 'Light',  Icon: Sun },
                      { value: 'dark',   label: 'Dark',   Icon: Moon },
                      { value: 'system', label: 'System', Icon: Monitor },
                    ].map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                          theme === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Notifications</h2>
                    <p className="text-sm text-muted-foreground">Pick what you want to hear about. Changes save automatically.</p>
                  </div>
                  {[
                    { key: 'tips',    title: 'Tips',           desc: 'Someone sends you a tip' },
                    { key: 'follows', title: 'New followers',  desc: 'Someone follows your account' },
                    { key: 'likes',   title: 'Likes',          desc: 'Someone likes your post' },
                    { key: 'email',   title: 'Email digest',   desc: 'Weekly summary by email' },
                  ].map((row) => (
                    <div key={row.key} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{row.title}</p>
                        <p className="text-sm text-muted-foreground">{row.desc}</p>
                      </div>
                      <Switch
                        checked={!!prefs[row.key]}
                        disabled={savingPrefs}
                        onCheckedChange={(v) => savePrefs({ ...prefs, [row.key]: v })}
                      />
                    </div>
                  ))}
                </Card>
              </TabsContent>

              <TabsContent value="account">
                <Card className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Account</h2>
                    <p className="text-sm text-muted-foreground">Signed in as {currentUser.email}.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => navigate(`/${currentUser.id}`)}>
                      View public profile
                    </Button>
                  </div>
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-destructive mb-2">Danger zone</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Permanently delete your account, posts, and uploaded files. This cannot be undone.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteOpen(true)}
                      className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete account
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        accountName={currentUser.display_name}
      />

      <Footer />
    </>
  );
};

export default SettingsPage;
