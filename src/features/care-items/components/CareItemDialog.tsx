'use client';

import { useState } from 'react';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/modal';
import { Select, SelectItem } from '@heroui/select';
import { Textarea } from '@heroui/input';
import { Plus } from 'lucide-react';
import { useCreateCareItem } from '@/hooks/use-care-items';
import { careItemsService, CareItemType, CareItemInput } from '@/services/care-items.service';

interface CareItemDialogProps {
  onSuccess?: () => void;
  triggerClassName?: string;
}

export function CareItemDialog({ onSuccess, triggerClassName }: CareItemDialogProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const createCareItem = useCreateCareItem();
  const [formData, setFormData] = useState<CareItemInput>({
    name: '',
    type: 'procedure',
    interval_weeks: 4,
    description: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    const validation = careItemsService.validateCareItemInput(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await createCareItem.mutateAsync(formData);
      onOpenChange();
      setFormData({
        name: '',
        type: 'procedure',
        interval_weeks: 4,
        description: '',
      });
      setErrors([]);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create care item:', error);
    }
  };

  const intervalOptions = [
    { value: 1, label: '매주' },
    { value: 2, label: '격주' },
    { value: 4, label: '매월' },
    { value: 12, label: '분기별' },
    { value: 26, label: '반기별' },
    { value: 52, label: '연간' },
  ];

  return (
    <>
      <Button
        onPress={onOpen}
        color="primary"
        startContent={<Plus className="h-4 w-4" />}
        className={triggerClassName}
      >
        항목 추가
      </Button>

      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                새 항목 추가
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="항목 이름"
                    placeholder="예: 혈액검사, 인슐린 주사"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    isRequired
                  />

                  <Select
                    label="항목 유형"
                    placeholder="유형 선택"
                    selectedKeys={[formData.type]}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] as CareItemType;
                      setFormData({ ...formData, type: value });
                    }}
                    isRequired
                  >
                    <SelectItem key="procedure" value="procedure">
                      검사
                    </SelectItem>
                    <SelectItem key="medication" value="medication">
                      주사
                    </SelectItem>
                  </Select>

                  <div className="space-y-2">
                    <Select
                      label="주기 선택"
                      placeholder="주기 선택"
                      selectedKeys={intervalOptions.find(opt => opt.value === formData.interval_weeks) ? [formData.interval_weeks.toString()] : []}
                      onSelectionChange={(keys) => {
                        const value = parseInt(Array.from(keys)[0] as string);
                        setFormData({ ...formData, interval_weeks: value });
                      }}
                      isRequired
                    >
                      {intervalOptions.map((option) => (
                        <SelectItem key={option.value.toString()} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                      <SelectItem key="custom" value="custom">
                        사용자 정의
                      </SelectItem>
                    </Select>

                    {!intervalOptions.find(opt => opt.value === formData.interval_weeks) && (
                      <Input
                        label="사용자 정의 주기 (주)"
                        type="number"
                        placeholder="예: 8"
                        value={formData.interval_weeks.toString()}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setFormData({ ...formData, interval_weeks: value });
                        }}
                        min={1}
                        max={520}
                        description="1-520주 사이의 값을 입력하세요"
                      />
                    )}
                  </div>

                  <Textarea
                    label="설명 (선택사항)"
                    placeholder="항목에 대한 추가 설명"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    minRows={2}
                    maxRows={4}
                  />

                  {errors.length > 0 && (
                    <div className="text-danger text-sm space-y-1">
                      {errors.map((error, index) => (
                        <p key={index}>{error}</p>
                      ))}
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  취소
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleSubmit}
                  isLoading={createCareItem.isPending}
                >
                  추가
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}