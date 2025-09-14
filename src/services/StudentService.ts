// ==============================================
// 학생 관리 서비스
// ==============================================

import { db } from '../db/database';
import { Student, CreateStudentInput, UpdateStudentInput } from '../types';
import Papa from 'papaparse';

export class StudentService {
  /**
   * 학생 추가
   */
  static async addStudent(input: CreateStudentInput): Promise<Student> {
    try {
      this.validateStudentInput(input);

      // 동일 반에서 출석번호 중복 확인
      const existingWithNumber = await db.students
        .where('[className+number]')
        .equals([input.className, input.number])
        .and(s => s.active)
        .first();

      if (existingWithNumber) {
        throw new Error(`${input.className}반에 ${input.number}번 학생이 이미 존재합니다.`);
      }

      const now = Date.now();
      const student: Student = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };

      await db.students.add(student);

      // 히스토리 로그 기록
      await db.addHistoryLog({
        action: 'create',
        entityType: 'student',
        entityId: student.id,
        changes: student,
        timestamp: now
      });

      return student;
    } catch (error) {
      console.error('학생 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 학생 정보 수정
   */
  static async updateStudent(input: UpdateStudentInput): Promise<Student | null> {
    try {
      const existing = await db.students.get(input.id);
      if (!existing) {
        throw new Error('존재하지 않는 학생입니다.');
      }

      // 출석번호 변경 시 중복 확인
      if (input.number && input.number !== existing.number) {
        const conflictingStudent = await db.students
          .where('[className+number]')
          .equals([input.className || existing.className, input.number])
          .and(s => s.active && s.id !== input.id)
          .first();

        if (conflictingStudent) {
          throw new Error(`${input.className || existing.className}반에 ${input.number}번 학생이 이미 존재합니다.`);
        }
      }

      const now = Date.now();
      const updates = {
        ...input,
        updatedAt: now
      };

      await db.students.update(input.id, updates);

      const updated = await db.students.get(input.id);

      // 히스토리 로그 기록
      await db.addHistoryLog({
        action: 'update',
        entityType: 'student',
        entityId: input.id,
        changes: {
          before: existing,
          after: updates
        },
        timestamp: now
      });

      return updated || null;
    } catch (error) {
      console.error('학생 정보 수정 실패:', error);
      throw error;
    }
  }

  /**
   * 학생 비활성화 (전출/휴학 등)
   */
  static async deactivateStudent(id: string, reason?: string): Promise<boolean> {
    try {
      const existing = await db.students.get(id);
      if (!existing) {
        throw new Error('존재하지 않는 학생입니다.');
      }

      await db.students.update(id, {
        active: false,
        updatedAt: Date.now()
      });

      // 히스토리 로그 기록
      await db.addHistoryLog({
        action: 'update',
        entityType: 'student',
        entityId: id,
        changes: {
          deactivated: true,
          reason: reason || '비활성화'
        },
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('학생 비활성화 실패:', error);
      return false;
    }
  }

  /**
   * 학생 목록 조회
   */
  static async getStudents(options: {
    className?: string;
    active?: boolean;
    sortBy?: 'number' | 'name';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<Student[]> {
    try {
      let query = db.students.orderBy(options.sortBy || 'number');

      if (options.sortOrder === 'desc') {
        query = query.reverse();
      }

      // 활성 상태 필터
      if (options.active !== undefined) {
        query = query.and(s => s.active === options.active);
      }

      // 학급 필터
      if (options.className) {
        query = query.and(s => s.className === options.className);
      }

      return await query.toArray();
    } catch (error) {
      console.error('학생 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 학생 검색
   */
  static async searchStudents(
    term: string,
    options: { className?: string; active?: boolean } = {}
  ): Promise<Student[]> {
    try {
      if (!term.trim()) {
        return await this.getStudents(options);
      }

      const trimmedTerm = term.trim().toLowerCase();

      // 숫자인 경우 출석번호로 검색, 아니면 이름으로 검색
      const isNumber = /^\d+$/.test(trimmedTerm);

      let students = await this.getStudents(options);

      return students.filter(student => {
        if (isNumber) {
          return student.number.toString().includes(trimmedTerm);
        } else {
          return student.name.toLowerCase().includes(trimmedTerm);
        }
      });
    } catch (error) {
      console.error('학생 검색 실패:', error);
      return [];
    }
  }

  /**
   * CSV 파일에서 학생 명단 가져오기
   */
  static async importFromCSV(
    csvContent: string,
    options: {
      overwrite?: boolean;
      skipHeader?: boolean;
      defaultClassName?: string;
      defaultGrade?: number;
    } = {}
  ): Promise<{
    success: Student[];
    failed: { row: number; data: any; error: string }[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      skipped: number;
    };
  }> {
    try {
      const { overwrite = false, skipHeader = true, defaultClassName = '', defaultGrade = 6 } = options;

      // CSV 파싱
      const parseResult = Papa.parse(csvContent, {
        header: false,
        skipEmptyLines: true,
        encoding: 'UTF-8'
      });

      if (parseResult.errors.length > 0) {
        throw new Error(`CSV 파싱 오류: ${parseResult.errors[0].message}`);
      }

      const rows = parseResult.data as string[][];
      const dataRows = skipHeader ? rows.slice(1) : rows;

      const success: Student[] = [];
      const failed: { row: number; data: any; error: string }[] = [];
      let skipped = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + (skipHeader ? 2 : 1); // 실제 CSV 행 번호

        try {
          // CSV 형식: [번호, 이름, 학급, 학년] 또는 [번호, 이름]
          if (row.length < 2) {
            throw new Error('번호와 이름은 필수입니다.');
          }

          const number = parseInt(row[0]?.trim());
          const name = row[1]?.trim();
          const className = row[2]?.trim() || defaultClassName;
          const grade = parseInt(row[3]?.trim()) || defaultGrade;

          if (isNaN(number) || number < 1) {
            throw new Error('유효하지 않은 출석번호입니다.');
          }

          if (!name) {
            throw new Error('이름은 필수입니다.');
          }

          if (!className) {
            throw new Error('학급 정보가 없습니다.');
          }

          // 기존 학생 확인
          const existingStudent = await db.students
            .where('[className+number]')
            .equals([className, number])
            .and(s => s.active)
            .first();

          if (existingStudent && !overwrite) {
            skipped++;
            continue;
          }

          const studentInput: CreateStudentInput = {
            number,
            name,
            className,
            grade,
            active: true
          };

          if (existingStudent && overwrite) {
            // 기존 학생 정보 업데이트
            const updated = await this.updateStudent({
              id: existingStudent.id,
              ...studentInput
            });
            if (updated) success.push(updated);
          } else {
            // 새 학생 추가
            const newStudent = await this.addStudent(studentInput);
            success.push(newStudent);
          }

        } catch (error) {
          failed.push({
            row: rowNumber,
            data: row,
            error: error instanceof Error ? error.message : '알 수 없는 오류'
          });
        }
      }

      // 일괄 가져오기 히스토리 로그
      await db.addHistoryLog({
        action: 'bulk_import',
        entityType: 'student',
        entityId: 'bulk',
        changes: {
          successCount: success.length,
          failedCount: failed.length,
          skippedCount: skipped,
          totalRows: dataRows.length,
          overwrite
        },
        timestamp: Date.now()
      });

      return {
        success,
        failed,
        summary: {
          total: dataRows.length,
          successful: success.length,
          failed: failed.length,
          skipped
        }
      };

    } catch (error) {
      console.error('CSV 가져오기 실패:', error);
      throw error;
    }
  }

  /**
   * 학생 목록을 CSV로 내보내기
   */
  static async exportToCSV(students: Student[]): Promise<string> {
    try {
      const data = students.map(student => [
        student.number,
        student.name,
        student.className,
        student.grade
      ]);

      const csvContent = Papa.unparse({
        fields: ['번호', '이름', '학급', '학년'],
        data
      }, {
        encoding: 'UTF-8'
      });

      return csvContent;
    } catch (error) {
      console.error('CSV 내보내기 실패:', error);
      throw new Error('CSV 내보내기에 실패했습니다.');
    }
  }

  /**
   * 학급별 통계 조회
   */
  static async getClassStatistics(): Promise<{
    className: string;
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
  }[]> {
    try {
      const students = await db.students.toArray();

      const classGroups = students.reduce((acc, student) => {
        if (!acc[student.className]) {
          acc[student.className] = { total: 0, active: 0, inactive: 0 };
        }

        acc[student.className].total++;
        if (student.active) {
          acc[student.className].active++;
        } else {
          acc[student.className].inactive++;
        }

        return acc;
      }, {} as Record<string, { total: number; active: number; inactive: number }>);

      return Object.entries(classGroups).map(([className, stats]) => ({
        className,
        totalStudents: stats.total,
        activeStudents: stats.active,
        inactiveStudents: stats.inactive
      }));
    } catch (error) {
      console.error('학급 통계 조회 실패:', error);
      return [];
    }
  }

  /**
   * 출석번호 재정렬
   */
  static async reorderStudentNumbers(className: string): Promise<boolean> {
    try {
      const students = await db.students
        .where('className')
        .equals(className)
        .and(s => s.active)
        .sortBy('name'); // 이름순으로 정렬

      const updates = students.map((student, index) => ({
        id: student.id,
        number: index + 1
      }));

      await db.transaction('rw', db.students, db.history, async () => {
        for (const update of updates) {
          await db.students.update(update.id, { number: update.number, updatedAt: Date.now() });
        }

        // 히스토리 로그 기록
        await db.addHistoryLog({
          action: 'bulk_import',
          entityType: 'student',
          entityId: 'reorder',
          changes: {
            className,
            reorderedCount: updates.length
          },
          timestamp: Date.now()
        });
      });

      return true;
    } catch (error) {
      console.error('출석번호 재정렬 실패:', error);
      return false;
    }
  }

  // ==============================================
  // Private 헬퍼 메서드들
  // ==============================================

  /**
   * 학생 입력 검증
   */
  private static validateStudentInput(input: CreateStudentInput | UpdateStudentInput): void {
    if ('name' in input && (!input.name || input.name.trim().length === 0)) {
      throw new Error('이름은 필수입니다.');
    }

    if ('number' in input && (!input.number || input.number < 1 || input.number > 100)) {
      throw new Error('출석번호는 1-100 사이의 값이어야 합니다.');
    }

    if ('className' in input && (!input.className || input.className.trim().length === 0)) {
      throw new Error('학급은 필수입니다.');
    }

    if ('grade' in input && (!input.grade || input.grade < 1 || input.grade > 12)) {
      throw new Error('학년은 1-12 사이의 값이어야 합니다.');
    }

    // 이름 길이 제한
    if ('name' in input && input.name && input.name.length > 20) {
      throw new Error('이름은 20자를 초과할 수 없습니다.');
    }
  }
}