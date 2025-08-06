# HeroUI 컴포넌트 가이드라인 for Claude Code

## 개요

HeroUI는 NextUI의 변형으로, Tailwind CSS와 React Aria를 기반으로 한 현대적인 React UI 라이브러리입니다.

## 기본 설정

### Provider 설정
```tsx
// src/app/providers.tsx
'use client';

import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
```

## 주요 컴포넌트 사용법

### Button
```tsx
import { Button } from "@heroui/button";

// 기본 사용
<Button>클릭하세요</Button>

// 변형(Variants)
<Button color="primary">Primary</Button>
<Button color="secondary">Secondary</Button>
<Button color="success">Success</Button>
<Button color="warning">Warning</Button>
<Button color="danger">Danger</Button>

// 크기
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// 스타일
<Button variant="solid">Solid</Button>
<Button variant="bordered">Bordered</Button>
<Button variant="light">Light</Button>
<Button variant="flat">Flat</Button>
<Button variant="faded">Faded</Button>
<Button variant="shadow">Shadow</Button>
<Button variant="ghost">Ghost</Button>

// 상태
<Button isLoading>Loading</Button>
<Button isDisabled>Disabled</Button>

// 아이콘과 함께
<Button startContent={<Icon />}>With Icon</Button>
<Button isIconOnly><Icon /></Button>
```

### Input
```tsx
import { Input } from "@heroui/input";

// 기본 사용
<Input label="이메일" placeholder="email@example.com" />

// 타입
<Input type="email" label="이메일" />
<Input type="password" label="비밀번호" />
<Input type="number" label="나이" />

// 변형
<Input variant="flat" />
<Input variant="bordered" />
<Input variant="faded" />
<Input variant="underlined" />

// 상태
<Input isRequired label="필수 입력" />
<Input isInvalid errorMessage="올바른 이메일을 입력하세요" />
<Input isDisabled label="비활성화" />
<Input isReadOnly value="읽기 전용" />

// 추가 기능
<Input
  label="비밀번호"
  type="password"
  description="8자 이상 입력하세요"
  startContent={<LockIcon />}
  endContent={
    <button onClick={toggleVisibility}>
      {isVisible ? <EyeIcon /> : <EyeSlashIcon />}
    </button>
  }
/>
```

### Card
```tsx
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";

<Card>
  <CardHeader>
    <h4>카드 제목</h4>
  </CardHeader>
  <CardBody>
    <p>카드 내용이 여기에 표시됩니다.</p>
  </CardBody>
  <CardFooter>
    <Button>액션</Button>
  </CardFooter>
</Card>

// 상호작용 가능한 카드
<Card isPressable onPress={() => console.log("pressed")}>
  <CardBody>
    <p>클릭 가능한 카드</p>
  </CardBody>
</Card>

// 그림자 효과
<Card shadow="sm">작은 그림자</Card>
<Card shadow="md">중간 그림자</Card>
<Card shadow="lg">큰 그림자</Card>
```

### Modal
```tsx
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";

function MyModal() {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  return (
    <>
      <Button onPress={onOpen}>모달 열기</Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>모달 제목</ModalHeader>
              <ModalBody>
                <p>모달 내용이 여기에 표시됩니다.</p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  닫기
                </Button>
                <Button color="primary" onPress={onClose}>
                  확인
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
```

### Select
```tsx
import { Select, SelectItem } from "@heroui/select";

<Select label="과일 선택" placeholder="좋아하는 과일을 선택하세요">
  <SelectItem key="apple" value="apple">사과</SelectItem>
  <SelectItem key="banana" value="banana">바나나</SelectItem>
  <SelectItem key="orange" value="orange">오렌지</SelectItem>
</Select>

// 다중 선택
<Select
  label="과일 선택"
  placeholder="여러 개 선택 가능"
  selectionMode="multiple"
>
  {fruits.map((fruit) => (
    <SelectItem key={fruit.value} value={fruit.value}>
      {fruit.label}
    </SelectItem>
  ))}
</Select>
```

### Table
```tsx
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";

<Table aria-label="사용자 테이블">
  <TableHeader>
    <TableColumn>이름</TableColumn>
    <TableColumn>이메일</TableColumn>
    <TableColumn>역할</TableColumn>
    <TableColumn>상태</TableColumn>
  </TableHeader>
  <TableBody>
    <TableRow key="1">
      <TableCell>홍길동</TableCell>
      <TableCell>hong@example.com</TableCell>
      <TableCell>개발자</TableCell>
      <TableCell>활성</TableCell>
    </TableRow>
    {/* 더 많은 행들... */}
  </TableBody>
</Table>

// 선택 가능한 테이블
<Table
  selectionMode="multiple"
  selectedKeys={selectedKeys}
  onSelectionChange={setSelectedKeys}
>
  {/* ... */}
</Table>
```

