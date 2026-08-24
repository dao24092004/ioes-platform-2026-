import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ImageUploadService } from './image-upload.service';
import { StorageService } from './storage.service';
import { UserPrincipalDto } from '@ioes/common-node';

describe('ImageUploadService', () => {
  let service: ImageUploadService;
  let storage: jest.Mocked<StorageService>;

  const mockUser: UserPrincipalDto = {
    userId: 'user-1',
    email: 'a@b.com',
    roles: ['INSTRUCTOR'],
    tenantId: 't-1',
  };

  beforeEach(async () => {
    const storageMock = {
      generatePresignedUploadUrl: jest.fn(),
      downloadObject: jest.fn(),
      deleteObject: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ImageUploadService,
        { provide: StorageService, useValue: storageMock },
      ],
    }).compile();

    service = module.get(ImageUploadService);
    storage = module.get(StorageService) as jest.Mocked<StorageService>;
  });

  describe('generateUploadUrl', () => {
    it('should pass-through valid image types', async () => {
      storage.generatePresignedUploadUrl.mockResolvedValue({
        uploadUrl: 'http://minio/upload',
        publicUrl: 'http://minio/public/image.png',
        key: 'questions/uuid/image.png',
        bucket: 'b',
        expiresAt: new Date(),
      });

      const result = await service.generateUploadUrl(
        'q-1',
        'test.png',
        'image/png',
        mockUser,
      );

      expect(result.key).toBe('questions/uuid/image.png');
      expect(storage.generatePresignedUploadUrl).toHaveBeenCalledWith(
        'questions/q-1/images',
        'test.png',
        'image/png',
        expect.any(Object),
      );
    });

    it('should reject PDF content type', async () => {
      await expect(
        service.generateUploadUrl('q-1', 'doc.pdf', 'application/pdf', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty filename', async () => {
      await expect(
        service.generateUploadUrl('q-1', '', 'image/png', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject overly long filename', async () => {
      const longName = 'a'.repeat(300) + '.png';
      await expect(
        service.generateUploadUrl('q-1', longName, 'image/png', mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyUpload', () => {
    it('should return exists=false when object not found', async () => {
      storage.downloadObject.mockResolvedValue(null);
      const result = await service.verifyUpload('b', 'k');
      expect(result.exists).toBe(false);
    });

    it('should return exists=true with size when found', async () => {
      storage.downloadObject.mockResolvedValue({
        buffer: Buffer.from('hello'),
        contentType: 'image/png',
      });
      const result = await service.verifyUpload('b', 'k');
      expect(result.exists).toBe(true);
      expect(result.size).toBe(5);
    });
  });

  describe('deleteImage', () => {
    it('should return true on successful delete', async () => {
      storage.deleteObject.mockResolvedValue(true);
      const result = await service.deleteImage('b', 'k');
      expect(result).toBe(true);
    });
  });

  describe('isValidImageUrl', () => {
    it('should accept URL with matching host', () => {
      const url = 'http://localhost:9000/bucket/image.png';
      expect(service.isValidImageUrl(url)).toBe(true);
    });

    it('should reject malicious URLs', () => {
      expect(service.isValidImageUrl('http://evil.com/image.png')).toBe(false);
      expect(service.isValidImageUrl('not-a-url')).toBe(false);
    });
  });
});
