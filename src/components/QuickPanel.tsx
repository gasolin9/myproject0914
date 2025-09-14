// ==============================================
// 빠른 입력 패널 - 수업 중 번개 입력용
// ==============================================

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { X, Search, Users, Clock, CheckCircle, AlertCircle, XCircle, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';

import { AttendanceStatus, Student, ATTENDANCE_STATUSES, STATUS_ICONS } from '../types';
import { StudentService } from '../services/StudentService';
import { AttendanceService } from '../services/AttendanceService';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface QuickPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickPanel({ isOpen, onClose }: QuickPanelProps) {
  const [currentStep, setCurrentStep] = useState<'date' | 'status' | 'students'>('date');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [activeStatus, setActiveStatus] = useState<AttendanceStatus>('결석');
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 패널이 열릴 때 학생 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadStudents();
      setCurrentStep('date');
      setSelectedStudents(new Set());
      setSearchTerm('');

      // 포커스 설정
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // 학생 검색 필터링
  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const filtered = students.filter(student =>
        student.name.toLowerCase().includes(term) ||
        student.number.toString().includes(term)
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [students, searchTerm]);

  // ESC 키로 패널 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // 클릭 외부 영역 시 패널 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const studentList = await StudentService.getStudents({
        active: true,
        sortBy: 'number',
        sortOrder: 'asc'
      });
      setStudents(studentList);
    } catch (error) {
      console.error('학생 목록 로드 실패:', error);
      toast.error('학생 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const handleSaveAttendances = async () => {
    if (selectedStudents.size === 0) {
      toast.error('학생을 선택해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const attendanceInputs = Array.from(selectedStudents).map(studentId => ({
        studentId,
        date: selectedDate,
        period: selectedPeriod,
        status: activeStatus,
        reason: activeStatus === '지각' || activeStatus === '조퇴' ? `${selectedPeriod}교시` : undefined
      }));

      const result = await AttendanceService.addBulkAttendances(attendanceInputs);

      if (result.success.length > 0) {
        toast.success(`${result.success.length}명의 출결이 저장되었습니다.`);
      }

      if (result.failed.length > 0) {
        toast.error(`${result.failed.length}명의 출결 저장에 실패했습니다.`);
      }

      // 성공한 학생들은 선택에서 제거
      const successIds = new Set(result.success.map(entry => entry.studentId));
      setSelectedStudents(prev => new Set([...prev].filter(id => !successIds.has(id))));

      // 모든 학생이 처리되면 패널 닫기
      if (selectedStudents.size === result.success.length) {
        setTimeout(() => onClose(), 1000);
      }

    } catch (error) {
      console.error('출결 저장 실패:', error);
      toast.error('출결 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    const icons = {
      '출석': <CheckCircle className="w-5 h-5" />,
      '지각': <Clock className="w-5 h-5" />,
      '조퇴': <Minus className="w-5 h-5" />,
      '결석': <XCircle className="w-5 h-5" />
    };
    return icons[status];
  };

  const getStatusColor = (status: AttendanceStatus) => {
    const colors = {
      '출석': 'text-green-600 bg-green-50 border-green-200',
      '지각': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      '조퇴': 'text-orange-600 bg-orange-50 border-orange-200',
      '결석': 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[status];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        ref={panelRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">빠른 출결 입력</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center px-6 py-4 bg-gray-50 border-b">
          {[
            { step: 'date', label: '날짜/교시', icon: Clock },
            { step: 'status', label: '출결 상태', icon: AlertCircle },
            { step: 'students', label: '학생 선택', icon: Users }
          ].map(({ step, label, icon: Icon }, index) => (
            <React.Fragment key={step}>
              <div
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer',
                  currentStep === step
                    ? 'bg-blue-600 text-white'
                    : index < ['date', 'status', 'students'].indexOf(currentStep)
                    ? 'bg-green-100 text-green-800'
                    : 'text-gray-500'
                )}
                onClick={() => setCurrentStep(step as any)}
              >
                <Icon className="w-4 h-4" />
                {label}
              </div>
              {index < 2 && (
                <div className="w-8 h-px bg-gray-300 mx-2" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 컨텐츠 영역 */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {currentStep === 'date' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    날짜
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input"
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    교시 (선택사항)
                  </label>
                  <select
                    value={selectedPeriod || ''}
                    onChange={(e) => setSelectedPeriod(e.target.value ? parseInt(e.target.value) : null)}
                    className="input"
                  >
                    <option value="">종일</option>
                    {Array.from({ length: 6 }, (_, i) => i + 1).map(period => (
                      <option key={period} value={period}>
                        {period}교시
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep('status')}
                  className="btn btn-primary"
                >
                  다음 단계
                </button>
              </div>
            </div>
          )}

          {currentStep === 'status' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  출결 상태 선택
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ATTENDANCE_STATUSES.map(status => (
                    <button
                      key={status}
                      onClick={() => setActiveStatus(status)}
                      className={clsx(
                        'flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all',
                        activeStatus === status
                          ? getStatusColor(status)
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {getStatusIcon(status)}
                      <span className="font-medium">{status}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('date')}
                  className="btn btn-secondary"
                >
                  이전 단계
                </button>
                <button
                  onClick={() => setCurrentStep('students')}
                  className="btn btn-primary"
                >
                  다음 단계
                </button>
              </div>
            </div>
          )}

          {currentStep === 'students' && (
            <div className="space-y-4">
              {/* 검색 영역 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="이름 또는 번호로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {/* 선택된 상태 표시 */}
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">
                  {selectedStudents.size}명 선택됨
                </span>
                <div className={clsx('flex items-center gap-2 px-3 py-1 rounded-md text-sm', getStatusColor(activeStatus))}>
                  {getStatusIcon(activeStatus)}
                  {activeStatus}
                  {selectedPeriod && ` (${selectedPeriod}교시)`}
                </div>
              </div>

              {/* 학생 목록 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {isLoading ? (
                  <div className="col-span-full flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '학생 목록이 없습니다.'}
                  </div>
                ) : (
                  filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleStudentToggle(student.id)}
                      className={clsx(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                        selectedStudents.has(student.id)
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                        selectedStudents.has(student.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      )}>
                        {student.number}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.className}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setCurrentStep('status')}
                  className="btn btn-secondary"
                >
                  이전 단계
                </button>
                <button
                  onClick={handleSaveAttendances}
                  disabled={selectedStudents.size === 0 || isSaving}
                  className="btn btn-primary"
                >
                  {isSaving && <LoadingSpinner size="small" />}
                  {selectedStudents.size}명 저장
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}