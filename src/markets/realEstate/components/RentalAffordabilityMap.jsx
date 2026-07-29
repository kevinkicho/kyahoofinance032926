import React from 'react';
import './RealEstateDashboard.css';

function RentalAffordabilityMap({ data }) {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current || !window.L || !data) return;

    // Center map on the geographic center of the contiguous US
    const map = window.L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView([37.8, -96], 4);

    mapRef.current = map;

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    window.L.control.zoom({ position: 'topright' }).addTo(map);

    data.forEach(d => {
      if (d.lat == null || d.lng == null) return;

      let val = d.ratio ?? d.rentToIncome ?? null;
      if (val != null && Number(val) > 0 && Number(val) <= 1.5) val = Number(val) * 100;
      val = val != null ? Number(val) : null;
      let homeValue = d.homeValue;
      if (homeValue == null && typeof d.medianHomeValue === 'number') homeValue = d.medianHomeValue;
      if (homeValue == null && Array.isArray(d.medianHomeValue?.values)) {
        homeValue = d.medianHomeValue.values[d.medianHomeValue.values.length - 1];
      }

      let color = '#10b981'; // Green
      if (val != null && val > 40) color = '#ef4444'; // Red
      else if (val != null && val > 30) color = '#f59e0b'; // Orange

      const marker = window.L.circleMarker([d.lat, d.lng], {
        radius: 6,
        fillColor: color,
        color: '#111827',
        weight: 1.5,
        fillOpacity: 0.85
      }).addTo(map);

      const popupContent = `
        <div class="leaflet-dark-popup">
          <div class="popup-title">${d.city}</div>
          <div class="popup-grid">
            <div class="popup-row">
              <span class="popup-label">Rent-to-Income:</span>
              <span class="popup-val" style="color: ${color}; font-weight: 600;">${val != null ? val.toFixed(1) + '%' : 'N/A'}</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">2B FMR Rent:</span>
              <span class="popup-val">$${d.rent ? Number(d.rent).toLocaleString() : 'N/A'}/mo</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Median Income:</span>
              <span class="popup-val">$${d.income ? Number(d.income).toLocaleString() : 'N/A'}/yr</span>
            </div>
            ${homeValue ? `
            <div class="popup-divider"></div>
            <div class="popup-row">
              <span class="popup-label">Home Value:</span>
              <span class="popup-val">$${Number(homeValue).toLocaleString()}</span>
            </div>
            ` : ''}
            ${d.homeownership ? `
            <div class="popup-row">
              <span class="popup-label">Homeownership Rate:</span>
              <span class="popup-val">${Number(d.homeownership).toFixed(1)}%</span>
            </div>
            ` : ''}
            ${d._proxy ? `
            <div class="popup-row">
              <span class="popup-label">Source:</span>
              <span class="popup-val">Estimated (FRED/CS)</span>
            </div>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'dark-popup-wrapper',
        closeButton: false
      });
    });

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [data]);

  return <div ref={containerRef} className="re-hud-map" style={{ height: '100%', width: '100%', borderRadius: '6px' }} />;
}


export default RentalAffordabilityMap;
