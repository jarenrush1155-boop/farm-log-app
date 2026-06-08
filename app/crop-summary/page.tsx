'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CropSummaryPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [sprayLogs, setSprayLogs] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    const { data: f } = await supabase.from('fields').select('*');
    const { data: ops } = await supabase.from('operations').select('*');
    const { data: sprays } = await supabase.from('spray_logs').select('*');
    const { data: r } = await supabase.from('irrigation_readings').select('*');

    setFields(f || []);
    setOperations(ops || []);
    setSprayLogs(sprays || []);
    setReadings(r || []);
  };

  const toggleField = (fieldId: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldId)) newExpanded.delete(fieldId);
    else newExpanded.add(fieldId);
    setExpandedFields(newExpanded);
  };

  const getFieldActivities = (fieldId: string) => {
    const fieldOps = operations
      .filter(op => op.field_id === fieldId && new Date(op.date).getFullYear() === selectedYear)
      .map(op => ({ ...op, type: 'operation' }));

    const fieldSprays = sprayLogs
      .filter(s => s.field_id === fieldId && new Date(s.date).getFullYear() === selectedYear)
      .map(s => ({ ...s, type: 'spray', acres: s.acres_sprayed }));

    return [...fieldOps, ...fieldSprays].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const getFieldHarvest = (fieldId: string) => {
    return operations.find(op => 
      op.field_id === fieldId && 
      op.operation_type === 'harvest' && 
      new Date(op.date).getFullYear() === selectedYear
    );
  };

  const getFieldWaterInches = (fieldId: string) => {
    const yearReadings = readings.filter(r => r.field_id === fieldId && new Date(r.date).getFullYear() === selectedYear);
    if (yearReadings.length < 2) return 0;
    const first = yearReadings[0].meter_reading || 0;
    const latest = yearReadings[yearReadings.length - 1].meter_reading || 0;
    const acreFeetDiff = latest - first;
    const acres = fields.find(f => f.id === fieldId)?.acres || 1;
    return (acreFeetDiff * 12) / acres;
  };

  const printFieldReport = (field: any) => {
    const activities = getFieldActivities(field.id);
    const waterInches = getFieldWaterInches(field.id);
    const harvest = getFieldHarvest(field.id);
    const crop = harvest?.details?.crop || harvest?.crop || '—';
    const yieldVal = harvest?.details?.yield || harvest?.yield || '—';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Please allow popups");

    let html = `
      <html><head><title>${field.name} Report - ${selectedYear}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { text-align: center; border-bottom: 3px solid #166534; padding-bottom: 15px; }
        .header { margin: 20px 0 30px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #333; padding: 10px; text-align: left; }
        th { background: #f0f0f0; }
      </style></head><body>
      <h1>${field.name} Report (${selectedYear})</h1>
      <div class="header">
        <p><strong>Acres:</strong> ${field.acres} | <strong>Type:</strong> ${field.type}</p>
        <p><strong>Crop:</strong> ${crop} | <strong>Yield:</strong> ${yieldVal} bu/ac</p>
        <p><strong>Water Applied:</strong> ${waterInches.toFixed(2)} inches</p>
      </div>
      <h2>All Activities</h2>
      <table>
        <tr><th>Date</th><th>Type</th><th>Acres</th><th>Details</th></tr>
    `;

    activities.forEach(activity => {
      let typeDisplay = '';
      let acres = activity.acres || (activity.type === 'spray' ? activity.acres_sprayed || '' : '');
      let details = '';

      if (activity.type === 'spray') {
        typeDisplay = 'Spray';
        details = activity.chemical_mix || '';
      } else {
        typeDisplay = activity.operation_type === 'strip_till' ? 'Strip Till' :
                      activity.operation_type === 'dirt_work' ? 'Dirt Work' :
                      activity.operation_type.charAt(0).toUpperCase() + activity.operation_type.slice(1);
        
        const d = activity.details || {};
        const detailParts = [];
        if (d.crop) detailParts.push(`Crop: ${d.crop}`);
        if (d.variety) detailParts.push(`Variety: ${d.variety}`);
        if (d.population) detailParts.push(`Population: ${d.population}`);
        if (d.yield) detailParts.push(`Yield: ${d.yield} bu/ac`);
        if (d.product1) detailParts.push(`${d.product1} @ ${d.rate1}`);
        if (d.product2) detailParts.push(`${d.product2} @ ${d.rate2}`);
        if (d.front_product) detailParts.push(`Front: ${d.front_product} @ ${d.front_rate}`);
        if (d.middle_product) detailParts.push(`Middle: ${d.middle_product} @ ${d.middle_rate}`);
        if (d.back_product) detailParts.push(`Back: ${d.back_product} @ ${d.back_rate}`);

        details = detailParts.join(' | ');
        if (activity.notes) details += ` | Notes: ${activity.notes}`;
      }

      html += `<tr><td>${activity.date}</td><td>${typeDisplay}</td><td>${acres}</td><td>${details}</td></tr>`;
    });

    html += `</table></body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-semibold">Crop Summary - {selectedYear}</h3>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
          className="p-3 border rounded-lg text-lg font-medium"
        >
          {[2026, 2025, 2024, 2023].map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {fields.map(field => {
          const activities = getFieldActivities(field.id);
          const waterInches = getFieldWaterInches(field.id);
          const harvest = getFieldHarvest(field.id);
          const crop = harvest?.details?.crop || harvest?.crop || '—';
          const yieldVal = harvest?.details?.yield || harvest?.yield || '—';
          const isExpanded = expandedFields.has(field.id);

          return (
            <div key={field.id} className="bg-white border rounded-xl shadow">
              <div className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => toggleField(field.id)}>
                <div>
                  <h4 className="font-semibold text-lg">{field.name} ({field.acres} acres - {field.type})</h4>
                  <p className="text-sm text-gray-600">
                    Crop: <strong>{crop}</strong> • Yield: <strong>{yieldVal} bu/ac</strong> • 
                    Water: {waterInches.toFixed(1)} inches • {activities.length} activities
                  </p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); printFieldReport(field); }} 
                  className="bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-emerald-600"
                >
                  Print Report
                </button>
              </div>

              {isExpanded && (
                <div className="border-t p-6 bg-gray-50">
                  <h5 className="font-medium mb-4">All Activities in {selectedYear}</h5>
                  <div className="space-y-4">
                    {activities.length > 0 ? activities.map(activity => {
                      const d = activity.details || {};
                      let displayText = '';

                      if (activity.type === 'spray') {
                        displayText = activity.chemical_mix;
                      } else {
                        const parts = [];
                        if (d.crop) parts.push(`Crop: ${d.crop}`);
                        if (d.variety) parts.push(`Variety: ${d.variety}`);
                        if (d.population) parts.push(`Population: ${d.population}`);
                        if (d.yield) parts.push(`Yield: ${d.yield} bu/ac`);
                        if (d.product1) parts.push(`${d.product1} @ ${d.rate1}`);
                        if (d.product2) parts.push(`${d.product2} @ ${d.rate2}`);
                        if (d.front_product) parts.push(`Front: ${d.front_product} @ ${d.front_rate}`);
                        if (d.middle_product) parts.push(`Middle: ${d.middle_product} @ ${d.middle_rate}`);
                        if (d.back_product) parts.push(`Back: ${d.back_product} @ ${d.back_rate}`);
                        displayText = parts.join(' | ');
                      }

                      return (
                        <div key={activity.id} className="bg-white p-5 rounded-lg border">
                          <div className="flex justify-between">
                            <strong className="capitalize">
                              {activity.type === 'spray' ? 'Spray' : 
                               activity.operation_type === 'strip_till' ? 'Strip Till' : 
                               activity.operation_type === 'dirt_work' ? 'Dirt Work' : activity.operation_type}
                            </strong>
                            <span>{activity.date}</span>
                          </div>
                          <p className="text-sm mt-2">{displayText || 'No additional details'}</p>
                          {activity.acres && <p className="text-sm mt-1"><strong>Acres:</strong> {activity.acres}</p>}
                          {activity.notes && <p className="text-sm mt-1"><strong>Notes:</strong> {activity.notes}</p>}
                        </div>
                      );
                    }) : <p className="text-gray-500">No activities logged for this field in {selectedYear}.</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}