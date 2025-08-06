# Claude Code 빠른 참조 가이드

## 🎯 작업 시작 전 체크리스트

```bash
# 1. 어떤 작업인가?
- [ ] UI/컴포넌트 → heroui.md 확인
- [ ] 인증 → auth.md 확인
- [ ] DB → supabase.md 확인
- [ ] 일반 → global.md 확인

# 2. 관련 파일 확인
- [ ] 비슷한 기능이 이미 있는지 검색
- [ ] 필요한 라이브러리가 설치되어 있는지 확인
- [ ] 환경 변수가 설정되어 있는지 확인
```

## 🚀 자주 사용하는 명령어

### 컴포넌트 생성
```typescript
// 1. .claude/rules/heroui.md 확인
// 2. 템플릿 사용: .claude/templates/component.tsx
'use client';

import { Button } from "@heroui/button";

export const MyComponent = () => {
  return <Button>클릭</Button>;
};
```

### 페이지 생성
```typescript
// 1. .claude/rules/global.md 확인
// 2. 템플릿 사용: .claude/templates/page.tsx
'use client';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <main>페이지 내용</main>;
}
```

### API 라우트 생성
```typescript
// 1. .claude/rules/auth.md 확인
// 2. 템플릿 사용: .claude/templates/api-route.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  // ...
}
```

### 마이그레이션 생성
```sql
-- 1. .claude/rules/supabase.md 확인
-- 2. 템플릿 사용: .claude/templates/supabase-migration.sql
-- 3. 파일명: supabase/migrations/[번호]_[설명].sql
```

## 📋 컨텍스트별 규칙 적용

| 작업 유형 | 필수 규칙 | 추가 규칙 |
|---------|----------|----------|
| 새 컴포넌트 | global.md | heroui.md |
| 새 페이지 | global.md | heroui.md, auth.md |
| API 엔드포인트 | global.md | auth.md, supabase.md |
| DB 마이그레이션 | supabase.md | - |
| 폼 구현 | global.md | heroui.md |
| 인증 기능 | auth.md | supabase.md |

## 🔍 디버깅 가이드

### Hydration 에러
```typescript
// dynamic import 사용
const Component = dynamic(() => import('./Component'), { ssr: false });
```

### 타입 에러
```bash
# React 버전 확인 (18.3.3이어야 함)
npm list @types/react
```

### Provider 에러
```typescript
// providers.tsx 확인
// HeroUIProvider가 최상위에 있는지 확인
```

## 💡 프로 팁

1. **코드 생성 전**: 항상 관련 규칙 파일 확인
2. **import 순서**: React → 외부 라이브러리 → 내부 모듈
3. **파일명**: kebab-case 사용 (예: user-profile.tsx)
4. **컴포넌트명**: PascalCase 사용 (예: UserProfile)
5. **한글 사용 시**: UTF-8 인코딩 확인 필수

## 🔗 빠른 링크

- 규칙: `.claude/rules/`
- 템플릿: `.claude/templates/`
- 컨텍스트: `.claude/context.md`
- 설정: `.claude/config.json`