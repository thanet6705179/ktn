import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// ระบบตรวจจับและสร้าง URL เชื่อมต่อ Backend อัตโนมัติ
const getBackendURL = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:10000';
  }
  // เมื่ออยู่บน Render จะเปลี่ยนคำว่า -frontend ใน URL หน้าเว็บให้กลายเป็น -backend อัตโนมัติ
  return window.location.origin.replace('-frontend', '-backend');
};

const socket = io(getBackendURL());

export default function App() {
  const [role, setRole] = useState(null);

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            🏷️
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">ระบบแข่งขันจัดสรรคูปองส่วนลด</h1>
          <p className="text-slate-500 text-sm mb-8">การแข่งขันแก้ปัญหา Optimization สำหรับห้องเรียน</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => setRole('teacher')} 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-95"
            >
              หน้าจออาจารย์
            </button>
            <button 
              onClick={() => setRole('student')} 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md shadow-emerald-200 active:scale-95"
            >
              หน้าจอนักเรียน
            </button>
          </div>
        </div>
      </div>
    );
  }

  return role === 'teacher' ? <TeacherApp /> : <StudentApp />;
}

// ==========================================
// 1. หน้าจออาจารย์ (Teacher Dashboard)
// ==========================================
function TeacherApp() {
  const [roomId, setRoomId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [optimal, setOptimal] = useState(null);

  useEffect(() => {
    socket.on('roomCreated', id => setRoomId(id));
    socket.on('playerJoined', p => setPlayers(p));
    socket.on('optimalSolution', opt => setOptimal(opt));
    socket.on('updateLeaderboard', board => setLeaderboard(board));

    return () => {
      socket.off('roomCreated'); 
      socket.off('playerJoined');
      socket.off('optimalSolution'); 
      socket.off('updateLeaderboard');
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard อาจารย์</h2>
          <p className="text-slate-500 text-sm">ควบคุมการแข่งขันและดูผลลัพธ์แบบ Real-time</p>
        </div>
        {!roomId ? (
          <button 
            onClick={() => socket.emit('createRoom')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-xl transition shadow-md shadow-indigo-100"
          >
            สร้างห้องแข่งขันใหม่
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-center">
              <span className="text-xs text-indigo-500 block font-medium">รหัสห้อง</span>
              <span className="text-xl font-bold text-indigo-700 tracking-wider">{roomId}</span>
            </div>
            <button 
              onClick={() => socket.emit('startGame', roomId)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-5 rounded-xl transition shadow-md shadow-emerald-100"
            >
              สุ่มโจทย์ & เริ่มแข่งขัน
            </button>
          </div>
        )}
      </header>

      {optimal && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">คำตอบที่ดีที่สุด (Optimal Solution)</h4>
              <p className="text-xs text-amber-700">คำนวณจากระบบอัตโนมัติ</p>
            </div>
          </div>
          <span className="text-2xl font-extrabold text-amber-900">{optimal.minTotal.toLocaleString()} <span className="text-sm font-normal">บาท</span></span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Score Board</h3>
          <span className="text-xs bg-slate-100 text-slate-600 py-1 px-3 rounded-full">ผู้เข้าแข่งขัน {players.length} คน</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs text-center font-medium">
                <th className="py-3 px-4 w-16">อันดับ</th>
                <th className="py-3 px-4 text-left">ผู้เข้าแข่งขัน</th>
                <th className="py-3 px-4 text-right">ราคาสุทธิ</th>
                <th className="py-3 px-4 w-32">เวลาที่ส่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">ยังไม่มีข้อมูลการส่งคำตอบ</td>
                </tr>
              ) : (
                leaderboard.map((sc, i) => (
                  <tr key={i} className={i === 0 ? "bg-emerald-50/50 font-medium" : "hover:bg-slate-50"}>
                    <td className="py-3 px-4 text-center">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{sc.name}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">{sc.total.toLocaleString()} บาท</td>
                    <td className="py-3 px-4 text-center text-xs text-slate-400">{new Date(sc.time).toLocaleTimeString('th-TH')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. หน้าจอนักเรียน (Student Room)
// ==========================================
function StudentApp() {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mapping, setMapping] = useState({});

  useEffect(() => {
    socket.on('joinedSuccess', () => setIsJoined(true));
    socket.on('errorMsg', alert);
    socket.on('gameStarted', data => { 
      setGameState(data); 
      setMapping({}); 
      setIsSubmitted(false);
    });

    return () => {
      socket.off('joinedSuccess'); 
      socket.off('errorMsg'); 
      socket.off('gameStarted');
    };
  }, []);

  const calculateTotal = () => {
    if (!gameState) return 0;
    return gameState.products.reduce((total, p) => {
      const applied = gameState.coupons.filter(c => mapping[c.id] === p.id);
      let curr = p.price;
      
      applied.filter(c => c.type.includes('PERCENT')).forEach(c => {
        if (c.type === 'PERCENT_MIN' && p.price < c.minPrice) return;
        let d = curr * (c.percent / 100);
        if (c.type === 'PERCENT_CAP' && d > c.maxDiscount) d = c.maxDiscount;
        curr -= d;
      });

      applied.filter(c => c.type === 'FIXED').forEach(c => curr -= c.value);
      return total + Math.max(0, curr);
    }, 0);
  };

  const handleAssign = (couponId, productId) => {
    setMapping(prev => ({ ...prev, [couponId]: productId }));
  };

  if (!isJoined) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full">
          <h2 className="text-xl font-bold text-slate-800 mb-1">เข้าสู่ห้องแข่งขัน</h2>
          <p className="text-slate-400 text-xs mb-6">กรอกข้อมูลเพื่อเข้าร่วมห้องของอาจารย์</p>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">รหัสห้องแข่งขัน</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-semibold"
                placeholder="เช่น A7B9K2"
                value={roomId} 
                onChange={e => setRoomId(e.target.value.toUpperCase())} 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">ชื่อผู้แข่งขัน</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="กรอกชื่อของคุณ"
                value={playerName} 
                onChange={e => setPlayerName(e.target.value)} 
              />
            </div>
            <button 
              onClick={() => roomId && playerName ? socket.emit('joinRoom', { roomId, playerName }) : alert('กรอกข้อมูลให้ครบถ้วน')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition shadow-md shadow-emerald-100 mt-2"
            >
              เข้าร่วมห้อง
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
        <h2 className="text-lg font-bold text-slate-700">เข้าสู่ห้องสำเร็จแล้ว</h2>
        <p className="text-slate-400 text-sm">รออาจารย์เริ่มเกมการแข่งขัน...</p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 text-2xl">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">ส่งคำตอบเรียบร้อยแล้ว!</h2>
        <p className="text-slate-500 text-sm">ระบบบันทึกอันดับของคุณขึ้นบน Score Board ของอาจารย์แล้ว</p>
      </div>
    );
  }

  const finalTotal = calculateTotal();

  return (
    <div className="max-w-6xl mx-auto p-6 pb-28">
      <header className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">จัดสรรคูปองส่วนลด</h2>
        <p className="text-xs text-slate-400">เลือกจับคู่คูปองกับสินค้าเพื่อให้ได้ราคารวมน้อยที่สุด</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* กระเป๋าคูปอง */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-700 text-sm border-b pb-2">กระเป๋าคูปอง</h3>
          {gameState.coupons.map(coupon => (
            <div key={coupon.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-xs font-semibold text-indigo-600 block mb-1">{coupon.label}</span>
              <select 
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={mapping[coupon.id] || ""}
                onChange={e => handleAssign(coupon.id, e.target.value)}
              >
                <option value="">-- ไม่ใช้คูปองนี้ --</option>
                {gameState.products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.price}.-)</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* รายการสินค้า */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-700 text-sm border-b pb-2 mb-4">ชั้นวางสินค้า (15 รายการ)</h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {gameState.products.map(p => {
              const applied = gameState.coupons.filter(c => mapping[c.id] === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 block">{p.name}</span>
                    <span className="text-slate-400">ราคาตั้งต้น: {p.price.toLocaleString()} บาท</span>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {applied.length === 0 ? (
                      <span className="text-slate-300">-</span>
                    ) : (
                      applied.map(c => (
                        <span key={c.id} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-medium text-[10px]">
                          {c.label}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* แถบสรุปราคาด้านล่าง */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 block">ราคารวมหลังหักส่วนลด</span>
            <span className="text-2xl font-black text-emerald-600">{finalTotal.toLocaleString()} <span className="text-xs text-slate-500 font-normal">บาท</span></span>
          </div>
          <button 
            onClick={() => {
              socket.emit('submitAnswer', { roomId, finalTotal });
              setIsSubmitted(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-8 rounded-xl transition shadow-lg shadow-emerald-200 active:scale-95"
          >
            ส่งคำตอบ (Submit)
          </button>
        </div>
      </div>
    </div>
  );
}