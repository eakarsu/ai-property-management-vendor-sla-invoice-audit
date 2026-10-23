// Feature pack: search/filter, CSV/JSON export, deterministic domain insights.
// No provider calls: insights are labelled deterministic fallback (aiGenerated:false).
export function displayValue(v){ if(v===null||v===undefined||v==="") return ""; if(v instanceof Date) return v.toISOString(); return typeof v==="object" ? JSON.stringify(v) : String(v); }
export function filterRecords(rows,{q="",status="",risk=""}={}){
  const needle=String(q||"").trim().toLowerCase();
  return (rows||[]).filter(r=>{
    if(status && String(r.status??r.state??"")!==status) return false;
    if(risk && String(r.risk??"")!==risk) return false;
    if(!needle) return true;
    return JSON.stringify(r).toLowerCase().includes(needle);
  });
}
export function recordsToCsv(rows){
  if(!rows?.length) return "id\n";
  const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const esc=v=>{ const s=v===null||v===undefined?"":(typeof v==="object"?JSON.stringify(v):String(v)); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
  return [cols.join(","),...rows.map(r=>cols.map(c=>esc(r[c])).join(","))].join("\n")+"\n";
}
export function recordsToJson(rows){ return JSON.stringify(rows??[],null,2); }
export function buildInsights(rows,{domainName="Records",now=new Date()}={}){
  const list=rows||[];
  const closed=new Set(["Closed","DONE","Done","closed","Approved"]);
  const open=list.filter(r=>!closed.has(String(r.status??r.state??"")));
  const highRisk=list.filter(r=>["High","Critical"].includes(String(r.risk??"")));
  const totalAmount=list.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const dueOf=r=>r.due_date||r.due_at||r.dueDate||null;
  const overdue=open.filter(r=>{ const d=dueOf(r); return d && new Date(d) < now; });
  const top=[...list].sort((a,b)=>(Number(b.amount)||0)-(Number(a.amount)||0)).slice(0,5)
    .map(r=>({reference:String(r.reference??r.id??""),status:displayValue(r.status??r.state??""),risk:displayValue(r.risk??""),amount:Number(r.amount)||0}));
  const base={aiGenerated:false,label:"Deterministic fallback — not AI-generated"};
  return { ...base, generatedBy:"deterministic-fallback", domainName, recordCount:list.length,
    sections:[
      {...base,id:"risk-triage",title:`${domainName} — risk triage`,summary: highRisk.length? `${highRisk.length} high/critical-risk record(s) need review first.` : "No high/critical-risk records in the current set.",metrics:{total:list.length,open:open.length,highRisk:highRisk.length,totalAmount},items:top},
      {...base,id:"value-ageing",title:`${domainName} — value and ageing review`,summary: overdue.length? `${overdue.length} open record(s) are past their due date.` : "No open records are past their due date.",metrics:{total:list.length,overdue:overdue.length,totalAmount,averageAmount:list.length?Math.round((totalAmount/list.length)*100)/100:0},items:overdue.slice(0,5).map(r=>({reference:String(r.reference??r.id??""),due:displayValue(dueOf(r)),amount:Number(r.amount)||0}))},
      {...base,id:"next-follow-ups",title:`${domainName} — next follow-ups`,summary: open.length? `Work the ${Math.min(open.length,5)} highest-value open record(s) next.` : "Nothing open to follow up.",metrics:{open:open.length,closed:list.length-open.length,highRisk:highRisk.length},items:top.filter(r=>!closed.has(String(r.status)))},
    ]};
}
export function mountFeaturePack(app,{pool,auth,fetchRecords,domainName="Records"}){
  const guard=typeof auth==="function"?[auth]:[];
  app.get("/api/feature-pack/search",...guard,async(req,res,next)=>{ try{ const rows=await fetchRecords(pool); res.json({items:filterRecords(rows,req.query||{}),total:filterRecords(rows,req.query||{}).length}); }catch(e){ next(e); } });
  app.get("/api/feature-pack/export",...guard,async(req,res,next)=>{ try{ const rows=filterRecords(await fetchRecords(pool),req.query||{}); const format=String(req.query?.format||"json").toLowerCase();
    if(format==="csv"){ res.setHeader("Content-Type","text/csv; charset=utf-8"); res.setHeader("Content-Disposition","attachment; filename=records.csv"); return res.send(recordsToCsv(rows)); }
    if(format==="json"){ res.setHeader("Content-Disposition","attachment; filename=records.json"); return res.json({records:rows}); }
    return res.status(422).json({error:"format must be csv or json"}); }catch(e){ next(e); } });
  app.get("/api/feature-pack/insights",...guard,async(req,res,next)=>{ try{ res.json({insights:buildInsights(await fetchRecords(pool),{domainName})}); }catch(e){ next(e); } });
}
