'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { careItemsService, CareItem, CareItemInput, CareItemType, CareItemWithDisplay } from '@/services/care-items.service';
import { useToast } from '@/hooks/use-toast';

export function useCareItems(type?: CareItemType) {
  return useQuery({
    queryKey: ['care-items', type],
    queryFn: () => careItemsService.getCareItems(type),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCareItemsWithDisplay() {
  return useQuery({
    queryKey: ['care-items-view'],
    queryFn: () => careItemsService.getCareItemsWithDisplay(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCareItem(id: string) {
  return useQuery({
    queryKey: ['care-item', id],
    queryFn: () => careItemsService.getCareItemById(id),
    enabled: !!id,
  });
}

export function useCreateCareItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CareItemInput) => careItemsService.createCareItem(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['care-items'] });
      queryClient.invalidateQueries({ queryKey: ['care-items-view'] });
      toast({
        title: '항목 추가 완료',
        description: `${data.name} 항목이 성공적으로 추가되었습니다.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '항목 추가 실패',
        description: error.message || '항목 추가 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCareItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CareItemInput> }) =>
      careItemsService.updateCareItem(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['care-items'] });
      queryClient.invalidateQueries({ queryKey: ['care-items-view'] });
      queryClient.invalidateQueries({ queryKey: ['care-item', data.id] });
      toast({
        title: '항목 수정 완료',
        description: `${data.name} 항목이 성공적으로 수정되었습니다.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '항목 수정 실패',
        description: error.message || '항목 수정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCareItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => careItemsService.deleteCareItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-items'] });
      queryClient.invalidateQueries({ queryKey: ['care-items-view'] });
      toast({
        title: '항목 삭제 완료',
        description: '항목이 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '항목 삭제 실패',
        description: error.message || '항목 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

export function useSearchCareItems(searchTerm: string, type?: CareItemType) {
  return useQuery({
    queryKey: ['care-items-search', searchTerm, type],
    queryFn: () => careItemsService.searchCareItems(searchTerm, type),
    enabled: searchTerm.length > 0,
  });
}