# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 IMPORTANT: Always Check Rules Before Working

Before starting any task, consult the appropriate rule files in `.claude/rules/`:
- **Always apply**: `.claude/rules/global.md`
- **UI/Component work**: `.claude/rules/heroui.md`
- **Authentication work**: `.claude/rules/auth.md`
- **Database work**: `.claude/rules/supabase.md`

Quick context reference: `.claude/context.md`

## Project Overview

This is a Next.js 15.1.0 application built with TypeScript, using the App Router architecture. The project was generated using EasyNext and includes authentication with NextAuth, database integration with Supabase, and uses HeroUI (a NextUI variant) as the primary component library.

## Core Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### EasyNext CLI Commands
```bash
easynext lang ko           # Switch to Korean language
easynext supabase         # Configure Supabase
easynext auth             # Configure NextAuth
easynext auth idpw        # Add ID/Password authentication
easynext auth kakao       # Add Kakao authentication
easynext gtag             # Add Google Analytics
easynext clarity          # Add Microsoft Clarity
easynext channelio        # Add ChannelIO
easynext sentry           # Add Sentry
easynext adsense          # Add Google Adsense
```

### Installing Dependencies
After updating package.json, run:
```bash
npm install          # Install all dependencies
```

## Architecture & Structure

### Directory Layout
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── auth/          # NextAuth API endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── providers.tsx      # App-wide providers
├── components/            # Shared components
│   ├── auth/             # Authentication components
│   └── ui/               # UI components (previously Shadcn, now for HeroUI)
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and configs
│   ├── auth.ts          # NextAuth configuration
│   ├── supabase/        # Supabase client setup
│   └── utils.ts         # Common utilities
└── features/            # Feature-based modules (when needed)
    └── [featureName]/
        ├── components/
        ├── constants/
        ├── hooks/
        ├── lib/
        └── api.ts
```

### Key Technical Decisions

1. **Client Components by Default**: All components use the `'use client'` directive
2. **Promise-based Page Props**: Page components use promise-based params
3. **Authentication**: NextAuth with JWT strategy, session stored in cookies
4. **Database**: Supabase with Row Level Security (RLS)
5. **State Management**: 
   - Server state: @tanstack/react-query
   - Client state: Zustand
6. **Styling**: Tailwind CSS v4 with HeroUI components
7. **Forms**: react-hook-form with Zod validation

## Important Patterns

### Page Component Pattern
```typescript
'use client';

