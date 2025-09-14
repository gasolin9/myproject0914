// ==============================================
// IndexedDB 데이터베이스 스키마 - Dexie 사용
// ==============================================

import Dexie, { Table } from 'dexie';
import {
  Student,
  AttendanceEntry,
  Settings,
  BackupFile,
  HistoryLog,
  Notification,
  DEFAULT_SETTINGS
} from '../types';

/**
 * 출결 기록 앱 데이터베이스
 */
export class AttendanceDatabase extends Dexie {
  // 테이블 정의
  students!: Table<Student>;
  attendances!: Table<AttendanceEntry>;
  settings!: Table<Settings & { id: string }>;
  backups!: Table<BackupFile>;
  history!: Table<HistoryLog>;
  notifications!: Table<Notification>;

  constructor() {
    super('AttendanceApp');

    // 스키마 정의
    this.version(1).stores({
      students: '&id, number, name, className, grade, active, *[className+active]',
      attendances: '&id, date, period, studentId, status, timestamp, lastModified, *[date+period], *[studentId+date], *[date+studentId+period]',
      settings: '&id',
      backups: '&id, filename, createdAt',
      history: '&id, timestamp, entityType, entityId',
      notifications: '&id, timestamp, read'
    });

    // 데이터베이스 오픈 시 훅
    this.on('ready', this.initializeDefaults.bind(this));
    this.on('blocked', () => console.warn('데이터베이스가 다른 탭에서 사용 중입니다.'));
  }

