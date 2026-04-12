import { useMemo, useRef, useState } from 'react';
import { Upload, Download, FileJson, FileSpreadsheet, Check, AlertCircle, Eye } from 'lucide-react';
import { api } from '../api/client';
import type { ImportPreview } from '../types';

type ImportType = 'json' | 'xlsx';

type PendingImport =
  | { type: 'json'; leads: unknown[] }
  | { type: 'xlsx'; base64Data: string };

export default function ImportExport() {
  const [previewing, setPreviewing] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<ImportType>('json');

  const previewRows = useMemo(() => preview?.rows.slice(0, 8) || [], [preview]);

  const resetImportState = () => {
    setPreview(null);
    setPendingImport(null);
    setSelectedFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const data = await api.exportJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.json';
      a.click();
      URL.revokeObjectURL(url);
      setResult({ type: 'success', message: 'Leads exportados como JSON' });
    } catch (err: unknown) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao exportar JSON' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportXlsx = async () => {
    setExporting(true);
    try {
      const blob = await api.exportXlsx();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      setResult({ type: 'success', message: 'Leads exportados como XLSX' });
    } catch (err: unknown) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao exportar XLSX' });
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewing(true);
    setResult(null);
    setPreview(null);
    setPendingImport(null);
    setSelectedFileName(file.name);

    try {
      if (importType === 'json') {
        const text = await file.text();
        const data = JSON.parse(text);
        const leads = Array.isArray(data) ? data : data.leads || [data];
        const previewResponse = await api.previewImportJson(leads);
        setPreview(previewResponse);
        setPendingImport({ type: 'json', leads });
      } else {
        const buffer = await file.arrayBuffer();
        const base64Data = btoa(
          new Uint8Array(buffer).reduce((content, byte) => content + String.fromCharCode(byte), '')
        );
        const previewResponse = await api.previewImportXlsx(base64Data);
        setPreview(previewResponse);
        setPendingImport({ type: 'xlsx', base64Data });
      }
    } catch (err: unknown) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao gerar preview' });
      resetImportState();
    } finally {
      setPreviewing(false);
    }
  };

  const confirmImport = async () => {
    if (!pendingImport || !preview?.canImport) return;

    setConfirmingImport(true);
    setResult(null);

    try {
      const response =
        pendingImport.type === 'json'
          ? await api.importJson(pendingImport.leads as any[])
          : await api.importXlsx(pendingImport.base64Data);

      setResult({ type: 'success', message: response.message });
      resetImportState();
    } catch (err: unknown) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao importar' });
    } finally {
      setConfirmingImport(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <h2 className="text-xl font-bold text-gray-900">Importar / Exportar Leads</h2>

      {result && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            result.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {result.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm">{result.message}</span>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Exportar Leads</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Exporte todos os seus leads nos formatos JSON ou XLSX (Excel).
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleExportJson} disabled={exporting} className="btn-secondary flex items-center justify-center gap-2">
            <FileJson className="w-5 h-5 text-green-600" /> Exportar JSON
          </button>
          <button onClick={handleExportXlsx} disabled={exporting} className="btn-secondary flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Exportar XLSX
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Upload className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Importar Leads</h3>
        </div>

        <p className="text-sm text-gray-500">
          O import agora faz preview antes de confirmar. No Excel, a ordem das colunas nao importa.
        </p>

        <div>
          <label className="label">Formato do arquivo</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={importType === 'json'}
                onChange={() => {
                  setImportType('json');
                  resetImportState();
                }}
                className="text-primary-600"
              />
              <span className="text-sm text-gray-700">JSON</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={importType === 'xlsx'}
                onChange={() => {
                  setImportType('xlsx');
                  resetImportState();
                }}
                className="text-primary-600"
              />
              <span className="text-sm text-gray-700">XLSX (Excel)</span>
            </label>
          </div>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept={importType === 'json' ? '.json' : '.xlsx,.xls'}
            onChange={handleImportFile}
            className="hidden"
            id="importFile"
          />
          <label
            htmlFor="importFile"
            className={`block w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors ${
              previewing || confirmingImport ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">
              {previewing ? 'Gerando preview...' : 'Clique para selecionar o arquivo'}
            </p>
            <p className="text-xs text-gray-400 mt-1">{importType === 'json' ? '.json' : '.xlsx, .xls'}</p>
          </label>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Formato esperado ({importType.toUpperCase()}):</p>
          {importType === 'json' ? (
            <pre className="text-xs text-gray-600 overflow-x-auto">{`[
  {
    "name": "Joao Silva",
    "phone": "(11) 99999-9999",
    "origin": "website",
    "stage": "Contato",
    "owner": "vendas@empresa.com"
  }
]`}</pre>
          ) : (
            <p className="text-xs text-gray-600">
              Exemplos aceitos: id, name, phone, origin, stage, value, nextStep, tags, obs, lossReason, owner,
              createdAt e updatedAt, alem de variantes em portugues.
            </p>
          )}
        </div>
      </div>

      {preview && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Preview da Importacao</h3>
              <p className="text-sm text-gray-500">{selectedFileName || 'Arquivo selecionado'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <p className="text-xs uppercase tracking-wide text-gray-500">Linhas</p>
              <p className="text-2xl font-semibold text-gray-900">{preview.totalRows}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <p className="text-xs uppercase tracking-wide text-gray-500">Validas</p>
              <p className="text-2xl font-semibold text-gray-900">{preview.validRows}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <p className="text-xs uppercase tracking-wide text-gray-500">Etapas novas</p>
              <p className="text-2xl font-semibold text-gray-900">{preview.newStages.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 bg-white">
              <p className="text-xs uppercase tracking-wide text-gray-500">Tags novas</p>
              <p className="text-2xl font-semibold text-gray-900">{preview.newTags.length}</p>
            </div>
          </div>

          {preview.newStages.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Etapas que serao criadas</p>
              <div className="flex flex-wrap gap-2">
                {preview.newStages.map((stage) => (
                  <span key={stage} className="px-2 py-1 rounded-full bg-white text-blue-800 text-xs border border-blue-200">
                    {stage}
                  </span>
                ))}
              </div>
            </div>
          )}

          {preview.newTags.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-900 mb-2">Tags que serao criadas</p>
              <div className="flex flex-wrap gap-2">
                {preview.newTags.map((tag) => (
                  <span key={tag} className="px-2 py-1 rounded-full bg-white text-emerald-800 text-xs border border-emerald-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {preview.unknownOwners.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900 mb-2">Owners nao encontrados</p>
              <div className="space-y-1">
                {preview.unknownOwners.map((item) => (
                  <p key={`${item.rowNumber}-${item.owner}`} className="text-sm text-red-700">
                    Linha {item.rowNumber}: {item.owner}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Linha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Lead</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Etapa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tags</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-3 text-gray-500">{row.rowNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-500">{row.phone || 'Sem telefone'}</p>
                      {row.issues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {row.issues.map((issue) => (
                            <p key={issue} className="text-xs text-red-600">
                              {issue}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.stageName || '-'}
                      {row.willCreateStage && (
                        <p className="text-xs text-blue-600 mt-1">sera criada</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.owner || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.tags.length > 0 ? (
                          row.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.rows.length > previewRows.length && (
            <p className="text-xs text-gray-500">
              Mostrando {previewRows.length} de {preview.rows.length} linhas no preview.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={confirmImport}
              disabled={!preview.canImport || confirmingImport}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmingImport ? 'Importando...' : 'Confirmar importacao'}
            </button>
            <button type="button" onClick={resetImportState} className="btn-secondary">
              Escolher outro arquivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
