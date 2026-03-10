import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DtsCard, DtsButton, DtsSelect, DtsDatePicker } from '../../shared';
import { TrendsState } from './state/trends-state';
import { TrendsRequestService } from './services/trends-request.service';
import { DowntimeState } from '../downtime-register/state/downtime-state';
import { IDowntimeRecord } from '../../core/domain/interfaces/downtime-record.interface';

export interface WeekData  { label: string; dt: number; predicted: boolean; }
export interface CauseTrend { cause: string; dept: string; currentWeek: number; prevWeek: number; trend: 'up' | 'down' | 'stable'; predicted: number; }
export interface Insight    { type: 'warning' | 'success' | 'info'; icon: string; title: string; description: string; }

@Component({
  selector: 'dts-trends',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DtsCard, DtsButton, DtsSelect, DtsDatePicker],
  templateUrl: './trends.html',
  styles: ``,
})
export class Trends implements OnInit {
  private readonly trendsState = inject(TrendsState);
  private readonly trendsReq   = inject(TrendsRequestService);
  private readonly dtState     = inject(DowntimeState);

  lineControl  = new FormControl('Todas');
  deptControl  = new FormControl('Todos');
  startControl = new FormControl<Date | null>(null);

  readonly loading = this.trendsState.loading;

  //  Filter options from API 
  readonly lines = computed(() => [
    { _id: 'Todas', name: 'Todas las lineas' },
    ...this.dtState.lines().map(l => ({ _id: l.name, name: l.name })),
  ]);

  readonly depts = computed(() => [
    { _id: 'Todos', name: 'Todos' },
    ...this.dtState.departments().map(d => ({ _id: d.department, name: d.department })),
  ]);

  //  Helper: current ISO week 
  private currentWeek(): number {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const y1 = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil(((utc.getTime() - y1.getTime()) / 86_400_000 + 1) / 7);
  }

  //  Weekly bar chart data 
  readonly weeklyData = computed<WeekData[]>(() => {
    const records = this.trendsState.records();
    const weekMap = new Map<number, number>();
    for (const r of records) {
      weekMap.set(r.week, (weekMap.get(r.week) ?? 0) + (r.downTimeGenerated ?? 0));
    }
    const weeks = [...weekMap.entries()].sort((a, b) => a[0] - b[0]);
    return weeks.map(([w, dt]) => ({ label: `Sem ${w}`, dt: Math.round(dt), predicted: false }));
  });

  readonly maxDt = computed(() => {
    const data = this.weeklyData();
    return data.length ? Math.max(...data.map(w => w.dt)) : 1;
  });

  barWidth(dt: number): number {
    return Math.round((dt / this.maxDt()) * 100);
  }

  //  KPI values 
  readonly currentWeekDt = computed(() => {
    const cw = this.currentWeek();
    return this.weeklyData().find(w => w.label === `Sem ${cw}`)?.dt ?? 0;
  });

  readonly prevWeekDt = computed(() => {
    const cw = this.currentWeek();
    return this.weeklyData().find(w => w.label === `Sem ${cw - 1}`)?.dt ?? 0;
  });

  /** Simple linear prediction: current_week + (current - prev) */
  readonly predictedNextDt = computed(() => {
    const curr = this.currentWeekDt();
    const prev = this.prevWeekDt();
    const predicted = curr + (curr - prev);
    return predicted > 0 ? predicted : 0;
  });

  readonly kpiTrend = computed(() => {
    const curr = this.currentWeekDt();
    const prev = this.prevWeekDt();
    if (prev === 0) return { value: '0.0', up: false };
    const delta = ((curr - prev) / prev) * 100;
    return { value: Math.abs(delta).toFixed(1), up: delta > 0 };
  });

  readonly expectedReduction = computed(() => {
    const curr = this.currentWeekDt();
    const next = this.predictedNextDt();
    if (curr === 0) return '0.0';
    const r = ((curr - next) / curr) * 100;
    return r.toFixed(1);
  });

