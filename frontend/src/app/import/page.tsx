'use client';

import React, { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle,
  ArrowLeft, Download, Loader2, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragging(true);
    else if (e.type === 'dragleave') setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const f = files[0];
      if (f.name.endsWith('.csv')) setFile(f);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) setFile(files[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await api.scraper.importCsv(file);
      setResult(res);
    } catch (err: any) {
      setResult({ status: 'error', imported: 0, skipped: 0, errors: [err.message || 'Import failed'] });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  const requiredColumns = ['business_name', 'phone'];
  const optionalColumns = ['industry', 'location', 'description', 'website'];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Import Leads</h1>
          <p className="text-sm text-zinc-500 mt-1">Upload a CSV file to bulk-import leads</p>
        </div>
        <Link href="/leads" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to leads
        </Link>
      </div>

      {/* Template Download */}
      <div className="rounded-2xl p-5 bg-zinc-900/80 border border-zinc-800 shadow-xl">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">CSV Format</h3>
        <p className="text-sm text-zinc-400 mb-3">Your CSV must include <span className="text-amber-400 font-semibold">business_name</span> and <span className="text-amber-400 font-semibold">phone</span> columns. Optional columns: {optionalColumns.join(', ')}.</p>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 font-medium text-zinc-400">business_name *</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-400">phone *</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-400">industry</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-400">location</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-400">website</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-800/50">
                <td className="px-4 py-2.5 text-zinc-300">Acme Corp</td>
                <td className="px-4 py-2.5 text-zinc-300">+919876543210</td>
                <td className="px-4 py-2.5 text-zinc-500">Manufacturing</td>
                <td className="px-4 py-2.5 text-zinc-500">Mumbai, India</td>
                <td className="px-4 py-2.5 text-zinc-500">https://acme.com</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-zinc-300">Global Tech</td>
                <td className="px-4 py-2.5 text-zinc-300">+919812345678</td>
                <td className="px-4 py-2.5 text-zinc-500">Technology</td>
                <td className="px-4 py-2.5 text-zinc-500">Bengaluru</td>
                <td className="px-4 py-2.5 text-zinc-500">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !file && document.getElementById('csv-input')?.click()}
        className={`rounded-2xl p-12 border-2 border-dashed text-center cursor-pointer transition-all ${
          dragging
            ? 'border-amber-400 bg-amber-500/5'
            : file
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
        }`}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
        {file ? (
          <div className="space-y-3">
            <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="text-sm font-medium text-zinc-200">{file.name}</p>
            <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-12 h-12 text-zinc-600 mx-auto" />
            <p className="text-sm text-zinc-400">
              <span className="text-amber-400 font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-zinc-600">CSV files only</p>
          </div>
        )}
      </div>

      {/* Import Button */}
      {file && !result && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-600 text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {importing ? `Importing ${file.name}...` : `Import ${file.name}`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-2xl p-6 bg-zinc-900/80 border border-zinc-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            {result.status === 'ok' ? (
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <p className="font-semibold text-zinc-200">
                {result.imported > 0
                  ? `Successfully imported ${result.imported} lead${result.imported !== 1 ? 's' : ''}`
                  : 'No leads were imported'}
              </p>
              {result.skipped > 0 && (
                <p className="text-xs text-amber-400 mt-0.5">{result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped</p>
              )}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 max-h-48 overflow-y-auto">
              <p className="text-xs text-red-400 font-medium mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> Errors ({result.errors.length})
              </p>
              <div className="space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-300/80">{err}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Import Another
            </button>
            <Link
              href="/leads"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-600 text-black text-sm font-medium text-center hover:opacity-90 transition-opacity"
            >
              View Leads
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
