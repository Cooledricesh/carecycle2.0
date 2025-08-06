# .claude 디렉토리 구조

이 디렉토리는 Claude Code의 프로젝트별 설정과 템플릿을 포함합니다.

## 파일 설명

### config.json
프로젝트의 Claude Code 설정 파일입니다. 다음 정보를 포함합니다:
- 프로젝트 메타데이터 (이름, 타입, 프레임워크 등)
- 코드 스타일 설정
- 명령어 매핑
- 의존성 정보
- 경로 설정
- 코딩 규칙

### ignore
Claude Code가 분석하거나 수정하지 않을 파일/폴더 패턴을 지정합니다.
`.gitignore`와 유사한 형식을 사용합니다.

### templates/
자주 사용하는 코드 패턴의 템플릿 모음입니다:

- **component.tsx**: React 컴포넌트 기본 템플릿
- **page.tsx**: Next.js App Router 페이지 템플릿
- **api-route.ts**: Next.js API 라우트 템플릿
- **hook.ts**: 커스텀 React Hook 템플릿
- **zustand-store.ts**: Zustand 상태 관리 스토어 템플릿
- **supabase-migration.sql**: Supabase 마이그레이션 템플릿
- **heroui-form.tsx**: HeroUI와 React Hook Form을 사용한 폼 템플릿

## 템플릿 사용법

템플릿의 `{{placeholder}}` 부분을 실제 값으로 교체하여 사용하세요:
- `{{ComponentName}}`: 컴포넌트 이름
- `{{HookName}}`: Hook 이름
- `{{StoreName}}`: Store 이름
- `{{FormName}}`: 폼 이름
- `{{table_name}}`: 테이블 이름
- `{{migration_name}}`: 마이그레이션 이름

## 설정 수정

필요에 따라 `config.json`을 수정하여 프로젝트 설정을 변경할 수 있습니다.
변경사항은 Claude Code의 다음 세션부터 적용됩니다.