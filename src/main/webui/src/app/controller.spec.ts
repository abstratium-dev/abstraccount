import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Controller } from './controller';
import { ModelService } from './model.service';

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

  describe('Attachments', () => {
    const mockAttachment = {
      id: 'att-1',
      transactionId: 'tx-1',
      fileName: 'receipt.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      uploadedAt: '2024-01-15T10:00:00Z',
      uploadedBy: 'testuser'
    };

    it('should list attachments for a transaction', async () => {
      const promise = controller.listAttachments('tx-1');
      const req = httpMock.expectOne('/api/attachment/transaction/tx-1');
      expect(req.request.method).toBe('GET');
      req.flush([mockAttachment]);

      const result = await promise;
      expect(result).toEqual([mockAttachment]);
    });

    it('should upload an attachment as multipart form data', async () => {
      const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
      const promise = controller.uploadAttachment('tx-1', file);
      const req = httpMock.expectOne('/api/attachment/transaction/tx-1');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockAttachment);

      const result = await promise;
      expect(result).toEqual(mockAttachment);
    });

    it('should replace an attachment as multipart form data', async () => {
      const file = new File(['%PDF-1.4'], 'new.pdf', { type: 'application/pdf' });
      const promise = controller.replaceAttachment('att-1', file);
      const req = httpMock.expectOne('/api/attachment/att-1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockAttachment);

      await expectAsync(promise).toBeResolved();
    });

    it('should delete an attachment', async () => {
      const promise = controller.deleteAttachment('att-1');
      const req = httpMock.expectOne('/api/attachment/att-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({});

      await expectAsync(promise).toBeResolved();
    });

    it('should build the attachment download URL without an HTTP call', () => {
      expect(controller.getAttachmentDownloadUrl('att-1')).toBe('/api/attachment/att-1');
    });
  });
});
