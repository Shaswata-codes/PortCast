import React from 'react';

export default function MarketTicker({ data }) {
  if (!data) return null;

  const items = [
    { label: 'BDI', value: data.bdi?.value, change: data.bdi?.changePct, prefix: '' },
    { label: 'BCI', value: data.bci?.value, change: data.bci?.changePct, prefix: '' },
    { label: 'BPI', value: data.bpi?.value, change: data.bpi?.changePct, prefix: '' },
    { label: 'BSI', value: data.bsi?.value, change: data.bsi?.changePct, prefix: '' },
    { label: 'VLSFO', value: data.vlsfo?.value, change: null, prefix: '$' },
    { label: 'MGO', value: data.mgo?.value, change: null, prefix: '$' },
  ];

  // Duplicate for infinite scroll
  const allItems = [...items, ...items, ...items];

  return (
    <div className="market-ticker">
      <div className="ticker-track">
        {allItems.map((item, i) => (
          <div className="ticker-item" key={i}>
            <span className="ticker-label">{item.label}</span>
            <span className="ticker-value">{item.prefix}{item.value?.toLocaleString()}</span>
            {item.change !== null && item.change !== undefined && (
              <span className={`ticker-change ${parseFloat(item.change) >= 0 ? 'up' : 'down'}`}>
                {parseFloat(item.change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(item.change))}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
