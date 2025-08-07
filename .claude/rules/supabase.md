# Supabase 가이드라인 for Claude Code

## 개요

Supabase를 사용한 데이터베이스 설계, 마이그레이션 작성, 그리고 클라이언트 사용에 대한 가이드라인입니다.

## 마이그레이션 작성 규칙

### 파일명 규칙
```
[번호]_[설명].sql
예: 0001_create_users_table.sql
예: 0002_add_posts_table.sql
```

### 마이그레이션 템플릿
```sql
-- Migration: [설명]
-- Created at: [타임스탬프]

BEGIN;

-- 테이블 생성
CREATE TABLE IF NOT EXISTS public.[테이블명] (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  -- 컬럼 정의
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  -- 인덱스 힌트를 위한 컬럼 순서 고려
);

-- RLS 활성화
ALTER TABLE public.[테이블명] ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_[테이블명]_updated_at
  BEFORE UPDATE ON public.[테이블명]
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS 정책
-- 1. 인증된 사용자는 자신의 데이터만 조회
CREATE POLICY "Users can view own data"
  ON public.[테이블명]
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. 인증된 사용자는 자신의 데이터만 생성
CREATE POLICY "Users can create own data"
  ON public.[테이블명]
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. 인증된 사용자는 자신의 데이터만 수정
CREATE POLICY "Users can update own data"
  ON public.[테이블명]
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. 인증된 사용자는 자신의 데이터만 삭제
CREATE POLICY "Users can delete own data"
  ON public.[테이블명]
  FOR DELETE
  USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX idx_[테이블명]_user_id ON public.[테이블명](user_id);
CREATE INDEX idx_[테이블명]_created_at ON public.[테이블명](created_at DESC);

-- 필요시 함수 생성
CREATE OR REPLACE FUNCTION public.get_[테이블명]_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.[테이블명]
    WHERE user_id = p_user_id
  );
END;
$$;

COMMIT;
```

### 헬퍼 함수 생성 (한 번만 실행)
```sql
-- 0000_create_helpers.sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$;
```

## 데이터 타입 가이드

### 권장 데이터 타입
- **ID**: `UUID` (gen_random_uuid() 사용)
- **텍스트**: `TEXT` (길이 제한 없음) 또는 `VARCHAR(n)`
- **숫자**: `INTEGER`, `BIGINT`, `NUMERIC(p,s)`
- **날짜/시간**: `TIMESTAMP WITH TIME ZONE`
- **불린**: `BOOLEAN`
- **JSON**: `JSONB` (JSON보다 성능 우수)
- **배열**: `TEXT[]`, `INTEGER[]` 등
- **ENUM**: CHECK 제약 조건 사용

### 타입 선택 예시
```sql
-- 사용자 프로필 테이블
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  location TEXT,
  birth_date DATE,
  phone VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  is_verified BOOLEAN DEFAULT false,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

## RLS (Row Level Security) 패턴

### 기본 패턴
```sql
-- 1. 공개 읽기, 인증된 쓰기
CREATE POLICY "Public read access"
  ON public.posts
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create"
  ON public.posts
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. 소유자만 접근
CREATE POLICY "Users can manage own data"
  ON public.user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. 역할 기반 접근
CREATE POLICY "Admins have full access"
  ON public.admin_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 4. 조건부 접근
CREATE POLICY "Published posts are public"
  ON public.posts
  FOR SELECT
  USING (
    status = 'published' 
    OR auth.uid() = author_id
  );
```

### 복잡한 정책 예시
```sql
-- 팀 멤버만 접근 가능
CREATE POLICY "Team members can access"
  ON public.team_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_documents.team_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );
```

## Supabase 클라이언트 설정

### 서버 클라이언트 (서버 컴포넌트용)
```typescript
// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // 서버 컴포넌트에서는 쿠키 설정 불가
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // 서버 컴포넌트에서는 쿠키 제거 불가
          }
        },
      },
    }
  )
}
```

### 브라우저 클라이언트 (클라이언트 컴포넌트용)
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

## 데이터 페칭 패턴

### 서버 컴포넌트에서 데이터 가져오기
```typescript
// app/posts/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function PostsPage() {
  const supabase = createClient()
  
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles(username, avatar_url),
      categories(name)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Error fetching posts:', error)
    return <div>포스트를 불러올 수 없습니다.</div>
  }
  
  return (
    <div>
      {posts?.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>작성자: {post.author.username}</p>
        </article>
      ))}
    </div>
  )
}
```

### React Query와 함께 사용
```typescript
// src/features/posts/api.ts
import { createClient } from '@/lib/supabase/client'

