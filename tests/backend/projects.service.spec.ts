import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from 'src/modules/projects/projects.service';
import { PrismaService } from 'src/database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SystemRole, ProjectPermissionLevel } from 'src/common/enums';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: typeof mockPrismaService;

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectPermission: {
      create: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    it('should create a project and assign owner permission', async () => {
      const dto = { name: 'Test Project', code: 'PROJ-1', description: 'Test' };
      const creatorId = 'user-1';

      prisma.project.findUnique.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({
        id: 'proj-id',
        ...dto,
      });

      const result = await service.createProject(dto, creatorId);

      expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { code: dto.code } });
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          channels: {
            create: [
              {
                name: 'genel',
                description: 'Genel proje kanalı',
                type: 'PROJECT_PUBLIC',
                createdById: creatorId,
              },
            ],
          },
        },
        include: { channels: true },
      });
      expect(prisma.projectPermission.create).toHaveBeenCalledWith({
        data: {
          userId: creatorId,
          projectId: 'proj-id',
          permission: ProjectPermissionLevel.WRITE,
        },
      });
      expect(result).toEqual({ id: 'proj-id', ...dto });
    });

    it('should throw ConflictException if project code already exists', async () => {
      const dto = { name: 'Test Project', code: 'PROJ-1' };
      prisma.project.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(service.createProject(dto, 'user-1')).rejects.toThrow(ConflictException);
      expect(prisma.project.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserProjects', () => {
    it('should return all projects for ADMIN users', async () => {
      const mockProjects = [{ id: '1', name: 'Proj 1' }, { id: '2', name: 'Proj 2' }];
      prisma.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.getUserProjects('user-1', SystemRole.ADMIN);

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        include: {
          channels: true,
          permissions: {
            include: {
              user: { select: { id: true, fullName: true, email: true, role: true, isOnline: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockProjects);
    });

    it('should return permitted projects for standard users', async () => {
      const mockProjects = [{ id: '1', name: 'Proj 1' }];
      prisma.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.getUserProjects('user-1', SystemRole.EMPLOYEE);

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: {
          permissions: {
            some: { userId: 'user-1' },
          },
        },
        include: {
          channels: true,
          permissions: {
            include: {
              user: { select: { id: true, fullName: true, email: true, role: true, isOnline: true, status: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockProjects);
    });
  });

  describe('getProjectById', () => {
    it('should return project if found', async () => {
      const mockProj = { id: 'proj-1', name: 'Proj 1' };
      prisma.project.findUnique.mockResolvedValue(mockProj);

      const result = await service.getProjectById('proj-1');

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockProj);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.getProjectById('proj-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProject', () => {
    it('should update project if found', async () => {
      const dto = { name: 'Updated Name', description: 'Updated Desc' };
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prisma.project.update.mockResolvedValue({ id: 'proj-1', ...dto });

      const result = await service.updateProject('proj-1', dto);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: dto,
      });
      expect(result).toEqual({ id: 'proj-1', ...dto });
    });

    it('should throw NotFoundException on update if project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.updateProject('proj-1', { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProject', () => {
    it('should delete project if found', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prisma.project.delete.mockResolvedValue({ id: 'proj-1' });

      const result = await service.deleteProject('proj-1');

      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'proj-1' } });
      expect(result).toEqual({ id: 'proj-1' });
    });

    it('should throw NotFoundException on delete if project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.deleteProject('proj-1')).rejects.toThrow(NotFoundException);
    });
  });
});
