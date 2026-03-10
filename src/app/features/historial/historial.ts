import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  DtsCard,
  DtsButton,
  DtsInput,
  DtsSelect,
} from '../../shared';
import { HistorialState } from './state/historial-state';
import { HistorialRequestService } from './services/historial-request.service';
import { DowntimeState } from '../downtime-register/state/downtime-state';
import { DowntimeRequestService } from '../downtime-register/services/downtime-request.service';

@Component({
  selector: 'dts-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DtsCard, DtsButton, DtsInput, DtsSelect],
  templateUrl: './historial.html',
  styles: ``,
})
export class Historial implements OnInit {
  private readonly historialState = inject(HistorialState);
  private readonly historialService = inject(HistorialRequestService);
  private readonly downtimeState = inject(DowntimeState);
  private readonly downtimeRequestService = inject(DowntimeRequestService);

  readonly records$ = this.historialState.records;
  readonly total$ = this.historialState.total;
  readonly loading$ = this.historialState.loading;
  readonly lines$ = this.downtimeState.lines;
  readonly shifts$ = this.downtimeState.shifts;

  // Filter form controls
  filterWeekCtrl = new FormControl<number | null>(null);
  filterLineCtrl = new FormControl<string | null>(null);
  filterShiftCtrl = new FormControl<string | null>(null);

  // Pagination
  page = signal<number>(0);
  readonly limit = 20;

  // Detail expansion
  expandedId = signal<string | null>(null);

  ngOnInit(): void {
    this.downtimeRequestService.getLines(false);
    this.downtimeRequestService.getShift(false);
    this.loadRecords();
  }

  loadRecords(): void {
    this.historialService.getRecords({
      page: this.page(),
      limit: this.limit,
      week: this.filterWeekCtrl.value ?? undefined,
      line: this.filterLineCtrl.value ?? undefined,
      shift: this.filterShiftCtrl.value ?? undefined,
    });
  }

  applyFilters(): void {
    this.page.set(0);
    this.loadRecords();
  }

  clearFilters(): void {
    this.filterWeekCtrl.setValue(null);
    this.filterLineCtrl.setValue(null);
    this.filterShiftCtrl.setValue(null);
    this.page.set(0);
    this.loadRecords();
  }

  nextPage(): void {
    this.page.update((p) => p + 1);
    this.loadRecords();
  }

  prevPage(): void {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.loadRecords();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.total$() / this.limit);
  }

  toggleDetail(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
