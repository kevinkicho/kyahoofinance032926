import React, { useState } from 'react';
import Papa from 'papaparse';
import { mockTreemapData } from '../../mockData';
import './DataHub.css';

const DataHub = ({ setMarketUniverse, setViewMode }) => {
  const [tickerInput, setTickerInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [customList, setCustomList] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Local Ollama States
  const [ollamaModel, setOllamaModel] = useState('llama3');
  const [secTicker, setSecTicker] = useState('');
  const [manualText, setManualText] = useState('');
  const [secLoading, setSecLoading] = useState(false);
  const [secError, setSecError] = useState('');
  const [secResult, setSecResult] = useState(null);

  // Builds the final nested structure and pushes it to App.jsx
  const applyCustomUniverse = (list) => {
    if (list.length === 0) {
      setMarketUniverse(mockTreemapData);
      return;
    }

    const universe = [
      {
        name: 'Live Custom Universe',
        currency: 'USD',
        symbol: '$',
        itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#a855f7' },
        children: list.map(item => ({
          name: item.ticker.toUpperCase(),
          sector: item.sector || 'Unknown',
          value: item.marketCap || 100000000, // fallback 100M
          itemStyle: { color: item.changePct >= 0 ? '#22c55e' : '#ef4444' }
        }))
      }
    ];
    setMarketUniverse(universe);
    setViewMode('heatmap');
  };

  const handleFetchLive = async () => {
    if (!tickerInput.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const symbols = tickerInput.split(',').map(s => s.trim().toUpperCase());
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: symbols })
      });
      const data = await res.json();
      
      const newItems = [];
      for (const [sym, info] of Object.entries(data)) {
        if (!customList.find(c => c.ticker === sym)) {
          newItems.push({
            ticker: sym,
            sector: info.sector || 'Unknown',
            marketCap: info.marketCap,
            price: info.price,
            changePct: info.changePct
          });
        }
      }

      if (newItems.length === 0) {
        setErrorMsg('No valid new tickers found or already added.');
      } else {
        setCustomList(prev => [...prev, ...newItems]);
        setTickerInput('');
      }
    } catch (err) {
      setErrorMsg('Failed to ping Alpha Vantage proxy.');
    }
    setLoading(false);
  };

  const handleRunOllama = async () => {
    if (!secTicker.trim() || !manualText.trim()) {
      setSecError('Target Ticker and 10-K Text Dump are required.');
      return;
    }
    setSecLoading(true);
    setSecError('');
    setSecResult(null);
    try {
      const res = await fetch('/api/ollama-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker: secTicker.trim(), 
          text: manualText,
          ollamaModel: ollamaModel.trim() 
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setSecResult(data);
    } catch (err) {
      setSecError(err.message || 'Failed to execute Local Ollama Pipeline.');
    }
    setSecLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Looking for columns like Ticker, Sector, MarketCap
        const parsed = results.data.map(row => {
          // Robust column matching
          const ticker = row.Ticker || row.Symbol || row.name || 'UNKNOWN';
          let mcap = row.MarketCap || row.Value || row.value;
          if (typeof mcap === 'string') mcap = parseFloat(mcap.replace(/[^0-9.-]+/g,""));

          return {
            ticker,
            sector: row.Sector || row.sector || 'Unknown',
            marketCap: mcap || 1000000,
            changePct: parseFloat(row.ChangePct || row.change || 0)
          };
        }).filter(item => item.ticker !== 'UNKNOWN');

        setCustomList(prev => [...prev, ...parsed]);
      }
    });
  };

  const resetToMock = () => {
    setCustomList([]);
    setMarketUniverse(mockTreemapData);
  };

  return (
    <div className="data-hub">
      <div className="dh-header">
        <h2>🌐 External Data Pipeline</h2>
        <p>Replace the simulated engine with live market data or ingest your 40-year CSV archives. Once compiled, apply the Universe to seamlessly wire it into the ML Engine.</p>
      </div>

      <div className="dh-split">
        {/* Left: Sources */}
        <div className="dh-sources">
          
          {/* Live API */}
          <div className="dh-card">
            <h3>🌩️ Live Alpha Vantage API</h3>
            <p className="dh-desc">Pull real-time quotes, sector metadata, and market caps directly from Alpha Vantage. (Max 25/day student limit protected by local cache).</p>
            <div className="dh-input-group">
              <input 
                type="text" 
                placeholder="AAPL, MSFT, TSLA..." 
                value={tickerInput}
                onChange={e => setTickerInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetchLive()}
              />
              <button disabled={loading} onClick={handleFetchLive}>
                {loading ? 'Fetching...' : 'Pull Live Data'}
              </button>
            </div>
            {errorMsg && <p className="dh-error">{errorMsg}</p>}
          </div>

          {/* CSV Upload */}
          <div className="dh-card">
            <h3>📊 Bulk CSV Ingestion</h3>
            <p className="dh-desc">Browser-native lightning parser (PapaParse). Ingest historical performance without server roundtrips. Expected headers: <code>Ticker</code>, <code>Sector</code>, <code>MarketCap</code>.</p>
            <div className="dh-file-drop">
              <input type="file" accept=".csv" onChange={handleFileUpload} id="csv-upload" />
              <label htmlFor="csv-upload" className="dh-btn-outline">Select CSV File</label>
            </div>
          </div>

          {/* Offline Ollama Extraction */}
          <div className="dh-card sec-ai-card">
            <h3 style={{ borderColor: '#f59e0b', color: '#fcd34d' }}>🦙 Local Ollama Extraction Engine</h3>
            <p className="dh-desc">100% Free & Offline. Feed raw balance sheet text dumped from any 10-K or PDF. Your local AI will parse it into structural intelligence instantly.</p>
            
            <div className="dh-input-group" style={{ marginBottom: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Target Ticker (e.g. MSFT)" 
                value={secTicker}
                onChange={e => setSecTicker(e.target.value)}
                style={{ flex: 1.5 }}
              />
              <input 
                type="text" 
                placeholder="Local Model (e.g. llama3)" 
                value={ollamaModel}
                onChange={e => setOllamaModel(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>

            <textarea 
              className="dh-manual-textarea"
              placeholder="PASTE RAW 10-K TEXT HERE... (Copy a few pages from the SEC document containing the balance sheet and risk factors)"
              value={manualText}
              onChange={e => setManualText(e.target.value)}
            />

            <button 
              className="dh-ollama-btn"
              disabled={secLoading} 
              onClick={handleRunOllama}
            >
              {secLoading ? `Consulting local ${ollamaModel}...` : 'Run Local AI Extraction'}
            </button>

            {secError && <p className="dh-error">{secError}</p>}

            {/* AI Result Render */}
            {secResult && (
              <div className="sec-result-box">
                <div className="srb-header">{secTicker.toUpperCase()} • {ollamaModel} NLP Extraction</div>
                <div className="srb-grid">
                  <div className="srb-stat"><label>Total Assets</label><span>{secResult.assets}</span></div>
                  <div className="srb-stat"><label>Total Liabilities</label><span>{secResult.liabilities}</span></div>
                </div>
                <div className="srb-risks">
                  <label>Identified Risk Factors:</label>
                  <ul>
                    {secResult.risks?.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: The Staging Area */}
        <div className="dh-staging">
          <div className="dh-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Staging Universe ({customList.length} Assets)</h3>
              <button className="dh-apply-btn" onClick={() => applyCustomUniverse(customList)}>
                Apply & Render Map
              </button>
            </div>

            <div className="staging-list">
              {customList.length === 0 ? (
                <p className="staging-empty">No external data loaded.<br/>The app is currently running on the default simulated 2,500-stock Global Map.</p>
              ) : (
                <table className="staging-table">
                  <thead>
                    <tr>
                      <th>Ticker</th><th>Sector</th><th>Live Market Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customList.map(item => (
                      <tr key={item.ticker}>
                        <td style={{ fontWeight: 700 }}>{item.ticker}</td>
                        <td style={{ opacity: 0.8 }}>{item.sector}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', textAlign: 'right' }}>
                          ${(item.marketCap / 1e9).toFixed(1)}B
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <button className="dh-reset-link" onClick={resetToMock}>
              Reset entire app to Simulated Mock Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataHub;
