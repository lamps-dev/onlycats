import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import DeleteAccountDialog from '@/components/DeleteAccountDialog.jsx';
import DataExport from '@/components/DataExport.jsx';
import DevicesCard from '@/components/DevicesCard.jsx';
import ReadOnlyNotice from '@/components/ReadOnlyNotice.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { Trash2, Sun, Moon, Monitor } from 'lucide-react';

// OnlyCats is discontinued and read-only, so the editable halves of this page
// (profile fields, avatar, notification preferences) are gone rather than
// sitting here as controls that would only ever fail. What is left is what a
// signed-in person can still legitimately do: take their data and leave.
const SettingsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <>
      <Helmet><title>Settings - OnlyCats</title></Helmet>
      <Header />

      <main className="min-h-[calc(100vh-4rem)] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground mb-6">
              Download your data, sign out your devices, or delete your account.
            </p>

            <ReadOnlyNotice className="mb-8" />

            <Tabs defaultValue="data">
              <TabsList className="grid grid-cols-4 w-full mb-6">
                <TabsTrigger value="data">Your data</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>

              <TabsContent value="data">
                <DataExport />
              </TabsContent>

              <TabsContent value="appearance">
                <Card className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Theme</h2>
                    <p className="text-sm text-muted-foreground">
                      Choose how OnlyCats looks on this device. This is stored in your browser, not
                      in the database.
                    </p>
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

              <TabsContent value="devices">
                <DevicesCard />
              </TabsContent>

              <TabsContent value="account">
                <Card className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Account</h2>
                    <p className="text-sm text-muted-foreground">Signed in as {currentUser.email}.</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your profile, posts, and preferences can no longer be edited. Download your data
                    from the Your data tab before deleting anything, because deletion is final and
                    there is nobody left to restore it for you.
                  </p>
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
