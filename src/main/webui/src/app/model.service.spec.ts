import { TestBed } from '@angular/core/testing';
import { Demo, ModelService } from './model.service';

describe('ModelService', () => {
  let service: ModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should have empty demos initially', () => {
      expect(service.demos$()).toEqual([]);
    });

    it('should not be loading initially', () => {
      expect(service.demosLoading$()).toBe(false);
    });

    it('should have no error initially', () => {
      expect(service.demosError$()).toBeNull();
    });
  });

  describe('Demo Management', () => {
    it('should set demos', () => {
      const demos: Demo[] = [{ id: '1' }, { id: '2' }];
      service.setDemos(demos);
      expect(service.demos$()).toEqual(demos);
    });

    it('should update demos', () => {
      const demos1: Demo[] = [{ id: '1' }];
      const demos2: Demo[] = [{ id: '2' }, { id: '3' }];
      
      service.setDemos(demos1);
      expect(service.demos$()).toEqual(demos1);
      
      service.setDemos(demos2);
      expect(service.demos$()).toEqual(demos2);
    });

    it('should handle empty demos list', () => {
      const demos: Demo[] = [{ id: '1' }];
      service.setDemos(demos);
      service.setDemos([]);
      expect(service.demos$()).toEqual([]);
    });

    it('should handle large demos list', () => {
      const demos: Demo[] = Array.from({ length: 100 }, (_, i) => ({ id: `${i}` }));
      service.setDemos(demos);
      expect(service.demos$()).toEqual(demos);
      expect(service.demos$().length).toBe(100);
    });
  });

  describe('Loading State Management', () => {
    it('should set loading state', () => {
      service.setDemosLoading(true);
      expect(service.demosLoading$()).toBe(true);
    });

    it('should update loading state', () => {
      service.setDemosLoading(true);
      expect(service.demosLoading$()).toBe(true);
      
      service.setDemosLoading(false);
      expect(service.demosLoading$()).toBe(false);
    });

    it('should toggle loading state multiple times', () => {
      service.setDemosLoading(true);
      service.setDemosLoading(false);
      service.setDemosLoading(true);
      expect(service.demosLoading$()).toBe(true);
    });
  });

  describe('Error State Management', () => {
    it('should set error', () => {
      service.setDemosError('Failed to load demos');
      expect(service.demosError$()).toBe('Failed to load demos');
    });

    it('should update error', () => {
      service.setDemosError('Error 1');
      expect(service.demosError$()).toBe('Error 1');
      
      service.setDemosError('Error 2');
      expect(service.demosError$()).toBe('Error 2');
    });

    it('should clear error', () => {
      service.setDemosError('Some error');
      service.setDemosError(null);
      expect(service.demosError$()).toBeNull();
    });

    it('should handle empty string error', () => {
      service.setDemosError('');
      expect(service.demosError$()).toBe('');
    });
  });

  describe('Combined State Management', () => {
    it('should manage all states independently', () => {
      const demos: Demo[] = [{ id: '1' }];
      service.setDemos(demos);
      service.setDemosLoading(true);
      service.setDemosError('Some error');

      expect(service.demos$()).toEqual(demos);
      expect(service.demosLoading$()).toBe(true);
      expect(service.demosError$()).toBe('Some error');
    });

    it('should reset all states', () => {
      service.setDemos([{ id: '1' }]);
      service.setDemosLoading(true);
      service.setDemosError('Error');

      service.setDemos([]);
      service.setDemosLoading(false);
      service.setDemosError(null);

      expect(service.demos$()).toEqual([]);
      expect(service.demosLoading$()).toBe(false);
      expect(service.demosError$()).toBeNull();
    });
  });

  describe('Signal Reactivity', () => {
    it('should emit signal updates for demos', () => {
      const demos1: Demo[] = [{ id: '1' }];
      const demos2: Demo[] = [{ id: '2' }];
      
      service.setDemos(demos1);
      expect(service.demos$()).toEqual(demos1);
      
      service.setDemos(demos2);
      expect(service.demos$()).toEqual(demos2);
    });

    it('should emit signal updates for loading', () => {
      service.setDemosLoading(true);
      expect(service.demosLoading$()).toBe(true);
      
      service.setDemosLoading(false);
      expect(service.demosLoading$()).toBe(false);
    });

    it('should emit signal updates for error', () => {
      service.setDemosError('Error 1');
      expect(service.demosError$()).toBe('Error 1');
      
      service.setDemosError('Error 2');
      expect(service.demosError$()).toBe('Error 2');
    });
  });

  describe('Service Singleton', () => {
    it('should be a singleton across injections', () => {
      const service2 = TestBed.inject(ModelService);
      service.setDemos([{ id: '1' }]);
      expect(service2.demos$()).toEqual([{ id: '1' }]);
    });
  });
});
