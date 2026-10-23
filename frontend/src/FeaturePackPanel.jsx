import React,{useState} from 'react';
export function formatCell(v){ if(v===null||v===undefined||v==="") return "Empty"; return typeof v==="object"?JSON.stringify(v):String(v); }
export default function FeaturePackPanel({api,tokenKey}){
  const [q,setQ]=useState(""); const [status,setStatus]=useState(""); const [items,setItems]=useState(null); const [insights,setInsights]=useState(null); const [error,setError]=useState("");
  async function search(){ setError(""); try{ const d=await api(`/api/feature-pack/search?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`); setItems(d.items||[]);}catch(e){ setError(e.message);} }
  async function loadInsights(){ setError(""); try{ const d=await api(`/api/feature-pack/insights`); setInsights(d.insights);}catch(e){ setError(e.message);} }
  async function download(format){ try{ const token=localStorage.getItem(tokenKey); const r=await fetch(`/api/feature-pack/export?format=${format}&q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`,{headers:token?{Authorization:`Bearer ${token}`}:{}}); if(!r.ok) throw new Error(`Export failed (${r.status})`); const blob=await r.blob(); const u=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=u; a.download=`records.${format}`; a.click(); URL.revokeObjectURL(u);}catch(e){ setError(e.message);} }
  return <section aria-label="Record search, export and deterministic insights" className="panel">
    <h3>Search, export and insights</h3><p>Deterministic fallback — not AI-generated (aiGenerated: false). Zero, false and empty values are shown, not hidden.</p>
    {error&&<p role="alert">{error}</p>}
    <div><label>Search <input aria-label="Search records" value={q} onChange={e=>setQ(e.target.value)}/></label>
    <label> Status <select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option>Open</option><option>Investigating</option><option>Review</option><option>Approved</option><option>Closed</option></select></label>
    <button type="button" onClick={search}>Search</button><button type="button" onClick={()=>download("csv")}>Export CSV</button><button type="button" onClick={()=>download("json")}>Export JSON</button><button type="button" onClick={loadInsights}>Load insights</button></div>
    {items&&<div aria-label="Search results"><p>{items.length} record(s) found</p><ul>{items.slice(0,20).map((r,i)=><li key={r.id??i}>{formatCell(r.reference??r.id)} · {formatCell(r.status??r.state)} · {formatCell(r.risk)} · {formatCell(r.amount)}</li>)}</ul></div>}
    {insights&&<div aria-label="Deterministic insights">{insights.sections.map(s=><article key={s.id} aria-label={s.title}><h4>{s.title}</h4><p>{s.label} · aiGenerated: {String(s.aiGenerated)}</p><p>{s.summary}</p><dl>{Object.entries(s.metrics).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{formatCell(v)}</dd></div>)}</dl><ul>{(s.items||[]).map((it,i)=><li key={i}>{Object.entries(it).map(([k,v])=>`${k}: ${formatCell(v)}`).join(" · ")}</li>)}</ul></article>)}</div>}
  </section>;
}
