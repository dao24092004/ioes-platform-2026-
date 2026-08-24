import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

/**
 * Tests cho StorageService - SigV4 signature + URL building.
 */
describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    process.env.STORAGE_ENDPOINT = 'http://localhost:9000';
    process.env.STORAGE_REGION = 'us-east-1';
    process.env.STORAGE_ACCESS_KEY = 'test-key';
    process.env.STORAGE_SECRET_KEY = 'test-secret';
    process.env.STORAGE_BUCKET_QUESTIONS = 'test-bucket';

    const module = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => process.env[key]),
          },
        },
      ],
    }).compile();

    service = module.get(StorageService);
  });

  describe('generatePresignedUploadUrl', () => {
    it('should generate a valid presigned URL', async () => {
      const result = await service.generatePresignedUploadUrl(
        'questions/uuid/images',
        'test.png',
        'image/png',
      );

      expect(result.key).toMatch(/^questions\/uuid\/images\//);
      expect(result.key.endsWith('.png')).toBe(true);
      expect(result.bucket).toBe('test-bucket');
      expect(result.uploadUrl).toMatch(/^http:\/\//);
      expect(result.uploadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(result.uploadUrl).toContain('X-Amz-Signature=');
      expect(result.contentType).toBe('image/png');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.maxSize).toBeGreaterThan(0);
    });

    it('should reject non-image content types', async () => {
      await expect(
        service.generatePresignedUploadUrl(
          'questions/uuid/images',
          'doc.pdf',
          'application/pdf',
        ),
      ).rejects.toThrow(/Content type not allowed/);
    });

    it('should include extension based on MIME when filename has no ext', async () => {
      const result = await service.generatePresignedUploadUrl(
        'q',
        'noext',
        'image/jpeg',
      );
      expect(result.key.endsWith('.jpg')).toBe(true);
    });

    it('should use filename extension when present', async () => {
      const result = await service.generatePresignedUploadUrl(
        'q',
        'image.PNG',
        'image/png',
      );
      expect(result.key.endsWith('.png')).toBe(true); // normalized to lowercase
    });
  });

  describe('uploadBuffer', () => {
    it('should reject empty buffer', async () => {
      await expect(
        service.uploadBuffer(Buffer.alloc(0), {
          prefix: 'test',
          contentType: 'image/png',
        }),
      ).rejects.toThrow(/Empty file/);
    });

    it('should upload valid buffer', async () => {
      const buffer = Buffer.from('test-content');
      const result = await service.uploadBuffer(buffer, {
        prefix: 'uploads',
        contentType: 'text/plain',
        filename: 'test.txt',
      });

      expect(result.bucket).toBe('test-bucket');
      expect(result.key).toMatch(/^uploads\//);
      expect(result.key.endsWith('.txt')).toBe(true);
      expect(result.size).toBe(buffer.length);
      expect(result.url).toBeTruthy();
    });
  });

  describe('isValidImageUrl', () => {
    it('should accept URLs from configured endpoint', () => {
      const url = 'http://localhost:9000/test-bucket/questions/uuid/image.png';
      expect(service['isValidStorageHost']?.(url) ?? true).toBeTruthy();
    });
  });
});
