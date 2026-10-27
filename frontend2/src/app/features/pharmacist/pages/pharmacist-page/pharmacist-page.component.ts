
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../components/icon/icon.component';
import { OrderFormComponent } from '../../components/order-form/order-form.component';
import { ValidationResultComponent } from '../../components/validation-result/validation-result.component';

import {
  DecisionLogEntry,
  OrderIn,
  PharmacistDecision,
  PharmacistDecisionEvent,
  ValidationOut,
} from '../../models/pharmacist.models';

import { PharmacistApiService } from '../../services/pharmacist-api.service';

const DECISION_LABELS: Record<PharmacistDecision, string> = {
  ACCEPTED: 'Acceptée',
  SUBSTITUTED: 'Substituée',
  REFUSED: 'Refusée',
};

@Component({
  selector: 'app-pharmacist-page',
  standalone: true,
  imports: [
    OrderFormComponent,
    ValidationResultComponent,
    IconComponent,
    DatePipe,
    RouterLink,
  ],
  templateUrl: './pharmacist-page.component.html',
  styleUrl: './pharmacist-page.component.scss',
})
export class PharmacistPageComponent implements OnInit {
  private readonly api = inject(PharmacistApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly loading = signal(false);
  readonly result = signal<ValidationOut | null>(null);
  readonly error = signal<string | null>(null);
  readonly log = signal<DecisionLogEntry[]>([]);
  readonly apiOnline = signal<boolean | null>(null);

  readonly apiLabel = computed(() => {
    const online = this.apiOnline();

    if (online === null) {
      return "Connexion à l'API";
    }

    return online ? 'API connectée' : 'API hors ligne';
  });

  ngOnInit(): void {
    // Éviter les appels réseau pendant le rendu côté serveur.
    if (this.isBrowser) {
      this.checkApi();
    }
  }

  checkApi(): void {
    if (!this.isBrowser) {
      return;
    }

    this.apiOnline.set(null);

    this.api.health().subscribe({
      next: () => {
        this.apiOnline.set(true);
      },
      error: () => {
        this.apiOnline.set(false);
      },
    });
  }

  verify(order: OrderIn): void {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    this.api.validateOrder(order).subscribe({
      next: (res: ValidationOut) => {
        this.result.set(res);
        this.apiOnline.set(true);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFor(err));

        if (err.status === 0) {
          this.apiOnline.set(false);
        }

        this.loading.set(false);
      },
    });
  }

  record(event: PharmacistDecisionEvent): void {
    const current = this.result();

    if (!current) {
      return;
    }

    const justification = event.justification?.trim() ?? '';

    // 1. Détecter les alertes critiques.
    const hasCritical = current.risk_alerts.some(
      (alert) => alert.severity === 'CRITICAL'
    );

    // 2. Bloquer l'acceptation et la substitution en cas d'alerte critique.
    if (
      hasCritical &&
      (event.decision === 'ACCEPTED' ||
        event.decision === 'SUBSTITUTED')
    ) {
      this.error.set(
        "Décision bloquée : une alerte critique interdit l'acceptation et la substitution."
      );
      return;
    }

    // 3. Exiger une justification si des alertes sont présentes.
    if (current.risk_alerts.length > 0 && !justification) {
      this.error.set(
        'Veuillez saisir une justification avant de confirmer la décision.'
      );
      return;
    }

    // 4. Vérifier les conditions d'acceptation.
    if (
      event.decision === 'ACCEPTED' &&
      (!current.original_product.available ||
        !current.assigned_pharmacy)
    ) {
      this.error.set(
        "Acceptation impossible : le produit doit être disponible et une pharmacie doit être assignée."
      );
      return;
    }

    // 5. Vérifier la possibilité de substitution.
    if (
      event.decision === 'SUBSTITUTED' &&
      !current.proposed_substitute
    ) {
      this.error.set(
        "Substitution impossible : aucun médicament de remplacement n'est proposé."
      );
      return;
    }

    // 6. Enregistrer la décision dans l'historique local.
    const entry: DecisionLogEntry = {
      orderId: current.order_id,
      decision: event.decision,
      justification,
      at: new Date(),
    };

    this.log.update((entries) => [entry, ...entries]);

    // 7. Réinitialiser les messages et le résultat affiché.
    this.error.set(null);
    this.result.set(null);
  }

  label(decision: PharmacistDecision): string {
    return DECISION_LABELS[decision];
  }

  private messageFor(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return "L'API ne répond pas. Lancez le serveur avec « uvicorn app.main:app --reload », puis relancez la vérification.";
    }

    if (err.status === 422) {
      return 'La commande est invalide. Vérifiez les champs obligatoires, notamment la quantité et la position du patient.';
    }

    if (err.status === 401 || err.status === 403) {
      return "Accès refusé par l'API. Vérifiez votre authentification et vos autorisations.";
    }

    return `Le serveur a renvoyé une erreur (${err.status}). Réessayez dans un instant.`;
  }
}
