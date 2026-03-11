import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DtsCard, DtsButton, DtsSelect, DtsDatePicker } from '../../shared';
import { ReportsState } from './state/reports-state';
import { ReportsRequestService } from './services/reports-request.service';
import { DowntimeState } from '../downtime-register/state/downtime-state';

export interface HourRow {
  hour: string;
  standard: number;
  production: number;
  efficiency: number;
  /** Downtime minutes per department: { 'TEST': 5, 'FACILITIES': 5, ... } */
  depts: Record<string, number>;
  dtReported: string;
  realTime: string;
  dtGenerated: string;
  dtNotReported: string;
  isCurrentHour?: boolean;
  hasRecord: boolean;
}

export interface ActionLogRow {
  department: string;
  cause: string;
  start: string;
  startHour: string;
  endHour: string;
  total: string;
  actionNum: number;
  status: 'Abierto' | 'Cerrado';
  dueDate: string;
  overdueTime: string;
  closeDate: string;
  rca: string;
  ica: string;
  pca: string;
}

@Component({
  selector: 'dts-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DtsCard, DtsButton, DtsSelect, DtsDatePicker],
  templateUrl: './reports.html',
  styles: ``,
})
export class Reports implements OnInit {
  private readonly reportsState = inject(ReportsState);
  private readonly reportsReq   = inject(ReportsRequestService);
  private readonly dtState      = inject(DowntimeState);

  activeTab = signal<'hourly' | 'actionlog'>('hourly');

  dateControl      = new FormControl(new Date());
  lineControl      = new FormControl('Todas');
  deptControl      = new FormControl('Todos');
  statusControl    = new FormControl('Todos');
  startDateControl = new FormControl<Date | null>(null);
  endDateControl   = new FormControl<Date | null>(null);

  readonly loading = this.reportsState.loading;

  // ─── Filter options from API ───────────────────────────────────────────────
  readonly lines = computed(() => [
    { _id: 'Todas', name: 'Todas' },
    ...this.dtState.lines().map(l => ({ _id: l.name, name: l.name })),
  ]);

  readonly departments = computed(() => [
    { _id: 'Todos', name: 'Todos' },
    ...this.dtState.departments().map(d => ({ _id: d.department, name: d.department })),
  ]);

  readonly statuses = [
    { _id: 'Todos',   name: 'Todos'   },
    { _id: 'Abierto', name: 'Abierto' },
    { _id: 'Cerrado', name: 'Cerrado' },
  ];

  // ─── Helper: format minutes as plain integer ─────────────────────────────
  private fmtMin(min: number): string {
    if (!min || min <= 0) return '0';
    return String(Math.round(min));
  }

  // ─── Unique dept columns for the selected day ────────────────────────────
  readonly deptColumns = computed<string[]>(() => {
    const records      = this.reportsState.records();
    const selectedDate = this.dateControl.value ? new Date(this.dateControl.value) : new Date();
    const dayRecords   = records.filter(r => {
      const d = new Date(r.startTime);
      return !isNaN(d.getTime()) && d.toDateString() === selectedDate.toDateString();
    });
    const seen = new Set<string>();
    for (const r of dayRecords) {
      for (const c of r.classification ?? []) {
        if (c.department) seen.add(c.department);
      }
    }
    return [...seen].sort();
  });

  // ─── Hourly rows: one row per hour 0..currentHour ─────────────────────────
  readonly hourlyRows = computed<HourRow[]>(() => {
    const records      = this.reportsState.records();
    const lines        = this.dtState.lines();
    const selectedDate = this.dateControl.value ? new Date(this.dateControl.value) : new Date();
    const now          = new Date();
    const isToday      = selectedDate.toDateString() === now.toDateString();

    // Filter to the selected day
    const dayRecords = records.filter(r => {
      const d = new Date(r.startTime);
      return !isNaN(d.getTime()) && d.toDateString() === selectedDate.toDateString();
    });

    // Render up to currentHour for today, full day (0-23) for past dates
    const lastHour = isToday ? now.getHours() : 23;
    const rows: HourRow[] = [];

    for (let h = 0; h <= lastHour; h++) {
      // Find the record that starts in this hour slot
      const record = dayRecords.find(r => new Date(r.startTime).getHours() === h);

      // ── STD from DB: line → stage → hourlyStandard matching hour h ──────
      let stdDb = 0;
      if (record) {
        if (lines.length > 0 && record.line) {
          const lineObj  = lines.find(l => l.name === record.line);
          const stageObj = record.stage
            ? lineObj?.stages.find(s => s.name === record.stage)
            : lineObj?.stages[0];
          const hs = stageObj?.hourlyStandards.find(
            x => h >= x.startHour && h < x.endHour,
          );
          stdDb = hs?.standard ?? record.standardOutput ?? 0;
        } else {
          stdDb = record.standardOutput ?? 0;
        }
      }

      const production   = record?.currentOutput     ?? 0;
      const eff          = stdDb > 0 ? +(production / stdDb * 100).toFixed(2) : 0;
      const dtGenerated  = record?.downTimeGenerated  ?? 0;
      const dtReported   = record?.downTimeReported   ?? 0;
      const dtUnreported = record?.downTimeUnreported ?? 0;

      // Tiempo Real = 60 min period - DT Generado (actual productive minutes)
      const realTimeMin  = Math.max(0, 60 - dtGenerated);

      // Build dept minutes map for this hour
      const depts: Record<string, number> = {};
      if (record?.classification?.length) {
        for (const c of record.classification) {
          if (c.department) {
            depts[c.department] = (depts[c.department] ?? 0) + (c.downTimeGenerated ?? 0);
          }
        }
      }

      rows.push({
        hour:          `${h}:00 - ${h + 1}:00`,
        standard:      stdDb,
        production,
        efficiency:    record ? eff : 0,
        depts,
        dtReported:    this.fmtMin(dtReported),
        realTime:      record ? this.fmtMin(realTimeMin) : '—',
        dtGenerated:   this.fmtMin(dtGenerated),
        dtNotReported: this.fmtMin(dtUnreported),
        isCurrentHour: isToday && h === now.getHours(),
        hasRecord:     !!record,
      });
    }

    return rows;
  });

