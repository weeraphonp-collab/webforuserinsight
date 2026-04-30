// @ts-nocheck
'use client';
import React, { useState } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function LotteryDashboard() {
  // 1. State สำหรับเก็บข้อมูลแกนหลัก (lineId -> เวลาโปรด)
  const [baseTimeData, setBaseTimeData] = useState({}); 
  const [isBaseUploaded, setIsBaseUploaded] = useState(false);

  // 2. State สำหรับเก็บข้อมูลแกนอื่นๆ ที่จับคู่และนับจำนวนแล้ว
  const [datasets, setDatasets] = useState({});
  const [uploadName, setUploadName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeDimension, setActiveDimension] = useState('');

  // 🔴 ฟังก์ชันที่ 1: อัปโหลดไฟล์ "เวลาโปรด" (Base)
  const handleBaseUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const timeMap = {};
        // สมมติไฟล์ชื่อคอลัมน์คือ lineId และ time
        results.data.forEach(row => {
          const uid = row['lineId'] || row['UID'];
          const time = row['เวลาโปรด'] || row['time'];
          if (uid && time) {
            timeMap[uid] = time;
          }
        });
        setBaseTimeData(timeMap);
        setIsBaseUploaded(true);
        alert(`โหลดแกนเวลาสำเร็จ! พบข้อมูล ${Object.keys(timeMap).length} คน`);
      }
    });
  };

  // 🔵 ฟังก์ชันที่ 2: อัปโหลดไฟล์ "แกนเสริม" และทำการ JOIN สดๆ
  const handleDimensionUpload = () => {
    if (!isBaseUploaded) {
      alert('ต้องอัปโหลด "ไฟล์เวลาโปรด (Base)" ก่อนนะเพื่อน!');
      return;
    }
    if (!selectedFile || !uploadName) {
      alert('กรุณาเลือกไฟล์และตั้งชื่อแกนก่อน!');
      return;
    }

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const rawData = results.data;
        const aggregated = {};
        const categories = new Set();

        rawData.forEach(row => {
          const keys = Object.keys(row);
          // หาคอลัมน์ที่เป็น lineId
          const uidKey = keys.find(k => k.toLowerCase().includes('lineid') || k === 'UID');
          // คอลัมน์ที่เหลือให้ถือว่าเป็น Category (เช่น Segment, set_size)
          const categoryKey = keys.find(k => k !== uidKey);

          const uid = row[uidKey];
          const category = row[categoryKey] || 'ไม่ระบุ';

          // 💡 ทำการ JOIN: เอา UID ไปหาเวลาโปรดจาก Base Data
          const userTime = baseTimeData[uid];

          // ถ้าหาเจอ (แปลว่าคนนี้มีข้อมูลทั้งเวลาและแกนนี้) ให้นับเข้ากลุ่ม
          if (userTime) {
            if (!aggregated[userTime]) aggregated[userTime] = { time: userTime };
            aggregated[userTime][category] = (aggregated[userTime][category] || 0) + 1;
            categories.add(category);
          }
        });

        const chartData = {
          data: Object.values(aggregated).sort((a, b) => a.time.localeCompare(b.time)),
          categories: Array.from(categories)
        };

        setDatasets(prev => ({ ...prev, [uploadName]: chartData }));
        if (!activeDimension) setActiveDimension(uploadName);
        
        setUploadName('');
        setSelectedFile(null);
      }
    });
  };

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#E056FD', '#FF4757'];
  const activeData = datasets[activeDimension];

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">📊 Interactive Behavior Dashboard</h1>

      {/* โซนที่ 1: อัปโหลดแกนเวลา (ตั้งต้น) */}
      <div className="bg-blue-100 p-6 rounded-lg shadow mb-6 border border-blue-200">
        <h2 className="text-lg font-bold text-blue-900 mb-2">1. อัปโหลดแกนหลัก (เวลาโปรด)</h2>
        <p className="text-sm text-blue-700 mb-4">ไฟล์ต้องมีคอลัมน์: <b>lineId</b>, <b>เวลาโปรด</b></p>
        <input 
          type="file" accept=".csv"
          className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          onChange={handleBaseUpload}
        />
        {isBaseUploaded && <p className="text-green-600 font-bold mt-2">✅ โหลดข้อมูลแกนเวลาสำเร็จแล้ว!</p>}
      </div>

      {/* โซนที่ 2: อัปโหลดมิติอื่นๆ (อัปโหลดกี่อันก็ได้) */}
      <div className={`bg-white p-6 rounded-lg shadow mb-8 flex gap-4 items-end transition-opacity ${!isBaseUploaded ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">2. ตั้งชื่อแกนเปรียบเทียบ (เช่น RFM, ขนาดชุด)</label>
          <input 
            type="text" className="w-full border p-2 rounded" placeholder="พิมพ์ชื่อแกน..."
            value={uploadName} onChange={(e) => setUploadName(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">ไฟล์ CSV (ต้องมี: lineId, ค่าของแกน)</label>
          <input 
            type="file" accept=".csv" className="w-full border p-2 rounded" 
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
        </div>
        <button 
          onClick={handleDimensionUpload}
          className="bg-gray-800 text-white px-6 py-2 rounded font-bold hover:bg-gray-900 transition"
        >
          จับคู่ข้อมูล +
        </button>
      </div>

      {/* โซนที่ 3: แดชบอร์ดแสดงผล */}
      {Object.keys(datasets).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">เปรียบเทียบ เวลาโปรด vs :</h2>
            <select 
              className="border-2 border-gray-300 p-2 rounded bg-gray-50 font-bold text-gray-700 focus:outline-none"
              value={activeDimension}
              onChange={(e) => setActiveDimension(e.target.value)}
            >
              {Object.keys(datasets).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeData?.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="time" tick={{fontSize: 12}} />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: '8px', fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {activeData?.categories.map((cat, index) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}