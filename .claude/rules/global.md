# Global Development Guidelines for Claude Code

## 필수 규칙

- 모든 컴포넌트는 클라이언트 컴포넌트로 작성 (`'use client'` 지시어 사용)
- page.tsx의 params props는 항상 Promise로 처리
- 플레이스홀더 이미지는 picsum.photos 사용
- 한글 텍스트는 UTF-8 인코딩 확인 필수

## 주요 라이브러리 사용 가이드

### UI & 스타일링
- **HeroUI**: 메인 UI 컴포넌트 라이브러리
- **Tailwind CSS v4**: 유틸리티 기반 스타일링
- **lucide-react**: 아이콘 라이브러리
- **framer-motion**: 애니메이션 라이브러리

### 상태 관리
- **@tanstack/react-query**: 서버 상태 관리
- **zustand**: 클라이언트 전역 상태 관리

### 폼 & 유효성 검사
- **react-hook-form**: 폼 상태 관리
- **zod**: 스키마 검증
- **@hookform/resolvers**: zod와 react-hook-form 연결

### 유틸리티
- **date-fns**: 날짜/시간 처리
- **ts-pattern**: 타입 안전 패턴 매칭
- **es-toolkit**: 유틸리티 함수
- **react-use**: React 커스텀 훅 모음

### 백엔드 서비스
- **Supabase**: BaaS (Backend as a Service)
- **NextAuth**: 인증 처리

## 디렉토리 구조

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API 라우트
│   └── (routes)/                 # 페이지 라우트
├── components/                   # 공통 컴포넌트
│   ├── ui/                      # HeroUI 래핑 컴포넌트
│   └── auth/                    # 인증 관련 컴포넌트
├── features/                     # 기능별 모듈
│   └── [featureName]/
│       ├── components/          # 기능별 컴포넌트
│       ├── hooks/               # 기능별 훅
│       ├── lib/                 # 기능별 유틸리티
│       └── api.ts               # API 함수
├── hooks/                        # 공통 훅
├── lib/                         # 공통 유틸리티
└── constants/                    # 전역 상수
```

## 코드 작성 원칙

### 핵심 가치
1. **단순성 (Simplicity)**: 복잡한 것보다 간단한 해결책 선호
2. **가독성 (Readability)**: 누구나 이해할 수 있는 코드
3. **유지보수성 (Maintainability)**: 변경이 쉬운 구조
4. **테스트 가능성 (Testability)**: 테스트하기 쉬운 설계
5. **재사용성 (Reusability)**: DRY 원칙 준수

### 코딩 스타일
- **Early Returns**: 조건문에서 빠른 반환 사용
- **명확한 네이밍**: 변수명과 함수명은 의도를 명확히 표현
- **함수형 프로그래밍**: 불변성, 순수 함수 선호
- **컴포지션**: 상속보다 조합 사용
- **최소한의 주석**: 코드 자체가 문서가 되도록 작성

### TypeScript 사용
- 타입 안전성 최우선
- `any` 타입 사용 최소화
- 인터페이스와 타입 별칭 적절히 활용
- 제네릭을 통한 재사용성 확보

## Next.js 특화 규칙

### App Router
- 모든 페이지는 비동기 컴포넌트로 작성
- params와 searchParams는 Promise로 처리
- 레이아웃 컴포넌트 적극 활용
- 에러 및 로딩 상태 처리 필수

### API Routes
- RESTful 원칙 준수
- 적절한 HTTP 상태 코드 반환
- 에러 핸들링 표준화
- NextResponse 사용

## HeroUI 컴포넌트 사용

### 설치 방법
```bash
# HeroUI는 이미 package.json에 포함됨
npm install
```

### 사용 예시
```tsx
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card } from "@heroui/card";
```

### 테마 설정
- 다크 모드 지원 기본 탑재
- Tailwind CSS와 완벽 호환
- 커스텀 테마 변수 사용 가능

## Supabase 사용 가이드

### 마이그레이션
- 모든 마이그레이션은 `/supabase/migrations/` 디렉토리에 저장
- 파일명: `[번호]_[설명].sql` 형식
- RLS (Row Level Security) 정책 필수
- updated_at 트리거 자동 생성

### 클라이언트 사용
- 서버 컴포넌트: `createServerClient` 사용
- 클라이언트 컴포넌트: `createBrowserClient` 사용
- 인증 상태는 NextAuth와 연동

## 성능 최적화

### 기본 원칙
- 조기 최적화 지양
- 측정 후 최적화
- 필요한 곳에만 적용
- 최적화 내용 문서화

### 권장 사항
- 이미지 최적화: Next.js Image 컴포넌트 사용
- 코드 스플리팅: dynamic import 활용
- 메모이제이션: React.memo, useMemo 적절히 사용
- 서버 컴포넌트 최대한 활용

## 에러 처리

### 표준 패턴
- try-catch 블록 사용
- 에러 바운더리 구현
- 사용자 친화적 에러 메시지
- 에러 로깅 구현

### API 에러
- 일관된 에러 응답 형식
- 적절한 HTTP 상태 코드
- 상세한 에러 정보 제공

## 테스팅

### 단위 테스트
- 핵심 비즈니스 로직 우선
- 유틸리티 함수 테스트
- 커스텀 훅 테스트

### 통합 테스트
- API 라우트 테스트
- 컴포넌트 상호작용 테스트
- E2E 테스트 고려

## 보안 고려사항

### 인증/인가
- NextAuth 세션 활용
- API 라우트 보호
- 클라이언트 사이드 검증은 보조 수단

### 데이터 보호
- 환경 변수로 민감 정보 관리
- SQL 인젝션 방지
- XSS 공격 방지

## 접근성 (a11y)

- HeroUI 컴포넌트의 기본 접근성 활용
- 시맨틱 HTML 사용
- ARIA 레이블 적절히 추가
- 키보드 네비게이션 지원

## 국제화 (i18n)

- 한국어 우선 지원
- UTF-8 인코딩 확인
- 날짜/시간 형식 현지화
- 숫자 형식 현지화

## 배포 고려사항

- 환경 변수 설정 확인
- 빌드 최적화
- 에러 모니터링 설정
- 성능 모니터링 구현