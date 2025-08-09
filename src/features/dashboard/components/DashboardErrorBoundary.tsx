'use client';

import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { AlertCircle } from 'lucide-react';

interface DashboardErrorBoundaryProps {
  error?: Error | null;
  onRetry: () => void;
}

export function DashboardErrorBoundary({ error, onRetry }: DashboardErrorBoundaryProps) {
  if (!error) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
      <Card className="max-w-md mx-auto">
        <CardBody className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">데이터를 불러올 수 없습니다</h2>
          <p className="text-default-500 mb-2">대시보드 정보를 가져오는 중 오류가 발생했습니다.</p>
          {error.message && (
            <p className="text-xs text-default-400 mb-6 font-mono bg-default-100 p-2 rounded">
              {error.message}
            </p>
          )}
          <div className="space-y-2">
            <Button color="primary" onClick={onRetry} className="w-full">
              다시 시도
            </Button>
            <Button 
              variant="flat" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              페이지 새로고침
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}