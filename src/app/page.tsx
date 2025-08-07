'use client';

import { Button } from '@/components/ui/button';
import { UserPlus, Calendar, Activity } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            CareCycle
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            정신건강의학과 검사·주사 일정 자동 관리 시스템
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">환자 등록</h3>
            <p className="text-muted-foreground mb-4">
              환자 정보와 관리 항목을 등록하여 자동으로 일정을 생성합니다
            </p>
            <Link href="/patients/register">
              <Button className="w-full">환자 등록하기</Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">일정 관리</h3>
            <p className="text-muted-foreground mb-4">
              오늘의 검사·주사 일정을 확인하고 시행 여부를 체크합니다
            </p>
            <Link href="/schedule">
              <Button variant="outline" className="w-full">일정 확인하기</Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">현황 대시보드</h3>
            <p className="text-muted-foreground mb-4">
              전체 환자의 검사·주사 현황을 한눈에 확인합니다
            </p>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">대시보드 보기</Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold mb-4">주요 기능</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
              <span className="text-sm">✅ 자동 일정 계산</span>
            </div>
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
              <span className="text-sm">📅 주기별 관리</span>
            </div>
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
              <span className="text-sm">🔔 알림 기능</span>
            </div>
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
              <span className="text-sm">📊 현황 분석</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
