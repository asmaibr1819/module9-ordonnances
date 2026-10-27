
import { Component, computed, input, output, signal } from '@angular/core';

import {
  PharmacistDecision,
  PharmacistDecisionEvent,
  RiskAlert,
  ValidationOut,
  ValidationStatus,
} from '../../models/pharmacist.models';
import { IconComponent, IconName } from '../icon/icon.component';

type Tone = 'success' | 'info' | 'warning' | 'danger';
type NodeState = 'ok' | 'warn' | 'fail' | 'skip' | 'pending';

interface Check {
  key: string;
  title: string;
  detail: string;
  state: NodeState;
}

const VERDICTS: Record<ValidationStatus, { title: string; lead: string }> = {
  VALIDATED: {
    title: 'Prête à dispenser',
    lead: "Le produit est en stock et aucun risque n'a été détecté.",
  },
  SUBSTITUTION_PROPOSED: {
    title: 'Un équivalent est disponible',
    lead: 'Le produit demandé est en rupture. Un générique de même composition peut le remplacer.',
  },
  ALERT_REVIEW_REQUIRED: {
    title: 'À examiner avant de valider',
    lead: "Une ou plusieurs alertes demandent le jugement d'un pharmacien.",
  },
  REJECTED: {
    title: 'Commande impossible à honorer',
    lead: 'Aucune pharmacie partenaire ne peut fournir ce médicament, ni un équivalent.',
  },
  MANUAL_REVIEW: {
    title: 'Vérification manuelle requise',
    lead: "La vérification automatique n'a pas abouti. Contrôler la commande à la main.",
  },
};

const ALERT_TITLES: Record<string, string> = {
  ALLERGY_MATCH: 'Allergie connue',
  PREGNANCY_CAUTION: 'Grossesse',
  DRUG_INTERACTION: 'Interaction médicamenteuse',
  EXPIRY_SOON: 'Péremption proche',
};

const SEVERITY_LABELS = {
  INFO: 'Information',
  WARNING: 'Attention',
  CRITICAL: 'Critique',
} as const;

const STATE_ICONS: Record<NodeState, IconName> = {
  ok: 'check',
  warn: 'alert',
  fail: 'x',
  skip: 'minus',
  pending: 'minus',
};

const STATE_WORDS: Record<NodeState, string> = {
  ok: 'Validé',
  warn: 'Attention',
  fail: 'Bloquant',
  skip: 'Sans objet',
  pending: 'En cours',
};

@Component({
  selector: 'app-validation-result',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './validation-result.component.html',
  styleUrl: './validation-result.component.scss',
})
export class ValidationResultComponent {
  result = input<ValidationOut | null>(null);
  loading = input(false);

  // La décision est envoyée avec sa justification.
  decided = output<PharmacistDecisionEvent>();

  // État local du formulaire de décision.
  justification = signal('');
  selectedDecision = signal<PharmacistDecision | null>(null);

  readonly pendingChecks: Check[] = [
    {
      key: 'stock',
      title: 'Stock',
      detail: 'Vérification…',
      state: 'pending',
    },
    {
      key: 'equivalent',
      title: 'Équivalent',
      detail: 'En attente',
      state: 'pending',
    },
    {
      key: 'risks',
      title: 'Risques',
      detail: 'En attente',
      state: 'pending',
    },
    {
      key: 'pharmacy',
      title: 'Pharmacie',
      detail: 'En attente',
      state: 'pending',
    },
  ];

  visibleResult = computed(() =>
    this.loading() ? null : this.result()
  );

  showEmpty = computed(() =>
    !this.loading() && !this.result()
  );

  // Une alerte critique empêche l'acceptation et la substitution.
  
hasCritical = computed(() =>
  (this.result()?.risk_alerts ?? []).some(
    (alert) => alert.severity === 'CRITICAL'
  )
);


  // Toute alerte exige une justification.
  requiresJustification = computed(
    () => (this.result()?.risk_alerts.length ?? 0) > 0
  );

  verdict = computed(() => {
    const r = this.result();

    if (!r) {
      return null;
    }

    const base = VERDICTS[r.validation_status];
    let tone: Tone;

    switch (r.validation_status) {
      case 'VALIDATED':
        tone = 'success';
        break;

      case 'SUBSTITUTION_PROPOSED':
        tone = 'info';
        break;

      case 'ALERT_REVIEW_REQUIRED':
        tone = this.hasCritical() ? 'danger' : 'warning';
        break;

      default:
        tone = 'danger';
    }

    return { ...base, tone };
  });

