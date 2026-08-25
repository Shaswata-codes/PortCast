// =====================================================
// PortCast — CSV Dataset Generator
// Generates all dataset CSV files for testing & validation
// =====================================================

import { destinationPorts, originPorts } from './data/portsData.js';
import { vesselClasses } from './data/vesselsData.js';
import { shippingRoutes } from './data/routesData.js';
import { generateHistoricalRates, generateBalticIndices } from './services/forecastingEngine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', '..', 'datasets');

// Create output directory
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function writeCSV(filename, headers, rows) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const str = String(cell ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` 
        : str;
    }).join(','))
  ].join('\n');

  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, csvContent, 'utf8');
  console.log(`  ✅ ${filename} — ${rows.length} rows`);
}

console.log('🚢 PortCast Dataset Generator');
console.log(`   Output directory: ${outDir}\n`);

// ========================================
// 1. Destination Ports (East Coast India)
// ========================================
writeCSV('01_destination_ports.csv',
  ['port_id', 'port_name', 'state', 'latitude', 'longitude', 'max_draft_m', 'max_loa_m', 'max_beam_m', 'tidal_range_m', 'night_navigation', 'dry_bulk_berths', 'avg_discharge_rate_mt_day', 'avg_waiting_days', 'lighterage_required', 'lighterage_cost_per_mt', 'annual_capacity_mtpa', 'commodities', 'handysize_feasible', 'supramax_feasible', 'panamax_feasible', 'capesize_feasible', 'port_dues_per_mt', 'pilotage_per_mt'],
  destinationPorts.map(p => [
    p.id, p.name, p.state, p.lat, p.lng, p.maxDraft, p.maxLOA, p.maxBeam, p.tidalRange,
    p.nightNavigation ? 'Yes' : 'No/Restricted', p.dryBulkBerths, p.avgDischargeRate, p.avgWaitingDays,
    p.lighterageRequired ? 'Yes' : 'No', p.lighterageCostPerMT || 0, p.annualCapacityMTPA,
    p.commodities.join('; '),
    p.vesselFeasibility.handysize ? 'Yes' : 'No',
    p.vesselFeasibility.supramax ? 'Yes' : 'No',
    p.vesselFeasibility.panamax ? 'Yes' : 'No',
    p.vesselFeasibility.capesize ? 'Yes' : 'No',
    p.portDues, p.pilotage,
  ])
);

// ========================================
// 2. Origin Ports (Global Sources)
// ========================================
writeCSV('02_origin_ports.csv',
  ['port_id', 'port_name', 'country', 'region', 'latitude', 'longitude', 'max_draft_m', 'loading_rate_mt_day', 'primary_commodity', 'typical_parcel_min_mt', 'typical_parcel_max_mt', 'avg_loading_days'],
  originPorts.map(p => [
    p.id, p.name, p.country, p.region, p.lat, p.lng, p.maxDraft, p.loadingRate,
    p.commodity, p.typicalParcelMin, p.typicalParcelMax, p.avgLoadingDays,
  ])
);

// ========================================
// 3. Vessel Classes
// ========================================
writeCSV('03_vessel_classes.csv',
  ['vessel_id', 'vessel_class', 'dwt_min', 'dwt_max', 'typical_dwt', 'laden_draft_min_m', 'laden_draft_max_m', 'typical_loa_m', 'beam_m', 'daily_hire_min_usd', 'daily_hire_max_usd', 'avg_daily_hire_usd', 'fuel_consumption_mt_day', 'speed_knots', 'cargo_capacity_min_mt', 'cargo_capacity_max_mt', 'has_gear', 'gear_note'],
  vesselClasses.map(v => [
    v.id, v.name, v.dwtMin, v.dwtMax, v.typicalDWT, v.ladenDraftMin, v.ladenDraftMax,
    v.typicalLOA, v.beam, v.dailyHireMin, v.dailyHireMax, v.avgDailyHire,
    v.fuelConsumptionPerDay, v.speedKnots, v.cargoCapacityMin, v.cargoCapacityMax,
    v.hasGear ? 'Yes' : 'No', v.gearNote,
  ])
);

// ========================================
// 4. Shipping Routes
// ========================================
writeCSV('04_shipping_routes.csv',
  ['route_id', 'origin_id', 'destination_id', 'origin_name', 'destination_name', 'nautical_miles', 'transit_days_laden', 'transit_days_ballast', 'typical_vessel_classes', 'commodity', 'base_freight_rate_usd_mt', 'fuel_cost_estimate_usd_mt', 'choke_points', 'sw_monsoon_premium_pct', 'ne_monsoon_premium_pct', 'cyclone_premium_pct'],
  shippingRoutes.map(r => [
    r.id, r.origin, r.destination, r.originName, r.destinationName, r.nauticalMiles,
    r.transitDaysLaden, r.transitDaysBallast, r.typicalVessel.join('; '), r.commodity,
    r.baseFreightRate, r.fuelCostPerMT, r.chokePoints.join('; '),
    (r.seasonalPremium.swMonsoon * 100).toFixed(0),
    (r.seasonalPremium.neMonsoon * 100).toFixed(0),
    (r.seasonalPremium.cyclone * 100).toFixed(0),
  ])
);

// ========================================
// 5. Historical Freight Rates (Daily, 3 years, all 20 routes)
// ========================================
console.log('\n  Generating 3-year daily freight rates for all 20 routes...');

const allRateHeaders = ['date', ...shippingRoutes.map(r => `${r.id}_rate_usd_mt`)];
const allRatesMap = {};

for (const route of shippingRoutes) {
  const rates = generateHistoricalRates(route);
  for (const entry of rates) {
    if (!allRatesMap[entry.date]) allRatesMap[entry.date] = { date: entry.date };
    allRatesMap[entry.date][`${route.id}_rate_usd_mt`] = entry.rate;
  }
}

const allDates = Object.keys(allRatesMap).sort();
const rateRows = allDates.map(date => {
  const row = allRatesMap[date];
  return [row.date, ...shippingRoutes.map(r => row[`${r.id}_rate_usd_mt`] ?? '')];
});

writeCSV('05_historical_freight_rates.csv', allRateHeaders, rateRows);

// ========================================
// 6. Baltic Indices & Fuel Prices (Daily, 3 years)
// ========================================
console.log('  Generating 3-year daily Baltic indices & fuel prices...');

const balticData = generateBalticIndices();
writeCSV('06_baltic_indices_fuel_prices.csv',
  ['date', 'bdi', 'bci_capesize', 'bpi_panamax', 'bsi_supramax', 'bhsi_handysize', 'vlsfo_usd_mt', 'mgo_usd_mt'],
  balticData.map(d => [d.date, d.bdi, d.bci, d.bpi, d.bsi, d.bhsi, d.vlsfo, d.mgo])
);

// ========================================
// 7. Seasonal & Weather Risk Factors
// ========================================
writeCSV('07_seasonal_weather_factors.csv',
  ['factor', 'months_affected', 'freight_rate_impact', 'port_operations_impact', 'transit_time_impact'],
  [
    ['SW Monsoon (Bay of Bengal)', 'June - September', '+20% to +35% rate premium', 'Discharge rate drops 15-25%; Port closures 2-5 days/month', '+1.5 to +3.0 extra transit days'],
    ['NE Monsoon (Tamil Nadu coast)', 'October - December', '+5% to +10%', 'Minor disruption at Chennai and Ennore', '+0.5 to +1.0 days'],
    ['Cyclone Season (Bay of Bengal)', 'May-June and Oct-Nov', '+15% to +40% (spike)', 'Full port shutdown 3-7 days per event', '+3 to +7 days (rerouting)'],
    ['Chinese New Year', 'Late Jan - Mid Feb', '-10% to -15% (demand dip)', 'Minimal', 'None'],
    ['Indian Pre-Monsoon Stock Build', 'April - May', '+10% to +15% (pre-monsoon rush)', 'Congestion spikes at Paradip and Dhamra', '+1 day avg waiting'],
    ['Suez Canal Disruption', 'Unpredictable', '+$3-$8/MT for US/Europe routes', 'N/A', '+7 to +15 days (Cape rerouting)'],
    ['Malacca Strait Congestion', 'Year-round (variable)', '+$0.50-$1.50/MT', 'N/A', '+0.5 to +1.5 days'],
  ]
);

// ========================================
// 8. Port-Vessel Feasibility Matrix
// ========================================
writeCSV('08_port_vessel_feasibility.csv',
  ['port_id', 'port_name', 'max_draft_m', 'handysize_25_40k', 'supramax_40_65k', 'panamax_65_85k', 'capesize_100_200k', 'notes'],
  destinationPorts.map(p => [
    p.id, p.name, p.maxDraft,
    p.vesselFeasibility.handysize ? 'Feasible' : 'Not Feasible',
    p.vesselFeasibility.supramax ? 'Feasible' : 'Not Feasible',
    p.vesselFeasibility.panamax ? 'Feasible' : 'Not Feasible',
    p.vesselFeasibility.capesize ? 'Feasible' : 'Not Feasible',
    p.capesizeNote,
  ])
);

// ========================================
// Summary
// ========================================
console.log('\n========================================');
console.log('📊 Dataset Generation Complete!');
console.log('========================================');
console.log(`\nFiles written to: ${outDir}`);
console.log(`\nCSV Files:`);
const files = fs.readdirSync(outDir).filter(f => f.endsWith('.csv'));
files.forEach(f => {
  const stats = fs.statSync(path.join(outDir, f));
  const sizeKB = (stats.size / 1024).toFixed(1);
  console.log(`  📄 ${f} (${sizeKB} KB)`);
});
console.log(`\nTotal files: ${files.length}`);
