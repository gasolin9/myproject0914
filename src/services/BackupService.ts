// ==============================================
// 자동 저장 및 백업 서비스
// ==============================================

import { db, exportAllData, importAllData } from '../db/database';
import { BackupFile, Settings } from '../types';
import { format } from 'date-fns';

export class BackupService {
  private static autosaveTimer: NodeJS.Timeout | null = null;
  private static autobackupTimer: NodeJS.Timeout | null = null;
  private static isInitialized = false;

  /**
   * 백업 서비스 초기화
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const settings = await this.getSettings();

      // 자동 저장 타이머 시작
      this.startAutosave(settings.autosaveIntervalSec);

      // 자동 백업 타이머 시작
      this.startAutobackup(settings.autobackupIntervalMin);

      // 앱 종료 시 최종 백업
      this.setupExitHandlers();

      this.isInitialized = true;
      console.log('백업 서비스가 초기화되었습니다.');
    } catch (error) {
      console.error('백업 서비스 초기화 실패:', error);
    }
  }

  /**
   * 백업 서비스 중지
   */
  static cleanup(): void {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    if (this.autobackupTimer) {
      clearInterval(this.autobackupTimer);
      this.autobackupTimer = null;
    }

    this.isInitialized = false;
    console.log('백업 서비스가 종료되었습니다.');
  }

