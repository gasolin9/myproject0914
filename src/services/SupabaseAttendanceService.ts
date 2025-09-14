// ==============================================
// Supabase 출결 관리 서비스
// ==============================================

import { supabase } from '../db/supabase';
import {
  AttendanceEntry,
  AttendanceStatus,
  Student,
  DaySummary,
  StudentStats,
  CreateAttendanceInput,
  AttendanceFilter
} from '../types';
import { format } from 'date-fns';

export class SupabaseAttendanceService {
  /**
   * 출결 기록 추가 (중복 방지 로직 포함)
   */
  static async addAttendance(input: CreateAttendanceInput): Promise<AttendanceEntry> {
    try {
      // 입력 검증
      this.validateAttendanceInput(input);

      // 기존 기록 확인
      const { data: existing, error: checkError } = await supabase
        .from('attendances')
        .select('*')
        .eq('student_id', input.studentId)
        .eq('date', input.date)
        .eq('period', input.period)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError;
      }

      const now = new Date().toISOString();

      if (existing) {
        // 기존 기록 업데이트
        const { data: updated, error: updateError } = await supabase
          .from('attendances')
          .update({
            status: input.status,
            reason: input.reason,
            last_modified: now
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // 히스토리 로그 기록
        await this.addHistoryLog({
          action: 'update',
          entity_type: 'attendance',
          entity_id: existing.id,
          changes: {
            from: { status: existing.status, reason: existing.reason },
            to: { status: input.status, reason: input.reason }
          }
        });

        return this.convertToAttendanceEntry(updated);
      } else {
        // 새 기록 추가
        const { data: created, error: createError } = await supabase
          .from('attendances')
          .insert({
            student_id: input.studentId,
            date: input.date,
            period: input.period,
            status: input.status,
            reason: input.reason,
            timestamp: now,
            last_modified: now
          })
          .select()
          .single();

        if (createError) throw createError;

        // 히스토리 로그 기록
        await this.addHistoryLog({
          action: 'create',
          entity_type: 'attendance',
          entity_id: created.id,
          changes: created
        });

        return this.convertToAttendanceEntry(created);
      }
    } catch (error) {
      console.error('출결 기록 추가 실패:', error);
      throw new Error('출결 기록을 추가하는데 실패했습니다.');
    }
  }

  /**
   * 출결 기록 삭제
   */
  static async deleteAttendance(id: string): Promise<boolean> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('attendances')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error: deleteError } = await supabase
        .from('attendances')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // 히스토리 로그 기록
      await this.addHistoryLog({
        action: 'delete',
        entity_type: 'attendance',
        entity_id: id,
        changes: existing
      });

