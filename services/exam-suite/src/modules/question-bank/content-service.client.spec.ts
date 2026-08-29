import { ContentServiceClient } from './content-service.client';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

describe('ContentServiceClient', () => {
  let client: ContentServiceClient;
  let http: jest.Mocked<HttpService>;

  const topicId = '00000000-0000-0000-0000-000000000001';
  const mockTopic = {
    id: topicId,
    name: 'Java',
    slug: 'java',
    description: 'Java programming',
    level: 0,
    isActive: true,
  };

  beforeEach(async () => {
    const httpMock = {
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    const module = await Test.createTestingModule({
      providers: [
        ContentServiceClient,
        { provide: HttpService, useValue: httpMock },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://content-service:9001' },
        },
      ],
    }).compile();

    client = module.get(ContentServiceClient);
    http = module.get(HttpService) as jest.Mocked<HttpService>;
  });

  it('should return topic on successful fetch', async () => {
    (http.get as jest.Mock).mockReturnValue(of({ data: mockTopic }));

    const result = await client.getTopic(topicId);

    expect(result).toEqual(mockTopic);
    expect(http.get).toHaveBeenCalledWith(
      `http://content-service:9001/api/v1/topics/${topicId}`,
      expect.objectContaining({ timeout: 5000 }),
    );
  });

  it('should return cached topic on second call within TTL', async () => {
    (http.get as jest.Mock).mockReturnValue(of({ data: mockTopic }));

    await client.getTopic(topicId);
    const result = await client.getTopic(topicId);

    expect(result).toEqual(mockTopic);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('should return null on fetch error', async () => {
    (http.get as jest.Mock).mockReturnValue(throwError(() => new Error('Network error')));

    const result = await client.getTopic(topicId);

    expect(result).toBeNull();
  });

  it('should return exists=true for existing topic', async () => {
    (http.get as jest.Mock).mockReturnValue(of({ data: { exists: true } }));

    const result = await client.existsTopic(topicId);

    expect(result).toBe(true);
  });

  it('should return exists=false on fetch error', async () => {
    (http.get as jest.Mock).mockReturnValue(throwError(() => new Error('Network error')));

    const result = await client.existsTopic(topicId);

    expect(result).toBe(false);
  });

  it('should invalidate specific cache entry', async () => {
    (http.get as jest.Mock).mockReturnValue(of({ data: mockTopic }));
    await client.getTopic(topicId);

    client.invalidateCache(topicId);

    (http.get as jest.Mock).mockReturnValue(of({ data: mockTopic }));
    await client.getTopic(topicId);

    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('should invalidate all cache entries', async () => {
    (http.get as jest.Mock).mockReturnValue(of({ data: mockTopic }));
    await client.getTopic(topicId);

    client.invalidateCache();

    await client.getTopic(topicId);

    expect(http.get).toHaveBeenCalledTimes(2);
  });
});