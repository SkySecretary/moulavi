'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Search, Trash2, Edit2, ShieldCheck, Tag } from 'lucide-react';
import api from '@/lib/api';

interface MarkupRule {
  id: string;
  ruleName: string;
  markupType: 'FIXED' | 'PERCENTAGE';
  value: string;
  targetService: 'GLOBAL' | 'FLIGHT' | 'HOTEL' | 'TRANSPORT' | 'VISA' | 'PACKAGE';
  isActive: boolean;
}

export default function B2CPricingPage() {
  const [configs, setConfigs] = useState<MarkupRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<MarkupRule | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    ruleName: '',
    markupType: 'PERCENTAGE',
    value: '5',
    targetService: 'GLOBAL',
  });

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/b2c/configs');
      if (res.data?.success) {
        setConfigs(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load markup rules: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleEdit = (rule: MarkupRule) => {
    setEditingRule(rule);
    setFormData({
      ruleName: rule.ruleName,
      markupType: rule.markupType,
      value: String(rule.value),
      targetService: rule.targetService,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this markup rule?')) return;
    try {
      const res = await api.delete(`/b2c/configs/${id}`);
      if (res.data?.success) {
        toast.success('Markup rule deleted');
        fetchConfigs();
      }
    } catch (err: any) {
      toast.error('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleStatus = async (rule: MarkupRule) => {
    try {
      const res = await api.put(`/b2c/configs/${rule.id}`, { isActive: !rule.isActive });
      if (res.data?.success) {
        toast.success(rule.isActive ? 'Rule deactivated' : 'Rule activated');
        fetchConfigs();
      }
    } catch (err: any) {
      toast.error('Failed to toggle status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ruleName || !formData.value) {
      toast.error('Please enter all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        value: Number(formData.value),
      };

      const res = editingRule
        ? await api.put(`/b2c/configs/${editingRule.id}`, payload)
        : await api.post('/b2c/configs', payload);

      if (res.data?.success) {
        toast.success(editingRule ? 'Rule updated' : 'Rule created');
        setShowForm(false);
        setEditingRule(null);
        fetchConfigs();
        setFormData({
          ruleName: '',
          markupType: 'PERCENTAGE',
          value: '5',
          targetService: 'GLOBAL',
        });
      }
    } catch (err: any) {
      toast.error('Failed to save markup rule: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredRules = configs.filter((rule) =>
    rule.ruleName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary">B2C Markup Rules</h1>
          <p className="text-muted-foreground text-sm">Configure dynamic margin overlays applied to consumer bookings.</p>
        </div>
        <Button onClick={() => { setEditingRule(null); setShowForm(true); }} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Markup Rule
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search rule by name..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : filteredRules.length === 0 ? (
        <Card className="p-8 text-center">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle>No Markup Rules Configured</CardTitle>
          <CardDescription className="mt-2">B2C checkouts will reflect base costs without dynamic retail margin.</CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRules.map((rule) => (
            <Card key={rule.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold text-secondary">{rule.ruleName}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`text-xs ${rule.isActive ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'}`}
                    onClick={() => handleToggleStatus(rule)}
                  >
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </Button>
                </div>
                <CardDescription className="text-xs">Target: <span className="font-bold text-secondary">{rule.targetService}</span></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg text-xs flex justify-between items-center">
                  <span className="text-muted-foreground">Rate Adjustment:</span>
                  <span className="font-bold text-primary" style={{ fontSize: '1.1rem' }}>
                    {rule.markupType === 'PERCENTAGE' ? `+${rule.value}%` : `+${rule.value} SAR`}
                  </span>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(rule)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Slideout Form Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="max-w-md">
          <SheetHeader>
            <SheetTitle>{editingRule ? 'Edit Markup Rule' : 'Create Markup Rule'}</SheetTitle>
            <SheetDescription>Set pricing margins for direct public channels.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Rule Name</label>
              <Input 
                value={formData.ruleName} 
                onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })} 
                placeholder="e.g. Ramadan Season Margin"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Target Service Level</label>
              <select 
                className="w-full border rounded-lg p-2 text-sm bg-white"
                value={formData.targetService}
                onChange={(e: any) => setFormData({ ...formData, targetService: e.target.value })}
                required
              >
                <option value="GLOBAL">GLOBAL (Apply to overall booking)</option>
                <option value="FLIGHT">FLIGHT (Apply to seat pricing)</option>
                <option value="HOTEL">HOTEL (Apply to accommodation night rate)</option>
                <option value="TRANSPORT">TRANSPORT (Apply to vehicle route fee)</option>
                <option value="VISA">VISA (Apply to e-Visa processing fee)</option>
                <option value="PACKAGE">PACKAGE (Apply to readymade tours)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Adjustment Type</label>
              <select 
                className="w-full border rounded-lg p-2 text-sm bg-white"
                value={formData.markupType}
                onChange={(e: any) => setFormData({ ...formData, markupType: e.target.value })}
                required
              >
                <option value="PERCENTAGE">PERCENTAGE (%)</option>
                <option value="FIXED">FIXED RATE (SAR)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Markup Value</label>
              <Input 
                type="number" 
                value={formData.value} 
                onChange={(e) => setFormData({ ...formData, value: e.target.value })} 
                placeholder="e.g. 5"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingRule ? 'Save Changes' : 'Add Markup Rule'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
