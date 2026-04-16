'use client';


import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Search,
  Plus,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AssignmentsRoute() {
  const statCards = [
    { label: 'Total Workers', value: '100', sub: 'Visible across all sites' },
    { label: 'Active Sites', value: '20', sub: '10 more pending' },
    { label: 'Assigned Today', value: '81', sub: '19 remaining workers' },
    { label: 'Remaining Default Status', value: 'Unpaid Day Off', sub: 'Applied automatically', highlight: true },
  ];

  const sites = [
    { name: 'Site A - Lake View Residence', assigned: 12, status: 'Active', selected: true },
    { name: 'Site B - Commercial Building', assigned: 8, status: 'Active' },
    { name: 'Site C - Premium Villas', assigned: 0, status: 'Pending' },
    { name: 'Site D - Industrial Road', assigned: 5, status: 'Active' },
    { name: 'Site E - Green Terrace', assigned: 0, status: 'Closed' },
  ];

  const assignedWorkers = [
    { name: 'Arjan M.', role: 'Mason', time: '08:00 - 16:00' },
    { name: 'Besnik L.', role: 'Electrician', time: '08:00 - 12:00' },
    { name: 'Dritan K.', role: 'Plumber', time: '13:00 - 17:00' },
    { name: 'Ervis T.', role: 'General Worker', time: '08:00 - 16:00' },
  ];

  const availableWorkers = [
    { name: 'Klevis H.', role: 'Carpenter' },
    { name: 'Lorenc S.', role: 'General Worker' },
    { name: 'Marin T.', role: 'Electrician' },
    { name: 'Nertil B.', role: 'General Worker' },
    { name: 'Olsi D.', role: 'Driver' },
    { name: 'Petrit C.', role: 'Plumber' },
  ];

  const remainingWorkers = [
    { name: 'Nertil B.', status: 'Unpaid Day Off' },
    { name: 'Olsi D.', status: 'Unpaid Day Off' },
    { name: 'Petrit C.', status: 'Paid Day Off' },
  ];

  const statusBadge = (status: string) => {
    if (status === 'Active') {
      return <Badge className="bg-brand-50 text-brand-700 hover:bg-brand-50">{status}</Badge>;
    }
    if (status === 'Pending') {
      return <Badge className="bg-brand-100 text-brand-700 hover:bg-brand-100">{status}</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">{status}</Badge>;
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-[1500px] mx-auto space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Workforce Planner</h1>
            <p className="text-sm text-gray-500">Simple 3-column planner with instant search and day-off handling.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input type="date" defaultValue="2026-02-15" className="pl-9 w-[160px]" />
            </div>
            <Button variant="outline">Today</Button>
            <Button className="bg-brand-gradient text-white hover:opacity-95">Tomorrow</Button>
            <Button className="bg-brand-gradient text-white">Multi-day Assignment</Button>
            <Button variant="outline">Complete Program View</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.label} className="p-5 rounded-2xl border">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className={`text-4xl mt-1 font-semibold ${card.highlight ? 'text-brand-700 text-3xl' : 'text-gray-900 text-5xl'}`}>
                {card.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{card.sub}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <Card className="p-4 rounded-2xl xl:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-semibold text-gray-900">Sites</h2>
              <Badge variant="outline">Instant filter</Badge>
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input placeholder="Search sites..." className="pl-9" />
            </div>
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.name}
                  className={`rounded-xl border p-4 ${site.selected ? 'bg-brand-gradient text-white border-transparent' : 'bg-white text-gray-900'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold ${site.selected ? 'text-white' : 'text-gray-900'}`}>{site.name}</p>
                    {statusBadge(site.status)}
                  </div>
                  <p className={`text-sm mt-1 ${site.selected ? 'text-white/80' : 'text-gray-500'}`}>{site.assigned} assigned</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl xl:col-span-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div>
                <h2 className="text-2xl font-semibold text-gray-900">Assignments</h2>
                <p className="text-sm text-gray-500">Site A - Lake View Residence • 2026-02-15</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="bg-brand-gradient text-white hover:opacity-95">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Workers
                </Button>
                <Button variant="outline">Save Draft</Button>
                <Button className="bg-brand-gradient text-white hover:opacity-95">Publish</Button>
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input placeholder="Search assigned workers..." className="pl-9" />
            </div>
            <div className="space-y-3">
              {assignedWorkers.map((worker) => (
                <div key={worker.name} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{worker.name}</p>
                      <p className="text-sm text-gray-500">{worker.role}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{worker.time}</p>
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" variant="ghost">Edit</Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="xl:col-span-4 space-y-4">
            <Card className="p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-semibold text-gray-900">Available Workers</h2>
                <Badge variant="outline">Instant filter</Badge>
              </div>
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input placeholder="Search available workers..." className="pl-9" />
              </div>
              <div className="space-y-2">
                {availableWorkers.map((worker) => (
                  <div key={worker.name} className="rounded-xl border p-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{worker.name}</p>
                      <p className="text-sm text-gray-500">{worker.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Add</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem>Lock worker</DropdownMenuItem>
                          <DropdownMenuItem>Paid leave</DropdownMenuItem>
                          <DropdownMenuItem>Unpaid leave</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-3xl font-semibold text-gray-900">Remaining Workers</h2>
                  <p className="text-sm text-gray-500">Default status: Unpaid Day Off</p>
                </div>
                <Badge className="bg-brand-50 text-brand-700 hover:bg-brand-50">Auto marked</Badge>
              </div>
              <div className="space-y-3">
                {remainingWorkers.map((worker) => (
                  <div key={worker.name} className="rounded-xl border p-3">
                    <p className="font-medium text-gray-900 mb-2">{worker.name}</p>
                    <div className="relative">
                      <select
                        defaultValue={worker.status}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 pr-9 text-sm"
                      >
                        <option>Unpaid Day Off</option>
                        <option>Paid Day Off</option>
                        <option>No status</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card className="p-4 rounded-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Simple Weekly Scheduling</h3>
              <p className="text-sm text-gray-500">
                Admin can assign daily workers quickly for today, tomorrow, or up to 1 week.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Badge className="bg-brand-50 text-brand-700 hover:bg-brand-50">Today assignment</Badge>
              <Badge className="bg-brand-100 text-brand-700 hover:bg-brand-100">Tomorrow assignment</Badge>
              <Badge className="bg-brand-gradient text-white">1 week planning</Badge>
            </div>
          </div>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
