# Claude Code Context File

## 프로젝트 핵심 정보

### 기술 스택
- **Framework**: Next.js 15.1.0 (App Router)
- **Language**: TypeScript
- **UI Library**: HeroUI (NextUI variant)
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand + React Query
- **Auth**: NextAuth
- **Database**: Supabase
- **Forms**: React Hook Form + Zod

### 중요 규칙 참조
작업 시 다음 규칙 파일을 반드시 확인하세요:

1. **모든 작업**: `.claude/rules/global.md`
2. **UI 작업**: `.claude/rules/heroui.md`
3. **인증 작업**: `.claude/rules/auth.md`
4. **DB 작업**: `.claude/rules/supabase.md`

### 코드 작성 체크리스트

#### 컴포넌트 생성 시
- [ ] `'use client'` 지시어 추가
- [ ] HeroUI 컴포넌트 사용
- [ ] 반응형 디자인 적용
- [ ] 접근성 고려
- [ ] 한글 UTF-8 인코딩 확인

#### API 라우트 생성 시
- [ ] NextAuth 세션 확인
- [ ] 에러 핸들링 구현
- [ ] 적절한 HTTP 상태 코드 반환
- [ ] Supabase RLS 정책 확인

#### 데이터베이스 작업 시
- [ ] 마이그레이션 파일 생성
- [ ] RLS 정책 추가
- [ ] updated_at 트리거 설정
- [ ] 인덱스 최적화

### 자주 사용하는 패턴

#### 페이지 컴포넌트
```typescript
'use client';

export default async function Page({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  // ...
}
```

#### 데이터 페칭 (React Query)
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['key'],
  queryFn: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('table')
      .select('*');
    if (error) throw error;
    return data;
  }
});
```

#### 폼 처리
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
});
```

### 프로젝트 구조 빠른 참조
```
src/
├── app/          # 페이지와 라우트
├── components/   # 공통 컴포넌트
├── features/     # 기능별 모듈
├── hooks/        # 커스텀 훅
├── lib/          # 유틸리티
└── .claude/      # Claude 설정
    ├── rules/    # 개발 규칙
    └── templates/ # 코드 템플릿
```

### 디버깅 팁
1. **Hydration 에러**: dynamic import 사용
2. **타입 에러**: React 18.3.3 버전 확인
3. **Provider 에러**: providers.tsx 확인
4. **RLS 에러**: Supabase 정책 확인

### 명령어 빠른 참조
```bash
npm run dev      # 개발 서버
npm run build    # 빌드
npm run lint     # 린트
npm install      # 의존성 설치
```

### 환경 변수 체크리스트
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

## 작업 시작 전 확인사항
1. 어떤 기능을 구현하는가? → 관련 규칙 파일 확인
2. 어떤 라이브러리를 사용하는가? → package.json 확인
3. 비슷한 기능이 있는가? → 기존 코드 참조
4. 테스트가 필요한가? → 테스트 전략 확인