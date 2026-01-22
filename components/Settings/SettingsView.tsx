
import React, { useState, useEffect } from 'react';
import { 
  Cog6ToothIcon, 
  TableCellsIcon, 
  CloudArrowUpIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  ServerStackIcon,
  PlusIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { GAS_WEB_APP_URL } from '../../constants';
import { initializeDatabase, fetchStorageNodes, addStorageNode } from '../../services/gasService';
import { showXeenapsAlert, XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';
import Swal from 'sweetalert2';

const SettingsView: React.FC = () => {
  const isConfigured = !!GAS_WEB_APP_URL;
  const [isInitializing, setIsInitializing] = useState(false);
  const [nodes, setNodes] = useState<any[]>([]);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);

  const SPREADSHEET_IDS = {
    LIBRARY: '1wPTMx6yrv2iv0lejpNdClmC162aD3iekzSWP5EPNm0I',
    KEYS: '1QRzqKe42ck2HhkA-_yAGS-UHppp96go3s5oJmlrwpc0',
    REGISTRY: '1F7ayViIAcqY2sSNSA4xB2rms1gDGAc7sI5LEQu6OiHY'
  };

  const loadNodes = async () => {
    if (!isConfigured) return;
    setIsLoadingNodes(true);
    const data = await fetchStorageNodes();
    setNodes(data);
    setIsLoadingNodes(false);
  };

  useEffect(() => {
    loadNodes();
  }, [isConfigured]);

  const openSheet = (id: string) => {
    window.open(`https://docs.google.com/spreadsheets/d/${id}`, '_blank');
  };

  const handleInitDatabase = async () => {
    setIsInitializing(true);
    try {
      const result = await initializeDatabase();
      if (result.status === 'success') {
        showXeenapsAlert({
          icon: 'success',
          title: 'INFRASTRUCTURE READY',
          text: result.message,
          confirmButtonText: 'GREAT'
        });
        loadNodes();
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      showXeenapsAlert({
        icon: 'error',
        title: 'SETUP FAILED',
        text: err.message || 'Could not initialize structure.',
        confirmButtonText: 'OK'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAddNode = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'ADD STORAGE NODE',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Node Label (e.g. Account B)">' +
        '<input id="swal-input2" class="swal2-input" placeholder="Web App URL">' +
        '<input id="swal-input3" class="swal2-input" placeholder="Folder ID">',
      focusConfirm: false,
      preConfirm: () => {
        return [
          (document.getElementById('swal-input1') as HTMLInputElement).value,
          (document.getElementById('swal-input2') as HTMLInputElement).value,
          (document.getElementById('swal-input3') as HTMLInputElement).value
        ]
      },
      ...XEENAPS_SWAL_CONFIG
    });

    if (formValues) {
      const [label, url, folderId] = formValues;
      if (!label || !url || !folderId) {
        showXeenapsAlert({ icon: 'error', title: 'INVALID INPUT', text: 'All fields are required.' });
        return;
      }
      
      const success = await addStorageNode(url, folderId, label);
      if (success) {
        showXeenapsAlert({ icon: 'success', title: 'NODE ADDED', text: 'Storage cluster updated.' });
        loadNodes();
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="glass p-8 rounded-[2rem] border-white/40 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg shadow-[#004A74]/20">
            <Cog6ToothIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#004A74] tracking-tight">System Settings</h2>
            <p className="text-gray-500 font-medium">Manage your private cloud infrastructure</p>
          </div>
        </div>

        {/* Infrastructure Auto-Setup */}
        <div className="mb-10 p-8 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
          <SparklesIcon className="absolute -right-10 -top-10 w-40 h-40 text-white/5 group-hover:rotate-12 transition-transform duration-1000" />
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-2 flex items-center gap-2">
              <TableCellsIcon className="w-6 h-6 text-[#FED400]" />
              Infrastructure Setup
            </h3>
            <p className="text-white/70 text-sm mb-6 max-w-md">
              Initialize the core library structure and the Storage Cluster registry sheet in your Google Workspace.
            </p>
            <button 
              onClick={handleInitDatabase}
              disabled={isInitializing || !isConfigured}
              className="px-8 py-4 bg-[#FED400] text-[#004A74] rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {isInitializing ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <SparklesIcon className="w-5 h-5" />
              )}
              {isInitializing ? 'Initializing...' : 'Initialize Infrastructure'}
            </button>
          </div>
        </div>

        {/* Storage Cluster Management */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-[#004A74] flex items-center gap-2">
              <ServerStackIcon className="w-6 h-6" />
              Storage Cluster
            </h3>
            <button 
              onClick={handleAddNode}
              className="p-2 bg-[#004A74] text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-md"
              title="Add Node"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {isLoadingNodes ? (
              <div className="p-12 flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <ArrowPathIcon className="w-8 h-8 text-[#004A74] animate-spin" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Scanning Cluster Nodes...</p>
              </div>
            ) : nodes.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-sm text-gray-400 font-medium italic">No secondary storage nodes registered.</p>
              </div>
            ) : (
              nodes.map((node, i) => (
                <div key={i} className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${node.status === 'online' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        <SignalIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#004A74]">{node.label}</h4>
                        <p className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">{node.url}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-full ${node.status === 'online' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {node.status}
                      </span>
                    </div>
                  </div>
                  
                  {node.status === 'online' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase">
                        <span>{formatSize(node.used)} / {formatSize(node.total)}</span>
                        <span>{node.percent}% Used</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${parseFloat(node.percent) > 90 ? 'bg-red-500' : 'bg-[#004A74]'}`}
                          style={{ width: `${node.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className={`p-6 rounded-3xl border ${isConfigured ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'} transition-all`}>
            <div className="flex items-center gap-3 mb-4">
              {isConfigured ? (
                <ShieldCheckIcon className="w-6 h-6 text-green-600" />
              ) : (
                <ExclamationCircleIcon className="w-6 h-6 text-red-700" />
              )}
              <h3 className={`font-bold ${isConfigured ? 'text-green-700' : 'text-red-700'}`}>Cloud Bridge Status</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isConfigured 
                ? 'Backend GAS berhasil terhubung. Aplikasi siap melakukan sinkronisasi data.' 
                : 'VITE_GAS_URL belum terdeteksi. Silakan cek Environment Variables.'}
            </p>
          </div>

          <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <CloudArrowUpIcon className="w-6 h-6 text-[#004A74]" />
              <h3 className="font-bold text-[#004A74]">AI Engine (Gemini Flash)</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Model aktif: <span className="font-mono font-bold">gemini-3-flash-preview</span>. 
              Rotasi API Key aktif melalui registry spreadsheet.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black text-[#004A74] mb-6 flex items-center gap-2">
            <TableCellsIcon className="w-6 h-6" />
            Registry Management
          </h3>
          
          <div className="space-y-4">
            <button 
              onClick={() => openSheet(SPREADSHEET_IDS.REGISTRY)}
              className="w-full group flex items-center justify-between p-6 bg-white/40 hover:bg-[#FED400] rounded-2xl border border-white/60 transition-all duration-500 text-left shadow-sm"
            >
              <div>
                <h4 className="font-bold text-[#004A74] group-hover:scale-105 transition-transform origin-left">Cluster Registry</h4>
                <p className="text-sm text-gray-500 group-hover:text-[#004A74]/70">Audit secondary storage accounts and node mappings.</p>
              </div>
              <TableCellsIcon className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => openSheet(SPREADSHEET_IDS.LIBRARY)}
              className="w-full group flex items-center justify-between p-6 bg-white/40 hover:bg-[#004A74] rounded-2xl border border-white/60 transition-all duration-500 text-left shadow-sm"
            >
              <div>
                <h4 className="font-bold text-[#004A74] group-hover:text-white group-hover:scale-105 transition-all origin-left">Master Library Database</h4>
                <p className="text-sm text-gray-500 group-hover:text-white/70">Access raw collection data and system backups.</p>
              </div>
              <TableCellsIcon className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>

      <div className="text-center pb-8">
        <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">
          Xeenaps v1.0.0 • Personal Knowledge Management System
        </p>
      </div>
    </div>
  );
};

export default SettingsView;
