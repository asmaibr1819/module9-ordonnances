import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { OrderIn } from '../../models/pharmacist.models';
import { ChipInputComponent } from '../chip-input/chip-input.component';
import { IconComponent } from '../icon/icon.component';

interface FormValues {
  orderId: string;
  dci: string;
  dosage: string;
  form: string;
  brand: string;
  quantity: number;
  age: number | null;
  pregnancy: boolean;
  allergies: string[];
  treatments: string[];
  lat: number;
  lon: number;
}

interface Scenario {
  label: string;
  values: Partial<FormValues>;
}

function newOrderId(): string {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `CMD-${day}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

function defaults(): FormValues {
  return {
    orderId: newOrderId(),
    dci: 'Paracétamol',
    dosage: '500mg',
    form: 'comprimé',
    brand: 'Dafalgan',
    quantity: 2,
    age: 30,
    pregnancy: false,
    allergies: [],
    treatments: [],
    lat: 36.8065,
    lon: 10.1815,
  };
}

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [FormsModule, ChipInputComponent, IconComponent],
  templateUrl: './order-form.component.html',
  styleUrl: './order-form.component.scss',
})
export class OrderFormComponent {
  loading = input(false);
  submitted = output<OrderIn>();

  values: FormValues = defaults();
  activeScenario: string | null = 'Rupture de stock';

  readonly scenarios: Scenario[] = [
    { label: 'Produit disponible', values: { brand: 'Panadol' } },
    { label: 'Rupture de stock', values: { brand: 'Dafalgan' } },
    { label: 'Allergie', values: { brand: 'Panadol', allergies: ['paracétamol'] } },
    { label: 'Grossesse', values: { dci: 'Ibuprofène', dosage: '400mg', brand: '', pregnancy: true } },
    { label: 'Interaction', values: { dci: 'Ibuprofène', dosage: '400mg', brand: '', treatments: ['warfarine'] } },
    { label: 'Produit inconnu', values: { dci: 'Zorglub', brand: '' } },
  ];

  applyScenario(scenario: Scenario): void {
    // On repart d'une base propre, puis on applique le scenario.
    this.values = { ...defaults(), brand: '', ...scenario.values };
    this.activeScenario = scenario.label;
  }

  submit(): void {
    const v = this.values;
    this.submitted.emit({
      order_id: v.orderId.trim(),
      product: {
        dci: v.dci.trim(),
        dosage: v.dosage.trim(),
        form: v.form.trim(),
        brand: v.brand.trim() || null,
        quantity: Number(v.quantity),
      },
      patient: {
        age: v.age,
        pregnancy: v.pregnancy,
        allergies: v.allergies,
        history: [],
        current_treatments: v.treatments,
        location: { lat: Number(v.lat), lon: Number(v.lon) },
      },
    });
    this.values.orderId = newOrderId(); // une nouvelle commande = un nouveau numero
  }
}