export async function getPosts(page = 1, limit = 10) {
  const supabase = createClient()
  const from = (page - 1) * limit
  
  const { data, error, count } = await supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .range(from, from + limit - 1)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return {
    posts: data || [],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  }
}

// 컴포넌트에서 사용
'use client'

import { useQuery } from '@tanstack/react-query'
import { getPosts } from '@/features/posts/api'

export function PostList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', 1],
    queryFn: () => getPosts(1, 10)
  })
  
  // ...
}
```

## 실시간 구독

```typescript
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealtimeMessages({ roomId }: { roomId: string }) {
  const supabase = createClient()
  
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('New message:', payload.new)
          // 메시지 추가 로직
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, supabase])
  
  // ...
}
```

## 파일 업로드

```typescript
// 파일 업로드 함수
export async function uploadFile(file: File, bucket: string, path: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) throw error
  
  // 공개 URL 가져오기
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return publicUrl
}

// 사용 예시
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  const fileName = `${Date.now()}-${file.name}`
  const filePath = `avatars/${userId}/${fileName}`
  
  try {
    const url = await uploadFile(file, 'avatars', filePath)
    // URL을 데이터베이스에 저장
  } catch (error) {
    console.error('Upload failed:', error)
  }
}
```

## 에러 처리

```typescript
// 표준 에러 처리 패턴
import { PostgrestError } from '@supabase/supabase-js'

export function handleSupabaseError(error: PostgrestError | null) {
  if (!error) return null
  
  // 일반적인 에러 코드
  const errorMessages: Record<string, string> = {
    '23505': '이미 존재하는 데이터입니다.',
    '23503': '참조하는 데이터가 존재하지 않습니다.',
    '23502': '필수 항목이 누락되었습니다.',
    '42501': '권한이 없습니다.',
    'PGRST116': '요청한 데이터를 찾을 수 없습니다.'
  }
  
  return errorMessages[error.code] || '오류가 발생했습니다.'
}
```

## 성능 최적화

### 인덱스 전략
```sql
-- 자주 조회되는 컬럼에 인덱스 추가
CREATE INDEX idx_posts_user_id_created_at 
  ON posts(user_id, created_at DESC);

-- 부분 인덱스 (조건부)
CREATE INDEX idx_posts_published 
  ON posts(created_at DESC) 
  WHERE status = 'published';

-- 전문 검색을 위한 GIN 인덱스
CREATE INDEX idx_posts_search 
  ON posts 
  USING gin(to_tsvector('english', title || ' ' || content));
```

### 쿼리 최적화
```typescript
// ❌ 나쁜 예: N+1 문제
const posts = await supabase.from('posts').select('*')
for (const post of posts.data) {
  const author = await supabase
    .from('profiles')
    .select('*')
    .eq('id', post.author_id)
    .single()
}

// ✅ 좋은 예: 조인 사용
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    author:profiles(username, avatar_url)
  `)
```

## 보안 고려사항

1. **환경 변수**: 절대 anon key 외의 키를 클라이언트에 노출하지 않음
2. **RLS 필수**: 모든 테이블에 RLS 활성화
3. **입력 검증**: 클라이언트와 서버 모두에서 검증
4. **SQL 인젝션**: Supabase 클라이언트는 자동으로 방지
5. **CORS**: Supabase 대시보드에서 허용 도메인 설정

## 마이그레이션 실행

```bash
# 로컬에서 마이그레이션 생성
supabase migration new create_posts_table

# 마이그레이션 실행
supabase db push

# 프로덕션 적용
# Supabase 대시보드의 SQL Editor에서 직접 실행
```

## 백업 및 복구

- Supabase 대시보드에서 자동 백업 설정
- Point-in-time recovery 활용
- 중요 데이터는 정기적으로 내보내기

## 모니터링

- Supabase 대시보드의 Logs 섹션 활용
- 느린 쿼리 모니터링
- Storage 사용량 확인
- API 요청 제한 모니터링