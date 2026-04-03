import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Settings, Bell, Mail, Lock, CreditCard, Users, Globe } from 'lucide-react';

interface SettingsPageProps {
  userRole: string;
}

export function SettingsPage({ userRole }: SettingsPageProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Integration</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-gray-900 mb-1">Company Information</h3>
                <p className="text-sm text-gray-500 mb-4">Update your company details and preferences</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label>Company Name</Label>
                  <Input defaultValue="AuctionCRM Inc." />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label>Industry</Label>
                  <Select defaultValue="auction">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auction">Auction & Marketplace</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input defaultValue="123 Main Street, New York, NY 10001" />
                </div>
                
                <div>
                  <Label>Phone</Label>
                  <Input defaultValue="+1 212 555 0100" />
                </div>
                
                <div>
                  <Label>Email</Label>
                  <Input defaultValue="contact@auctioncrm.com" />
                </div>
                
                <div className="col-span-2">
                  <Label>Website</Label>
                  <Input defaultValue="https://auctioncrm.com" />
                </div>
                
                <div className="col-span-2">
                  <Label>Timezone</Label>
                  <Select defaultValue="est">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="est">Eastern Time (ET)</SelectItem>
                      <SelectItem value="cst">Central Time (CT)</SelectItem>
                      <SelectItem value="mst">Mountain Time (MT)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label>Currency</Label>
                  <Select defaultValue="usd">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                      <SelectItem value="gbp">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-gray-900 mb-1">Notification Preferences</h3>
                <p className="text-sm text-gray-500 mb-4">Manage how you receive notifications</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">New Auction Created</p>
                    <p className="text-sm text-gray-500">Get notified when a new auction is created</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">Bid Placed</p>
                    <p className="text-sm text-gray-500">Get notified when someone places a bid</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">Auction Ending Soon</p>
                    <p className="text-sm text-gray-500">Receive alerts for auctions ending within 1 hour</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">Transaction Complete</p>
                    <p className="text-sm text-gray-500">Get notified when a transaction is completed</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">New User Registration</p>
                    <p className="text-sm text-gray-500">Get notified when a new user registers</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">Weekly Report</p>
                    <p className="text-sm text-gray-500">Receive weekly summary of activities</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button>Save Preferences</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-gray-900 mb-1">Email Configuration</h3>
                <p className="text-sm text-gray-500 mb-4">Configure email templates and SMTP settings</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>SMTP Host</Label>
                  <Input placeholder="smtp.example.com" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SMTP Port</Label>
                    <Input placeholder="587" />
                  </div>
                  
                  <div>
                    <Label>Encryption</Label>
                    <Select defaultValue="tls">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tls">TLS</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>SMTP Username</Label>
                  <Input placeholder="your-email@example.com" />
                </div>
                
                <div>
                  <Label>SMTP Password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                
                <div>
                  <Label>From Email</Label>
                  <Input defaultValue="noreply@auctioncrm.com" />
                </div>
                
                <div>
                  <Label>From Name</Label>
                  <Input defaultValue="AuctionCRM" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Test Connection</Button>
                <Button>Save Settings</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-gray-900 mb-1">Security Settings</h3>
                <p className="text-sm text-gray-500 mb-4">Manage security and authentication settings</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">Login Alerts</p>
                    <p className="text-sm text-gray-500">Get notified of new login attempts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">Session Timeout</p>
                    <p className="text-sm text-gray-500">Automatically log out after inactivity</p>
                  </div>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-gray-900 mb-4">Change Password</h4>
                <div className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <Input type="password" />
                  </div>
                  
                  <div>
                    <Label>New Password</Label>
                    <Input type="password" />
                  </div>
                  
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input type="password" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button>Update Password</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-gray-900 mb-1">Billing Information</h3>
                <p className="text-sm text-gray-500 mb-4">Manage your subscription and payment methods</p>
              </div>

              <Separator />

              <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900 mb-1">Current Plan: Professional</p>
                    <p className="text-sm text-gray-600">$99/month • Next billing date: Dec 18, 2025</p>
                  </div>
                  <Button variant="outline">Change Plan</Button>
                </div>
              </div>

              <div>
                <h4 className="text-gray-900 mb-4">Payment Method</h4>
                <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 bg-gray-900 rounded flex items-center justify-center text-white text-xs">
                      VISA
                    </div>
                    <div>
                      <p className="text-gray-900">•••• •••• •••• 4242</p>
                      <p className="text-sm text-gray-500">Expires 12/2027</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Update</Button>
                </div>
              </div>

              <div>
                <h4 className="text-gray-900 mb-4">Billing Address</h4>
                <div className="space-y-4">
                  <Input defaultValue="123 Main Street" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input defaultValue="New York" />
                    <Input defaultValue="NY" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input defaultValue="10001" />
                    <Input defaultValue="United States" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Team Settings */}
        <TabsContent value="team">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-900 mb-1">Team Members</h3>
                  <p className="text-sm text-gray-500">Manage your team and permissions</p>
                </div>
                <Button>
                  <Users className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-gradient rounded-full flex items-center justify-center text-white shadow-md">
                      AD
                    </div>
                    <div>
                      <p className="text-gray-900">Admin User</p>
                      <p className="text-sm text-gray-500">admin@auctioncrm.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Owner</span>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-gradient rounded-full flex items-center justify-center text-white shadow-md">
                      JS
                    </div>
                    <div>
                      <p className="text-gray-900">John Smith</p>
                      <p className="text-sm text-gray-500">john@auctioncrm.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="admin">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">Remove</Button>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                      SJ
                    </div>
                    <div>
                      <p className="text-gray-900">Sarah Johnson</p>
                      <p className="text-sm text-gray-500">sarah@auctioncrm.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="manager">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">Remove</Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integration">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-gray-900 mb-1">Integrations</h3>
                <p className="text-sm text-gray-500 mb-4">Connect third-party services and APIs</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-gradient rounded flex items-center justify-center text-white shadow-md">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-gray-900">Payment Gateway</p>
                        <p className="text-sm text-gray-500">Stripe integration</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">Configure</Button>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-gradient rounded flex items-center justify-center text-white shadow-md">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-gray-900">Email Service</p>
                        <p className="text-sm text-gray-500">SendGrid integration</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">Configure</Button>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center text-white">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-gray-900">Analytics</p>
                        <p className="text-sm text-gray-500">Google Analytics</p>
                      </div>
                    </div>
                    <Switch />
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">Configure</Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
