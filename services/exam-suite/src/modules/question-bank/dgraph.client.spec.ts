import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { DgraphClient } from './dgraph.client';

describe('DgraphClient', () => {
  let client: DgraphClient;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfig: Partial<ConfigService> = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        DGRAPH_URL: 'http://test-dgraph:8080',
        DGRAPH_INTERNAL_URL: 'http://test-dgraph-internal:8080',
        DGRAPH_GRAPHQL_ENDPOINT: '/graphql',
        DGRAPH_ADMIN_ENDPOINT: '/admin',
        DGRAPH_TOKEN: '',
        DGRAPH_TIMEOUT_MS: '5000',
      };
      return map[key] ?? null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DgraphClient,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    client = module.get<DgraphClient>(DgraphClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('query()', () => {
    it('should_returnData_When_graphqlQuerySucceeds', async () => {
      const mockData = {
        data: {
          queryQuestion: [{ id: '0x1', questionText: 'What is OOP?' }],
          aggregateQuestion: { count: 1 },
        },
      };
      mockHttpService.post.mockReturnValue(of({ data: mockData }));

      const result = await client.query('query { ... }');

      expect(result).toEqual(mockData.data);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://test-dgraph:8080/graphql',
        { query: 'query { ... }', variables: undefined },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          timeout: expect.any(Number),
        }),
      );
    });

    it('should_throw_When_dgraphReturnsErrors', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: {
            errors: [{ message: 'Field not found' }],
          },
        }),
      );

      await expect(client.query('query { bad }')).rejects.toThrow(
        /Dgraph errors: Field not found/,
      );
    });

    it('should_throw_When_httpRequestFails', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Network Error')),
      );

      await expect(client.query('query { ... }')).rejects.toThrow();
    });

    it('should_passVariables_When_provided', async () => {
      mockHttpService.post.mockReturnValue(of({ data: { data: {} } }));

      await client.query('query Foo($id: ID!) { get(id: $id) }', { id: '0x1' });

      const call = mockHttpService.post.mock.calls[0];
      expect(call[1]).toEqual({
        query: 'query Foo($id: ID!) { get(id: $id) }',
        variables: { id: '0x1' },
      });
    });
  });

  describe('isHealthy()', () => {
    it('should_returnTrue_When_dgraphResponds', async () => {
      mockHttpService.get.mockReturnValue(of({ data: {} }));
      const result = await client.isHealthy();
      expect(result).toBe(true);
    });

    it('should_returnFalse_When_dgraphFails', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );
      const result = await client.isHealthy();
      expect(result).toBe(false);
    });
  });

  describe('deploySchema()', () => {
    it('should_postToAdminEndpoint', async () => {
      mockHttpService.post.mockReturnValue(of({ data: { data: {} } }));
      await client.deploySchema('type Question { id: ID! }');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://test-dgraph:8080/admin/schema',
        'type Question { id: ID! }',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/graphql',
          }),
        }),
      );
    });
  });
});
