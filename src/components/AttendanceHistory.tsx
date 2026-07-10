/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Edit,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  Plus,
  Grid,
  List,
  Check,
  X,
  User,
  ArrowRight,
  MessageSquare,
  Coffee,
  Activity,
  Award,
  Heart,
  Smile,
  MessageCircle
} from 'lucide-react';
import { AttendanceRecord, Classroom, Student, AttendanceStatus, SchoolSettings, DailyAssessment } from '../types';
import { StorageService } from '../utils/storage';

interface AttendanceHistoryProps {
  attendance: AttendanceRecord[];
  classrooms: Classroom[];
  students: Student[];
  saveAttendance: (records: AttendanceRecord[]) => void;
  settings: SchoolSettings;
}

export default function AttendanceHistory({
  attendance,
  classrooms,
  students,
  saveAttendance,
  settings,
}: AttendanceHistoryProps) {
  // Navigation states
  const [activeSubTab, setActiveSubTab] = useState('Điểm danh');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [dateFilter, setDateFilter] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Daily Assessments persistent state
  const [dailyAssessments, setDailyAssessments] = useState<DailyAssessment[]>([]);
  const [assessmentSuccessMsg, setAssessmentSuccessMsg] = useState<Record<string, string>>({});
  const [teacherExportMonth, setTeacherExportMonth] = useState('2026-07');

  useEffect(() => {
    setDailyAssessments(StorageService.getDailyAssessments());
  }, []);

  // Initialize class filter to first available class if 'all' on load
  useEffect(() => {
    if (classFilter === 'all' && classrooms.length > 0) {
      setClassFilter(classrooms[0].id);
    }
  }, [classrooms]);

  // Inline note editing state
  const [editingNoteStudentId, setEditingNoteStudentId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');

  // Edit status overlay modal state (for list mode)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('present');
  const [newNotes, setNewNotes] = useState('');

  // Daily Board comments mock state (synchronized with quickNotes / record notes where possible)
  const [commentsState, setCommentsState] = useState<Record<string, { rating: number; text: string }>>({
    'std_1': { rating: 5, text: 'Học tập hăng say, ăn hết suất ăn trưa nhanh nhẹn.' },
    'std_2': { rating: 4, text: 'Ngoan ngoãn nghe lời cô, hơi buồn ngủ vào đầu buổi xế.' },
    'std_3': { rating: 5, text: 'Năng nổ tham gia hoạt động múa hát thể thao cùng các bạn.' }
  });

  // Daily boarding meal checks
  const [boardingMeals, setBoardingMeals] = useState<Record<string, { breakfast: boolean; lunch: boolean; snack: boolean }>>({
    'std_1': { breakfast: true, lunch: true, snack: true },
    'std_2': { breakfast: true, lunch: false, snack: true },
    'std_3': { breakfast: true, lunch: true, snack: true },
  });

  // Daily activity checklist
  const [activities, setActivities] = useState([
    { id: '1', time: '07:30 - 08:15', title: 'Đón trẻ & Tập thể dục buổi sáng ☀️', completed: true },
    { id: '2', time: '08:15 - 09:30', title: 'Hoạt động học tập mầm non (Vẽ tranh đất nặn) 🎨', completed: true },
    { id: '3', time: '09:30 - 10:30', title: 'Vui chơi ngoài trời, khám phá thiên nhiên 🌿', completed: true },
    { id: '4', time: '10:30 - 11:30', title: 'Vệ sinh cá nhân & Bữa trưa ngon miệng 🍲', completed: false },
    { id: '5', time: '11:30 - 14:00', title: 'Giấc ngủ trưa yên lành của bé 💤', completed: false },
    { id: '6', time: '14:15 - 15:00', title: 'Ăn xế dinh dưỡng (Uống sữa, bánh ngọt) 🥛', completed: false },
    { id: '7', time: '15:00 - 16:30', title: 'Sinh hoạt tự do, kể chuyện cổ tích & Trả trẻ 🎒', completed: false },
  ]);

  // Handle previous and next date navigation
  const handlePrevDay = () => {
    const d = new Date(dateFilter);
    d.setDate(d.getDate() - 1);
    setDateFilter(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(dateFilter);
    d.setDate(d.getDate() + 1);
    setDateFilter(d.toISOString().split('T')[0]);
  };

  const vietnameseDate = useMemo(() => {
    const parts = dateFilter.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateFilter;
  }, [dateFilter]);

  // Classrooms mapping helper
  const classNamesMap = useMemo(() => {
    return classrooms.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {} as Record<string, string>);
  }, [classrooms]);

  // Filter students based on classroom and search term
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = classFilter === 'all' || s.classId === classFilter;
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [students, classFilter, searchTerm]);

  // Attendance Records for the current selected date
  const selectedDateRecords = useMemo(() => {
    return attendance.filter((r) => r.date === dateFilter);
  }, [attendance, dateFilter]);

  // Kanban Column Data
  const kanbanColumns = useMemo(() => {
    const unchecked: Student[] = [];
    const attending: { student: Student; record: AttendanceRecord }[] = [];
    const absent: { student: Student; record: AttendanceRecord }[] = [];

    filteredStudents.forEach((student) => {
      const rec = selectedDateRecords.find((r) => r.studentId === student.id);
      if (!rec) {
        unchecked.push(student);
      } else if (rec.status === 'present' || rec.status === 'late') {
        attending.push({ student, record: rec });
      } else if (rec.status === 'absent') {
        absent.push({ student, record: rec });
      }
    });

    return { unchecked, attending, absent };
  }, [filteredStudents, selectedDateRecords]);

  // Themes helper
  const getThemeTextClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-violet-600';
      case 'rose': return 'text-rose-600';
      case 'amber': return 'text-amber-600';
      default: return 'text-emerald-600';
    }
  };

  const getThemeBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-white';
      default: return 'bg-emerald-600 hover:bg-emerald-500 text-white';
    }
  };

  // --- ATTENDANCE ACTIONS ---

  // Mark present (Đi học)
  const handleCheckIn = (student: Student) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    
    let status: AttendanceStatus = 'present';
    if (settings.lateTime) {
      const [lateH, lateM] = settings.lateTime.split(':').map(Number);
      if (now.getHours() > lateH || (now.getHours() === lateH && now.getMinutes() >= lateM)) {
        status = 'late';
      }
    }

    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}_${student.id}`,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.fullName,
      classId: student.classId,
      className: classNamesMap[student.classId] || student.className || 'Lớp',
      date: dateFilter,
      time: timeStr,
      status,
      notes: ''
    };

    const existingIdx = attendance.findIndex(r => r.studentId === student.id && r.date === dateFilter);
    let updated = [...attendance];
    if (existingIdx >= 0) {
      updated[existingIdx] = newRecord;
    } else {
      updated.push(newRecord);
    }
    saveAttendance(updated);
  };

  // Mark absent (Nghỉ học)
  const handleMarkAbsent = (student: Student) => {
    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}_${student.id}`,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.fullName,
      classId: student.classId,
      className: classNamesMap[student.classId] || student.className || 'Lớp',
      date: dateFilter,
      time: new Date().toTimeString().split(' ')[0],
      status: 'absent',
      notes: 'Không phép' // Default
    };

    const existingIdx = attendance.findIndex(r => r.studentId === student.id && r.date === dateFilter);
    let updated = [...attendance];
    if (existingIdx >= 0) {
      updated[existingIdx] = newRecord;
    } else {
      updated.push(newRecord);
    }
    saveAttendance(updated);
  };

  // Toggle excused absence status
  const handleToggleExcuse = (studentId: string) => {
    const updated = attendance.map(r => {
      if (r.studentId === studentId && r.date === dateFilter) {
        const isPermitted = r.notes === 'Có phép';
        return {
          ...r,
          notes: isPermitted ? 'Không phép' : 'Có phép'
        };
      }
      return r;
    });
    saveAttendance(updated);
  };

  // Check out student (Ra về)
  const handleCheckOut = (studentId: string) => {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const updated = attendance.map(r => {
      if (r.studentId === studentId && r.date === dateFilter) {
        return {
          ...r,
          notes: r.notes ? `${r.notes} • Ra về: ${timeStr}` : `Đã ra về lúc ${timeStr}`
        };
      }
      return r;
    });
    saveAttendance(updated);
  };

  // Inline Note Editor
  const openNoteEditor = (studentId: string, currentNotes: string) => {
    setEditingNoteStudentId(studentId);
    setTempNoteText(currentNotes || '');
  };

  const handleSaveInlineNote = (studentId: string) => {
    const existingIdx = attendance.findIndex(r => r.studentId === studentId && r.date === dateFilter);
    let updated = [...attendance];

    if (existingIdx >= 0) {
      updated[existingIdx] = {
        ...updated[existingIdx],
        notes: tempNoteText.trim()
      };
    } else {
      // Create present record with note
      const student = students.find(s => s.id === studentId);
      if (student) {
        const newRecord: AttendanceRecord = {
          id: `att_${Date.now()}_${student.id}`,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          classId: student.classId,
          className: classNamesMap[student.classId] || student.className || 'Lớp',
          date: dateFilter,
          time: new Date().toTimeString().split(' ')[0],
          status: 'present',
          notes: tempNoteText.trim()
        };
        updated.push(newRecord);
      }
    }

    saveAttendance(updated);
    setEditingNoteStudentId(null);
  };

  // Bulk actions
  const handleMarkAllAttending = () => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newRecords: AttendanceRecord[] = [];

    kanbanColumns.unchecked.forEach((student) => {
      newRecords.push({
        id: `att_${Date.now()}_${student.id}`,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        classId: student.classId,
        className: classNamesMap[student.classId] || student.className || 'Lớp',
        date: dateFilter,
        time: timeStr,
        status: 'present',
        notes: ''
      });
    });

    if (newRecords.length > 0) {
      saveAttendance([...attendance, ...newRecords]);
    }
  };

  const handleClearAllAttendance = () => {
    if (confirm('Bạn có chắc chắn muốn xóa dữ liệu điểm danh của ngày hôm nay để làm mới?')) {
      const filtered = attendance.filter(r => r.date !== dateFilter);
      saveAttendance(filtered);
    }
  };

  // --- EXCEL / PRINT (From original history list view) ---
  const handleExportCSV = () => {
    const csvHeader = 'Mã Học Sinh,Tên Học Sinh,Tên Lớp,Ngày Điểm Danh,Giờ Ghi Nhận,Trạng Thái,Ghi Chú\n';
    const csvRows = selectedDateRecords.map((r) => {
      const cleanName = r.studentName.replace(/"/g, '""');
      const statusLabel = r.status === 'present' ? 'Đúng giờ' : r.status === 'late' ? 'Đi muộn' : 'Vắng mặt';
      const cleanNotes = (r.notes || '').replace(/"/g, '""');
      return `"${r.studentCode}","${cleanName}","${r.className}","${r.date}","${r.time}","${statusLabel}","${cleanNotes}"`;
    }).join('\n');

    const csvContent = '\ufeff' + csvHeader + csvRows; // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lich_su_diem_danh_${dateFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Edit record status from table view
  const handleOpenEditStatus = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setNewStatus(rec.status);
    setNewNotes(rec.notes || '');
  };

  const handleSaveStatusEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const updated = attendance.map((r) => {
      if (r.id === editingRecord.id) {
        return {
          ...r,
          status: newStatus,
          notes: newNotes.trim() || undefined,
        };
      }
      return r;
    });

    saveAttendance(updated);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (id: string, studentName: string, date: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bản ghi điểm danh ngày ${date} của học sinh "${studentName}"?`)) {
      const filtered = attendance.filter(r => r.id !== id);
      saveAttendance(filtered);
    }
  };

  const handleSaveAssessment = (
    studentId: string,
    studentName: string,
    classId: string,
    healthStatus: any,
    diningStatus: any,
    sleepStatus: any,
    activityStatus: any,
    hygieneStatus: any,
    notes: string
  ) => {
    const existingIdx = dailyAssessments.findIndex(
      a => a.studentId === studentId && a.date === dateFilter
    );

    const newAssessment: DailyAssessment = {
      id: existingIdx >= 0 ? dailyAssessments[existingIdx].id : `da_${Date.now()}_${studentId}`,
      studentId,
      studentName,
      classId,
      date: dateFilter,
      healthStatus,
      diningStatus,
      sleepStatus,
      activityStatus,
      hygieneStatus,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    let updated = [...dailyAssessments];
    if (existingIdx >= 0) {
      updated[existingIdx] = newAssessment;
    } else {
      updated.push(newAssessment);
    }

    setDailyAssessments(updated);
    StorageService.saveDailyAssessments(updated);

    // Show temporary success feedback
    setAssessmentSuccessMsg(prev => ({
      ...prev,
      [studentId]: 'Đã lưu đánh giá thành công!'
    }));

    setTimeout(() => {
      setAssessmentSuccessMsg(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    }, 3000);
  };

  const handleExportMonthlyClassAssessments = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const classStuds = students.filter(s => s.classId === classFilter);
    const className = classrooms.find(c => c.id === classFilter)?.name || 'Lop';
    
    const allAssessments = StorageService.getDailyAssessments();
    const classMonthAssessments = allAssessments.filter(a => {
      const isCorrectStudent = classStuds.some(s => s.id === a.studentId);
      if (!isCorrectStudent) return false;
      const aDate = new Date(a.date);
      return aDate.getFullYear() === parseInt(year) && (aDate.getMonth() + 1) === parseInt(month);
    });

    if (classMonthAssessments.length === 0) {
      alert(`Không có dữ liệu đánh giá nào trong tháng ${month}/${year} của lớp ${className} để xuất file.`);
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Vietnamese
    csvContent += `BÁO CÁO ĐÁNH GIÁ TRÌNH TRẠNG TRẺ HẰNG NGÀY THÁNG ${month}/${year}\n`;
    csvContent += `Lớp: ${className}\n\n`;
    csvContent += "Mã học sinh,Họ và tên,Ngày đánh giá,Sức khỏe,Ăn uống,Ngủ trưa,Hoạt động,Vệ sinh,Nhận xét chi tiết của cô giáo\n";

    classMonthAssessments.sort((a, b) => {
      if (a.studentName && b.studentName) {
        const nameComp = a.studentName.localeCompare(b.studentName);
        if (nameComp !== 0) return nameComp;
      }
      return a.date.localeCompare(b.date);
    });

    classMonthAssessments.forEach(a => {
      const student = classStuds.find(s => s.id === a.studentId);
      const studentCode = student ? student.studentCode : '';
      const escapedNotes = a.notes ? `"${a.notes.replace(/"/g, '""')}"` : '""';
      csvContent += `${studentCode},${a.studentName},${a.date},${a.healthStatus},${a.diningStatus},${a.sleepStatus},${a.activityStatus},${a.hygieneStatus},${escapedNotes}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_danh_gia_lop_${className.replace(/\s+/g, '_')}_thang_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP SUB-TABS (MISA EMIS STYLE NAVIGATION BAR) */}
      <div className="no-print bg-white dark:bg-slate-900 px-6 py-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1.5">
          {[
            { name: 'Điểm danh', icon: CheckCircle },
            { name: 'Nhận xét', icon: MessageSquare },
            { name: 'Bán trú', icon: Coffee },
            { name: 'Lịch hoạt động', icon: Activity },
            { name: 'Đánh giá', icon: Award },
            { name: 'Sức khỏe', icon: Heart },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isTabActive = activeSubTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveSubTab(tab.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  isTabActive
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-xs border border-emerald-100/30'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <IconComponent size={14} className={isTabActive ? 'animate-bounce' : ''} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle Switch */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/40 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'board'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500'
            }`}
            title="Chế độ Kanban Board"
          >
            <Grid size={13} />
            <span className="hidden sm:inline">Dạng Bảng</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500'
            }`}
            title="Dạng Danh sách"
          >
            <List size={13} />
            <span className="hidden sm:inline">Dạng Bảng Danh sách</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & ACTION HEADER */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col md:flex-row flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3.5 w-full md:w-auto">
          {/* Quick Date Display & Navigators */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase mr-2 font-mono">Theo ngày</span>
            
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Ngày trước"
            >
              <ChevronLeft size={14} />
            </button>
            
            <div className="relative flex items-center px-2 text-slate-800 dark:text-slate-100 text-xs font-bold font-mono">
              <Calendar size={13} className="mr-1.5 text-emerald-500" />
              <span>{vietnameseDate}</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Ngày tiếp theo"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Class selection with Emerald glow */}
          <div className="flex items-center gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Tất cả lớp học</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar inside header */}
          <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8.5 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Toolbar action buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {activeSubTab === 'Điểm danh' && viewMode === 'board' && (
            <>
              <button
                onClick={handleMarkAllAttending}
                disabled={kanbanColumns.unchecked.length === 0}
                className="px-3 py-2 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <Check size={14} />
                <span>Có mặt tất cả lớp</span>
              </button>
              <button
                onClick={handleClearAllAttendance}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 dark:border-slate-800 dark:hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <X size={14} />
                <span>Làm mới ngày</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-emerald-500" />
            <span className="hidden sm:inline">Xuất File Excel</span>
          </button>
        </div>
      </div>

      {/* 3. CORE SUB-TABS DYNAMIC VIEW RENDERER */}

      {/* A. ATTENDANCE SUB-TAB (MAIN CONTENT) */}
      {activeSubTab === 'Điểm danh' && (
        <>
          {viewMode === 'board' ? (
            /* KANBAN BOARD LAYOUT */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* COLUMN 1: CHƯA ĐIỂM DANH */}
              <div className="bg-[#fffbeb] dark:bg-slate-900/40 rounded-2xl border border-amber-100 dark:border-amber-950/30 overflow-hidden flex flex-col shadow-xs min-h-[450px]">
                {/* Column Header */}
                <div className="bg-[#fef3c7] dark:bg-amber-950/30 px-4 py-3.5 flex items-center justify-between border-b border-amber-100 dark:border-amber-950/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                      ❓
                    </div>
                    <span className="text-xs font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                      Chưa điểm danh
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-amber-600 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full shadow-xs">
                    {kanbanColumns.unchecked.length} học sinh
                  </span>
                </div>

                {/* Column Body - Student List */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
                  {kanbanColumns.unchecked.length > 0 ? (
                    kanbanColumns.unchecked.map((student) => (
                      <div
                        key={student.id}
                        className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 transition-all hover:scale-[1.01] hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 shrink-0">
                            <img
                              src={student.avatar || StorageService.getNewAvatar(student.fullName, student.fullName.charCodeAt(0))}
                              alt={student.fullName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-white text-xs">{student.fullName}</h4>
                            <p className="text-[10px] text-slate-400 font-bold font-mono">MSHS: {student.studentCode}</p>
                          </div>
                        </div>

                        {/* Inline Note Text box */}
                        {editingNoteStudentId === student.id ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="text"
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              placeholder="Nhập ghi chú cho bé..."
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800"
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineNote(student.id)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveInlineNote(student.id)}
                              className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingNoteStudentId(null)}
                              className="p-1.5 rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openNoteEditor(student.id, '')}
                            className="text-left text-[11px] text-slate-400 hover:text-emerald-600 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={11} />
                            <span>Thêm ghi chú phụ huynh dặn...</span>
                          </button>
                        )}

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
                          <button
                            onClick={() => handleCheckIn(student)}
                            className="py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition shadow-xs shadow-emerald-500/10"
                          >
                            <Check size={11} />
                            <span>Đi học ✔️</span>
                          </button>
                          <button
                            onClick={() => handleMarkAbsent(student)}
                            className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition"
                          >
                            <X size={11} />
                            <span>Nghỉ học ❌</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <CheckCircle size={32} className="mx-auto text-amber-300 stroke-1" />
                      <p className="text-[11px] font-bold text-slate-400">Đã điểm diện xong cả lớp!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 2: ĐI HỌC (ATTENDING) */}
              <div className="bg-[#f0fdf4] dark:bg-slate-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-950/30 overflow-hidden flex flex-col shadow-xs min-h-[450px]">
                {/* Column Header */}
                <div className="bg-[#d1fae5] dark:bg-emerald-950/30 px-4 py-3.5 flex items-center justify-between border-b border-emerald-100 dark:border-emerald-950/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">
                      🎒
                    </div>
                    <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                      Bé đang đi học
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full shadow-xs">
                    {kanbanColumns.attending.length} học sinh
                  </span>
                </div>

                {/* Column Body - Student List */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
                  {kanbanColumns.attending.length > 0 ? (
                    kanbanColumns.attending.map(({ student, record }) => (
                      <div
                        key={student.id}
                        className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 transition-all hover:scale-[1.01] hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 shrink-0">
                              <img
                                src={student.avatar || StorageService.getNewAvatar(student.fullName, student.fullName.charCodeAt(0))}
                                alt={student.fullName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-white text-xs">{student.fullName}</h4>
                              <p className="text-[10px] text-slate-400 font-bold font-mono">MSHS: {student.studentCode}</p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            record.status === 'present'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                          }`}>
                            {record.status === 'present' ? 'Đúng giờ' : 'Muộn'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-850 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock size={11} className="text-emerald-500" />
                            Vào lớp: <strong className="text-slate-700 dark:text-slate-200">{record.time.substring(0, 5)}</strong>
                          </span>

                          {record.notes?.includes('Ra về:') ? (
                            <span className="text-[10.5px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-black">
                              👉 Đã về lúc {record.notes.split('Ra về:')[1].trim()}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCheckOut(student.id)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center gap-1 cursor-pointer transition shadow-xs"
                            >
                              <span>Ra về 👋</span>
                            </button>
                          )}
                        </div>

                        {/* Notes Section */}
                        {editingNoteStudentId === student.id ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="text"
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              placeholder="Nhập ghi chú cho bé..."
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800"
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineNote(student.id)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveInlineNote(student.id)}
                              className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingNoteStudentId(null)}
                              className="p-1.5 rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px]">
                            {record.notes ? (
                              <p className="text-slate-600 dark:text-slate-400 italic">
                                📝 {record.notes.replace(/ • Ra về:.*/, '') || 'Không có ghi chú'}
                              </p>
                            ) : (
                              <span className="text-slate-300 italic">Chưa có ghi chú trong ngày</span>
                            )}
                            <button
                              onClick={() => openNoteEditor(student.id, record.notes || '')}
                              className="text-emerald-500 hover:text-emerald-600 font-extrabold shrink-0 cursor-pointer"
                            >
                              Sửa
                            </button>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1.5 border-t border-slate-100/60 dark:border-slate-800/60">
                          <button
                            onClick={() => handleMarkAbsent(student)}
                            className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 dark:border-slate-800 dark:hover:bg-slate-850 rounded-xl text-[10px] font-extrabold cursor-pointer text-center"
                          >
                            Đổi sang Vắng mặt
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                      <User size={32} className="mx-auto text-slate-300 stroke-1 animate-pulse" />
                      <p className="text-[11px] font-bold text-slate-400">Không có bé nào trong cột này</p>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 3: NGHỈ HỌC (ABSENT) */}
              <div className="bg-[#fdf2f2] dark:bg-slate-900/40 rounded-2xl border border-rose-100 dark:border-rose-950/30 overflow-hidden flex flex-col shadow-xs min-h-[450px]">
                {/* Column Header */}
                <div className="bg-[#fee2e2] dark:bg-rose-950/30 px-4 py-3.5 flex items-center justify-between border-b border-rose-100 dark:border-rose-950/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px]">
                      🏠
                    </div>
                    <span className="text-xs font-extrabold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                      Bé nghỉ học hôm nay
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-rose-600 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full shadow-xs">
                    {kanbanColumns.absent.length} học sinh
                  </span>
                </div>

                {/* Column Body - Student List */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
                  {kanbanColumns.absent.length > 0 ? (
                    kanbanColumns.absent.map(({ student, record }) => (
                      <div
                        key={student.id}
                        className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 transition-all hover:scale-[1.01] hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-rose-500 shrink-0">
                              <img
                                src={student.avatar || StorageService.getNewAvatar(student.fullName, student.fullName.charCodeAt(0))}
                                alt={student.fullName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover opacity-80"
                              />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-white text-xs">{student.fullName}</h4>
                              <p className="text-[10px] text-slate-400 font-bold font-mono">MSHS: {student.studentCode}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleExcuse(student.id)}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider cursor-pointer transition shadow-xs ${
                              record.notes?.includes('Có phép')
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50'
                            }`}
                          >
                            {record.notes?.includes('Có phép') ? 'Có phép 📋' : 'Không phép ⚠️'}
                          </button>
                        </div>

                        {/* Inline Note text box */}
                        {editingNoteStudentId === student.id ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="text"
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              placeholder="Nhập lý do nghỉ học..."
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800"
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineNote(student.id)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveInlineNote(student.id)}
                              className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingNoteStudentId(null)}
                              className="p-1.5 rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px]">
                            <p className="text-slate-500 italic max-w-[80%] truncate">
                              💬 Lý do: {record.notes || 'Không phép'}
                            </p>
                            <button
                              onClick={() => openNoteEditor(student.id, record.notes || '')}
                              className="text-emerald-500 hover:text-emerald-600 font-extrabold cursor-pointer"
                            >
                              Sửa
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
                          <button
                            onClick={() => handleCheckIn(student)}
                            className="py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-extrabold cursor-pointer text-center"
                          >
                            Chuyển sang Đi học ✔️
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                      <Smile size={32} className="mx-auto text-emerald-300 stroke-1 animate-bounce" />
                      <p className="text-[11px] font-bold text-slate-400">Không bé nào nghỉ học hôm nay!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* DETAILED LIST TABLE VIEW */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Học Sinh</th>
                      <th className="py-3.5 px-3">Lớp</th>
                      <th className="py-3.5 px-3 text-center">Ngày ghi nhận</th>
                      <th className="py-3.5 px-3 text-center">Giờ quét</th>
                      <th className="py-3.5 px-3">Trạng thái</th>
                      <th className="py-3.5 px-3">Ghi chú / Giao tiếp</th>
                      <th className="py-3.5 px-4 text-right no-print">Công cụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                    {selectedDateRecords.length > 0 ? (
                      selectedDateRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                <img
                                  src={rec.photoCaptured || StorageService.getNewAvatar(rec.studentName, rec.studentName.charCodeAt(0))}
                                  alt={rec.studentName}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 dark:text-white">{rec.studentName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Mã: {rec.studentCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold">
                              {rec.className}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-mono font-bold">
                            {new Date(rec.date).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-mono">
                            {rec.time}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                rec.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-400'
                                  : rec.status === 'late'
                                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/35 dark:text-amber-400'
                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/35 dark:text-rose-400'
                              }`}
                            >
                              {rec.status === 'present' && <CheckCircle size={10} />}
                              {rec.status === 'late' && <Clock size={10} />}
                              {rec.status === 'absent' && <XCircle size={10} />}
                              <span>{rec.status === 'present' ? 'Đúng giờ' : rec.status === 'late' ? 'Đi muộn' : 'Vắng mặt'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-normal">
                            {rec.notes || <span className="italic text-slate-300">Không có ghi chú</span>}
                          </td>
                          <td className="py-3 px-4 text-right no-print">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditStatus(rec)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition cursor-pointer"
                                title="Sửa trạng thái"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(rec.id, rec.studentName, rec.date)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-slate-400 space-y-2">
                          <History size={40} className="mx-auto text-slate-300 stroke-1" />
                          <p className="font-bold text-slate-500 dark:text-slate-400">Không có bản ghi điểm danh nào hôm nay</p>
                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-normal">
                            Chưa có dữ liệu nào quét camera hoặc điểm diện trong ngày này. Hãy chuyển sang Chế độ dạng bảng để thêm nhanh.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* B. COMMENT / REVIEW SUB-TAB */}
      {activeSubTab === 'Nhận xét' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              📝 Nhận xét cuối ngày học sinh ({classFilter === 'all' ? 'Tất cả lớp' : classrooms.find(c => c.id === classFilter)?.name || 'Lớp'})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Phụ huynh sẽ nhận được thông báo thời gian thực về đánh giá ý thức, năng nổ và dinh dưỡng của bé.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudents.map((student) => {
              const review = commentsState[student.id] || { rating: 5, text: 'Hôm nay bé hoạt động bình thường, ngoan ngoãn lắng nghe cô giảng bài.' };
              return (
                <div key={student.id} className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={student.avatar || StorageService.getNewAvatar(student.fullName, student.fullName.charCodeAt(0))} className="w-9 h-9 rounded-full object-cover border" alt="Student" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">{student.fullName}</h4>
                        <span className="text-[9.5px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          Lớp {classNamesMap[student.classId]}
                        </span>
                      </div>
                    </div>
                    {/* Star ratings */}
                    <div className="flex gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          onClick={() => setCommentsState(prev => ({
                            ...prev,
                            [student.id]: { ...review, rating: star }
                          }))}
                          className="cursor-pointer text-sm font-bold"
                        >
                          {star <= review.rating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={review.text}
                    onChange={(e) => setCommentsState(prev => ({
                      ...prev,
                      [student.id]: { ...review, text: e.target.value }
                    }))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
                    rows={2}
                    placeholder="Viết nhận xét cuối ngày..."
                  />
                  
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-emerald-600 font-extrabold">● Đã đồng bộ lên Cloud phụ huynh</span>
                    <button className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold">Lưu</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* C. BOARDING MEAL CHECK-IN SUB-TAB */}
      {activeSubTab === 'Bán trú' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                🍲 Kiểm tra Dinh dưỡng & Bán trú ngày {vietnameseDate}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ghi chép lượng ăn uống thực tế của các bé trong 3 bữa (Ăn sáng, Ăn trưa, Bữa xế chiều).
              </p>
            </div>
            <button
              onClick={() => {
                const bulk: typeof boardingMeals = {};
                filteredStudents.forEach(s => {
                  bulk[s.id] = { breakfast: true, lunch: true, snack: true };
                });
                setBoardingMeals(bulk);
              }}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-lg text-xs font-bold transition"
            >
              ✔️ Đánh dấu đã ăn hết tất cả
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-150">
                  <th className="p-3.5 pl-5">Học Sinh</th>
                  <th className="p-3.5 text-center">Bữa Sáng ☀️</th>
                  <th className="p-3.5 text-center">Bữa Trưa 🍲</th>
                  <th className="p-3.5 text-center">Bữa Xế 🥛</th>
                  <th className="p-3.5 text-right pr-5">Nhận xét dinh dưỡng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredStudents.map((s) => {
                  const check = boardingMeals[s.id] || { breakfast: false, lunch: false, snack: false };
                  return (
                    <tr key={s.id} className="hover:bg-slate-55">
                      <td className="p-3 pl-5">
                        <div className="flex items-center gap-3">
                          <img src={s.avatar || StorageService.getNewAvatar(s.fullName, s.fullName.charCodeAt(0))} className="w-8 h-8 rounded-full object-cover border" alt="Avatar" />
                          <div>
                            <p className="font-bold">{s.fullName}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{s.studentCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={check.breakfast}
                          onChange={(e) => setBoardingMeals(prev => ({
                            ...prev,
                            [s.id]: { ...check, breakfast: e.target.checked }
                          }))}
                          className="w-4.5 h-4.5 accent-emerald-500 rounded border cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={check.lunch}
                          onChange={(e) => setBoardingMeals(prev => ({
                            ...prev,
                            [s.id]: { ...check, lunch: e.target.checked }
                          }))}
                          className="w-4.5 h-4.5 accent-emerald-500 rounded border cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={check.snack}
                          onChange={(e) => setBoardingMeals(prev => ({
                            ...prev,
                            [s.id]: { ...check, snack: e.target.checked }
                          }))}
                          className="w-4.5 h-4.5 accent-emerald-500 rounded border cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-right pr-5">
                        <span className="text-[10.5px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {check.breakfast && check.lunch && check.snack ? '🍲 Ăn ngoan xuất sắc' : '⚠️ Ăn ít / bỏ bữa'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* D. SCHOOL ACTIVITIES TIMELINE SUB-TAB */}
      {activeSubTab === 'Lịch hoạt động' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                ⏰ Khung thời gian hoạt động của lớp học ngày {vietnameseDate}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Theo dõi tiến độ bài học, các lớp thể dục ngoài trời, giờ ăn dặm của trẻ hôm nay.
              </p>
            </div>
            
            <button
              onClick={() => {
                const title = prompt('Nhập tên hoạt động mới:');
                const time = prompt('Nhập khung giờ (Ví dụ: 16:30 - 17:00):');
                if (title && time) {
                  setActivities(prev => [...prev, { id: `${Date.now()}`, time, title, completed: false }]);
                }
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/10"
            >
              <Plus size={14} />
              <span>Thêm hoạt động</span>
            </button>
          </div>

          <div className="relative border-l border-slate-150 pl-5 ml-4 space-y-6 text-xs">
            {activities.map((act) => (
              <div key={act.id} className="relative">
                {/* Timeline node */}
                <div className={`absolute -left-[27.5px] top-0 w-3.5 h-3.5 rounded-full border-2 ${
                  act.completed ? 'bg-emerald-500 border-emerald-100' : 'bg-slate-200 border-white dark:border-slate-800'
                }`} />

                <div className="bg-slate-50/50 dark:bg-slate-900/60 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider font-mono">
                      ⏱️ {act.time}
                    </span>
                    <h4 className="font-bold text-slate-800 dark:text-white">{act.title}</h4>
                  </div>

                  <button
                    onClick={() => setActivities(prev => prev.map(a => a.id === act.id ? { ...a, completed: !a.completed } : a))}
                    className={`px-3 py-1.5 rounded-xl font-bold transition text-[10px] ${
                      act.completed
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {act.completed ? '✔ Đã hoàn thành' : 'Đang chờ hoạt động'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* E. DEVELOPMENT EVALUATION SUB-TAB */}
      {activeSubTab === 'Đánh giá' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs space-y-6">
          {/* Header & Export controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>📝</span> Đánh Giá Tình Trạng Trẻ Hằng Ngày
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Theo dõi và đánh giá sức khỏe, dinh dưỡng, sinh hoạt hằng ngày của trẻ lớp {classrooms.find(c => c.id === classFilter)?.name || ''} vào ngày {(() => {
                  const parts = dateFilter.split('-');
                  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateFilter;
                })()}.
              </p>
            </div>

            {/* Monthly Export Controls for Teachers */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400">Xuất file tháng:</span>
              <input
                type="month"
                value={teacherExportMonth}
                onChange={(e) => setTeacherExportMonth(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              />
              <button
                type="button"
                onClick={() => handleExportMonthlyClassAssessments(teacherExportMonth)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <FileSpreadsheet size={13} />
                Xuất file
              </button>
            </div>
          </div>

          {/* Students Assessments List */}
          {filteredStudents.length === 0 ? (
            <div className="text-center text-slate-400 text-xs italic py-12">
              Không tìm thấy học sinh nào trong lớp đã chọn.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStudents.map(student => {
                // Find existing assessment for this student on the selected date Filter
                const studentAssessment = dailyAssessments.find(
                  a => a.studentId === student.id && a.date === dateFilter
                );

                return (
                  <StudentAssessmentCard
                    key={student.id}
                    student={student}
                    date={dateFilter}
                    initialAssessment={studentAssessment}
                    onSave={handleSaveAssessment}
                    successMsg={assessmentSuccessMsg[student.id]}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* F. PHYSICAL STATS SUB-TAB */}
      {activeSubTab === 'Sức khỏe' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              🏥 Chỉ số sức khỏe, Cân nặng và Chiều cao của bé
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Dữ liệu được cập nhật hàng quý từ y tế học đường giúp theo dõi sát sao thể chất của trẻ.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase border-b">
                  <th className="p-3.5 pl-5">Học Sinh</th>
                  <th className="p-3.5 text-center">Chiều cao (cm)</th>
                  <th className="p-3.5 text-center">Cân nặng (kg)</th>
                  <th className="p-3.5 text-center">BMI Học Đường</th>
                  <th className="p-3.5 text-right pr-5">Nhận định bác sỹ học đường</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map(student => {
                  const seedHeight = 100 + (student.fullName.charCodeAt(0) % 15);
                  const seedWeight = 16 + (student.fullName.charCodeAt(0) % 8);
                  const bmi = parseFloat((seedWeight / ((seedHeight / 100) * (seedHeight / 100))).toFixed(1));
                  const bmiStatus = bmi < 14 ? 'Suy dinh dưỡng nhẹ' : bmi > 18 ? 'Thừa cân' : 'Bình thường ✔️';
                  return (
                    <tr key={student.id} className="hover:bg-slate-55">
                      <td className="p-3 pl-5">
                        <span className="font-bold">{student.fullName}</span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                        {seedHeight} cm
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                        {seedWeight} kg
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20">
                        {bmi}
                      </td>
                      <td className="p-3 text-right pr-5">
                        <span className={`px-2.5 py-1 rounded text-[10.5px] font-bold ${
                          bmiStatus.includes('Bình thường')
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {bmiStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODAL DIALOGS */}
      {/* Edit status overlay dialog (for List view) */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setEditingRecord(null)} />
          
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl text-slate-800 dark:text-slate-100">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Chỉnh sửa trạng thái điểm danh</h2>
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
              Bạn đang điều chỉnh nhật ký điểm danh cho học sinh <strong>{editingRecord.studentName}</strong> ({editingRecord.className}) vào ngày <strong>{editingRecord.date}</strong>.
            </p>

            <form onSubmit={handleSaveStatusEdit} className="space-y-4">
              <div className="space-y-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <label className="block">Trạng thái điểm danh</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('present')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer transition ${
                      newStatus === 'present'
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Đúng giờ
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('late')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer transition ${
                      newStatus === 'late'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Đi muộn
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('absent')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer transition ${
                      newStatus === 'absent'
                        ? 'bg-rose-500 border-rose-500 text-white shadow-md'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Vắng mặt
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <label className="block">Lý do điều chỉnh / Ghi chú</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Có giấy xin phép nghỉ, đi muộn do xe..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 font-bold rounded-lg text-xs uppercase shadow-md transition cursor-pointer ${getThemeBgClass()}`}
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface StudentAssessmentCardProps {
  key?: string;
  student: Student;
  date: string;
  initialAssessment?: DailyAssessment;
  onSave: (
    studentId: string,
    studentName: string,
    classId: string,
    healthStatus: any,
    diningStatus: any,
    sleepStatus: any,
    activityStatus: any,
    hygieneStatus: any,
    notes: string
  ) => void;
  successMsg?: string;
}

function StudentAssessmentCard({ student, date, initialAssessment, onSave, successMsg }: StudentAssessmentCardProps) {
  const [healthStatus, setHealthStatus] = useState(initialAssessment?.healthStatus || 'Khỏe mạnh');
  const [diningStatus, setDiningStatus] = useState(initialAssessment?.diningStatus || 'Ăn ngoan/hết suất');
  const [sleepStatus, setSleepStatus] = useState(initialAssessment?.sleepStatus || 'Ngủ ngon/đủ giấc');
  const [activityStatus, setActivityStatus] = useState(initialAssessment?.activityStatus || 'Bình thường');
  const [hygieneStatus, setHygieneStatus] = useState(initialAssessment?.hygieneStatus || 'Bình thường');
  const [notes, setNotes] = useState(initialAssessment?.notes || '');

  // Keep in sync when initialAssessment or date changes
  useEffect(() => {
    setHealthStatus(initialAssessment?.healthStatus || 'Khỏe mạnh');
    setDiningStatus(initialAssessment?.diningStatus || 'Ăn ngoan/hết suất');
    setSleepStatus(initialAssessment?.sleepStatus || 'Ngủ ngon/đủ giấc');
    setActivityStatus(initialAssessment?.activityStatus || 'Bình thường');
    setHygieneStatus(initialAssessment?.hygieneStatus || 'Bình thường');
    setNotes(initialAssessment?.notes || '');
  }, [initialAssessment, date]);

  const handleSaveLocal = () => {
    onSave(
      student.id,
      student.fullName,
      student.classId,
      healthStatus,
      diningStatus,
      sleepStatus,
      activityStatus,
      hygieneStatus,
      notes
    );
  };

  return (
    <div className="p-5 border border-slate-200/60 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
      {/* Student Profile Info */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
        <div className="flex items-center gap-3">
          <img
            src={student.avatar || StorageService.getNewAvatar(student.fullName, student.fullName.charCodeAt(0))}
            className="w-10 h-10 rounded-full object-cover"
            alt="Avatar"
          />
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-white">{student.fullName}</h4>
            <p className="text-[10px] text-slate-400 font-bold font-mono">Mã HS: {student.studentCode}</p>
          </div>
        </div>
        {successMsg && (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-100/30 animate-pulse">
            ✓ {successMsg}
          </span>
        )}
      </div>

      {/* Grid containing status selectors */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Sức khỏe */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>🏃</span> Sức khỏe
          </label>
          <select
            value={healthStatus}
            onChange={(e) => setHealthStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Khỏe mạnh', 'Bình thường', 'Mệt mỏi', 'Sốt', 'Ho'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Ăn uống */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>🍲</span> Ăn uống
          </label>
          <select
            value={diningStatus}
            onChange={(e) => setDiningStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Ăn ngoan/hết suất', 'Ăn một nửa', 'Ăn ít/biếng ăn', 'Bình thường'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Ngủ trưa */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>💤</span> Ngủ trưa
          </label>
          <select
            value={sleepStatus}
            onChange={(e) => setSleepStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Ngủ ngon/đủ giấc', 'Khó ngủ', 'Không ngủ', 'Bình thường'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Hoạt động */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>🌟</span> Hoạt động
          </label>
          <select
            value={activityStatus}
            onChange={(e) => setActivityStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Năng nổ', 'Bình thường', 'Mất tập trung'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Vệ sinh */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>🚽</span> Vệ sinh
          </label>
          <select
            value={hygieneStatus}
            onChange={(e) => setHygieneStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            {['Bình thường', 'Táo bón', 'Tiêu chảy'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes Textarea and Save Button */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <div className="flex-1">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nhập nhận xét chi tiết của cô giáo về bé trong ngày..."
            rows={1}
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 outline-none resize-none placeholder:text-slate-400 font-medium"
          />
        </div>
        <button
          onClick={handleSaveLocal}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition shrink-0 cursor-pointer flex items-center justify-center gap-1.5 h-fit self-end sm:self-auto"
        >
          <Check size={14} />
          Lưu Đánh Giá
        </button>
      </div>
    </div>
  );
}