  /**
   * 수동 백업 생성
   */
  static async createManualBackup(description?: string): Promise<BackupFile> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_manual_${timestamp}.json`;

      const data = await exportAllData();
      const backupData = {
        ...data,
        description: description || '수동 백업',
        type: 'manual' as const
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const size = new Blob([jsonString]).size;
      const checksum = await this.generateChecksum(jsonString);

      // 파일 다운로드
      await this.downloadBackupFile(jsonString, filename);

      const backupFile: BackupFile = {
        id: crypto.randomUUID(),
        filename,
        createdAt: Date.now(),
        size,
        checksum
      };

      // 백업 메타데이터 저장
      await db.backups.add(backupFile);

      // 알림 추가
      await db.addNotification({
        type: 'success',
        title: '수동 백업 완료',
        message: `백업 파일이 생성되었습니다: ${filename}`
      });

      console.log(`수동 백업 생성 완료: ${filename}`);
      return backupFile;
    } catch (error) {
      console.error('수동 백업 생성 실패:', error);
      throw new Error('백업 생성에 실패했습니다.');
    }
  }

  /**
   * 자동 백업 생성
   */
  static async createAutoBackup(): Promise<BackupFile | null> {
    try {
      const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
      const filename = `backup_${timestamp}.json`;

      const data = await exportAllData();
      const backupData = {
        ...data,
        description: '자동 백업',
        type: 'auto' as const
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const size = new Blob([jsonString]).size;
      const checksum = await this.generateChecksum(jsonString);

      // 로컬 저장소에 저장 (브라우저 환경)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(`backup_${timestamp}`, jsonString);
        } catch (storageError) {
          console.warn('로컬 저장소 백업 실패:', storageError);
          // 저장 공간 부족 시 오래된 백업 삭제 후 재시도
          await this.cleanupOldAutoBackups(5);
          localStorage.setItem(`backup_${timestamp}`, jsonString);
        }
      }

      // Electron 환경에서는 파일 시스템에 저장
      if (this.isElectronEnvironment()) {
        await this.saveBackupToFile(jsonString, filename);
      }

      const backupFile: BackupFile = {
        id: crypto.randomUUID(),
        filename,
        createdAt: Date.now(),
        size,
        checksum
      };

      await db.backups.add(backupFile);

      // 오래된 백업 정리
      await this.cleanupOldBackups();

      console.log(`자동 백업 생성 완료: ${filename}`);
      return backupFile;
    } catch (error) {
      console.error('자동 백업 생성 실패:', error);

      // 알림 추가
      await db.addNotification({
        type: 'error',
        title: '자동 백업 실패',
        message: '자동 백업 생성 중 오류가 발생했습니다.'
      });

      return null;
    }
  }

  /**
   * 백업 파일에서 데이터 복원
   */
  static async restoreFromBackup(
    backupData: string,
    options: {
      overwrite?: boolean;
      skipDuplicates?: boolean;
      validateIntegrity?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    message: string;
    stats?: {
      students: number;
      attendances: number;
      settings: number;
    };
  }> {
    try {
      const { overwrite = false, skipDuplicates = true, validateIntegrity = true } = options;

      // JSON 파싱
      let parsedData;
      try {
        parsedData = JSON.parse(backupData);
      } catch (parseError) {
        throw new Error('백업 파일 형식이 올바르지 않습니다.');
      }

      // 백업 데이터 구조 검증
      if (!parsedData.students || !parsedData.attendances || !parsedData.exportedAt) {
        throw new Error('백업 파일이 손상되었거나 호환되지 않는 형식입니다.');
      }

      // 무결성 검증
      if (validateIntegrity) {
        const integrityCheck = await this.validateBackupIntegrity(parsedData);
        if (!integrityCheck.isValid) {
          console.warn('백업 데이터 무결성 문제:', integrityCheck.issues);

          const proceed = confirm(
            `백업 데이터에 다음 문제가 발견되었습니다:\n${integrityCheck.issues.join('\n')}\n\n그래도 복원하시겠습니까?`
          );

          if (!proceed) {
            return {
              success: false,
              message: '사용자에 의해 복원이 취소되었습니다.'
            };
          }
        }
      }

      // 데이터 복원 실행
      await importAllData(parsedData, { overwrite, skipDuplicates });

      // 복원 통계
      const stats = {
        students: parsedData.students.length,
        attendances: parsedData.attendances.length,
        settings: parsedData.settings.length
      };

      // 성공 알림
      await db.addNotification({
        type: 'success',
        title: '데이터 복원 완료',
        message: `학생 ${stats.students}명, 출결 기록 ${stats.attendances}건이 복원되었습니다.`
      });

      return {
        success: true,
        message: '백업에서 데이터가 성공적으로 복원되었습니다.',
        stats
      };

    } catch (error) {
      console.error('백업 복원 실패:', error);

      // 실패 알림
      await db.addNotification({
        type: 'error',
        title: '복원 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : '복원에 실패했습니다.'
      };
    }
  }

  /**
   * 백업 목록 조회
   */
  static async getBackupList(): Promise<BackupFile[]> {
    try {
      return await db.backups.orderBy('createdAt').reverse().toArray();
    } catch (error) {
      console.error('백업 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 백업 파일 삭제
   */
  static async deleteBackup(id: string): Promise<boolean> {
    try {
      const backup = await db.backups.get(id);
      if (!backup) return false;

      // IndexedDB에서 메타데이터 삭제
      await db.backups.delete(id);

      // 로컬 저장소에서도 삭제 시도
      if (typeof window !== 'undefined' && window.localStorage) {
        const storageKey = backup.filename.replace('backup_', '').replace('.json', '');
        localStorage.removeItem(`backup_${storageKey}`);
      }

      // Electron 환경에서는 파일 시스템에서 삭제
      if (this.isElectronEnvironment()) {
        await this.deleteBackupFile(backup.filename);
      }

      return true;
    } catch (error) {
      console.error('백업 삭제 실패:', error);
      return false;
    }
  }

  // ==============================================
  // Private 헬퍼 메서드들
  // ==============================================

  /**
   * 설정 조회
   */
  private static async getSettings(): Promise<Settings> {
    const settings = await db.settings.get('default');
    if (!settings) {
      throw new Error('설정을 찾을 수 없습니다.');
    }
    return settings;
  }

  /**
   * 자동 저장 시작
   */
  private static startAutosave(intervalSec: number): void {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
    }

    this.autosaveTimer = setInterval(async () => {
      try {
        // 실제로는 IndexedDB가 자동으로 트랜잭션을 커밋하므로
        // 여기서는 주로 상태 표시 업데이트를 담당
        const event = new CustomEvent('autosave', {
          detail: { timestamp: Date.now() }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('자동 저장 중 오류:', error);
      }
    }, intervalSec * 1000);
  }

  /**
   * 자동 백업 시작
   */
  private static startAutobackup(intervalMin: number): void {
    if (this.autobackupTimer) {
      clearInterval(this.autobackupTimer);
    }

    this.autobackupTimer = setInterval(async () => {
      await this.createAutoBackup();
    }, intervalMin * 60 * 1000);
  }

  /**
   * 앱 종료 시 처리
   */
  private static setupExitHandlers(): void {
    const handleExit = async () => {
      console.log('앱 종료 - 최종 백업 생성 중...');
      await this.createAutoBackup();
    };

    // 브라우저 환경
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleExit);
      window.addEventListener('pagehide', handleExit);
    }

    // Node.js 환경 (Electron)
    if (typeof process !== 'undefined') {
      process.on('exit', handleExit);
      process.on('SIGINT', handleExit);
      process.on('SIGTERM', handleExit);
    }
  }

  /**
   * 오래된 백업 정리
   */
  private static async cleanupOldBackups(): Promise<void> {
    try {
      const settings = await this.getSettings();
      const backups = await db.backups.orderBy('createdAt').reverse().toArray();

      if (backups.length > settings.backupRetention) {
        const toDelete = backups.slice(settings.backupRetention);

        for (const backup of toDelete) {
          await this.deleteBackup(backup.id);
        }

        console.log(`${toDelete.length}개의 오래된 백업을 정리했습니다.`);
      }
    } catch (error) {
      console.error('백업 정리 실패:', error);
    }
  }

  /**
   * 로컬 저장소의 오래된 자동 백업 정리
   */
  private static async cleanupOldAutoBackups(keepCount: number): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('backup_'))
        .sort()
        .reverse();

      if (backupKeys.length > keepCount) {
        const toDelete = backupKeys.slice(keepCount);
        toDelete.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('로컬 저장소 백업 정리 실패:', error);
    }
  }

  /**
   * 체크섬 생성
   */
  private static async generateChecksum(data: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback: 간단한 해시
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32bit 정수 변환
      }
      return hash.toString(16);
    }
  }

  /**
   * 백업 파일 다운로드
   */
  private static async downloadBackupFile(data: string, filename: string): Promise<void> {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 메모리 정리
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Electron 환경 확인
   */
  private static isElectronEnvironment(): boolean {
    return typeof window !== 'undefined' &&
           window.process &&
           window.process.type === 'renderer';
  }

  /**
   * Electron에서 파일 시스템에 백업 저장
   */
  private static async saveBackupToFile(data: string, filename: string): Promise<void> {
    // Electron의 ipcRenderer를 통해 메인 프로세스에서 파일 저장
    if (this.isElectronEnvironment() && window.electronAPI) {
      try {
        await window.electronAPI.saveBackupFile(filename, data);
      } catch (error) {
        console.error('Electron 파일 저장 실패:', error);
      }
    }
  }

  /**
   * Electron에서 백업 파일 삭제
   */
  private static async deleteBackupFile(filename: string): Promise<void> {
    if (this.isElectronEnvironment() && window.electronAPI) {
      try {
        await window.electronAPI.deleteBackupFile(filename);
      } catch (error) {
        console.error('Electron 파일 삭제 실패:', error);
      }
    }
  }

  /**
   * 백업 데이터 무결성 검증
   */
  private static async validateBackupIntegrity(data: any): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // 필수 필드 확인
      if (!data.students || !Array.isArray(data.students)) {
        issues.push('학생 데이터가 없거나 올바르지 않습니다.');
      }

      if (!data.attendances || !Array.isArray(data.attendances)) {
        issues.push('출결 데이터가 없거나 올바르지 않습니다.');
      }

      if (!data.exportedAt || typeof data.exportedAt !== 'number') {
        issues.push('백업 생성 시간 정보가 올바르지 않습니다.');
      }

      // 학생 데이터 구조 검증
      if (data.students && Array.isArray(data.students)) {
        const requiredStudentFields = ['id', 'name', 'number', 'className'];
        const invalidStudents = data.students.filter((student: any, index: number) => {
          const missingFields = requiredStudentFields.filter(field => !student[field]);
          return missingFields.length > 0;
        });

        if (invalidStudents.length > 0) {
          issues.push(`${invalidStudents.length}명의 학생 데이터에 필수 정보가 누락되었습니다.`);
        }
      }

      // 출결 데이터 구조 검증
      if (data.attendances && Array.isArray(data.attendances)) {
        const requiredAttendanceFields = ['id', 'date', 'studentId', 'status'];
        const invalidAttendances = data.attendances.filter((attendance: any) => {
          const missingFields = requiredAttendanceFields.filter(field => !attendance[field]);
          return missingFields.length > 0;
        });

        if (invalidAttendances.length > 0) {
          issues.push(`${invalidAttendances.length}건의 출결 데이터에 필수 정보가 누락되었습니다.`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };

    } catch (error) {
      return {
        isValid: false,
        issues: ['백업 데이터 검증 중 오류가 발생했습니다.']
      };
    }
  }
}

// Electron API 타입 선언
declare global {
  interface Window {
    electronAPI?: {
      saveBackupFile: (filename: string, data: string) => Promise<void>;
      deleteBackupFile: (filename: string) => Promise<void>;
      getBackupDirectory: () => Promise<string>;
    };
    process?: {
      type: string;
    };
  }
}