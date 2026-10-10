const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ================= ระบบคำนวณส่วนลดและ Auto-solver (Backtracking) =================
function calculateFinalPrice(basePrice, appliedCoupons) {
    let currentPrice = basePrice;
    const percents = appliedCoupons.filter(c => c.type.includes('PERCENT'));
    const fixed = appliedCoupons.filter(c => c.type === 'FIXED');

    // 1. คำนวณส่วนลดร้อยละก่อน
    percents.forEach(c => {
        if (c.type === 'PERCENT_MIN' && basePrice < c.minPrice) return;
        let discount = currentPrice * (c.percent / 100);
        if (c.type === 'PERCENT_CAP' && discount > c.maxDiscount) discount = c.maxDiscount;
        currentPrice -= discount;
    });

    // 2. หักส่วนลดมูลค่าคงที่
    fixed.forEach(c => currentPrice -= c.value);

    // 3. จำกัดราคาขั้นต่ำที่ 0 บาท
    return Math.max(0, currentPrice);
}

function findOptimalSolution(products, coupons) {
    let minTotal = Infinity;
    function backtrack(cIdx, mapping) {
        if (cIdx === coupons.length) {
            let total = 0;
            products.forEach(p => {
                const applied = mapping.map((pId, i) => pId === p.id ? coupons[i] : null).filter(c => c);
                total += calculateFinalPrice(p.price, applied);
            });
            if (total < minTotal) minTotal = total;
            return;
        }
        // ลองไม่ใช้คูปองใบนี้
        mapping.push(null); 
        backtrack(cIdx + 1, mapping); 
        mapping.pop();

        // ลองจับคู่คูปองกับสินค้าแต่ละชิ้น
        for (const p of products) { 
            mapping.push(p.id); 
            backtrack(cIdx + 1, mapping); 
            mapping.pop(); 
        }
    }
    backtrack(0, []);
    return { minTotal };
}

// ================= ระบบจัดการ Socket.io (Real-time Room & Scoreboard) =================
const rooms = {};

io.on('connection', (socket) => {
    // อาจารย์สร้างห้อง
    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = { teacherId: socket.id, players: [], leaderboard: [], gameState: null };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    // นักเรียนเข้าห้อง
    socket.on('joinRoom', ({ roomId, playerName }) => {
        if (rooms[roomId]) {
            socket.join(roomId);
            rooms[roomId].players.push({ socketId: socket.id, name: playerName });
            io.to(rooms[roomId].teacherId).emit('playerJoined', rooms[roomId].players);
            socket.emit('joinedSuccess', roomId);
        } else {
            socket.emit('errorMsg', 'รหัสห้องไม่ถูกต้อง');
        }
    });

    // อาจารย์กดสุ่มโจทย์ / เริ่มเกม
    socket.on('startGame', (roomId) => {
        if (rooms[roomId]) {
            // สุ่มสินค้า 15 รายการ ชนิดและราคาแตกต่างกัน
            const products = Array.from({ length: 15 }, (_, i) => ({ 
                id: `P${i+1}`, 
                name: `สินค้าชนิดที่ ${i+1}`, 
                price: Math.floor(Math.random() * 4500) + 500 
            }));

            // ชุดคูปองส่วนลดเงื่อนไขต่างๆ
            const coupons = [
                { id: 'C1', type: 'PERCENT_CAP', percent: 20, maxDiscount: 500, label: 'ลด 20% สูงสุด 500 บาท' },
                { id: 'C2', type: 'PERCENT_MIN', percent: 15, minPrice: 2000, label: 'ลด 15% (ขั้นต่ำ 2,000 บาท)' },
                { id: 'C3', type: 'FIXED', value: 300, label: 'ลดคงที่ 300 บาท' },
                { id: 'C4', type: 'FIXED', value: 150, label: 'ลดคงที่ 150 บาท' },
                { id: 'C5', type: 'PERCENT_CAP', percent: 10, maxDiscount: 1000, label: 'ลด 10% สูงสุด 1,000 บาท' }
            ];

            rooms[roomId].gameState = { products, coupons };
            rooms[roomId].leaderboard = [];
            
            io.to(roomId).emit('gameStarted', rooms[roomId].gameState);
            socket.emit('optimalSolution', findOptimalSolution(products, coupons));
        }
    });

    // นักเรียนกด Submit ส่งคำตอบ
    socket.on('submitAnswer', ({ roomId, finalTotal }) => {
        if (rooms[roomId]) {
            const player = rooms[roomId].players.find(p => p.socketId === socket.id);
            if (player) {
                rooms[roomId].leaderboard.push({ name: player.name, total: finalTotal, time: Date.now() });
                // จัดอันดับ: ราคาน้อยสุดอยู่อันดับ 1 -> หากเท่ากัน ใครส่งก่อนอยู่อันดับสูงกว่า
                rooms[roomId].leaderboard.sort((a, b) => a.total === b.total ? a.time - b.time : a.total - b.total);
                io.to(rooms[roomId].teacherId).emit('updateLeaderboard', rooms[roomId].leaderboard);
            }
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));