  // Les quatre contrôles du module.
  checks = computed<Check[]>(() => {
    const r = this.result();

    if (!r) {
      return [];
    }

    const rejected = r.validation_status === 'REJECTED';
    const manual = r.validation_status === 'MANUAL_REVIEW';
    const sub = r.proposed_substitute;
    const alerts = r.risk_alerts;

    const stock: Check = r.original_product.available
      ? {
          key: 'stock',
          title: 'Stock',
          detail: 'Disponible',
          state: 'ok',
        }
      : manual
        ? {
            key: 'stock',
            title: 'Stock',
            detail: 'Non vérifié',
            state: 'skip',
          }
        : {
            key: 'stock',
            title: 'Stock',
            detail: rejected ? 'Indisponible' : 'Rupture',
            state: rejected ? 'fail' : 'warn',
          };

    const equivalent: Check = r.original_product.available
      ? {
          key: 'equivalent',
          title: 'Équivalent',
          detail: 'Non nécessaire',
          state: 'skip',
        }
      : sub
        ? {
            key: 'equivalent',
            title: 'Équivalent',
            detail: sub.brand,
            state: 'ok',
          }
        : {
            key: 'equivalent',
            title: 'Équivalent',
            detail: manual ? 'Non vérifié' : 'Aucun trouvé',
            state: manual ? 'skip' : 'fail',
          };

    const critical = alerts.filter(
      (alert) => alert.severity === 'CRITICAL'
    ).length;

    const risks: Check = rejected || manual
      ? {
          key: 'risks',
          title: 'Risques',
          detail: 'Non évalués',
          state: 'skip',
        }
      : alerts.length === 0
        ? {
            key: 'risks',
            title: 'Risques',
            detail: 'Aucune alerte',
            state: 'ok',
          }
        : {
            key: 'risks',
            title: 'Risques',
            detail: critical
              ? `${critical} critique${critical > 1 ? 's' : ''}`
              : `${alerts.length} alerte${alerts.length > 1 ? 's' : ''}`,
            state: critical ? 'fail' : 'warn',
          };

    const pharmacy: Check = r.assigned_pharmacy
      ? {
          key: 'pharmacy',
          title: 'Pharmacie',
          detail: r.assigned_pharmacy.name,
          state: 'ok',
        }
      : {
          key: 'pharmacy',
          title: 'Pharmacie',
          detail: manual ? 'Non attribuée' : 'Aucune disponible',
          state: manual ? 'skip' : 'fail',
        };

    return [stock, equivalent, risks, pharmacy];
  });

  // Acceptation autorisée uniquement si le produit est disponible,
  // une pharmacie est assignée et aucune alerte critique n'existe.
  
canAccept = computed(() => {
  const r = this.result();

  return (
    !!r &&
    r.original_product.available &&
    !!r.assigned_pharmacy &&
    !this.hasCritical()
  );
});

  // Une alerte critique interdit également la substitution automatique.
  canSubstitute = computed(() =>
    !!this.result()?.proposed_substitute
    && !this.hasCritical()
  );

  acceptLabel = computed(() => 'Accepter');

  // La confirmation dépend des signaux : la validation se met à jour
  // quand le pharmacien saisit ou modifie sa justification.
  canSubmitDecision = computed(() => {
    const decision = this.selectedDecision();
    const justification = this.justification().trim();

    if (!decision || !this.result()) {
      return false;
    }

    if (
      this.requiresJustification()
      && !justification
    ) {
      return false;
    }

    if (
      decision === 'ACCEPTED'
      && !this.canAccept()
    ) {
      return false;
    }

    if (
      decision === 'SUBSTITUTED'
      && !this.canSubstitute()
    ) {
      return false;
    }

    return true;
  });

  hint = computed(() => {
    const r = this.result();

    if (!r) {
      return '';
    }

    const parts: string[] = [];

    if (this.hasCritical()) {
      parts.push(
        "Une alerte critique bloque l'acceptation et la substitution."
      );
    } else if (!this.canAccept()) {
      parts.push(
        r.original_product.available
          ? 'Accepter est indisponible : aucune pharmacie assignée.'
          : "Accepter est indisponible : le produit demandé n'est pas en stock."
      );
    }

    if (!this.canSubstitute()) {
      parts.push(
        "Substituer est indisponible : aucun équivalent autorisé n'est proposé."
      );
    }

    return parts.join(' ');
  });

  stockPercent = computed(() =>
    Math.round(
      (this.result()?.assigned_pharmacy?.stock_score ?? 0) * 100
    )
  );

  distance = computed(() =>
    (this.result()?.assigned_pharmacy?.distance_km ?? 0)
      .toFixed(1)
      .replace('.', ',')
  );

  selectDecision(decision: PharmacistDecision): void {
    // Nouvelle vérification au moment du clic.
    if (decision === 'ACCEPTED' && !this.canAccept()) {
      return;
    }

    if (decision === 'SUBSTITUTED' && !this.canSubstitute()) {
      return;
    }

    this.selectedDecision.set(decision);
  }

  
confirmDecision(): void {
  // Vérification finale avant d'envoyer la décision au parent.
  if (!this.canSubmitDecision()) {
    return;
  }

  const decision = this.selectedDecision();

  if (!decision) {
    return;
  }

  this.decided.emit({
    decision,
    justification: this.justification().trim(),
  });

  this.selectedDecision.set(null);
  this.justification.set('');
}


  iconFor(state: NodeState): IconName {
    return STATE_ICONS[state];
  }

  wordFor(state: NodeState): string {
    return STATE_WORDS[state];
  }

  alertTitle(alert: RiskAlert): string {
    return ALERT_TITLES[alert.code] ?? alert.code;
  }

  severityLabel(alert: RiskAlert): string {
    return SEVERITY_LABELS[alert.severity];
  }

  alertIcon(alert: RiskAlert): IconName {
    return alert.severity === 'CRITICAL' ? 'x' : 'alert';
  }
}
