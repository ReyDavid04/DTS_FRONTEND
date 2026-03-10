import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalStateService } from '../../core/application';
import { HomeState } from './state/home-state';
import { HomeRequestService } from './services/home-request.service';
import { DowntimeState } from '../downtime-register/state/downtime-state';
import {
  NgApexchartsModule,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexPlotOptions,
  ApexStroke,
  ApexXAxis,
  ApexYAxis,
  ApexTooltip,
  ApexTheme,
} from 'ng-apexcharts';

const DARK_CHART = { background: 'transparent', foreColor: '#94a3b8' };
const DEPT_COLORS = ['#3a57e8', '#6366f1', '#f97316', '#a855f7', '#22d3ee', '#f59e0b', '#10b981'];
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

@Component({
  selector: 'foxcode-home',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly globalState = inject(GlobalStateService);
  private readonly homeState   = inject(HomeState);
  private readonly homeReq     = inject(HomeRequestService);
  private readonly dtState     = inject(DowntimeState);

  readonly loading = this.homeState.loading;

  //  Derived: total downtime this week 
  readonly totalMinutes = computed(() =>
    this.homeState.records().reduce((s, r) => s + (r.downTimeGenerated ?? 0), 0)
  );

  readonly totalFormatted = computed(() => {
    const m = this.totalMinutes();
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  });

  readonly totalPct = computed(() => Math.min(100, Math.round((this.totalMinutes() / 2400) * 100)));

  //  Pareto Chart 
  readonly paretoOptions = computed(() => {
    const records = this.homeState.records();
    const reasonMap = new Map<string, number>();
    for (const r of records) {
      for (const c of r.classification ?? []) {
        reasonMap.set(c.reason, (reasonMap.get(c.reason) ?? 0) + (c.downTimeGenerated ?? 0));
      }
    }
    const sorted  = [...reasonMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels  = sorted.map(([reason]) => reason);
    const values  = sorted.map(([, v]) => Math.round(v));
    const total   = values.reduce((s, v) => s + v, 0);
    let cumulative = 0;
    const cumPct = values.map(v => {
      cumulative += v;
      return total > 0 ? Math.round((cumulative / total) * 100) : 0;
    });

    return {
      series: [
        { name: 'Duracion (min)', type: 'bar',  data: values },
        { name: '% Acumulado',    type: 'line', data: cumPct },
      ],
      chart: { type: 'bar', height: 260, toolbar: { show: false }, ...DARK_CHART } as ApexChart,
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } } as ApexPlotOptions,
      colors: ['#3a57e8', '#f97316'],
      dataLabels: {
        enabled: true, enabledOnSeries: [0],
        formatter: (val: number) => total > 0 ? `${Math.round((val / total) * 100)}%` : '0%',
        style: { fontSize: '11px', colors: ['#fff'] },
      } as ApexDataLabels,
      stroke: { width: [0, 2], curve: 'smooth' } as ApexStroke,
      xaxis: {
        categories: labels.length ? labels : ['Sin datos'],
        labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
      } as ApexXAxis,
      yaxis: [
        { labels: { style: { colors: '#94a3b8', fontSize: '11px' }, formatter: (v: number) => v + ' min' }, axisBorder: { show: false } },
        { opposite: true, min: 0, max: 100, labels: { style: { colors: '#f97316', fontSize: '11px' }, formatter: (v: number) => v + '%' } },
      ] as ApexYAxis,
      grid: { borderColor: '#ffffff0f', strokeDashArray: 4 } as ApexGrid,
      legend: { show: false },
      fill: { opacity: [0.85, 1] } as ApexFill,
      tooltip: { theme: 'dark' } as ApexTooltip,
      theme: { mode: 'dark' } as ApexTheme,
    };
  });

  //  Donut Chart 
  readonly donutData = computed(() => {
    const records = this.homeState.records();
    const deptMap = new Map<string, number>();
    for (const r of records) {
      for (const c of r.classification ?? []) {
        deptMap.set(c.department, (deptMap.get(c.department) ?? 0) + (c.downTimeGenerated ?? 0));
      }
    }
    const sorted = [...deptMap.entries()].sort((a, b) => b[1] - a[1]);
    const total  = sorted.reduce((s, [, v]) => s + v, 0);
    return sorted.map(([name, v], i) => ({
      name,
      minutes: Math.round(v),
      pct: total > 0 ? Math.round((v / total) * 100) : 0,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
    }));
  });

  readonly donutOptions = computed(() => {
    const data  = this.donutData();
    const total = data.reduce((s, d) => s + d.minutes, 0);
    const h     = Math.floor(total / 60);
    const m     = Math.round(total % 60);
    const label = h > 0 ? `${h}h ${m}m` : `${m}m`;

    return {
      series: data.length ? data.map(d => d.minutes) : [1],
      chart: { type: 'donut', height: 200, ...DARK_CHART } as ApexChart,
      colors: data.length ? data.map(d => d.color) : ['#3d3d3d'],
      labels: data.length ? data.map(d => d.name) : ['Sin datos'],
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: { show: true, label: 'TOTAL', color: '#94a3b8', fontSize: '11px', formatter: () => label },
              value: { color: '#fff', fontSize: '22px', fontWeight: 700 },
            },
          },
        },
      } as ApexPlotOptions,
      dataLabels: { enabled: false } as ApexDataLabels,
      legend: { show: false },
      stroke: { width: 2, colors: ['#1e1e2e'] } as ApexStroke,
      tooltip: { theme: 'dark' } as ApexTooltip,
      theme: { mode: 'dark' } as ApexTheme,
    };
  });

  readonly departments = this.donutData;

  //  Heatmap 
  readonly heatmapOptions = computed(() => {
    const records = this.homeState.records();
    const grid: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
    for (const r of records) {
      const d = new Date(r.startTime);
      if (isNaN(d.getTime())) continue;
      const jsDay  = d.getDay();
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
      const hourBkt = Math.floor(d.getHours() / 2);
      grid[dayIdx][hourBkt]++;
    }
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const series = [...days].reverse().map((name, i) => ({
      name,
      data: grid[days.length - 1 - i].map(v => v),
    }));

    return {
      series,
      chart: { type: 'heatmap', height: 160, toolbar: { show: false }, ...DARK_CHART } as ApexChart,
      dataLabels: { enabled: false } as ApexDataLabels,
      colors: ['#3a57e8'],
      xaxis: {
        categories: ['00:00','02:00','04:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'],
        labels: { style: { colors: '#94a3b8', fontSize: '10px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
      } as ApexXAxis,
      yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '10px' } } } as ApexYAxis,
      grid: { padding: { top: 0, right: 0, bottom: 0, left: 0 } } as ApexGrid,
      tooltip: { theme: 'dark' } as ApexTooltip,
      theme: { mode: 'dark' } as ApexTheme,
      plotOptions: {
        heatmap: {
          shadeIntensity: 0.6, radius: 3,
          colorScale: { ranges: [
            { from: 0, to: 0,  color: '#1e1e2e', name: 'Ninguno' },
            { from: 1, to: 2,  color: '#1e3a5f', name: 'Bajo'    },
            { from: 3, to: 5,  color: '#2e5fa3', name: 'Medio'   },
            { from: 6, to: 99, color: '#3a57e8', name: 'Alto'    },
          ]},
        },
      } as ApexPlotOptions,
    };
  });

  //  Area Chart (daily trend current week) 
  readonly trendOptions = computed(() => {
    const records = this.homeState.records();
    const reported:   number[] = Array(7).fill(0);
    const unreported: number[] = Array(7).fill(0);
    for (const r of records) {
      const d = new Date(r.startTime);
      if (isNaN(d.getTime())) continue;
      const jsDay  = d.getDay();
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
      reported[dayIdx]   += r.downTimeReported   ?? 0;
      unreported[dayIdx] += r.downTimeUnreported ?? 0;
    }

    return {
      series: [
        { name: 'Reportado',    data: reported.map(v => Math.round(v))   },
        { name: 'No Reportado', data: unreported.map(v => Math.round(v)) },
      ],
      chart: { type: 'area', height: 200, toolbar: { show: false }, ...DARK_CHART } as ApexChart,
      colors: ['#3a57e8', '#475569'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } } as ApexFill,
      stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 5] } as ApexStroke,
      dataLabels: { enabled: false } as ApexDataLabels,
      xaxis: {
        categories: DAY_LABELS,
        labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
      } as ApexXAxis,
      yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '11px' }, formatter: (v: number) => v + 'min' }, axisBorder: { show: false } } as ApexYAxis,
      grid: { borderColor: '#ffffff0f', strokeDashArray: 4 } as ApexGrid,
      legend: { show: false },
      tooltip: { theme: 'dark' } as ApexTooltip,
      theme: { mode: 'dark' } as ApexTheme,
    };
  });

  ngOnInit(): void {
    this.homeReq.loadAll();
  }
}
