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
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Checkbox } from '@heroui/checkbox';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Skeleton } from '@heroui/skeleton';
import { motion } from 'framer-motion';
import { UserPlus, Calendar, Clock, CheckCircle } from 'lucide-react';

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl"
    >
      <Card className="hover:shadow-xl transition-all duration-300">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            환자 등록
          </h1>
          <p className="text-slate-600 mt-2">
            환자 정보와 관리 항목을 입력하여 일정을 자동으로 생성합니다
          </p>
        </CardHeader>
        <CardBody className="pt-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">기본 정보</h3>
                  <Divider />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="patientNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">환자 번호</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="환자 번호를 입력하세요" 
                            variant="bordered"
                            size="lg"
                            startContent={
                              <div className="pointer-events-none flex items-center">
                                <span className="text-default-400 text-small">ID</span>
                              </div>
                            }
                            {...field} 
                          />
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
                        <FormLabel className="text-slate-700 font-medium">환자 이름</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="환자 이름을 입력하세요" 
                            variant="bordered"
                            size="lg"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </motion.div>
            
              {/* Management Items Selection */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">관리 항목 선택</h3>
                  <Divider />
                </div>
                
                {items.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
                            selectedItems.includes(item.id) 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                          }`}
                          isPressable
                          onPress={() => handleItemToggle(item.id, !selectedItems.includes(item.id))}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              isSelected={selectedItems.includes(item.id)}
                              onValueChange={(checked) => 
                                handleItemToggle(item.id, checked)
                              }
                              color="primary"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-800 mb-1">{item.name}</h4>
                              <Chip 
                                size="sm" 
                                color={item.type === 'test' ? 'primary' : 'secondary'}
                                variant="flat"
                              >
                                {item.type === 'test' ? '검사' : '주사'} · {item.period_value}{item.period_unit === 'weeks' ? '주' : '개월'} 주기
                              </Chip>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
                
                {selectedItems.length > 0 && (
                  <div className="mt-4">
                    <Chip color="primary" variant="flat" startContent={<CheckCircle className="w-4 h-4" />}>
                      {selectedItems.length}개 항목 선택됨
                    </Chip>
                  </div>
                )}
              </motion.div>
              
              {/* Date Settings */}
              {selectedItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">최초 시행일 설정</h3>
                    <Divider />
                  </div>
                  
                  <div className="space-y-4">
                    {schedules.map((schedule, index) => {
                      const item = items.find(i => i.id === schedule.itemId);
                      if (!item) return null;
                      
                      return (
                        <motion.div 
                          key={schedule.itemId} 
                          className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <div className="flex items-center gap-3 sm:min-w-[200px]">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div>
                              <span className="font-medium text-slate-800">{item.name}</span>
                              <Chip size="sm" color="primary" variant="flat" className="ml-2">
                                {item.period_value}{item.period_unit === 'weeks' ? '주' : '개월'} 주기
                              </Chip>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <FormField
                              control={form.control}
                              name={`schedules.${index}.firstDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      variant="bordered"
                                      size="lg"
                                      startContent={
                                        <Calendar className="w-4 h-4 text-default-400" />
                                      }
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              
              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="pt-4"
              >
                <Divider className="mb-6" />
                <Button 
                  type="submit" 
                  isDisabled={loading || selectedItems.length === 0} 
                  size="md"
                  color="primary"
                  className="font-semibold px-6"
                  startContent={loading ? <Clock className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                >
                  {loading ? '등록 중...' : '환자 등록하기'}
                </Button>
                
                {selectedItems.length === 0 && (
                  <p className="text-sm text-slate-500 text-center mt-2">
                    관리 항목을 최소 하나 이상 선택해주세요
                  </p>
                )}
              </motion.div>
            </form>
          </Form>
        </CardBody>
      </Card>
    </motion.div>
  );
}