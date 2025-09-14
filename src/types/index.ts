// ==============================================
// 타입 정의 - 출결 기록 앱
// ==============================================

/**
 * 출결 상태 타입
 */
export type AttendanceStatus = '출석' | '지각' | '조퇴' | '결석';

/**
 * 학생 기본 정보
 */
export interface Student {
  id: string;          // 내부 UUID
  number: number;      // 출석번호
  name: string;        // 이름
  className: string;   // 예: "6-8"
  grade: number;       // 6
  active: boolean;     // 전출/휴학 등 비활성 처리
  createdAt: number;   // 생성 시간
  updatedAt: number;   // 수정 시간
}

/**
 * 출결 기록 엔트리 (하루에 다수 교시 기록 가능)
 */
export interface AttendanceEntry {
  id: string;                // UUID
  date: string;              // "YYYY-MM-DD"
  period: number | null;     // 교시 (없으면 null: 일괄/종일 기록)
  studentId: string;
  status: AttendanceStatus;
  reason?: string;           // 선택(사유 메모)
  timestamp: number;         // 기록 시각(ms)
  lastModified: number;      // 최종 수정 시각(ms)
}

/**
 * 앱 설정
 */
export interface Settings {
  schoolName: string;
  teacherName: string;
  classNameDefault: string;       // "6-8"
  quickHotkey: string;            // "Ctrl+Alt+A" 등
  autosaveIntervalSec: number;    // 30
  autobackupIntervalMin: number;  // 5
  backupRetention: number;        // 20
  niceExportFormat: 'csvA' | 'csvB'; // 나이스 대응 선택지
  maxPeriodsPerDay: number;       // 기본 6교시
  schoolStartTime: string;        // "09:00"
  lateThresholdMin: number;       // 지각 인정 시간(분)
}

/**
 * 백업 파일 메타데이터
 */
export interface BackupFile {
  id: string;
  filename: string;
  createdAt: number;
  size: number;
  checksum: string;
}

/**
 * 히스토리 로그 (변경 추적용)
 */
export interface HistoryLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'bulk_import';
  entityType: 'student' | 'attendance' | 'settings';
  entityId: string;
  changes: Record<string, any>;
  timestamp: number;
  userId?: string; // 멀티 사용자 대응
}

/**
 * CSV 내보내기용 데이터 타입
 */
export interface CSVExportData {
  날짜: string;
  학급: string;
  학년: number;
  번호: number;
  이름: string;
  교시?: number;
  상태?: AttendanceStatus;
  사유?: string;
  // csvB 형식용 교시별 컬럼들
  '1교시'?: AttendanceStatus | '';
  '2교시'?: AttendanceStatus | '';
  '3교시'?: AttendanceStatus | '';
  '4교시'?: AttendanceStatus | '';
  '5교시'?: AttendanceStatus | '';
  '6교시'?: AttendanceStatus | '';
  비고?: string;
}

/**
 * 일일 출결 요약
 */
export interface DaySummary {
  date: string;
  totalStudents: number;
  present: number;      // 출석
  absent: number;       // 결석
  late: number;         // 지각
  earlyLeave: number;   // 조퇴
  presentRate: number;  // 출석률 (%)
}

/**
 * 학생별 출결 통계
 */
export interface StudentStats {
  studentId: string;
  student: Student;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  presentRate: number;
}

/**
 * 빠른 입력 패널 상태
 */
export interface QuickInputState {
  isOpen: boolean;
  selectedDate: string;
  selectedPeriod: number | null;
  activeTab: AttendanceStatus;
  searchTerm: string;
  selectedStudents: Set<string>;
}

/**
 * Undo/Redo 액션 타입
 */
export interface UndoAction {
  id: string;
  type: 'add' | 'update' | 'delete' | 'bulk';
  timestamp: number;
  data: {
    before?: AttendanceEntry[];
    after?: AttendanceEntry[];
  };
  description: string;
}

/**
 * 알림 타입
 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

/**
 * 필터 옵션
 */
export interface AttendanceFilter {
  dateFrom: string;
  dateTo: string;
  periods: number[];
  statuses: AttendanceStatus[];
  students: string[];
  classNames: string[];
}

/**
 * 페이지네이션 정보
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * API 응답 래퍼 (향후 서버 연동 대비)
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// ==============================================
// 유틸리티 타입들
// ==============================================

export type CreateStudentInput = Omit<Student, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateStudentInput = Partial<CreateStudentInput> & { id: string };

export type CreateAttendanceInput = Omit<AttendanceEntry, 'id' | 'timestamp' | 'lastModified'>;
export type UpdateAttendanceInput = Partial<CreateAttendanceInput> & { id: string };

export type PartialSettings = Partial<Settings>;

/**
 * 컴포넌트 Props 타입들
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface StudentListProps extends BaseComponentProps {
  students: Student[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  virtualizeThreshold?: number; // 가상 스크롤 활성화 임계값
}

export interface AttendanceCardProps extends BaseComponentProps {
  summary: DaySummary;
  onStatusClick: (status: AttendanceStatus) => void;
  isLoading?: boolean;
}

// ==============================================
// 상수 정의
// ==============================================

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['출석', '지각', '조퇴', '결석'];

export const DEFAULT_SETTINGS: Settings = {
  schoolName: '',
  teacherName: '',
  classNameDefault: '6-1',
  quickHotkey: 'Ctrl+Alt+A',
  autosaveIntervalSec: 30,
  autobackupIntervalMin: 5,
  backupRetention: 20,
  niceExportFormat: 'csvA',
  maxPeriodsPerDay: 6,
  schoolStartTime: '09:00',
  lateThresholdMin: 10
};

export const PERIODS = Array.from({ length: 6 }, (_, i) => i + 1); // [1, 2, 3, 4, 5, 6]

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  '출석': 'text-green-600 bg-green-50',
  '지각': 'text-yellow-600 bg-yellow-50',
  '조퇴': 'text-orange-600 bg-orange-50',
  '결석': 'text-red-600 bg-red-50'
};

export const STATUS_ICONS: Record<AttendanceStatus, string> = {
  '출석': '✓',
  '지각': '⏰',
  '조퇴': '🏃',
  '결석': '✗'
};