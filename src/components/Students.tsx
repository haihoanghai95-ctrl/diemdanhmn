/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Camera,
  X,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Coins,
  Bell,
  Send,
  QrCode,
  Printer
} from 'lucide-react';
import { Student, Classroom, Gender, SchoolSettings } from '../types';
import { generateMockEmbedding } from '../utils/faceSim';
import { StorageService } from '../utils/storage';
import { audioService } from '../utils/audio';

interface StudentsProps {
  students: Student[];
  classrooms: Classroom[];
  saveStudents: (students: Student[]) => void;
  settings: SchoolSettings;
}

export default function Students({ students, classrooms, saveStudents, settings }: StudentsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals / Dialog State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Custom confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form input states
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('Nam');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [email, setEmail] = useState('');
  const [classId, setClassId] = useState('');
  const [registeredSubjects, setRegisteredSubjects] = useState<string[]>([]);
  const [formTalentFeePaid, setFormTalentFeePaid] = useState(false);
  const [talentFeeDueDate, setTalentFeeDueDate] = useState('');
  const [formError, setFormError] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [selectedQRStudent, setSelectedQRStudent] = useState<Student | null>(null);

  // SMS Tuition Reminder states
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderStudent, setReminderStudent] = useState<Student | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState(false);
  const [reminderLogs, setReminderLogs] = useState<{ id: string; studentId: string; studentName: string; phone: string; message: string; date: string }[]>(() => {
    try {
      const saved = localStorage.getItem('school_tuition_reminder_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Camera capture states inside registration
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // CSV Import state
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [excelPreview, setExcelPreview] = useState<Student[]>([]);
  const [importMethod, setImportMethod] = useState<'excel' | 'text'>('excel');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Theme and Helper Styles
  const getThemeBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-white';
      default: return 'bg-blue-600 hover:bg-blue-500 text-white'; // blue
    }
  };

  const getThemeTextClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-violet-600';
      case 'rose': return 'text-rose-600';
      case 'amber': return 'text-amber-600';
      default: return 'text-blue-600';
    }
  };

  const getThemeRingClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'focus:ring-emerald-500 focus:border-emerald-500';
      case 'violet': return 'focus:ring-violet-500 focus:border-violet-500';
      case 'rose': return 'focus:ring-rose-500 focus:border-rose-500';
      case 'amber': return 'focus:ring-amber-500 focus:border-amber-500';
      default: return 'focus:ring-blue-500 focus:border-blue-500';
    }
  };

  // 2. Search & Filtering
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchClass = classFilter === 'all' || s.classId === classFilter;
      
      return matchSearch && matchClass;
    });
  }, [students, searchTerm, classFilter]);

  // 3. Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  // --- ACTIONS ---

  const handleSaveQuickNote = (studentId: string, notes: string) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          quickNotes: notes
        };
      }
      return s;
    });
    saveStudents(updated);
  };

  const handleToggleTalentFeePaid = (studentId: string) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          talentFeePaid: !s.talentFeePaid
        };
      }
      return s;
    });
    saveStudents(updated);
    
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent(prev => prev ? { ...prev, talentFeePaid: !prev.talentFeePaid } : null);
    }
  };

  const handleOpenAdd = () => {
    setFormMode('add');
    setEditingStudentId(null);
    setStudentCode(`HS${new Date().getFullYear().toString().substring(2)}${Math.floor(Math.random() * 9000 + 1000)}`);
    setFullName('');
    setGender('Nam');
    setDateOfBirth('2008-01-01');
    setAddress('');
    setParentPhone('');
    setFatherPhone('');
    setMotherPhone('');
    setGuardianPhone('');
    setEmail('');
    setClassId(classrooms[0]?.id || '');
    setRegisteredSubjects([]);
    setFormTalentFeePaid(false);
    setTalentFeeDueDate('');
    setFormError('');
    setQuickNotes('');
    setCapturedImage(null);
    setIsCameraActive(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormMode('edit');
    setEditingStudentId(student.id);
    setStudentCode(student.studentCode);
    setFullName(student.fullName);
    setGender(student.gender);
    setDateOfBirth(student.dateOfBirth);
    setAddress(student.address);
    setParentPhone(student.parentPhone || '');
    setFatherPhone(student.fatherPhone || '');
    setMotherPhone(student.motherPhone || '');
    setGuardianPhone(student.guardianPhone || '');
    setEmail(student.email);
    setClassId(student.classId);
    setRegisteredSubjects(student.registeredTalentSubjects || []);
    setFormTalentFeePaid(!!student.talentFeePaid);
    setTalentFeeDueDate(student.talentFeeDueDate || '');
    setFormError('');
    setQuickNotes(student.quickNotes || '');
    setCapturedImage(student.avatar || null);
    setIsCameraActive(false);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setStudentToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (studentToDelete) {
      const filtered = students.filter(s => s.id !== studentToDelete.id);
      saveStudents(filtered);
      setDeleteConfirmOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleOpenReminder = (student: Student) => {
    setReminderStudent(student);
    const dueDateStr = student.talentFeeDueDate 
      ? ` trước ngày ${new Date(student.talentFeeDueDate).toLocaleDateString('vi-VN')}` 
      : '';
    setReminderMessage(
      `Kính gửi phụ huynh bé ${student.fullName}, trường Mầm non ${settings.schoolName || 'Smart'} xin thông báo nhắc nhở đóng học phí năng khiếu tháng này của bé là ${student.talentFee?.toLocaleString('vi-VN')} đ${dueDateStr}. Kính mong phụ huynh hoàn thành đóng học phí đúng hạn. Xin chân thành cảm ơn!`
    );
    setReminderSuccess(false);
    setIsReminderOpen(true);
  };

  const handleSendReminder = () => {
    if (!reminderStudent || !reminderStudent.parentPhone) return;
    setIsSendingReminder(true);
    
    // Simulate API delivery delay
    setTimeout(() => {
      setIsSendingReminder(false);
      setReminderSuccess(true);
      
      const newLog = {
        id: 'rem_' + Math.random().toString(36).substring(2, 11),
        studentId: reminderStudent.id,
        studentName: reminderStudent.fullName,
        phone: reminderStudent.parentPhone,
        message: reminderMessage,
        date: new Date().toLocaleString('vi-VN')
      };
      
      const updatedLogs = [newLog, ...reminderLogs];
      setReminderLogs(updatedLogs);
      localStorage.setItem('school_tuition_reminder_logs', JSON.stringify(updatedLogs));
      
      audioService.playSuccess();
      
      // Auto-close after 1.8 seconds
      setTimeout(() => {
        setIsReminderOpen(false);
        setReminderSuccess(false);
      }, 1800);
    }, 1500);
  };

  // Camera Capture Mechanics
  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedImage(null);
    setFormError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      console.error('Cannot access camera:', e);
      setFormError('Không thể mở Camera của thiết bị. Vui lòng kiểm tra quyền truy cập.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Trích xuất ảnh dưới dạng base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        audioService.playSuccess();
        stopCamera();
      }
    }
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Vui lòng nhập họ tên học sinh.');
      return;
    }

    if (students.some(s => s.studentCode === studentCode && s.id !== editingStudentId)) {
      setFormError('Mã học sinh đã tồn tại.');
      return;
    }

    let finalParentPhone = parentPhone.trim();
    if (!finalParentPhone) {
      if (fatherPhone.trim()) finalParentPhone = fatherPhone.trim();
      else if (motherPhone.trim()) finalParentPhone = motherPhone.trim();
      else if (guardianPhone.trim()) finalParentPhone = guardianPhone.trim();
    }

    if (!finalParentPhone) {
      setFormError('Vui lòng nhập ít nhất một số điện thoại phụ huynh (Ba, Mẹ, Người nuôi dưỡng hoặc chung).');
      return;
    }

    // Auto-provision parent accounts with password '123'
    const currentParents = StorageService.getParents();
    let parentsUpdated = false;
    const newParentsList = [...currentParents];

    const ensureParentAccount = (phone: string, roleName: string) => {
      const trimmed = phone.trim();
      if (!trimmed) return;
      if (!newParentsList.some(p => p.phone === trimmed)) {
        newParentsList.push({
          phone: trimmed,
          name: `${roleName} của bé ${fullName.trim()}`,
          password: '123'
        });
        parentsUpdated = true;
      }
    };

    ensureParentAccount(fatherPhone, 'Ba');
    ensureParentAccount(motherPhone, 'Mẹ');
    ensureParentAccount(guardianPhone, 'Người nuôi dưỡng');
    ensureParentAccount(finalParentPhone, 'Phụ huynh');

    if (parentsUpdated) {
      StorageService.saveParents(newParentsList);
    }

    // Embedding vector: Nếu chụp ảnh mới, tự động sinh embedding dựa trên họ tên học sinh
    // Nếu không chụp ảnh mới, giữ nguyên hoặc tự động sinh
    let finalEmbedding = editingStudentId 
      ? students.find(s => s.id === editingStudentId)?.faceEmbedding 
      : undefined;

    if (capturedImage && (!finalEmbedding || formMode === 'add' || capturedImage !== students.find(s => s.id === editingStudentId)?.avatar)) {
      finalEmbedding = generateMockEmbedding(fullName.trim());
    }

    const finalAvatar = capturedImage || StorageService.getNewAvatar(fullName.trim(), Math.floor(Math.random() * 10));

    const selectedClassObj = classrooms.find(c => c.id === classId);
    const classTalentSubjects = selectedClassObj?.talentSubjects || [];
    const calculatedTalentFee = classTalentSubjects
      .filter(ts => registeredSubjects.includes(ts.id))
      .reduce((sum, ts) => sum + ts.fee, 0);

    if (formMode === 'add') {
      const newStudent: Student = {
        id: `s_${Date.now()}`,
        studentCode: studentCode.trim(),
        fullName: fullName.trim(),
        gender,
        dateOfBirth,
        address: address.trim(),
        parentPhone: finalParentPhone,
        fatherPhone: fatherPhone.trim() || undefined,
        motherPhone: motherPhone.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
        email: email.trim(),
        classId,
        avatar: finalAvatar,
        faceImage: capturedImage || undefined,
        faceEmbedding: finalEmbedding || generateMockEmbedding(fullName.trim()),
        talentFee: calculatedTalentFee,
        registeredTalentSubjects: registeredSubjects,
        talentFeePaid: formTalentFeePaid,
        talentFeeDueDate: talentFeeDueDate || undefined,
        quickNotes: quickNotes.trim() || undefined,
      };
      saveStudents([...students, newStudent]);
    } else {
      const updated = students.map(s => {
        if (s.id === editingStudentId) {
          return {
            ...s,
            studentCode: studentCode.trim(),
            fullName: fullName.trim(),
            gender,
            dateOfBirth,
            address: address.trim(),
            parentPhone: finalParentPhone,
            fatherPhone: fatherPhone.trim() || undefined,
            motherPhone: motherPhone.trim() || undefined,
            guardianPhone: guardianPhone.trim() || undefined,
            email: email.trim(),
            classId,
            avatar: finalAvatar,
            faceImage: capturedImage || s.faceImage,
            faceEmbedding: finalEmbedding || s.faceEmbedding,
            talentFee: calculatedTalentFee,
            registeredTalentSubjects: registeredSubjects,
            talentFeePaid: formTalentFeePaid,
            talentFeeDueDate: talentFeeDueDate || undefined,
            quickNotes: quickNotes.trim() || undefined,
          };
        }
        return s;
      });
      saveStudents(updated);
    }

    stopCamera();
    setIsFormOpen(false);
  };

  // --- EXCEL/CSV IMPORT & EXPORT ---

  // Export to CSV
  const handleExportCSV = () => {
    // Tiêu đề cột
    const headers = 'Mã Học Sinh,Họ và Tên,Giới Tính,Ngày Sinh,Địa Chỉ,Số Điện Thoại Phụ Huynh,Email,Mã Lớp\n';
    
    // Tạo nội dung dòng học sinh
    const rows = filteredStudents.map(s => {
      const cleanName = s.fullName.replace(/"/g, '""');
      const cleanAddr = s.address.replace(/"/g, '""');
      const cleanClass = classrooms.find(c => c.id === s.classId)?.name || 'Chưa xếp lớp';
      return `"${s.studentCode}","${cleanName}","${s.gender}","${s.dateOfBirth}","${cleanAddr}","${s.parentPhone}","${s.email}","${cleanClass}"`;
    }).join('\n');

    const csvContent = '\ufeff' + headers + rows; // BOM để hỗ trợ hiển thị tiếng Việt UTF-8 trong Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_hoc_sinh_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import from CSV (pasted text)
  const handleImportCSV = () => {
    setImportError('');
    if (!importText.trim()) {
      setImportError('Vui lòng dán dữ liệu CSV hợp lệ.');
      return;
    }

    try {
      const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        setImportError('Dữ liệu chỉ có tiêu đề hoặc trống.');
        return;
      }

      // Đọc tiêu đề để xác định thứ tự
      const headers = lines[0].split(',').map(h => h.replace(/["]/g, '').trim().toLowerCase());
      
      const importedStudents: Student[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Parse CSV line có xử lý dấu ngoặc kép
        const line = lines[i];
        const cols: string[] = [];
        let insideQuote = false;
        let currentWord = '';
        
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          const char = line[charIndex];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            cols.push(currentWord.trim());
            currentWord = '';
          } else {
            currentWord += char;
          }
        }
        cols.push(currentWord.trim());

        if (cols.length < 2) continue; // Bỏ qua dòng trống hoặc quá ngắn

        const stName = cols[1] || '';
        if (!stName) continue;

        const stCode = cols[0] || `HS${Math.floor(Math.random() * 900000 + 100000)}`;
        const stGender: Gender = (cols[2] === 'Nữ' || cols[2] === 'female') ? 'Nữ' : 'Nam';
        const stDob = cols[3] || '2018-01-01';
        const stAddr = cols[4] || '';
        const stPhone = cols[5] || '';
        const stEmail = cols[6] || '';
        
        // Tìm lớp tương ứng
        const clsName = cols[7] || '';
        const matchingClass = classrooms.find(c => c.name.toLowerCase() === clsName.toLowerCase()) || classrooms[0];
        const targetClassId = matchingClass ? matchingClass.id : classrooms[0]?.id || 'c1';

        // Môn năng khiếu nếu có
        const rawTalents = cols[8] || '';
        const registeredTalentIds: string[] = [];
        let calculatedTalentFee = 0;

        if (rawTalents && matchingClass?.talentSubjects) {
          const talentNames = rawTalents.split(/[;/+]/).map(t => t.trim().toLowerCase()).filter(Boolean);
          matchingClass.talentSubjects.forEach(ts => {
            const isMatch = talentNames.some(tn => ts.name.toLowerCase().includes(tn) || tn.includes(ts.name.toLowerCase()));
            if (isMatch) {
              registeredTalentIds.push(ts.id);
              calculatedTalentFee += ts.fee;
            }
          });
        }

        importedStudents.push({
          id: `s_imp_${Date.now()}_${i}`,
          studentCode: stCode,
          fullName: stName,
          gender: stGender,
          dateOfBirth: stDob,
          address: stAddr,
          parentPhone: stPhone,
          email: stEmail,
          classId: targetClassId,
          avatar: StorageService.getNewAvatar(stName, i),
          faceEmbedding: generateMockEmbedding(stName),
          talentFee: calculatedTalentFee,
          registeredTalentSubjects: registeredTalentIds,
          talentFeePaid: false,
        });
      }

      if (importedStudents.length === 0) {
        setImportError('Không tìm thấy dòng học sinh hợp lệ nào để import.');
        return;
      }

      // Gộp vào danh sách cũ (lọc bỏ trùng mã học sinh)
      const nonDuplicate = importedStudents.filter(
        newS => !students.some(oldS => oldS.studentCode === newS.studentCode)
      );

      saveStudents([...students, ...nonDuplicate]);
      alert(`Đã import thành công ${nonDuplicate.length} học sinh mới! (Bỏ qua ${importedStudents.length - nonDuplicate.length} học sinh trùng mã)`);
      setIsImportOpen(false);
      setImportText('');
    } catch (e) {
      setImportError('Phân tích CSV thất bại. Vui lòng sử dụng định dạng mẫu chuẩn.');
    }
  };

  // Download standard XLSX template
  const handleDownloadTemplateXLSX = () => {
    try {
      const templateData = [
        [
          'Mã Học Sinh',
          'Họ và Tên',
          'Giới Tính',
          'Ngày Sinh (YYYY-MM-DD)',
          'Địa Chỉ',
          'Số Điện Thoại Phụ Huynh',
          'Email',
          'Tên Lớp',
          'Môn Năng Khiếu Đăng Ký (Phân tách bằng dấu phẩy)'
        ],
        [
          'HS001',
          'Nguyễn Hoàng Nam',
          'Nam',
          '2018-05-14',
          '15 Tạ Quang Bửu, Hà Nội',
          '0912345678',
          'nam.nh@school.edu.vn',
          classrooms[0]?.name || 'Lớp Mầm 1',
          classrooms[0]?.talentSubjects?.map(s => s.name).slice(0, 2).join(', ') || 'Vẽ, Đàn'
        ],
        [
          'HS002',
          'Trần Thị Mai',
          'Nữ',
          '2018-11-20',
          '123 Nguyễn Trãi, Hà Nội',
          '0987654321',
          'mai.tt@school.edu.vn',
          classrooms[0]?.name || 'Lớp Mầm 1',
          classrooms[0]?.talentSubjects?.[0]?.name || 'Võ'
        ]
      ];
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      ws['!cols'] = [
        { wch: 15 }, // Mã Học Sinh
        { wch: 25 }, // Họ và Tên
        { wch: 12 }, // Giới Tính
        { wch: 22 }, // Ngày Sinh
        { wch: 35 }, // Địa Chỉ
        { wch: 22 }, // Số Điện Thoại Phụ Huynh
        { wch: 28 }, // Email
        { wch: 18 }, // Tên Lớp
        { wch: 45 }, // Môn Năng Khiếu
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "Danh Sach Mau");
      XLSX.writeFile(wb, "mau_dang_ky_hoc_sinh.xlsx");
    } catch (e) {
      console.error(e);
      alert('Tạo file mẫu thất bại.');
    }
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseExcelFile(file);
  };

  const parseExcelFile = (file: File) => {
    setImportError('');
    setExcelPreview([]);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (rows.length <= 1) {
          setImportError('Tập tin Excel rỗng hoặc chỉ có tiêu đề.');
          return;
        }
        
        // Find column indexes based on header names (case insensitive, substring match)
        const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
        
        const findIndex = (keywords: string[]) => {
          return headers.findIndex(h => keywords.some(k => h.includes(k)));
        };
        
        const codeIdx = findIndex(['mã học sinh', 'ma hoc sinh', 'mã số', 'mã', 'code']);
        const nameIdx = findIndex(['họ và tên', 'ho va ten', 'họ tên', 'tên học sinh', 'tên', 'name']);
        const genderIdx = findIndex(['giới tính', 'gioi tinh', 'gender']);
        const dobIdx = findIndex(['ngày sinh', 'ngay sinh', 'birth', 'dob']);
        const addrIdx = findIndex(['địa chỉ', 'dia chi', 'address']);
        const phoneIdx = findIndex(['số điện thoại', 'sđt', 'phone', 'phụ huynh', 'liên hệ']);
        const emailIdx = findIndex(['email', 'thư điện tử']);
        const classIdx = findIndex(['lớp', 'lop', 'class']);
        const talentIdx = findIndex(['năng khiếu', 'nang khieu', 'môn đăng ký', 'talent', 'môn học']);
        
        const importedStudents: Student[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          // Must have a name to import
          const stName = nameIdx !== -1 && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';
          if (!stName) continue;
          
          const stCode = codeIdx !== -1 && row[codeIdx] !== undefined 
            ? String(row[codeIdx]).trim() 
            : `HS${Math.floor(Math.random() * 900000 + 100000)}`;
            
          const rawGender = genderIdx !== -1 && row[genderIdx] !== undefined ? String(row[genderIdx]).trim().toLowerCase() : '';
          const stGender: Gender = (rawGender.includes('nữ') || rawGender.includes('female') || rawGender === 'nu') ? 'Nữ' : 'Nam';
          
          let stDob = '2018-01-01';
          if (dobIdx !== -1 && row[dobIdx] !== undefined) {
            const rawDob = row[dobIdx];
            if (typeof rawDob === 'number') {
              try {
                const dateObj = XLSX.SSF.parse_date_code(rawDob);
                const pad = (n: number) => String(n).padStart(2, '0');
                stDob = `${dateObj.y}-${pad(dateObj.m)}-${pad(dateObj.d)}`;
              } catch (err) {
                stDob = '2018-01-01';
              }
            } else {
              const strDob = String(rawDob).trim();
              if (strDob.includes('/')) {
                const parts = strDob.split('/');
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  stDob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
              } else if (strDob.includes('-')) {
                stDob = strDob;
              }
            }
          }
          
          const stAddr = addrIdx !== -1 && row[addrIdx] !== undefined ? String(row[addrIdx]).trim() : '';
          const stPhone = phoneIdx !== -1 && row[phoneIdx] !== undefined ? String(row[phoneIdx]).trim() : '';
          const stEmail = emailIdx !== -1 && row[emailIdx] !== undefined ? String(row[emailIdx]).trim() : '';
          
          const rawClass = classIdx !== -1 && row[classIdx] !== undefined ? String(row[classIdx]).trim() : '';
          const matchingClass = classrooms.find(c => c.name.toLowerCase() === rawClass.toLowerCase()) || classrooms[0];
          const targetClassId = matchingClass ? matchingClass.id : classrooms[0]?.id || 'c1';
          
          // Parse registered talent subjects from row
          const rawTalents = talentIdx !== -1 && row[talentIdx] !== undefined ? String(row[talentIdx]).trim() : '';
          const registeredTalentIds: string[] = [];
          let calculatedTalentFee = 0;
          
          if (rawTalents && matchingClass?.talentSubjects) {
            const talentNames = rawTalents.split(/[,,;\n+]/).map(t => t.trim().toLowerCase()).filter(Boolean);
            matchingClass.talentSubjects.forEach(ts => {
              const isMatch = talentNames.some(tn => ts.name.toLowerCase().includes(tn) || tn.includes(ts.name.toLowerCase()));
              if (isMatch) {
                registeredTalentIds.push(ts.id);
                calculatedTalentFee += ts.fee;
              }
            });
          }
          
          importedStudents.push({
            id: `s_xls_${Date.now()}_${i}`,
            studentCode: stCode,
            fullName: stName,
            gender: stGender,
            dateOfBirth: stDob,
            address: stAddr,
            parentPhone: stPhone,
            email: stEmail,
            classId: targetClassId,
            avatar: StorageService.getNewAvatar(stName, i),
            faceEmbedding: generateMockEmbedding(stName),
            talentFee: calculatedTalentFee,
            registeredTalentSubjects: registeredTalentIds,
            talentFeePaid: false,
          });
        }
        
        if (importedStudents.length === 0) {
          setImportError('Không tìm thấy học sinh hợp lệ nào từ tệp tin Excel.');
          return;
        }
        
        setExcelPreview(importedStudents);
      } catch (err: any) {
        setImportError(`Đọc file Excel lỗi: ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (importMethod === 'text') {
      handleImportCSV();
      return;
    }

    if (excelPreview.length === 0) {
      setImportError('Không có dữ liệu học sinh để import. Vui lòng chọn một file Excel trước.');
      return;
    }

    // Filter duplicates
    const nonDuplicate = excelPreview.filter(
      newS => !students.some(oldS => oldS.studentCode === newS.studentCode)
    );

    saveStudents([...students, ...nonDuplicate]);
    alert(`Đã nhập thành công ${nonDuplicate.length} học sinh mới! (Bỏ qua ${excelPreview.length - nonDuplicate.length} mã học sinh trùng lặp)`);
    setIsImportOpen(false);
    setExcelPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto populate import template
  const loadImportTemplate = () => {
    const templateHeader = 'Mã Học Sinh,Họ và Tên,Giới Tính,Ngày Sinh,Địa Chỉ,Số Điện Thoại Phụ Huynh,Email,Tên Lớp,Môn Năng Khiếu Đăng Ký\n';
    const sampleRows = `HS230105,Nguyễn Tuấn Kiệt,Nam,2018-04-12,79 Lê Duẩn - Hà Nội,0915667788,kiet.nt230105@school.edu.vn,${classrooms[0]?.name || 'Lớp Lá 1'},Vẽ
HS230106,Phạm Thanh Trúc,Nữ,2018-08-30,42 Chùa Láng - Hà Nội,0976223344,truc.pt230106@school.edu.vn,${classrooms[0]?.name || 'Lớp Lá 1'},Vẽ, Võ
HS230205,Nguyễn Quốc Khánh,Nam,2018-12-15,102 Khuất Duy Tiến - Hà Nội,0912123456,khanh.nq230205@school.edu.vn,${classrooms[0]?.name || 'Lớp Lá 1'},Đàn`;
    setImportText(templateHeader + sampleRows);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Quản Lý Học Sinh <Users className={getThemeTextClass()} size={24} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Xem thông tin nhân khẩu học, quản lý lớp học, lưu trữ thông tin liên hệ và đăng ký thông tin sinh trắc học gương mặt.
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => { setIsImportOpen(true); setExcelPreview([]); setImportError(''); }}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer"
          >
            <Upload size={14} />
            <span>Nhập từ Excel/CSV</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer"
          >
            <Download size={14} />
            <span>Xuất file Excel/CSV</span>
          </button>
          
          <button
            onClick={handleOpenAdd}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition transform hover:-translate-y-0.5 cursor-pointer shadow-lg ${getThemeBgClass()}`}
          >
            <Plus size={16} />
            <span>Thêm Học Sinh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search size={18} />
          </span>
          <input
            id="student-search"
            type="text"
            placeholder="Tìm kiếm theo mã học sinh, tên hoặc email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-1 text-sm text-slate-800 dark:text-slate-200 transition"
          />
        </div>
        
        {/* Class Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter size={14} /> Lớp:
          </span>
          <select
            id="class-filter"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 md:flex-initial px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">Tất cả lớp học</option>
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          <div className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-2 rounded-xl shrink-0">
            Tổng cộng: <strong className="text-slate-700 dark:text-slate-200">{filteredStudents.length}</strong>
          </div>
        </div>
      </div>

      {/* Students Grid & Empty States */}
      {paginatedStudents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginatedStudents.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between group"
            >
              {/* Header Profile Info */}
              <div className="p-5 flex flex-col items-center text-center">
                
                {/* Avatar with Glow indicator */}
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-100 dark:border-slate-800 shadow-inner">
                    <img
                      src={s.avatar || StorageService.getNewAvatar(s.fullName, 0)}
                      alt={s.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Bio status (face registered or not) */}
                  {s.faceEmbedding ? (
                    <span className="absolute bottom-0 right-0 p-1 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 text-[8px]" title="Đã đăng ký khuôn mặt">
                      <Camera size={10} className="text-white" />
                    </span>
                  ) : (
                    <span className="absolute bottom-0 right-0 p-1 bg-rose-400 rounded-full border-2 border-white dark:border-slate-900 text-[8px]" title="Chưa đăng ký">
                      <ShieldAlert size={10} className="text-white" />
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-blue-500 transition-colors">
                    {s.fullName}
                  </h3>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold">
                    <span className="text-slate-400 font-mono">Mã: {s.studentCode}</span>
                    <span className="text-slate-300">•</span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold">
                      {s.className || 'Chưa xếp lớp'}
                    </span>
                  </div>
                </div>

                {/* Micro Details */}
                <div className="mt-4 w-full space-y-1.5 text-left text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-50 dark:border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">SĐT: {s.parentPhone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{s.email || 'Chưa cập nhật'}</span>
                  </div>

                  {/* Học phí Năng khiếu & Trạng thái thanh toán */}
                  <div className="border-t border-dashed border-slate-100 dark:border-slate-800/80 pt-2.5 mt-2.5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">HP Năng khiếu</span>
                      <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        {(s.talentFee || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    
                    <label 
                      onClick={(e) => e.stopPropagation()} 
                      className="flex items-center gap-1.5 cursor-pointer text-[10px] select-none bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/60 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 transition-all duration-200"
                    >
                      <input
                        type="checkbox"
                        checked={!!s.talentFeePaid}
                        onChange={() => handleToggleTalentFeePaid(s.id)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className={`font-bold transition-colors ${s.talentFeePaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {s.talentFeePaid ? 'Đã đóng' : 'Chưa đóng'}
                      </span>
                    </label>
                  </div>

                  {/* Ghi chú nhanh trực tiếp */}
                  <div className="border-t border-dashed border-slate-100 dark:border-slate-800/80 pt-2.5 mt-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Ghi chú nhanh trong ngày</span>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        placeholder="Ví dụ: Bé ăn ngoan, ngủ tốt..."
                        defaultValue={s.quickNotes || ''}
                        onBlur={(e) => handleSaveQuickNote(s.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveQuickNote(s.id, e.currentTarget.value);
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-full px-2 py-1 text-[11px] border border-slate-200 dark:border-slate-700/60 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-400 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleOpenDetail(s)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition"
                  >
                    <Eye size={13} />
                    <span>Chi tiết</span>
                  </button>
                  <button
                    onClick={() => setSelectedQRStudent(s)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 flex items-center gap-1 cursor-pointer transition"
                    title="Xem mã QR học sinh"
                  >
                    <QrCode size={13} />
                    <span>Mã QR</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {!s.talentFeePaid && (s.talentFee || 0) > 0 && (
                    <button
                      onClick={() => handleOpenReminder(s)}
                      className="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 cursor-pointer transition animate-pulse"
                      title="Nhắc nhở đóng học phí qua SĐT"
                    >
                      <Bell size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer transition"
                    title="Chỉnh sửa hồ sơ"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.fullName)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition"
                    title="Xóa học sinh"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <Users size={48} className="text-slate-300 stroke-1" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Không tìm thấy học sinh nào</h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Hãy thử điều chỉnh lại từ khóa tìm kiếm hoặc chọn lọc theo bộ lọc lớp khác.
          </p>
          <button
            onClick={handleOpenAdd}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${getThemeBgClass()}`}
          >
            Thêm học sinh mới
          </button>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400">
            Trang {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmOpen && studentToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setDeleteConfirmOpen(false)} />
          
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setDeleteConfirmOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertCircle size={24} />
              <h2 className="text-lg font-bold">Xác nhận xóa học sinh</h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa học sinh <strong className="text-slate-900 dark:text-white">"{studentToDelete.name}"</strong> khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. STUDENT DETAIL DIALOG */}
      {isDetailOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsDetailOpen(false)} />
          
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setIsDetailOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            {/* Profile Info Grid */}
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left border-b border-slate-100 dark:border-slate-800/80 pb-6 mb-5">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 dark:border-slate-700 shadow-md">
                <img
                  src={selectedStudent.faceImage || selectedStudent.avatar || StorageService.getNewAvatar(selectedStudent.fullName, 0)}
                  alt={selectedStudent.fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedStudent.fullName}</h2>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${selectedStudent.gender === 'Nam' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'}`}>
                    {selectedStudent.gender}
                  </span>
                </div>
                
                <p className="text-xs font-mono text-slate-400">Mã Học Sinh: <strong className="text-slate-700 dark:text-slate-200">{selectedStudent.studentCode}</strong></p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500">
                  <span>Lớp học hiện tại:</span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold">
                    {selectedStudent.className || 'Chưa xếp lớp'}
                  </span>
                </div>
                
                {selectedStudent.faceEmbedding && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/25 px-2 py-0.5 rounded-full mt-1.5">
                    <Camera size={11} /> Đã Đăng Ký Sinh Trắc Học Gương Mặt (128-D)
                  </div>
                )}
              </div>
            </div>

            {/* Demographics table layout */}
            <div className="space-y-4 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-400">Thông tin chi tiết nhân khẩu học</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Calendar size={13} />
                    <span>Ngày sinh</span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 col-span-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <Phone size={13} />
                    <span>Danh sách số điện thoại liên hệ</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                    {selectedStudent.fatherPhone && (
                      <div>
                        <span className="text-slate-400">Ba: </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.fatherPhone}</span>
                      </div>
                    )}
                    {selectedStudent.motherPhone && (
                      <div>
                        <span className="text-slate-400">Mẹ: </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.motherPhone}</span>
                      </div>
                    )}
                    {selectedStudent.guardianPhone && (
                      <div>
                        <span className="text-slate-400">Người nuôi dưỡng: </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.guardianPhone}</span>
                      </div>
                    )}
                    {selectedStudent.parentPhone && (
                      <div>
                        <span className="text-slate-400">Liên hệ chung: </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.parentPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 col-span-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Mail size={13} />
                    <span>Địa chỉ Email</span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.email || 'Chưa cập nhật'}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 col-span-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <MapPin size={13} />
                    <span>Địa chỉ liên hệ</span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.address || 'Chưa cập nhật'}</p>
                </div>

                {selectedStudent.quickNotes && (
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-955/20 border border-blue-100 dark:border-blue-900/30 col-span-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                      <span>📝 Ghi chú nhanh trong ngày</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 italic font-medium">"{selectedStudent.quickNotes}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* School Fees Info */}
            <div className="space-y-4 text-xs mt-6">
              <h3 className="font-bold uppercase tracking-wider text-slate-400">Thông tin học phí</h3>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                <div className="flex flex-col gap-1 text-slate-500 font-medium">
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                    <span>Học phí năng khiếu:</span>
                    <span className="font-bold font-mono">
                      {selectedStudent.talentFee !== undefined 
                        ? `${selectedStudent.talentFee.toLocaleString('vi-VN')} đ`
                        : '0 đ'}
                    </span>
                  </div>
                  {(() => {
                    const clsObj = classrooms.find(c => c.id === selectedStudent.classId);
                    const registeredIds = selectedStudent.registeredTalentSubjects || [];
                    const registeredSubjectsList = clsObj?.talentSubjects?.filter(ts => registeredIds.includes(ts.id)) || [];
                    
                    if (registeredSubjectsList.length > 0) {
                      return (
                        <div className="space-y-1.5 mt-2 bg-amber-500/5 dark:bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/10">
                          <div className="font-extrabold text-[9px] uppercase text-amber-600 dark:text-amber-400 tracking-wider mb-1.5">Môn năng khiếu đăng ký:</div>
                          {registeredSubjectsList.map(ts => (
                            <div key={ts.id} className="flex flex-col gap-1 border-b border-dashed border-amber-500/10 last:border-0 pb-1.5 last:pb-0">
                              <div className="flex justify-between items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{ts.name}</span>
                                <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0">{ts.fee.toLocaleString('vi-VN')} đ</span>
                              </div>
                              {(ts.schedule || ts.timeSlot) && (
                                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-slate-500 dark:text-slate-400 italic font-medium pl-1">
                                  {ts.schedule && <span className="flex items-center gap-0.5">📅 {ts.schedule}</span>}
                                  {ts.timeSlot && <span className="flex items-center gap-0.5">⏰ {ts.timeSlot}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <span className="text-[10px] text-slate-400 italic pl-3 border-l-2 border-slate-200 dark:border-slate-800">
                          Chưa đăng ký môn năng khiếu nào
                        </span>
                      );
                    }
                  })()}
                </div>

                <div className="flex justify-between items-center border-t border-slate-200/50 dark:border-slate-700/50 pt-2.5 font-bold text-slate-800 dark:text-white">
                  <span>Tổng tiền học phí:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                    {((selectedStudent.talentFee || 0).toLocaleString('vi-VN'))} đ
                  </span>
                </div>

                {selectedStudent.talentFee !== undefined && selectedStudent.talentFee > 0 && (
                  <div className="flex justify-between items-center border-t border-slate-200/50 dark:border-slate-700/50 pt-2.5 text-xs text-slate-500">
                    <span className="font-medium">Hạn đóng học phí:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {selectedStudent.talentFeeDueDate 
                        ? new Date(selectedStudent.talentFeeDueDate).toLocaleDateString('vi-VN')
                        : 'Chưa thiết lập'}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-dashed border-slate-200/50 dark:border-slate-700/50 pt-2.5">
                  <span className="text-slate-500 font-medium">Trạng thái học phí:</span>
                  <button
                    onClick={() => handleToggleTalentFeePaid(selectedStudent.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer ${
                      selectedStudent.talentFeePaid
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                    }`}
                    title="Nhấp để thay đổi trạng thái đóng học phí"
                  >
                    {selectedStudent.talentFeePaid ? 'Đã đóng học phí' : 'Chưa đóng học phí'}
                  </button>
                </div>

                {!selectedStudent.talentFeePaid && (selectedStudent.talentFee || 0) > 0 && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setIsDetailOpen(false);
                        handleOpenReminder(selectedStudent);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase transition shadow-xs cursor-pointer"
                    >
                      <Bell size={12} className="animate-bounce" />
                      <span>Nhắc đóng phí qua SĐT</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className={`px-5 py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${getThemeBgClass()}`}
              >
                Đóng thông tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD/EDIT STUDENT PROFILE & BIOMETRIC DIALOG */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => { stopCamera(); setIsFormOpen(false); }} />
          
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { stopCamera(); setIsFormOpen(false); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white mb-2">
              <Users className={getThemeTextClass()} size={22} />
              {formMode === 'add' ? 'Thêm Hồ Sơ Học Sinh Mới' : 'Cập Nhật Hồ Sơ Học Sinh'}
            </h2>
            <p className="text-xs text-slate-400 mb-5 leading-normal">
              Cập nhật hồ sơ hành chính của học sinh và đăng ký ảnh quét sinh trắc khuôn mặt ngay tại đây.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Admin fields */}
                <div className="space-y-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 ml-0.5">Mã học sinh <span className="text-rose-500">*</span></label>
                      <input
                        id="student-code-input"
                        type="text"
                        placeholder="HS230101"
                        value={studentCode}
                        onChange={(e) => setStudentCode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-1 ml-0.5">Giới tính</label>
                      <select
                        id="student-gender-input"
                        value={gender}
                        onChange={(e) => setGender(e.target.value as Gender)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 ml-0.5">Họ và tên học sinh <span className="text-rose-500">*</span></label>
                    <input
                      id="student-fullname-input"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 ml-0.5">Ngày sinh</label>
                      <input
                        id="student-dob-input"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 ml-0.5">Xếp lớp học <span className="text-rose-500">*</span></label>
                      <select
                        id="student-class-input"
                        value={classId}
                        onChange={(e) => {
                          const newClassId = e.target.value;
                          setClassId(newClassId);
                          const newClass = classrooms.find(c => c.id === newClassId);
                          const newAvailableIds = (newClass?.talentSubjects || []).map(t => t.id);
                          setRegisteredSubjects(prev => prev.filter(id => newAvailableIds.includes(id)));
                        }}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                        required
                      >
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-150 dark:border-slate-750/75 space-y-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block border-b border-slate-200 dark:border-slate-700 pb-1.5 uppercase tracking-wide">
                      Thông tin liên lạc Phụ huynh & Tài khoản
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      💡 Tài khoản phụ huynh sẽ được <strong>tự động cấp ngay</strong> khi giáo viên nhập thông tin số điện thoại của Ba, Mẹ hoặc Người nuôi dưỡng. Mật khẩu mặc định chung là <strong className="text-emerald-600 dark:text-emerald-400 font-mono">123</strong>.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1 ml-0.5 font-bold text-slate-600 dark:text-slate-300">SĐT của Ba</label>
                        <input
                          id="student-father-phone-input"
                          type="tel"
                          placeholder="Nhập SĐT của Ba"
                          value={fatherPhone}
                          onChange={(e) => setFatherPhone(e.target.value)}
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 ml-0.5 font-bold text-slate-600 dark:text-slate-300">SĐT của Mẹ</label>
                        <input
                          id="student-mother-phone-input"
                          type="tel"
                          placeholder="Nhập SĐT của Mẹ"
                          value={motherPhone}
                          onChange={(e) => setMotherPhone(e.target.value)}
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 ml-0.5 font-bold text-slate-600 dark:text-slate-300">SĐT Người nuôi dưỡng</label>
                        <input
                          id="student-guardian-phone-input"
                          type="tel"
                          placeholder="Nhập SĐT Người nuôi dưỡng"
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 ml-0.5 font-bold text-slate-600 dark:text-slate-300">SĐT liên hệ chung (Tùy chọn)</label>
                        <input
                          id="student-phone-input"
                          type="tel"
                          placeholder="Nhập SĐT liên hệ chung"
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 ml-0.5">Email liên hệ</label>
                    <input
                      id="student-email-input"
                      type="email"
                      placeholder="hocsinh@school.edu.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 ml-0.5">Địa chỉ thường trú</label>
                    <input
                      id="student-address-input"
                      type="text"
                      placeholder="Số 10 Láng Hạ, Đống Đa, Hà Nội"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 ml-0.5">Ghi chú nhanh (Quick Notes)</label>
                    <textarea
                      id="student-quicknotes-input"
                      placeholder="Bé ăn ngoan, ngủ tốt, tích cực phát biểu..."
                      value={quickNotes}
                      onChange={(e) => setQuickNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none resize-none"
                    />
                  </div>

                  {/* Đăng ký môn năng khiếu */}
                  {(() => {
                    const selectedClass = classrooms.find(c => c.id === classId);
                    const availableTalentSubjects = selectedClass?.talentSubjects || [];
                    if (availableTalentSubjects.length === 0) return null;

                    return (
                      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-3 normal-case">
                        <label className="block mb-2 text-slate-800 dark:text-white font-bold ml-0.5 text-xs">
                          Đăng ký môn năng khiếu cho bé
                        </label>
                        <div className="space-y-2 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 max-h-40 overflow-y-auto">
                          {availableTalentSubjects.map(subject => {
                            const isChecked = registeredSubjects.includes(subject.id);
                            return (
                              <label key={subject.id} className="flex items-center gap-2 cursor-pointer text-xs font-normal py-1 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 px-2 rounded-lg transition">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setRegisteredSubjects([...registeredSubjects, subject.id]);
                                    } else {
                                      setRegisteredSubjects(registeredSubjects.filter(id => id !== subject.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                />
                                <div className="flex-1 flex justify-between items-center">
                                  <div className="flex flex-col">
                                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{subject.name}</span>
                                    {(subject.schedule || subject.timeSlot) && (
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                        Lịch học: {[subject.schedule, subject.timeSlot].filter(Boolean).join(' | ')}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold shrink-0">{subject.fee.toLocaleString('vi-VN')} đ</span>
                                </div>
                              </label>
                            );
                          })}
                          
                          {/* Tổng học phí năng khiếu dự kiến & Trạng thái thanh toán */}
                          {registeredSubjects.length > 0 && (
                            <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-2 mt-2 space-y-2">
                              <div className="text-right text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                                Tổng học phí năng khiếu: {
                                  availableTalentSubjects
                                    .filter(ts => registeredSubjects.includes(ts.id))
                                    .reduce((sum, ts) => sum + ts.fee, 0)
                                    .toLocaleString('vi-VN')
                                } đ
                              </div>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                  <Calendar size={13} className="text-slate-400" />
                                  <span className="font-medium">Hạn đóng:</span>
                                  <input
                                    type="date"
                                    value={talentFeeDueDate}
                                    onChange={(e) => setTalentFeeDueDate(e.target.value)}
                                    className="bg-transparent border-0 border-b border-slate-300 dark:border-slate-700 text-[11px] focus:ring-0 focus:border-indigo-500 font-semibold text-slate-800 dark:text-slate-200 py-0.5 px-1 max-w-[125px]"
                                  />
                                </div>
                                <div className="flex justify-end">
                                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1.5 rounded-lg border border-amber-100/50 dark:border-amber-900/40">
                                    <input
                                      type="checkbox"
                                      checked={formTalentFeePaid}
                                      onChange={(e) => setFormTalentFeePaid(e.target.checked)}
                                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                                    />
                                    <span>Đã đóng học phí năng khiếu</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right Column: Face biometric scanner */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
                    <Camera size={14} /> Đăng ký sinh trắc học gương mặt
                  </span>

                  {/* Camera view screen area */}
                  <div className="w-64 h-48 bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 shadow-inner">
                    
                    {/* Live Stream View */}
                    {isCameraActive && (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover transform scale-x-[-1]"
                          playsInline
                        />
                        {/* Biometric overlay ring */}
                        <div className="absolute inset-4 border-2 border-dashed border-emerald-400 rounded-full opacity-60 flex items-center justify-center animate-pulse pointer-events-none">
                          <span className="text-[9px] text-emerald-300 font-semibold bg-slate-950/80 px-2 py-0.5 rounded-full uppercase">
                            Căn chỉnh khuôn mặt
                          </span>
                        </div>
                      </>
                    )}

                    {/* Captured image display */}
                    {!isCameraActive && capturedImage && (
                      <img
                        src={capturedImage}
                        alt="Face scan"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Offline Empty view */}
                    {!isCameraActive && !capturedImage && (
                      <div className="text-center text-slate-500 space-y-1 p-4 flex flex-col items-center justify-center">
                        <Camera size={28} className="stroke-1 text-slate-400 animate-pulse" />
                        <p className="text-[10px] leading-normal font-medium max-w-[180px]">
                          Camera chưa hoạt động. Hãy bấm nút khởi chạy camera để đăng ký gương mặt học sinh.
                        </p>
                      </div>
                    )}
                    
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {/* Camera controls */}
                  <div className="flex gap-2.5 mt-4 w-full max-w-[256px]">
                    {!isCameraActive ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                      >
                        <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
                        <span>{capturedImage ? 'Chụp lại ảnh' : 'Bật Camera'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={captureSnapshot}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                        >
                          <Camera size={13} />
                          <span>Chụp ảnh</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition"
                        >
                          Đóng
                        </button>
                      </>
                    )}
                  </div>

                  {capturedImage && (
                    <div className="mt-3.5 flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-lg text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Sparkles size={11} className="text-amber-500 shrink-0" />
                      <span>Đã trích xuất thành công 128 đặc trưng gương mặt AI!</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { stopCamera(); setIsFormOpen(false); }}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  id="student-save-submit"
                  type="submit"
                  className={`flex-1 py-2.5 font-bold rounded-xl text-xs uppercase shadow-md transition cursor-pointer ${getThemeBgClass()}`}
                >
                  {formMode === 'add' ? 'Thêm học sinh' : 'Lưu hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. CSV/EXCEL IMPORT MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsImportOpen(false)} />
          
          <div className={`w-full ${excelPreview.length > 0 ? 'max-w-3xl' : 'max-w-xl'} bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-10 shadow-2xl transition-all duration-350 text-slate-800 dark:text-slate-100 max-h-[90vh] flex flex-col`}>
            <button onClick={() => setIsImportOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="mb-4">
              <h2 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <FileSpreadsheet className="text-emerald-500" size={22} />
                Nhập Học Sinh Hàng Loạt Bằng Excel/CSV
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tải lên tập tin Excel (.xlsx, .xls) hoặc dán dữ liệu văn bản để nhanh chóng cập nhật danh sách lớp học và đăng ký môn học năng khiếu.
              </p>
            </div>

            {/* Import Method Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800/80 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setImportMethod('excel'); setImportError(''); }}
                className={`px-4 py-2 border-b-2 transition-all ${
                  importMethod === 'excel'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Nhập từ tệp Excel (.xlsx, .xls)
              </button>
              <button
                type="button"
                onClick={() => { setImportMethod('text'); setImportError(''); }}
                className={`px-4 py-2 border-b-2 transition-all ${
                  importMethod === 'text'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Dán dữ liệu CSV/Văn bản
              </button>
            </div>

            {importError && (
              <div className="mb-3.5 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {importMethod === 'excel' ? (
                <div className="space-y-4">
                  {/* Excel Upload Area */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Drag and Drop Zone */}
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all flex flex-col items-center justify-center min-h-[140px] relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx, .xls, .csv"
                        onChange={handleExcelFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <FileSpreadsheet className="text-slate-400 mb-2 stroke-1" size={32} />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nhấp để chọn hoặc kéo thả file Excel vào đây</p>
                      <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ các định dạng .xlsx, .xls, .csv</p>
                    </div>

                    {/* Template Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tải Excel mẫu chuẩn</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                          Hãy tải file Excel mẫu chuẩn của chúng tôi để chuẩn bị dữ liệu đúng định dạng một cách dễ dàng nhất.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadTemplateXLSX}
                        className="w-full mt-3 py-2 px-3 border border-emerald-500 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Tải Excel Mẫu (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  {/* Excel Preview Table */}
                  {excelPreview.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          Xem trước dữ liệu ({excelPreview.length} học sinh)
                        </span>
                        <button
                          type="button"
                          onClick={() => { setExcelPreview([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-[10px] font-bold transition-colors"
                        >
                          Xóa bản xem trước
                        </button>
                      </div>

                      <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto shadow-inner bg-slate-50/50 dark:bg-slate-900/50">
                        {/* Desktop View */}
                        <div className="hidden md:block">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 select-none text-[10px] uppercase">
                                <th className="px-3 py-2 font-bold">Mã HS</th>
                                <th className="px-3 py-2 font-bold">Họ & Tên</th>
                                <th className="px-3 py-2 font-bold">Lớp</th>
                                <th className="px-3 py-2 font-bold">Ngày sinh</th>
                                <th className="px-3 py-2 font-bold">Môn năng khiếu</th>
                                <th className="px-3 py-2 text-right font-bold">HP Dự kiến</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                              {excelPreview.map((item, idx) => {
                                const cName = classrooms.find(c => c.id === item.classId)?.name || 'Chưa xếp';
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">{item.studentCode}</td>
                                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-bold">{item.fullName}</td>
                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{cName}</td>
                                    <td className="px-3 py-2 text-slate-500 text-[10px] font-mono">{item.dateOfBirth}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-1">
                                        {item.registeredTalentSubjects && item.registeredTalentSubjects.length > 0 ? (
                                          item.registeredTalentSubjects.map(tsId => {
                                            const subj = classrooms.find(c => c.id === item.classId)?.talentSubjects?.find(t => t.id === tsId);
                                            return subj ? (
                                              <span key={tsId} className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded text-[9px] font-semibold">
                                                {subj.name}
                                              </span>
                                            ) : null;
                                          })
                                        ) : (
                                          <span className="text-slate-400 dark:text-slate-500 text-[10px]">Không có</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                      {(item.talentFee || 0).toLocaleString('vi-VN')} đ
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="block md:hidden divide-y divide-slate-150 dark:divide-slate-800 p-3 space-y-3 bg-white dark:bg-slate-900">
                          {excelPreview.map((item, idx) => {
                            const cName = classrooms.find(c => c.id === item.classId)?.name || 'Chưa xếp';
                            return (
                              <div key={idx} className="pb-3 last:pb-0 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                                <div className="flex justify-between items-start font-semibold">
                                  <span className="text-slate-800 dark:text-white font-bold">{item.fullName}</span>
                                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold shrink-0">{(item.talentFee || 0).toLocaleString('vi-VN')} đ</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span>Mã HS: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{item.studentCode}</span></span>
                                  <span>Lớp: <span className="font-bold text-slate-700 dark:text-slate-300">{cName}</span></span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span>Ngày sinh: <span className="font-mono text-slate-500">{item.dateOfBirth || 'Chưa cập nhật'}</span></span>
                                </div>
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {item.registeredTalentSubjects && item.registeredTalentSubjects.length > 0 ? (
                                    item.registeredTalentSubjects.map(tsId => {
                                      const subj = classrooms.find(c => c.id === item.classId)?.talentSubjects?.find(t => t.id === tsId);
                                      return subj ? (
                                        <span key={tsId} className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                                          {subj.name}
                                        </span>
                                      ) : null;
                                    })
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 text-[10px] italic">Không có môn năng khiếu</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Dữ liệu dán CSV</span>
                    <button
                      type="button"
                      onClick={loadImportTemplate}
                      className="text-blue-500 hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles size={11} className="text-amber-500" /> Tải mẫu thử nghiệm
                    </button>
                  </div>
                  
                  <textarea
                    id="csv-import-textarea"
                    rows={7}
                    placeholder="Mã Học Sinh,Họ và Tên,Giới Tính,Ngày Sinh,Địa Chỉ,Số Điện Thoại Phụ Huynh,Email,Tên Lớp,Môn Năng Khiếu&#10;HS230105,Nguyễn Hoàng Nam,Nam,2018-05-14,Số 15 Tạ Quang Bửu,0912345678,nam.nh@school.edu,Lớp Lá 1,Vẽ, Võ"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="import-csv-submit"
                type="button"
                onClick={handleConfirmImport}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
              >
                Xác nhận Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SMS TUITION REMINDER DIALOG */}
      {isReminderOpen && reminderStudent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs" onClick={() => !isSendingReminder && setIsReminderOpen(false)} />
          
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 relative z-[120] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button 
              onClick={() => !isSendingReminder && setIsReminderOpen(false)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              disabled={isSendingReminder}
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-5">
              <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Bell size={20} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Nhắc nhở học phí qua SĐT</h2>
                <p className="text-[11px] text-slate-500">Gửi thông báo SMS nhắc đóng học phí năng khiếu trực tiếp cho phụ huynh</p>
              </div>
            </div>

            {/* Student context */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800/60 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Học sinh</span>
                <strong className="text-slate-800 dark:text-slate-200">{reminderStudent.fullName}</strong>
                <span className="text-slate-400 block font-mono text-[10px] mt-0.5">Mã: {reminderStudent.studentCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Lớp & SĐT liên hệ</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {classrooms.find(c => c.id === reminderStudent.classId)?.name || 'Chưa rõ'}
                </strong>
                <span className="text-amber-600 dark:text-amber-400 block font-mono font-bold mt-0.5">
                  📞 {reminderStudent.parentPhone || 'Chưa cập nhật SĐT'}
                </span>
              </div>
            </div>

            {/* SMS text input */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300">Nội dung tin nhắn</label>
                <span className="text-slate-400 text-[10px] font-mono">
                  {reminderMessage.length} ký tự ({Math.ceil(reminderMessage.length / 160)} SMS)
                </span>
              </div>
              <textarea
                rows={4}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                disabled={isSendingReminder || reminderSuccess}
                placeholder="Nhập nội dung tin nhắn nhắc nợ..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none resize-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 leading-relaxed disabled:opacity-60"
              />
            </div>

            {/* Smartphone SMS Bubble Preview */}
            <div className="mb-5 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs block">Bản xem trước trên điện thoại phụ huynh:</span>
              <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850 flex flex-col gap-1 shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2 border-b border-slate-200/40 dark:border-slate-800 pb-1.5">
                  <span>Hộp thư: SMS_BRANDNAME</span>
                  <span>Vừa xong</span>
                </div>
                <div className="self-start max-w-[85%] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs py-2 px-3.5 rounded-2xl rounded-tl-sm relative border border-slate-300/30 dark:border-slate-700/30 font-medium leading-relaxed">
                  {reminderMessage || <span className="italic text-slate-400">Nội dung tin nhắn đang trống...</span>}
                </div>
              </div>
            </div>

            {/* Previous Reminders list */}
            {reminderLogs.filter(l => l.studentId === reminderStudent.id).length > 0 && (
              <div className="mb-5 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
                <h4 className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider mb-2">Lịch sử nhắc nhở học sinh này:</h4>
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {reminderLogs.filter(l => l.studentId === reminderStudent.id).map((log) => (
                    <div key={log.id} className="bg-slate-50 dark:bg-slate-800/20 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40 text-[10px] flex justify-between items-center gap-2">
                      <span className="text-slate-400">{log.date}</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 font-mono">Đã gửi thành công</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsReminderOpen(false)}
                disabled={isSendingReminder}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={isSendingReminder || reminderSuccess || !reminderStudent.parentPhone}
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs uppercase shadow-md transition cursor-pointer flex items-center justify-center gap-2 ${
                  reminderSuccess 
                    ? 'bg-emerald-600 text-white' 
                    : isSendingReminder 
                    ? 'bg-amber-400 text-white cursor-wait' 
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                } disabled:opacity-50`}
              >
                {isSendingReminder ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Đang gửi SMS...</span>
                  </>
                ) : reminderSuccess ? (
                  <>
                    <Send size={13} className="animate-bounce" />
                    <span>Gửi thành công!</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Gửi tin nhắc nhở</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERSONAL STUDENT QR BADGE MODAL */}
      {selectedQRStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setSelectedQRStudent(null)} />
          
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button 
              onClick={() => setSelectedQRStudent(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer z-10 bg-white/80 dark:bg-slate-800/80 p-1.5 rounded-full shadow-3xs"
            >
              <X size={16} />
            </button>

            {/* Colorful friendly header banner */}
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-6 text-white text-center space-y-1 relative">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
              <p className="text-[10px] tracking-widest uppercase font-extrabold opacity-75">Thẻ Điểm Danh Mầm Non</p>
              <h3 className="text-lg font-extrabold">{settings.schoolName || 'TRƯỜNG MẦM NON 3'}</h3>
              <p className="text-[10px] opacity-90 font-medium">🧸 Đồng hành cùng nụ cười tuổi thơ</p>
            </div>

            {/* Badge Content */}
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border-2 border-violet-100 dark:border-slate-800 shadow-md">
                <img
                  src={selectedQRStudent.avatar}
                  alt={selectedQRStudent.fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{selectedQRStudent.fullName}</h4>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Mã Học Sinh: {selectedQRStudent.studentCode}</p>
                <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[10px] font-extrabold uppercase">
                  Lớp: {selectedQRStudent.className || 'Chưa xếp lớp'}
                </span>
              </div>

              {/* QR Code container */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col items-center shadow-inner relative group">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('MN3_QR_' + selectedQRStudent.studentCode)}`}
                  alt="QR Code"
                  className="w-40 h-40 object-contain mix-blend-multiply dark:mix-blend-normal dark:bg-white dark:p-2 dark:rounded-lg"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest font-mono mt-2.5">
                  MN3_QR_{selectedQRStudent.studentCode}
                </span>
              </div>
            </div>

            {/* Print or Close Options */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-850 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedQRStudent(null)}
                className="flex-1 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>In Thẻ QR Học Sinh - \${selectedQRStudent.fullName}</title>
                          <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                            body {
                              font-family: 'Inter', sans-serif;
                              display: flex;
                              justify-content: center;
                              align-items: center;
                              height: 100vh;
                              margin: 0;
                              background: #f8fafc;
                            }
                            .card {
                              width: 300px;
                              border: 1px solid #e2e8f0;
                              border-radius: 20px;
                              overflow: hidden;
                              background: white;
                              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                              text-align: center;
                            }
                            .header {
                              background: linear-gradient(135deg, #7c3aed, #6366f1);
                              color: white;
                              padding: 20px;
                            }
                            .header p { margin: 0; font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; opacity: 0.8; }
                            .header h3 { margin: 5px 0 0; font-size: 16px; font-weight: 900; }
                            .content { padding: 25px; display: flex; flex-direction: column; align-items: center; gap: 15px; }
                            .avatar { width: 80px; height: 80px; border-radius: 15px; object-fit: cover; border: 2px solid #ddd; }
                            .name { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; }
                            .code { font-size: 12px; font-weight: bold; color: #64748b; margin: 2px 0 0; }
                            .class-badge { background: #f5f3ff; color: #7c3aed; padding: 4px 12px; border-radius: 100px; font-size: 10px; font-weight: 900; text-transform: uppercase; display: inline-block; }
                            .qr-container { padding: 10px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 15px; margin-top: 10px; }
                            .qr-code { width: 140px; height: 140px; }
                            .qr-text { font-size: 10px; font-family: monospace; font-weight: bold; color: #94a3b8; letter-spacing: 2px; margin-top: 8px; }
                          </style>
                        </head>
                        <body>
                          <div class="card">
                            <div class="header">
                              <p>Thẻ Điểm Danh Mầm Non</p>
                              <h3>\${settings.schoolName || 'TRƯỜNG MẦM NON 3'}</h3>
                            </div>
                            <div class="content">
                              <img class="avatar" src="\${selectedQRStudent.avatar}" />
                              <div>
                                <p class="name">\${selectedQRStudent.fullName}</p>
                                <p class="code">Mã HS: \${selectedQRStudent.studentCode}</p>
                                <span class="class-badge">Lớp: \${selectedQRStudent.className || 'Chưa xếp lớp'}</span>
                              </div>
                              <div class="qr-container">
                                <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=\${encodeURIComponent('MN3_QR_' + selectedQRStudent.studentCode)}" />
                                <div class="qr-text">MN3_QR_\${selectedQRStudent.studentCode}</div>
                              </div>
                            </div>
                          </div>
                          <script>
                            window.onload = function() {
                              window.print();
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold uppercase shadow-md hover:shadow-violet-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer size={14} />
                <span>In Thẻ QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
