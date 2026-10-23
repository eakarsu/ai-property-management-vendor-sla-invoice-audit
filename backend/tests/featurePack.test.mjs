import test from "node:test";
import assert from "node:assert/strict";
import { filterRecords, recordsToCsv, recordsToJson, buildInsights } from "../featurePack.mjs";
const rows=[{id:1,reference:"A-1",status:"Open",risk:"High",amount:0,active:false,note:""},{id:2,reference:"B-2",status:"Closed",risk:"Low",amount:250,active:true,note:"done"}];
test("search/filter preserves false/0/empty records",()=>{ assert.equal(filterRecords(rows,{q:"a-1"}).length,1); assert.equal(filterRecords(rows,{status:"Closed"}).length,1); assert.equal(filterRecords(rows,{q:"false"}).length,1); });
test("csv/json export preserves 0 and false",()=>{ const csv=recordsToCsv(rows); assert.match(csv,/A-1,Open,High,0,false/); assert.equal(JSON.parse(recordsToJson(rows))[0].amount,0); assert.equal(JSON.parse(recordsToJson(rows))[0].active,false); });
test("insights are labelled deterministic fallback with 3 sections",()=>{ const r=buildInsights(rows,{domainName:"Test"}); assert.equal(r.aiGenerated,false); assert.equal(r.sections.length,3); assert.ok(r.sections.every(s=>s.aiGenerated===false&&s.label.includes("not AI-generated"))); assert.equal(r.sections[0].metrics.totalAmount,250); });
test("empty input yields readable zeroed insights",()=>{ const r=buildInsights([],{domainName:"Test"}); assert.equal(r.recordCount,0); assert.equal(r.sections[0].metrics.total,0); });
