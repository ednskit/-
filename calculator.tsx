import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, User, LogOut, CheckCircle2, 
  AlertCircle, Activity, Wallet, RefreshCcw, Save
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, addDoc, doc, setDoc, getDoc, serverTimestamp 
} from 'firebase/firestore';

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'thai-helps-thai-v3';

// --- Constants (Quota Rules) ---
const MAX_GOV_DAILY = 200;
const MAX_GOV_MONTHLY = 1000;
const MAX_GOV_TOTAL = 4000;
const GOV_RATIO = 0.60;

// --- Helper Functions ---
const formatThaiDate = (date) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('th-TH', options);
};

const formatThaiTime = (date) => {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

// --- Logo Component ---
const Logo = ({ className = "" }) => (
  <div className={`relative flex flex-col items-center justify-center py-4 bg-white px-8 rounded-2xl shadow-sm ${className}`}>
    <div className="relative">
      <div className="absolute -left-6 -top-1 text-red-600 text-6xl font-serif transform -rotate-12 select-none opacity-90">~</div>
      <div className="absolute -left-2 top-8 flex gap-1 transform -rotate-12">
         <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
         <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
         <div className="w-2 h-2 bg-red-600 rounded-full mt-0.5"></div>
      </div>
      <div className="absolute -bottom-3 -left-4 w-[110%] h-2 bg-gradient-to-r from-blue-800 via-red-600 to-transparent transform -rotate-3 rounded-full opacity-80"></div>
      
      <h1 className="text-5xl font-black text-[#1e3a8a] tracking-tighter" style={{ fontFamily: 'sans-serif', transform: 'skewX(-10deg)' }}>
        ไทยช่วยไทย
      </h1>
      
      <div className="absolute -right-8 -top-3 text-green-700 text-2xl font-bold transform rotate-3" style={{ fontFamily: 'sans-serif', transform: 'skewX(-5deg)' }}>
        พลังดี
      </div>
      
      <div className="absolute -bottom-6 -right-4 text-green-700 text-4xl font-black italic tracking-tighter">
        60/40
      </div>
    </div>
  </div>
);

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Authentication & Profile Fetching
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'data');
        try {
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setProfile(profileSnap.data());
          }
        } catch (e) {
          console.error("Profile fetch error", e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Transactions Fetching
  useEffect(() => {
    if (!user || !profile) return;
    
    const txRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    const unsubscribeTx = onSnapshot(
      txRef,
      (snapshot) => {
        const txData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        txData.sort((a, b) => (b.timestamp?.toMillis() || Date.now()) - (a.timestamp?.toMillis() || Date.now()));
        setTransactions(txData);
      },
      (error) => console.error("Firestore error:", error)
    );

    return () => unsubscribeTx();
  }, [user, profile]);

  const handleLogin = async (name, dob) => {
    if (!user) return;
    setLoading(true);
    const newProfile = { name, dob, createdAt: new Date().toISOString() };
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    await setDoc(profileRef, newProfile);
    setProfile(newProfile);
    setLoading(false);
  };

  const handleLogout = () => {
    setProfile(null);
    setActiveTab('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Activity size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  // Show Login/Landing Page
  if (!profile) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Show Main App
  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans text-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500 font-medium">คำนวณสิทธิไทยช่วยไทย</p>
          <h2 className="text-sm font-bold text-blue-800">พร้อมใช้ตัง Prom Chai Tang</h2>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right">
              <p className="text-[10px] text-slate-500">ผู้ใช้งาน</p>
              <p className="text-xs font-bold text-slate-800">{profile.name}</p>
           </div>
           <button onClick={handleLogout} className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100">
             <LogOut size={16} />
           </button>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-grow max-w-md w-full mx-auto p-4">
        {activeTab === 'dashboard' && (
          <Dashboard transactions={transactions} user={user} />
        )}
        {activeTab === 'history' && (
          <History transactions={transactions} />
        )}
        {activeTab === 'profile' && (
          <ProfileView profile={profile} transactions={transactions} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-20">
        <div className="max-w-md mx-auto flex justify-around items-center p-2">
          <NavButton icon={Home} label="หน้าหลัก" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavButton icon={Wallet} label="ประวัติย้อนหลัง" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavButton icon={User} label="บัญชีของฉัน" isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </div>
      </nav>
    </div>
  );
}

// --- Login / Landing Screen ---
function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && dob) {
      onLogin(name.trim(), dob);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e40af] to-[#1e3a8a] flex flex-col px-4 pt-12 pb-6 relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-[-10%] left-[-20%] w-[300px] h-[300px] bg-blue-500 rounded-full blur-[100px] opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[300px] h-[300px] bg-blue-400 rounded-full blur-[100px] opacity-40"></div>
      
      <div className="flex-grow flex flex-col items-center max-w-md w-full mx-auto relative z-10">
        
        {/* Top Pill */}
        <div className="bg-white/20 backdrop-blur-md text-white text-xs font-medium px-4 py-1.5 rounded-full mb-6 border border-white/20">
          โครงการรัฐบาล • มิ.ย. - ก.ย. 2569
        </div>

        <Logo className="mb-6 scale-90" />
        
        <h2 className="text-3xl font-bold text-white mb-1">พร้อมใช้ตัง</h2>
        <p className="text-blue-200 text-sm mb-4">Prom Chai Tang</p>
        
        <p className="text-white text-sm font-medium mb-8">
          รัฐช่วยจ่าย 60% • คุณจ่ายแค่ 40% • สูงสุด 1,000 บาท/เดือน
        </p>

        {/* 3 Quota Cards */}
        <div className="flex gap-2 w-full mb-4">
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center">
             <p className="text-2xl font-bold text-white mb-1">4,000</p>
             <p className="text-[10px] text-blue-200">บาทตลอดโครงการ</p>
          </div>
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center">
             <p className="text-2xl font-bold text-white mb-1">1,000</p>
             <p className="text-[10px] text-blue-200">บาท / เดือน</p>
          </div>
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center">
             <p className="text-2xl font-bold text-white mb-1">200</p>
             <p className="text-[10px] text-blue-200">บาท / วัน (สูงสุด)</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-xs text-blue-100 flex items-center gap-2 mb-8">
           <User size={14} /> มีผู้เข้าใช้งานสะสม 1,284 ครั้ง
        </div>

        {/* Login Form */}
        <div className="w-full bg-white rounded-3xl p-6 shadow-2xl mt-auto">
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">ลงทะเบียนเข้าใช้งาน</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 ml-1">วัน/เดือน/ปีเกิด</label>
              <input 
                type="date" 
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full mt-2 bg-[#1e40af] hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- Dashboard Component ---
function Dashboard({ transactions, user }) {
  const [amountInput, setAmountInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Time & Date calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayStr = now.toLocaleDateString('en-CA');

  // Quota Variables
  let govUsedToday = 0;
  let govUsedMonth = 0;
  let govUsedTotal = 0;

  // Calculate Used Quotas from Transactions
  transactions.forEach(tx => {
     if(!tx.timestamp) return;
     const txDate = new Date(tx.timestamp.toMillis());
     
     govUsedTotal += tx.govShare;
     
     if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
         govUsedMonth += tx.govShare;
     }
     
     if (txDate.toLocaleDateString('en-CA') === todayStr) {
         govUsedToday += tx.govShare;
     }
  });

  // Calculate Remaining Quotas
  const govRemainingToday = Math.max(0, MAX_GOV_DAILY - govUsedToday);
  const govRemainingMonth = Math.max(0, MAX_GOV_MONTHLY - govUsedMonth);
  const govRemainingTotal = Math.max(0, MAX_GOV_TOTAL - govUsedTotal);

  // The actual available quota for this specific transaction is the MINIMUM of all three remaining limits
  const effectiveAvailableGov = Math.min(govRemainingToday, govRemainingMonth, govRemainingTotal);

  // Progress Percentages
  const pctToday = (govUsedToday / MAX_GOV_DAILY) * 100;
  const pctMonth = (govUsedMonth / MAX_GOV_MONTHLY) * 100;
  const pctTotal = (govUsedTotal / MAX_GOV_TOTAL) * 100;

  // Real-time calculation for Calculator
  const price = Number(amountInput) || 0;
  const theoreticalGov = price * GOV_RATIO;
  const actualGov = Math.min(theoreticalGov, effectiveAvailableGov);
  const actualUser = price - actualGov;

  const handleSave = async () => {
    if (price <= 0 || !user || isSaving) return;
    setIsSaving(true);
    
    try {
      const txRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
      await addDoc(txRef, {
        amount: price,
        govShare: actualGov,
        userShare: actualUser,
        timestamp: serverTimestamp(),
      });
      
      setAmountInput('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Save error", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Progress Bars Section */}
      <div className="flex gap-4">
        {/* Daily Progress */}
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium mb-1">สิทธิรัฐวันนี้คงเหลือ</p>
          <p className="text-2xl font-bold text-[#1e40af] mb-1">
            {govRemainingToday.toFixed(0)} <span className="text-sm font-normal text-slate-600">บาท</span>
          </p>
          <p className="text-[10px] text-slate-400 mb-2">จาก {MAX_GOV_DAILY} บาท/วัน</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div className="bg-[#1e40af] h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(pctToday, 100)}%` }}></div>
          </div>
        </div>

        {/* Monthly Progress */}
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium mb-1">สิทธิรัฐเดือนนี้คงเหลือ</p>
          <p className="text-2xl font-bold text-green-700 mb-1">
            {govRemainingMonth.toLocaleString()} <span className="text-sm font-normal text-slate-600">บาท</span>
          </p>
          <p className="text-[10px] text-slate-400 mb-2">จาก {MAX_GOV_MONTHLY.toLocaleString()} บาท/เดือน</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div className="bg-green-600 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(pctMonth, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Total Progress */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <p className="text-xs text-slate-500 font-medium mb-1">สิทธิรัฐคงเหลือทั้งหมด</p>
        <p className="text-2xl font-bold text-orange-600 mb-1">
          {govRemainingTotal.toLocaleString()} <span className="text-sm font-normal text-slate-600">บาท</span>
        </p>
        <p className="text-[10px] text-slate-400 mb-2">จาก {MAX_GOV_TOTAL.toLocaleString()} บาทตลอดโครงการ</p>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(pctTotal, 100)}%` }}></div>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mt-6">
        <label className="block text-sm font-medium text-slate-600 mb-4">
          มูลค่าสินค้าหรือบริการที่จ่ายวันนี้ (บาท)
        </label>
        
        <div className="flex items-end gap-2 border-b-2 border-slate-200 pb-2 mb-6 relative">
          <input
            type="number"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-5xl font-bold text-slate-800 focus:outline-none"
          />
          <span className="text-lg font-medium text-slate-500 mb-2">บาท</span>
        </div>

        {/* Split Calculation */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#f0f4ff] p-3 rounded-xl">
            <p className="text-[11px] font-bold text-[#1e40af] mb-1">รัฐช่วยจ่ายยอดนี้ให้ (60%)</p>
            <p className="text-2xl font-bold text-[#1e40af]">{actualGov > 0 ? actualGov.toFixed(1) : '0'}</p>
          </div>
          <div className="bg-[#f0fdf4] p-3 rounded-xl">
            <p className="text-[11px] font-bold text-green-700 mb-1">เงินที่เราต้องจ่ายเอง (40%)</p>
            <p className="text-2xl font-bold text-green-700">{actualUser > 0 ? actualUser.toFixed(1) : '0'}</p>
          </div>
        </div>

        {/* Warning if capped */}
        {price > 0 && theoreticalGov > effectiveAvailableGov && effectiveAvailableGov > 0 && (
          <div className="mb-4 bg-yellow-50 text-yellow-800 text-xs p-3 rounded-xl border border-yellow-200 flex gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <p>ยอดที่รัฐช่วยจ่ายถูกจำกัดที่ {effectiveAvailableGov.toFixed(2)} บาท เนื่องจากสิทธิรายวัน/รายเดือนของคุณใกล้หมด</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-[#1a56db] rounded-2xl p-4 mb-3 text-center text-white shadow-lg shadow-blue-500/30 flex flex-col items-center justify-center min-h-[100px]">
           <p className="text-xs font-medium opacity-90 mb-1">ยอดเงินที่ต้องกดจ่ายผ่านแอปฯ เป๋าตัง</p>
           <p className="text-3xl font-bold">{actualUser > 0 ? actualUser.toFixed(1) : '0.0'} <span className="text-xl font-normal">บาท</span></p>
        </div>

        <button
          onClick={handleSave}
          disabled={price <= 0 || isSaving}
          className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            price <= 0 
              ? 'bg-slate-100 text-slate-400' 
              : showSuccess 
                ? 'bg-green-500 text-white' 
                : 'bg-slate-800 hover:bg-slate-900 text-white shadow-md'
          }`}
        >
          {isSaving ? (
            <Activity className="animate-spin" size={18} />
          ) : showSuccess ? (
            <><CheckCircle2 size={18} /> บันทึกสำเร็จ!</>
          ) : (
            <><Save size={18} /> บันทึกรายการจ่ายเงินวันนี้</>
          )}
        </button>

        <button 
          onClick={() => setAmountInput('')}
          className="w-full mt-4 py-2 text-sm text-slate-500 font-medium flex items-center justify-center gap-2 hover:text-slate-700"
        >
          <RefreshCcw size={14} /> คำนวณใหม่
        </button>
      </div>
    </div>
  );
}

// --- History Component ---
function History({ transactions }) {
  const groupedTxs = useMemo(() => {
    const groups = {};
    transactions.forEach(tx => {
      if (!tx.timestamp) return;
      const dateObj = new Date(tx.timestamp.toMillis());
      const dateStr = dateObj.toLocaleDateString('en-CA');
      if (!groups[dateStr]) {
        groups[dateStr] = {
          displayDate: formatThaiDate(dateObj),
          items: [],
          totalGov: 0,
          totalUser: 0
        };
      }
      groups[dateStr].items.push(tx);
      groups[dateStr].totalGov += tx.govShare;
      groups[dateStr].totalUser += tx.userShare;
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [transactions]);

  return (
    <div className="space-y-4 pt-2 animate-in fade-in">
      <h2 className="text-xl font-bold text-slate-800 px-2">ประวัติการใช้สิทธิ</h2>
      
      {groupedTxs.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center shadow-sm border border-slate-100 mt-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <Wallet className="text-slate-400" size={24} />
          </div>
          <p className="text-slate-500 font-medium">ยังไม่มีประวัติการใช้งาน</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedTxs.map(([dateKey, group]) => (
            <div key={dateKey} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <span className="font-bold text-sm text-slate-700">{group.displayDate}</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
                  รัฐช่วยรวม {group.totalGov.toFixed(0)} ฿
                </span>
              </div>
              <div className="p-2">
                {group.items.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-bold text-base text-slate-800">ยอดซื้อ {tx.amount.toFixed(0)} ฿</p>
                      <p className="text-[10px] text-slate-400">{formatThaiTime(new Date(tx.timestamp.toMillis()))}</p>
                    </div>
                    <div className="text-right flex gap-3">
                      <div>
                         <p className="text-[10px] text-slate-400 mb-0.5">รัฐจ่าย</p>
                         <p className="text-xs font-bold text-blue-600">+{tx.govShare.toFixed(1)}</p>
                      </div>
                      <div>
                         <p className="text-[10px] text-slate-400 mb-0.5">คุณจ่าย</p>
                         <p className="text-xs font-bold text-green-600">-{tx.userShare.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Profile Component ---
function ProfileView({ profile, transactions }) {
  const totalGovRecv = transactions.reduce((sum, tx) => sum + tx.govShare, 0);
  const totalUserSpent = transactions.reduce((sum, tx) => sum + tx.userShare, 0);

  return (
    <div className="space-y-4 pt-2 animate-in fade-in">
      <h2 className="text-xl font-bold text-slate-800 px-2">บัญชีของฉัน</h2>
      
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mt-4">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 bg-[#1e40af] rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
            {profile.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{profile.name}</h3>
            <p className="text-xs text-slate-500">รหัสผู้ใช้: {profile.dob.replace(/-/g, '')}</p>
          </div>
        </div>

        <div className="space-y-4">
           <div className="flex justify-between items-center">
             <p className="text-sm text-slate-500 font-medium">ยอดรวมรัฐช่วยจ่ายแล้ว</p>
             <p className="font-bold text-lg text-blue-700">{totalGovRecv.toLocaleString()} <span className="text-sm">฿</span></p>
           </div>
           <div className="flex justify-between items-center">
             <p className="text-sm text-slate-500 font-medium">ยอดรวมที่คุณจ่ายเอง</p>
             <p className="font-bold text-lg text-green-700">{totalUserSpent.toLocaleString()} <span className="text-sm">฿</span></p>
           </div>
           <div className="flex justify-between items-center pt-4 border-t border-slate-100">
             <p className="text-sm text-slate-500 font-medium">วันที่ลงทะเบียน</p>
             <p className="font-medium text-sm text-slate-700">{new Date(profile.createdAt).toLocaleDateString('th-TH')}</p>
           </div>
        </div>
      </div>
      
      <div className="text-center pt-6 pb-8">
        <p className="text-[10px] text-slate-400 max-w-[250px] mx-auto">แอปพลิเคชันนี้พัฒนาขึ้นเพื่ออำนวยความสะดวกในการคำนวณสิทธิส่วนบุคคลเท่านั้น</p>
      </div>
    </div>
  );
}

// --- Shared Components ---
function NavButton({ icon: Icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 min-w-[72px] transition-all duration-300 ${isActive ? 'text-[#1e40af]' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <div className={`mb-1 transition-all duration-300 ${isActive ? 'bg-blue-50 p-1.5 rounded-xl' : 'p-1.5'}`}>
         <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );
}