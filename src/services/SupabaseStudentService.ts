// ==============================================
// Supabase 학생 관리 서비스
// ==============================================

import { supabase } from '../db/supabase';
import { Student, CreateStudentInput, UpdateStudentInput } from '../types';

export class SupabaseStudentService {
  /**
   * 학생 추가
   */
  static async addStudent(input: CreateStudentInput): Promise<Student> {
    try {
      this.validateStudentInput(input);

      // 동일 반에서 출석번호 중복 확인
      const { data: existingWithNumber, error: checkError } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', input.className)
        .eq('number', input.number)
        .eq('active', true)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingWithNumber) {
        throw new Error(`${input.className}반에 ${input.number}번 학생이 이미 존재합니다.`);
      }

      const now = new Date().toISOString();
      const { data: created, error: createError } = await supabase
        .from('students')
        .insert({
          number: input.number,
          name: input.name,
          class_name: input.className,
          grade: input.grade,
          active: input.active ?? true,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (createError) throw createError;

      // 히스토리 로그 기록
      await this.addHistoryLog({
        action: 'create',
        entity_type: 'student',
        entity_id: created.id,
        changes: created
      });

      return this.convertToStudent(created);
    } catch (error) {
      console.error('학생 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 학생 정보 업데이트
   */
  static async updateStudent(id: string, input: UpdateStudentInput): Promise<Student> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 출석번호 변경 시 중복 확인
      if (input.number && input.className) {
        const { data: duplicate, error: dupError } = await supabase
          .from('students')
          .select('*')
          .eq('class_name', input.className)
          .eq('number', input.number)
          .eq('active', true)
          .neq('id', id)
          .single();

        if (dupError && dupError.code !== 'PGRST116') {
          throw dupError;
        }

        if (duplicate) {
          throw new Error(`${input.className}반에 ${input.number}번 학생이 이미 존재합니다.`);
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from('students')
        .update({
          number: input.number,
          name: input.name,
          class_name: input.className,
          grade: input.grade,
          active: input.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 히스토리 로그 기록
      await this.addHistoryLog({
        action: 'update',
        entity_type: 'student',
        entity_id: id,
        changes: {
          from: existing,
          to: updated
        }
      });

      return this.convertToStudent(updated);
    } catch (error) {
      console.error('학생 정보 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 학생 삭제 (비활성화)
   */
  static async deleteStudent(id: string): Promise<boolean> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('students')
        .update({
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // 히스토리 로그 기록
      await this.addHistoryLog({
        action: 'update',
        entity_type: 'student',
        entity_id: id,
        changes: { active: false }
      });

      return true;
    } catch (error) {
      console.error('학생 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 학생 목록 조회
   */
  static async getStudents(filter: {
    className?: string;
    grade?: number;
    active?: boolean;
    sortBy?: 'name' | 'number' | 'className';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<Student[]> {
    try {
      let query = supabase.from('students').select('*');

      // 필터 적용
      if (filter.className) {
        query = query.eq('class_name', filter.className);
      }
      if (filter.grade !== undefined) {
        query = query.eq('grade', filter.grade);
      }
      if (filter.active !== undefined) {
        query = query.eq('active', filter.active);
      }

      // 정렬
      const sortBy = filter.sortBy === 'className' ? 'class_name' : filter.sortBy || 'number';
      const ascending = filter.sortOrder === 'desc' ? false : true;
      query = query.order(sortBy, { ascending });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(this.convertToStudent);
    } catch (error) {
      console.error('학생 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 학생 단일 조회
   */
  static async getStudent(id: string): Promise<Student | null> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.convertToStudent(data);
    } catch (error) {
      console.error('학생 조회 실패:', error);
      return null;
    }
  }

  /**
   * 학급별 학생 수 조회
   */
  static async getClassCounts(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('class_name')
        .eq('active', true);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach(student => {
        counts[student.class_name] = (counts[student.class_name] || 0) + 1;
      });

      return counts;
    } catch (error) {
      console.error('학급별 학생 수 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 벌크 학생 추가
   */
  static async addBulkStudents(
    inputs: CreateStudentInput[]
  ): Promise<{ success: Student[]; failed: { input: CreateStudentInput; error: string }[] }> {
    const success: Student[] = [];
    const failed: { input: CreateStudentInput; error: string }[] = [];

    for (const input of inputs) {
      try {
        const student = await this.addStudent(input);
        success.push(student);
      } catch (error) {
        failed.push({
          input,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
    }

    // 벌크 작업 히스토리 로그
    await this.addHistoryLog({
      action: 'bulk_import',
      entity_type: 'student',
      entity_id: 'bulk',
      changes: {
        successCount: success.length,
        failedCount: failed.length,
        totalCount: inputs.length
      }
    });

    return { success, failed };
  }

  // ==============================================
  // Private 헬퍼 메서드들
  // ==============================================

  private static validateStudentInput(input: CreateStudentInput | UpdateStudentInput): void {
    if (!input.name?.trim()) {
      throw new Error('학생 이름은 필수입니다.');
    }

    if (!input.className?.trim()) {
      throw new Error('학급은 필수입니다.');
    }

    if (!input.number || input.number < 1 || input.number > 50) {
      throw new Error('출석번호는 1-50 사이의 값이어야 합니다.');
    }

    if (!input.grade || input.grade < 1 || input.grade > 6) {
      throw new Error('학년은 1-6 사이의 값이어야 합니다.');
    }
  }

  private static convertToStudent(data: any): Student {
    return {
      id: data.id,
      number: data.number,
      name: data.name,
      className: data.class_name,
      grade: data.grade,
      active: data.active,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime()
    };
  }

  private static async addHistoryLog(logData: {
    action: 'create' | 'update' | 'delete' | 'bulk_import';
    entity_type: 'student' | 'attendance' | 'settings';
    entity_id: string;
    changes?: any;
  }) {
    try {
      await supabase
        .from('history_logs')
        .insert({
          ...logData,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('히스토리 로그 기록 실패:', error);
    }
  }
}