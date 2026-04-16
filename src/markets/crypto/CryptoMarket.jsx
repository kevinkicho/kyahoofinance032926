import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CryptoDashboard from './components/CryptoDashboard';
import './CryptoMarket.css';

function getCryptoProps(centralData) {
  const d = centralData.data || {};
  return {
    coinMarketData: d.coinMarketData,
    fearGreedData: d.fearGreedData,
    defiData: d.defiData,
    fundingData: d.fundingData,
    onChainData: d.onChainData,
    stablecoinMcap: d.stablecoinMcap,
    btcDominance: d.btcDominance,
    topExchanges: d.topExchanges || [],
    ethGas: d.ethGas,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function CryptoMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getCryptoProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="crypto-market">
      <CryptoDashboard
        coinMarketData={props.coinMarketData}
        fearGreedData={props.fearGreedData}
        defiData={props.defiData}
        fundingData={props.fundingData}
        onChainData={props.onChainData}
        stablecoinMcap={props.stablecoinMcap}
        btcDominance={props.btcDominance}
        topExchanges={props.topExchanges}
        ethGas={props.ethGas}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
        fetchLog={props.fetchLog}
      />
    </div>
  );
}

export default React.memo(CryptoMarket);