  readonly totals = computed(() => {
    const rows = this.hourlyRows().filter(r => r.hasRecord);
    if (!rows.length) return {
      standard: 0, production: 0, efficiency: 0,
      dtReported: '0', realTime: '0',
      dtGenerated: '0', dtNotReported: '0',
      deptTotals: {} as Record<string, number>,
    };

    // Raw minute sums from the filtered day records
    const dayRecs = this.reportsState.records().filter(r => {
      const d = new Date(r.startTime);
      const sel = this.dateControl.value ? new Date(this.dateControl.value) : new Date();
      return !isNaN(d.getTime()) && d.toDateString() === sel.toDateString();
    });
    const totDtGen = dayRecs.reduce((s, r) => s + (r.downTimeGenerated  ?? 0), 0);
    const totDtNr  = dayRecs.reduce((s, r) => s + (r.downTimeUnreported ?? 0), 0);
    const totDtRep = dayRecs.reduce((s, r) => s + (r.downTimeReported   ?? 0), 0);
    const totReal  = dayRecs.reduce((s, r) => s + Math.max(0, 60 - (r.downTimeGenerated ?? 0)), 0);

    const totalStd  = rows.reduce((s, r) => s + r.standard,   0);
    const totalProd = rows.reduce((s, r) => s + r.production, 0);
    const avgEff    = totalStd > 0 ? +(totalProd / totalStd * 100).toFixed(2) : 0;

    // Sum dept minutes across all day rows
    const deptTotals: Record<string, number> = {};
    for (const r of rows) {
      for (const [dept, min] of Object.entries(r.depts)) {
        deptTotals[dept] = (deptTotals[dept] ?? 0) + min;
      }
    }

    return {
      standard:      totalStd,
      production:    totalProd,
      efficiency:    avgEff,
      dtReported:    this.fmtMin(totDtRep),
      realTime:      this.fmtMin(totReal),
      dtGenerated:   this.fmtMin(totDtGen),
      dtNotReported: this.fmtMin(totDtNr),
      deptTotals,
    };
  });

  // ─── Action log from classification entries ───────────────────────────────
  readonly actionLog = computed<ActionLogRow[]>(() => {
    const records = this.reportsState.records();
    const rows: ActionLogRow[] = [];
    let actionNum = 1;
    for (const r of records) {
      const startDate  = new Date(r.startTime);
      const endDate    = new Date(r.endTime);
      const fmtDate    = (d: Date) => isNaN(d.getTime()) ? '--' : d.toLocaleDateString('es-MX');
      const fmtTime    = (d: Date) => isNaN(d.getTime()) ? '--' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const totalMin   = (r.downTimeReported ?? 0);
      for (const c of r.classification ?? []) {
        rows.push({
          department:   c.department,
          cause:        c.reason,
          start:        fmtDate(startDate),
          startHour:    fmtTime(startDate),
          endHour:      fmtTime(endDate),
          total:        this.fmtMin(c.downTimeGenerated ?? totalMin),
          actionNum:    actionNum++,
          status:       'Abierto',
          dueDate:      '--',
          overdueTime:  '--',
          closeDate:    '--',
          rca: '', ica: '', pca: '',
        });
      }
    }
    return rows;
  });

  // ─── Top 3 departments by total downtime ──────────────────────────────────
  readonly top3Depts = computed(() => {
    const records = this.reportsState.records();
    const deptMap = new Map<string, number>();
    for (const r of records) {
      for (const c of r.classification ?? []) {
        deptMap.set(c.department, (deptMap.get(c.department) ?? 0) + (c.downTimeGenerated ?? 0));
      }
    }
    const colors = ['#ef4444', '#f97316', '#f59e0b'];
    return [...deptMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, min], i) => ({ name, time: this.fmtMin(min), color: colors[i] ?? '#94a3b8' }));
  });

  applyFilter(): void {
    this.reportsReq.loadRecords({
      line: this.lineControl.value ?? undefined,
      date: this.dateControl.value ?? new Date(),
    });
  }

  setToday(): void {
    this.dateControl.setValue(new Date());
    this.applyFilter();
  }

  filterActionLog(): void { this.applyFilter(); }

  exportToExcel(): void { console.log('Export to Excel'); }

  ngOnInit(): void {
    this.reportsReq.loadRecords({ date: new Date() });
  }
}
