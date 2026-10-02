'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users as UsersIcon, Shield, UserCheck, UserX } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UserStatsCardsProps {
  users?: User[];
  stats?: {
    total: number;
    active: number;
    admin: number;
    inactive: number;
  };
}

export default function UserStatsCards({ users = [], stats: externalStats }: UserStatsCardsProps) {
  const totalUsers = externalStats !== undefined ? externalStats.total : users.length;
  const activeUsers = externalStats !== undefined ? externalStats.active : users.filter(u => u.isActive).length;
  const adminUsers = externalStats !== undefined ? externalStats.admin : users.filter(u => u.role === 'admin').length;
  const inactiveUsers = externalStats !== undefined ? externalStats.inactive : (totalUsers - activeUsers);

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: UsersIcon,
      color: 'bg-blue-100 text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Users',
      value: activeUsers,
      icon: UserCheck,
      color: 'bg-green-100 text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Admin Users',
      value: adminUsers,
      icon: Shield,
      color: 'bg-red-100 text-primary',
      bgColor: 'bg-destructive/5'
    },
    {
      title: 'Inactive Users',
      value: inactiveUsers,
      icon: UserX,
      color: 'bg-gray-100 text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`h-10 w-10 rounded-full ${stat.color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