### Navbar
```tsx
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from "@heroui/navbar";

<Navbar>
  <NavbarBrand>
    <p className="font-bold text-inherit">ACME</p>
  </NavbarBrand>
  <NavbarContent className="hidden sm:flex gap-4" justify="center">
    <NavbarItem>
      <Link href="/">홈</Link>
    </NavbarItem>
    <NavbarItem isActive>
      <Link href="/about">소개</Link>
    </NavbarItem>
    <NavbarItem>
      <Link href="/contact">연락처</Link>
    </NavbarItem>
  </NavbarContent>
  <NavbarContent justify="end">
    <NavbarItem>
      <Button as={Link} color="primary" href="/signup" variant="flat">
        회원가입
      </Button>
    </NavbarItem>
  </NavbarContent>
</Navbar>
```

### Switch
```tsx
import { Switch } from "@heroui/switch";

<Switch defaultSelected>와이파이</Switch>

// 크기
<Switch size="sm">Small</Switch>
<Switch size="md">Medium</Switch>
<Switch size="lg">Large</Switch>

// 색상
<Switch color="primary">Primary</Switch>
<Switch color="secondary">Secondary</Switch>
<Switch color="success">Success</Switch>
```

## 폼과 함께 사용하기

### React Hook Form 통합
```tsx
import { useForm, Controller } from "react-hook-form";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";

function MyForm() {
  const { control, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="email"
        control={control}
        rules={{ required: "이메일은 필수입니다" }}
        render={({ field }) => (
          <Input
            {...field}
            type="email"
            label="이메일"
            placeholder="email@example.com"
            isInvalid={!!errors.email}
            errorMessage={errors.email?.message}
          />
        )}
      />
      
      <Controller
        name="country"
        control={control}
        render={({ field }) => (
          <Select
            {...field}
            label="국가"
            placeholder="국가를 선택하세요"
          >
            <SelectItem key="kr" value="kr">한국</SelectItem>
            <SelectItem key="us" value="us">미국</SelectItem>
            <SelectItem key="jp" value="jp">일본</SelectItem>
          </Select>
        )}
      />
      
      <Controller
        name="newsletter"
        control={control}
        render={({ field }) => (
          <Switch {...field}>
            뉴스레터 구독
          </Switch>
        )}
      />
      
      <Button type="submit">제출</Button>
    </form>
  );
}
```

## 테마 커스터마이징

### 색상 커스터마이징
```tsx
// tailwind.config.ts
import { heroui } from "@heroui/theme";

export default {
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#0070F3",
              foreground: "#FFFFFF",
            },
            secondary: {
              DEFAULT: "#7928CA",
              foreground: "#FFFFFF",
            },
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: "#0096FF",
              foreground: "#000000",
            },
          },
        },
      },
    }),
  ],
};
```

## 접근성 고려사항

1. **키보드 네비게이션**: 모든 HeroUI 컴포넌트는 키보드로 완전히 접근 가능
2. **스크린 리더**: ARIA 레이블과 설명 자동 포함
3. **포커스 관리**: 적절한 포커스 표시와 포커스 트랩
4. **색상 대비**: WCAG 가이드라인 준수

## 성능 최적화

1. **트리 쉐이킹**: 사용하는 컴포넌트만 번들에 포함
2. **레이지 로딩**: 동적 임포트 활용
```tsx
const Modal = dynamic(() => import("@heroui/modal").then(mod => mod.Modal), {
  ssr: false,
});
```

3. **CSS 최적화**: Tailwind CSS의 퍼지 기능 활용

## 일반적인 패턴

### 로딩 상태
```tsx
function DataList() {
  const { data, isLoading } = useQuery(['data'], fetchData);
  
  if (isLoading) {
    return (
      <div className="flex gap-3">
        <Skeleton className="w-full h-10" />
        <Skeleton className="w-full h-10" />
        <Skeleton className="w-full h-10" />
      </div>
    );
  }
  
  return (
    <div>
      {data.map(item => (
        <Card key={item.id}>
          {/* ... */}
        </Card>
      ))}
    </div>
  );
}
```

### 반응형 디자인
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>
      {/* ... */}
    </Card>
  ))}
</div>
```

## 문제 해결

1. **Hydration 오류**: 클라이언트 전용 컴포넌트는 dynamic import 사용
2. **스타일 충돌**: Tailwind 클래스 우선순위 확인
3. **타입 오류**: @types/react 버전 확인 (18.3.3 권장)
4. **Provider 오류**: HeroUIProvider가 최상위에 있는지 확인