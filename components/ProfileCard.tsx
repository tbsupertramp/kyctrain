
import React, { useState } from 'react';
import { CustomerProfile } from '../types';

interface ProfileCardProps {
  profile: CustomerProfile | null;
  loading: boolean;
  onUpdateField?: (field: keyof CustomerProfile, value: string | number) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, loading, onUpdateField }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 animate-pulse">
        <div className="h-6 w-1/3 bg-slate-200 rounded mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const handleEdit = (field: keyof CustomerProfile, currentVal: string | number) => {
    setEditingField(field);
    setTempValue(currentVal.toString());
  };

  const handleSave = () => {
    if (editingField && onUpdateField) {
      onUpdateField(editingField as keyof CustomerProfile, tempValue);
    }
    setEditingField(null);
  };

  const incomeOptions = [
    "1-75.000 TL arası",
    "75.000-150.000 TL arası",
    "150.000-300.000 TL arası",
    "300.000-500.000 TL arası",
    "500.000-1.000.000 TL arası"
  ];

  const items = [
    { key: 'fullName', label: 'Ad Soyad', value: profile.fullName, icon: '🆔', editable: false },
    { key: 'city', label: 'Şehir', value: profile.city, icon: '📍', editable: true },
    { key: 'age', label: 'Yaş', value: profile.age, icon: '👤', editable: true },
    { key: 'email', label: 'E-posta', value: profile.email, icon: '📧', editable: true },
    { key: 'profession', label: 'Meslek', value: profile.profession, icon: '💼', editable: true },
    { key: 'incomeSource', label: 'Gelir Kaynağı', value: profile.incomeSource, icon: '💰', editable: true },
    { key: 'monthlyIncome', label: 'Aylık Gelir Beyanı', value: profile.monthlyIncome, icon: '📊', editable: true, type: 'select', options: incomeOptions },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl border border-blue-100 transition-all duration-300">
      <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">📋</span>
          Müşteri Profili
        </h2>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-semibold px-2 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
            Analiz Bekliyor
          </span>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
            profile.difficulty === 'kolay' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
            profile.difficulty === 'orta' ? 'bg-amber-50 text-amber-600 border-amber-100' :
            'bg-rose-50 text-rose-600 border-rose-100'
          }`}>
            Zorluk: {profile.difficulty}
          </span>
        </div>
      </div>
      
      <div className="grid gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 transition-all group">
            <div className="flex items-center gap-3 text-slate-500 shrink-0">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-1 justify-end">
              {editingField === item.key ? (
                <div className="flex items-center gap-2 w-full max-w-[220px]">
                  {item.type === 'select' ? (
                    <select
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="w-full text-right bg-white border border-blue-300 rounded px-2 py-1 text-[11px] font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      autoFocus
                    >
                      {item.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="w-full text-right bg-white border border-blue-300 rounded px-2 py-1 text-sm font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                  )}
                  <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-600 text-lg shrink-0">✓</button>
                  <button onClick={() => setEditingField(null)} className="text-rose-500 hover:text-rose-600 text-lg shrink-0">×</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 cursor-pointer overflow-hidden" onClick={() => item.editable && handleEdit(item.key as keyof CustomerProfile, item.value)}>
                  <span className={`text-slate-900 font-semibold text-right truncate ${item.key === 'fullName' ? 'text-blue-700' : ''}`}>
                    {item.value}
                  </span>
                  {item.editable && (
                    <span className="text-xs opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity shrink-0">✏️</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-blue-50 text-blue-800 text-sm border border-blue-100">
        <p className="font-semibold mb-1 text-[11px] uppercase tracking-wider">KYC Talimatı:</p>
        <p className="text-xs">
          <b>İsim Farkı:</b> Nedenini sorun. <br/>
          <b>Nickname:</b> E-postanın kime ait olduğunu ve erişim yetkisini teyit edin.
        </p>
      </div>
    </div>
  );
};

export default ProfileCard;