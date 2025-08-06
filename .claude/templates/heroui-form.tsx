'use client';

import { FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';

const formSchema = z.object({
  // Define your schema here
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
});

type FormData = z.infer<typeof formSchema>;

interface {{FormName}}Props {
  onSubmit?: (data: FormData) => void | Promise<void>;
}

export const {{FormName}}: FC<{{FormName}}Props> = ({ onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit?.(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        {...register('email')}
        type="email"
        label="이메일"
        placeholder="email@example.com"
        errorMessage={errors.email?.message}
        isInvalid={!!errors.email}
      />

      <Input
        {...register('password')}
        type="password"
        label="비밀번호"
        placeholder="비밀번호를 입력하세요"
        errorMessage={errors.password?.message}
        isInvalid={!!errors.password}
      />

      <Button
        type="submit"
        color="primary"
        isLoading={isSubmitting}
        className="w-full"
      >
        제출
      </Button>
    </form>
  );
};