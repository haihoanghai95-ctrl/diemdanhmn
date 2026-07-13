/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Play,
  Square,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  UserCheck,
  ChevronRight,
  MonitorPlay,
  HelpCircle,
  Send,
  Bell,
  QrCode,
  Printer,
  X
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, SchoolSettings } from '../types';
import { audioService } from '../utils/audio';
import { generateMockLandmarks, FacialLandmarks } from '../utils/faceSim';

interface CameraAttendanceProps {
  students: Student[];
  attendance: AttendanceRecord[];
  saveAttendance: (attendance: AttendanceRecord[]) => void;
  settings: SchoolSettings;
}

export default function CameraAttendance({
  students,
  attendance,
  saveAttendance,
  settings,
}: CameraAttendanceProps) {
  const [isActive, setIsActive] = useState(false);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [autoPilot, setAutoPilot] = useState(true);
  const [mode, setMode] = useState<'face' | 'qr'>('face');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString('vi-VN'));

  // Live time ticker for presentation mode clock
  useEffect(() => {
    if (!isPresentationMode) return;
    const interval = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPresentationMode]);
  
  // Scanned target state
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'unknown' | 'duplicate'>('idle');
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Simulated subject selector
  const [selectedSimStudentId, setSelectedSimStudentId] = useState<string>('');

  // Parent notification status state after attendance scan
  const [notifDetails, setNotifDetails] = useState<{ studentName: string; phone: string; photo: string; time: string; success: boolean } | null>(null);
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Refs for camera streaming and facial overlay canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Map theme accent colors
  const getThemeColorClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20';
      case 'violet': return 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20';
      case 'rose': return 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20';
      case 'amber': return 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20';
      default: return 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20';
    }
  };

  const getThemeBgClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20';
      default: return 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20';
    }
  };

  const getThemeBorderClass = () => {
    switch (settings.themeColor) {
      case 'emerald': return 'border-emerald-500';
      case 'violet': return 'border-violet-500';
      case 'rose': return 'border-rose-500';
      case 'amber': return 'border-amber-500';
      default: return 'border-blue-500';
    }
  };

  // Turn on actual Device Camera
  const startScanningSession = async () => {
    setErrorMessage('');
    setHasCameraError(false);
    setScanState('idle');
    setLastScannedStudent(null);
    setIsActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      console.warn('Cannot obtain camera feed:', e);
      setHasCameraError(true);
      setErrorMessage('Không tìm thấy Camera hoặc trình duyệt bị từ chối quyền truy cập. Hệ thống sẽ bật chế độ quét mô phỏng.');
    }
  };

  // Turn off scanning session
  const stopScanningSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsActive(false);
    setHasCameraError(false);
    setScanState('idle');
  };

  // Drawing continuous matrix / facial bracket guides on the Canvas
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrameId: number;

    const drawLoop = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();

      if (mode === 'qr') {
        // --- QR CODE SCANNING VIEWPORT ---
        const qrSize = 180;
        const qrx = (canvas.width - qrSize) / 2;
        const qry = (canvas.height - qrSize) / 2;

        // Draw semi-transparent background overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        // Top
        ctx.fillRect(0, 0, canvas.width, qry);
        // Bottom
        ctx.fillRect(0, qry + qrSize, canvas.width, canvas.height - (qry + qrSize));
        // Left
        ctx.fillRect(0, qry, qrx, qrSize);
        // Right
        ctx.fillRect(qrx + qrSize, qry, canvas.width - (qrx + qrSize), qrSize);

        // Sweep line
        const sweepY = qry + (Math.sin(now * 0.0035) + 1) * 0.5 * qrSize;
        ctx.strokeStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#8b5cf6'; // Violet/emerald/rose
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(qrx + 8, sweepY);
        ctx.lineTo(qrx + qrSize - 8, sweepY);
        ctx.stroke();

        // Corner brackets for QR box
        ctx.strokeStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#8b5cf6';
        ctx.lineWidth = 4;
        const len = 22;

        // Top Left
        ctx.beginPath();
        ctx.moveTo(qrx, qry + len);
        ctx.lineTo(qrx, qry);
        ctx.lineTo(qrx + len, qry);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(qrx + qrSize - len, qry);
        ctx.lineTo(qrx + qrSize, qry);
        ctx.lineTo(qrx + qrSize, qry + len);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(qrx, qry + qrSize - len);
        ctx.lineTo(qrx, qry + qrSize);
        ctx.lineTo(qrx + len, qry + qrSize);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(qrx + qrSize - len, qry + qrSize);
        ctx.lineTo(qrx + qrSize, qry + qrSize);
        ctx.lineTo(qrx + qrSize, qry + qrSize - len);
        ctx.stroke();

        // Draw crosshair helper lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, qry + 10);
        ctx.lineTo(canvas.width / 2, qry + qrSize - 10);
        ctx.moveTo(qrx + 10, canvas.height / 2);
        ctx.lineTo(qrx + qrSize - 10, canvas.height / 2);
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Label
        ctx.fillStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';

        let textToShow = 'HÃY ĐƯA MÃ QR CỦA BÉ VÀO Ô QUÉT';
        if (scanState === 'scanning') {
          textToShow = 'ĐANG GIẢI MÃ QR CODE...';
        } else if (scanState === 'success' && lastScannedStudent) {
          textToShow = `MÃ QR HỢP LỆ: ${lastScannedStudent.fullName.toUpperCase()}`;
        } else if (scanState === 'unknown') {
          textToShow = 'MÃ QR KHÔNG HỢP LỆ';
        } else if (scanState === 'duplicate') {
          textToShow = 'ĐÃ ĐIỂM DANH HÔM NAY';
        }

        ctx.fillText(textToShow, canvas.width / 2, qry - 14);

      } else {
        // --- AI FACE SCANNING VIEWPORT ---
        // Generate simulated coordinates
        const landmarks: FacialLandmarks = generateMockLandmarks(canvas.width, canvas.height, true);
        const { box, leftEye, rightEye, nose, mouth, jawline } = landmarks;

        // 1. Draw glowing HUD radar scanning line sweeping vertically
        const sweepY = box.y + (Math.sin(now * 0.002) + 1) * 0.5 * box.height;
        ctx.strokeStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(box.x, sweepY);
        ctx.lineTo(box.x + box.width, sweepY);
        ctx.stroke();

        // HUD green/red/blue scanner frame box brackets
        ctx.strokeStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#3b82f6';
        ctx.lineWidth = 3.5;
        
        const len = 25; // corner length
        // Top Left corner
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + len);
        ctx.lineTo(box.x, box.y);
        ctx.lineTo(box.x + len, box.y);
        ctx.stroke();

        // Top Right corner
        ctx.beginPath();
        ctx.moveTo(box.x + box.width - len, box.y);
        ctx.lineTo(box.x + box.width, box.y);
        ctx.lineTo(box.x + box.width, box.y + len);
        ctx.stroke();

        // Bottom Left corner
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + box.height - len);
        ctx.lineTo(box.x, box.y + box.height);
        ctx.lineTo(box.x + len, box.y + box.height);
        ctx.stroke();

        // Bottom Right corner
        ctx.beginPath();
        ctx.moveTo(box.x + box.width - len, box.y + box.height);
        ctx.lineTo(box.x + box.width, box.y + box.height);
        ctx.lineTo(box.x + box.width, box.y + box.height - len);
        ctx.stroke();

        // 2. Draw dots at jawline, eyes, nose, mouth (Facial Mesh simulation)
        ctx.fillStyle = scanState === 'success' ? 'rgba(16, 185, 129, 0.7)' : scanState === 'unknown' ? 'rgba(244, 63, 94, 0.7)' : 'rgba(59, 130, 246, 0.7)';
        
        // Draw eyes
        ctx.beginPath(); ctx.arc(leftEye.x, leftEye.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rightEye.x, rightEye.y, 4, 0, Math.PI * 2); ctx.fill();
        
        // Draw nose
        ctx.beginPath(); ctx.arc(nose.x, nose.y, 4, 0, Math.PI * 2); ctx.fill();
        
        // Draw mouth path
        ctx.strokeStyle = scanState === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        mouth.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.stroke();

        // Draw jawline path
        ctx.beginPath();
        jawline.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Dots at jawline vertices
        jawline.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
        });

        // 3. Draw text label
        ctx.fillStyle = scanState === 'success' ? '#10b981' : scanState === 'unknown' ? '#f43f5e' : '#3b82f6';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        let textToShow = 'ĐANG TÌM KIẾM KHUÔN MẶT...';
        if (scanState === 'scanning') {
          textToShow = 'ĐANG TRÍCH XUẤT EMBEDDING...';
        } else if (scanState === 'success' && lastScannedStudent) {
          textToShow = `ĐÃ XÁC THỰC: ${lastScannedStudent.fullName.toUpperCase()} (${similarityScore}%)`;
        } else if (scanState === 'unknown') {
          textToShow = 'KHÔNG XÁC ĐỊNH TRÙNG KHỚP';
        } else if (scanState === 'duplicate') {
          textToShow = 'ĐÃ ĐIỂM DANH HÔM NAY';
        }
        
        ctx.fillText(textToShow, box.x + box.width / 2, box.y - 12);
      }

      localFrameId = requestAnimationFrame(drawLoop);
    };

    localFrameId = requestAnimationFrame(drawLoop);
    animationFrameRef.current = localFrameId;

    return () => {
      cancelAnimationFrame(localFrameId);
    };
  }, [isActive, scanState, lastScannedStudent, similarityScore, mode]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // --- ATTENDANCE RECOGNITION LOGIC ---

  // Trigger Attendance Process (either simulated or actual scanning match)
  const processAttendance = (student: Student | null) => {
    if (!student) {
      // Trình trạng không nhận diện được
      setScanState('unknown');
      setLastScannedStudent(null);
      setSimilarityScore(Math.floor(Math.random() * 15) + 35); // Low matching score [35-50%]
      audioService.playError();
      return;
    }

    // 1. Check for duplication (today, same student)
    const todayStr = new Date().toISOString().split('T')[0];
    const isAlreadyCheckedIn = attendance.some(r => r.studentId === student.id && r.date === todayStr);

    if (isAlreadyCheckedIn) {
      setScanState('duplicate');
      setLastScannedStudent(student);
      setSimilarityScore(Math.floor(Math.random() * 5) + 95); // High score but duplicate
      audioService.playError();
      return;
    }

    // 2. Determine attendance status: 'present' or 'late' based on time comparison
    const now = new Date();
    const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // So sánh thời gian
    const isLate = currentHHMM > settings.lateTime;
    const status: AttendanceStatus = isLate ? 'late' : 'present';

    // 3. Play Success Sound and update state
    setLastScannedStudent(student);
    setSimilarityScore(Math.floor(Math.random() * 8) + 92); // High matching score [92-99%]
    setScanState('success');
    audioService.playSuccess();

    // 4. Capture real photo from live video feed if active
    let capturedPhoto = student.avatar;
    if (videoRef.current && streamRef.current && videoRef.current.readyState >= 2) {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoRef.current.videoWidth || 640;
        tempCanvas.height = videoRef.current.videoHeight || 480;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          // Flip horizontally to match current mirrored video stream
          tempCtx.translate(tempCanvas.width, 0);
          tempCtx.scale(-1, 1);
          tempCtx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
          capturedPhoto = tempCanvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (err) {
        console.warn('Error capturing from video stream:', err);
      }
    }

    const checkinTimeStr = now.toLocaleTimeString('vi-VN');

    // 5. Create new Attendance log record with captured camera photo
    const newRecord: AttendanceRecord = {
      id: `att_${student.id}_${Date.now()}`,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.fullName,
      classId: student.classId,
      className: student.className || 'Chưa xếp lớp',
      date: todayStr,
      time: checkinTimeStr,
      status,
      notes: isLate 
        ? `Được quét qua ${mode === 'qr' ? 'Mã QR Code' : 'Camera AI'} (Đến Muộn)` 
        : `Được quét qua ${mode === 'qr' ? 'Mã QR Code' : 'Camera AI'} (Đúng Giờ)`,
      photoCaptured: capturedPhoto, // Real snapshot or avatar
    };

    saveAttendance([...attendance, newRecord]);

    // 6. Trigger Real-time Notification dispatch to parents
    setIsSendingNotif(true);
    setNotifDetails({
      studentName: student.fullName,
      phone: student.parentPhone || 'Chưa cập nhật',
      photo: capturedPhoto,
      time: checkinTimeStr,
      success: false,
    });

    // Simulate reliable carrier API transit delay
    setTimeout(() => {
      setIsSendingNotif(false);
      setNotifDetails(prev => prev ? { ...prev, success: true } : null);
      
      // Save notification log to history/local logs for complete auditing
      try {
        const savedLogs = localStorage.getItem('school_attendance_notification_logs');
        const logs = savedLogs ? JSON.parse(savedLogs) : [];
        const newLog = {
          id: 'notif_' + Math.random().toString(36).substring(2, 11),
          studentId: student.id,
          studentName: student.fullName,
          phone: student.parentPhone || 'Chưa cập nhật',
          time: checkinTimeStr,
          date: todayStr,
          status,
          photo: capturedPhoto,
          message: `Thông báo điểm danh: Bé ${student.fullName} đã vào lớp lúc ${checkinTimeStr} ngày ${todayStr}. Trạng thái: ${isLate ? 'Đi muộn' : 'Đúng giờ'}. Đính kèm ảnh điểm danh từ camera.`
        };
        localStorage.setItem('school_attendance_notification_logs', JSON.stringify([newLog, ...logs]));
      } catch (e) {
        console.error('Failed to log parent notification:', e);
      }
    }, 1500);
  };

  // Fast biometric scan simulation
  const triggerScanForStudent = (student: Student | null) => {
    if (scanState === 'scanning') return;
    setScanState('scanning');
    
    // Snappy, high-tech matching delay of 800ms
    setTimeout(() => {
      processAttendance(student);
    }, 800);
  };

  const clearTodayAttendance = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filtered = attendance.filter(r => r.date !== todayStr);
    saveAttendance(filtered);
    setScanState('idle');
    setLastScannedStudent(null);
    audioService.playSuccess();
  };

  const handleManualTriggerScan = () => {
    if (scanState === 'scanning') return;
    
    if (selectedSimStudentId) {
      const student = students.find(s => s.id === selectedSimStudentId) || null;
      triggerScanForStudent(student);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const checkedInIds = new Set(attendance.filter(r => r.date === todayStr).map(r => r.studentId));
      const eligibleStudents = students.filter(s => !checkedInIds.has(s.id));

      if (eligibleStudents.length === 0) {
        if (students.length > 0) {
          const randomIndex = Math.floor(Math.random() * students.length);
          triggerScanForStudent(students[randomIndex]);
        } else {
          setErrorMessage('Vui lòng thêm học sinh vào danh sách trong tab "Học Sinh" trước.');
          setTimeout(() => setErrorMessage(''), 4000);
        }
        return;
      }

      triggerScanForStudent(eligibleStudents[0]);
    }
  };

  // Triggering autopilot / auto-scan hook to check-in students sequentially
  useEffect(() => {
    if (!isActive || !autoPilot) return;

    if (scanState !== 'idle') {
      if (scanState === 'success' || scanState === 'unknown' || scanState === 'duplicate') {
        const resetTimer = setTimeout(() => {
          setScanState('idle');
        }, 2200); // snappy transition
        return () => clearTimeout(resetTimer);
      }
      return;
    }

    const autoScanTimer = setTimeout(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const checkedInIds = new Set(attendance.filter(r => r.date === todayStr).map(r => r.studentId));
      const eligibleStudents = students.filter(s => !checkedInIds.has(s.id));

      if (eligibleStudents.length === 0) {
        return;
      }

      const randomIndex = Math.floor(Math.random() * eligibleStudents.length);
      const randomStudent = eligibleStudents[randomIndex];
      triggerScanForStudent(randomStudent);
    }, 1500); // wait 1.5 seconds in idle before launching a scan

    return () => clearTimeout(autoScanTimer);
  }, [isActive, autoPilot, scanState, students, attendance]);

  // Triggering simulation with student from simulator dropdown
  const triggerSimulatedCheckIn = () => {
    if (!selectedSimStudentId) {
      alert('Vui lòng chọn một học sinh trong danh sách mô phỏng.');
      return;
    }
    const student = students.find(s => s.id === selectedSimStudentId) || null;
    triggerScanForStudent(student);
  };

  const triggerSimulatedUnknown = () => {
    triggerScanForStudent(null);
  };

  if (isPresentationMode) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 dark:bg-slate-950 text-slate-100 flex flex-col justify-between p-6 overflow-y-auto select-none font-sans">
        
        {/* 1. HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/60 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
              <MonitorPlay className="text-rose-400 animate-pulse" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 animate-pulse">
                  ● HỆ THỐNG LIVE CAM
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {settings.schoolName || 'TRƯỜNG MẦM NON 3'}
                </span>
              </div>
              <h1 className="text-base font-black text-white">
                CHẾ ĐỘ TRÌNH CHIẾU ĐIỂM DANH TỰ ĐỘNG
              </h1>
            </div>
          </div>

          {/* Clock & Date */}
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-3xl font-black text-rose-400 tracking-wider font-mono">
              {liveTime}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {/* Mode switch + Exit button */}
          <div className="flex items-center gap-3">
            <div className="flex p-0.5 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setMode('face')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  mode === 'face' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera size={12} />
                <span>AI Face</span>
              </button>
              <button
                onClick={() => setMode('qr')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  mode === 'qr' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode size={12} />
                <span>QR Code</span>
              </button>
            </div>

            <button
              onClick={() => setIsPresentationMode(false)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition cursor-pointer"
            >
              <X size={14} />
              <span>Thoát</span>
            </button>
          </div>
        </div>

        {/* 2. SPLIT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 flex-1 items-stretch">
          
          {/* Left: Huge Camera Panel */}
          <div className="lg:col-span-7 bg-slate-950/40 rounded-3xl border border-slate-800 p-6 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Khung Quét Camera Hoạt Động
              </span>
            </div>

            <div className="relative w-full max-w-[580px] aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
              {/* Camera view */}
              {isActive && !hasCameraError && (
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                  playsInline
                  muted
                />
              )}

              {/* HUD Canvas overlay */}
              <canvas
                ref={canvasRef}
                width={500}
                height={375}
                className={`absolute inset-0 z-10 w-full h-full pointer-events-none transition-opacity duration-300 ${isActive && !hasCameraError ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* Warning overlay for simulated errors */}
              {errorMessage && isActive && !hasCameraError && (
                <div className="absolute inset-x-4 top-4 z-20 p-3 bg-amber-500/95 text-white text-xs rounded-xl flex items-center gap-2 shadow-lg animate-bounce font-bold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Camera Error / Permission guidance overlay in presentation mode */}
              {isActive && hasCameraError && (
                <div className="absolute inset-0 z-20 p-6 bg-slate-900/95 flex flex-col justify-center text-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-slate-800 pb-3">
                    <AlertCircle size={20} className="shrink-0 text-rose-500 animate-pulse" />
                    <span className="text-sm font-black uppercase tracking-wider">MÁY ẢNH ĐANG BỊ TRÌNH DUYỆT CHẶN</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Hệ thống trình chiếu điểm danh không thể truy cập camera do thiếu quyền hoặc thiết bị không khả dụng.
                  </p>
                  <div className="bg-slate-950/85 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                    <p className="font-extrabold text-amber-400 flex items-center gap-1">💡 Hướng dẫn cấp quyền nhanh:</p>
                    <p>1. Tìm biểu tượng <strong className="text-white">Ổ khóa 🔒</strong> ở đầu thanh địa chỉ của trình duyệt.</p>
                    <p>2. Chuyển trạng thái tùy chọn <strong className="text-white">Máy ảnh (Camera)</strong> sang <strong className="text-emerald-400 font-extrabold">Cho phép (Allow)</strong>.</p>
                    <p>3. Làm mới trang này <strong className="text-white">(F5)</strong>.</p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopScanningSession();
                        setTimeout(startScanningSession, 150);
                      }}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                    >
                      THỬ KÍCH HOẠT LẠI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                    >
                      TẢI LẠI TRANG (F5)
                    </button>
                  </div>
                </div>
              )}

              {!isActive && (
                <div className="text-center text-slate-500 space-y-3 p-6">
                  <Camera size={44} className="mx-auto text-slate-600 animate-pulse stroke-1" />
                  <p className="text-xs font-bold text-slate-400">Camera Điểm Danh Đang Tắt</p>
                  <button 
                    onClick={startScanningSession}
                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-500 cursor-pointer"
                  >
                    Bật Camera ngay
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-6 text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-rose-400" />
                Đúng giờ trước: <strong className="text-white">{settings.startTime}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <AlertCircle size={13} className="text-amber-500" />
                Đi muộn sau: <strong className="text-white">{settings.lateTime}</strong>
              </span>
            </div>
          </div>

          {/* Right: Giant Scanning result card */}
          <div className="lg:col-span-5 bg-slate-950/40 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden min-h-[350px]">
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-4 border-b border-slate-800 pb-3">
              Thông tin nhận dạng thời gian thực
            </div>

            <AnimatePresence mode="wait">
              {scanState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-12"
                >
                  <div className="relative">
                    <div className="absolute inset-0 w-16 h-16 rounded-full border border-rose-500/30 animate-ping" />
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                      <UserCheck size={28} className="text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-300">Đang đợi học sinh...</h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Vui lòng đưa gương mặt hoặc mã QR học sinh vào trước Camera để ghi nhận điểm danh tự động.
                  </p>
                </motion.div>
              )}

              {scanState === 'scanning' && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12"
                >
                  <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <h3 className="text-sm font-black text-rose-400 animate-pulse tracking-wider uppercase">
                    ĐANG PHÂN TÍCH VECTOR SINH TRẮC HỌC...
                  </h3>
                </motion.div>
              )}

              {scanState === 'success' && lastScannedStudent && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col justify-center space-y-6 py-4"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="relative">
                      <div className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-md animate-pulse" />
                      <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-emerald-500 shadow-2xl relative z-10">
                        <img
                          src={lastScannedStudent.avatar}
                          alt={lastScannedStudent.fullName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 justify-center">
                        <h2 className="text-2xl font-black text-white tracking-tight">
                          {lastScannedStudent.fullName}
                        </h2>
                        <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                      </div>
                      <p className="text-xs font-bold text-slate-400">Mã Học Sinh: {lastScannedStudent.studentCode}</p>
                      <span className="inline-block px-3.5 py-1 rounded bg-rose-500/20 text-rose-300 text-xs font-black uppercase">
                        HỌC SINH LỚP {lastScannedStudent.className}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-sm">
                    <span className="font-extrabold text-emerald-400 tracking-wider">
                      ĐIỂM DANH THÀNH CÔNG
                    </span>
                    <span className="font-mono text-emerald-300 font-bold bg-emerald-950/60 px-3 py-1 rounded-lg">
                      {new Date().toLocaleTimeString('vi-VN')}
                    </span>
                  </div>

                  {/* SMS details in presentation */}
                  {notifDetails && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-slate-850 overflow-hidden shrink-0 border border-slate-700">
                        <img src={notifDetails.photo} className="w-full h-full object-cover" alt="Scan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Send size={10} /> ĐÃ GỬI BÁO CÁO PHỤ HUYNH
                        </p>
                        <p className="text-[10.5px] text-slate-400 truncate">
                          Đã nhắn tin kèm ảnh camera thực tế tới SĐT {notifDetails.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {scanState === 'duplicate' && lastScannedStudent && (
                <motion.div
                  key="duplicate"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-8"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-500 shadow-xl">
                    <img
                      src={lastScannedStudent.avatar}
                      alt={lastScannedStudent.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{lastScannedStudent.fullName}</h3>
                    <p className="text-xs text-slate-400">Mã: {lastScannedStudent.studentCode} • Lớp: {lastScannedStudent.className}</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-bold w-full max-w-xs">
                    ⚠️ TRÙNG LẶP: ĐÃ ĐIỂM DANH HÔM NAY
                  </div>
                </motion.div>
              )}

              {scanState === 'unknown' && (
                <motion.div
                  key="unknown"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500 flex items-center justify-center text-rose-500">
                    <XCircle size={36} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-rose-400">
                      {mode === 'qr' ? 'MÃ QR KHÔNG HỢP LỆ' : 'GƯƠNG MẶT CHƯA ĐĂNG KÝ'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Hệ thống không tìm thấy hồ sơ học sinh khớp với dữ liệu sinh trắc học này. Vui lòng thử lại hoặc quét thủ công.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 3. SIMULATION DRAWER/TRAY */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500 animate-pulse" />
              Bảng mô phỏng thử nghiệm (Dành cho kiểm thử viên trong IFrame)
            </span>
            <button
              onClick={clearTodayAttendance}
              className="text-[10px] text-slate-500 hover:text-rose-400 transition font-bold cursor-pointer"
            >
              Xóa lịch sử điểm danh hôm nay
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8">
              <select
                value={selectedSimStudentId}
                onChange={(e) => setSelectedSimStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">-- [Chọn học sinh để mô phỏng quét camera] --</option>
                {students.map(s => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isChecked = attendance.some(r => r.studentId === s.id && r.date === todayStr);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.className}) {isChecked ? '• Đã quét thành công' : '• Chờ kiểm diện'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="md:col-span-4 flex gap-2">
              <button
                type="button"
                onClick={triggerSimulatedCheckIn}
                disabled={scanState === 'scanning'}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                QUÉT NGAY
              </button>
              <button
                type="button"
                onClick={triggerSimulatedUnknown}
                disabled={scanState === 'scanning'}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-black transition cursor-pointer"
              >
                MÃ LẠ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Điểm Danh Camera Thời Gian Thực <Sparkles className="text-amber-500 animate-pulse" size={24} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Nhận diện sinh trắc học gương mặt 128 chiều, tự động phân tích và chấm điểm danh đúng giờ/muộn giờ.
          </p>
        </div>

        {/* Start / Stop Button */}
        {!isActive ? (
          <button
            onClick={startScanningSession}
            className={`px-5 py-3 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer ${getThemeBgClass()}`}
          >
            <Play size={16} />
            <span>Bắt đầu điểm danh</span>
          </button>
        ) : (
          <button
            onClick={stopScanningSession}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg cursor-pointer transition"
          >
            <Square size={16} />
            <span>Dừng điểm danh</span>
          </button>
        )}
      </div>

      {/* Attendance Mode Selector Bar */}
      <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setMode('face')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'face'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <Camera size={14} />
            <span>AI Face Recognition</span>
          </button>
          <button
            onClick={() => setMode('qr')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'qr'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <QrCode size={14} />
            <span>QR Code Attendance</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              if (!isActive) {
                startScanningSession();
              }
              setIsPresentationMode(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-rose-100/50 dark:border-rose-900/40 transition cursor-pointer shadow-xs"
          >
            <MonitorPlay size={14} />
            <span>Chế độ trình chiếu 🖥️</span>
          </button>

          <button
            onClick={() => setIsQRModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-600 dark:bg-violet-950/30 dark:hover:bg-violet-950/50 dark:text-violet-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-violet-100/50 dark:border-violet-900/40 transition cursor-pointer shadow-xs"
          >
            <QrCode size={14} />
            <span>Danh sách mã QR lớp học 📋</span>
          </button>
        </div>
      </div>

      {/* Main Scaning Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Real-time Camera and scanning HUD feed */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col items-center">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              {mode === 'qr' ? (
                <QrCode size={18} className="text-violet-500 animate-pulse" />
              ) : (
                <Camera size={18} className={getThemeColorClass().split(' ')[0]} />
              )}
              <span>{mode === 'qr' ? 'Kênh Quét Mã QR Định Danh' : 'Kênh Camera Nhận Diện Gương Mặt'}</span>
            </h3>
            
            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Modern Auto-pilot toggle switch */}
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={autoPilot}
                  onChange={(e) => setAutoPilot(e.target.checked)}
                  className="sr-only peer"
                />
                <span>Quét tự động (Auto-pilot)</span>
                <div className="relative w-8 h-4.5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-650 peer-checked:bg-emerald-500"></div>
              </label>

              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${isActive ? 'bg-emerald-50 text-emerald-600 animate-pulse dark:bg-emerald-950/25' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                {isActive ? '● Đang truyền hình ảnh' : '● Ngoại tuyến'}
              </span>
            </div>
          </div>

          {/* Video stream container with relative Canvas overlay */}
          <div className="relative w-full max-w-[500px] aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center">
            
            {/* Real device stream */}
            {isActive && !hasCameraError && (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                playsInline
                muted
              />
            )}

            {/* Glowing HUD Canvas overlay draws box & face points */}
            <canvas
              ref={canvasRef}
              width={500}
              height={375}
              className={`absolute inset-0 z-10 w-full h-full pointer-events-none transition-opacity duration-300 ${isActive && !hasCameraError ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Offline/Blank Screen message */}
            {!isActive && (
              <div className="text-center text-slate-500 space-y-3 p-6 flex flex-col items-center justify-center relative z-10">
                <div className="p-4 bg-slate-800/40 rounded-full">
                  <Camera size={36} className="text-slate-400 stroke-1" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-300">Camera Đang Tắt</h4>
                  <p className="text-xs text-slate-500 max-w-xs leading-normal">
                    Hệ thống điểm danh sinh trắc học chưa kích hoạt. Bấm nút "Bắt đầu điểm danh" để khởi chạy.
                  </p>
                </div>
              </div>
            )}
            
            {/* Error alerts overlay */}
            {errorMessage && isActive && !hasCameraError && (
              <div className="absolute inset-x-4 top-4 z-20 p-3 bg-amber-500/90 backdrop-blur-xs text-white text-xs rounded-xl flex items-center gap-2 shadow-lg animate-bounce">
                <AlertCircle size={16} className="shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Camera Error / Permission guidance overlay inside the box */}
            {isActive && hasCameraError && (
              <div className="absolute inset-0 z-20 p-5 bg-slate-900/95 flex flex-col justify-center text-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-2">
                  <AlertCircle size={18} className="shrink-0 text-amber-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Lỗi Cấp Quyền Camera Trình Duyệt</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Trình duyệt đang chặn quyền truy cập máy ảnh hoặc không tìm thấy thiết bị camera hợp lệ.
                </p>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-[10px] text-slate-300">
                  <p className="font-bold text-amber-400">💡 Hướng dẫn mở khóa camera:</p>
                  <p>1. Nhấp vào biểu tượng <strong className="text-white">Ổ khóa 🔒</strong> hoặc <strong className="text-white">Máy ảnh 📷</strong> ở góc trái thanh địa chỉ trình duyệt.</p>
                  <p>2. Chọn mục <strong className="text-white">Máy ảnh (Camera)</strong> và chuyển thành <strong className="text-emerald-400">Cho phép (Allow)</strong>.</p>
                  <p>3. Nhấp nút <strong className="text-white">Thử lại</strong> hoặc nhấn <strong className="text-white">F5</strong> để làm mới trang.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      stopScanningSession();
                      setTimeout(startScanningSession, 150);
                    }}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Thử khởi chạy lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Tải lại trang (F5)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Fast Face-Scanning & Testing Panel */}
          {isActive && (
            <div className="w-full max-w-[500px] mt-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={14} className={mode === 'qr' ? 'text-violet-500' : 'text-blue-500'} /> 
                  <span>Nhập vai quét {mode === 'qr' ? 'mã QR định danh' : 'gương mặt sinh trắc'} của bé:</span>
                </span>
                
                <button
                  type="button"
                  onClick={clearTodayAttendance}
                  className="text-[10px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition flex items-center gap-1 font-bold cursor-pointer"
                >
                  Xóa lịch sử quét hôm nay
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-8">
                  <select
                    value={selectedSimStudentId}
                    onChange={(e) => setSelectedSimStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">-- [Tự Động Quét & Khớp Bản Ghi] --</option>
                    {students.map(s => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isChecked = attendance.some(r => r.studentId === s.id && r.date === todayStr);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.className || 'Chưa lớp'}) {isChecked ? '• Đã quét' : '• Đợi quét'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="sm:col-span-4 flex gap-1">
                  <button
                    type="button"
                    onClick={handleManualTriggerScan}
                    disabled={scanState === 'scanning'}
                    className={`flex-1 py-2 text-white rounded-xl text-xs font-extrabold uppercase transition disabled:opacity-50 cursor-pointer shadow-md text-center ${
                      mode === 'qr'
                        ? 'bg-violet-600 hover:bg-violet-500 hover:shadow-violet-500/20'
                        : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20'
                    }`}
                  >
                    QUÉT NGAY
                  </button>
                  <button
                    type="button"
                    onClick={triggerSimulatedUnknown}
                    disabled={scanState === 'scanning'}
                    className="px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-bold transition cursor-pointer"
                    title={mode === 'qr' ? 'Mô phỏng mã QR không hợp lệ' : 'Mô phỏng người lạ mặt'}
                  >
                    MÃ LẠ
                  </button>
                </div>
              </div>

              {/* Dynamic QR Code Badge inside cockpit */}
              {mode === 'qr' && selectedSimStudentId && (
                (() => {
                  const student = students.find(s => s.id === selectedSimStudentId);
                  if (!student) return null;
                  return (
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col items-center text-center space-y-3 relative overflow-hidden animate-scale-in shadow-xs">
                      <div className="absolute top-0 left-0 w-full h-1 bg-violet-500" />
                      <div className="flex items-center gap-3 w-full border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                          <img src={student.avatar} alt={student.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight">{student.fullName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold">Mã lớp: {student.className} • Mã HS: {student.studentCode}</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150/50 dark:border-slate-850/60 flex flex-col items-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('MN3_QR_' + student.studentCode)}`}
                          alt="Student QR Code"
                          className="w-24 h-24 object-contain mix-blend-multiply dark:mix-blend-normal dark:bg-white dark:p-1 dark:rounded-md"
                        />
                        <span className="text-[9px] font-bold text-slate-400 mt-1.5 font-mono tracking-widest">MN3_QR_{student.studentCode}</span>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 font-semibold italic">
                        Đưa mã QR trên vào khung quét Camera hoặc nhấn nút "QUÉT NGAY" để mô phỏng.
                      </p>
                    </div>
                  );
                })()
              )}

              {/* Helpful guide warning if all checked-in */}
              {students.length > 0 && attendance.filter(r => r.date === new Date().toISOString().split('T')[0]).length === students.length && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-[10.5px] text-amber-600 dark:text-amber-400 font-bold leading-relaxed">
                  <AlertCircle size={14} className="shrink-0 text-amber-500" />
                  <span>Tất cả học sinh đã hoàn thành điểm danh! Hãy nhấn <strong className="underline cursor-pointer" onClick={clearTodayAttendance}>"Xóa lịch sử quét hôm nay"</strong> để bắt đầu kiểm tra lại.</span>
                </div>
              )}
            </div>
          )}

          {/* Settings hint */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400 font-semibold border-t border-slate-50 dark:border-slate-800/80 w-full pt-4 justify-between">
            <div className="flex items-center gap-1.5">
              <Clock size={15} />
              <span>Đúng giờ trước: <strong className="text-slate-600 dark:text-slate-300">{settings.startTime}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle size={15} className="text-amber-500" />
              <span>Tính đi muộn sau: <strong className="text-slate-600 dark:text-slate-300">{settings.lateTime}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Scan feedback card & Simulated controllers */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Scan result display panel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[220px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 font-mono">
              {mode === 'qr' ? 'Kết quả quét QR Code' : 'Kết quả quét gương mặt'}
            </h3>

            <AnimatePresence mode="wait">
              {scanState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center py-8 text-slate-400 space-y-2"
                >
                  <UserCheck size={36} className="stroke-1 text-slate-300" />
                  <p className="text-xs max-w-[200px] leading-normal font-medium">
                    Đang đợi dữ liệu phân tích từ thiết bị đầu vào camera...
                  </p>
                </motion.div>
              )}

              {scanState === 'scanning' && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center py-8 space-y-3"
                >
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 font-bold animate-pulse">
                    ĐANG QUÉT VÀ TRÍCH XUẤT EMBEDDING...
                  </p>
                </motion.div>
              )}

              {scanState === 'success' && lastScannedStudent && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Student Card header */}
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-emerald-500 shadow-md shrink-0">
                      <img
                        src={lastScannedStudent.avatar}
                        alt={lastScannedStudent.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-base font-bold text-slate-950 dark:text-white leading-tight">
                          {lastScannedStudent.fullName}
                        </h4>
                        <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-xs font-semibold text-slate-400">Mã: {lastScannedStudent.studentCode}</p>
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase">
                        {lastScannedStudent.className}
                      </span>
                    </div>
                  </div>

                  {/* Status indicator row */}
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      ĐIỂM DANH THÀNH CÔNG • {mode === 'qr' ? 'Mã QR Hợp Lệ 100%' : `${similarityScore}% khớp`}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
                      {new Date().toLocaleTimeString('vi-VN')}
                    </span>
                  </div>

                  {/* Real-time parent notification status block */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Send size={12} className={isSendingNotif ? 'animate-pulse text-amber-500' : 'text-emerald-500'} />
                        THÔNG BÁO CHO PHỤ HUYNH
                      </span>
                      <span className="text-[10px] bg-slate-200/60 dark:bg-slate-850 px-2 py-0.5 rounded-full font-mono font-medium">
                        📞 {notifDetails?.phone}
                      </span>
                    </div>

                    {isSendingNotif ? (
                      <div className="flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Đang tải lên ảnh camera & gửi tin nhắn nhắc phụ huynh...</span>
                      </div>
                    ) : notifDetails?.success ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle size={14} className="shrink-0 text-emerald-500" />
                          <span>Đã gửi thành công kèm ảnh chụp camera thực tế!</span>
                        </div>
                        <div className="flex gap-2.5 items-start mt-1">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            <img src={notifDetails.photo} className="w-full h-full object-cover" alt="Captured" />
                          </div>
                          <div className="flex-1 text-[10px] text-slate-400 leading-normal bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-2 rounded-xl">
                            <span className="font-semibold block mb-0.5 text-slate-500">Nội dung SMS:</span>
                            <span>"Bé {notifDetails.studentName} đã điểm danh vào lớp lúc {notifDetails.time} [Đính kèm ảnh camera]"</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              )}

              {scanState === 'duplicate' && lastScannedStudent && (
                <motion.div
                  key="duplicate"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-amber-500 shadow-md shrink-0">
                      <img
                        src={lastScannedStudent.avatar}
                        alt={lastScannedStudent.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-950 dark:text-white leading-tight">
                        {lastScannedStudent.fullName}
                      </h4>
                      <p className="text-xs font-semibold text-slate-400">Mã: {lastScannedStudent.studentCode}</p>
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-extrabold uppercase">
                        Đã điểm danh hôm nay
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold">
                    <span>CẢNH BÁO: TRÙNG LẶP HỒ SƠ</span>
                    <span>KHÔNG GHI NHẬN LẠI</span>
                  </div>
                </motion.div>
              )}

              {scanState === 'unknown' && (
                <motion.div
                  key="unknown"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3.5 text-center py-6 flex flex-col items-center"
                >
                  <div className="p-3 bg-rose-500/15 rounded-full text-rose-500 mb-1">
                    <XCircle size={28} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Không thể xác định khuôn mặt</h4>
                    <p className="text-xs text-slate-400 max-w-xs leading-normal">
                      Hồ sơ sinh trắc của người này không trùng khớp với bất kỳ học sinh nào đã đăng ký trong hệ thống (Độ khớp: {similarityScore}%).
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Simulator Controller - ONLY visible when active or generally to test */}
          <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-1.5 mb-4">
              <MonitorPlay size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold tracking-tight">Hộp Công Cụ Thử Nghiệm Mô Phỏng</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4 font-light">
              Dành cho Người kiểm thử: Vì bạn đang chạy hệ thống một mình, hãy chọn bất kỳ học sinh nào bên dưới để mô phỏng việc họ đi qua Camera điểm danh.
            </p>

            <div className="space-y-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div>
                <label className="block mb-1.5 ml-0.5 text-slate-400">Chọn học sinh muốn giả lập</label>
                <select
                  id="sim-student-select"
                  value={selectedSimStudentId}
                  onChange={(e) => setSelectedSimStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none"
                  disabled={students.length === 0}
                >
                  <option value="">-- Chọn một học sinh từ danh sách --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.className || 'Chưa xếp lớp'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={triggerSimulatedCheckIn}
                  disabled={!isActive || !selectedSimStudentId}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition shadow-lg"
                >
                  <UserCheck size={14} />
                  <span>Mô phỏng quét</span>
                </button>
                
                <button
                  type="button"
                  onClick={triggerSimulatedUnknown}
                  disabled={!isActive}
                  className="py-2.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20 disabled:cursor-not-allowed text-rose-300 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Mô phỏng người lạ
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-1.5 p-2.5 bg-white/5 rounded-xl text-[10px] text-slate-400 leading-relaxed font-light">
              <HelpCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Lưu ý: Bạn phải nhấn nút <strong>"Bắt đầu điểm danh"</strong> phía trên để mở Camera và kích hoạt bảng mô phỏng thử nghiệm này.
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* CLASS STUDENTS QR CODE DIRECTORY MODAL */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsQRModalOpen(false)} />
          
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100 flex flex-col max-h-[85vh]">
            <button 
              onClick={() => setIsQRModalOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer z-10 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full shadow-3xs"
            >
              <X size={16} />
            </button>

            {/* Header banner */}
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-6 text-white space-y-1 relative shrink-0">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-widest uppercase font-extrabold opacity-75">Thư Viện QR Code Lớp Học</p>
                  <h3 className="text-xl font-extrabold flex items-center gap-2">
                    Danh Sách Thẻ Định Danh Bé Ngoan <Sparkles size={18} className="text-yellow-400" />
                  </h3>
                  <p className="text-xs opacity-90 mt-1 font-medium">Danh sách QR định danh đồng bộ thời gian thực cho giáo viên.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const badgesHTML = students.map(s => `
                        <div class="card">
                          <div class="header">
                            <p>Thẻ Điểm Danh Mầm Non</p>
                            <h3>${settings.schoolName || 'TRƯỜNG MẦM NON 3'}</h3>
                          </div>
                          <div class="content">
                            <img class="avatar" src="${s.avatar}" />
                            <div>
                              <p class="name">${s.fullName}</p>
                              <p class="code">Mã HS: ${s.studentCode}</p>
                              <span class="class-badge">Lớp: ${s.className || 'Chưa xếp lớp'}</span>
                            </div>
                            <div class="qr-container">
                              <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('MN3_QR_' + s.studentCode)}" />
                              <div class="qr-text">MN3_QR_${s.studentCode}</div>
                            </div>
                          </div>
                        </div>
                      `).join('');

                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>In Thẻ QR Điểm Danh Cả Lớp</title>
                            <style>
                              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                              body {
                                font-family: 'Inter', sans-serif;
                                margin: 20px;
                                background: #fff;
                              }
                              .badges-grid {
                                display: grid;
                                grid-template-columns: repeat(3, 1fr);
                                gap: 20px;
                              }
                              .card {
                                border: 1px solid #e2e8f0;
                                border-radius: 16px;
                                overflow: hidden;
                                background: white;
                                text-align: center;
                                page-break-inside: avoid;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                              }
                              .header {
                                background: linear-gradient(135deg, #7c3aed, #6366f1);
                                color: white;
                                padding: 12px;
                              }
                              .header p { margin: 0; font-size: 8px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.8; }
                              .header h3 { margin: 3px 0 0; font-size: 12px; font-weight: 900; }
                              .content { padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
                              .avatar { width: 55px; height: 55px; border-radius: 10px; object-fit: cover; border: 1.5px solid #ddd; }
                              .name { font-size: 13px; font-weight: 900; color: #0f172a; margin: 0; }
                              .code { font-size: 10px; font-weight: bold; color: #64748b; margin: 1px 0 0; }
                              .class-badge { background: #f5f3ff; color: #7c3aed; padding: 2px 8px; border-radius: 100px; font-size: 8px; font-weight: 900; text-transform: uppercase; display: inline-block; }
                              .qr-container { padding: 6px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; margin-top: 4px; }
                              .qr-code { width: 90px; height: 90px; }
                              .qr-text { font-size: 8px; font-family: monospace; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-top: 4px; }
                              @media print {
                                body { margin: 0; }
                                .badges-grid { gap: 15px; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="badges-grid">
                              \${badgesHTML}
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
                  className="px-4 py-2 bg-white text-violet-700 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer border border-transparent transition shrink-0"
                >
                  <Printer size={15} />
                  <span>In Thẻ Cả Lớp 🖨️</span>
                </button>
              </div>
            </div>

            {/* Badges Grid View */}
            <div className="p-6 overflow-y-auto flex-1">
              {students.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <QrCode size={48} className="mx-auto stroke-1 text-slate-300" />
                  <p className="text-sm font-semibold">Chưa có dữ liệu học sinh</p>
                  <p className="text-xs">Hãy thêm học sinh trước để hệ thống tạo mã QR tự động.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {students.map((s) => (
                    <div 
                      key={s.id} 
                      className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900 flex flex-col text-center justify-between"
                    >
                      <div className="p-4 flex flex-col items-center space-y-2.5">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <img src={s.avatar} alt={s.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1">{s.fullName}</h4>
                          <span className="inline-block px-2 py-0.5 mt-1 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 text-[8.5px] font-extrabold uppercase rounded-full">
                            Mã: {s.studentCode}
                          </span>
                        </div>

                        {/* Interactive Scan QR preview */}
                        <div 
                          onClick={() => {
                            setSelectedSimStudentId(s.id);
                            setIsQRModalOpen(false);
                          }}
                          className="bg-white p-2 rounded-lg border border-slate-200/60 shadow-3xs cursor-pointer hover:border-violet-400 hover:scale-105 transition"
                          title="Click để nạp nhanh vào simulator"
                        >
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=\${encodeURIComponent('MN3_QR_' + s.studentCode)}`}
                            alt="QR Code"
                            className="w-20 h-20 object-contain"
                          />
                        </div>
                      </div>

                      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-850/40 border-t border-slate-150 dark:border-slate-800 flex gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedSimStudentId(s.id);
                            setIsQRModalOpen(false);
                          }}
                          className="flex-1 py-1.5 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-lg text-[9px] uppercase transition cursor-pointer"
                        >
                          Nạp Thử Nghiệm
                        </button>
                        <button
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>In Thẻ QR Học Sinh - \${s.fullName}</title>
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
                                        width: 280px;
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
                                        padding: 16px;
                                      }
                                      .header p { margin: 0; font-size: 9px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; opacity: 0.8; }
                                      .header h3 { margin: 4px 0 0; font-size: 14px; font-weight: 900; }
                                      .content { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
                                      .avatar { width: 70px; height: 70px; border-radius: 12px; object-fit: cover; border: 1.5px solid #ddd; }
                                      .name { font-size: 16px; font-weight: 900; color: #0f172a; margin: 0; }
                                      .code { font-size: 11px; font-weight: bold; color: #64748b; margin: 2px 0 0; }
                                      .class-badge { background: #f5f3ff; color: #7c3aed; padding: 3px 10px; border-radius: 100px; font-size: 9px; font-weight: 900; text-transform: uppercase; display: inline-block; }
                                      .qr-container { padding: 8px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; margin-top: 6px; }
                                      .qr-code { width: 120px; height: 120px; }
                                      .qr-text { font-size: 9px; font-family: monospace; font-weight: bold; color: #94a3b8; letter-spacing: 2px; margin-top: 6px; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="card">
                                      <div class="header">
                                        <p>Thẻ Điểm Danh Mầm Non</p>
                                        <h3>\${settings.schoolName || 'TRƯỜNG MẦM NON 3'}</h3>
                                      </div>
                                      <div class="content">
                                        <img class="avatar" src="\${s.avatar}" />
                                        <div>
                                          <p class="name">\${s.fullName}</p>
                                          <p class="code">Mã HS: \${s.studentCode}</p>
                                          <span class="class-badge">Lớp: \${s.className || 'Chưa xếp lớp'}</span>
                                        </div>
                                        <div class="qr-container">
                                          <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=\${encodeURIComponent('MN3_QR_' + s.studentCode)}" />
                                          <div class="qr-text">MN3_QR_\${s.studentCode}</div>
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
                          className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg text-[9px] font-bold transition cursor-pointer flex items-center justify-center"
                          title="In mã QR của riêng bé"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer options */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/25 border-t border-slate-150 dark:border-slate-850 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsQRModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase transition hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
              >
                Đóng Thư Viện
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
