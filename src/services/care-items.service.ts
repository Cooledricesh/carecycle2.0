'use client';

import { createClient } from '@/lib/supabase/client';

export type CareItemType = 'procedure' | 'medication';

export interface CareItem {
  id: string;
  name: string;
  type: CareItemType;
  interval_weeks: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareItemInput {
  name: string;
  type: CareItemType;
  interval_weeks: number;
  description?: string;
}

export interface CareItemWithDisplay extends CareItem {
  interval_display?: string;
}

class CareItemsService {
  private supabase = createClient();

  async getCareItems(type?: CareItemType): Promise<CareItem[]> {
    let query = this.supabase
      .from('care_items')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching care items:', error);
      throw error;
    }

    return data || [];
  }

  async getCareItemsWithDisplay(): Promise<CareItemWithDisplay[]> {
    const { data, error } = await this.supabase
      .from('care_items_view')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching care items view:', error);
      throw error;
    }

    return data || [];
  }

  async getCareItemById(id: string): Promise<CareItem | null> {
    const { data, error } = await this.supabase
      .from('care_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching care item:', error);
      throw error;
    }

    return data;
  }

  async createCareItem(input: CareItemInput): Promise<CareItem> {
    const { data, error } = await this.supabase
      .from('care_items')
      .insert([input])
      .select()
      .single();

    if (error) {
      console.error('Error creating care item:', error);
      throw error;
    }

    return data;
  }

  async updateCareItem(id: string, updates: Partial<CareItemInput>): Promise<CareItem> {
    const { data, error } = await this.supabase
      .from('care_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating care item:', error);
      throw error;
    }

    return data;
  }

  async deleteCareItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('care_items')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting care item:', error);
      throw error;
    }
  }

  async searchCareItems(searchTerm: string, type?: CareItemType): Promise<CareItem[]> {
    let query = this.supabase
      .from('care_items')
      .select('*')
      .eq('is_active', true)
      .ilike('name', `%${searchTerm}%`)
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching care items:', error);
      throw error;
    }

    return data || [];
  }

  formatIntervalWeeks(weeks: number): string {
    if (weeks === 1) return '매주';
    if (weeks === 2) return '격주';
    if (weeks === 4) return '매월';
    if (weeks === 12) return '분기별';
    if (weeks === 26) return '반기별';
    if (weeks === 52) return '연간';
    if (weeks < 52) return `${weeks}주마다`;
    return `${Math.round(weeks / 52 * 10) / 10}년마다`;
  }

  validateCareItemInput(input: CareItemInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('항목 이름을 입력해주세요.');
    }

    if (!input.type || !['procedure', 'medication'].includes(input.type)) {
      errors.push('유효한 항목 유형을 선택해주세요.');
    }

    if (!input.interval_weeks || input.interval_weeks <= 0) {
      errors.push('주기는 1주 이상이어야 합니다.');
    }

    if (input.interval_weeks > 520) {
      errors.push('주기는 10년(520주) 이하여야 합니다.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const careItemsService = new CareItemsService();