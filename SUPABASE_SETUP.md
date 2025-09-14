# 📚 Supabase 출결관리 시스템 설정 가이드

출결관리 앱을 Supabase로 마이그레이션하여 데이터를 영구적으로 보존하는 방법을 안내합니다.

## 🎯 왜 Supabase인가?

- **영구 저장**: 컴퓨터를 껐다 켜도 데이터가 사라지지 않음
- **클라우드 백업**: 자동으로 백업되어 안전함
- **여러 기기 동기화**: 어디서나 같은 데이터에 접근 가능
- **무료 사용**: 개인/소규모 사용시 무료

## 🚀 설정 단계

### 1단계: Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 회원가입
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: attendance-app (또는 원하는 이름)
   - **Database Password**: 강한 비밀번호 설정
   - **Region**: Northeast Asia (Seoul) 선택
4. "Create new project" 클릭하고 2-3분 대기

### 2단계: 데이터베이스 설정

1. Supabase 대시보드에서 **"SQL Editor"** 메뉴 클릭
2. "New query" 버튼 클릭
3. `supabase-setup.sql` 파일의 내용을 복사해서 붙여넣기
4. **"Run"** 버튼 클릭하여 실행
5. ✅ "Supabase 테이블 생성이 완료되었습니다!" 메시지 확인

### 3단계: API 키 확인

1. **"Settings"** > **"API"** 메뉴로 이동
2. 다음 정보를 복사해 두세요:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJ...` (매우 긴 문자열)

### 4단계: 환경 변수 설정

1. 출결 앱 폴더에서 `.env.example` 파일을 `.env`로 복사
2. `.env` 파일을 열어서 다음과 같이 수정:

```env
# Supabase 설정
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **주의**: 실제 URL과 키로 교체하세요!

### 5단계: 앱 실행 및 테스트

1. 터미널에서 앱 폴더로 이동
2. 개발 서버 실행:
   ```bash
   npm run dev
   ```
3. 브라우저에서 앱을 열고 학생 추가/출결 기록 테스트
4. Supabase 대시보드에서 **"Table Editor"**로 데이터 확인

## 📊 데이터 확인 방법

### Supabase 대시보드에서 확인
1. **"Table Editor"** 메뉴 클릭
2. 테이블 선택해서 데이터 확인:
   - `students`: 학생 정보
   - `attendances`: 출결 기록
   - `settings`: 앱 설정
   - `history_logs`: 변경 이력

### 유용한 뷰 활용
- `student_attendance_summary`: 학생별 출결 현황
- `daily_attendance_summary`: 일별 출결 현황

## 🔧 트러블슈팅

### 연결 오류 해결
```
Error: Supabase URL과 Anon Key가 환경 변수에 설정되지 않았습니다.
```
**해결법**: `.env` 파일의 URL과 키가 정확한지 확인

### RLS 정책 오류
```
Error: new row violates row-level security policy
```
**해결법**: SQL 스크립트가 완전히 실행되었는지 확인

### 네트워크 오류
```
Error: Failed to fetch
```
**해결법**: 인터넷 연결 및 Supabase 서비스 상태 확인

## 📈 데이터 마이그레이션

### 기존 IndexedDB 데이터를 Supabase로 이전
1. 앱에서 "설정" > "데이터 내보내기" 실행
2. JSON 파일 저장
3. Supabase 연결 후 "데이터 가져오기"로 복원

### 백업 전략
- **일별 자동 백업**: Supabase에서 자동으로 처리
- **수동 백업**: JSON 내보내기 기능 활용
- **중복 저장**: 로컬(IndexedDB) + 클라우드(Supabase) 동시 사용 가능

## 🚨 보안 주의사항

1. **환경 변수 관리**
   - `.env` 파일을 Git에 커밋하지 마세요
   - 프로덕션에서는 서버 환경 변수 사용

2. **RLS 정책**
   - 현재는 모든 접근을 허용하는 설정
   - 다중 사용자 환경에서는 적절한 정책 설정 필요

3. **API 키 보호**
   - anon key는 공개해도 되지만 service key는 절대 노출 금지
   - 필요시 도메인 제한 설정

## 📞 지원

문제가 발생하면:
1. [Supabase 문서](https://supabase.com/docs) 확인
2. 콘솔에서 에러 메시지 확인
3. Supabase 대시보드의 "Logs" 메뉴에서 서버 로그 확인

---

✨ **설정 완료 후 출결 데이터가 영구적으로 보존됩니다!**