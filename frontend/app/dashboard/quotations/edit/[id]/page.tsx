'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuotationForm } from '@/components/quotations/QuotationForm';
import { quotationAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    loadQuotation();
  }, [id]);

  const loadQuotation = async () => {
    try {
      setLoading(true);
      const res = await quotationAPI.getById(id);
      if (res.data) {
        setQuotation(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching quotation:', err);
      toast.error('Failed to load quotation');
      router.push('/dashboard/quotations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm">Loading quotation details...</p>
      </div>
    );
  }

  if (!quotation) return null;

  return (
    <div className="flex-1 p-4 lg:p-8">
      <QuotationForm initialData={quotation} isEdit={true} />
    </div>
  );
}
