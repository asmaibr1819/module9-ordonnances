import { Routes } from '@angular/router';
import { ChatPageComponent } from './features/chat/pages/chat-page/chat-page.component';

export const routes: Routes = [
  { path: '', component: ChatPageComponent },
  {
    path: 'pharmacien',
    loadComponent: () =>
      import('./features/pharmacist/pages/pharmacist-page/pharmacist-page.component').then(
        (m) => m.PharmacistPageComponent,
      ),
  },
  {
    path: 'ordonnances',
    loadComponent: () =>
      import('./features/prescription/pages/prescription-page/prescription-page.component').then(
        (m) => m.PrescriptionPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