export default async function Page({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  // Component logic
}
```

### Supabase Migrations
- Store migration files in `/supabase/migrations/`
- Use unique numbered prefixes (e.g., `0001_create_users_table.sql`)
- Always include `IF NOT EXISTS` clauses
- Add `updated_at` triggers to all tables

### Authentication Flow
- NextAuth configured at `/src/lib/auth.ts`
- Session includes user ID via JWT callback
- Protected routes use NextAuth session checks
- Auth providers configured in environment variables

## Development Guidelines

### UI Components with HeroUI
HeroUI is a modern React UI library built on top of Tailwind CSS and React Aria. Key features:
- Fully typed components
- Built-in dark mode support
- Accessible by default (WCAG compliant)
- Tailwind variants for styling

Available HeroUI components:
- @heroui/button
- @heroui/input
- @heroui/navbar
- @heroui/switch
- @heroui/listbox
- @heroui/code
- @heroui/kbd
- @heroui/link
- @heroui/snippet
- @heroui/system (provider)
- @heroui/theme (theming utilities)

### TypeScript Configuration
- Strict mode enabled (except `strictNullChecks`)
- Path alias: `@/*` maps to `./src/*`
- No implicit any allowed: false (for flexibility)
- React types pinned to 18.3.3 for HeroUI compatibility

### ESLint & Code Quality
- ESLint errors ignored during builds
- Follow functional programming principles
- Prefer composition over inheritance
- Use early returns for clarity

### Tailwind CSS v4 Configuration
- Using Tailwind CSS v4 with @tailwindcss/postcss
- HeroUI plugin integrated for component styles
- Dark mode configured with class strategy
- Content paths include HeroUI theme files

### Performance Considerations
- Images: Remote patterns allowed from all hosts
- Development: Turbopack enabled for faster builds
- Avoid premature optimization
- HeroUI components are optimized for performance

## Environment Variables

Required for production:
- `NEXTAUTH_URL`: Application URL
- `NEXTAUTH_SECRET`: Secret for JWT encryption
- Supabase credentials (when using Supabase)
- OAuth provider credentials (when using social login)

## Testing Strategy

Check README.md or package.json for specific test commands. The project includes:
- Unit tests for core functionality
- Integration tests for API routes
- Component testing setup

## Deployment Notes

- Build output compatible with Vercel
- Static assets served from `/public`
- API routes deployed as serverless functions
- Environment variables must be configured in deployment platform

## Code Examples

### 1. Component Structure Pattern (Client Component)
```typescript
// src/app/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

export default function Home() {
  const { toast } = useToast();
  
  const handleAction = () => {
    toast({
      description: 'Action completed',
    });
  };

  return (
    <div className="flex min-h-screen">
      <Button onClick={handleAction}>Click Me</Button>
    </div>
  );
}
```

### 2. Provider Setup Pattern
```typescript
// src/app/providers.tsx
'use client';

import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClientProvider } from '@tanstack/react-query';

export default function Providers({ children }: ProvidersProps) {
  const router = useRouter();
  const queryClient = getQueryClient();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider 
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
```

### 3. Form Handling Pattern with react-hook-form
```typescript
// Example form component
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function LoginForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Handle form submission
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

### 4. State Management with Zustand
```typescript
// src/stores/user-store.ts
import { create } from 'zustand';

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

### 5. Data Fetching with TanStack Query
```typescript
// src/hooks/use-data.ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function useUserData(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/users/${userId}`);
      return data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### 6. Styling with Tailwind Variants (CVA)
```typescript
// src/components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

### 7. NextAuth Configuration
```typescript
// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    // Add providers here
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
};
```

### 8. Supabase Client Pattern
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Usage in component
const supabase = createClient();
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId);
```

<vooster-docs>
- @vooster-docs/prd.md
- @vooster-docs/architecture.md
- @vooster-docs/step-by-step.md
- @vooster-docs/tdd.md
- @vooster-docs/clean-code.md
- @vooster-docs/git-commit-message.md
</vooster-docs>

## Security Notes

### Supabase API Key Management
- **2025 Update**: Use new Supabase API key format (sb_publishable_*, sb_secret_*)
- Do NOT use legacy anon keys or service role keys
- Always refer to the latest Supabase documentation for key management best practices

These examples should be used as guidance when configuring Sentry functionality within a project.

# Exception Catching

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.
Use this in try catch blocks or areas where exceptions are expected

# Tracing Examples

Spans should be created for meaningful actions within an applications like button clicks, API calls, and function calls
Use the `Sentry.startSpan` function to create a span
Child spans can exist within a parent span

## Custom Span instrumentation in component actions

The `name` and `op` properties should be meaninful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
function TestComponent() {
  const handleTestButtonClick = () => {
    // Create a transaction/span to measure performance
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        const value = "some config";
        const metric = "some metric";

        // Metrics can be added to the span
        span.setAttribute("config", value);
        span.setAttribute("metric", metric);

        doSomething();
      },
    );
  };

  return (
    <button type="button" onClick={handleTestButtonClick}>
      Test Sentry
    </button>
  );
}
```

## Custom span instrumentation in API calls

The `name` and `op` properties should be meaninful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
async function fetchUserData(userId) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`,
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    },
  );
}
```

# Logs

Where logs are used, ensure Sentry is imported using `import * as Sentry from "@sentry/nextjs"`
Enable logging in Sentry using `Sentry.init({ _experiments: { enableLogs: true } })`
Reference the logger using `const { logger } = Sentry`
Sentry offers a consoleLoggingIntegration that can be used to log specific console error types automatically without instrumenting the individual logger calls

## Configuration

In NextJS the client side Sentry initialization is in `instrumentation-client.ts`, the server initialization is in `sentry.edge.config.ts` and the edge initialization is in `sentry.server.config.ts`
Initialization does not need to be repeated in other files, it only needs to happen the files mentioned above. You should use `import * as Sentry from "@sentry/nextjs"` to reference Sentry functionality

### Baseline

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://4a87037e5f47207b871c370ec6836ab9@o4509801147334656.ingest.us.sentry.io/4509801148907520",

  _experiments: {
    enableLogs: true,
  },
});
```

### Logger Integration

```javascript
Sentry.init({
  dsn: "https://4a87037e5f47207b871c370ec6836ab9@o4509801147334656.ingest.us.sentry.io/4509801148907520",
  integrations: [
    // send console.log, console.error, and console.warn calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],
});
```

## Logger Examples

`logger.fmt` is a template literal function that should be used to bring variables into the structured logs.

```javascript
logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false,
});
logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99,
});
logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100,
});
```