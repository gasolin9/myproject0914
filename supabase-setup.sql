-- ==============================================
-- 출결 관리 앱 Supabase 테이블 생성 스크립트
-- ==============================================

-- 1. 학생 테이블 생성
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 학급별 출석번호는 고유해야 함
  CONSTRAINT unique_number_per_class UNIQUE (class_name, number)
);

-- 2. 출결 기록 테이블 생성
CREATE TABLE attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  period INTEGER, -- NULL이면 전일 기록 (결석 등)
  status TEXT NOT NULL CHECK (status IN ('출석', '지각', '조퇴', '결석')),
  reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  last_modified TIMESTAMPTZ DEFAULT now(),

  -- 같은 학생, 날짜, 교시에는 하나의 기록만
  CONSTRAINT unique_attendance_record UNIQUE (student_id, date, period)
);

-- 3. 설정 테이블 생성
CREATE TABLE settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  school_name TEXT DEFAULT '우리 학교',
  periods_per_day INTEGER DEFAULT 6,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications_enabled BOOLEAN DEFAULT true,
  backup_enabled BOOLEAN DEFAULT true,
  backup_interval INTEGER DEFAULT 7, -- 일 단위
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 히스토리 로그 테이블 생성
CREATE TABLE history_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'bulk_import')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('student', 'attendance', 'settings')),
  entity_id TEXT NOT NULL,
  changes JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- 인덱스 생성 (성능 최적화)
-- ==============================================

-- 학생 테이블 인덱스
CREATE INDEX idx_students_class_active ON students(class_name, active);
CREATE INDEX idx_students_active ON students(active);

-- 출결 테이블 인덱스
CREATE INDEX idx_attendances_date ON attendances(date);
CREATE INDEX idx_attendances_student_date ON attendances(student_id, date);
CREATE INDEX idx_attendances_date_period ON attendances(date, period);
CREATE INDEX idx_attendances_status ON attendances(status);

-- 히스토리 로그 인덱스
CREATE INDEX idx_history_logs_timestamp ON history_logs(timestamp DESC);
CREATE INDEX idx_history_logs_entity ON history_logs(entity_type, entity_id);

-- ==============================================
-- 트리거 생성 (자동 업데이트)
-- ==============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 적용
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- last_modified 자동 업데이트 트리거
CREATE TRIGGER update_attendances_last_modified
  BEFORE UPDATE ON attendances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- RLS (Row Level Security) 설정
-- ==============================================

-- RLS 활성화
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_logs ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 모든 데이터에 접근 가능 (단일 사용자 앱)
-- 실제 운영시에는 적절한 정책으로 변경 필요
CREATE POLICY "모든 작업 허용" ON students FOR ALL USING (true);
CREATE POLICY "모든 작업 허용" ON attendances FOR ALL USING (true);
CREATE POLICY "모든 작업 허용" ON settings FOR ALL USING (true);
CREATE POLICY "모든 작업 허용" ON history_logs FOR ALL USING (true);

-- ==============================================
-- 초기 데이터 삽입
-- ==============================================

-- 기본 설정 삽입
INSERT INTO settings (id, school_name, periods_per_day, start_date, end_date)
VALUES ('default', '우리 학교', 6, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year')
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- 뷰 생성 (편의성)
-- ==============================================

-- 학생별 출결 현황 뷰
CREATE OR REPLACE VIEW student_attendance_summary AS
SELECT
  s.id,
  s.name,
  s.class_name,
  s.number,
  COUNT(a.id) as total_records,
  COUNT(CASE WHEN a.status = '출석' THEN 1 END) as present_count,
  COUNT(CASE WHEN a.status = '결석' THEN 1 END) as absent_count,
  COUNT(CASE WHEN a.status = '지각' THEN 1 END) as late_count,
  COUNT(CASE WHEN a.status = '조퇴' THEN 1 END) as early_leave_count,
  ROUND(
    COALESCE(
      COUNT(CASE WHEN a.status = '출석' THEN 1 END) * 100.0 /
      NULLIF(COUNT(a.id), 0),
      0
    ), 2
  ) as attendance_rate
FROM students s
LEFT JOIN attendances a ON s.id = a.student_id
WHERE s.active = true
GROUP BY s.id, s.name, s.class_name, s.number;

-- 일별 출결 현황 뷰
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT
  a.date,
  COUNT(DISTINCT a.student_id) as total_students,
  COUNT(CASE WHEN a.status = '출석' THEN 1 END) as present_count,
  COUNT(CASE WHEN a.status = '결석' THEN 1 END) as absent_count,
  COUNT(CASE WHEN a.status = '지각' THEN 1 END) as late_count,
  COUNT(CASE WHEN a.status = '조퇴' THEN 1 END) as early_leave_count
FROM attendances a
GROUP BY a.date
ORDER BY a.date DESC;

-- 실행 완료 메시지
SELECT '✅ Supabase 테이블 생성이 완료되었습니다!' as message;