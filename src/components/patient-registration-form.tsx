'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  patientNumber: z.string().min(1, '환자 번호를 입력해주세요'),
  name: z.string().min(1, '환자 이름을 입력해주세요'),
  schedules: z.array(z.object({
    itemId: z.string().min(1, '항목을 선택해주세요'),
    firstDate: z.string().min(1, '최초 시행일을 입력해주세요'),
    periodValue: z.number(),
    periodUnit: z.string()
  })).min(1, '최소 하나의 관리 항목을 추가해주세요')
});

type FormData = z.infer<typeof formSchema>;

interface Item {
  id: string;
  name: string;
  type: string;
  period_value: number;
  period_unit: string;
}

export function PatientRegistrationForm() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientNumber: '',
      name: '',
      schedules: []
    }
  });
  
  // Fetch available items on mount
  useEffect(() => {
    fetchItems();
  }, []);
  
  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: '오류',
        description: '관리 항목을 불러오는데 실패했습니다',
        variant: 'destructive'
      });
    }
  };
  
  const handleItemToggle = (itemId: string, checked: boolean) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
      const currentSchedules = form.getValues('schedules');
      form.setValue('schedules', [
        ...currentSchedules,
        {
          itemId: item.id,
          firstDate: '',
          periodValue: item.period_value,
          periodUnit: item.period_unit
        }
      ]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
      const currentSchedules = form.getValues('schedules');
      form.setValue(
        'schedules',
        currentSchedules.filter(s => s.itemId !== itemId)
      );
    }
  };
  
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to register patient');
      }
      
      toast({
        title: '성공',
        description: '환자가 성공적으로 등록되었습니다'
      });
      
      // Reset form
      form.reset();
      setSelectedItems([]);
      
    } catch (error) {
      console.error('Error registering patient:', error);
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '환자 등록에 실패했습니다',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const schedules = form.watch('schedules');
  
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>환자 등록</CardTitle>
        <CardDescription>
          환자 정보와 관리 항목을 입력하여 일정을 자동으로 생성합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>환자 번호</FormLabel>
                    <FormControl>
                      <Input placeholder="환자 번호 입력" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>환자 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="환자 이름 입력" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">관리 항목 선택</h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={item.id}
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => 
                          handleItemToggle(item.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={item.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {item.name} ({item.period_value}{item.period_unit === 'weeks' ? '주' : '개월'} 주기)
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">최초 시행일 설정</h3>
                  {schedules.map((schedule, index) => {
                    const item = items.find(i => i.id === schedule.itemId);
                    if (!item) return null;
                    
                    return (
                      <div key={schedule.itemId} className="flex items-center gap-3">
                        <span className="text-sm min-w-[150px]">{item.name}:</span>
                        <FormField
                          control={form.control}
                          name={`schedules.${index}.firstDate`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? '등록 중...' : '환자 등록'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}