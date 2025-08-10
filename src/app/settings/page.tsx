'use client';

import { CareItemsList } from '@/features/care-items/components/CareItemsList';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-default-500 mt-2">
          검사 및 주사 항목을 관리하고 시스템 설정을 구성합니다.
        </p>
      </div>
      
      <CareItemsList />
    </div>
  );
}