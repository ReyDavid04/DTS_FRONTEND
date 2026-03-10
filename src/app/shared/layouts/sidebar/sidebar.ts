import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GlobalStateService } from '../../../core/application';
import { SettingsDtsIcon } from '../../icons';
import { LoaderDts } from '../../components/loader-dts/loader-dts';

@Component({
  selector: 'foxcode-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, SettingsDtsIcon, LoaderDts, RouterModule],
  templateUrl: './sidebar.html',
  styles: [],
})
export class Sidebar implements OnInit {
  @Input() collapsed: boolean = false;
  @Input() businessUnit: string = 'MICROSOFT';
  @Output() onClose = new EventEmitter<void>();

  private globalState = inject(GlobalStateService);

  isVisible = signal(false);
  isLoading = signal(false);

  public menus = [
    {
      name: 'Inicio',
      menus: [
        { name: 'Panel de control', route: 'home', icon: 'ri-dashboard-2-line' },
        { name: 'Perfil', route: 'profile', icon: 'ri-user-line' },
      ],
    },
    {
      name: 'Seguimiento',
      menus: [
        { name: 'Registro', route: 'register', icon: 'ri-dashboard-2-line' },
        { name: 'Historial', route: 'historial', icon: 'ri-history-line' },
        { name: 'Tendencias', route: 'trends', icon: 'ri-dashboard-2-line' },
        { name: 'Reportes', route: 'reports', icon: 'ri-dashboard-2-line' },
      ],
    },
    {
      name: 'Administración',
      menus: [
        // { name: 'Configuración', route: 'config', icon: 'ri-dashboard-2-line' },
        { name: 'Usuarios', route: 'users', icon: 'ri-dashboard-2-line' },
        { name: 'Líneas', route: 'lines', icon: 'ri-dashboard-2-line' },
        { name: 'Departamentos', route: 'departments', icon: 'ri-dashboard-2-line' },
        { name: 'Turnos', route: 'shifts', icon: 'ri-dashboard-2-line' },
      ],
    },
  ];

  // Access user from global state
  user = this.globalState.currentUser;

  // Derive allTools reactively from the user signal
  allTools = computed(() => this.user()?.tools || []);

  // Filter tools based on business unit and mode
  filteredTools = computed(() => {
    return this.allTools()
      .filter((tool) => tool.active)
      .sort((a, b) => {
        const aIsAdmin = a?.businessUnitId?.name.toUpperCase() === 'DEVELOPMENT';
        const bIsAdmin = b?.businessUnitId?.name.toUpperCase() === 'DEVELOPMENT';
        if (aIsAdmin === bIsAdmin) return 0;
        return aIsAdmin ? -1 : 1;
      });
  });

  ngOnInit(): void {
    const user = this.user();
    if (user) {
      // console.log('Usuario cargado en sidebar:', user.username);
    }
    // Trigger animation on init
    setTimeout(() => this.isVisible.set(true), 10);
  }

  close(): void {
    this.isVisible.set(false);
    setTimeout(() => this.onClose.emit(), 300);
  }
}