  /**
   * 초기 데이터 설정
   */
  private async initializeDefaults() {
    // 기본 설정이 없으면 생성
    const settingsCount = await this.settings.count();
    if (settingsCount === 0) {
      await this.settings.add({
        ...DEFAULT_SETTINGS,
        id: 'default'
      });

      console.log('기본 설정이 생성되었습니다.');

      // 초기화 로그 기록
      await this.addHistoryLog({
        action: 'create',
        entityType: 'settings',
        entityId: 'default',
        changes: { initialized: true },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 히스토리 로그 추가 헬퍼
   */
  async addHistoryLog(logData: Omit<HistoryLog, 'id'>) {
    const id = crypto.randomUUID();
    await this.history.add({
      ...logData,
      id
    });
  }

  /**
   * 알림 추가 헬퍼
   */
  async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const id = crypto.randomUUID();
    await this.notifications.add({
      ...notification,
      id,
      timestamp: Date.now(),
      read: false
    });
  }
}

// 싱글톤 데이터베이스 인스턴스
export const db = new AttendanceDatabase();

// ==============================================
// 데이터베이스 유틸리티 함수들
// ==============================================

/**
 * 데이터베이스 연결 상태 확인
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.students.limit(1).toArray();
    return true;
  } catch (error) {
    console.error('데이터베이스 연결 실패:', error);
    return false;
  }
}

/**
 * 데이터베이스 크기 계산
 */
export async function getDatabaseSize(): Promise<{
  students: number;
  attendances: number;
  history: number;
  notifications: number;
  totalSize: string;
}> {
  const [studentsCount, attendancesCount, historyCount, notificationsCount] = await Promise.all([
    db.students.count(),
    db.attendances.count(),
    db.history.count(),
    db.notifications.count()
  ]);

  // 대략적인 크기 계산 (바이트)
  const estimatedSize =
    studentsCount * 200 +          // 학생 당 약 200바이트
    attendancesCount * 150 +       // 출결 기록 당 약 150바이트
    historyCount * 300 +           // 히스토리 로그 당 약 300바이트
    notificationsCount * 100;      // 알림 당 약 100바이트

  const totalSize = estimatedSize > 1024 * 1024
    ? `${(estimatedSize / (1024 * 1024)).toFixed(2)} MB`
    : `${(estimatedSize / 1024).toFixed(2)} KB`;

  return {
    students: studentsCount,
    attendances: attendancesCount,
    history: historyCount,
    notifications: notificationsCount,
    totalSize
  };
}

/**
 * 오래된 히스토리 로그 정리
 */
export async function cleanupOldHistory(daysToKeep: number = 90) {
  const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

  const deletedCount = await db.history
    .where('timestamp')
    .below(cutoffDate)
    .delete();

  console.log(`${deletedCount}개의 오래된 히스토리 로그를 정리했습니다.`);
  return deletedCount;
}

/**
 * 읽은 알림 정리
 */
export async function cleanupReadNotifications(daysToKeep: number = 7) {
  const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

  const deletedCount = await db.notifications
    .where('timestamp')
    .below(cutoffDate)
    .and(notification => notification.read)
    .delete();

  console.log(`${deletedCount}개의 읽은 알림을 정리했습니다.`);
  return deletedCount;
}

/**
 * 전체 데이터 백업용 내보내기
 */
export async function exportAllData(): Promise<{
  students: Student[];
  attendances: AttendanceEntry[];
  settings: (Settings & { id: string })[];
  exportedAt: number;
  version: string;
}> {
  const [students, attendances, settings] = await Promise.all([
    db.students.toArray(),
    db.attendances.toArray(),
    db.settings.toArray()
  ]);

  return {
    students,
    attendances,
    settings,
    exportedAt: Date.now(),
    version: '1.0.0'
  };
}

/**
 * 전체 데이터 복원용 가져오기
 */
export async function importAllData(data: {
  students: Student[];
  attendances: AttendanceEntry[];
  settings: (Settings & { id: string })[];
  exportedAt: number;
  version?: string;
}, options: {
  overwrite?: boolean;
  skipDuplicates?: boolean;
} = {}) {
  const { overwrite = false, skipDuplicates = true } = options;

  try {
    await db.transaction('rw', db.students, db.attendances, db.settings, db.history, async () => {
      // 덮어쓰기 모드일 경우 기존 데이터 삭제
      if (overwrite) {
        await db.students.clear();
        await db.attendances.clear();
        // 설정은 기본 설정 유지
      }

      // 학생 데이터 복원
      for (const student of data.students) {
        if (skipDuplicates) {
          const existing = await db.students.get(student.id);
          if (!existing) {
            await db.students.add(student);
          }
        } else {
          await db.students.put(student);
        }
      }

      // 출결 데이터 복원
      for (const attendance of data.attendances) {
        if (skipDuplicates) {
          const existing = await db.attendances.get(attendance.id);
          if (!existing) {
            await db.attendances.add(attendance);
          }
        } else {
          await db.attendances.put(attendance);
        }
      }

      // 설정 복원
      for (const setting of data.settings) {
        await db.settings.put(setting);
      }

      // 복원 히스토리 기록
      await db.addHistoryLog({
        action: 'bulk_import',
        entityType: 'student',
        entityId: 'bulk',
        changes: {
          studentsCount: data.students.length,
          attendancesCount: data.attendances.length,
          importedAt: Date.now(),
          sourceExportedAt: data.exportedAt
        },
        timestamp: Date.now()
      });
    });

    console.log('데이터 복원이 완료되었습니다.');
    return true;
  } catch (error) {
    console.error('데이터 복원 실패:', error);
    throw error;
  }
}

/**
 * 인덱스 최적화 (성능 향상)
 */
export async function optimizeDatabase() {
  try {
    // 사용하지 않는 인덱스 정리는 Dexie에서 자동 처리됨
    // 대신 성능에 영향을 주는 큰 테이블들을 최적화

    const attendanceCount = await db.attendances.count();

    if (attendanceCount > 10000) {
      console.log('대용량 출결 데이터 감지 - 최적화 실행 중...');

      // 오래된 임시 데이터 정리
      await cleanupOldHistory(90);
      await cleanupReadNotifications(7);

      console.log('데이터베이스 최적화 완료');
    }

    return true;
  } catch (error) {
    console.error('데이터베이스 최적화 실패:', error);
    return false;
  }
}

/**
 * 데이터베이스 무결성 검증
 */
export async function validateDatabaseIntegrity(): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // 1. 고아 출결 기록 확인 (존재하지 않는 학생에 대한 기록)
    const attendances = await db.attendances.toArray();
    const studentIds = new Set((await db.students.toArray()).map(s => s.id));

    const orphanedAttendances = attendances.filter(a => !studentIds.has(a.studentId));
    if (orphanedAttendances.length > 0) {
      issues.push(`${orphanedAttendances.length}개의 고아 출결 기록이 발견되었습니다.`);
    }

    // 2. 중복 학생 번호 확인
    const students = await db.students.where('active').equals(true).toArray();
    const numberGroups = students.reduce((acc, student) => {
      const key = `${student.className}-${student.number}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {} as Record<string, Student[]>);

    const duplicateNumbers = Object.entries(numberGroups)
      .filter(([_, students]) => students.length > 1);

    if (duplicateNumbers.length > 0) {
      issues.push(`${duplicateNumbers.length}개의 중복 출석번호가 발견되었습니다.`);
    }

    // 3. 잘못된 날짜 형식 확인
    const invalidDates = attendances.filter(a => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      return !dateRegex.test(a.date);
    });

    if (invalidDates.length > 0) {
      issues.push(`${invalidDates.length}개의 잘못된 날짜 형식이 발견되었습니다.`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };

  } catch (error) {
    console.error('데이터베이스 무결성 검증 실패:', error);
    return {
      isValid: false,
      issues: ['무결성 검증 중 오류가 발생했습니다.']
    };
  }
}