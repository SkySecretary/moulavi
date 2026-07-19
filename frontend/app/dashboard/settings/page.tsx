'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  User, 
  MapPin, 
  Building2, 
  DollarSign, 
  Database, 
  Car, 
  Users, 
  Route, 
  Truck, 
  Tag, 
  Receipt, 
  TrendingUp, 
  Calendar,
  Settings as SettingsIcon,
  ChevronRight
} from 'lucide-react';

const masterItems = [
  { name: 'User Management', description: 'Manage system users and access', icon: User, path: '/dashboard/masters/user', category: 'General' },
  { name: 'Country Master', description: 'Manage countries', icon: MapPin, path: '/dashboard/masters/country', category: 'Region' },
  { name: 'City Master', description: 'Manage cities', icon: Building2, path: '/dashboard/masters/city', category: 'Region' },
  { name: 'Currency Master', description: 'Configure system currencies', icon: DollarSign, path: '/dashboard/masters/currency', category: 'Financial' },
  { name: 'Location Master', description: 'Manage locations and points of interest', icon: Database, path: '/dashboard/masters/location', category: 'Region' },
  { name: 'Vehicle Type Master', icon: Car, path: '/dashboard/masters/vehicle-type', category: 'Transport', description: 'Manage vehicle types' },
  { name: 'Party Master', icon: Users, path: '/dashboard/masters/party', category: 'External', description: 'Manage agencies and parties' },
  { name: 'Agent Compliance Audit', icon: Users, path: '/dashboard/umrah-visa/agent-compliance', category: 'External', description: 'Monitor sub-agent scores and compliance lock status' },
  { name: 'Transport Route Master', icon: Route, path: '/dashboard/masters/transport-route', category: 'Transport', description: 'Define transport routes' },
  { name: 'Transport Master', icon: Truck, path: '/dashboard/masters/transport', category: 'Transport', description: 'Configure transportation services' },
  { name: 'Pricing Master', icon: Tag, path: '/dashboard/masters/pricing', category: 'Financial', description: 'Manage service pricing' },
  { name: 'Expense Master', icon: Receipt, path: '/dashboard/masters/expense', category: 'Financial', description: 'Configure expense categories' },
  { name: 'Income Master', icon: TrendingUp, path: '/dashboard/masters/income', category: 'Financial', description: 'Configure income categories' },
  { name: 'Umrah Visa Master', icon: Calendar, path: '/dashboard/masters/umrah-visa', category: 'Services', description: 'Configure Umrah visa rules' },
  { name: 'Hotel Inventory Master', icon: Building2, path: '/dashboard/masters/hotel-inventory', category: 'Services', description: 'Manage BRN inventory allocation and available beds' },
  { name: 'Nusuk API Integration', icon: SettingsIcon, path: '/dashboard/masters/nusuk', category: 'Services', description: 'Configure Nusuk authentication token and daily report synchronization' },
  { name: 'WhatsApp Channel Settings', icon: SettingsIcon, path: '/dashboard/masters/whatsapp', category: 'Services', description: 'Configure multi-channel WhatsApp API profiles and map them to system use cases' },
];

const categories = ['General', 'Region', 'Financial', 'Transport', 'External', 'Services'];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-secondary">System Settings</h1>
        <p className="text-muted-foreground">Manage your ERP configuration and master data.</p>
      </div>

      {categories.map((category) => (
        <section key={category} className="space-y-4">
          <h2 className="text-xl font-semibold text-secondary flex items-center gap-2">
            <div className="h-6 w-1 bg-primary rounded-full"></div>
            {category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {masterItems
              .filter((item) => item.category === category)
              .map((item) => (
                <Card 
                  key={item.name} 
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100"
                  onClick={() => router.push(item.path)}
                >
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors mr-4">
                      <item.icon className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                        {item.name}
                      </CardTitle>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
