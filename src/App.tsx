/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, Component, ReactNode } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc, 
  setDoc,
  serverTimestamp,
  getDocs,
  getDocFromServer,
  getDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreErrorGlobal(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Global Firestore Error: ', JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  const path = 'test/connection';
  try {
    await getDocFromServer(doc(db, path));
    console.log('Firestore connection successful');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
    // We don't throw here to avoid crashing the app on initial test if offline
  }
}
testConnection();
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import Webcam from 'react-webcam';
import { format } from 'date-fns';
import { 
  Users, 
  UserCheck, 
  Camera, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  LogOut,
  CheckCircle2, 
  XCircle, 
  Loader2,
  Calendar,
  Search,
  RotateCcw,
  AlertCircle,
  Clock,
  Download,
  TrendingUp,
  AlertTriangle,
  UserX
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

// --- Types ---
interface Student {
  id: string;
  name: string;
  class: string;
  photoUrl: string; // base64
}

interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  studentClass?: string;
  date: string; // YYYY-MM-DD
  timestamp: any;
  status: 'active' | 'reset';
  isLate?: boolean;
}

// --- Gemini Setup ---
// Initialized inside handleCheckIn per guidelines

// --- Constants & Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'attendance' | 'admin' | 'public'>('attendance');
  const [adminTab, setAdminTab] = useState<'students' | 'stats' | 'settings'>('students');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  
  // Public Search State
  const [publicSearchClass, setPublicSearchClass] = useState('');
  const [publicSearchName, setPublicSearchName] = useState('');
  const [publicSearchDate, setPublicSearchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [publicSearchResults, setPublicSearchResults] = useState<Attendance[]>([]);
  const [isSearchingPublic, setIsSearchingPublic] = useState(false);
  const [hasSearchedPublic, setHasSearchedPublic] = useState(false);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<Attendance[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'reset' | 'delete_all' | 'delete_student', message: string, id?: string } | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const handleFirestoreError = useCallback((error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    }
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setFatalError(`Lỗi hệ thống (${operationType} ${path || ''}): ${errInfo.error}`);
  }, []);
  
  // Admin State
  const [lateThreshold, setLateThreshold] = useState('07:30');
  const [newStudent, setNewStudent] = useState({ name: '', class: '', photoUrl: '' });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');
  const [attendanceClassFilter, setAttendanceClassFilter] = useState<string>('Tất cả');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('Tất cả');
  const [statsStartDate, setStatsStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statsEndDate, setStatsEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isCapturingNewStudent, setIsCapturingNewStudent] = useState(false);
  
  const [allHistory, setAllHistory] = useState<Attendance[]>([]);
  
  const webcamRef = useRef<Webcam>(null);
  const adminWebcamRef = useRef<Webcam>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  // --- Auth Listener & URL Params ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'tra-cuu') {
      setView('public');
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setStatus({ type: 'success', message: 'Đăng nhập thành công' });
    } catch (error) {
      console.error('Login Error:', error);
      setStatus({ type: 'error', message: 'Đăng nhập thất bại' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthorized(false);
      setView('attendance');
      setStatus({ type: 'success', message: 'Đã đăng xuất' });
    } catch (error) {
      console.error('Logout Error:', error);
    }
    setTimeout(() => setStatus(null), 3000);
  };

  // --- Real-time Data ---
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const sortStudentsByName = (list: Student[]) => {
      return [...list].sort((a, b) => {
        const partsA = a.name.trim().split(' ');
        const partsB = b.name.trim().split(' ');
        
        const firstNameA = partsA[partsA.length - 1] || '';
        const firstNameB = partsB[partsB.length - 1] || '';
        
        // Compare "Tên" first
        const firstCompare = firstNameA.localeCompare(firstNameB, 'vi', { sensitivity: 'accent' });
        if (firstCompare !== 0) return firstCompare;
        
        // If "Tên" is the same, compare the whole name (Họ và Lót)
        return a.name.localeCompare(b.name, 'vi', { sensitivity: 'accent' });
      });
    };

    const studentsPath = 'students';
    const unsubStudents = onSnapshot(collection(db, studentsPath), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(sortStudentsByName(list));
    }, (error) => {
      // Don't show fatal error for public view if students fail (they are private)
      if (view !== 'public') {
        handleFirestoreError(error, OperationType.LIST, studentsPath);
      }
    });

    const attendancePath = 'attendance';
    const q = query(collection(db, attendancePath), where('date', '==', today));
    const unsubAttendance = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      setAttendanceToday(list);
    }, (error) => {
      if (view !== 'public') {
        handleFirestoreError(error, OperationType.LIST, attendancePath);
      }
    });

    const unsubAllHistory = onSnapshot(collection(db, attendancePath), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      setAllHistory(list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (error) => {
      if (view !== 'public') {
        handleFirestoreError(error, OperationType.LIST, attendancePath);
      }
    });

    const settingsPath = 'settings/attendance';
    const unsubSettings = onSnapshot(doc(db, 'settings', 'attendance'), (snapshot) => {
      if (snapshot.exists()) {
        setLateThreshold(snapshot.data().lateThreshold || '07:30');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, settingsPath);
    });

    return () => {
      unsubStudents();
      unsubAttendance();
      unsubAllHistory();
      unsubSettings();
    };
  }, [today, isAuthReady, user]);

  const handleDeleteHistoryItem = async (id: string) => {
    const path = `attendance/${id}`;
    try {
      await deleteDoc(doc(db, 'attendance', id));
      setStatus({ type: 'success', message: 'Đã xóa bản ghi lịch sử' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleUpdateSettings = async (newThreshold: string) => {
    const path = 'settings/attendance';
    try {
      await setDoc(doc(db, 'settings', 'attendance'), { lateThreshold: newThreshold }, { merge: true });
      setStatus({ type: 'success', message: 'Đã cập nhật cấu hình thời gian' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const HistoryList = () => (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {allHistory.map(record => (
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.01, x: 5 }}
          key={record.id} 
          className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:shadow-lg hover:shadow-slate-100 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-black text-base lg:text-lg shadow-sm group-hover:scale-110 transition-transform">
              {record.studentName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                <p className="font-black text-slate-700 tracking-tight truncate max-w-[150px] sm:max-w-none">{record.studentName}</p>
                {record.status === 'reset' ? (
                  <span className="text-[8px] lg:text-[9px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase border border-amber-100 tracking-wider">Đã Reset</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] lg:text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase border border-emerald-100 tracking-wider">Thành công</span>
                    {record.isLate && (
                      <span className="text-[8px] lg:text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-black uppercase border border-rose-100 tracking-wider flex items-center gap-1">
                        <AlertCircle className="w-2 h-2" /> Trễ
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-3 h-3 text-slate-300" />
                <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.date}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 lg:gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50">
            <div className="text-left sm:text-right">
              <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                <Clock className="w-3 h-3 text-brand-400" />
                <span className="text-slate-600 font-black text-xs lg:text-sm tracking-tight">
                  {record.timestamp?.toDate ? format(record.timestamp.toDate(), 'HH:mm:ss') : '...'}
                </span>
              </div>
              <p className="text-[8px] lg:text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Thời gian ghi</p>
            </div>
            <button 
              onClick={() => handleDeleteHistoryItem(record.id)}
              className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
      {allHistory.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
          <Calendar className="w-16 h-16 opacity-20 mb-4" />
          <p className="font-black text-xs uppercase tracking-[0.2em]">Chưa có dữ liệu lịch sử</p>
        </div>
      )}
    </motion.div>
  );

  // --- Face Recognition Logic ---
  const handleCheckIn = async () => {
    if (!selectedStudent || !webcamRef.current) return;
    
    setIsProcessing(true);
    setStatus({ type: 'info', message: 'Đang nhận diện khuôn mặt...' });

    try {
      // Check if already checked in (only active ones)
      const path = 'attendance';
      const q = query(collection(db, path), 
        where('studentId', '==', selectedStudent.id),
        where('date', '==', today),
        where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setStatus({ type: 'info', message: `${selectedStudent.name} đã điểm danh rồi` });
        setIsProcessing(false);
        setTimeout(() => setStatus(null), 3000);
        return;
      }

      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error('Không thể chụp ảnh từ camera');

      // Prepare images for Gemini
      const referenceImage = selectedStudent.photoUrl.split(',')[1];
      const currentImage = imageSrc.split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [
          {
            parts: [
              { text: "So sánh hai hình ảnh này. Đây có phải là cùng một người không? Trả lời bằng JSON: { 'match': boolean, 'confidence': number (0-1) }. Chỉ trả về JSON." },
              { inlineData: { data: referenceImage, mimeType: "image/jpeg" } },
              { inlineData: { data: currentImage, mimeType: "image/jpeg" } }
            ]
          }
        ],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              match: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER }
            },
            required: ["match", "confidence"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');

      if (result.match && result.confidence > 0.7) {
        // Success
        const now = new Date();
        const [thresholdHours, thresholdMinutes] = lateThreshold.split(':').map(Number);
        const isLate = now.getHours() > thresholdHours || (now.getHours() === thresholdHours && now.getMinutes() > thresholdMinutes);

        await addDoc(collection(db, 'attendance'), {
          studentId: selectedStudent.id,
          studentName: selectedStudent.name.trim(),
          studentClass: selectedStudent.class.trim(),
          date: today,
          timestamp: serverTimestamp(),
          status: 'active',
          isLate
        });
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        setStatus({ type: 'success', message: `Điểm danh thành công: ${selectedStudent.name}` });
        setSelectedStudent(null);
      } else {
        setStatus({ type: 'error', message: 'Không khớp khuôn mặt. Vui lòng thử lại.' });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, 'attendance');
      }
      console.error(error);
      setStatus({ type: 'error', message: 'Lỗi hệ thống. Vui lòng thử lại.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  // --- Admin Logic ---
  const handleCaptureNewStudent = useCallback(() => {
    const imageSrc = adminWebcamRef.current?.getScreenshot();
    if (imageSrc) {
      setNewStudent(prev => ({ ...prev, photoUrl: imageSrc }));
      setIsCapturingNewStudent(false);
    }
  }, [adminWebcamRef]);

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setNewStudent({ name: student.name, class: student.class, photoUrl: student.photoUrl });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setNewStudent({ name: '', class: '', photoUrl: '' });
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.class || !newStudent.photoUrl) return;
    
    setStatus({ type: 'info', message: editingStudent ? 'Đang cập nhật...' : 'Đang thêm học sinh...' });
    
    try {
      const studentData = {
        name: newStudent.name.trim(),
        class: newStudent.class.trim(),
        photoUrl: newStudent.photoUrl
      };

      if (editingStudent) {
        const path = `students/${editingStudent.id}`;
        await updateDoc(doc(db, 'students', editingStudent.id), {
          ...studentData,
          updatedAt: serverTimestamp()
        });
        setStatus({ type: 'success', message: 'Cập nhật học sinh thành công' });
      } else {
        const path = 'students';
        await addDoc(collection(db, 'students'), {
          ...studentData,
          createdAt: serverTimestamp()
        });
        setStatus({ type: 'success', message: 'Thêm học sinh thành công' });
      }
      setNewStudent({ name: '', class: '', photoUrl: '' });
      setEditingStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, editingStudent ? `students/${editingStudent.id}` : 'students');
    }
    
    setTimeout(() => setStatus(null), 3000);
  };

  const handleDeleteStudent = async (id: string) => {
    setStatus({ type: 'info', message: 'Đang xóa học sinh...' });
    const path = `students/${id}`;
    try {
      await deleteDoc(doc(db, 'students', id));
      setStatus({ type: 'success', message: 'Đã xóa học sinh thành công' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    setConfirmAction(null);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleResetToday = async () => {
    setStatus({ type: 'info', message: 'Đang reset trạng thái hôm nay...' });
    const path = 'attendance';
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const q = query(
        collection(db, 'attendance'), 
        where('date', '==', todayStr),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setStatus({ type: 'info', message: 'Không có dữ liệu điểm danh active hôm nay' });
      } else {
        const updatePromises = snapshot.docs.map(d => updateDoc(doc(db, 'attendance', d.id), { status: 'reset' }));
        await Promise.all(updatePromises);
        setStatus({ type: 'success', message: `Đã reset ${snapshot.size} học sinh. Bạn có thể điểm danh lại (Lịch sử vẫn được lưu giữ).` });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    setConfirmAction(null);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleDeleteAllHistory = async () => {
    setStatus({ type: 'info', message: 'Đang xóa toàn bộ lịch sử...' });
    const path = 'attendance';
    try {
      const snapshot = await getDocs(collection(db, 'attendance'));
      if (snapshot.empty) {
        setStatus({ type: 'info', message: 'Lịch sử trống' });
      } else {
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'attendance', d.id)));
        await Promise.all(deletePromises);
        setStatus({ type: 'success', message: `Đã xóa toàn bộ ${snapshot.size} bản ghi lịch sử` });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    setConfirmAction(null);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleExportAll = () => {
    try {
      const exportDate = format(new Date(), 'yyyy-MM-dd_HHmm');
      const wb = utils.book_new();

      // Sheet 1: Attendance for Selected Range
      const selectedRangeData = students.map(student => {
        const attendances = allHistory.filter(a => 
          a.studentId === student.id && 
          a.date >= statsStartDate && 
          a.date <= statsEndDate && 
          a.status === 'active'
        );
        
        return {
          'Họ và tên': student.name,
          'Lớp': student.class,
          'Số buổi có mặt': attendances.length,
          'Số buổi đi trễ': attendances.filter(a => a.isLate).length,
          'Chi tiết ngày': attendances.map(a => `${a.date} (${a.isLate ? 'Trễ' : 'Đúng giờ'})`).join('; ')
        };
      });
      const wsSelected = utils.json_to_sheet(selectedRangeData);
      utils.book_append_sheet(wb, wsSelected, `ThongKe_Tu_${statsStartDate}_Den_${statsEndDate}`);

      // Sheet 2: Full History
      const historyData = allHistory.map(record => {
        const student = students.find(s => s.id === record.studentId);
        return {
          'Họ và tên': student?.name || 'Học sinh đã bị xóa',
          'Lớp': student?.class || '-',
          'Ngày': record.date,
          'Thời gian': record.timestamp ? format(record.timestamp.toDate(), 'HH:mm:ss') : '-',
          'Trạng thái': record.status === 'active' ? 'Có mặt' : 'Đã Reset',
          'Ghi chú': record.isLate ? 'Trễ' : ''
        };
      });
      const wsHistory = utils.json_to_sheet(historyData);
      utils.book_append_sheet(wb, wsHistory, "LichSuDiemDanh");

      // Write File
      writeFile(wb, `BaoCao_DiemDanh_${statsStartDate}_den_${statsEndDate}_Xuat_${exportDate}.xlsx`);
      setStatus({ type: 'success', message: `Đã xuất báo cáo từ ${statsStartDate} đến ${statsEndDate}` });
    } catch (error) {
      console.error('Export All Error:', error);
      setStatus({ type: 'error', message: 'Lỗi xuất file báo cáo' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStudent(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Derived Data ---
  const classes = ['Tất cả', ...Array.from(new Set(students.map(s => s.class))).sort()];
  
  const filteredStudents = selectedClassFilter === 'Tất cả' 
    ? students 
    : students.filter(s => s.class === selectedClassFilter);

  const attendanceForSelectedRange = allHistory.filter(a => a.date >= statsStartDate && a.date <= statsEndDate && a.status === 'active');
  const checkedInIdsForSelectedRange = new Set(attendanceForSelectedRange.map(a => a.studentId));
  
  const filteredCheckedIn = filteredStudents.filter(s => checkedInIdsForSelectedRange.has(s.id));
  const filteredNotCheckedIn = filteredStudents.filter(s => !checkedInIdsForSelectedRange.has(s.id));
  const filteredLateCount = attendanceForSelectedRange.filter(a => a.isLate && filteredStudents.some(s => s.id === a.studentId)).length;

  const checkedInIds = new Set(attendanceToday.filter(a => a.status === 'active').map(a => a.studentId));
  
  const attendanceFilteredStudents = attendanceClassFilter === 'Tất cả'
    ? students
    : students.filter(s => s.class === attendanceClassFilter);

  const notCheckedIn = attendanceFilteredStudents.filter(s => !checkedInIds.has(s.id));
  const checkedIn = attendanceFilteredStudents.filter(s => checkedInIds.has(s.id));

  const classStats = Array.from(new Set(students.map(s => s.class))).sort().map(className => {
    const studentsInClass = students.filter(s => s.class === className);
    const attendanceInClass = attendanceForSelectedRange.filter(a => studentsInClass.some(s => s.id === a.studentId));
    const present = attendanceInClass.length;
    const late = attendanceInClass.filter(a => a.isLate).length;
    const absent = studentsInClass.length - present;
    return { className, total: studentsInClass.length, present, late, absent };
  });

  const handlePublicSearch = async () => {
    if (!publicSearchClass || !publicSearchName) {
      setStatus({ type: 'error', message: 'Vui lòng nhập đầy đủ lớp và tên' });
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    setIsSearchingPublic(true);
    setHasSearchedPublic(true);
    
    try {
      // Normalize search terms
      const searchName = publicSearchName.trim().toLowerCase();
      const searchClass = publicSearchClass.trim().toLowerCase();

      // To avoid composite index requirements and handle case-sensitivity,
      // we fetch by class variations and filter everything else in memory.
      const classVariations = [
        publicSearchClass.trim(),
        publicSearchClass.trim().toUpperCase(),
        publicSearchClass.trim().toLowerCase()
      ];
      const uniqueClasses = Array.from(new Set(classVariations));

      // Fetch records for these class variations
      // Simple 'in' query on a single field usually doesn't require a manual index
      const q = query(
        collection(db, 'attendance'),
        where('studentClass', 'in', uniqueClasses)
      );
      
      const snapshot = await getDocs(q);
      const allResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      
      // Filter by name, status and date case-insensitively in memory
      const filteredResults = allResults.filter(record => {
        const recordName = (record.studentName || '').trim().toLowerCase();
        const recordClass = (record.studentClass || '').trim().toLowerCase();
        const recordStatus = record.status;
        const recordDate = record.date;
        
        const nameMatch = recordName === searchName;
        const classMatch = recordClass === searchClass;
        const statusMatch = recordStatus === 'active';
        const dateMatch = !publicSearchDate || recordDate === publicSearchDate;
        
        return nameMatch && classMatch && statusMatch && dateMatch;
      });
      
      setPublicSearchResults(filteredResults.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    } catch (error) {
      console.error('Public Search Error:', error);
      setStatus({ type: 'error', message: 'Lỗi khi tìm kiếm dữ liệu' });
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setIsSearchingPublic(false);
    }
  };

  // --- Renderers ---
  if (fatalError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Rất tiếc!</h2>
          <p className="text-slate-600 mb-8 font-medium leading-relaxed">{fatalError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Modern Header */}
      <header className="glass sticky top-0 z-50 px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 lg:gap-3 group cursor-pointer">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-brand-600 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-brand-200 group-hover:scale-110 transition-transform duration-300">
            <Camera className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm lg:text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">THCS Tân Thanh</h1>
            <p className="text-[8px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Hệ thống điểm danh</p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-sm font-extrabold tracking-tight text-brand-600">Tân Thanh</h1>
          </div>
        </div>
        
        <nav className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
          {!user ? (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogin}
              className="px-3 lg:px-6 py-2 lg:py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 text-xs lg:text-sm bg-white text-brand-600 shadow-sm font-bold"
            >
              <UserCheck className="w-4 h-4" /> <span>Đăng nhập</span>
            </motion.button>
          ) : (
            <>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView('attendance')}
                className={`px-3 lg:px-6 py-2 lg:py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 text-xs lg:text-sm ${view === 'attendance' ? 'bg-white text-brand-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}`}
              >
                <Users className="w-4 h-4" /> <span className="hidden xs:inline">Điểm danh</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isAuthorized) {
                    setView('admin');
                  } else {
                    setShowPasswordPrompt(true);
                  }
                }}
                className={`px-3 lg:px-6 py-2 lg:py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 text-xs lg:text-sm ${view === 'admin' ? 'bg-white text-brand-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}`}
              >
                <Settings className="w-4 h-4" /> <span className="hidden xs:inline">Quản lý</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView('public')}
                className={`px-3 lg:px-6 py-2 lg:py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 text-xs lg:text-sm ${view === 'public' ? 'bg-white text-brand-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}`}
              >
                <Search className="w-4 h-4" /> <span className="hidden xs:inline">Tra cứu</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?mode=tra-cuu`);
                  setStatus({ type: 'success', message: 'Đã sao chép link tra cứu' });
                  setTimeout(() => setStatus(null), 3000);
                }}
                className="px-3 lg:px-6 py-2 lg:py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 text-xs lg:text-sm text-brand-600 hover:bg-brand-50"
                title="Sao chép link tra cứu công khai"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="px-3 lg:px-6 py-2 lg:py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 text-xs lg:text-sm text-slate-500 hover:text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" /> <span className="hidden xs:inline">Thoát</span>
              </motion.button>
            </>
          )}
        </nav>
      </header>

      {/* Password Prompt Modal */}
      <AnimatePresence>
        {showPasswordPrompt && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-white/20"
            >
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Settings className="w-8 h-8 text-brand-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-center mb-2 tracking-tight">Khu vực quản lý</h3>
              <p className="text-slate-500 text-center mb-8 text-sm">Vui lòng nhập mật khẩu để tiếp tục</p>
              
              <div className="space-y-4">
                <input 
                  type="password" 
                  autoFocus
                  placeholder="••••••••"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-center text-xl tracking-widest font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if ((e.target as HTMLInputElement).value === '1') {
                        setIsAuthorized(true);
                        setView('admin');
                        setShowPasswordPrompt(false);
                      } else {
                        setStatus({ type: 'error', message: 'Sai mật khẩu truy cập' });
                      }
                    }
                  }}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowPasswordPrompt(false)}
                    className="flex-1 px-6 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-bold transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={() => {
                      const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                      if (input.value === '1') {
                        setIsAuthorized(true);
                        setView('admin');
                        setShowPasswordPrompt(false);
                      } else {
                        setStatus({ type: 'error', message: 'Sai mật khẩu truy cập' });
                      }
                    }}
                    className="flex-1 px-6 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95"
                  >
                    Vào
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Status Toast */}
      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-4 z-[200] backdrop-blur-xl border overflow-hidden ${
              status.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 
              status.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400/50' : 'bg-white/90 text-slate-900 border-white/20'
            }`}
          >
            <div className="shimmer absolute inset-0 opacity-20" />
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center relative z-10">
              {status.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {status.type === 'error' && <XCircle className="w-5 h-5" />}
              {status.type === 'info' && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
            <span className="font-bold tracking-tight relative z-10">{status.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[210] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] lg:rounded-[3rem] p-6 lg:p-10 max-w-md w-full shadow-2xl border border-white/20 relative overflow-hidden"
            >
              <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-rose-50 rounded-2xl lg:rounded-3xl flex items-center justify-center mb-6 lg:mb-8 mx-auto rotate-3">
                  <AlertCircle className="w-8 h-8 lg:w-10 lg:h-10 text-rose-500" />
                </div>
                <h3 className="text-xl lg:text-2xl font-black text-center mb-2 lg:mb-3 tracking-tight">Xác nhận xóa?</h3>
                <p className="text-sm lg:text-base text-slate-500 text-center mb-8 lg:mb-10 leading-relaxed">{confirmAction.message}</p>
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                  <button 
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 px-6 py-3 lg:py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-sm lg:text-base"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={() => {
                      if (confirmAction.type === 'reset') handleResetToday();
                      else if (confirmAction.type === 'delete_all') handleDeleteAllHistory();
                      else if (confirmAction.type === 'delete_student' && confirmAction.id) handleDeleteStudent(confirmAction.id);
                      setConfirmAction(null);
                    }}
                    className="flex-1 px-6 py-3 lg:py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-rose-200 active:scale-95 text-sm lg:text-base"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="p-8 max-w-[1600px] mx-auto">
        <AnimatePresence mode="wait">
          {view === 'public' && (
            <motion.div 
              key="public"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4 mb-12">
                <div className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-brand-200 mb-6 rotate-3">
                  <Search className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl lg:text-5xl font-black text-slate-800 tracking-tight">Tra cứu điểm danh</h2>
                <p className="text-slate-500 font-medium text-lg">Trường THCS Tân Thanh - Hệ thống thông tin học sinh</p>
              </div>

              <div className="bg-white p-8 lg:p-12 rounded-[3rem] border border-slate-200 shadow-xl neo-shadow">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lớp của học sinh</label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: 9A1"
                      value={publicSearchClass}
                      onChange={(e) => setPublicSearchClass(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên đầy đủ</label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={publicSearchName}
                      onChange={(e) => setPublicSearchName(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày tra cứu</label>
                    <input 
                      type="date" 
                      value={publicSearchDate}
                      onChange={(e) => setPublicSearchDate(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-lg"
                    />
                  </div>
                </div>

                <button 
                  onClick={handlePublicSearch}
                  disabled={isSearchingPublic}
                  className="w-full py-5 bg-brand-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-brand-700 transition-all shadow-2xl shadow-brand-200 active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isSearchingPublic ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                  <span>TÌM KIẾM NGAY</span>
                </button>
              </div>

              <AnimatePresence>
                {hasSearchedPublic && !isSearchingPublic && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between px-4">
                      <h3 className="font-black text-xl text-slate-800 tracking-tight">Kết quả tra cứu</h3>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tìm thấy {publicSearchResults.length} bản ghi</span>
                    </div>

                    {publicSearchResults.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {publicSearchResults.map((record, idx) => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            key={record.id}
                            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                <Calendar className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-black text-slate-700 tracking-tight">{record.date}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {record.timestamp?.toDate ? format(record.timestamp.toDate(), 'HH:mm:ss') : '...'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Có mặt</span>
                              {record.isLate && (
                                <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Đi trễ</span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white p-12 lg:p-20 rounded-[3rem] border border-slate-200 text-center space-y-6 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto border border-slate-100 shadow-inner">
                          <UserX className="w-10 h-10 text-slate-300" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black text-slate-800 tracking-tight">Không tìm thấy dữ liệu</h4>
                          <p className="text-slate-500 font-medium max-w-xs mx-auto">Chúng tôi không tìm thấy lịch sử điểm danh nào khớp với thông tin bạn đã nhập.</p>
                        </div>
                        <div className="pt-4 flex flex-col items-center gap-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lưu ý tra cứu:</p>
                          <ul className="text-xs text-slate-400 font-bold space-y-1">
                            <li>• Nhập chính xác Họ và tên (có dấu)</li>
                            <li>• Nhập đúng mã lớp (ví dụ: 9A1)</li>
                            <li>• Kiểm tra lại Ngày tra cứu đã chọn</li>
                            <li>• Chỉ dữ liệu mới từ ngày 08/04 mới có thể tra cứu</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          {view === 'attendance' && (
            <motion.div 
              key="attendance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 lg:h-[calc(100vh-160px)]"
            >
              {/* Left: Not Checked In */}
              <div className="lg:col-span-3 h-[500px] lg:h-full glass rounded-[2.5rem] flex flex-col overflow-hidden neo-shadow order-2 lg:order-1">
                  <div className="p-6 border-b border-slate-100/50 flex flex-col gap-4 bg-white/30">
                    <div className="flex items-center justify-between">
                      <h2 className="font-extrabold flex items-center gap-3 text-slate-800">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-slate-500" />
                        </div>
                        Chưa điểm danh
                      </h2>
                      <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-black">{notCheckedIn.length}</span>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {/* Class Filter */}
                      <select 
                        value={attendanceClassFilter}
                        onChange={(e) => setAttendanceClassFilter(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-xs font-bold transition-all"
                      >
                        {classes.map(c => (
                          <option key={c} value={c}>{c === 'Tất cả' ? 'Tất cả các lớp' : `Lớp ${c}`}</option>
                        ))}
                      </select>

                      {/* Search Input */}
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="Tìm tên học sinh..."
                          value={attendanceSearchTerm}
                          onChange={(e) => setAttendanceSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-xs font-bold transition-all"
                        />
                      </div>
                    </div>
                  </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    {notCheckedIn
                      .filter(student => student.name.toLowerCase().includes(attendanceSearchTerm.toLowerCase()))
                      .map(student => (
                        <motion.button
                          variants={itemVariants}
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 text-left group ${selectedStudent?.id === student.id ? 'bg-brand-600 text-white shadow-xl shadow-brand-200 scale-[1.02]' : 'hover:bg-white hover:shadow-md'}`}
                        >
                        <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
                          <img src={student.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm leading-tight truncate">{student.name}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${selectedStudent?.id === student.id ? 'text-brand-200' : 'text-slate-400'}`}>{student.class}</p>
                        </div>
                        {selectedStudent?.id === student.id && (
                          <motion.div layoutId="active-indicator" className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                  
                  {notCheckedIn.length > 0 && notCheckedIn.filter(s => s.name.toLowerCase().includes(attendanceSearchTerm.toLowerCase())).length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-xs font-bold text-slate-400">Không tìm thấy học sinh nào</p>
                    </div>
                  )}

                  {notCheckedIn.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">Tất cả đã có mặt!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Center: Camera Section */}
              <div className="lg:col-span-6 flex flex-col gap-6 lg:gap-8 order-1 lg:order-2">
                <div className="flex-1 min-h-[300px] lg:min-h-0 bg-slate-900 rounded-[3rem] overflow-hidden relative shadow-2xl border border-slate-200 group">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: "user" }}
                    mirrored={false}
                    imageSmoothing={true}
                    screenshotQuality={0.7}
                    disablePictureInPicture={true}
                    forceScreenshotSourceSize={false}
                    onUserMedia={() => {}}
                    onUserMediaError={() => {}}
                  />
                  
                  {/* Scanner Effects */}
                  <div className="absolute inset-0 pointer-events-none">
                    <motion.div 
                      animate={{ 
                        top: ["0%", "100%", "0%"],
                        opacity: [0.2, 0.5, 0.2]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                      className="absolute left-0 right-0 h-1 bg-brand-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10"
                    />
                    
                    {/* Corner Borders - Simplified */}
                    <div className="absolute top-8 left-8 w-10 h-10 border-t-2 border-l-2 border-brand-400/50 rounded-tl-xl" />
                    <div className="absolute top-8 right-8 w-10 h-10 border-t-2 border-r-2 border-brand-400/50 rounded-tr-xl" />
                    <div className="absolute bottom-8 left-8 w-10 h-10 border-b-2 border-l-2 border-brand-400/50 rounded-bl-xl" />
                    <div className="absolute bottom-8 right-8 w-10 h-10 border-b-2 border-r-2 border-brand-400/50 rounded-br-xl" />
                  </div>

                  {/* Status Overlay */}
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-brand-900/60 backdrop-blur-md flex items-center justify-center z-20"
                      >
                        <div className="text-center">
                          <motion.div 
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: [0, 180, 360]
                            }}
                            transition={{ 
                              duration: 2, 
                              repeat: Infinity, 
                              ease: "easeInOut" 
                            }}
                            className="w-24 h-24 border-4 border-white/20 border-t-white rounded-full mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.3)]" 
                          />
                          <motion.p 
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-white font-black text-2xl tracking-[0.3em] uppercase"
                          >
                            Đang phân tích...
                          </motion.p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="glass p-6 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6 neo-shadow">
                  <div className="flex items-center gap-5 w-full sm:w-auto">
                    {selectedStudent ? (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white shadow-lg rotate-[-3deg]">
                          <img src={selectedStudent.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-[10px] text-brand-600 uppercase font-black tracking-[0.2em] mb-1">Đang nhận diện</p>
                          <p className="font-black text-2xl text-slate-800 tracking-tight">{selectedStudent.name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 text-slate-400">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200">
                          <Users className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="font-bold italic">Chọn học sinh để bắt đầu</p>
                      </div>
                    )}
                  </div>
                  
                  <motion.button
                    animate={selectedStudent && !isProcessing ? {
                      scale: [1, 1.02, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(59, 130, 246, 0)",
                        "0 0 0 10px rgba(59, 130, 246, 0.1)",
                        "0 0 0 0 rgba(59, 130, 246, 0)"
                      ]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    disabled={!selectedStudent || isProcessing}
                    onClick={handleCheckIn}
                    className={`h-16 w-full sm:w-auto px-10 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all duration-500 relative overflow-hidden group ${
                      !selectedStudent || isProcessing 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-brand-600 text-white hover:bg-brand-700 shadow-2xl shadow-brand-200 active:scale-95'
                    }`}
                  >
                    <div className="shimmer absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                    <span>XÁC NHẬN</span>
                  </motion.button>
                </div>
              </div>

              {/* Right: Checked In */}
              <div className="lg:col-span-3 h-[400px] lg:h-full glass rounded-[2.5rem] flex flex-col overflow-hidden neo-shadow order-3">
                <div className="p-6 border-b border-slate-100/50 bg-white/30 flex items-center justify-between">
                  <h2 className="font-extrabold flex items-center gap-3 text-slate-800">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    Đã có mặt
                  </h2>
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">{checkedIn.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    {checkedIn.map(student => {
                      const record = attendanceToday.find(a => a.studentId === student.id);
                      return (
                        <motion.div 
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          key={student.id} 
                          className="p-4 rounded-2xl flex items-center gap-4 bg-emerald-50/50 border border-emerald-100/50 group hover:bg-emerald-50 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex-shrink-0 border-2 border-emerald-200 shadow-sm">
                            <img src={student.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-emerald-900 truncate">{student.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black text-emerald-600 bg-white px-1.5 py-0.5 rounded shadow-sm">
                                {record?.timestamp?.toDate ? format(record.timestamp.toDate(), 'HH:mm') : 'Vừa xong'}
                              </span>
                            </div>
                          </div>
                          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-8"
            >
              {/* Admin Sub-navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-fit overflow-x-auto custom-scrollbar">
                  <button 
                    onClick={() => setAdminTab('students')}
                    className={`flex-1 sm:flex-none px-4 lg:px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 text-xs lg:text-sm ${adminTab === 'students' ? 'bg-brand-600 text-white font-bold shadow-lg shadow-brand-200' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    <Users className="w-4 h-4" /> Học sinh
                  </button>
                  <button 
                    onClick={() => setAdminTab('stats')}
                    className={`flex-1 sm:flex-none px-4 lg:px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 text-xs lg:text-sm ${adminTab === 'stats' ? 'bg-brand-600 text-white font-bold shadow-lg shadow-brand-200' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    <Calendar className="w-4 h-4" /> Thống kê
                  </button>
                  <button 
                    onClick={() => setAdminTab('settings')}
                    className={`flex-1 sm:flex-none px-4 lg:px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 text-xs lg:text-sm ${adminTab === 'settings' ? 'bg-brand-600 text-white font-bold shadow-lg shadow-brand-200' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    <Settings className="w-4 h-4" /> Cài đặt
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setIsAuthorized(false);
                    setView('attendance');
                    setPassword('');
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
                >
                  <LogOut className="w-4 h-4" /> Thoát Quản lý
                </button>
              </div>

              {adminTab === 'students' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Add Student Form */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm neo-shadow">
                      <h2 className="text-xl font-black mb-8 flex items-center justify-between text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                            {editingStudent ? <Edit2 className="w-5 h-5 text-brand-600" /> : <Plus className="w-5 h-5 text-brand-600" />}
                          </div>
                          {editingStudent ? 'Sửa học sinh' : 'Thêm học sinh'}
                        </div>
                        {editingStudent && (
                          <button 
                            onClick={handleCancelEdit}
                            className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-3 py-1 rounded-lg transition-all"
                          >
                            Hủy sửa
                          </button>
                        )}
                      </h2>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Họ và tên</label>
                          <input 
                            type="text" 
                            value={newStudent.name}
                            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                            placeholder="Nguyễn Văn A"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Lớp</label>
                          <input 
                            type="text" 
                            value={newStudent.class}
                            onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                            placeholder="12A1"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ảnh mẫu</label>
                          <div className="mt-1 border-2 border-slate-200 border-dashed rounded-3xl hover:border-brand-400 transition-all relative overflow-hidden min-h-[240px] flex items-center justify-center bg-slate-50 group">
                            {newStudent.photoUrl ? (
                              <div className="relative w-full h-full flex items-center justify-center p-4">
                                <img src={newStudent.photoUrl} alt="" className="max-h-52 rounded-2xl shadow-xl border-4 border-white" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-3xl transition-opacity backdrop-blur-sm">
                                  <button 
                                    onClick={() => setNewStudent({ ...newStudent, photoUrl: '' })}
                                    className="w-12 h-12 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-xl hover:scale-110 flex items-center justify-center"
                                  >
                                    <Trash2 className="w-6 h-6" />
                                  </button>
                                </div>
                              </div>
                            ) : isCapturingNewStudent ? (
                              <div className="relative w-full h-full">
                                <Webcam
                                  audio={false}
                                  ref={adminWebcamRef}
                                  screenshotFormat="image/jpeg"
                                  className="w-full h-full object-cover rounded-3xl"
                                  screenshotQuality={0.7}
                                  disablePictureInPicture={true}
                                  forceScreenshotSourceSize={false}
                                  imageSmoothing={true}
                                  mirrored={false}
                                  onUserMedia={() => {}}
                                  onUserMediaError={() => {}}
                                />
                                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
                                  <button 
                                    onClick={handleCaptureNewStudent}
                                    className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-xl shadow-brand-200 hover:bg-brand-700 flex items-center gap-2 active:scale-95 transition-all"
                                  >
                                    <Camera className="w-4 h-4" /> Chụp ngay
                                  </button>
                                  <button 
                                    onClick={() => setIsCapturingNewStudent(false)}
                                    className="px-6 py-3 bg-white text-slate-600 rounded-xl font-bold shadow-xl hover:bg-slate-50 transition-all"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6 text-center p-8">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto">
                                  <Camera className="h-8 w-8 text-slate-300" />
                                </div>
                                <div className="flex flex-col gap-3">
                                  <button 
                                    onClick={() => setIsCapturingNewStudent(true)}
                                    className="bg-brand-50 text-brand-600 px-4 py-2 rounded-xl font-bold hover:bg-brand-100 transition-all flex items-center justify-center gap-2"
                                  >
                                    <Camera className="w-4 h-4" /> Chụp từ Camera
                                  </button>
                                  <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-slate-50 px-2 text-slate-400">Hoặc</span></div>
                                  </div>
                                  <label className="cursor-pointer bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 transition-all inline-block">
                                    <span>Tải ảnh lên</span>
                                    <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleImageUpload(e)} />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={handleAddStudent}
                          disabled={!newStudent.name || !newStudent.class || !newStudent.photoUrl}
                          className="w-full py-5 bg-brand-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-xl shadow-brand-100 active:scale-[0.98]"
                        >
                          {editingStudent ? 'CẬP NHẬT THÔNG TIN' : 'LƯU THÔNG TIN'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Student List */}
                  <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm neo-shadow overflow-hidden flex flex-col min-h-[600px]">
                    <div className="p-6 lg:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/50 backdrop-blur-sm">
                      <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">Danh sách học sinh</h2>
                        <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tổng số: {students.length} thành viên</p>
                      </div>
                      <div className="relative group w-full sm:w-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="Tìm kiếm theo tên..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full sm:w-80 pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-bold transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-separate border-spacing-0 min-w-[600px]">
                        <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] z-10">
                          <tr>
                            <th className="px-8 py-5">Thông tin học sinh</th>
                            <th className="px-8 py-5">Lớp</th>
                            <th className="px-8 py-5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((student, idx) => (
                            <motion.tr 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.02 }}
                              key={student.id} 
                              className="group hover:bg-brand-50/30 transition-all duration-300"
                            >
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
                                    <img src={student.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                  <span className="font-bold text-slate-700 group-hover:text-brand-700 transition-colors">{student.name}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-black group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                                  {student.class}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                  <button 
                                    onClick={() => handleEditStudent(student)}
                                    className="p-3 bg-white text-slate-400 hover:text-brand-600 rounded-xl shadow-sm border border-slate-100 hover:border-brand-200 transition-all"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => setConfirmAction({ type: 'delete_student', message: `Xóa học sinh ${student.name}? Thao tác này sẽ xóa toàn bộ dữ liệu liên quan.`, id: student.id })}
                                    className="p-3 bg-white text-slate-400 hover:text-rose-600 rounded-xl shadow-sm border border-slate-100 hover:border-rose-200 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : adminTab === 'stats' ? (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm neo-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
                    <div>
                      <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Thống kê & Lịch sử</h2>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-4 mt-2">
                        <p className="text-[10px] lg:text-sm font-bold text-slate-400 uppercase tracking-widest">Dữ liệu điểm danh thời gian thực</p>
                        <div className="hidden sm:block h-4 w-px bg-slate-200" />
                        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest">Từ:</span>
                            <input 
                              type="date" 
                              value={statsStartDate}
                              onChange={(e) => setStatsStartDate(e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-xs font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest">Đến:</span>
                            <input 
                              type="date" 
                              value={statsEndDate}
                              onChange={(e) => setStatsEndDate(e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-xs font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                      <button 
                        onClick={handleExportAll}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-2xl font-bold text-xs lg:text-sm transition-all border border-emerald-100"
                      >
                        <Download className="w-4 h-4" /> Xuất báo cáo
                      </button>
                      <button 
                        onClick={() => setConfirmAction({ type: 'reset', message: 'Reset điểm danh hôm nay? Bạn sẽ có thể điểm danh lại từ đầu. Dữ liệu cũ vẫn sẽ được lưu trong lịch sử nhưng được đánh dấu là "Đã Reset".' })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-2xl font-bold text-xs lg:text-sm transition-all border border-brand-100"
                      >
                        <RotateCcw className="w-4 h-4" /> Reset
                      </button>
                      <button 
                        onClick={() => setConfirmAction({ type: 'delete_all', message: 'Xóa TOÀN BỘ lịch sử điểm danh? Thao tác này không thể hoàn tác.' })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-2xl font-bold text-xs lg:text-sm transition-all border border-rose-100"
                      >
                        <Trash2 className="w-4 h-4" /> Xóa hết
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mb-12">
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="p-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-[2rem] shadow-xl shadow-brand-100 relative overflow-hidden group"
                    >
                      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                      <p className="text-brand-100 font-black text-xs uppercase tracking-[0.2em] mb-2">Tổng học sinh</p>
                      <p className="text-5xl font-black text-white tracking-tighter">{filteredStudents.length}</p>
                      <Users className="absolute right-8 bottom-8 w-12 h-12 text-white/20 group-hover:rotate-12 transition-transform" />
                    </motion.div>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="p-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] shadow-xl shadow-emerald-100 relative overflow-hidden group"
                    >
                      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-emerald-100 font-black text-xs uppercase tracking-[0.2em]">Đã điểm danh</p>
                        <TrendingUp className="w-3 h-3 text-emerald-200" />
                      </div>
                      <p className="text-5xl font-black text-white tracking-tighter">{filteredCheckedIn.length}</p>
                      <UserCheck className="absolute right-8 bottom-8 w-12 h-12 text-white/20 group-hover:scale-110 transition-transform" />
                    </motion.div>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="p-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] shadow-xl shadow-amber-100 relative overflow-hidden group"
                    >
                      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-amber-100 font-black text-xs uppercase tracking-[0.2em]">Đi trễ</p>
                        <AlertTriangle className="w-3 h-3 text-amber-200" />
                      </div>
                      <p className="text-5xl font-black text-white tracking-tighter">{filteredLateCount}</p>
                      <Clock className="absolute right-8 bottom-8 w-12 h-12 text-white/20 group-hover:animate-pulse" />
                    </motion.div>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="p-8 bg-gradient-to-br from-rose-500 to-rose-600 rounded-[2rem] shadow-xl shadow-rose-100 relative overflow-hidden group"
                    >
                      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-rose-100 font-black text-xs uppercase tracking-[0.2em]">Vắng mặt</p>
                        <UserX className="w-3 h-3 text-rose-200" />
                      </div>
                      <p className="text-5xl font-black text-white tracking-tighter">{filteredNotCheckedIn.length}</p>
                      <Calendar className="absolute right-8 bottom-8 w-12 h-12 text-white/20 group-hover:-rotate-12 transition-transform" />
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 bg-slate-50/50 rounded-[2.5rem] p-6 lg:p-8 border border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <h3 className="font-black text-xl text-slate-800 tracking-tight">Chi tiết theo lớp</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest">Lọc:</span>
                          <select 
                            value={selectedClassFilter}
                            onChange={(e) => setSelectedClassFilter(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 lg:px-4 lg:py-2 text-[10px] lg:text-xs font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                          >
                            {classes.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[500px]">
                          <thead>
                            <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                              <th className="pb-4">Lớp</th>
                              <th className="pb-4 text-center">Tổng số</th>
                              <th className="pb-4 text-center text-emerald-600">Có mặt</th>
                              <th className="pb-4 text-center text-amber-600">Trễ</th>
                              <th className="pb-4 text-center text-rose-600">Vắng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {classStats.filter(s => selectedClassFilter === 'Tất cả' || s.className === selectedClassFilter).map((stat, idx) => (
                              <motion.tr 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={stat.className} 
                                className="group hover:bg-white/50 transition-colors"
                              >
                                <td className="py-4 font-black text-slate-700">{stat.className}</td>
                                <td className="py-4 text-center font-bold text-slate-500">{stat.total}</td>
                                <td className="py-4 text-center">
                                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-xs font-black">
                                    {stat.present}
                                  </span>
                                </td>
                                <td className="py-4 text-center">
                                  <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-xs font-black">
                                    {stat.late}
                                  </span>
                                </td>
                                <td className="py-4 text-center">
                                  <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-xs font-black">
                                    {stat.absent}
                                  </span>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="lg:col-span-4 bg-slate-50/50 rounded-[2.5rem] p-6 lg:p-8 border border-slate-100">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="font-black text-xl text-slate-800 tracking-tight">Nhật ký chi tiết</h3>
                        <div className="flex items-center gap-2 text-[10px] lg:text-xs font-bold text-slate-400">
                          <motion.div 
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-2 h-2 bg-emerald-500 rounded-full" 
                          />
                          Live
                        </div>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-3">
                          {allHistory.filter(r => r.date >= statsStartDate && r.date <= statsEndDate).length > 0 ? (
                            allHistory.filter(r => r.date >= statsStartDate && r.date <= statsEndDate).map(record => (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={record.id} 
                                className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:shadow-lg hover:shadow-slate-100 transition-all duration-300"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-black text-lg shadow-sm group-hover:scale-110 transition-transform">
                                    {record.studentName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-800 tracking-tight">{record.studentName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${record.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {record.status === 'active' ? 'Có mặt' : 'Đã Reset'}
                                      </span>
                                      {record.isLate && record.status === 'active' && (
                                        <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                                          <Clock className="w-2 h-2" /> Trễ
                                        </span>
                                      )}
                                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 ml-2">
                                        <Calendar className="w-2 h-2" /> {record.date}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <Clock className="w-2 h-2" /> {record.timestamp?.toDate ? format(record.timestamp.toDate(), 'HH:mm:ss') : '-'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteHistoryItem(record.id)}
                                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </motion.div>
                            ))
                          ) : (
                            <div className="text-center py-10">
                              <p className="text-sm font-bold text-slate-400">Không có dữ liệu cho ngày này</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3rem] border border-slate-200 shadow-sm neo-shadow">
                  <div className="mb-8 lg:mb-12">
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Cấu hình hệ thống</h2>
                    <p className="text-[10px] lg:text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Điều chỉnh các tham số vận hành của ứng dụng</p>
                  </div>

                  <div className="max-w-5xl space-y-6 lg:space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                      <div className="bg-slate-50 p-6 lg:p-8 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-brand-100 rounded-xl lg:rounded-2xl flex items-center justify-center">
                            <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-brand-600" />
                          </div>
                          <div>
                            <h3 className="font-black text-base lg:text-lg text-slate-800">Thời gian điểm danh</h3>
                            <p className="text-[10px] lg:text-xs font-bold text-slate-400">Sau giờ này học sinh sẽ bị đánh dấu là "Trễ"</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <input 
                            type="time" 
                            value={lateThreshold}
                            onChange={(e) => setLateThreshold(e.target.value)}
                            className="w-full sm:flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-black text-2xl"
                          />
                          <button 
                            onClick={() => handleUpdateSettings(lateThreshold)}
                            className="w-full sm:w-auto px-8 py-4 bg-brand-600 text-white rounded-2xl font-black hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 active:scale-95"
                          >
                            LƯU
                          </button>
                        </div>
                      </div>

                      <div className="bg-brand-50 p-6 lg:p-8 rounded-[2rem] border border-brand-100">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center shadow-sm">
                            <Search className="w-5 h-5 lg:w-6 lg:h-6 text-brand-600" />
                          </div>
                          <div>
                            <h3 className="font-black text-base lg:text-lg text-brand-800">Trang tra cứu công khai</h3>
                            <p className="text-[10px] lg:text-xs font-bold text-brand-400 uppercase tracking-widest">Dành cho phụ huynh & học sinh</p>
                          </div>
                        </div>
                        <p className="text-xs lg:text-sm text-brand-700 mb-6 leading-relaxed font-medium">
                          Chia sẻ đường link này để phụ huynh và học sinh có thể tự tra cứu lịch sử điểm danh.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <input 
                            type="text" 
                            readOnly
                            value={`${window.location.origin}${window.location.pathname}?mode=tra-cuu`}
                            className="w-full px-4 py-3 bg-white border border-brand-200 rounded-xl text-[10px] font-mono text-brand-600 outline-none"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?mode=tra-cuu`);
                              setStatus({ type: 'success', message: 'Đã sao chép đường link' });
                              setTimeout(() => setStatus(null), 3000);
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-brand-600 text-white rounded-xl font-black text-xs shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4 rotate-45" /> SAO CHÉP
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 lg:p-6 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4">
                      <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 flex-shrink-0" />
                      <p className="text-xs lg:text-sm font-bold text-amber-700 leading-relaxed">
                        Lưu ý: Thời gian này sẽ được áp dụng ngay lập tức cho các lượt điểm danh tiếp theo trong ngày. Các lượt điểm danh đã thực hiện trước đó sẽ không bị ảnh hưởng.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-8 text-center border-t border-slate-100 mt-auto">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          © 2026 Bản quyền thuộc Trường THCS Tân Thanh, xã Hưng Nhượng, tỉnh Vĩnh Long
        </p>
      </footer>
    </div>
  );
}
