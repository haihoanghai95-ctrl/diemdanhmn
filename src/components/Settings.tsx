/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  Clock,
  Palette,
  Sun,
  Moon,
  School,
  Save,
  RotateCcw,
  Sparkles,
  Check,
  AlertCircle,
  X
} from 'lucide-react';
import { SchoolSettings } from '../types';

interface SettingsProps {
  settings: SchoolSettings;
  onSaveSettings: (settings: SchoolSettings) => void;
}

export default function SettingsComponent({ settings, onSaveSettings }: SettingsProps) {
  // Input states
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [startTime, setStartTime] = useState(settings.startTime);
  const [lateTime, setLateTime] = useState(settings.lateTime);
  const [themeColor, setThemeColor] = useState<SchoolSettings['themeColor']>(settings.themeColor);
  const [darkMode, setDarkMode] = useState(settings.darkMode);
  const [schoolLogo, setSchoolLogo] = useState<string | undefined>(settings.schoolLogo);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Logo file reader handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Dung lượng ảnh logo phải nhỏ hơn 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSchoolLogo(event.target.result as string);
          setSuccessMsg('Đã tải lên logo thành công! Nhấp "Áp dụng cài đặt" để lưu lưu thay đổi.');
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!schoolName.trim()) {
      setErrorMsg('Tên trường không được để trống.');
      return;
    }

    const updatedSettings: SchoolSettings = {
      schoolName: schoolName.trim(),
      startTime,
      lateTime,
      themeColor,
      darkMode,
      schoolLogo,
    };

    onSaveSettings(updatedSettings);
    setSuccessMsg('Đã lưu thành công cấu hình hệ thống và áp dụng giao diện mầm non mới!');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  // Reset to default
  const handleReset = () => {
    setResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    const defaults: SchoolSettings = {
      schoolName: 'TRƯỜNG MẦM NON 3 - PHƯỜNG BÀN CỜ TP.HỒ CHÍ MINH',
      startTime: '07:30',
      lateTime: '07:45',
      themeColor: 'blue',
      darkMode: false,
      schoolLogo: undefined,
    };
    
    setSchoolName(defaults.schoolName);
    setStartTime(defaults.startTime);
    setLateTime(defaults.lateTime);
    setThemeColor(defaults.themeColor);
    setDarkMode(defaults.darkMode);
    setSchoolLogo(undefined);
    
    onSaveSettings(defaults);
    setSuccessMsg('Đã khôi phục cài đặt gốc thành công!');
    setResetConfirmOpen(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Color options - updated to playful child-friendly preschool themes
  const colorOptions: { id: SchoolSettings['themeColor']; name: string; bgClass: string; borderClass: string }[] = [
    { id: 'blue', name: 'Xanh Da Trời (Mầm Non)', bgClass: 'bg-sky-500', borderClass: 'border-sky-400' },
    { id: 'emerald', name: 'Xanh Lá Măng Non', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-400' },
    { id: 'violet', name: 'Tím Bong Bóng Bé Ngoan', bgClass: 'bg-purple-500', borderClass: 'border-purple-400' },
    { id: 'rose', name: 'Hồng Kẹo Ngọt Trẻ Thơ', bgClass: 'bg-pink-500', borderClass: 'border-pink-400' },
    { id: 'amber', name: 'Vàng Mặt Trời Ám Áp', bgClass: 'bg-amber-500', borderClass: 'border-amber-400' },
  ];

  const getThemeTextClass = () => {
    switch (themeColor) {
      case 'emerald': return 'text-emerald-600';
      case 'violet': return 'text-violet-600';
      case 'rose': return 'text-rose-600';
      case 'amber': return 'text-amber-600';
      default: return 'text-indigo-600';
    }
  };

  const getThemeBgClass = () => {
    switch (themeColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-white';
      default: return 'bg-indigo-600 hover:bg-indigo-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Cấu Hình Hệ Thống <Settings className={getThemeTextClass()} size={24} />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tùy biến thời khóa biểu, quản lý tên trường, lựa chọn tông màu phong cách giao diện phù hợp.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2.5 animate-bounce">
          <Check size={18} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2.5">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Card: School profile settings */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-50 dark:border-slate-800 pb-3">
            <School size={16} /> Hồ sơ trường học
          </h3>

          <div className="space-y-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <div>
              <label className="block mb-1.5 ml-0.5">Tên trường học / Đơn vị chủ quản <span className="text-rose-500">*</span></label>
              <input
                id="settings-school-name"
                type="text"
                placeholder="Trường Mầm Non 3"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 ml-0.5 flex items-center gap-1">
                  <Clock size={13} className="text-slate-400" /> Giờ bắt đầu học chính thức
                </label>
                <input
                  id="settings-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 ml-0.5 flex items-center gap-1">
                  <AlertCircle size={13} className="text-amber-500" /> Giờ tính đi muộn (Late threshold)
                </label>
                <input
                  id="settings-late-time"
                  type="time"
                  value={lateTime}
                  onChange={(e) => setLateTime(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-normal text-slate-800 dark:text-slate-100 outline-none"
                  required
                />
              </div>
            </div>

            {/* School Logo upload section */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80">
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Logo trường mầm non
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Logo Preview box */}
                <div className="relative group shrink-0">
                  {schoolLogo ? (
                    <img
                      src={schoolLogo}
                      alt="Logo trường học"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-md bg-slate-50 dark:bg-slate-850"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-400 to-amber-300 dark:from-slate-800 dark:to-slate-700 flex flex-col items-center justify-center text-white font-bold text-3xl shadow-md border border-slate-100 dark:border-slate-800 select-none">
                      🏫
                    </div>
                  )}
                </div>

                {/* Upload and remove buttons */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="px-4 py-2 bg-sky-550 text-white hover:bg-sky-500 dark:bg-sky-650 dark:hover:bg-sky-600 rounded-xl font-bold text-[10px] tracking-wider uppercase cursor-pointer transition text-center inline-block shadow-sm">
                      Tải logo lên
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    {schoolLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          setSchoolLogo(undefined);
                          setSuccessMsg('Đã xóa logo trường thành công. Hãy bấm "Áp dụng cài đặt" để lưu.');
                          setTimeout(() => setSuccessMsg(''), 3000);
                        }}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-[10px] tracking-wider uppercase transition cursor-pointer"
                      >
                        Xóa logo
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] font-normal normal-case text-slate-400 dark:text-slate-500 leading-normal">
                    Chọn ảnh định dạng PNG, JPG hoặc GIF dưới 2MB. Logo này sẽ hiển thị ở thanh điều hướng bên, màn hình đăng nhập và giao diện phụ huynh.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Card: UI Customization color themes */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-50 dark:border-slate-800 pb-3">
              <Palette size={16} /> Giao diện & Chủ đề màu sắc
            </h3>

            {/* Dark mode selector */}
            <div className="space-y-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <label className="block">Chế độ hiển thị</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDarkMode(false)}
                  className={`py-3 rounded-xl border font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    !darkMode
                      ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/20'
                      : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Sun size={15} /> Sáng (Light)
                </button>
                <button
                  type="button"
                  onClick={() => setDarkMode(true)}
                  className={`py-3 rounded-xl border font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    darkMode
                      ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/20'
                      : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Moon size={15} /> Tối (Dark)
                </button>
              </div>
            </div>

            {/* Color circles */}
            <div className="space-y-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <label className="block">Tông màu giao diện chủ đạo</label>
              <div className="flex flex-wrap gap-2.5">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThemeColor(opt.id)}
                    className={`w-9 h-9 rounded-full ${opt.bgClass} flex items-center justify-center text-white cursor-pointer hover:scale-110 active:scale-95 transition-all relative ${
                      themeColor === opt.id ? 'ring-4 ring-slate-300 dark:ring-slate-700 ring-offset-2 dark:ring-offset-slate-900 shadow-md' : 'shadow-xs'
                    }`}
                    title={opt.name}
                  >
                    {themeColor === opt.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2.5 pt-6 border-t border-slate-50 dark:border-slate-800/80">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <RotateCcw size={14} />
              <span>Khôi phục gốc</span>
            </button>
            <button
              id="save-settings-submit"
              type="submit"
              className={`flex-1 py-3 rounded-xl font-bold text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer ${getThemeBgClass()}`}
            >
              <Save size={14} />
              <span>Áp dụng cài đặt</span>
            </button>
          </div>
        </div>

      </form>

      {/* RESET CONFIRMATION DIALOG */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setResetConfirmOpen(false)} />
          
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative z-[110] shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
            <button onClick={() => setResetConfirmOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-amber-500 mb-3">
              <AlertCircle size={24} />
              <h2 className="text-lg font-bold">Khôi phục cài đặt gốc</h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình hệ thống về mặc định ban đầu không? Thao tác này sẽ đặt tên trường về <strong className="text-slate-900 dark:text-white">"Trường MẦM NON 3"</strong> và khôi phục cài đặt thời gian.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
