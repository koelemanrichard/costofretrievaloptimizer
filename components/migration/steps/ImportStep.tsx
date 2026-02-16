import React, { useState, useEffect } from 'react';
import { SiteInventoryItem } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Loader } from '../../ui/Loader';
import { useAppState } from '../../../state/appState';
import * as migrationService from '../../../services/migrationService';

interface ImportStepProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  onComplete: () => void;
  onRefreshInventory: () => void;
}

type DateRange = '28d' | '90d' | '6m' | '12m' | '16m';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '28d', label: '28 days' },
  { value: '90d', label: '90 days' },
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
  { value: '16m', label: '16 months' },
];

export const ImportStep: React.FC<ImportStepProps> = ({
  projectId,
  mapId: _mapId,
  inventory,
  onComplete,
  onRefreshInventory,
}) => {
  const { state, dispatch } = useAppState();
  const { businessInfo } = state;

  // Sitemap state
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [isSitemapProcessing, setIsSitemapProcessing] = useState(false);
  const [sitemapStatus, setSitemapStatus] = useState('');
  const [sitemapError, setSitemapError] = useState<string | null>(null);
  const [sitemapProgress, setSitemapProgress] = useState<{ current: number; total: number } | null>(null);
  const [sitemapImportedCount, setSitemapImportedCount] = useState<number | null>(null);

  // GSC state
  const [dateRange, setDateRange] = useState<DateRange>('16m');
  const [isGscProcessing, setIsGscProcessing] = useState(false);
  const [gscStatus, setGscStatus] = useState('');
  const [gscError, setGscError] = useState<string | null>(null);
  const [gscProgress, setGscProgress] = useState<{ current: number; total: number } | null>(null);
  const [gscSyncedCount, setGscSyncedCount] = useState<number | null>(null);
  const [gscProperty, setGscProperty] = useState<{ id: string; property_id: string; property_name: string | null; last_synced_at: string | null } | null>(null);
  const [gscCheckDone, setGscCheckDone] = useState(false);
  const [gscFile, setGscFile] = useState<File | null>(null);

  // Check for linked GSC property
  useEffect(() => {
    if (!projectId || gscCheckDone) return;
    migrationService.getLinkedGscProperty(
      projectId,
      businessInfo.supabaseUrl,
      businessInfo.supabaseAnonKey
    ).then(prop => {
      setGscProperty(prop);
      setGscCheckDone(true);
    }).catch(() => setGscCheckDone(true));
  }, [projectId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, gscCheckDone]);

  // Auto-complete when inventory has at least 1 URL
  useEffect(() => {
    if (inventory.length > 0) {
      onComplete();
    }
  }, [inventory.length, onComplete]);

  // Sitemap import handler
  const handleSitemapImport = async () => {
    if (!projectId) {
      setSitemapError('No active project found.');
      return;
    }
    if (!sitemapUrl) {
      setSitemapError('Please enter a Sitemap URL.');
      return;
    }

    setIsSitemapProcessing(true);
    setSitemapError(null);
    setSitemapStatus('Fetching and parsing sitemap...');
    setSitemapProgress(null);
    setSitemapImportedCount(null);

    try {
      const urls = await migrationService.fetchAndParseSitemap(
        sitemapUrl,
        (msg) => setSitemapStatus(msg),
        { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
      );

      if (urls.length === 0) {
        throw new Error('No URLs found in the provided sitemap.');
      }

      setSitemapStatus(`Found ${urls.length} URLs. Saving to inventory...`);

      await migrationService.initializeInventory(
        projectId,
        urls,
        businessInfo.supabaseUrl,
        businessInfo.supabaseAnonKey,
        (current, total) => setSitemapProgress({ current, total })
      );

      setSitemapImportedCount(urls.length);
      setSitemapStatus('');
      setSitemapProgress(null);
      dispatch({ type: 'SET_NOTIFICATION', payload: `Successfully imported ${urls.length} pages from sitemap.` });
      onRefreshInventory();
    } catch (e) {
      console.error('Sitemap import failed:', e);
      setSitemapError(e instanceof Error ? e.message : 'An unknown error occurred during import.');
    } finally {
      setIsSitemapProcessing(false);
    }
  };

  // GSC API sync handler
  const handleGscApiSync = async () => {
    if (!projectId) return;

    setIsGscProcessing(true);
    setGscError(null);
    setGscStatus('Fetching GSC data...');
    setGscProgress(null);
    setGscSyncedCount(null);

    try {
      const count = await migrationService.importGscFromApi(
        projectId,
        businessInfo.supabaseUrl,
        businessInfo.supabaseAnonKey,
        (current, total) => setGscProgress({ current, total }),
        (msg) => setGscStatus(msg)
      );

      setGscSyncedCount(count);
      setGscStatus('');
      setGscProgress(null);
      dispatch({ type: 'SET_NOTIFICATION', payload: `Imported ${count.toLocaleString()} pages from GSC.` });
      onRefreshInventory();
    } catch (err) {
      setGscError(err instanceof Error ? err.message : 'GSC API import failed.');
    } finally {
      setIsGscProcessing(false);
    }
  };

  // GSC CSV upload handler
  const handleGscCsvImport = async () => {
    if (!projectId || !gscFile) return;

    setIsGscProcessing(true);
    setGscError(null);
    setGscStatus('Reading CSV file...');
    setGscProgress(null);
    setGscSyncedCount(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setGscError('Failed to read file.');
        setIsGscProcessing(false);
        return;
      }

      try {
        setGscStatus('Processing GSC data...');
        await migrationService.processGscPages(
          projectId,
          text,
          businessInfo.supabaseUrl,
          businessInfo.supabaseAnonKey,
          (current, total) => setGscProgress({ current, total })
        );

        // Count rows from file (rough estimate based on lines)
        const lineCount = text.trim().split(/\r?\n/).length - 1;
        setGscSyncedCount(lineCount > 0 ? lineCount : null);
        setGscStatus('');
        setGscProgress(null);
        dispatch({ type: 'SET_NOTIFICATION', payload: 'GSC data overlay complete.' });
        onRefreshInventory();
      } catch (err) {
        setGscError(err instanceof Error ? err.message : 'GSC CSV import failed.');
      } finally {
        setIsGscProcessing(false);
      }
    };
    reader.readAsText(gscFile);
  };

  // Count inventory items that have GSC data
  const gscDataCount = inventory.filter(i => i.gsc_impressions && i.gsc_impressions > 0).length;

  return (
    <div className="px-4 py-3 space-y-3">
      <div>
        <h2 className="text-xl font-bold text-white">Let's understand your website</h2>
        <p className="text-sm text-gray-400 mt-1">Import your sitemap and search console data to build a complete site inventory.</p>
      </div>

      {/* Section 1: Sitemap Import */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
        <h3 className="text-base font-semibold text-white mb-3">Sitemap Import</h3>
        <div className="flex gap-3">
          <Input
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            placeholder="https://example.com/sitemap.xml"
            disabled={isSitemapProcessing}
          />
          <Button
            onClick={handleSitemapImport}
            disabled={isSitemapProcessing || !sitemapUrl}
            size="sm"
          >
            {isSitemapProcessing ? <Loader className="w-4 h-4" /> : 'Fetch & Import'}
          </Button>
        </div>

        {/* Sitemap progress */}
        {isSitemapProcessing && sitemapStatus && (
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader className="w-3 h-3 text-blue-400" size="sm" />
              <span className="text-sm text-blue-300">{sitemapStatus}</span>
            </div>
            {sitemapProgress && (
              <div className="w-full bg-blue-900/50 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-blue-400 h-full transition-all duration-300"
                  style={{ width: `${(sitemapProgress.current / sitemapProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Sitemap error */}
        {sitemapError && (
          <div className="mt-3 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
            <p className="text-sm text-red-300">{sitemapError}</p>
          </div>
        )}

        {/* Sitemap success */}
        {sitemapImportedCount !== null && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
            <span>&#10003;</span>
            <span>{sitemapImportedCount.toLocaleString()} URLs imported</span>
          </div>
        )}

        {/* Existing inventory count (if no fresh import) */}
        {sitemapImportedCount === null && inventory.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-400">
            <span>&#10003;</span>
            <span>{inventory.length.toLocaleString()} URLs already in inventory</span>
          </div>
        )}
      </div>

      {/* Section 2: GSC Data */}
      <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
        <h3 className="text-base font-semibold text-white mb-3">Google Search Console</h3>

        {/* GSC API sync */}
        {gscProperty ? (
          <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-300">Connected Property</p>
                <p className="text-xs text-gray-400 font-mono truncate">{gscProperty.property_id}</p>
                {gscProperty.last_synced_at && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Last synced: {new Date(gscProperty.last_synced_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div>
                  <Label htmlFor="date-range" className="text-xs text-gray-400 mb-1">Date range</Label>
                  <select
                    id="date-range"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateRange)}
                    disabled={isGscProcessing}
                    className="bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {DATE_RANGE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleGscApiSync} disabled={isGscProcessing} size="sm">
                  {isGscProcessing ? <Loader className="w-4 h-4" /> : 'Sync GSC Data'}
                </Button>
              </div>
            </div>
          </div>
        ) : gscCheckDone ? (
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg mb-4">
            <p className="text-xs text-gray-500">
              No GSC property linked. Connect one in <strong className="text-gray-400">Settings &rarr; Search Console</strong> to sync directly, or upload a CSV below.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
            <Loader className="w-3 h-3" size="sm" />
            <span>Checking for linked GSC property...</span>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-gray-700" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">or upload CSV</span>
          <div className="flex-1 border-t border-gray-700" />
        </div>

        {/* CSV Upload */}
        <div>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors bg-gray-800/50">
            <input
              type="file"
              id="gsc-csv-file"
              accept=".csv"
              onChange={(e) => setGscFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <label htmlFor="gsc-csv-file" className="cursor-pointer flex flex-col items-center">
              <span className="text-blue-400 font-medium hover:underline text-sm">
                {gscFile ? gscFile.name : "Click to upload Pages.csv"}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Export from GSC performance report (Pages tab)
              </span>
            </label>
          </div>
          {gscFile && (
            <div className="mt-3 flex justify-end">
              <Button onClick={handleGscCsvImport} disabled={isGscProcessing} size="sm">
                {isGscProcessing ? <Loader className="w-4 h-4" /> : 'Process CSV'}
              </Button>
            </div>
          )}
        </div>

        {/* GSC progress */}
        {isGscProcessing && gscStatus && (
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader className="w-3 h-3 text-blue-400" size="sm" />
              <span className="text-sm text-blue-300">{gscStatus}</span>
            </div>
            {gscProgress && (
              <div className="w-full bg-blue-900/50 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-blue-400 h-full transition-all duration-300"
                  style={{ width: `${(gscProgress.current / gscProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* GSC error */}
        {gscError && (
          <div className="mt-3 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
            <p className="text-sm text-red-300">{gscError}</p>
          </div>
        )}

        {/* GSC success */}
        {gscSyncedCount !== null && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
            <span>&#10003;</span>
            <span>{gscSyncedCount.toLocaleString()} rows synced</span>
          </div>
        )}

        {/* Existing GSC data count */}
        {gscSyncedCount === null && gscDataCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-400">
            <span>&#10003;</span>
            <span>{gscDataCount.toLocaleString()} pages with GSC data</span>
          </div>
        )}
      </div>

      {/* Section 3: Preview Table */}
      {inventory.length > 0 && (
        <div className="border border-gray-700 rounded-lg bg-gray-800/30 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700">
            <h3 className="text-base font-semibold text-white">
              Preview
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({inventory.length.toLocaleString()} URLs)
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800 z-10">
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">URL</th>
                  <th className="px-4 py-2 font-medium text-right">Clicks</th>
                  <th className="px-4 py-2 font-medium text-right">Impressions</th>
                  <th className="px-4 py-2 font-medium text-right">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {inventory.slice(0, 50).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-2 text-gray-300 truncate max-w-md" title={item.url}>
                      {item.url}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">
                      {item.gsc_clicks?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">
                      {item.gsc_impressions?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">
                      {item.gsc_position != null ? item.gsc_position.toFixed(1) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {inventory.length > 50 && (
              <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-700/50">
                Showing 50 of {inventory.length.toLocaleString()} URLs
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportStep;
