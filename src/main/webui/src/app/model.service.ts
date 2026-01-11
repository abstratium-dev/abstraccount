import { Injectable, signal, Signal } from '@angular/core';

export interface Demo {
  id: string;
}

@Injectable({
  providedIn: 'root',
})
export class ModelService {

  private demos = signal<Demo[]>([]);
  private demosLoading = signal<boolean>(false);
  private demosError = signal<string | null>(null);

  demos$: Signal<Demo[]> = this.demos.asReadonly();
  demosLoading$: Signal<boolean> = this.demosLoading.asReadonly();
  demosError$: Signal<string | null> = this.demosError.asReadonly();

  setDemos(demos: Demo[]) {
    this.demos.set(demos);
  }

  setDemosLoading(loading: boolean) {
    this.demosLoading.set(loading);
  }

  setDemosError(error: string | null) {
    this.demosError.set(error);
  }
}
