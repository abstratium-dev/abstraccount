import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Controller } from './controller';
import { Demo, ModelService } from './model.service';

describe('Controller', () => {
  let controller: Controller;
  let modelService: ModelService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    controller = TestBed.inject(Controller);
    modelService = TestBed.inject(ModelService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(controller).toBeTruthy();
  });

  describe('loadDemos', () => {
    it('should load demos and update model service', () => {
      const mockDemos: Demo[] = [{ id: '1' }, { id: '2' }];

      controller.loadDemos();

      const req = httpMock.expectOne('/api/demo');
      expect(req.request.method).toBe('GET');
      req.flush(mockDemos);

      expect(modelService.demos$()).toEqual(mockDemos);
      expect(modelService.demosLoading$()).toBe(false);
      expect(modelService.demosError$()).toBeNull();
    });

    it('should set loading state before request', () => {
      controller.loadDemos();

      expect(modelService.demosLoading$()).toBe(true);
      expect(modelService.demosError$()).toBeNull();

      const req = httpMock.expectOne('/api/demo');
      req.flush([]);
    });

    it('should handle empty demos list', () => {
      controller.loadDemos();

      const req = httpMock.expectOne('/api/demo');
      req.flush([]);

      expect(modelService.demos$()).toEqual([]);
      expect(modelService.demosLoading$()).toBe(false);
    });

    it('should handle error response', () => {
      controller.loadDemos();

      const req = httpMock.expectOne('/api/demo');
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      expect(modelService.demos$()).toEqual([]);
      expect(modelService.demosLoading$()).toBe(false);
      expect(modelService.demosError$()).toBe('Failed to load demos');
    });

    it('should handle network error', () => {
      controller.loadDemos();

      const req = httpMock.expectOne('/api/demo');
      req.error(new ProgressEvent('error'));

      expect(modelService.demosError$()).toBe('Failed to load demos');
    });
  });

  describe('createDemo', () => {
    it('should create demo and reload list', async () => {
      const newDemo: Demo = { id: '123' };
      const allDemos: Demo[] = [newDemo];

      const createPromise = controller.createDemo();

      const createReq = httpMock.expectOne('/api/demo');
      expect(createReq.request.method).toBe('POST');
      expect(createReq.request.body).toEqual({});
      createReq.flush(newDemo);

      const result = await createPromise;
      expect(result).toEqual(newDemo);

      // Verify reload was triggered
      const loadReq = httpMock.expectOne('/api/demo');
      expect(loadReq.request.method).toBe('GET');
      loadReq.flush(allDemos);

      expect(modelService.demos$()).toEqual(allDemos);
    });

    it('should throw error on failed creation', async () => {
      const createPromise = controller.createDemo();

      const req = httpMock.expectOne('/api/demo');
      req.error(new ProgressEvent('error'), { status: 400, statusText: 'Bad Request' });

      await expectAsync(createPromise).toBeRejected();
    });

    it('should handle server error during creation', async () => {
      const createPromise = controller.createDemo();

      const req = httpMock.expectOne('/api/demo');
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      await expectAsync(createPromise).toBeRejected();
    });
  });

  describe('updateDemo', () => {
    it('should update demo and reload list', async () => {
      const demoToUpdate: Demo = { id: '123' };
      const updatedDemo: Demo = { id: '123' };
      const allDemos: Demo[] = [updatedDemo];

      const updatePromise = controller.updateDemo(demoToUpdate);

      const updateReq = httpMock.expectOne('/api/demo');
      expect(updateReq.request.method).toBe('PUT');
      expect(updateReq.request.body).toEqual(demoToUpdate);
      updateReq.flush(updatedDemo);

      const result = await updatePromise;
      expect(result).toEqual(updatedDemo);

      // Verify reload was triggered
      const loadReq = httpMock.expectOne('/api/demo');
      expect(loadReq.request.method).toBe('GET');
      loadReq.flush(allDemos);

      expect(modelService.demos$()).toEqual(allDemos);
    });

    it('should throw error on failed update', async () => {
      const demoToUpdate: Demo = { id: '123' };
      const updatePromise = controller.updateDemo(demoToUpdate);

      const req = httpMock.expectOne('/api/demo');
      req.error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });

      await expectAsync(updatePromise).toBeRejected();
    });

    it('should handle validation error during update', async () => {
      const demoToUpdate: Demo = { id: '123' };
      const updatePromise = controller.updateDemo(demoToUpdate);

      const req = httpMock.expectOne('/api/demo');
      req.error(new ProgressEvent('error'), { status: 400, statusText: 'Bad Request' });

      await expectAsync(updatePromise).toBeRejected();
    });
  });

  describe('deleteDemo', () => {
    it('should delete demo and reload list', async () => {
      const demoId = '123';
      const remainingDemos: Demo[] = [{ id: '456' }];

      const deletePromise = controller.deleteDemo(demoId);

      const deleteReq = httpMock.expectOne(`/api/demo/${demoId}`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(null);

      await deletePromise;

      // Verify reload was triggered
      const loadReq = httpMock.expectOne('/api/demo');
      expect(loadReq.request.method).toBe('GET');
      loadReq.flush(remainingDemos);

      expect(modelService.demos$()).toEqual(remainingDemos);
    });

    it('should throw error on failed deletion', async () => {
      const demoId = '123';
      const deletePromise = controller.deleteDemo(demoId);

      const req = httpMock.expectOne(`/api/demo/${demoId}`);
      req.error(new ProgressEvent('error'), { status: 404, statusText: 'Not Found' });

      await expectAsync(deletePromise).toBeRejected();
    });

    it('should handle permission error during deletion', async () => {
      const demoId = '123';
      const deletePromise = controller.deleteDemo(demoId);

      const req = httpMock.expectOne(`/api/demo/${demoId}`);
      req.error(new ProgressEvent('error'), { status: 403, statusText: 'Forbidden' });

      await expectAsync(deletePromise).toBeRejected();
    });

    it('should handle server error during deletion', async () => {
      const demoId = '123';
      const deletePromise = controller.deleteDemo(demoId);

      const req = httpMock.expectOne(`/api/demo/${demoId}`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      await expectAsync(deletePromise).toBeRejected();
    });
  });

  describe('Error Handling', () => {
    it('should log errors to console', () => {
      spyOn(console, 'error');

      controller.loadDemos();

      const req = httpMock.expectOne('/api/demo');
      req.error(new ProgressEvent('error'));

      expect(console.error).toHaveBeenCalledWith('Error loading demos:', jasmine.any(Object));
    });

    it('should log creation errors to console', async () => {
      spyOn(console, 'error');

      const createPromise = controller.createDemo();

      const req = httpMock.expectOne('/api/demo');
      req.error(new ProgressEvent('error'));

      try {
        await createPromise;
      } catch (e) {
        // Expected
      }

      expect(console.error).toHaveBeenCalledWith('Error creating demo:', jasmine.any(Object));
    });
  });

  describe('Integration', () => {
    it('should handle multiple operations in sequence', async () => {
      // Load demos
      controller.loadDemos();
      const loadReq1 = httpMock.expectOne('/api/demo');
      loadReq1.flush([{ id: '1' }]);

      // Create demo
      const createPromise = controller.createDemo();
      const createReq = httpMock.expectOne('/api/demo');
      createReq.flush({ id: '2' });
      await createPromise;
      const loadReq2 = httpMock.expectOne('/api/demo');
      loadReq2.flush([{ id: '1' }, { id: '2' }]);

      // Delete demo
      const deletePromise = controller.deleteDemo('1');
      const deleteReq = httpMock.expectOne('/api/demo/1');
      deleteReq.flush(null);
      await deletePromise;
      const loadReq3 = httpMock.expectOne('/api/demo');
      loadReq3.flush([{ id: '2' }]);

      expect(modelService.demos$()).toEqual([{ id: '2' }]);
    });
  });
});
