// @ts-nocheck
'use client';
import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function LotteryDashboard() {
  // State จัดการหน้าต่าง (Tab)
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'dashboard'

  // State เก็บข้อมูลทุกแกนที่อัปโหลดมา รูปแบบ: { "RFM": { uid1: "VIP", uid2: "New" }, "Time": { uid1: "08:00" } }
  const [dimensions, setDimensions] = useState({});
  const [uploadName, setUploadName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // State สำหรับหน้า Dashboard
  const [axisX, setAxisX] = useState('');
  const [axisY, setAxisY] = useState('');

  // 🔴 ฟังก์ชันอัปโหลดไฟล์ (ทำงานแบบ Universal แกนไหนก็รับได้)
  const handleUpload = () => {
    if (!selectedFile || !uploadName) {
      alert('ใส่ชื่อแกนและเลือกไฟล์ก่อนนะเพื่อน!');
      return;
    }

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const rawData = results.data;
        const dataMap = {};

        rawData.forEach(row => {
          const keys = Object.keys(row);
          // หาคอลัมน์ที่เป็น lineId
          const uidKey = keys.find(k => k.toLowerCase().includes('lineid') || k.toLowerCase() === 'uid');
          // คอลัมน์ที่เหลือให้ถือว่าเป็น Value
          const valKey = keys.find(k => k !== uidKey);

          if (uidKey && valKey && row[uidKey] && row[valKey]) {
            dataMap[row[uidKey]] = row[valKey];
          }
        });

        const newDimensions = { ...dimensions, [uploadName]: dataMap };
        setDimensions(newDimensions);
        
        // ถ้าอัปโหลดครบ 2 อันแล้วตั้งค่า Default ให้ Dashboard อัตโนมัติ
        const dimNames = Object.keys(newDimensions);
        if (dimNames.length === 1) setAxisX(dimNames[0]);
        if (dimNames.length === 2) setAxisY(dimNames[1]);

        setUploadName('');
        setSelectedFile(null);
        alert(`อัปโหลดแกน "${uploadName}" สำเร็จ! (พบข้อมูล ${Object.keys(dataMap).length} คน)`);
      }
    });
  };

  // 🔵 ฟังก์ชันคำนวณ Matrix สดๆ เมื่อเลือกแกน X และ Y
  const chartDataObj = useMemo(() => {
    if (!axisX || !axisY || axisX === axisY) return null;

    const dataX = dimensions[axisX];
    const dataY = dimensions[axisY];
    const matrix = {};
    const yCategories = new Set();

    // หา UID ทั้งหมดที่มีในทั้งสองแกน
    const allUids = new Set([...Object.keys(dataX), ...Object.keys(dataY)]);

    allUids.forEach(uid => {
      const valX = dataX[uid];
      const valY = dataY[uid];
      
      // นับเฉพาะคนที่มีข้อมูลทั้ง 2 แกน
      if (valX && valY) {
        if (!matrix[valX]) matrix[valX] = { name: valX };
        matrix[valX][valY] = (matrix[valX][valY] || 0) + 1;
        yCategories.add(valY);
      }
    });

    const categoriesArray = Array.from(yCategories).sort();
    const formattedData = Object.values(matrix).sort((a, b) => a.name.localeCompare(b.name));

    return { data: formattedData, categories: categoriesArray };
  }, [axisX, axisY, dimensions]);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      {/* 🚀 Navigation Bar */}
      <nav className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center px-8">
        <h1 className="text-2xl font-bold tracking-wider">🎯 MICRO-SEGMENT DASHBOARD</h1>
        <div className="flex gap-4">
          <button 
            className={`px-4 py-2 rounded font-bold transition ${activeTab === 'upload' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
            onClick={() => setActiveTab('upload')}
          >
            📂 อัปโหลดข้อมูล
          </button>
          <button 
            className={`px-4 py-2 rounded font-bold transition ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 นำเสนอ (Dashboard)
          </button>
        </div>
      </nav>

      <main className="p-8 max-w-[1600px] mx-auto">
        {/* =========================================
            탭 1: UPLOAD DATA
            ========================================= */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold mb-6 text-gray-800">1. เพิ่มแกนข้อมูลใหม่ (Data Dimensions)</h2>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-600 mb-2">ตั้งชื่อแกน (เช่น กลุ่มอายุ, RFM, เวลาโปรด)</label>
                  <input 
                    type="text" className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none" 
                    placeholder="พิมพ์ชื่อแกน..." value={uploadName} onChange={(e) => setUploadName(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-600 mb-2">เลือกไฟล์ CSV (ต้องมี: lineId, ค่าของแกน)</label>
                  <input 
                    type="file" accept=".csv" className="w-full border-2 border-gray-300 p-2 rounded-lg bg-gray-50" 
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                  />
                </div>
                <button 
                  onClick={handleUpload}
                  className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-600 transition shadow-lg"
                >
                  บันทึกข้อมูล +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {Object.keys(dimensions).map((dim, idx) => (
                <div key={idx} className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-xs text-green-600 font-bold uppercase tracking-wider">แกนที่พร้อมใช้งาน</p>
                    <p className="text-lg font-bold text-gray-800">{dim}</p>
                  </div>
                  <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                    {Object.keys(dimensions[dim]).length.toLocaleString()} UIDs
                  </span>
                </div>
              ))}
              {Object.keys(dimensions).length === 0 && (
                <div className="col-span-4 p-8 text-center border-2 border-dashed border-gray-300 rounded-xl text-gray-500">
                  ยังไม่มีข้อมูลแกนใดๆ กรุณาอัปโหลดไฟล์ด้านบน
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================
            탭 2: PRESENTATION DASHBOARD
            ========================================= */}
        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 min-h-[700px]">
            {/* โซนเลือกแกน */}
            <div className="flex gap-8 items-center bg-slate-50 p-6 rounded-xl border border-gray-200 mb-8">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">แกนหลักแนวนอน (X-Axis)</label>
                <select 
                  className="w-full border-2 border-slate-300 p-3 rounded-lg bg-white font-bold text-lg focus:border-blue-500 outline-none"
                  value={axisX} onChange={(e) => setAxisX(e.target.value)}
                >
                  <option value="" disabled>-- เลือกแกน X --</option>
                  {Object.keys(dimensions).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="text-3xl font-bold text-slate-300 mt-6">VS</div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">แกนเปรียบเทียบ (Y-Axis / สี)</label>
                <select 
                  className="w-full border-2 border-slate-300 p-3 rounded-lg bg-white font-bold text-lg focus:border-blue-500 outline-none"
                  value={axisY} onChange={(e) => setAxisY(e.target.value)}
                >
                  <option value="" disabled>-- เลือกแกน Y --</option>
                  {Object.keys(dimensions).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>

            {/* โซนแสดงผล */}
            {!chartDataObj ? (
              <div className="flex items-center justify-center h-[400px] text-gray-400 font-bold text-xl border-2 border-dashed rounded-xl">
                กรุณาเลือกแกน X และแกน Y ให้แตกต่างกันเพื่อดู Matrix
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {/* กราฟ */}
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataObj.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                      <XAxis dataKey="name" tick={{fontSize: 14, fontWeight: 'bold'}} tickMargin={10} />
                      <YAxis tick={{fontSize: 14}} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 'bold' }} />
                      {chartDataObj.categories.map((cat, index) => (
                        <Bar key={cat} dataKey={cat} stackId="a" fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ตาราง Data Matrix */}
                <div className="overflow-x-auto border rounded-lg shadow-sm">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-slate-900 text-white uppercase font-bold">
                      <tr>
                        <th className="p-4 border-r border-slate-700">{axisX} \ {axisY}</th>
                        {chartDataObj.categories.map(cat => (
                          <th key={cat} className="p-4 text-center">{cat}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chartDataObj.data.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-slate-50 transition">
                          <td className="p-4 font-bold border-r bg-slate-100">{row.name}</td>
                          {chartDataObj.categories.map(cat => (
                            <td key={cat} className="p-4 text-center text-lg font-medium">
                              {row[cat] ? row[cat].toLocaleString() : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}