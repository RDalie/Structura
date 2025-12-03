// Mock Prisma client runtime to avoid requiring generated JS artifacts during unit tests.
jest.mock('../generated/prisma/client', () => {
  class PrismaClient {}
  return { PrismaClient, Prisma: {}, User: class {} };
});

// Mock PrismaService to prevent loading the actual PrismaClient implementation.
jest.mock('./prisma.service', () => ({
  PrismaService: class {},
}));

import { Prisma } from '../generated/prisma/client';
import { UsersService } from './user.service';
import type { PrismaService } from './prisma.service';

type PrismaServiceMock = {
  user: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaServiceMock;

  const sampleUser = { id: 1, email: 'test@example.com', name: 'Test User' };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('returns a single user', async () => {
    prisma.user.findUnique.mockResolvedValue(sampleUser);
    const where: Prisma.UserWhereUniqueInput = { id: 1 };

    const result = await service.user(where);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where });
    expect(result).toEqual(sampleUser);
  });

  it('returns multiple users with query options', async () => {
    prisma.user.findMany.mockResolvedValue([sampleUser]);
    const params = {
      skip: 1,
      take: 2,
      cursor: { id: 1 },
      where: { email: { contains: '@example.com' } },
      orderBy: { id: 'desc' as const },
    };

    const result = await service.users(params);

    expect(prisma.user.findMany).toHaveBeenCalledWith(params);
    expect(result).toEqual([sampleUser]);
  });

  it('creates a user', async () => {
    prisma.user.create.mockResolvedValue(sampleUser);
    const data: Prisma.UserCreateInput = {
      email: sampleUser.email,
      name: sampleUser.name,
      posts: { create: [] },
    };

    const result = await service.createUser(data);

    expect(prisma.user.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(sampleUser);
  });

  it('updates a user', async () => {
    prisma.user.update.mockResolvedValue({ ...sampleUser, name: 'Updated' });
    const params = {
      where: { id: 1 },
      data: { name: 'Updated' },
    };

    const result = await service.updateUser(params);

    expect(prisma.user.update).toHaveBeenCalledWith(params);
    expect(result).toEqual({ ...sampleUser, name: 'Updated' });
  });

  it('deletes a user', async () => {
    prisma.user.delete.mockResolvedValue(sampleUser);
    const where = { id: 1 };

    const result = await service.deleteUser(where);

    expect(prisma.user.delete).toHaveBeenCalledWith({ where });
    expect(result).toEqual(sampleUser);
  });
});
