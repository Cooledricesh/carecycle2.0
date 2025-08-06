# NextAuth 인증 가이드라인 for Claude Code

## 개요

NextAuth.js를 사용한 인증 시스템 구현 및 관리를 위한 가이드라인입니다.

## 필수 설정

### 환경 변수
```env
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers (필요시)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
```

### NEXTAUTH_SECRET 생성
```bash
openssl rand -base64 32
```

## 기본 구성

### auth.ts 설정
```typescript
// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    // 구글 로그인
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    
    // 카카오 로그인
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    
    // ID/PW 로그인
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" }
      },
      async authorize(credentials) {
        // Supabase 또는 DB에서 사용자 확인
        // 성공 시 사용자 객체 반환
        // 실패 시 null 반환
      }
    })
  ],
  
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/new-user"
  },
  
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    
    async signIn({ user, account, profile }) {
      // 추가 검증 로직
      return true; // 또는 false/redirect URL
    }
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};
```

## 세션 사용

### 서버 컴포넌트
```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function ServerComponent() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    // 미인증 상태 처리
  }
  
  return <div>안녕하세요, {session.user.name}님</div>;
}
```

### 클라이언트 컴포넌트
```typescript
'use client';

import { useSession } from "next-auth/react";

export default function ClientComponent() {
  const { data: session, status } = useSession();
  
  if (status === "loading") return <div>로딩 중...</div>;
  if (status === "unauthenticated") return <div>로그인이 필요합니다</div>;
  
  return <div>안녕하세요, {session?.user.name}님</div>;
}
```

## API 라우트 보호

```typescript
// app/api/protected/route.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // 인증된 사용자만 접근 가능한 로직
  return NextResponse.json({ data: "Protected data" });
}
```

## 미들웨어 설정

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // 추가 권한 검사
    const token = req.nextauth.token;
    
    if (req.nextUrl.pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/denied", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/protected/:path*"]
};
```

## 커스텀 로그인 페이지

```tsx
// app/auth/signin/page.tsx
'use client';

import { signIn } from "next-auth/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

export default function SignIn() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      callbackUrl: '/dashboard'
    });
  };

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto">
      <h1>로그인</h1>
      
      {/* OAuth 로그인 */}
      <Button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
        Google로 로그인
      </Button>
      
      <Button onClick={() => signIn('kakao', { callbackUrl: '/dashboard' })}>
        카카오로 로그인
      </Button>
      
      {/* 이메일/비밀번호 로그인 */}
      <form onSubmit={handleSubmit}>
        <Input name="email" type="email" label="이메일" required />
        <Input name="password" type="password" label="비밀번호" required />
        <Button type="submit">로그인</Button>
      </form>
    </div>
  );
}
```

## Supabase와 통합

```typescript
// ID/PW 로그인 시 Supabase 사용
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  
  if (error || !data.user) {
    return null;
  }
  
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata.name,
    role: data.user.user_metadata.role || 'user'
  };
}
```

## 타입 확장

```typescript
// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }
  
  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
```

## 보안 모범 사례

### 필수 사항
1. **NEXTAUTH_SECRET**: 강력한 무작위 문자열 사용 (최소 32자)
2. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS 사용
3. **CSRF 보호**: NextAuth가 자동으로 처리
4. **세션 만료**: 적절한 세션 만료 시간 설정

### 권장 사항
1. **Rate Limiting**: 로그인 시도 제한
2. **2FA**: 중요한 작업에는 2차 인증 추가
3. **로그인 기록**: 로그인 시도 및 성공 기록
4. **비정상 활동 감지**: 다중 기기 로그인 등 모니터링

## 에러 처리

### 에러 페이지
```tsx
// app/auth/error/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  
  const errorMessages = {
    Signin: "로그인 중 오류가 발생했습니다.",
    OAuthSignin: "OAuth 로그인 중 오류가 발생했습니다.",
    OAuthCallback: "OAuth 콜백 처리 중 오류가 발생했습니다.",
    Callback: "콜백 처리 중 오류가 발생했습니다.",
    CredentialsSignin: "이메일 또는 비밀번호가 올바르지 않습니다.",
    default: "인증 중 오류가 발생했습니다."
  };
  
  return (
    <div>
      <h1>인증 오류</h1>
      <p>{errorMessages[error as keyof typeof errorMessages] || errorMessages.default}</p>
    </div>
  );
}
```

## 디버깅

### 개발 환경 디버깅
```env
# .env.local
DEBUG=next-auth:*
```

### 일반적인 문제 해결
1. **세션이 null**: NEXTAUTH_URL과 실제 URL 확인
2. **OAuth 에러**: 콜백 URL 설정 확인
3. **쿠키 문제**: secure 옵션과 HTTPS 설정 확인
4. **CSRF 에러**: NEXTAUTH_URL 환경 변수 확인

## 배포 체크리스트

- [ ] NEXTAUTH_URL을 프로덕션 URL로 변경
- [ ] NEXTAUTH_SECRET 안전하게 설정
- [ ] OAuth 제공자의 콜백 URL 업데이트
- [ ] 데이터베이스 연결 확인
- [ ] HTTPS 설정 확인
- [ ] 세션 쿠키 설정 확인
- [ ] 에러 페이지 커스터마이징
- [ ] 로그인/로그아웃 플로우 테스트