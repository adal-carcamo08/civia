jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const findUniqueMock = jest.fn();
  const createMock = jest.fn();
  const signAsyncMock = jest.fn();

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      user: {
        findUnique: findUniqueMock,
        create: createMock,
      },
    } as unknown as PrismaService;

    const jwtService = {
      signAsync: signAsyncMock,
    } as unknown as import('@nestjs/jwt').JwtService;

    service = new AuthService(prisma, jwtService);
  });

  it('registra un usuario con correo normalizado y contraseña cifrada', async () => {
    findUniqueMock.mockResolvedValue(null);

    createMock.mockImplementation(async ({ data }) => ({
      id: 'user-1',
      fullName: data.fullName,
      email: data.email,
      role: 'USER',
      active: true,
      createdAt: new Date('2026-09-22T16:00:00.000Z'),
    }));

    const result = await service.register({
      fullName: '  Usuario CIVIA  ',
      email: '  Usuario@CIVIA.COM  ',
      password: 'Civia123',
    });

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        email: 'usuario@civia.com',
      },
      select: {
        id: true,
      },
    });

    const createArgs = createMock.mock.calls[0][0];

    expect(createArgs.data.fullName).toBe('Usuario CIVIA');
    expect(createArgs.data.email).toBe('usuario@civia.com');
    expect(createArgs.data.passwordHash).not.toBe('Civia123');

    expect(
      await bcrypt.compare('Civia123', createArgs.data.passwordHash),
    ).toBe(true);

    expect(result.email).toBe('usuario@civia.com');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rechaza un registro cuando el correo ya existe', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'existing-user',
    });

    await expect(
      service.register({
        fullName: 'Usuario CIVIA',
        email: 'usuario@civia.com',
        password: 'Civia123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(createMock).not.toHaveBeenCalled();
  });

  it('inicia sesión y genera un JWT con credenciales correctas', async () => {
    const passwordHash = await bcrypt.hash('Civia123', 4);

    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      fullName: 'Usuario CIVIA',
      email: 'usuario@civia.com',
      passwordHash,
      role: 'USER',
      active: true,
    });

    signAsyncMock.mockResolvedValue('jwt-token');

    const result = await service.login({
      email: 'Usuario@CIVIA.COM',
      password: 'Civia123',
    });

    expect(signAsyncMock).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'usuario@civia.com',
      role: 'USER',
    });

    expect(result).toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'user-1',
        fullName: 'Usuario CIVIA',
        email: 'usuario@civia.com',
        role: 'USER',
        active: true,
      },
    });

    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rechaza una contraseña incorrecta', async () => {
    const passwordHash = await bcrypt.hash('Civia123', 4);

    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      fullName: 'Usuario CIVIA',
      email: 'usuario@civia.com',
      passwordHash,
      role: 'USER',
      active: true,
    });

    await expect(
      service.login({
        email: 'usuario@civia.com',
        password: 'Civia999',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(signAsyncMock).not.toHaveBeenCalled();
  });

  it('rechaza un correo inexistente', async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'noexiste@civia.com',
        password: 'Civia123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(signAsyncMock).not.toHaveBeenCalled();
  });

  it('rechaza un usuario inactivo', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      fullName: 'Usuario CIVIA',
      email: 'usuario@civia.com',
      passwordHash: 'hash',
      role: 'USER',
      active: false,
    });

    await expect(
      service.login({
        email: 'usuario@civia.com',
        password: 'Civia123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(signAsyncMock).not.toHaveBeenCalled();
  });
});