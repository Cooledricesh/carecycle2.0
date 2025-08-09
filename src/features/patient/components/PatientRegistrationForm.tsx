/**
 * Patient Registration Form Component
 * Modern form component using new Patient feature architecture
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserPlus, Calendar, CheckCircle, Trash2, Plus } from 'lucide-react';
import { 
  useRegisterPatient,
  useAvailableItems 
} from '@/features/patient/hooks/use-patient-data';
import { 
  PatientRegistrationRequestSchema,
  PERIOD_UNITS,
  type PatientRegistrationRequest,
  type PatientScheduleInput
} from '@/features/patient/types';
import type { z } from 'zod';

type FormData = z.infer<typeof PatientRegistrationRequestSchema>;

interface ScheduleFormData extends PatientScheduleInput {
  tempId: string;
  itemName?: string;
  itemType?: 'test' | 'injection';
}

export function PatientRegistrationForm() {
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleFormData[]>([]);
  
  const { data: availableItems = [], isLoading: itemsLoading } = useAvailableItems();
  const registerPatientMutation = useRegisterPatient();

  const form = useForm<FormData>({
    resolver: zodResolver(PatientRegistrationRequestSchema),
    defaultValues: {
      patientNumber: '',
      name: '',
      schedules: []
    }
  });

  const addSchedule = () => {
    const newSchedule: ScheduleFormData = {
      tempId: `temp_${Date.now()}`,
      itemId: '',
      firstDate: new Date().toISOString().split('T')[0],
      periodValue: 1,
      periodUnit: 'months'
    };
    setSelectedSchedules([...selectedSchedules, newSchedule]);
  };

  const removeSchedule = (tempId: string) => {
    setSelectedSchedules(prev => prev.filter(s => s.tempId !== tempId));
  };

  const updateSchedule = (tempId: string, updates: Partial<ScheduleFormData>) => {
    setSelectedSchedules(prev => 
      prev.map(schedule => 
        schedule.tempId === tempId 
          ? { ...schedule, ...updates }
          : schedule
      )
    );
  };

  const onSubmit = async (data: FormData) => {
    if (selectedSchedules.length === 0) {
      form.setError('schedules', { 
        type: 'required',
        message: 'At least one schedule is required' 
      });
      return;
    }

    // Validate all schedules have required fields
    const validSchedules = selectedSchedules.filter(s => s.itemId && s.firstDate);
    if (validSchedules.length !== selectedSchedules.length) {
      form.setError('schedules', { 
        type: 'validation',
        message: 'Please complete all schedule information' 
      });
      return;
    }

    const registrationData: PatientRegistrationRequest = {
      ...data,
      schedules: validSchedules.map(({ tempId, itemName, itemType, ...schedule }) => schedule)
    };

    try {
      await registerPatientMutation.mutateAsync(registrationData);
      
      // Reset form on success
      form.reset();
      setSelectedSchedules([]);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'test':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'injection':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Patient Registration
          </CardTitle>
          <CardDescription>
            Register a new patient with their medical schedule
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientNumber">Patient Number *</Label>
                <Input
                  id="patientNumber"
                  {...form.register('patientNumber')}
                  placeholder="Enter patient number"
                />
                {form.formState.errors.patientNumber && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.patientNumber.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Patient Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter patient name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Schedules Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Medical Schedules</h3>
                  <p className="text-sm text-gray-600">
                    Add tests or injections that this patient needs
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSchedule}
                  disabled={itemsLoading}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Schedule
                </Button>
              </div>

              {selectedSchedules.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No schedules added yet</p>
                      <p className="text-sm">Click "Add Schedule" to get started</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {selectedSchedules.map((schedule) => {
                    const selectedItem = availableItems.find(item => item.id === schedule.itemId);
                    
                    return (
                      <Card key={schedule.tempId}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">Schedule {selectedSchedules.indexOf(schedule) + 1}</h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeSchedule(schedule.tempId)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Medical Item *</Label>
                              <select
                                className="w-full p-2 border rounded-md"
                                value={schedule.itemId}
                                onChange={(e) => {
                                  const selectedItem = availableItems.find(item => item.id === e.target.value);
                                  updateSchedule(schedule.tempId, {
                                    itemId: e.target.value,
                                    itemName: selectedItem?.name,
                                    itemType: selectedItem?.type,
                                    periodValue: selectedItem?.periodValue || 1,
                                    periodUnit: selectedItem?.periodUnit || 'months'
                                  });
                                }}
                              >
                                <option value="">Select an item</option>
                                {availableItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name} ({item.type})
                                  </option>
                                ))}
                              </select>
                              {selectedItem && (
                                <Badge className={getItemTypeColor(selectedItem.type)}>
                                  {selectedItem.type}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>First Date *</Label>
                              <Input
                                type="date"
                                value={schedule.firstDate}
                                onChange={(e) => updateSchedule(schedule.tempId, {
                                  firstDate: e.target.value
                                })}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                              <Label>Repeat Every</Label>
                              <Input
                                type="number"
                                min="1"
                                value={schedule.periodValue}
                                onChange={(e) => updateSchedule(schedule.tempId, {
                                  periodValue: parseInt(e.target.value) || 1
                                })}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Period</Label>
                              <select
                                className="w-full p-2 border rounded-md"
                                value={schedule.periodUnit}
                                onChange={(e) => updateSchedule(schedule.tempId, {
                                  periodUnit: e.target.value as any
                                })}
                              >
                                {PERIOD_UNITS.map((unit) => (
                                  <option key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {form.formState.errors.schedules && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.schedules.message}
                </p>
              )}
            </div>

            <Separator />

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={registerPatientMutation.isPending || selectedSchedules.length === 0}
                className="flex items-center gap-2"
              >
                {registerPatientMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Register Patient
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}