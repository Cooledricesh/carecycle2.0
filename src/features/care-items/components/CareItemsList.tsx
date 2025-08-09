'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { Chip } from '@heroui/chip';
import { Spinner } from '@heroui/spinner';
import { Search, Edit, Trash2, Pill, FileText } from 'lucide-react';
import { useCareItemsWithDisplay, useDeleteCareItem } from '@/hooks/use-care-items';
import { CareItemType } from '@/services/care-items.service';
import { CareItemDialog } from './CareItemDialog';

export function CareItemsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<CareItemType | 'all'>('all');
  const { data: careItems, isLoading, refetch } = useCareItemsWithDisplay();
  const deleteCareItem = useDeleteCareItem();

  const filteredItems = careItems?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  }) ?? [];

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`${name} 항목을 삭제하시겠습니까?`)) {
      await deleteCareItem.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-xl font-semibold">관리 항목</h2>
          <CareItemDialog onSuccess={refetch} />
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="항목 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                startContent={<Search className="h-4 w-4 text-default-400" />}
                className="flex-1"
              />
              <Select
                placeholder="유형 필터"
                selectedKeys={[filterType]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as CareItemType | 'all';
                  setFilterType(value);
                }}
                className="w-40"
              >
                <SelectItem key="all" value="all">
                  전체
                </SelectItem>
                <SelectItem key="procedure" value="procedure">
                  검사
                </SelectItem>
                <SelectItem key="medication" value="medication">
                  주사
                </SelectItem>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {item.type === 'procedure' ? (
                          <FileText className="h-5 w-5 text-primary" />
                        ) : (
                          <Pill className="h-5 w-5 text-secondary" />
                        )}
                        <h3 className="font-semibold">{item.name}</h3>
                      </div>
                      <Chip
                        size="sm"
                        color={item.type === 'procedure' ? 'primary' : 'secondary'}
                        variant="flat"
                      >
                        {item.type === 'procedure' ? '검사' : '주사'}
                      </Chip>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-default-500">주기</span>
                        <span className="font-medium">{item.interval_display}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-default-600">{item.description}</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={<Edit className="h-4 w-4" />}
                      >
                        수정
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        startContent={<Trash2 className="h-4 w-4" />}
                        onPress={() => handleDelete(item.id, item.name)}
                        isLoading={deleteCareItem.isPending}
                      >
                        삭제
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-default-500">
                {searchTerm || filterType !== 'all'
                  ? '검색 결과가 없습니다.'
                  : '등록된 항목이 없습니다.'}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}