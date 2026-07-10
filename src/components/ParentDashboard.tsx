/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Calendar, 
  BookOpen, 
  Check, 
  Plus, 
  Clock, 
  Utensils, 
  User, 
  Sparkles, 
  FileText, 
  AlertCircle, 
  X, 
  LogOut, 
  ShieldCheck, 
  ChevronRight,
  ChevronLeft,
  Menu,
  Calculator,
  Smile,
  LogIn,
  Image as ImageIcon,
  Eye,
  Camera,
  Bell,
  CreditCard,
  QrCode,
  Coins
} from 'lucide-react';
import { UserSession, Student, Classroom, TalentSubject, WeeklyMenu, AbsenceReport, AttendanceRecord, HealthRecord, DailyAssessment, TeacherNotification } from '../types';
import { StorageService } from '../utils/storage';

interface ParentDashboardProps {
  session: UserSession;
  onLogout: () => void;
  settings: any;
}

export default function ParentDashboard({ session, onLogout, settings }: ParentDashboardProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);
  
  // Menu tab state: 'menu' | 'talent' | 'absence' | 'attendance' | 'health' | 'assessment'
  const [activeTab, setActiveTab] = useState<'menu' | 'talent' | 'absence' | 'attendance' | 'health' | 'assessment'>('menu');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Attendance Records history list
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [childHealthRecords, setChildHealthRecords] = useState<HealthRecord[]>([]);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  // Daily Assessments state
  const [dailyAssessments, setDailyAssessments] = useState<DailyAssessment[]>([]);
  const [assessmentMonth, setAssessmentMonth] = useState('2026-07');

  // View mode for weekly menu: 'text' (bảng biểu) | 'image' (ảnh thực đơn gốc)
  const [menuViewMode, setMenuViewMode] = useState<'text' | 'image'>('text');
  
  // Weekly Menu data
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
  
  // Absence states
  const [absenceReports, setAbsenceReports] = useState<AbsenceReport[]>([]);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Register talent states
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>([]);
  const [isTalentSaving, setIsTalentSaving] = useState(false);
  const [talentSuccess, setTalentSuccess] = useState('');
  const [simulatedMonth, setSimulatedMonth] = useState('2026-07');
  const [isConfirmTalentModalOpen, setIsConfirmTalentModalOpen] = useState(false);

  // Payment states after talent registration
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentSubjects, setPaymentSubjects] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('qr');

  // Initial Load
  useEffect(() => {
    const loadedStudents = StorageService.getStudents();
    const loadedClassrooms = StorageService.getClassrooms();
    const parentPhone = session.parentPhone || '';
    
    // Find students matching this parent's phone number
    const parentStudents = loadedStudents.filter(s => 
      s.parentPhone === parentPhone || 
      s.fatherPhone === parentPhone || 
      s.motherPhone === parentPhone || 
      s.guardianPhone === parentPhone
    );
    setStudents(parentStudents);
    setClassrooms(loadedClassrooms);
    
    if (parentStudents.length > 0) {
      setSelectedStudent(parentStudents[0]);
    }
    
    // Load weekly menu
    setWeeklyMenu(StorageService.getWeeklyMenu());
    
    // Load absence reports for this parent
    const allReports = StorageService.getAbsenceReports();
    const filteredReports = allReports.filter(r => r.parentPhone === parentPhone);
    setAbsenceReports(filteredReports);

    // Load daily assessments
    setDailyAssessments(StorageService.getDailyAssessments());
  }, [session.parentPhone]);

  // Update selected class when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      const cls = classrooms.find(c => c.id === selectedStudent.classId) || null;
      setSelectedClass(cls);
      
      // Load student registered talent subjects
      setSelectedTalentIds(selectedStudent.registeredTalentSubjects || []);
      setTalentSuccess('');

      // Load attendance logs for this child
      const allAttendance = StorageService.getAttendance();
      const childAttendance = allAttendance.filter(r => r.studentId === selectedStudent.id);
      setAttendanceRecords(childAttendance);

      // Load health records for this child
      const allHealth = StorageService.getHealthRecords();
      const childHealth = allHealth.filter(r => r.studentId === selectedStudent.id);
      setChildHealthRecords(childHealth);

      // Reload daily assessments
      setDailyAssessments(StorageService.getDailyAssessments());
    } else {
      setSelectedClass(null);
      setAttendanceRecords([]);
      setChildHealthRecords([]);
    }
  }, [selectedStudent, classrooms]);

  // Refresh absence reports list
  const refreshReports = () => {
    const allReports = StorageService.getAbsenceReports();
    const filteredReports = allReports.filter(r => r.parentPhone === session.parentPhone);
    setAbsenceReports(filteredReports);
  };

  // Handle Talent Subjects registration toggle
  const handleTalentToggle = (subjectId: string) => {
    const isLocked = selectedStudent?.talentLastRegisteredMonth === simulatedMonth;
    if (isLocked) return; // Locked for the current month!
    
    setTalentSuccess('');
    if (selectedTalentIds.includes(subjectId)) {
      setSelectedTalentIds(selectedTalentIds.filter(id => id !== subjectId));
    } else {
      setSelectedTalentIds([...selectedTalentIds, subjectId]);
    }
  };

  // Open confirmation dialog instead of saving immediately
  const handleSaveTalents = () => {
    if (!selectedStudent) return;
    const isLocked = selectedStudent?.talentLastRegisteredMonth === simulatedMonth;
    if (isLocked) return; // Locked for the current month!

    setTalentSuccess('');
    setIsConfirmTalentModalOpen(true);
  };

  // Actual Save & Notification trigger after confirmation
  const confirmSaveTalents = () => {
    if (!selectedStudent) return;
    setIsConfirmTalentModalOpen(false);
    setIsTalentSaving(true);
    setTalentSuccess('');

    setTimeout(() => {
      // Find matching class subjects to compute dynamic talent fee sum
      let totalFee = 0;
      const selectedSubjectNames: string[] = [];
      const selectedSubjectsList: any[] = [];
      if (selectedClass && selectedClass.talentSubjects) {
        selectedClass.talentSubjects.forEach(s => {
          if (selectedTalentIds.includes(s.id)) {
            totalFee += s.fee;
            selectedSubjectNames.push(s.name);
            selectedSubjectsList.push(s);
          }
        });
      }

      // Update student
      const allStudents = StorageService.getStudents();
      const updatedStudents = allStudents.map(s => {
        if (s.id === selectedStudent.id) {
          return {
            ...s,
            registeredTalentSubjects: selectedTalentIds,
            talentFee: totalFee,
            talentLastRegisteredMonth: simulatedMonth,
          };
        }
        return s;
      });

      StorageService.saveStudents(updatedStudents);
      
      // Update selected student local state
      const updatedSelected = updatedStudents.find(s => s.id === selectedStudent.id) || null;
      if (updatedSelected) {
        setSelectedStudent(updatedSelected);
      }

      // CREATE TEACHER NOTIFICATION
      // Let's determine if it's a register or change
      const isChange = !!selectedStudent.talentLastRegisteredMonth;
      const subjectListStr = selectedSubjectNames.length > 0 
        ? selectedSubjectNames.join(', ') 
        : 'Không đăng ký môn nào (Hủy đăng ký)';
        
      const content = isChange
        ? `Phụ huynh đã THAY ĐỔI đăng ký môn năng khiếu của bé sang: ${subjectListStr} (Học phí dự kiến: ${totalFee.toLocaleString('vi-VN')} đ/tháng) áp dụng từ tháng ${simulatedMonth}.`
        : `Phụ huynh đã ĐĂNG KÝ mới môn năng khiếu cho bé: ${subjectListStr} với tổng học phí ${totalFee.toLocaleString('vi-VN')} đ/tháng cho tháng ${simulatedMonth}.`;

      const newNotif: TeacherNotification = {
        id: 'notif_talent_' + Date.now(),
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        classId: selectedStudent.classId,
        className: selectedClass?.name || selectedStudent.className || 'Lớp học',
        parentPhone: session.parentPhone || '',
        parentName: session.parentName || 'Phụ huynh',
        type: isChange ? 'talent_change' : 'talent_register',
        content,
        createdAt: new Date().toISOString(),
        read: false,
      };

      const existingNotifs = StorageService.getTeacherNotifications();
      StorageService.saveTeacherNotifications([newNotif, ...existingNotifs]);
      
      setIsTalentSaving(false);
      setTalentSuccess(
        isChange
          ? `Đã thay đổi đăng ký môn năng khiếu thành công! Giáo viên chủ nhiệm đã nhận được thông báo.`
          : `Xác nhận đăng ký môn năng khiếu thành công và đã tự động gửi thông báo đến Giáo viên lớp!`
      );

      // Open payment modal if there is a positive fee
      if (totalFee > 0) {
        setPaymentAmount(totalFee);
        setPaymentSubjects(selectedSubjectsList);
        setPaymentMethod('qr');
        setIsPaymentModalOpen(true);
      }
    }, 600);
  };

  // Submit absence report
  const handleAbsenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedStudent || !selectedClass) {
      setFormError('Không có thông tin học sinh.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Vui lòng chọn ngày nghỉ học đầy đủ.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setFormError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Vui lòng nhập lý do nghỉ học.');
      return;
    }

    const newReport: AbsenceReport = {
      id: `abs_${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      classId: selectedStudent.classId,
      className: selectedClass.name,
      startDate,
      endDate,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      parentPhone: session.parentPhone || '',
    };

    const currentReports = StorageService.getAbsenceReports();
    StorageService.saveAbsenceReports([newReport, ...currentReports]);

    setFormSuccess('Gửi đơn xin nghỉ học thành công! Đang chờ Nhà Trường phê duyệt.');
    setStartDate('');
    setEndDate('');
    setReason('');
    
    // Refresh lists
    refreshReports();
    
    setTimeout(() => {
      setIsAbsenceModalOpen(false);
      setFormSuccess('');
    }, 1500);
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/10">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Đã đồng ý
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full border border-rose-500/10">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
            Từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/10">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
            Đang chờ duyệt
          </span>
        );
    }
  };

  const menuItems = [
    { id: 'menu' as const, label: 'Thực đơn dinh dưỡng', icon: Utensils },
    { id: 'talent' as const, label: 'Đăng ký năng khiếu', icon: BookOpen },
    { id: 'absence' as const, label: 'Báo vắng trực tuyến', icon: Calendar },
    { id: 'attendance' as const, label: 'Nhật ký điểm danh', icon: Camera },
    { id: 'health' as const, label: 'Sức khỏe của con', icon: Heart },
    { id: 'assessment' as const, label: 'Đánh giá hằng ngày', icon: Smile },
  ];

  const getLogoBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600';
      case 'violet': return 'bg-violet-600';
      case 'rose': return 'bg-rose-600';
      case 'amber': return 'bg-amber-600';
      default: return 'bg-indigo-600';
    }
  };

  const getActiveItemClass = (itemId: string) => {
    if (activeTab === itemId) {
      switch (settings.themeColor) {
        case 'emerald': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold';
        case 'violet': return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 font-semibold';
        case 'rose': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold';
        case 'amber': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold';
        default: return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold';
      }
    }
    return 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100';
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300">
      {/* Sidebar Header */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-100 dark:border-slate-800">
        {settings.schoolLogo ? (
          <img
            src={settings.schoolLogo}
            alt="School Logo"
            className="w-8 h-8 rounded-lg object-cover shrink-0 shadow-xs border border-slate-150 dark:border-slate-800"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xl italic shrink-0 ${getLogoBgClass()}`}>
            🏫
          </div>
        )}
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
          <h2 className="font-bold text-xs sm:text-sm leading-snug tracking-tight text-slate-800 dark:text-white line-clamp-2" title={settings.schoolName || 'EduAttend'}>
            {settings.schoolName || 'EduAttend'}
          </h2>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            CỔNG PHỤ HUYNH
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group cursor-pointer ${getActiveItemClass(
                item.id
              )}`}
            >
              <Icon size={18} className="shrink-0" />
              <span className={`transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'opacity-100 w-auto'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={18} className="shrink-0" />
          <span className={`transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'opacity-100 w-auto'}`}>
            Đăng xuất
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${settings.themeColor === 'rose' ? 'bg-pink-50/50 dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'} text-slate-800 dark:text-slate-100 transition-colors duration-300`}>
      
      {/* 1. SIDEBAR DESKTOP */}
      <aside className={`hidden md:block shrink-0 h-screen sticky top-0 transition-all duration-300 z-20 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        {sidebarContent}
      </aside>

      {/* 2. SIDEBAR MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Sidebar Panel */}
          <aside className="relative w-64 max-w-xs h-full bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col">
            {sidebarContent}
            {/* Close button inside mobile menu */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </aside>
        </div>
      )}

      {/* 3. MAIN WORKING ZONE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen relative">
        
        {/* Top Header navbar */}
        <header className="no-print h-16 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 px-8 flex items-center justify-between z-20 shrink-0">
          
          <div className="flex items-center gap-3">
            {/* Hamburger button on Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 cursor-pointer"
              title={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            
            {/* Breadcrumb Info */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <span className="font-medium">Phụ huynh</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {activeTab === 'menu' ? 'Thực đơn dinh dưỡng tuần' :
                 activeTab === 'talent' ? 'Đăng ký môn năng khiếu' :
                 activeTab === 'absence' ? 'Báo vắng trực tuyến' :
                 activeTab === 'attendance' ? 'Nhật ký điểm danh' :
                 activeTab === 'health' ? 'Sức khỏe chỉ số của con' : 'Đánh giá hằng ngày từ cô'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Cloud Sync Status Badge */}
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-full text-xs font-semibold select-none text-emerald-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              Cloud Synced
            </span>

            {/* Digital Clock display */}
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              <Clock size={14} className={settings.themeColor === 'rose' ? 'text-rose-500' : 'text-emerald-500'} />
              <span>{new Date().toLocaleDateString('vi-VN')}</span>
            </div>

            {/* User Profile Badge (Right) */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl">
              <User size={13} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {session.parentName || 'Phụ Huynh'}
              </span>
            </div>
          </div>

        </header>

        {/* Content area */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto pb-12">
          
          {/* Friendly Announcement Bar for Parents */}
          <div className={`mb-6 p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs transition-all duration-300 ${
            settings.themeColor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300' :
            settings.themeColor === 'violet' ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30 text-purple-800 dark:text-purple-300' :
            settings.themeColor === 'rose' ? 'bg-pink-50/50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30 text-pink-850 dark:text-pink-300' :
            settings.themeColor === 'amber' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-850 dark:text-amber-300' :
            'bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30 text-sky-850 dark:text-sky-300'
          }`}>
            <div className="flex items-center gap-3.5">
              <span className="text-3xl animate-bounce">🎈</span>
              <div>
                <h2 className="text-sm font-bold tracking-tight">
                  Chào mừng quý phụ huynh đến với Cổng Kết Nối Gia Đình <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{settings.schoolName || 'TRƯỜNG MẦM NON 3'}</span>!
                </h2>
                <p className="text-[11px] opacity-85 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                  <span>🏫 Cùng đồng hành và theo dõi hành trình học tập, phát triển toàn diện của bé yêu hằng ngày.</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-slate-800 text-[9px] font-bold text-rose-500">Kết Nối 2 Chiều 🌟</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <span className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-xs shadow-2xs select-none" title="Hoạt động nghệ thuật">🎨</span>
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-xs shadow-2xs select-none" title="Giờ ăn bổ dưỡng">🍎</span>
                <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-xs shadow-2xs select-none" title="Rèn luyện thể thao">⚽</span>
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs shadow-2xs select-none" title="Nhạc kịch vui tươi">🎵</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-800 border border-current/10 shadow-3xs text-slate-700 dark:text-slate-300">
                Thân Thiện & An Toàn ❤️
              </span>
            </div>
          </div>

          {/* 2. CHOOSE CHILDREN CARD */}
          {students.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Chưa tìm thấy học sinh liên kết</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Số điện thoại <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300">{session.parentPhone}</code> chưa được Ban Giám Hiệu gán cho học sinh nào. 
                Vui lòng liên hệ trực tiếp với Trường để được cập nhật hồ sơ của con mình.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Child Selector Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Chọn Con Của Bạn</span>
                <div className="flex flex-wrap gap-3">
                  {students.map(student => {
                    const isSelected = selectedStudent?.id === student.id;
                    return (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`px-4 py-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200/50 flex items-center justify-center bg-slate-100 shrink-0">
                          {student.avatar ? (
                            <img src={student.avatar} alt="Avatar con" className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {student.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Mã: {student.studentCode} • {student.className || 'Chưa xếp lớp'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            {/* Child Specific Info Quick Panel */}
            {selectedStudent && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-emerald-500/5 to-indigo-500/5 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trạng Thái Đóng Học Phí Năng Khiếu</span>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                      Tổng tiền: {((selectedStudent.talentFee || 0)).toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      (Dành riêng cho {selectedStudent.registeredTalentSubjects?.length || 0} môn đăng ký)
                    </span>
                  </div>
                  <div>
                    {selectedStudent.talentFeePaid ? (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/10 flex items-center gap-1">
                        <Check size={13} /> Đã đóng
                      </span>
                    ) : (
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-500/10">
                        Chưa đóng
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
                  <div className="space-y-2 w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lịch Học Năng Khiếu Của Con</span>
                    <div className="space-y-2">
                      {selectedStudent.registeredTalentSubjects && selectedStudent.registeredTalentSubjects.length > 0 ? (
                        selectedStudent.registeredTalentSubjects.map(tsId => {
                          const subj = selectedClass?.talentSubjects?.find(t => t.id === tsId);
                          if (!subj) return null;
                          return (
                            <div key={tsId} className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100/60 dark:border-indigo-950/40 space-y-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                  {subj.name}
                                </span>
                                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                  {subj.fee.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                              {(subj.schedule || subj.timeSlot) && (
                                <div className="grid grid-cols-1 gap-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100/50 dark:border-slate-800/50 pt-1.5 mt-1.5">
                                  {subj.schedule && (
                                    <div className="flex items-center gap-1.5">
                                      <Calendar size={11} className="text-emerald-500 shrink-0" />
                                      <span>Lịch: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{subj.schedule}</strong></span>
                                    </div>
                                  )}
                                  {subj.timeSlot && (
                                    <div className="flex items-center gap-1.5">
                                      <Clock size={11} className="text-amber-500 shrink-0" />
                                      <span>Giờ: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{subj.timeSlot}</strong></span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-slate-400 dark:text-slate-500 text-[11px] italic py-2">
                          Chưa đăng ký môn nào cho con
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-teal-500/5 to-cyan-500/5 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lớp học hiện tại</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">
                      {selectedStudent.className || 'Chưa xếp lớp'}
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-normal">
                      {selectedClass?.description || 'Niên khóa hiện tại'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ACTIVE TAB PANEL RENDERING */}
            <div className="min-h-[400px] mt-4">
              
              {/* TAB 1: WEEKLY MENU PANEL */}
              {activeTab === 'menu' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Utensils size={20} className="text-amber-500" />
                        Thực Đơn Dinh Dưỡng Cho Bé Tuần Này
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Thực đơn được xây dựng khoa học bởi Chuyên gia dinh dưỡng và Ban Giám Hiệu nhằm mang lại bữa ăn ngon miệng nhất cho các bé.
                      </p>
                    </div>
                    <span className="self-start sm:self-center bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-amber-500/10 flex items-center gap-1 shrink-0">
                      <Sparkles size={11} className="animate-spin" style={{ animationDuration: '3s' }} /> Mẫu Chuẩn Quốc Gia
                    </span>
                  </div>

                  {/* SUB-TABS TO SWITCH VIEW MODES */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 select-none pt-2">
                    <button
                      type="button"
                      onClick={() => setMenuViewMode('text')}
                      className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                        menuViewMode === 'text'
                          ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                          : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <FileText size={13} />
                      Chi tiết thực đơn (Dạng bảng chữ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuViewMode('image')}
                      className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                        menuViewMode === 'image'
                          ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                          : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <ImageIcon size={13} />
                      Ảnh thực đơn gốc của trường
                      {weeklyMenu?.menuImage && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      )}
                    </button>
                  </div>

                  {weeklyMenu ? (
                    menuViewMode === 'image' ? (
                      /* SHOW IMAGE MODE */
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                        {weeklyMenu.menuImage ? (
                          <div className="space-y-4 w-full flex flex-col items-center">
                            <p className="text-xs text-slate-400">Ảnh chụp thực đơn gốc từ bảng thông báo của trường:</p>
                            <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-w-lg shadow-md group">
                              <img 
                                src={weeklyMenu.menuImage} 
                                alt="Official School Menu Poster" 
                                className="max-w-full h-auto object-contain cursor-zoom-in rounded-xl max-h-[500px]"
                                onClick={() => {
                                  // Open raw image in window or zoom
                                  const win = window.open();
                                  if (win) {
                                    win.document.write(`<iframe src="${weeklyMenu.menuImage}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  } else {
                                    alert("Để xem rõ hơn, vui lòng bật cửa sổ popups trên trình duyệt.");
                                  }
                                }}
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                <span className="bg-white/95 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 pointer-events-none">
                                  <Eye size={13} /> Xem kích thước lớn
                                </span>
                              </div>
                            </div>
                            <a
                              href={weeklyMenu.menuImage}
                              download="Thuc_Don_Tuan_Truong_Mam_Non.png"
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-250 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                            >
                              Tải ảnh thực đơn về máy
                            </a>
                          </div>
                        ) : (
                          <div className="p-8 text-center flex flex-col items-center gap-3">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full">
                              <ImageIcon size={28} />
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-slate-750 dark:text-slate-300 text-sm">Chưa có ảnh thực đơn gốc</p>
                              <p className="text-xs text-slate-400 max-w-sm">Nhà trường chưa cập nhật ảnh chụp thực đơn tuần này. Quý phụ huynh vui lòng nhấp vào tab "Chi tiết thực đơn" bên cạnh để xem dạng chữ chi tiết.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* SHOW TEXT CARD MODE */
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Monday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Hai</span>
                          <span className="text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded font-bold">Thứ 2 đầu tuần</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.monday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.monday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.monday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.monday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.monday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>

                      {/* Tuesday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Ba</span>
                          <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded font-bold">Bữa ăn giàu kẽm</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.tuesday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.tuesday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.tuesday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.tuesday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.tuesday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>

                      {/* Wednesday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Tư</span>
                          <span className="text-[10px] text-violet-500 bg-violet-50 dark:bg-violet-950/20 px-1.5 py-0.5 rounded font-bold">Thực đơn canxi</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.wednesday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.wednesday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.wednesday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.wednesday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.wednesday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>

                      {/* Thursday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Năm</span>
                          <span className="text-[10px] text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded font-bold">Dinh dưỡng vàng</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.thursday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.thursday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.thursday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.thursday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.thursday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>

                      {/* Friday */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4.5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Thứ Sáu</span>
                          <span className="text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded font-bold">Tổng kết tuần</span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🌅 Bữa Sáng</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.friday.breakfast}</p>
                          </div>
                          {weeklyMenu.menu.friday.morningSnack && (
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍼 Phụ Sáng (9H)</span>
                              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.friday.morningSnack}</p>
                            </div>
                          )}
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">☀️ Bữa Trưa (11H)</span>
                            <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{weeklyMenu.menu.friday.lunch}</p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">🍰 Bữa Xế (14H30)</span>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{weeklyMenu.menu.friday.afternoonSnack}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl text-xs text-slate-400">
                      Chưa cấu hình thực đơn tuần mầm non.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TALENT REGISTRATION PANEL */}
              {activeTab === 'talent' && selectedStudent && (() => {
                const isLocked = selectedStudent.talentLastRegisteredMonth === simulatedMonth;
                return (
                  <div className="space-y-5 animate-fade-in">
                    {/* CONFIRMATION MODAL FOR TALENT REGISTRATION */}
                    {isConfirmTalentModalOpen && (
                      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-fade-in">
                          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                              <Bell size={22} className="animate-bounce" />
                            </div>
                            <div>
                              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                                {!selectedStudent.talentLastRegisteredMonth ? 'Xác Nhận Đăng Ký Năng Khiếu' : 'Xác Nhận Thay Đổi Đăng Ký'}
                              </h3>
                              <span className="text-[10px] text-slate-400 font-bold block">THÁNG GIẢ LẬP: {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]}</span>
                            </div>
                          </div>

                          <div className="space-y-3.5 text-xs">
                            <p className="text-slate-600 dark:text-slate-350 font-medium leading-relaxed">
                              Bạn đang thực hiện {!selectedStudent.talentLastRegisteredMonth ? 'đăng ký mới' : 'thay đổi'} môn năng khiếu cho bé <strong className="text-slate-800 dark:text-slate-200 font-bold">{selectedStudent.fullName}</strong>.
                            </p>

                            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Môn học đã chọn ({selectedTalentIds.length}):</span>
                              {selectedTalentIds.length === 0 ? (
                                <span className="text-slate-500 font-bold italic">Không đăng ký môn nào (Hủy đăng ký)</span>
                              ) : (
                                <ul className="space-y-1 pl-3 list-disc text-slate-700 dark:text-slate-300 font-semibold">
                                  {selectedClass?.talentSubjects?.filter(s => selectedTalentIds.includes(s.id)).map(s => (
                                    <li key={s.id}>
                                      {s.name} ({(s.fee).toLocaleString('vi-VN')} đ)
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="border-t border-dashed border-slate-200 dark:border-slate-750 pt-2 flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                                <span>Dự kiến học phí:</span>
                                <span className="text-amber-600 dark:text-amber-400 font-mono">
                                  {(selectedClass?.talentSubjects
                                    ?.filter(s => selectedTalentIds.includes(s.id))
                                    ?.reduce((sum, current) => sum + current.fee, 0) || 0).toLocaleString('vi-VN')} đ/tháng
                                </span>
                              </div>
                            </div>

                            <div className="p-3.5 bg-rose-500/10 border border-rose-500/10 text-rose-600 dark:text-rose-450 rounded-2xl font-bold leading-relaxed space-y-1">
                              <span className="block text-[10px] uppercase">⚠️ LƯU Ý QUAN TRỌNG:</span>
                              <p className="font-medium text-[11px]">
                                Sau khi xác nhận, đăng ký này sẽ <strong>được khóa lại và không thể tự ý thay đổi</strong> trong tháng này. Đồng thời, hệ thống sẽ <strong>tự động gửi thông báo trực tiếp</strong> đến Giáo viên chủ nhiệm lớp của con.
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setIsConfirmTalentModalOpen(false)}
                              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 rounded-xl cursor-pointer"
                            >
                              Hủy bỏ
                            </button>
                            <button
                              type="button"
                              onClick={confirmSaveTalents}
                              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1"
                            >
                              <Check size={14} strokeWidth={3} />
                              <span>Xác nhận đăng ký</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <BookOpen size={20} className="text-emerald-500" />
                          Đăng Ký Khóa Học Năng Khiếu Cho Con
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Các lớp ngoại khóa năng khiếu giúp trẻ khám phá năng lực bản thân, nâng cao thể chất và tư duy một cách toàn diện.
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                        <span>Khóa tháng:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                          {selectedStudent.talentLastRegisteredMonth || 'Chưa đăng ký'}
                        </span>
                      </div>
                    </div>

                    {/* DYNAMIC TIME SIMULATION CONTROL BAR */}
                    <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl animate-spin">⚙️</span>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Bộ Giả Lập Thời Gian Hệ Thống</span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                            Chuyển đổi tháng để kiểm thử tính năng Khóa / Mở khóa thay đổi đăng ký:
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setSimulatedMonth('2026-07')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                            simulatedMonth === '2026-07'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          Tháng 07/2026
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulatedMonth('2026-08')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                            simulatedMonth === '2026-08'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          Tháng 08/2026 (Tháng sau)
                        </button>
                      </div>
                    </div>

                    {/* LOCK WARNING BANNER */}
                    {isLocked && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs rounded-2xl flex items-start gap-3 animate-fade-in">
                        <div className="p-1.5 bg-amber-500/15 rounded-lg shrink-0 text-amber-600 dark:text-amber-400 mt-0.5">
                          <ShieldCheck size={16} />
                        </div>
                        <div className="space-y-1">
                          <span className="font-extrabold block uppercase tracking-wide">ĐĂNG KÝ ĐÃ KHÓA TRONG THÁNG {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]}</span>
                          <p className="font-medium leading-relaxed opacity-90">
                            Để bảo đảm sự ổn định trong công tác xếp lớp, sau khi đã xác nhận đăng ký môn năng khiếu, phụ huynh <strong>không được tự ý thay đổi đăng ký</strong> trong tháng này.
                          </p>
                          <p className="font-bold text-[11px] text-amber-700 dark:text-amber-350 mt-1 flex items-center gap-1">
                            <span>💡 Hãy bấm chọn nút <strong>"Tháng 08/2026 (Tháng sau)"</strong> ở trên để giả lập bước sang tháng mới và thực hiện thay đổi đăng ký của con!</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {talentSuccess && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2 animate-bounce">
                        <Heart size={16} className="fill-emerald-500 text-emerald-500" />
                        <span>{talentSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* List of available subjects in classroom */}
                      <div className="lg:col-span-2 space-y-3">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Các môn năng khiếu của lớp {selectedStudent.className}</span>
                        
                        {!selectedClass?.talentSubjects || selectedClass.talentSubjects.length === 0 ? (
                          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                            Lớp này hiện chưa cấu hình môn năng khiếu nào từ Ban Giám Hiệu.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {selectedClass.talentSubjects.map((subj: TalentSubject) => {
                              const isChecked = selectedTalentIds.includes(subj.id);
                              return (
                                <div 
                                  key={subj.id}
                                  onClick={() => handleTalentToggle(subj.id)}
                                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between h-full gap-3.5 ${
                                    isChecked
                                      ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                                  } ${isLocked ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer select-none'}`}
                                >
                                  <div className="flex justify-between items-start w-full gap-2">
                                    <div className="space-y-1">
                                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">{subj.name}</span>
                                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block font-mono">
                                        {(subj.fee).toLocaleString('vi-VN')} đ / tháng
                                      </span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                      isChecked 
                                        ? isLocked ? 'bg-slate-400 border-slate-400 text-white' : 'bg-emerald-600 border-emerald-600 text-white' 
                                        : 'border-slate-200 dark:border-slate-700'
                                    }`}>
                                      {isChecked && <Check size={12} strokeWidth={3} />}
                                    </div>
                                  </div>

                                  {subj.schedule || subj.timeSlot ? (
                                    <div className="space-y-1 w-full text-[11px] text-slate-500 dark:text-slate-400">
                                      {subj.schedule && (
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                                          <Calendar size={12} className="text-emerald-500 shrink-0" />
                                          <span className="truncate">Lịch: <strong className="text-slate-700 dark:text-slate-200 font-bold">{subj.schedule}</strong></span>
                                        </div>
                                      )}
                                      {subj.timeSlot && (
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                                          <Clock size={12} className="text-amber-500 shrink-0" />
                                          <span className="truncate">Giờ: <strong className="text-slate-700 dark:text-slate-200 font-bold">{subj.timeSlot}</strong></span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 w-full">
                                      Dạy 2 buổi/tuần, giáo án chuyên biệt
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Summary Bill and Action */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-fit space-y-4 shadow-sm">
                        <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Tóm tắt đăng ký</span>
                          <Calculator size={16} className="text-slate-400" />
                        </div>

                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between text-slate-400 font-medium">
                            <span>Học sinh:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{selectedStudent.fullName}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 font-medium">
                            <span>Số môn chọn:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{selectedTalentIds.length} môn</span>
                          </div>

                          {selectedTalentIds.length > 0 && (
                            <div className="border-t border-dashed border-slate-100 dark:border-slate-800 py-2 space-y-2 text-[11px] text-slate-500 font-medium">
                              {selectedClass?.talentSubjects?.filter(s => selectedTalentIds.includes(s.id)).map(s => (
                                <div key={s.id} className="flex flex-col border-b border-slate-100/50 dark:border-slate-850/50 pb-1.5 last:border-0 last:pb-0">
                                  <div className="flex justify-between font-semibold">
                                    <span>• {s.name}:</span>
                                    <span className="font-mono text-amber-600 dark:text-amber-400">{s.fee.toLocaleString('vi-VN')} đ</span>
                                  </div>
                                  {(s.schedule || s.timeSlot) && (
                                    <div className="text-[9px] text-slate-400 dark:text-slate-500 pl-2.5 italic">
                                      Lịch: {[s.schedule, s.timeSlot].filter(Boolean).join(' | ')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="border-t border-slate-150 dark:border-slate-800 pt-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Dự kiến học phí / tháng:</span>
                            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                              {(selectedClass?.talentSubjects
                                ?.filter(s => selectedTalentIds.includes(s.id))
                                ?.reduce((sum, current) => sum + current.fee, 0) || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>

                        {isLocked ? (
                          <div className="space-y-3 mt-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
                              <span className="text-2xl block">🔒</span>
                              <span className="text-[11px] font-bold text-slate-500 block">Đã Khóa Đăng Ký Tháng {simulatedMonth.split('-')[1]}</span>
                              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                Đăng ký của con đã được chốt và gửi đến Giáo viên. Không thể thay đổi trong tháng này.
                              </p>
                            </div>
                            {selectedTalentIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const list = selectedClass?.talentSubjects?.filter(s => selectedTalentIds.includes(s.id)) || [];
                                  const fee = list.reduce((sum, current) => sum + current.fee, 0) || 0;
                                  setPaymentAmount(fee);
                                  setPaymentSubjects(list);
                                  setPaymentMethod('qr');
                                  setIsPaymentModalOpen(true);
                                }}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-xl uppercase transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                💳 Xem Thông Tin Thanh Toán Học Phí
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSaveTalents}
                            disabled={isTalentSaving}
                            className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl uppercase transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isTalentSaving ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Check size={14} />
                                <span>Lưu & Xác Nhận Đăng Ký</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* TAB 3: ABSENCE REPORT PANEL */}
              {activeTab === 'absence' && selectedStudent && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar size={20} className="text-rose-500" />
                        Đăng Ký Báo Vắng Trên Phần Mềm
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Xin nghỉ học trực tuyến nhanh chóng. Giáo viên chủ nhiệm sẽ nhận thông báo điểm danh vắng phép ngay lập tức trên hệ thống lớp học.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => { setIsAbsenceModalOpen(true); setFormError(''); setFormSuccess(''); }}
                      className="self-start sm:self-center py-2 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold uppercase shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus size={14} />
                      <span>Tạo Đơn Xin Nghỉ Học</span>
                    </button>
                  </div>

                  {/* Absence Reports History Table */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Lịch sử xin nghỉ học của {selectedStudent.fullName}</span>
                    
                    {absenceReports.filter(r => r.studentId === selectedStudent.id).length === 0 ? (
                      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                        Chưa có đơn xin nghỉ học nào được gửi cho {selectedStudent.fullName}.
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800 select-none text-[10px] uppercase">
                                <th className="px-5 py-3.5 font-extrabold">Từ Ngày</th>
                                <th className="px-5 py-3.5 font-extrabold">Đến Ngày</th>
                                <th className="px-5 py-3.5 font-extrabold">Lý Do Xin Nghỉ</th>
                                <th className="px-5 py-3.5 font-extrabold">Ngày Gửi</th>
                                <th className="px-5 py-3.5 text-right font-extrabold">Trạng Thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-300">
                              {absenceReports
                                .filter(r => r.studentId === selectedStudent.id)
                                .map((report) => (
                                  <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                    <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-100 font-bold">
                                      {report.startDate}
                                    </td>
                                    <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-100 font-bold">
                                      {report.endDate}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={report.reason}>
                                      {report.reason}
                                    </td>
                                    <td className="px-5 py-3.5 text-[10px] text-slate-400 font-mono">
                                      {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                      {getStatusBadge(report.status)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && selectedStudent && (
                <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Camera size={20} className="text-emerald-500" />
                          Nhật Ký Điểm Danh Nhận Diện Khuôn Mặt (Camera)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Hình ảnh và mốc thời gian thực tế mỗi khi bé bước qua cửa lớp được ghi nhận bởi hệ thống camera AI của trường.
                        </p>
                      </div>
                      
                      {/* Brief statistics badges */}
                      <div className="flex gap-2 shrink-0">
                        <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Đúng Giờ</span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {attendanceRecords.filter(r => r.status === 'present').length} buổi
                          </span>
                        </div>
                        <div className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Đi Muộn</span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                            {attendanceRecords.filter(r => r.status === 'late').length} buổi
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {attendanceRecords.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center space-y-2.5">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mx-auto text-slate-400">
                        <Camera size={24} className="stroke-1" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có dữ liệu camera</h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Bé chưa có lượt quét điểm danh bằng camera tự động ngày hôm nay hoặc giáo viên chưa khởi chạy chế độ quét tại lớp.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {attendanceRecords.map((record) => (
                        <div 
                          key={record.id} 
                          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex gap-4 items-start shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                          {/* Left column: real-time camera snapshot */}
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-800 shrink-0 group">
                            <img 
                              src={record.photoCaptured || selectedStudent.avatar} 
                              alt="Check-in snapshot" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setSelectedPhotoModal(record.photoCaptured || selectedStudent.avatar)}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-950 rounded-lg text-[10px] font-bold uppercase shadow-sm cursor-pointer"
                              >
                                Phóng to
                              </button>
                            </div>
                          </div>

                          {/* Right column: check-in details */}
                          <div className="flex-1 space-y-2 text-xs">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Ngày điểm danh</span>
                                <strong className="text-slate-800 dark:text-slate-200 font-mono text-[13px]">
                                  {record.date}
                                </strong>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase text-[9px] ${
                                record.status === 'present'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}>
                                {record.status === 'present' ? 'Đúng Giờ' : 'Đi Muộn'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Thời gian quét</span>
                                <span className="text-slate-700 dark:text-slate-300 font-bold font-mono text-[11px]">{record.time}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">Thiết bị</span>
                                <span className="text-slate-500 text-[10px] leading-tight flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                                  Class-Cam AI
                                </span>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800/60">
                              ✏️ {record.notes || 'Điểm danh camera tự động'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'health' && selectedStudent && (() => {
                const ageInMonths = (() => {
                  if (!selectedStudent.dateOfBirth) return 0;
                  const dob = new Date(selectedStudent.dateOfBirth);
                  if (isNaN(dob.getTime())) return 0;
                  const now = new Date('2026-07-08');
                  const yearsDiff = now.getFullYear() - dob.getFullYear();
                  const monthsDiff = now.getMonth() - dob.getMonth();
                  const total = (yearsDiff * 12) + monthsDiff;
                  return total >= 0 ? total : 0;
                })();

                const latestRecord = childHealthRecords[0];

                const evaluateBMIParent = (bmi: number, recordAge: number) => {
                  if (recordAge < 60) {
                    return {
                      status: 'Dưới 60 tháng tuổi',
                      colorClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
                      textColor: 'text-slate-500 dark:text-slate-400',
                      bgColor: 'bg-slate-50 dark:bg-slate-850',
                      description: 'Hệ thống chỉ đánh giá chỉ số BMI tiêu chuẩn cho trẻ từ 60 tháng tuổi trở lên. Trẻ dưới 60 tháng tuổi được khuyến nghị theo dõi tăng trưởng theo biểu đồ chiều cao/cân nặng chuẩn WHO cho trẻ mầm non.'
                    };
                  }
                  if (bmi < 14) {
                    return {
                      status: 'Suy dinh dưỡng',
                      colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                      textColor: 'text-rose-600 dark:text-rose-400',
                      bgColor: 'bg-rose-50 dark:bg-rose-950/20',
                      description: 'Thể trạng của bé hiện đang thiếu cân hoặc còi cọc so với độ tuổi tiêu chuẩn. Nhà trường khuyến nghị bổ sung các bữa ăn giàu đạm, canxi và các vitamin cần thiết.'
                    };
                  } else if (bmi >= 14 && bmi < 18.5) {
                    return {
                      status: 'Bình thường',
                      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
                      textColor: 'text-emerald-600 dark:text-emerald-400',
                      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
                      description: 'Chỉ số thể chất tuyệt vời! Bé phát triển rất cân đối và khỏe mạnh. Ba mẹ hãy tiếp tục duy trì chế độ dinh dưỡng và vận động hiện tại cho bé nhé.'
                    };
                  } else if (bmi >= 18.5 && bmi < 23) {
                    return {
                      status: 'Dư cân',
                      colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                      textColor: 'text-amber-600 dark:text-amber-400',
                      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
                      description: 'Bé có xu hướng dư thừa cân nặng nhẹ so với độ tuổi tiêu chuẩn. Ba mẹ nên điều chỉnh giảm lượng tinh bột, đồ ngọt và khuyến khích bé tăng cường vận động ngoài trời.'
                    };
                  } else {
                    return {
                      status: 'Béo phì',
                      colorClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
                      textColor: 'text-red-600 dark:text-red-400',
                      bgColor: 'bg-red-50 dark:bg-red-950/20',
                      description: 'Chỉ số thể chất của bé đang ở mức báo động béo phì. Cần có chế độ dinh dưỡng nghiêm ngặt kết hợp tham vấn từ bác sĩ dinh dưỡng mầm non.'
                    };
                  }
                };

                const evaluation = latestRecord ? evaluateBMIParent(latestRecord.bmi || 0, ageInMonths) : null;

                return (
                  <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
                    
                    {/* Header bar */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Heart size={20} className="text-rose-500 fill-rose-500/10" />
                          Hồ Sơ Sức Khỏe & Thể Chất Của Bé
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Xem kết quả chiều cao, cân nặng và chỉ số BMI của bé được giáo viên đo đạc, theo dõi định kỳ tại lớp học.
                        </p>
                      </div>
                      <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-rose-500/10 flex items-center gap-1.5 shrink-0">
                        <span>Độ tuổi hiện tại: <strong>{ageInMonths} tháng tuổi</strong></span>
                      </div>
                    </div>

                    {/* Main Health Indicators Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Height Card */}
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs text-center space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chiều Cao</span>
                        {latestRecord ? (
                          <div className="space-y-1">
                            <span className="text-3xl font-black text-slate-850 dark:text-white font-mono">{latestRecord.height}</span>
                            <span className="text-xs font-bold text-slate-400 block">cm</span>
                          </div>
                        ) : (
                          <div className="py-4 text-slate-300 dark:text-slate-700 italic text-xs">Chưa có số đo</div>
                        )}
                      </div>

                      {/* Weight Card */}
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs text-center space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cân Nặng</span>
                        {latestRecord ? (
                          <div className="space-y-1">
                            <span className="text-3xl font-black text-slate-850 dark:text-white font-mono">{latestRecord.weight}</span>
                            <span className="text-xs font-bold text-slate-400 block">kg</span>
                          </div>
                        ) : (
                          <div className="py-4 text-slate-300 dark:text-slate-700 italic text-xs">Chưa có số đo</div>
                        )}
                      </div>

                      {/* BMI Card */}
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs text-center space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chỉ số khối (BMI)</span>
                        {latestRecord && latestRecord.bmi ? (
                          <div className="space-y-1">
                            <span className="text-3xl font-black text-slate-850 dark:text-white font-mono">{latestRecord.bmi}</span>
                            <span className="text-xs font-bold text-slate-400 block">kg/m²</span>
                          </div>
                        ) : latestRecord ? (
                          <div className="space-y-1">
                            <span className="text-lg font-bold text-slate-400 block py-1.5">N/A</span>
                            <span className="text-[10px] text-slate-400 block">Dưới 60 tháng tuổi</span>
                          </div>
                        ) : (
                          <div className="py-4 text-slate-300 dark:text-slate-700 italic text-xs">Chưa có số đo</div>
                        )}
                      </div>

                    </div>

                    {/* Diagnostic Summary & Educational Advice */}
                    {latestRecord && evaluation && (
                      <div className={`p-5 rounded-2xl ${evaluation.bgColor} border border-slate-200/40 dark:border-slate-800 space-y-3`}>
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Đánh giá thể trạng mầm non</h4>
                          <span className={`px-3 py-1 rounded-md font-extrabold text-[10px] uppercase ${evaluation.colorClass}`}>
                            {evaluation.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                          {evaluation.description}
                        </p>
                        {latestRecord.notes && (
                          <div className="pt-2.5 border-t border-slate-200/40 dark:border-slate-800/60 text-xs text-slate-500 flex items-start gap-1.5">
                            <span className="font-bold shrink-0">Lời khuyên giáo viên:</span>
                            <span>"{latestRecord.notes}"</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Historical Timeline of measurements */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-xs">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                        <FileText size={14} className="text-slate-400" />
                        Lịch sử đo đạc thể chất
                      </h4>

                      {childHealthRecords.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs font-medium italic">
                          Chưa ghi nhận số liệu sức khỏe nào cho bé từ trước đến nay.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="pb-3">Ngày đo</th>
                                <th className="pb-3 text-center">Chiều cao</th>
                                <th className="pb-3 text-center">Cân nặng</th>
                                <th className="pb-3 text-center">BMI</th>
                                <th className="pb-3">Trạng thái</th>
                                <th className="pb-3">Ghi chú từ lớp học</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-600 dark:text-slate-300">
                              {childHealthRecords.map((record) => {
                                const recordAge = (() => {
                                  if (!selectedStudent.dateOfBirth) return 0;
                                  const dob = new Date(selectedStudent.dateOfBirth);
                                  if (isNaN(dob.getTime())) return 0;
                                  const rDate = new Date(record.date);
                                  const yearsDiff = rDate.getFullYear() - dob.getFullYear();
                                  const monthsDiff = rDate.getMonth() - dob.getMonth();
                                  const total = (yearsDiff * 12) + monthsDiff;
                                  return total >= 0 ? total : 0;
                                })();
                                
                                const recordEval = evaluateBMIParent(record.bmi || 0, recordAge);

                                return (
                                  <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                                    <td className="py-3 font-mono font-bold">{record.date}</td>
                                    <td className="py-3 text-center font-mono font-bold text-slate-800 dark:text-white">{record.height} cm</td>
                                    <td className="py-3 text-center font-mono font-bold text-slate-800 dark:text-white">{record.weight} kg</td>
                                    <td className="py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                                      {record.bmi ? record.bmi : 'N/A'}
                                    </td>
                                    <td className="py-3">
                                      <span className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase ${recordEval.colorClass}`}>
                                        {recordEval.status}
                                      </span>
                                    </td>
                                    <td className="py-3 text-slate-400 italic max-w-xs truncate" title={record.notes}>
                                      {record.notes || '--'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })()}

              {activeTab === 'assessment' && selectedStudent && (() => {
                const [year, month] = assessmentMonth.split('-');
                const filtered = dailyAssessments.filter(a => {
                  if (a.studentId !== selectedStudent.id) return false;
                  const aDate = new Date(a.date);
                  return aDate.getFullYear() === parseInt(year) && (aDate.getMonth() + 1) === parseInt(month);
                }).sort((a, b) => b.date.localeCompare(a.date));

                return (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Smile size={20} className="text-emerald-500" />
                          Đánh Giá Tình Trạng Trẻ Hằng Ngày
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Xem chi tiết nhận xét về sức khỏe, ăn uống, ngủ trưa, tham gia hoạt động và vệ sinh của bé {selectedStudent.fullName}.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="month"
                          value={assessmentMonth}
                          onChange={(e) => setAssessmentMonth(e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                        />
                      </div>
                    </div>

                    {filtered.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-12 text-center text-slate-400 text-xs italic">
                        Chưa có dữ liệu đánh giá hằng ngày nào của bé trong tháng {month}/{year}.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {filtered.map((assessment) => (
                          <div key={assessment.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-xs hover:shadow-sm transition-all duration-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4 gap-2">
                              <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                                <Calendar size={14} className="text-slate-400" />
                                {(() => {
                                  const parts = assessment.date.split('-');
                                  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : assessment.date;
                                })()}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Cập nhật lúc: {new Date(assessment.createdAt || assessment.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center">
                                <span className="text-base mb-1">🏃</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sức khỏe</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.healthStatus}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center">
                                <span className="text-base mb-1">🍲</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ăn uống</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.diningStatus}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center">
                                <span className="text-base mb-1">💤</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ngủ trưa</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.sleepStatus}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center">
                                <span className="text-base mb-1">🌟</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hoạt động</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.activityStatus}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center col-span-2 sm:col-span-1">
                                <span className="text-base mb-1">🚽</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vệ sinh</span>
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">{assessment.hygieneStatus}</span>
                              </div>
                            </div>

                            {assessment.notes && (
                              <div className="p-4 bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-xl">
                                <h5 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-1 flex items-center gap-1">
                                  <span>✍️</span> Nhận xét chi tiết từ giáo viên chủ nhiệm
                                </h5>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic leading-relaxed">
                                  "{assessment.notes}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>
        )}
      </main>
    </div>

      {/* 5. ABSENCE REPORT MODAL */}
      {isAbsenceModalOpen && selectedStudent && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsAbsenceModalOpen(false)} />
          
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setIsAbsenceModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3.5">
              <Calendar size={24} />
              <h2 className="text-base font-extrabold">Đơn Xin Nghỉ Học Trực Tuyến</h2>
            </div>

            <p className="text-[11px] text-slate-400 mb-4 leading-normal">
              Vui lòng điền thông tin xin phép nghỉ học cho bé <strong className="text-slate-700 dark:text-slate-200">{selectedStudent.fullName}</strong> lớp <strong className="text-slate-700 dark:text-slate-200">{selectedClass.name}</strong>. Đơn sẽ gửi trực tiếp đến BGH nhà trường.
            </p>

            {formError && (
              <div className="mb-3.5 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-3.5 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <Check size={14} className="shrink-0" />
                <span className="font-medium">{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAbsenceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Nghỉ từ ngày</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Đến hết ngày</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Lý do nghỉ học</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Cháu bị sốt nhẹ đi khám bác sĩ, xin cho cháu nghỉ ở nhà chăm sóc..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAbsenceModalOpen(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
                >
                  Gửi đơn xin nghỉ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. REAL-TIME ATTENDANCE PHOTO LIGHTBOX */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs" onClick={() => setSelectedPhotoModal(null)} />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button 
              onClick={() => setSelectedPhotoModal(null)} 
              className="absolute top-5 right-5 z-20 p-2 bg-slate-900/60 hover:bg-slate-950 text-white rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="rounded-2xl overflow-hidden aspect-video bg-black flex items-center justify-center">
              <img 
                src={selectedPhotoModal} 
                className="max-h-[75vh] w-full object-contain animate-fade-in" 
                alt="Attendance Camera Snapshot Full" 
              />
            </div>
            
            <div className="p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Camera size={16} className="text-emerald-500" />
                <span>Ảnh ghi nhận thực tế từ hệ thống CameraAI Class-Cam</span>
              </div>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-mono font-bold text-slate-400">
                Chụp lúc: Điểm danh tự động
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. DYNAMIC TALENT REGISTRATION PAYMENT MODAL */}
      {isPaymentModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[120] overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsPaymentModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in text-slate-800 dark:text-slate-100 z-10">
            <button 
              onClick={() => setIsPaymentModalOpen(false)} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                <CreditCard size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                  Thanh Toán Học Phí Năng Khiếu
                </h3>
                <span className="text-[10px] text-slate-400 font-bold block">Tháng {simulatedMonth.split('-')[1]}/{simulatedMonth.split('-')[0]}</span>
              </div>
            </div>

            {/* Student details summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-500 font-medium">
                <span>Học sinh:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedStudent.fullName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 font-medium">
                <span>Môn học đăng ký:</span>
                <div className="text-right font-bold text-slate-700 dark:text-slate-300">
                  {paymentSubjects.length > 0 ? (
                    paymentSubjects.map((s, index) => (
                      <span key={s.id} className="block">
                        • {s.name} ({s.fee.toLocaleString('vi-VN')} đ)
                      </span>
                    ))
                  ) : (
                    <span className="italic text-slate-400">Không có môn nào</span>
                  )}
                </div>
              </div>
              <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-2.5 flex justify-between items-center font-extrabold text-slate-900 dark:text-white">
                <span className="text-xs uppercase">Tổng số tiền / tháng:</span>
                <span className="text-base text-amber-600 dark:text-amber-400 font-mono">
                  {paymentAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Select payment method tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-850 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('qr')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'qr'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <QrCode size={14} />
                <span>Chuyển khoản QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Coins size={14} />
                <span>Tiền mặt</span>
              </button>
            </div>

            {/* Payment method content */}
            <div className="space-y-4">
              {paymentMethod === 'qr' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mb-2 font-medium">
                      💡 Vui lòng mở ứng dụng Ngân hàng di động (Mobile Banking) để quét mã QR thanh toán nhanh hoặc thực hiện chuyển khoản thủ công theo thông tin dưới đây:
                    </p>
                    
                    <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-150 dark:border-slate-800/60 space-y-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Ngân hàng</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">Vietcombank (VCB)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Số tài khoản</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">1023456789</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('1023456789');
                              alert('Đã sao chép số tài khoản!');
                            }}
                            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
                          >
                            [Sao chép]
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Tên người thụ hưởng</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">TRUONG MAM NON BAN MAI</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Nội dung chuyển khoản</span>
                        <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 font-mono font-bold flex justify-between items-center mt-1">
                          <span className="select-all">HP NK {selectedStudent.studentCode || 'HS'} {selectedStudent.fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase()} T{simulatedMonth.split('-')[1]}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const contentText = `HP NK ${selectedStudent.studentCode || 'HS'} ${selectedStudent.fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase()} T${simulatedMonth.split('-')[1]}`;
                              navigator.clipboard.writeText(contentText);
                              alert('Đã sao chép nội dung chuyển khoản!');
                            }}
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer ml-1 shrink-0"
                          >
                            [Copy]
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800">
                    <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center">
                      <img
                        src={`https://img.vietqr.io/image/VCB-1023456789-compact2.png?amount=${paymentAmount}&addInfo=${encodeURIComponent(`HP NK ${selectedStudent.studentCode || 'HS'} ${selectedStudent.fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase()} T${simulatedMonth.split('-')[1]}`)}&accountName=TRUONG%20MAM%20NON%20BAN%20MAI`}
                        alt="VietQR Vietcombank"
                        className="w-48 h-48 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase mt-3 tracking-wider text-center">
                      Mã VietQR Tự Động Quét
                    </span>
                    <span className="text-[9px] text-slate-400 text-center mt-1">
                      Mở ứng dụng Ngân hàng của bạn để quét mã
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
                  <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-xl">
                    💵
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Hướng Dẫn Thanh Toán Tiền Mặt</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Phụ huynh vui lòng nộp tiền mặt trực tiếp tại <strong>Phòng Kế toán của nhà trường</strong> hoặc gửi trực tiếp cho <strong>Giáo viên chủ nhiệm lớp</strong> của con trước ngày <strong>10 hàng tháng</strong>.
                    </p>
                    <p className="text-[10px] text-slate-400 italic">
                      *Nhà trường sẽ in biên lai phiếu thu và gửi về ví cho phụ huynh sau khi nhận đủ tiền học phí mầm non & năng khiếu của bé.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold leading-normal">
              <span className="flex items-center gap-1">
                🛡️ Hệ thống thanh toán bảo mật mầm non
              </span>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl uppercase shadow-md transition text-xs cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