  //  Cause trends (compare current vs previous week by dept+reason) 
  readonly causeTrends = computed<CauseTrend[]>(() => {
    const records = this.trendsState.records();
    const cw = this.currentWeek();

    const currRecords = records.filter(r => r.week === cw);
    const prevRecords = records.filter(r => r.week === cw - 1);

    const aggregate = (recs: IDowntimeRecord[]): Map<string, { dept: string; total: number }> => {
      const m = new Map<string, { dept: string; total: number }>();
      for (const r of recs) {
        for (const c of r.classification ?? []) {
          const key = `${c.department}|${c.reason}`;
          const existing = m.get(key);
          if (existing) existing.total += c.downTimeGenerated ?? 0;
          else m.set(key, { dept: c.department, total: c.downTimeGenerated ?? 0 });
        }
      }
      return m;
    };

    const currMap = aggregate(currRecords);
    const prevMap = aggregate(prevRecords);

    const allKeys = new Set([...currMap.keys(), ...prevMap.keys()]);
    const trends: CauseTrend[] = [];

    for (const key of allKeys) {
      const [dept, cause] = key.split('|');
      const curr = Math.round(currMap.get(key)?.total ?? 0);
      const prev = Math.round(prevMap.get(key)?.total ?? 0);
      const delta = curr - prev;
      const trend: 'up' | 'down' | 'stable' = delta > 5 ? 'up' : delta < -5 ? 'down' : 'stable';
      const predicted = Math.max(0, Math.round(curr + delta * 0.7));
      trends.push({ cause, dept, currentWeek: curr, prevWeek: prev, trend, predicted });
    }

    return trends.sort((a, b) => b.currentWeek - a.currentWeek).slice(0, 8);
  });

  //  Auto-generated insights 
  readonly insights = computed<Insight[]>(() => {
    const trends = this.causeTrends();
    const result: Insight[] = [];

    const topUp   = trends.filter(t => t.trend === 'up').sort((a, b) => (b.currentWeek - b.prevWeek) - (a.currentWeek - a.prevWeek))[0];
    const topDown = trends.filter(t => t.trend === 'down').sort((a, b) => (a.currentWeek - a.prevWeek) - (b.currentWeek - b.prevWeek))[0];

    if (topUp) {
      const pct = topUp.prevWeek > 0 ? ((topUp.currentWeek - topUp.prevWeek) / topUp.prevWeek * 100).toFixed(1) : '--';
      result.push({
        type: 'warning', icon: 'ri-alarm-warning-line',
        title: `${topUp.dept}  ${topUp.cause} en aumento`,
        description: `Esta causa subio ${pct}% vs. semana anterior. Se proyecta ${topUp.predicted} min la proxima semana.`,
      });
    }
    if (topDown) {
      result.push({
        type: 'success', icon: 'ri-trending-down-line',
        title: `${topDown.dept}  ${topDown.cause} con tendencia positiva`,
        description: `Reduccion: ${topDown.prevWeek}  ${topDown.currentWeek} min. Proyeccion proxima semana: ${topDown.predicted} min.`,
      });
    }
    const totalCurr = trends.reduce((s, t) => s + t.currentWeek, 0);
    const totalPrev = trends.reduce((s, t) => s + t.prevWeek, 0);
    if (totalCurr > 0 && totalPrev > 0) {
      const pct = ((totalCurr - totalPrev) / totalPrev * 100).toFixed(1);
      result.push({
        type: 'info', icon: 'ri-bar-chart-grouped-line',
        title: 'Resumen semanal de tiempo muerto',
        description: `Total esta semana: ${totalCurr} min vs ${totalPrev} min semana anterior (${pct > '0' ? '+' : ''}${pct}%).`,
      });
    }

    return result;
  });

  insightBg: Record<string, string> = {
    warning: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40',
    success: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40',
    info:    'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40',
  };
  insightIcon: Record<string, string> = {
    warning: 'text-amber-500',
    success: 'text-green-500',
    info:    'text-blue-500',
  };

  applyFilter(): void { this.trendsReq.loadAll(); }

  ngOnInit(): void {
    this.trendsReq.loadAll();
  }
}
