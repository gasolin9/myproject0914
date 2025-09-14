// ==============================================
// 출결 관리 서비스 - 비즈니스 로직 레이어
// ==============================================

import { db } from '../db/database';
import {
  AttendanceEntry,
  AttendanceStatus,
  Student,
  DaySummary,
  StudentStats,
  CreateAttendanceInput,
  AttendanceFilter
} from '../types';
import { format, parseISO, startOfDay, endOfDay, isValid } from 'date-fns';

export class AttendanceService {
  /**
   * 출결 기록 추가 (중복 방지 로직 포함)
   */
  static async addAttendance(input: CreateAttendanceInput): Promise<AttendanceEntry> {
    try {
      // 입력 검증
      this.validateAttendanceInput(input);

      // 기존 기록 확인 (같은 학생, 날짜, 교시)
      const existing = await db.attendances
        .where('[studentId+date+period]')
        .equals([input.studentId, input.date, input.period])
        .first();

      const now = Date.now();
      const id = crypto.randomUUID();

      const attendanceEntry: AttendanceEntry = {
        ...input,
        id,
        timestamp: now,
        lastModified: now
      };

      if (existing) {
        // 기존 기록이 있으면 업데이트
        attendanceEntry.id = existing.id;
        await db.attendances.update(existing.id, {
          status: input.status,
          reason: input.reason,
          lastModified: now
        });

        // 히스토리 로그 기록
        await db.addHistoryLog({
          action: 'update',
          entityType: 'attendance',
          entityId: existing.id,
          changes: {
            from: { status: existing.status, reason: existing.reason },
            to: { status: input.status, reason: input.reason }
          },
          timestamp: now
        });

        return { ...existing, ...attendanceEntry };
      } else {
        // 새 기록 추가
        await db.attendances.add(attendanceEntry);

        // 히스토리 로그 기록
        await db.addHistoryLog({
          action: 'create',
          entityType: 'attendance',
          entityId: id,
          changes: attendanceEntry,
          timestamp: now
        });

        return attendanceEntry;
      }
    } catch (error) {
      console.error('출결 기록 추가 실패:', error);
      throw new Error('출결 기록을 추가하는데 실패했습니다.');
    }
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
   * 결석 처리 시 부분 출석 조정
   */
  static async handlePartialAbsence(
    studentId: string,
    date: string,
    presentPeriods: number[]
  ): Promise<AttendanceEntry[]> {
    // 먼저 해당 날짜의 모든 기록 조회
    const existingEntries = await db.attendances
      .where('[studentId+date]')
      .equals([studentId, date])
      .toArray();

    // 전체 결석 기록이 있는지 확인
    const fullAbsenceEntry = existingEntries.find(e => e.period === null && e.status === '결석');

    if (fullAbsenceEntry) {
      // 전체 결석을 삭제
      await db.attendances.delete(fullAbsenceEntry.id);

      // 히스토리 로그
      await db.addHistoryLog({
        action: 'delete',
        entityType: 'attendance',
        entityId: fullAbsenceEntry.id,
        changes: { reason: '부분 출석으로 인한 전체 결석 해제' },
        timestamp: Date.now()
      });
    }

    // 출석하지 않은 교시는 결석 처리
    const results: AttendanceEntry[] = [];
    const maxPeriods = 6; // 설정에서 가져올 수도 있음

    for (let period = 1; period <= maxPeriods; period++) {
      if (!presentPeriods.includes(period)) {
        // 해당 교시에 다른 기록이 없으면 결석 처리
        const hasRecord = existingEntries.some(e => e.period === period);
        if (!hasRecord) {
          const entry = await this.addAttendance({
            studentId,
            date,
            period,
            status: '결석',
            reason: '부분 결석'
          });
          results.push(entry);
        }
      }
    }

    return results;
  }

  /**
   * 출결 기록 삭제
   */
  static async deleteAttendance(id: string): Promise<boolean> {
    try {
      const existing = await db.attendances.get(id);
      if (!existing) {
        throw new Error('존재하지 않는 출결 기록입니다.');
      }

      await db.attendances.delete(id);

      // 히스토리 로그 기록
      await db.addHistoryLog({
        action: 'delete',
        entityType: 'attendance',
        entityId: id,
        changes: existing,
        timestamp: Date.now()
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
      const attendances = await db.attendances
        .where('date')
        .equals(date)
        .toArray();

      // 학생 정보와 조인 (활성 학생만)
      let students = await db.students
        .where('active')
        .equals(true)
        .toArray();

      // 학급 필터링
      if (className) {
        students = students.filter(s => s.className === className);
      }

      const totalStudents = students.length;

      // 학생별 최종 상태 계산
      const studentStatuses = new Map<string, AttendanceStatus>();

      for (const student of students) {
        const studentAttendances = attendances
          .filter(a => a.studentId === student.id)
          .sort((a, b) => (b.period || 0) - (a.period || 0)); // 높은 교시부터

        if (studentAttendances.length === 0) {
          // 기록이 없으면 출석으로 간주하지 않음 (미입력)
          continue;
        }

        // 가장 높은 우선순위의 상태를 최종 상태로 사용
        const finalStatus = this.determineFinalStatus(studentAttendances);
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
      const student = await db.students.get(studentId);
      if (!student) return null;

      const attendances = await db.attendances
        .where('[studentId+date]')
        .between([studentId, dateFrom], [studentId, dateTo])
        .toArray();

      // 날짜별로 그룹화
      const dateGroups = attendances.reduce((acc, attendance) => {
        if (!acc[attendance.date]) acc[attendance.date] = [];
        acc[attendance.date].push(attendance);
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
        student,
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
   * 필터링된 출결 기록 조회
   */
  static async getFilteredAttendances(
    filter: AttendanceFilter,
    limit?: number,
    offset?: number
  ): Promise<{ attendances: AttendanceEntry[]; total: number }> {
    try {
      let query = db.attendances.orderBy('date').reverse();

      // 날짜 필터
      if (filter.dateFrom && filter.dateTo) {
        query = query.and(a => a.date >= filter.dateFrom && a.date <= filter.dateTo);
      }

      // 교시 필터
      if (filter.periods.length > 0) {
        query = query.and(a => a.period === null || filter.periods.includes(a.period!));
      }

      // 상태 필터
      if (filter.statuses.length > 0) {
        query = query.and(a => filter.statuses.includes(a.status));
      }

      // 학생 필터
      if (filter.students.length > 0) {
        query = query.and(a => filter.students.includes(a.studentId));
      }

      const total = await query.count();
      const attendances = await query.offset(offset || 0).limit(limit || 50).toArray();

      return { attendances, total };
    } catch (error) {
      console.error('출결 기록 조회 실패:', error);
      throw new Error('출결 기록을 조회하는데 실패했습니다.');
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
    await db.addHistoryLog({
      action: 'bulk_import',
      entityType: 'attendance',
      entityId: 'bulk',
      changes: {
        successCount: success.length,
        failedCount: failed.length,
        totalCount: inputs.length
      },
      timestamp: Date.now()
    });

    return { success, failed };
  }

  // ==============================================
  // Private 헬퍼 메서드들
  // ==============================================

  /**
   * 출결 입력 검증
   */
  private static validateAttendanceInput(input: CreateAttendanceInput): void {
    if (!input.studentId) throw new Error('학생 ID는 필수입니다.');
    if (!input.date) throw new Error('날짜는 필수입니다.');
    if (!input.status) throw new Error('출결 상태는 필수입니다.');

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.date)) {
      throw new Error('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
    }

    // 교시 검증
    if (input.period !== null && (input.period < 1 || input.period > 10)) {
      throw new Error('교시는 1-10 사이의 값이어야 합니다.');
    }

    // 지각/조퇴는 교시가 필수
    if ((input.status === '지각' || input.status === '조퇴') && input.period === null) {
      throw new Error('지각 및 조퇴는 교시 정보가 필요합니다.');
    }
  }

  /**
   * 여러 출결 기록에서 최종 상태 결정
   * 우선순위: 결석 > 조퇴 > 지각 > 출석
   */
  private static determineFinalStatus(attendances: AttendanceEntry[]): AttendanceStatus {
    if (attendances.length === 0) return '출석'; // 기본값

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
}