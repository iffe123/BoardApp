'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We encountered an error while loading this page. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.message && (
            <div className="p-3 rounded-md bg-muted text-sm font-mono text-muted-foreground break-all">
              {error.message}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
