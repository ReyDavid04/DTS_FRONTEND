import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DtsCard, DtsButton, DtsSelect, DtsDatePicker } from '../../shared';
import { ReportsState } from './state/reports-state';
import { ReportsRequestService } from './services/reports-request.service';
import { DowntimeState } from '../downtime-register/state/downtime-state';
import { IDowntimeRecord } from '../../core/domain/interfaces/downtime-record.interface';

export interface HourRow {
  hour: string;
  standard: number;
  production: number;
  efficiency: number;
  mfgTop: string | null;
  mfgNr: string | null;
  dtReported: string;
  realTime: string;
  dtGenerated: string;
  dtNotReported: string;
  isCurrentHour?: boolean;
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

  // ─── Helper: format minutes as HH:MM ──────────────────────────────────────
  private fmtMin(min: number): string {
    if (!min || min <= 0) return '0:00';
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  // ─── Hourly rows from records ──────────────────────────────────────────────
  readonly hourlyRows = computed<HourRow[]>(() => {
    const records = this.reportsState.records();
    return records.map((r: IDowntimeRecord): HourRow => {
      const startDate = new Date(r.startTime);
      const startH    = isNaN(startDate.getTime()) ? '?' : startDate.getHours();
      const endDate   = new Date(r.endTime);
      const endH      = isNaN(endDate.getTime()) ? '?' : endDate.getHours();
      return {
        hour:          `${startH}:00 - ${endH}:00`,
        standard:      r.standardOutput        ?? 0,
        production:    r.currentOutput         ?? 0,
        efficiency:    +(r.efficiency          ?? 0).toFixed(2),
        mfgTop:        null,
        mfgNr:         null,
        dtReported:    this.fmtMin(r.downTimeReported   ?? 0),
        realTime:      this.fmtMin(r.downTimeReported   ?? 0),
        dtGenerated:   this.fmtMin(r.downTimeGenerated  ?? 0),
        dtNotReported: this.fmtMin(r.downTimeUnreported ?? 0),
      };
    });
  });

  readonly totals = computed(() => {
    const rows = this.hourlyRows();
    if (!rows.length) return { standard: 0, production: 0, efficiency: 0, dtGenerated: '0:00', dtNotReported: '0:00' };
    const totalDtGen = this.reportsState.records().reduce((s, r) => s + (r.downTimeGenerated  ?? 0), 0);
    const totalDtNr  = this.reportsState.records().reduce((s, r) => s + (r.downTimeUnreported ?? 0), 0);
    return {
      standard:      rows.reduce((s, r) => s + r.standard,   0),
      production:    rows.reduce((s, r) => s + r.production, 0),
      efficiency:    +(rows.reduce((s, r) => s + r.efficiency, 0) / rows.length).toFixed(2),
      dtGenerated:   this.fmtMin(totalDtGen),
      dtNotReported: this.fmtMin(totalDtNr),
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
    this.reportsReq.loadRecords({ line: this.lineControl.value ?? undefined });
  }

  setToday(): void {
    this.dateControl.setValue(new Date());
    this.applyFilter();
  }

  filterActionLog(): void { this.applyFilter(); }

  exportToExcel(): void { console.log('Export to Excel'); }

  ngOnInit(): void {
    this.reportsReq.loadRecords();
  }
}
