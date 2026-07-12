/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TalentSubject {
  id: string;
  name: string;
  fee: number;
  schedule?: string;  // Lịch học (ví dụ: "Thứ Hai, Thứ Tư")
  timeSlot?: string;  // Giờ học (ví dụ: "16:30 - 17:30")
  isMandatory?: boolean; // Môn học bắt buộc học
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  studentCount?: number;
  talentFee?: number;     // Tổng học phí năng khiếu
  talentSubjects?: TalentSubject[]; // Danh sách các môn học năng khiếu
  createdBy?: string;    // Số điện thoại giáo viên tạo hoặc 'admin'
  coTeachers?: string[]; // Danh sách số điện thoại đồng giáo viên cùng quản lý lớp
  paymentBank?: string;       // Ngân hàng thanh toán (ví dụ: Vietcombank)
  paymentAccountNo?: string;  // Số tài khoản thanh toán của GV
  paymentAccountName?: string; // Tên chủ tài khoản thanh toán của GV
}

export type Gender = 'Nam' | 'Nữ' | 'Khác';

export interface Student {
  id: string;
  studentCode: string; // Mã học sinh
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  address: string;
  parentPhone: string;
  fatherPhone?: string; // Số điện thoại ba
  motherPhone?: string; // Số điện thoại mẹ
  guardianPhone?: string; // Số điện thoại người nuôi dưỡng
  email: string;
  classId: string; // ID của lớp học
  className?: string; // Tên của lớp học (để hiển thị nhanh)
  avatar?: string; // Data URL của ảnh đại diện
  faceEmbedding?: number[]; // Lưu trữ tọa độ mốc hoặc vector đặc trưng mô phỏng
  faceImage?: string; // Ảnh khuôn mặt đã đăng ký (Data URL)
  talentFee?: number; // Học phí năng khiếu riêng biệt (nếu có)
  otherFee?: number; // Phí khác nếu có trong tháng
  otherFeeDescription?: string; // Mô tả các khoản phí khác
  otherFeesList?: { id: string; name: string; amount: number }[]; // Chi tiết các khoản phí khác
  registeredTalentSubjects?: string[]; // ID các môn học năng khiếu học sinh đăng ký
  talentFeePaid?: boolean; // Trạng thái đóng học phí năng khiếu (true: đã đóng, false/undefined: chưa đóng)
  paymentMethod?: string; // Hình thức thanh toán (Chuyển khoản, Tiền mặt)
  talentFeeDueDate?: string; // Hạn đóng học phí năng khiếu (YYYY-MM-DD)
  quickNotes?: string; // Ghi chú nhanh tình hình bé trong ngày
  talentLastRegisteredMonth?: string; // Tháng cuối đăng ký/cập nhật môn năng khiếu (YYYY-MM)
}

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  status: AttendanceStatus;
  notes?: string;
  photoCaptured?: string; // Ảnh chụp khi điểm danh thực tế
}

export interface SchoolSettings {
  startTime: string; // Giờ bắt đầu học (ví dụ "07:30")
  lateTime: string; // Giờ bắt đầu tính đi muộn (ví dụ "07:45")
  schoolName: string; // Tên trường
  schoolLogo?: string; // Logo trường (Data URL hoặc URL mặc định)
  themeColor: 'blue' | 'emerald' | 'violet' | 'rose' | 'amber';
  darkMode: boolean;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  welcomeTag?: string;
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
}

export interface UserSession {
  isAdmin: boolean;
  isParent?: boolean;
  parentPhone?: string;
  parentName?: string;
  isTeacher?: boolean;
  teacherPhone?: string;
  teacherName?: string;
  email: string;
}

export interface ParentAccount {
  phone: string;
  name: string;
  password?: string;
}

export interface TeacherAccount {
  phone: string;
  name: string;
  password?: string;
  dob?: string;          // Ngày tháng năm sinh (YYYY-MM-DD)
  address?: string;      // Địa chỉ
  hometown?: string;     // Quê quán
  gender?: Gender;       // Giới tính
  cccd?: string;         // Số CCCD
  position?: string;     // Chức vụ
  isPartyMember?: boolean; // Đảng viên (true/false)
}

export interface MenuItem {
  breakfast: string;     // Bữa sáng
  morningSnack?: string; // Bữa phụ sáng
  lunch: string;         // Bữa trưa
  afternoonSnack: string; // Bữa xế
}

export interface WeeklyMenu {
  id: string; // "week_1", "week_2", etc.
  classroomId?: string; // can be for a specific class or general school menu (e.g. "all")
  menu: {
    monday: MenuItem;
    tuesday: MenuItem;
    wednesday: MenuItem;
    thursday: MenuItem;
    friday: MenuItem;
  };
  menuImage?: string; // Data URL of the uploaded menu photo
}

export interface AbsenceReport {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  parentPhone: string;
}

export interface HealthRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className?: string;
  date: string; // YYYY-MM-DD
  height: number; // in cm
  weight: number; // in kg
  bmi?: number;
  status?: string; // 'Dư cân' | 'Béo phì' | 'Suy dinh dưỡng' | 'Bình thường' | 'Trẻ dưới 60 tháng tuổi'
  notes?: string;
}

export interface DailyAssessment {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className?: string;
  date: string; // YYYY-MM-DD
  healthStatus: 'Khỏe mạnh' | 'Mệt mỏi' | 'Sốt' | 'Ho' | 'Bình thường';
  diningStatus: 'Ăn ngoan/hết suất' | 'Ăn một nửa' | 'Ăn ít/biếng ăn' | 'Bình thường';
  sleepStatus: 'Ngủ ngon/đủ giấc' | 'Khó ngủ' | 'Không ngủ' | 'Bình thường';
  activityStatus: 'Năng nổ' | 'Bình thường' | 'Mất tập trung';
  hygieneStatus: 'Bình thường' | 'Táo bón' | 'Tiêu chảy';
  notes: string;
  createdAt: string;
}

export interface TeacherNotification {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  parentPhone: string;
  parentName: string;
  type: 'talent_register' | 'talent_change' | 'absence_request' | 'fee_payment' | 'event_rsvp';
  content: string;
  createdAt: string;
  read?: boolean;
  isRead?: boolean;
  message?: string;
  timestamp?: string;
  month?: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  description: string;
  location: string;
  type: 'meeting' | 'festival' | 'holiday' | 'health' | 'sports';
  note?: string;
}

export interface ClassActivity {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "07:30 - 08:15"
  title: string;
  completed: boolean;
}

export interface ParentNotification {
  id: string;
  classId: string;
  className: string;
  type: 'activity_create' | 'activity_update' | 'activity_delete';
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}