      return true;
    } catch (error) {
      console.error('출결 기록 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 날짜별 출결 요약 조회
   */
  static async getDaySummary(date: string, className?: string): Promise<DaySummary> {
    try {
      // 해당 날짜의 모든 출결 기록 조회
      let attendanceQuery = supabase
        .from('attendances')
        .select('*')
        .eq('date', date);

      const { data: attendances, error: attendanceError } = await attendanceQuery;
      if (attendanceError) throw attendanceError;

      // 학생 정보 조회 (활성 학생만)
      let studentQuery = supabase
        .from('students')
        .select('*')
        .eq('active', true);

      if (className) {
        studentQuery = studentQuery.eq('class_name', className);
      }

      const { data: students, error: studentError } = await studentQuery;
      if (studentError) throw studentError;

      const totalStudents = students.length;

      // 학생별 최종 상태 계산
      const studentStatuses = new Map<string, AttendanceStatus>();

      for (const student of students) {
        const studentAttendances = attendances
          .filter(a => a.student_id === student.id)
          .sort((a, b) => (b.period || 0) - (a.period || 0));

        if (studentAttendances.length === 0) {
          continue;
        }

        const finalStatus = this.determineFinalStatus(
          studentAttendances.map(this.convertToAttendanceEntry)
        );
        studentStatuses.set(student.id, finalStatus);
      }

      // 상태별 카운트
      const statusCounts = {
        출석: 0,
        지각: 0,
        조퇴: 0,
        결석: 0
      };

      studentStatuses.forEach(status => {
        statusCounts[status]++;
      });

      const recordedStudents = studentStatuses.size;
      const presentRate = totalStudents > 0 ? (statusCounts.출석 / recordedStudents) * 100 : 0;

      return {
        date,
        totalStudents,
        present: statusCounts.출석,
        absent: statusCounts.결석,
        late: statusCounts.지각,
        earlyLeave: statusCounts.조퇴,
        presentRate: Math.round(presentRate * 100) / 100
      };
    } catch (error) {
      console.error('일일 요약 조회 실패:', error);
      throw new Error('일일 요약을 조회하는데 실패했습니다.');
    }
  }

  /**
   * 학생별 출결 통계 조회
   */
  static async getStudentStats(
    studentId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<StudentStats | null> {
    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError || !student) return null;

      const { data: attendances, error: attendanceError } = await supabase
        .from('attendances')
        .select('*')
        .eq('student_id', studentId)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (attendanceError) throw attendanceError;

      // 날짜별로 그룹화
      const dateGroups = attendances.reduce((acc, attendance) => {
        if (!acc[attendance.date]) acc[attendance.date] = [];
        acc[attendance.date].push(this.convertToAttendanceEntry(attendance));
        return acc;
      }, {} as Record<string, AttendanceEntry[]>);

      const dayStatuses = Object.entries(dateGroups).map(([date, dayAttendances]) => {
        return this.determineFinalStatus(dayAttendances);
      });

      const totalDays = dayStatuses.length;
      const statusCounts = dayStatuses.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<AttendanceStatus, number>);

      const presentDays = statusCounts['출석'] || 0;
      const presentRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        studentId,
        student: {
          id: student.id,
          number: student.number,
          name: student.name,
          className: student.class_name,
          grade: student.grade,
          active: student.active
        },
        totalDays,
        presentDays,
        absentDays: statusCounts['결석'] || 0,
        lateDays: statusCounts['지각'] || 0,
        earlyLeaveDays: statusCounts['조퇴'] || 0,
        presentRate: Math.round(presentRate * 100) / 100
      };
    } catch (error) {
      console.error('학생 통계 조회 실패:', error);
      return null;
    }
  }

  /**
   * 벌크 출결 기록 추가
   */
  static async addBulkAttendances(
    inputs: CreateAttendanceInput[]
  ): Promise<{ success: AttendanceEntry[]; failed: { input: CreateAttendanceInput; error: string }[] }> {
    const success: AttendanceEntry[] = [];
    const failed: { input: CreateAttendanceInput; error: string }[] = [];

    for (const input of inputs) {
      try {
        const entry = await this.addAttendance(input);
        success.push(entry);
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
      entity_type: 'attendance',
      entity_id: 'bulk',
      changes: {
        successCount: success.length,
        failedCount: failed.length,
        totalCount: inputs.length
      }
    });

    return { success, failed };
  }

  /**
   * 조퇴 시 후속 교시 자동 처리
   */
  static async handleEarlyLeave(
    studentId: string,
    date: string,
    fromPeriod: number,
    maxPeriods: number = 6,
    reason?: string
  ): Promise<AttendanceEntry[]> {
    const results: AttendanceEntry[] = [];

    for (let period = fromPeriod + 1; period <= maxPeriods; period++) {
      const entry = await this.addAttendance({
        studentId,
        date,
        period,
        status: '조퇴',
        reason: reason || `${fromPeriod}교시 조퇴로 인한 자동 처리`
      });
      results.push(entry);
    }

    return results;
  }

  /**
   * 필터링된 출결 기록 조회
   */
  static async getFilteredAttendances(
    filter: AttendanceFilter,
    limit?: number,
    offset?: number
  ): Promise<{ attendances: AttendanceEntry[]; total: number }> {
    try {
      let query = supabase
        .from('attendances')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false });

      // 날짜 필터
      if (filter.dateFrom && filter.dateTo) {
        query = query.gte('date', filter.dateFrom).lte('date', filter.dateTo);
      }

      // 교시 필터
      if (filter.periods.length > 0) {
        query = query.in('period', [...filter.periods, null]);
      }

      // 상태 필터
      if (filter.statuses.length > 0) {
        query = query.in('status', filter.statuses);
      }

      // 학생 필터
      if (filter.students.length > 0) {
        query = query.in('student_id', filter.students);
      }

      // 페이지네이션
      if (offset) query = query.range(offset, offset + (limit || 50) - 1);
      else if (limit) query = query.limit(limit);

      const { data, error, count } = await query;
      if (error) throw error;

      const attendances = (data || []).map(this.convertToAttendanceEntry);
      return { attendances, total: count || 0 };
    } catch (error) {
      console.error('출결 기록 조회 실패:', error);
      throw new Error('출결 기록을 조회하는데 실패했습니다.');
    }
  }

  // ==============================================
  // Private 헬퍼 메서드들
  // ==============================================

  private static validateAttendanceInput(input: CreateAttendanceInput): void {
    if (!input.studentId) throw new Error('학생 ID는 필수입니다.');
    if (!input.date) throw new Error('날짜는 필수입니다.');
    if (!input.status) throw new Error('출결 상태는 필수입니다.');

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.date)) {
      throw new Error('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
    }

    if (input.period !== null && (input.period < 1 || input.period > 10)) {
      throw new Error('교시는 1-10 사이의 값이어야 합니다.');
    }

    if ((input.status === '지각' || input.status === '조퇴') && input.period === null) {
      throw new Error('지각 및 조퇴는 교시 정보가 필요합니다.');
    }
  }

  private static determineFinalStatus(attendances: AttendanceEntry[]): AttendanceStatus {
    if (attendances.length === 0) return '출석';

    const statusPriority: Record<AttendanceStatus, number> = {
      '결석': 4,
      '조퇴': 3,
      '지각': 2,
      '출석': 1
    };

    return attendances.reduce((final, current) => {
      return statusPriority[current.status] > statusPriority[final.status]
        ? current.status
        : final.status;
    }, attendances[0].status);
  }

  private static convertToAttendanceEntry(data: any): AttendanceEntry {
    return {
      id: data.id,
      studentId: data.student_id,
      date: data.date,
      period: data.period,
      status: data.status,
      reason: data.reason,
      timestamp: new Date(data.timestamp).getTime(),
      lastModified: new Date(data.last_modified).getTime()
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